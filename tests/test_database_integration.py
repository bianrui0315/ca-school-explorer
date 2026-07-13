from __future__ import annotations

import os
from pathlib import Path

import psycopg
import pytest

from ca_school_explorer.database import (
    DatabaseError,
    apply_migrations,
    ingest_chronic_absenteeism,
)
from tests.sample_dataset import write_sample_dataset

ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL integration tests",
)


def test_migrate_ingest_and_reuse_snapshot(tmp_path: Path) -> None:
    assert DATABASE_URL is not None
    migration_result = apply_migrations(DATABASE_URL, ROOT / "db" / "migrations")
    assert len(migration_result.applied) + len(migration_result.skipped) == 5

    with psycopg.connect(DATABASE_URL) as connection:
        connection.execute(
            """
            truncate table
              cse.fact_metric,
              cse.import_run,
              cse.entity,
              cse.source_snapshot
            restart identity cascade
            """
        )

    try:
        manifest, source_path = write_sample_dataset(tmp_path)
        result = ingest_chronic_absenteeism(DATABASE_URL, manifest, source_path)

        assert result.rows_loaded == 5
        assert result.entities_touched == 5
        assert result.rows_suppressed == 1
        assert not result.reused_existing_snapshot

        with psycopg.connect(DATABASE_URL) as connection:
            school_row = connection.execute(
                """
                select
                  school_name,
                  subgroup_id,
                  chronic_absenteeism_rate,
                  suppression_status
                from cse.school_chronic_absenteeism_current
                where cds_code = '01611196000001'
                """
            ).fetchone()
            assert school_row == (
                "Escuela José",
                "students_with_disabilities",
                None,
                "suppressed",
            )
            collision_rows = connection.execute(
                """
                select entity_type, name
                from cse.entity
                where cds_code = '01611190000000'
                order by entity_type
                """
            ).fetchall()
            assert collision_rows == [
                ("district", "Alameda Unified"),
                ("school", "District Office"),
            ]

        reused = ingest_chronic_absenteeism(DATABASE_URL, manifest, source_path)
        assert reused.reused_existing_snapshot
        assert reused.rows_loaded == 5
        assert reused.import_run_id is None

        with psycopg.connect(DATABASE_URL) as connection:
            connection.execute(
                "delete from cse.fact_metric "
                "where source_snapshot_id = %s and source_row_number = 2",
                (result.source_snapshot_id,),
            )
        with pytest.raises(DatabaseError, match="imported snapshot row count mismatch"):
            ingest_chronic_absenteeism(DATABASE_URL, manifest, source_path)
    finally:
        with psycopg.connect(DATABASE_URL) as connection:
            connection.execute(
                """
                truncate table
                  cse.fact_metric,
                  cse.import_run,
                  cse.entity,
                  cse.source_snapshot
                restart identity cascade
                """
            )
