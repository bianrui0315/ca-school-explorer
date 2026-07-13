"""PostgreSQL migrations and audited real-data ingestion."""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg import Connection
from psycopg.types.json import Jsonb

from ca_school_explorer.chronic_absenteeism import (
    DatasetInspection,
    inspect_chronic_absenteeism,
    iter_chronic_absenteeism_rows,
)
from ca_school_explorer.dataset_manifest import DatasetManifest

DEFAULT_MIGRATIONS_PATH = Path("db/migrations")


class DatabaseError(RuntimeError):
    """Raised when migrations or ingestion cannot complete safely."""


@dataclass(frozen=True, slots=True)
class MigrationResult:
    """Summary of deterministic schema migration work."""

    applied: tuple[str, ...]
    skipped: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class IngestResult:
    """Summary of an idempotent source snapshot ingestion."""

    source_snapshot_id: int
    import_run_id: int | None
    rows_loaded: int
    entities_touched: int
    rows_suppressed: int
    reused_existing_snapshot: bool


def require_database_url(database_url: str | None) -> str:
    """Return a configured PostgreSQL URL or fail without exposing credentials."""

    if database_url is None or not database_url.strip():
        raise DatabaseError("DATABASE_URL or --database-url is required")
    if not database_url.startswith(("postgresql://", "postgres://")):
        raise DatabaseError("database URL must use the postgresql:// scheme")
    return database_url


def apply_migrations(
    database_url: str,
    migrations_path: str | Path = DEFAULT_MIGRATIONS_PATH,
) -> MigrationResult:
    """Apply immutable SQL migrations in filename order and verify their digests."""

    migration_root = Path(migrations_path)
    migration_files = sorted(migration_root.glob("*.sql"))
    if not migration_files:
        raise DatabaseError(f"no SQL migrations found in {migration_root}")

    applied: list[str] = []
    skipped: list[str] = []
    with psycopg.connect(require_database_url(database_url)) as connection:
        connection.execute(
            """
            create table if not exists public.cse_schema_migration (
              migration_name text primary key,
              sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
              applied_at timestamptz not null default now()
            )
            """
        )
        connection.commit()

        existing_rows = connection.execute(
            "select migration_name, sha256 from public.cse_schema_migration"
        ).fetchall()
        connection.commit()
        existing = {str(name): str(digest) for name, digest in existing_rows}

        for migration_file in migration_files:
            sql = migration_file.read_text(encoding="utf-8")
            digest = hashlib.sha256(sql.encode("utf-8")).hexdigest()
            existing_digest = existing.get(migration_file.name)
            if existing_digest is not None:
                if existing_digest != digest:
                    raise DatabaseError(f"applied migration changed: {migration_file.name}")
                skipped.append(migration_file.name)
                continue

            with connection.transaction():
                connection.execute(sql, prepare=False)
                connection.execute(
                    """
                    insert into public.cse_schema_migration (migration_name, sha256)
                    values (%s, %s)
                    """,
                    (migration_file.name, digest),
                )
            applied.append(migration_file.name)

    return MigrationResult(applied=tuple(applied), skipped=tuple(skipped))


def apply_security_roles(database_url: str, sql_path: str | Path = "db/security/roles.sql") -> None:
    """Install optional least-privilege group roles using an administrative connection."""

    role_path = Path(sql_path)
    if not role_path.is_file():
        raise DatabaseError(f"security role SQL not found: {role_path}")
    with (
        psycopg.connect(require_database_url(database_url)) as connection,
        connection.transaction(),
    ):
        connection.execute(role_path.read_text(encoding="utf-8"), prepare=False)


def _register_snapshot(
    connection: Connection[tuple[Any, ...]],
    manifest: DatasetManifest,
    inspection: DatasetInspection,
) -> tuple[int, str]:
    source_row = connection.execute(
        """
        insert into cse.data_source (source_key, name, publisher, landing_page_url)
        values (%s, %s, %s, %s)
        on conflict (source_key) do update
        set
          name = excluded.name,
          publisher = excluded.publisher,
          landing_page_url = excluded.landing_page_url,
          updated_at = now()
        returning id
        """,
        (
            manifest.source_id,
            manifest.source_name,
            manifest.publisher,
            manifest.landing_page_url,
        ),
    ).fetchone()
    if source_row is None:
        raise DatabaseError("failed to register data source")
    data_source_id = int(source_row[0])

    existing = connection.execute(
        """
        select id, import_status
        from cse.source_snapshot
        where data_source_id = %s and sha256 = %s
        """,
        (data_source_id, manifest.sha256),
    ).fetchone()
    if existing is not None:
        return int(existing[0]), str(existing[1])

    snapshot_row = connection.execute(
        """
        insert into cse.source_snapshot (
          data_source_id,
          dataset_id,
          academic_year,
          release_date,
          retrieved_at,
          download_url,
          original_filename,
          media_type,
          encoding,
          byte_size,
          record_count,
          sha256,
          schema_version,
          adapter_version,
          terms_status,
          import_status,
          metadata
        )
        values (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'validated', %s
        )
        returning id
        """,
        (
            data_source_id,
            manifest.dataset_id,
            manifest.academic_year,
            manifest.release_date,
            datetime.now(UTC),
            manifest.download_url,
            manifest.filename,
            manifest.media_type,
            manifest.encoding,
            manifest.byte_size,
            manifest.record_count,
            manifest.sha256,
            manifest.schema_version,
            manifest.adapter,
            manifest.terms_status,
            Jsonb(
                {
                    "aggregate_level_counts": inspection.aggregate_level_counts,
                    "reporting_categories": inspection.reporting_categories,
                }
            ),
        ),
    ).fetchone()
    if snapshot_row is None:
        raise DatabaseError("failed to register source snapshot")
    return int(snapshot_row[0]), "validated"


def _start_import_run(connection: Connection[tuple[Any, ...]], source_snapshot_id: int) -> int:
    row = connection.execute(
        """
        insert into cse.import_run (source_snapshot_id, status)
        values (%s, 'running')
        returning id
        """,
        (source_snapshot_id,),
    ).fetchone()
    if row is None:
        raise DatabaseError("failed to create import run")
    connection.execute(
        "update cse.source_snapshot set import_status = 'importing' where id = %s",
        (source_snapshot_id,),
    )
    return int(row[0])


def _create_staging_table(connection: Connection[tuple[Any, ...]]) -> None:
    connection.execute(
        """
        create temporary table stage_chronic_absenteeism (
          source_row_number bigint not null,
          academic_year text not null,
          aggregate_level text not null,
          entity_cds_code text not null,
          parent_cds_code text,
          entity_type text not null,
          entity_name text not null,
          county_code text,
          district_code text,
          school_code text,
          charter_scope text not null,
          dass_scope text not null,
          reporting_category text not null,
          denominator bigint,
          numerator bigint,
          value numeric(14, 4),
          suppression_status text not null,
          reliability_status text not null
        ) on commit drop
        """
    )


def _copy_to_staging(
    connection: Connection[tuple[Any, ...]],
    manifest: DatasetManifest,
    source_path: str | Path,
) -> None:
    copy_sql = """
        copy stage_chronic_absenteeism (
          source_row_number,
          academic_year,
          aggregate_level,
          entity_cds_code,
          parent_cds_code,
          entity_type,
          entity_name,
          county_code,
          district_code,
          school_code,
          charter_scope,
          dass_scope,
          reporting_category,
          denominator,
          numerator,
          value,
          suppression_status,
          reliability_status
        ) from stdin
    """
    with connection.cursor().copy(copy_sql) as copy:
        for row in iter_chronic_absenteeism_rows(manifest, source_path):
            copy.write_row(
                (
                    row.source_row_number,
                    row.academic_year,
                    row.aggregate_level,
                    row.entity_cds_code,
                    row.parent_cds_code,
                    row.entity_type,
                    row.entity_name,
                    row.county_code,
                    row.district_code,
                    row.school_code,
                    row.charter_scope,
                    row.dass_scope,
                    row.reporting_category,
                    row.denominator,
                    row.numerator,
                    row.value,
                    row.suppression_status,
                    row.reliability_status,
                )
            )


def _load_entities(connection: Connection[tuple[Any, ...]], source_snapshot_id: int) -> int:
    connection.execute(
        """
        insert into cse.entity (
          cds_code,
          entity_type,
          name,
          county_code,
          district_code,
          school_code,
          status,
          first_seen_snapshot_id,
          last_seen_snapshot_id
        )
        select distinct
          entity_cds_code,
          entity_type,
          entity_name,
          county_code,
          district_code,
          school_code,
          'unknown',
          %s,
          %s
        from stage_chronic_absenteeism
        on conflict (entity_type, cds_code) do update
        set
          entity_type = excluded.entity_type,
          name = excluded.name,
          county_code = excluded.county_code,
          district_code = excluded.district_code,
          school_code = excluded.school_code,
          last_seen_snapshot_id = excluded.last_seen_snapshot_id,
          updated_at = now()
        """,
        (source_snapshot_id, source_snapshot_id),
    )
    connection.execute(
        """
        update cse.entity as child
        set parent_entity_id = parent.id
        from (
          select distinct
            entity_cds_code,
            parent_cds_code,
            entity_type,
            case entity_type
              when 'county' then 'state'
              when 'district' then 'county'
              when 'school' then 'district'
            end as parent_entity_type
          from stage_chronic_absenteeism
          where parent_cds_code is not null
        ) as lineage
        join cse.entity as parent
          on parent.cds_code = lineage.parent_cds_code
          and parent.entity_type = lineage.parent_entity_type
        where child.cds_code = lineage.entity_cds_code
          and child.entity_type = lineage.entity_type
          and child.parent_entity_id is distinct from parent.id
        """
    )
    row = connection.execute(
        "select count(distinct (entity_type, entity_cds_code)) from stage_chronic_absenteeism"
    ).fetchone()
    return int(row[0]) if row is not None else 0


def _load_facts(connection: Connection[tuple[Any, ...]], source_snapshot_id: int) -> int:
    missing_subgroups = connection.execute(
        """
        select array_agg(reporting_category order by reporting_category)
        from (
          select distinct stage.reporting_category
          from stage_chronic_absenteeism as stage
          left join cse.subgroup as subgroup
            on subgroup.source_key = 'cde_chronic_absenteeism'
            and subgroup.source_code = stage.reporting_category
          where subgroup.subgroup_id is null
        ) as missing
        """
    ).fetchone()
    if missing_subgroups is not None and missing_subgroups[0] is not None:
        raise DatabaseError(f"unmapped reporting categories: {missing_subgroups[0]}")

    connection.execute(
        "delete from cse.fact_metric where source_snapshot_id = %s",
        (source_snapshot_id,),
    )
    cursor = connection.execute(
        """
        insert into cse.fact_metric (
          entity_id,
          school_year,
          school_year_start,
          metric_id,
          subgroup_id,
          numerator,
          denominator,
          value,
          suppression_status,
          reliability_status,
          charter_scope,
          dass_scope,
          source_snapshot_id,
          source_row_number,
          source_reporting_category
        )
        select
          entity.id,
          stage.academic_year,
          substring(stage.academic_year from 1 for 4)::smallint,
          'chronic_absenteeism_rate',
          subgroup.subgroup_id,
          stage.numerator,
          stage.denominator,
          stage.value,
          stage.suppression_status,
          stage.reliability_status,
          stage.charter_scope,
          stage.dass_scope,
          %s,
          stage.source_row_number,
          stage.reporting_category
        from stage_chronic_absenteeism as stage
        join cse.entity as entity
          on entity.cds_code = stage.entity_cds_code
          and entity.entity_type = stage.entity_type
        join cse.subgroup as subgroup
          on subgroup.source_key = 'cde_chronic_absenteeism'
          and subgroup.source_code = stage.reporting_category
        """,
        (source_snapshot_id,),
    )
    return cursor.rowcount


def _existing_snapshot_result(
    connection: Connection[tuple[Any, ...]],
    source_snapshot_id: int,
    inspection: DatasetInspection,
) -> IngestResult:
    row = connection.execute(
        """
        select count(*), count(distinct entity_id)
        from cse.fact_metric
        where source_snapshot_id = %s
        """,
        (source_snapshot_id,),
    ).fetchone()
    rows_loaded = int(row[0]) if row is not None else 0
    entities_touched = int(row[1]) if row is not None else 0
    if rows_loaded != inspection.record_count:
        raise DatabaseError(
            f"imported snapshot row count mismatch: expected "
            f"{inspection.record_count}, got {rows_loaded}"
        )
    return IngestResult(
        source_snapshot_id=source_snapshot_id,
        import_run_id=None,
        rows_loaded=rows_loaded,
        entities_touched=entities_touched,
        rows_suppressed=inspection.suppressed_count,
        reused_existing_snapshot=True,
    )


def ingest_chronic_absenteeism(
    database_url: str,
    manifest: DatasetManifest,
    source_path: str | Path,
) -> IngestResult:
    """Validate, COPY, normalize, and audit one immutable CDE snapshot."""

    inspection = inspect_chronic_absenteeism(manifest, source_path)
    connection = psycopg.connect(require_database_url(database_url))
    source_snapshot_id = 0
    import_run_id = 0
    try:
        with connection.transaction():
            source_snapshot_id, snapshot_status = _register_snapshot(
                connection, manifest, inspection
            )
            if snapshot_status == "imported":
                return _existing_snapshot_result(connection, source_snapshot_id, inspection)
            import_run_id = _start_import_run(connection, source_snapshot_id)

        with connection.transaction():
            _create_staging_table(connection)
            _copy_to_staging(connection, manifest, source_path)
            entities_touched = _load_entities(connection, source_snapshot_id)
            rows_loaded = _load_facts(connection, source_snapshot_id)
            if rows_loaded != inspection.record_count:
                raise DatabaseError(
                    f"loaded row count mismatch: expected "
                    f"{inspection.record_count}, got {rows_loaded}"
                )
            connection.execute("analyze cse.source_snapshot, cse.entity, cse.fact_metric")
            connection.execute(
                """
                update cse.import_run
                set
                  status = 'succeeded',
                  completed_at = clock_timestamp(),
                  rows_read = %s,
                  rows_loaded = %s,
                  rows_suppressed = %s
                where id = %s
                """,
                (
                    inspection.record_count,
                    rows_loaded,
                    inspection.suppressed_count,
                    import_run_id,
                ),
            )
            connection.execute(
                "update cse.source_snapshot set import_status = 'imported' where id = %s",
                (source_snapshot_id,),
            )

        return IngestResult(
            source_snapshot_id=source_snapshot_id,
            import_run_id=import_run_id,
            rows_loaded=rows_loaded,
            entities_touched=entities_touched,
            rows_suppressed=inspection.suppressed_count,
            reused_existing_snapshot=False,
        )
    except Exception as error:
        if source_snapshot_id and import_run_id:
            with connection.transaction():
                connection.execute(
                    """
                    update cse.import_run
                    set
                      status = 'failed',
                      completed_at = clock_timestamp(),
                      error_summary = %s
                    where id = %s
                    """,
                    (str(error)[:4000], import_run_id),
                )
                connection.execute(
                    "update cse.source_snapshot set import_status = 'failed' where id = %s",
                    (source_snapshot_id,),
                )
        raise
    finally:
        connection.close()


def query_rows(
    database_url: str, query: str, parameters: Sequence[object] = ()
) -> list[tuple[Any, ...]]:
    """Run a read-only diagnostic query for tests and local verification."""

    with (
        psycopg.connect(require_database_url(database_url)) as connection,
        connection.transaction(),
    ):
        connection.execute("set local transaction read only")
        return connection.execute(query, parameters).fetchall()
