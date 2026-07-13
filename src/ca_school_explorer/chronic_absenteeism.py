"""Validate and normalize CDE chronic absenteeism source records."""

from __future__ import annotations

import csv
import re
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path

from ca_school_explorer.dataset_manifest import DatasetManifest, ManifestError, verify_dataset_file

AGGREGATE_LEVELS = frozenset({"T", "C", "D", "S"})
SCOPES = frozenset({"all", "yes", "no"})
CODE_PATTERNS = {
    "county": re.compile(r"^[0-9]{2}$"),
    "district": re.compile(r"^[0-9]{5}$"),
    "school": re.compile(r"^[0-9]{7}$"),
}


class ChronicAbsenteeismError(ValueError):
    """Raised when the official file violates its versioned source contract."""


@dataclass(frozen=True, slots=True)
class ChronicAbsenteeismRow:
    """One normalized observation from the CDE tab-delimited source."""

    source_row_number: int
    academic_year: str
    aggregate_level: str
    entity_cds_code: str
    parent_cds_code: str | None
    entity_type: str
    entity_name: str
    county_code: str | None
    district_code: str | None
    school_code: str | None
    charter_scope: str
    dass_scope: str
    reporting_category: str
    denominator: int | None
    numerator: int | None
    value: Decimal | None
    suppression_status: str
    reliability_status: str

    @property
    def natural_key(self) -> tuple[str, ...]:
        return (
            self.academic_year,
            self.aggregate_level,
            self.entity_cds_code,
            self.charter_scope,
            self.dass_scope,
            self.reporting_category,
        )


@dataclass(frozen=True, slots=True)
class DatasetInspection:
    """Quality-gate summary generated before any database transaction begins."""

    record_count: int
    suppressed_count: int
    small_sample_count: int
    aggregate_level_counts: dict[str, int]
    reporting_categories: tuple[str, ...]


def _required(raw: dict[str, str], field: str, row_number: int) -> str:
    value = raw.get(field)
    if value is None:
        raise ChronicAbsenteeismError(f"row {row_number}: missing field {field!r}")
    stripped = value.strip()
    if not stripped:
        raise ChronicAbsenteeismError(f"row {row_number}: {field!r} must not be empty")
    return stripped


def _optional_code(raw: dict[str, str], field: str) -> str:
    return (raw.get(field) or "").strip()


def _validate_code(value: str, code_type: str, row_number: int) -> None:
    if not CODE_PATTERNS[code_type].fullmatch(value):
        raise ChronicAbsenteeismError(f"row {row_number}: invalid {code_type} code {value!r}")


def _parse_scope(value: str, field: str, row_number: int) -> str:
    normalized = value.strip().lower()
    if normalized not in SCOPES:
        raise ChronicAbsenteeismError(f"row {row_number}: invalid {field} scope {value!r}")
    return normalized


def _parse_number_fields(
    raw: dict[str, str], row_number: int
) -> tuple[int | None, int | None, Decimal | None, str, str]:
    denominator_raw = _required(raw, "ChronicAbsenteeismEligibleCumulativeEnrollment", row_number)
    numerator_raw = _required(raw, "ChronicAbsenteeismCount", row_number)
    value_raw = _required(raw, "ChronicAbsenteeismRate", row_number)
    fields = (denominator_raw, numerator_raw, value_raw)

    if all(value == "*" for value in fields):
        return None, None, None, "suppressed", "suppressed"
    if any(value == "*" for value in fields):
        raise ChronicAbsenteeismError(f"row {row_number}: partial suppression is not allowed")

    try:
        denominator = int(denominator_raw)
        numerator = int(numerator_raw)
        value = Decimal(value_raw)
    except (InvalidOperation, ValueError) as error:
        raise ChronicAbsenteeismError(f"row {row_number}: invalid numeric observation") from error

    if denominator <= 0 or numerator < 0 or numerator > denominator:
        raise ChronicAbsenteeismError(
            f"row {row_number}: invalid numerator/denominator relationship"
        )
    if value < 0 or value > 100:
        raise ChronicAbsenteeismError(f"row {row_number}: rate must be between 0 and 100")
    expected_value = (Decimal(numerator) * 100 / Decimal(denominator)).quantize(
        Decimal("0.1"), rounding=ROUND_HALF_UP
    )
    if value != expected_value:
        raise ChronicAbsenteeismError(
            f"row {row_number}: rate {value} does not reconcile to {expected_value}"
        )
    reliability = "small-sample" if denominator < 30 else "reliable"
    return denominator, numerator, value, "reported", reliability


def _entity_fields(
    raw: dict[str, str], aggregate_level: str, row_number: int
) -> tuple[str, str | None, str, str, str | None, str | None, str | None]:
    county_code = _optional_code(raw, "County Code")
    district_code = _optional_code(raw, "District Code")
    school_code = _optional_code(raw, "School Code")

    if aggregate_level == "T":
        return "0" * 14, None, "state", "California", None, None, None

    _validate_code(county_code, "county", row_number)
    if aggregate_level == "C":
        name = _required(raw, "County Name", row_number)
        return (
            f"{county_code}{'0' * 12}",
            "0" * 14,
            "county",
            name,
            county_code,
            None,
            None,
        )

    _validate_code(district_code, "district", row_number)
    county_cds_code = f"{county_code}{'0' * 12}"
    if aggregate_level == "D":
        name = _required(raw, "District Name", row_number)
        return (
            f"{county_code}{district_code}{'0' * 7}",
            county_cds_code,
            "district",
            name,
            county_code,
            district_code,
            None,
        )

    _validate_code(school_code, "school", row_number)
    name = _required(raw, "School Name", row_number)
    return (
        f"{county_code}{district_code}{school_code}",
        f"{county_code}{district_code}{'0' * 7}",
        "school",
        name,
        county_code,
        district_code,
        school_code,
    )


def _normalize_row(
    raw: dict[str, str], row_number: int, manifest: DatasetManifest
) -> ChronicAbsenteeismRow:
    academic_year = _required(raw, "Academic Year", row_number)
    if academic_year != manifest.academic_year:
        raise ChronicAbsenteeismError(
            f"row {row_number}: expected academic year "
            f"{manifest.academic_year}, got {academic_year}"
        )
    aggregate_level = _required(raw, "Aggregate Level", row_number)
    if aggregate_level not in AGGREGATE_LEVELS:
        raise ChronicAbsenteeismError(
            f"row {row_number}: invalid aggregate level {aggregate_level!r}"
        )
    entity_fields = _entity_fields(raw, aggregate_level, row_number)
    number_fields = _parse_number_fields(raw, row_number)
    return ChronicAbsenteeismRow(
        source_row_number=row_number,
        academic_year=academic_year,
        aggregate_level=aggregate_level,
        entity_cds_code=entity_fields[0],
        parent_cds_code=entity_fields[1],
        entity_type=entity_fields[2],
        entity_name=entity_fields[3],
        county_code=entity_fields[4],
        district_code=entity_fields[5],
        school_code=entity_fields[6],
        charter_scope=_parse_scope(
            _required(raw, "Charter School", row_number), "charter", row_number
        ),
        dass_scope=_parse_scope(_required(raw, "DASS", row_number), "DASS", row_number),
        reporting_category=_required(raw, "Reporting Category", row_number),
        denominator=number_fields[0],
        numerator=number_fields[1],
        value=number_fields[2],
        suppression_status=number_fields[3],
        reliability_status=number_fields[4],
    )


def iter_chronic_absenteeism_rows(
    manifest: DatasetManifest, source_path: str | Path
) -> Iterator[ChronicAbsenteeismRow]:
    """Yield normalized rows while enforcing the versioned header contract."""

    with Path(source_path).open("r", encoding=manifest.encoding, newline="") as source_file:
        reader = csv.DictReader(source_file, delimiter="\t")
        if tuple(reader.fieldnames or ()) != manifest.columns:
            raise ChronicAbsenteeismError(
                f"header mismatch: expected {manifest.columns}, "
                f"got {tuple(reader.fieldnames or ())}"
            )
        for row_number, raw in enumerate(reader, start=2):
            yield _normalize_row(raw, row_number, manifest)


def inspect_chronic_absenteeism(
    manifest: DatasetManifest, source_path: str | Path
) -> DatasetInspection:
    """Run source-level quality gates before the database is modified."""

    if manifest.adapter != "chronic_absenteeism_v1":
        raise ManifestError(f"unsupported adapter: {manifest.adapter}")
    verify_dataset_file(manifest, source_path)

    level_counts: Counter[str] = Counter()
    categories: set[str] = set()
    natural_keys: set[tuple[str, ...]] = set()
    entity_metadata: dict[tuple[str, str], tuple[str | None, ...]] = {}
    record_count = 0
    suppressed_count = 0
    small_sample_count = 0

    for row in iter_chronic_absenteeism_rows(manifest, source_path):
        record_count += 1
        level_counts[row.aggregate_level] += 1
        categories.add(row.reporting_category)
        entity_key = (row.entity_type, row.entity_cds_code)
        metadata = (
            row.entity_name,
            row.parent_cds_code,
            row.county_code,
            row.district_code,
            row.school_code,
        )
        existing_metadata = entity_metadata.setdefault(entity_key, metadata)
        if existing_metadata != metadata:
            raise ChronicAbsenteeismError(
                f"row {row.source_row_number}: conflicting metadata for "
                f"{row.entity_type} {row.entity_cds_code}"
            )
        if row.natural_key in natural_keys:
            raise ChronicAbsenteeismError(
                f"row {row.source_row_number}: duplicate natural observation grain"
            )
        natural_keys.add(row.natural_key)
        if row.suppression_status == "suppressed":
            suppressed_count += 1
        if row.reliability_status == "small-sample":
            small_sample_count += 1

    if record_count != manifest.record_count:
        raise ChronicAbsenteeismError(
            f"record count mismatch: expected {manifest.record_count}, got {record_count}"
        )
    if set(level_counts) != AGGREGATE_LEVELS:
        raise ChronicAbsenteeismError(
            f"aggregate-level drift: expected {sorted(AGGREGATE_LEVELS)}, "
            f"got {sorted(level_counts)}"
        )

    return DatasetInspection(
        record_count=record_count,
        suppressed_count=suppressed_count,
        small_sample_count=small_sample_count,
        aggregate_level_counts=dict(sorted(level_counts.items())),
        reporting_categories=tuple(sorted(categories)),
    )
