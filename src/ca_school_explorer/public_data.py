"""Publish browser-safe, source-attributed data from the canonical database."""

from __future__ import annotations

import json
import shutil
import tempfile
from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg

from ca_school_explorer.database import require_database_url

DEFAULT_OUTPUT_ROOT = Path("apps/web/public/data")
SCHOOL_INDEX_CHUNK_SIZE = 2_500
LATEST_OBSERVATION_ENCODING = [
    "year",
    "metricIndex",
    "value",
    "denominator",
    "reliabilityCode",
    "sourceSnapshotId",
]


class PublicDataError(RuntimeError):
    """Raised when a public bundle cannot be generated safely."""


@dataclass(frozen=True, slots=True)
class PublishResult:
    """Summary of a completed public-data export."""

    release: str
    school_count: int
    district_count: int
    observation_count: int
    school_shard_count: int
    district_file_count: int
    output_root: str


def _number(value: Any) -> int | float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            return int(value)
        return float(value)
    if isinstance(value, (int, float)):
        return value
    raise PublicDataError(f"unsupported numeric value: {type(value).__name__}")


def _grade_label(value: str | None) -> str:
    labels = {"KG": "K", "TK": "TK", "PS": "Pre-K"}
    if value is None:
        return "Unknown"
    normalized = labels.get(value, value)
    if normalized.isdigit():
        return str(int(normalized))
    return normalized


def _grade_span(low: str | None, high: str | None) -> str:
    low_label = _grade_label(low)
    high_label = _grade_label(high)
    return low_label if low_label == high_label else f"{low_label}\u2013{high_label}"


def _demographics(metadata: Mapping[str, Any]) -> dict[str, dict[str, int | float | None]]:
    raw = metadata.get("demographics")
    if not isinstance(raw, Mapping):
        return {}
    result: dict[str, dict[str, int | float | None]] = {}
    for label, values in raw.items():
        if not isinstance(label, str) or not isinstance(values, Mapping):
            continue
        count = values.get("count")
        percent = values.get("percent")
        try:
            parsed_count = int(str(count)) if count not in {None, ""} else None
            parsed_percent = float(str(percent)) if percent not in {None, ""} else None
        except ValueError:
            continue
        result[label] = {"count": parsed_count, "percent": parsed_percent}
    return result


def _observation(
    row: Sequence[Any],
    metric_indexes: Mapping[str, int],
    subgroup_indexes: Mapping[str, int],
) -> list[int | float | None]:
    reliability_codes = {
        "reliable": 0,
        "small-sample": 1,
        "suppressed": 2,
        "not-available": 3,
        "method-break": 4,
    }
    return [
        int(row[0]),
        metric_indexes[str(row[1])],
        subgroup_indexes[str(row[2])],
        _number(row[3]),
        _number(row[4]),
        _number(row[5]),
        reliability_codes[str(row[6])],
        int(row[7]),
    ]


def _latest_all_student_observations(
    observations: Sequence[Sequence[int | float | None]],
    all_students_index: int,
) -> list[list[int | float | None]]:
    """Return one compact latest observation per metric for statewide discovery."""

    latest: dict[int, Sequence[int | float | None]] = {}
    for observation in observations:
        if len(observation) != 8 or observation[2] != all_students_index:
            continue
        year, metric_value, source_value = observation[0], observation[1], observation[7]
        if (
            not isinstance(year, (int, float))
            or not isinstance(metric_value, (int, float))
            or not isinstance(source_value, (int, float))
        ):
            raise PublicDataError("invalid compact school observation")
        metric_index = int(metric_value)
        current = latest.get(metric_index)
        candidate_key = (int(year), int(source_value))
        current_key = (
            (int(current[0] or -1), int(current[7] or -1)) if current is not None else (-1, -1)
        )
        if candidate_key >= current_key:
            latest[metric_index] = observation
    return [
        [
            observation[0],
            observation[1],
            observation[3],
            observation[5],
            observation[6],
            observation[7],
        ]
        for _, observation in sorted(latest.items())
    ]


def _attach_latest_observations(
    schools: Sequence[dict[str, Any]],
    school_records: Mapping[str, Mapping[str, Mapping[str, Any]]],
    all_students_index: int,
) -> int:
    enriched = 0
    for school in schools:
        shard = str(school.get("shard", ""))
        school_id = str(school.get("id", ""))
        record = school_records.get(shard, {}).get(school_id)
        observations = record.get("observations") if isinstance(record, Mapping) else None
        school["latestObservations"] = _latest_all_student_observations(
            observations if isinstance(observations, Sequence) else [],
            all_students_index,
        )
        enriched += 1
    return enriched


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(payload, output, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        output.write("\n")


def _safe_output_path(output_root: str | Path) -> Path:
    root = Path(output_root).resolve()
    if root in {Path("/").resolve(), Path.cwd().resolve()}:
        raise PublicDataError("output root must be a dedicated subdirectory")
    return root


def enrich_public_index_evidence(
    output_root: str | Path = DEFAULT_OUTPUT_ROOT,
    *,
    release: str | None = None,
    generated_at: datetime | None = None,
) -> int:
    """Backfill compact latest evidence into an existing published public index."""

    root = _safe_output_path(output_root)
    manifest_path = root / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PublicDataError(f"unable to read public manifest: {manifest_path}") from error
    if manifest.get("schemaVersion") != 1:
        raise PublicDataError("unsupported public data schema version")
    subgroups = manifest.get("subgroups")
    if not isinstance(subgroups, list):
        raise PublicDataError("public manifest is missing subgroup definitions")
    all_students_index = next(
        (
            index
            for index, subgroup in enumerate(subgroups)
            if isinstance(subgroup, Mapping) and subgroup.get("id") == "all"
        ),
        None,
    )
    if all_students_index is None:
        raise PublicDataError("public manifest is missing the all-students subgroup")

    shard_cache: dict[str, Mapping[str, Any]] = {}
    enriched = 0
    index_files = manifest.get("schoolIndexFiles")
    if not isinstance(index_files, list):
        raise PublicDataError("public manifest is missing school index files")
    for relative_path in index_files:
        index_path = root / str(relative_path)
        try:
            index_payload = json.loads(index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise PublicDataError(f"unable to read school index: {index_path}") from error
        schools = index_payload.get("schools")
        if not isinstance(schools, list):
            raise PublicDataError(f"school index is missing schools: {index_path}")
        for school in schools:
            if not isinstance(school, dict):
                continue
            shard = str(school.get("shard", ""))
            if shard not in shard_cache:
                shard_path = root / "schools" / f"{shard}.json"
                try:
                    shard_payload = json.loads(shard_path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError) as error:
                    raise PublicDataError(f"unable to read school shard: {shard_path}") from error
                records = shard_payload.get("schools")
                if not isinstance(records, Mapping):
                    raise PublicDataError(f"school shard is missing records: {shard_path}")
                shard_cache[shard] = records
            enriched += _attach_latest_observations(
                [school], {shard: shard_cache[shard]}, all_students_index
            )
        _write_json(index_path, index_payload)

    manifest["latestObservationEncoding"] = LATEST_OBSERVATION_ENCODING
    if release is not None:
        manifest["release"] = release
        generated = (generated_at or datetime.now(UTC)).astimezone(UTC)
        manifest["generatedAt"] = generated.isoformat().replace("+00:00", "Z")
    _write_json(manifest_path, manifest)
    return enriched


def publish_public_data(
    database_url: str,
    output_root: str | Path = DEFAULT_OUTPUT_ROOT,
    *,
    release: str = "0.3.2",
    generated_at: datetime | None = None,
) -> PublishResult:
    """Export a compact statewide index and county-sharded indicator bundles."""

    destination = _safe_output_path(output_root)
    generated = (generated_at or datetime.now(UTC)).astimezone(UTC)
    parent = destination.parent
    parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="cse-public-data-", dir=parent) as temporary:
        temporary_root = Path(temporary)
        with psycopg.connect(require_database_url(database_url)) as connection:
            connection.execute("set transaction read only")

            profile_rows = connection.execute(
                """
                select
                  school.cds_code,
                  school.name,
                  school.status,
                  school.county_code,
                  district.cds_code,
                  district.name,
                  profile.school_year,
                  profile.profile_status,
                  profile.school_type,
                  profile.school_level,
                  profile.grade_low,
                  profile.grade_high,
                  profile.charter,
                  profile.virtual_type,
                  profile.magnet,
                  profile.title_i,
                  profile.dass,
                  profile.street,
                  profile.city,
                  profile.state_code,
                  profile.zip_code,
                  profile.latitude,
                  profile.longitude,
                  profile.enrollment_total,
                  profile.staff_total,
                  profile.teacher_staff,
                  profile.administrator_staff,
                  profile.metadata
                from cse.current_entity_profile profile
                join cse.entity school on school.id = profile.entity_id
                join cse.entity district on district.id = school.parent_entity_id
                where
                  school.entity_type = 'school'
                  and school.identity_resolution = 'resolved'
                order by school.cds_code
                """
            ).fetchall()

            schools: list[dict[str, Any]] = []
            school_records: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
            school_shards: dict[str, str] = {}
            district_names: dict[str, dict[str, str]] = defaultdict(dict)
            profile_years: set[str] = set()
            for row in profile_rows:
                metadata = row[27] if isinstance(row[27], Mapping) else {}
                county_code = str(row[3])
                district_id = str(row[4])
                school_id = str(row[0])
                shard_id = f"{county_code}-{int(school_id[-6:]) % 8}"
                school_shards[school_id] = shard_id
                profile_years.add(str(row[6]))
                district_names[county_code][district_id] = str(row[5])
                summary = {
                    "id": school_id,
                    "name": str(row[1]),
                    "status": str(row[7] or row[2]),
                    "countyCode": county_code,
                    "county": str(
                        metadata.get("geographic_county_name")
                        or metadata.get("county_name")
                        or county_code
                    ),
                    "districtId": district_id,
                    "district": str(row[5]),
                    "shard": shard_id,
                    "city": str(row[18] or "Unknown"),
                    "gradeSpan": _grade_span(row[10], row[11]),
                    "schoolType": str(row[8] or "Unknown"),
                    "schoolLevel": str(row[9] or "Unknown"),
                    "charter": bool(row[12]),
                    "virtualType": str(row[13] or "Not virtual"),
                    "magnet": bool(row[14]),
                    "titleI": bool(row[15]),
                    "dass": bool(row[16]),
                    "address": {
                        "street": str(row[17] or ""),
                        "city": str(row[18] or ""),
                        "state": str(row[19] or "CA"),
                        "zip": str(row[20] or ""),
                    },
                    "latitude": _number(row[21]),
                    "longitude": _number(row[22]),
                    "enrollment": _number(row[23]),
                    "staff": {
                        "total": _number(row[24]),
                        "teachers": _number(row[25]),
                        "administrators": _number(row[26]),
                    },
                }
                schools.append(summary)
                school_records[shard_id][school_id] = {
                    "demographics": _demographics(metadata),
                    "observations": [],
                }

            metric_rows = connection.execute(
                """
                select
                  metric.metric_id,
                  metric.label,
                  metric.description,
                  metric.unit,
                  metric.direction,
                  metric.methodology_version,
                  metric.source_key,
                  source.name,
                  source.landing_page_url
                from cse.metric metric
                join cse.data_source source on source.source_key = metric.source_key
                order by metric.metric_id
                """
            ).fetchall()
            nav_labels = {
                "a_g_completion_rate": "A\u2013G completion",
                "chronic_absenteeism_rate": "Attendance",
                "college_career_prepared_rate": "College/career",
                "college_going_rate_12_month": "College-going",
                "ela_distance_from_standard": "ELA",
                "four_year_dropout_rate": "Dropout",
                "four_year_graduation_rate": "Graduation",
                "math_distance_from_standard": "Mathematics",
                "suspension_rate": "Suspension",
            }
            short_labels = {
                "a_g_completion_rate": "A\u2013G completion",
                "chronic_absenteeism_rate": "Chronic absence",
                "college_career_prepared_rate": "College/career prepared",
                "college_going_rate_12_month": "College-going within 12 months",
                "ela_distance_from_standard": "ELA distance",
                "four_year_dropout_rate": "Dropout rate",
                "four_year_graduation_rate": "Graduation rate",
                "math_distance_from_standard": "Math distance",
                "suspension_rate": "Suspension rate",
            }
            metrics = [
                {
                    "id": str(row[0]),
                    "navLabel": nav_labels.get(str(row[0]), str(row[1])),
                    "label": str(row[1]),
                    "shortLabel": short_labels.get(str(row[0]), str(row[1])),
                    "description": str(row[2]),
                    "unit": str(row[3]),
                    "direction": str(row[4]),
                    "methodologyVersion": str(row[5]),
                    "sourceKey": str(row[6]),
                    "sourceLabel": str(row[7]),
                    "sourceUrl": str(row[8]),
                }
                for row in metric_rows
            ]

            subgroup_rows = connection.execute(
                """
                select subgroup_id, label, category_type
                from cse.subgroup
                order by
                  case category_type
                    when 'total' then 0
                    when 'program' then 1
                    when 'race_ethnicity' then 2
                    when 'gender' then 3
                    else 4
                  end,
                  label
                """
            ).fetchall()
            subgroups = [
                {"id": str(row[0]), "label": str(row[1]), "category": str(row[2])}
                for row in subgroup_rows
            ]
            metric_indexes = {str(metric["id"]): index for index, metric in enumerate(metrics)}
            subgroup_indexes = {
                str(subgroup["id"]): index for index, subgroup in enumerate(subgroups)
            }

            snapshot_rows = connection.execute(
                """
                select
                  snapshot.id,
                  source.source_key,
                  source.name,
                  source.landing_page_url,
                  snapshot.dataset_id,
                  snapshot.academic_year,
                  snapshot.release_date,
                  snapshot.retrieved_at,
                  snapshot.sha256,
                  snapshot.terms_status
                from cse.current_source_snapshot current_snapshot
                join cse.source_snapshot snapshot on snapshot.id = current_snapshot.id
                join cse.data_source source on source.id = snapshot.data_source_id
                order by snapshot.id
                """
            ).fetchall()
            snapshots = [
                {
                    "id": int(row[0]),
                    "sourceKey": str(row[1]),
                    "sourceName": str(row[2]),
                    "sourceUrl": str(row[3]),
                    "datasetId": str(row[4]),
                    "schoolYear": str(row[5]),
                    "releaseDate": row[6].isoformat(),
                    "retrievedAt": row[7].astimezone(UTC).isoformat().replace("+00:00", "Z"),
                    "sha256": str(row[8]),
                    "termsStatus": str(row[9]),
                }
                for row in snapshot_rows
            ]

            outcome_year_rows = connection.execute(
                """
                select distinct school_year
                from cse.current_metric_observation
                order by school_year
                """
            ).fetchall()

            district_observations: dict[str, dict[str, list[list[int | float | None]]]] = (
                defaultdict(lambda: defaultdict(list))
            )
            district_cursor = connection.cursor(name="public_district_observations")
            district_cursor.execute(
                """
                select
                  entity.county_code,
                  entity.cds_code,
                  observation.school_year_start,
                  observation.metric_id,
                  observation.subgroup_id,
                  observation.value,
                  observation.numerator,
                  observation.denominator,
                  observation.reliability_status,
                  observation.source_snapshot_id
                from cse.current_metric_observation observation
                join cse.entity entity on entity.id = observation.entity_id
                where
                  entity.entity_type = 'district'
                  and entity.identity_resolution = 'resolved'
                  and observation.charter_scope = 'all'
                  and observation.dass_scope = 'all'
                order by entity.county_code, entity.cds_code, observation.metric_id,
                  observation.subgroup_id
                """
            )
            district_count = 0
            observation_count = 0
            for row in district_cursor:
                county_code = str(row[0])
                district_id = str(row[1])
                if not district_observations[county_code][district_id]:
                    district_count += 1
                district_observations[county_code][district_id].append(
                    _observation(row[2:], metric_indexes, subgroup_indexes)
                )
                observation_count += 1

            school_cursor = connection.cursor(name="public_school_observations")
            school_cursor.execute(
                """
                select
                  entity.county_code,
                  entity.cds_code,
                  observation.school_year_start,
                  observation.metric_id,
                  observation.subgroup_id,
                  observation.value,
                  observation.numerator,
                  observation.denominator,
                  observation.reliability_status,
                  observation.source_snapshot_id
                from cse.current_metric_observation observation
                join cse.entity entity on entity.id = observation.entity_id
                where
                  entity.entity_type = 'school'
                  and entity.identity_resolution = 'resolved'
                order by entity.county_code, entity.cds_code, observation.metric_id,
                  observation.subgroup_id
                """
            )
            for row in school_cursor:
                school_id = str(row[1])
                selected_shard = school_shards.get(school_id)
                record = school_records.get(selected_shard or "", {}).get(school_id)
                if record is None:
                    continue
                record["observations"].append(
                    _observation(row[2:], metric_indexes, subgroup_indexes)
                )
                observation_count += 1

            _attach_latest_observations(
                schools,
                school_records,
                subgroup_indexes["all"],
            )

            county_codes = sorted(district_names)
            for county_code in county_codes:
                districts = {
                    district_id: {
                        "name": district_names[county_code].get(district_id, district_id),
                        "observations": observations,
                    }
                    for district_id, observations in sorted(
                        district_observations.get(county_code, {}).items()
                    )
                }
                _write_json(
                    temporary_root / "districts" / f"{county_code}.json",
                    {
                        "schemaVersion": 1,
                        "countyCode": county_code,
                        "districts": districts,
                    },
                )
            for shard_id, records in sorted(school_records.items()):
                _write_json(
                    temporary_root / "schools" / f"{shard_id}.json",
                    {"schemaVersion": 1, "shard": shard_id, "schools": records},
                )

        school_index_files: list[str] = []
        for offset in range(0, len(schools), SCHOOL_INDEX_CHUNK_SIZE):
            file_name = f"schools-index/{offset // SCHOOL_INDEX_CHUNK_SIZE:02d}.json"
            school_index_files.append(file_name)
            _write_json(
                temporary_root / file_name,
                {
                    "schemaVersion": 1,
                    "schools": schools[offset : offset + SCHOOL_INDEX_CHUNK_SIZE],
                },
            )
        manifest = {
            "schemaVersion": 1,
            "release": release,
            "generatedAt": generated.isoformat().replace("+00:00", "Z"),
            "profileSchoolYears": sorted(profile_years),
            "outcomeSchoolYears": [str(row[0]) for row in outcome_year_rows],
            "schoolCount": len(schools),
            "schoolIndexFileCount": len(school_index_files),
            "schoolIndexFiles": school_index_files,
            "districtCount": district_count,
            "observationCount": observation_count,
            "schoolShardCount": len(school_records),
            "districtFileCount": len(county_codes),
            "metrics": metrics,
            "subgroups": subgroups,
            "sourceSnapshots": snapshots,
            "observationEncoding": [
                "year",
                "metricIndex",
                "subgroupIndex",
                "value",
                "numerator",
                "denominator",
                "reliabilityCode",
                "sourceSnapshotId",
            ],
            "latestObservationEncoding": LATEST_OBSERVATION_ENCODING,
            "reliabilityCodes": {
                "0": "reliable",
                "1": "small-sample",
                "2": "suppressed",
                "3": "not-available",
                "4": "method-break",
            },
            "dataNotice": (
                "Derived factual records from official public sources. Raw source files are not "
                "redistributed or relicensed. California School Explorer is independent and is "
                "not affiliated with or endorsed by the California Department of Education."
            ),
        }
        _write_json(temporary_root / "manifest.json", manifest)

        if destination.exists():
            shutil.rmtree(destination)
        shutil.move(str(temporary_root), destination)

    return PublishResult(
        release=release,
        school_count=len(schools),
        district_count=district_count,
        observation_count=observation_count,
        school_shard_count=len(school_records),
        district_file_count=len(county_codes),
        output_root=str(destination),
    )
