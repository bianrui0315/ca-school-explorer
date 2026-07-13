"""PostgreSQL migrations and audited real-data ingestion."""

from __future__ import annotations

import hashlib
from collections.abc import Iterator, Sequence
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
from ca_school_explorer.indicators import (
    MetricDatasetInspection,
    MetricObservation,
    inspect_metric_dataset,
    iter_metric_observations,
)
from ca_school_explorer.school_directory import (
    SchoolGeographyInspection,
    inspect_school_geography,
    iter_school_geography_rows,
)

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


DatasetInspectionResult = DatasetInspection | MetricDatasetInspection | SchoolGeographyInspection


def _observation_count(inspection: DatasetInspectionResult) -> int:
    if isinstance(inspection, (MetricDatasetInspection, SchoolGeographyInspection)):
        return inspection.observation_count
    return inspection.record_count


def _metric_counts(inspection: DatasetInspectionResult) -> dict[str, int]:
    if isinstance(inspection, MetricDatasetInspection):
        return inspection.metric_counts
    if isinstance(inspection, SchoolGeographyInspection):
        return {}
    return {"chronic_absenteeism_rate": inspection.record_count}


def _ambiguous_entity_count(inspection: DatasetInspectionResult) -> int:
    if isinstance(inspection, MetricDatasetInspection):
        return inspection.ambiguous_entity_count
    return 0


def inspect_dataset(manifest: DatasetManifest, source_path: str | Path) -> DatasetInspectionResult:
    """Inspect any supported pinned dataset without changing PostgreSQL."""

    if manifest.adapter == "chronic_absenteeism_v1":
        return inspect_chronic_absenteeism(manifest, source_path)
    if manifest.adapter == "school_geography_v1":
        return inspect_school_geography(manifest, source_path)
    return inspect_metric_dataset(manifest, source_path)


def _register_snapshot(
    connection: Connection[tuple[Any, ...]],
    manifest: DatasetManifest,
    inspection: DatasetInspectionResult,
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
                    "metric_counts": _metric_counts(inspection),
                    "ambiguous_entity_count": _ambiguous_entity_count(inspection),
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


def _iter_observations(
    manifest: DatasetManifest,
    source_path: str | Path,
    inspection: DatasetInspectionResult,
) -> Iterator[MetricObservation]:
    if manifest.adapter != "chronic_absenteeism_v1":
        if not isinstance(inspection, MetricDatasetInspection):
            raise DatabaseError("metric adapter did not return a metric inspection")
        yield from iter_metric_observations(manifest, source_path, inspection.ambiguous_entity_keys)
        return
    for row in iter_chronic_absenteeism_rows(manifest, source_path):
        yield MetricObservation(
            source_row_number=row.source_row_number,
            school_year=row.academic_year,
            aggregate_level=row.aggregate_level,
            entity_identity_key=f"{row.entity_type}:{row.entity_cds_code}",
            identity_resolution="resolved",
            entity_cds_code=row.entity_cds_code,
            parent_cds_code=row.parent_cds_code,
            entity_type=row.entity_type,
            entity_name=row.entity_name,
            county_code=row.county_code,
            district_code=row.district_code,
            school_code=row.school_code,
            charter_scope=row.charter_scope,
            dass_scope=row.dass_scope,
            source_reporting_category=row.reporting_category,
            metric_id="chronic_absenteeism_rate",
            denominator=row.denominator,
            numerator=row.numerator,
            value=row.value,
            suppression_status=row.suppression_status,
            reliability_status=row.reliability_status,
            metadata={},
        )


def _create_staging_table(connection: Connection[tuple[Any, ...]]) -> None:
    connection.execute(
        """
        create temporary table stage_metric_observation (
          source_row_number bigint not null,
          school_year text not null,
          aggregate_level text not null,
          entity_identity_key text not null,
          identity_resolution text not null,
          entity_cds_code text not null,
          parent_cds_code text,
          entity_type text not null,
          entity_name text not null,
          county_code text,
          district_code text,
          school_code text,
          charter_scope text not null,
          dass_scope text not null,
          source_reporting_category text not null,
          metric_id text not null,
          denominator bigint,
          numerator bigint,
          value numeric(14, 4),
          suppression_status text not null,
          reliability_status text not null,
          metadata jsonb not null
        ) on commit drop
        """
    )


def _copy_to_staging(
    connection: Connection[tuple[Any, ...]],
    manifest: DatasetManifest,
    source_path: str | Path,
    inspection: DatasetInspectionResult,
) -> None:
    copy_sql = """
        copy stage_metric_observation (
          source_row_number,
          school_year,
          aggregate_level,
          entity_identity_key,
          identity_resolution,
          entity_cds_code,
          parent_cds_code,
          entity_type,
          entity_name,
          county_code,
          district_code,
          school_code,
          charter_scope,
          dass_scope,
          source_reporting_category,
          metric_id,
          denominator,
          numerator,
          value,
          suppression_status,
          reliability_status,
          metadata
        ) from stdin
    """
    with connection.cursor().copy(copy_sql) as copy:
        for row in _iter_observations(manifest, source_path, inspection):
            copy.write_row(
                (
                    row.source_row_number,
                    row.school_year,
                    row.aggregate_level,
                    row.entity_identity_key,
                    row.identity_resolution,
                    row.entity_cds_code,
                    row.parent_cds_code,
                    row.entity_type,
                    row.entity_name,
                    row.county_code,
                    row.district_code,
                    row.school_code,
                    row.charter_scope,
                    row.dass_scope,
                    row.source_reporting_category,
                    row.metric_id,
                    row.denominator,
                    row.numerator,
                    row.value,
                    row.suppression_status,
                    row.reliability_status,
                    Jsonb(row.metadata),
                )
            )


def _load_entities(connection: Connection[tuple[Any, ...]], source_snapshot_id: int) -> int:
    connection.execute(
        """
        insert into cse.entity (
          identity_key,
          identity_resolution,
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
          entity_identity_key,
          identity_resolution,
          entity_cds_code,
          entity_type,
          entity_name,
          county_code,
          district_code,
          school_code,
          'unknown',
          %s,
          %s
        from stage_metric_observation
        on conflict (identity_key) do update
        set
          identity_resolution = excluded.identity_resolution,
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
            entity_identity_key,
            entity_cds_code,
            parent_cds_code,
            entity_type,
            case entity_type
              when 'county' then 'state'
              when 'district' then 'county'
              when 'school' then 'district'
            end as parent_entity_type
          from stage_metric_observation
          where parent_cds_code is not null
        ) as lineage
        join cse.entity as parent
          on parent.identity_key = lineage.parent_entity_type || ':' || lineage.parent_cds_code
        where child.identity_key = lineage.entity_identity_key
          and child.parent_entity_id is distinct from parent.id
        """
    )
    row = connection.execute(
        "select count(distinct entity_identity_key) from stage_metric_observation"
    ).fetchone()
    return int(row[0]) if row is not None else 0


def _load_facts(
    connection: Connection[tuple[Any, ...]],
    source_snapshot_id: int,
    source_key: str,
) -> int:
    missing_subgroups = connection.execute(
        """
        select array_agg(source_reporting_category order by source_reporting_category)
        from (
          select distinct stage.source_reporting_category
          from stage_metric_observation as stage
          left join cse.subgroup_source_code as source_code
            on source_code.source_key = %s
            and source_code.source_code = stage.source_reporting_category
          where source_code.subgroup_id is null
        ) as missing
        """,
        (source_key,),
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
          source_reporting_category,
          metadata
        )
        select
          entity.id,
          stage.school_year,
          substring(stage.school_year from 1 for 4)::smallint,
          stage.metric_id,
          source_code.subgroup_id,
          stage.numerator,
          stage.denominator,
          stage.value,
          stage.suppression_status,
          stage.reliability_status,
          stage.charter_scope,
          stage.dass_scope,
          %s,
          stage.source_row_number,
          stage.source_reporting_category,
          stage.metadata
        from stage_metric_observation as stage
        join cse.entity as entity
          on entity.identity_key = stage.entity_identity_key
        join cse.subgroup_source_code as source_code
          on source_code.source_key = %s
          and source_code.source_code = stage.source_reporting_category
        """,
        (source_snapshot_id, source_key),
    )
    return cursor.rowcount


def _existing_snapshot_result(
    connection: Connection[tuple[Any, ...]],
    source_snapshot_id: int,
    inspection: DatasetInspectionResult,
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
    expected_count = _observation_count(inspection)
    if rows_loaded != expected_count:
        raise DatabaseError(
            f"imported snapshot row count mismatch: expected {expected_count}, got {rows_loaded}"
        )
    return IngestResult(
        source_snapshot_id=source_snapshot_id,
        import_run_id=None,
        rows_loaded=rows_loaded,
        entities_touched=entities_touched,
        rows_suppressed=inspection.suppressed_count,
        reused_existing_snapshot=True,
    )


def ingest_dataset(
    database_url: str,
    manifest: DatasetManifest,
    source_path: str | Path,
) -> IngestResult:
    """Validate, COPY, normalize, and audit one immutable CDE snapshot."""

    inspection = inspect_dataset(manifest, source_path)
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
            _copy_to_staging(connection, manifest, source_path, inspection)
            entities_touched = _load_entities(connection, source_snapshot_id)
            rows_loaded = _load_facts(connection, source_snapshot_id, manifest.source_id)
            expected_count = _observation_count(inspection)
            if rows_loaded != expected_count:
                raise DatabaseError(
                    f"loaded row count mismatch: expected {expected_count}, got {rows_loaded}"
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


def ingest_chronic_absenteeism(
    database_url: str,
    manifest: DatasetManifest,
    source_path: str | Path,
) -> IngestResult:
    """Backward-compatible wrapper for the original ingestion command."""

    if manifest.adapter != "chronic_absenteeism_v1":
        raise DatabaseError("chronic absenteeism ingestion requires chronic_absenteeism_v1")
    return ingest_dataset(database_url, manifest, source_path)


def _create_school_profile_staging(connection: Connection[tuple[Any, ...]]) -> None:
    connection.execute(
        """
        create temporary table stage_school_profile (
          source_row_number bigint not null,
          school_year text not null,
          cds_code text not null,
          district_cds_code text not null,
          county_code text not null,
          district_code text not null,
          school_code text not null,
          county_name text not null,
          district_name text not null,
          school_name text not null,
          profile_status text not null,
          school_type text not null,
          school_level text not null,
          grade_low text,
          grade_high text,
          open_date date,
          closed_date date,
          charter boolean not null,
          virtual_type text not null,
          magnet boolean not null,
          title_i boolean not null,
          dass boolean not null,
          street text not null,
          city text not null,
          state_code text not null,
          zip_code text not null,
          latitude numeric(10, 7) not null,
          longitude numeric(11, 7) not null,
          locale text,
          website_url text,
          enrollment_total integer,
          staff_total numeric(12, 2),
          teacher_staff numeric(12, 2),
          administrator_staff numeric(12, 2),
          metadata jsonb not null
        ) on commit drop
        """
    )


def _copy_school_profiles(
    connection: Connection[tuple[Any, ...]],
    manifest: DatasetManifest,
    source_path: str | Path,
) -> None:
    copy_sql = """
        copy stage_school_profile (
          source_row_number, school_year, cds_code, district_cds_code,
          county_code, district_code, school_code, county_name, district_name,
          school_name, profile_status, school_type, school_level, grade_low,
          grade_high, open_date, closed_date, charter, virtual_type, magnet,
          title_i, dass, street, city, state_code, zip_code, latitude, longitude,
          locale, website_url, enrollment_total, staff_total, teacher_staff,
          administrator_staff, metadata
        ) from stdin
    """
    with connection.cursor().copy(copy_sql) as copy:
        for row in iter_school_geography_rows(manifest, source_path):
            copy.write_row(
                (
                    row.source_row_number,
                    row.school_year,
                    row.cds_code,
                    row.district_cds_code,
                    row.county_code,
                    row.district_code,
                    row.school_code,
                    row.county_name,
                    row.district_name,
                    row.school_name,
                    row.profile_status,
                    row.school_type,
                    row.school_level,
                    row.grade_low,
                    row.grade_high,
                    row.open_date,
                    row.closed_date,
                    row.charter,
                    row.virtual_type,
                    row.magnet,
                    row.title_i,
                    row.dass,
                    row.street,
                    row.city,
                    row.state_code,
                    row.zip_code,
                    row.latitude,
                    row.longitude,
                    row.locale,
                    row.website_url,
                    row.enrollment_total,
                    row.staff_total,
                    row.teacher_staff,
                    row.administrator_staff,
                    Jsonb(row.metadata),
                )
            )


def _load_school_profile_entities(
    connection: Connection[tuple[Any, ...]], source_snapshot_id: int
) -> int:
    connection.execute(
        """
        insert into cse.entity (
          identity_key, identity_resolution, cds_code, entity_type, name,
          county_code, district_code, school_code, status,
          first_seen_snapshot_id, last_seen_snapshot_id
        )
        select distinct
          'district:' || district_cds_code,
          'resolved',
          district_cds_code,
          'district',
          district_name,
          county_code,
          district_code,
          null,
          'unknown',
          %s,
          %s
        from stage_school_profile
        on conflict (identity_key) do update
        set
          name = excluded.name,
          county_code = excluded.county_code,
          district_code = excluded.district_code,
          last_seen_snapshot_id = excluded.last_seen_snapshot_id,
          updated_at = now()
        """,
        (source_snapshot_id, source_snapshot_id),
    )
    connection.execute(
        """
        insert into cse.entity (
          identity_key, identity_resolution, cds_code, entity_type, name,
          county_code, district_code, school_code, status,
          first_seen_snapshot_id, last_seen_snapshot_id
        )
        select
          'school:' || cds_code,
          'resolved',
          cds_code,
          'school',
          school_name,
          county_code,
          district_code,
          school_code,
          profile_status,
          %s,
          %s
        from stage_school_profile
        on conflict (identity_key) do update
        set
          identity_resolution = 'resolved',
          name = excluded.name,
          county_code = excluded.county_code,
          district_code = excluded.district_code,
          school_code = excluded.school_code,
          status = excluded.status,
          last_seen_snapshot_id = excluded.last_seen_snapshot_id,
          updated_at = now()
        """,
        (source_snapshot_id, source_snapshot_id),
    )
    connection.execute(
        """
        update cse.entity as school
        set parent_entity_id = district.id
        from stage_school_profile as stage
        join cse.entity as district
          on district.identity_key = 'district:' || stage.district_cds_code
        where school.identity_key = 'school:' || stage.cds_code
          and school.parent_entity_id is distinct from district.id
        """
    )
    connection.execute(
        """
        update cse.entity as district
        set parent_entity_id = county.id
        from (
          select distinct district_cds_code, county_code
          from stage_school_profile
        ) as stage
        join cse.entity as county
          on county.identity_key = 'county:' || stage.county_code || repeat('0', 12)
        where district.identity_key = 'district:' || stage.district_cds_code
          and district.parent_entity_id is distinct from county.id
        """
    )
    row = connection.execute("select count(*) from stage_school_profile").fetchone()
    return int(row[0]) if row is not None else 0


def _load_school_profiles(connection: Connection[tuple[Any, ...]], source_snapshot_id: int) -> int:
    connection.execute(
        "delete from cse.entity_profile where source_snapshot_id = %s",
        (source_snapshot_id,),
    )
    cursor = connection.execute(
        """
        insert into cse.entity_profile (
          entity_id, source_snapshot_id, school_year, sector, profile_status,
          school_type, school_level, grade_low, grade_high, open_date, closed_date,
          charter, virtual_type, magnet, title_i, dass, street, city, state_code,
          zip_code, latitude, longitude, locale, website_url, enrollment_total,
          staff_total, teacher_staff, administrator_staff, metadata
        )
        select
          entity.id,
          %s,
          stage.school_year,
          'public',
          stage.profile_status,
          stage.school_type,
          stage.school_level,
          stage.grade_low,
          stage.grade_high,
          stage.open_date,
          stage.closed_date,
          stage.charter,
          stage.virtual_type,
          stage.magnet,
          stage.title_i,
          stage.dass,
          stage.street,
          stage.city,
          stage.state_code,
          stage.zip_code,
          stage.latitude,
          stage.longitude,
          stage.locale,
          stage.website_url,
          stage.enrollment_total,
          stage.staff_total,
          stage.teacher_staff,
          stage.administrator_staff,
          stage.metadata
        from stage_school_profile as stage
        join cse.entity as entity
          on entity.identity_key = 'school:' || stage.cds_code
        """,
        (source_snapshot_id,),
    )
    return cursor.rowcount


def ingest_school_geography(
    database_url: str,
    manifest: DatasetManifest,
    source_path: str | Path,
) -> IngestResult:
    """Load a pinned school geography snapshot and audit every profile row."""

    inspection = inspect_school_geography(manifest, source_path)
    connection = psycopg.connect(require_database_url(database_url))
    source_snapshot_id = 0
    import_run_id = 0
    try:
        with connection.transaction():
            source_snapshot_id, snapshot_status = _register_snapshot(
                connection, manifest, inspection
            )
            if snapshot_status == "imported":
                row = connection.execute(
                    "select count(*), count(distinct entity_id) "
                    "from cse.entity_profile where source_snapshot_id = %s",
                    (source_snapshot_id,),
                ).fetchone()
                rows_loaded = int(row[0]) if row is not None else 0
                entities_touched = int(row[1]) if row is not None else 0
                if rows_loaded != inspection.record_count:
                    raise DatabaseError(
                        "imported school profile row count mismatch: expected "
                        f"{inspection.record_count}, got {rows_loaded}"
                    )
                return IngestResult(
                    source_snapshot_id=source_snapshot_id,
                    import_run_id=None,
                    rows_loaded=rows_loaded,
                    entities_touched=entities_touched,
                    rows_suppressed=0,
                    reused_existing_snapshot=True,
                )
            import_run_id = _start_import_run(connection, source_snapshot_id)
        with connection.transaction():
            _create_school_profile_staging(connection)
            _copy_school_profiles(connection, manifest, source_path)
            entities_touched = _load_school_profile_entities(connection, source_snapshot_id)
            rows_loaded = _load_school_profiles(connection, source_snapshot_id)
            if rows_loaded != inspection.record_count:
                raise DatabaseError(
                    "loaded school profile row count mismatch: expected "
                    f"{inspection.record_count}, got {rows_loaded}"
                )
            connection.execute("analyze cse.entity, cse.entity_profile")
            connection.execute(
                """
                update cse.import_run
                set status = 'succeeded', completed_at = clock_timestamp(),
                    rows_read = %s, rows_loaded = %s, rows_suppressed = 0
                where id = %s
                """,
                (inspection.record_count, rows_loaded, import_run_id),
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
            rows_suppressed=0,
            reused_existing_snapshot=False,
        )
    except Exception as error:
        if source_snapshot_id and import_run_id:
            with connection.transaction():
                connection.execute(
                    """
                    update cse.import_run
                    set status = 'failed', completed_at = clock_timestamp(),
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
