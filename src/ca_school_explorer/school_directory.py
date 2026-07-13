"""Validate and normalize official CDE school geography and directory profiles."""

from __future__ import annotations

import csv
import re
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from ca_school_explorer.dataset_manifest import DatasetManifest, ManifestError, verify_dataset_file

CDS_PATTERN = re.compile(r"^[0-9]{14}$")
DISTRICT_PATTERN = re.compile(r"^[0-9]{7}$")
SCHOOL_PATTERN = re.compile(r"^[0-9]{7}$")


class SchoolDirectoryError(ValueError):
    """Raised when a school directory snapshot violates its source contract."""


@dataclass(frozen=True, slots=True)
class SchoolGeographyRow:
    """One normalized public-school location and classification profile."""

    source_row_number: int
    school_year: str
    cds_code: str
    district_cds_code: str
    county_code: str
    district_code: str
    school_code: str
    county_name: str
    district_name: str
    school_name: str
    profile_status: str
    school_type: str
    school_level: str
    grade_low: str | None
    grade_high: str | None
    open_date: date | None
    closed_date: date | None
    charter: bool
    virtual_type: str
    magnet: bool
    title_i: bool
    dass: bool
    street: str
    city: str
    state_code: str
    zip_code: str
    latitude: Decimal
    longitude: Decimal
    locale: str | None
    website_url: str | None
    enrollment_total: int | None
    staff_total: Decimal | None
    teacher_staff: Decimal | None
    administrator_staff: Decimal | None
    metadata: dict[str, Any]


@dataclass(frozen=True, slots=True)
class SchoolGeographyInspection:
    """Quality summary for a complete school geography snapshot."""

    record_count: int
    coordinate_count: int
    active_count: int
    closed_count: int
    charter_count: int
    aggregate_level_counts: dict[str, int]
    reporting_categories: tuple[str, ...]
    metric_counts: dict[str, int]
    ambiguous_entity_count: int = 0
    suppressed_count: int = 0

    @property
    def observation_count(self) -> int:
        return self.record_count


def _required(raw: dict[str, str], field: str, row_number: int) -> str:
    value = raw.get(field)
    if value is None:
        raise SchoolDirectoryError(f"row {row_number}: missing field {field!r}")
    stripped = value.strip()
    if not stripped:
        raise SchoolDirectoryError(f"row {row_number}: {field!r} must not be empty")
    return stripped


def _optional(raw: dict[str, str], field: str) -> str | None:
    value = (raw.get(field) or "").strip()
    return value or None


def _boolean(raw: dict[str, str], field: str, row_number: int) -> bool:
    value = _required(raw, field, row_number)
    if value == "Y":
        return True
    if value == "N":
        return False
    raise SchoolDirectoryError(f"row {row_number}: invalid {field!r} flag {value!r}")


def _decimal(raw: dict[str, str], field: str, row_number: int) -> Decimal:
    try:
        return Decimal(_required(raw, field, row_number))
    except InvalidOperation as error:
        raise SchoolDirectoryError(f"row {row_number}: invalid decimal {field!r}") from error


def _optional_decimal(raw: dict[str, str], field: str, row_number: int) -> Decimal | None:
    value = _optional(raw, field)
    if value is None:
        return None
    try:
        parsed = Decimal(value)
    except InvalidOperation as error:
        raise SchoolDirectoryError(f"row {row_number}: invalid decimal {field!r}") from error
    if parsed < 0:
        raise SchoolDirectoryError(f"row {row_number}: negative value for {field!r}")
    return parsed


def _optional_integer(raw: dict[str, str], field: str, row_number: int) -> int | None:
    value = _optional(raw, field)
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError as error:
        raise SchoolDirectoryError(f"row {row_number}: invalid integer {field!r}") from error
    if parsed < 0:
        raise SchoolDirectoryError(f"row {row_number}: negative value for {field!r}")
    return parsed


def _optional_date(raw: dict[str, str], field: str, row_number: int) -> date | None:
    value = _optional(raw, field)
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%m/%d/%Y %I:%M:%S %p").date()
    except ValueError as error:
        raise SchoolDirectoryError(f"row {row_number}: invalid date {field!r}") from error


def _profile_metadata(raw: dict[str, str]) -> dict[str, Any]:
    demographic_names = (
        "African American",
        "American Indian",
        "Asian",
        "Filipino",
        "Hispanic",
        "Pacific Islander",
        "White",
        "Two or More Races",
        "Not Reported",
        "English Learner",
        "Foster",
        "Homeless",
        "Migrant",
        "Socioeconomically Disadvantaged",
        "Students with Disabilities",
        "Free/Reduced Meal Eligible",
    )
    demographics = {
        name: {
            "count": _optional(raw, name),
            "percent": _optional(raw, f"{name} (%)"),
        }
        for name in demographic_names
    }
    enrollment_by_grade = {
        grade.removeprefix("Grade "): _optional(raw, grade)
        for grade in (
            "Grade TK",
            "Grade KG",
            "Grade 1",
            "Grade 2",
            "Grade 3",
            "Grade 4",
            "Grade 5",
            "Grade 6",
            "Grade 7",
            "Grade 8",
            "Grade 9",
            "Grade 10",
            "Grade 11",
            "Grade 12",
        )
    }
    return {
        "federal_id": _optional(raw, "Fed ID"),
        "region": _optional(raw, "Region"),
        "county_name": _optional(raw, "County Name"),
        "district_name": _optional(raw, "District Name"),
        "charter_number": _optional(raw, "Charter Num"),
        "charter_funding_type": _optional(raw, "Charter Funding Type"),
        "essa_assistance_status": _optional(raw, "Assistance Status ESSA"),
        "demographics": demographics,
        "enrollment_by_grade": enrollment_by_grade,
        "geographic_county_code": _optional(raw, "Geographic County Code"),
        "geographic_county_name": _optional(raw, "Geographic County Name"),
        "geographic_elementary_district_code": _optional(
            raw, "Geographic Elementary District Code"
        ),
        "geographic_high_district_code": _optional(raw, "Geographic High District Code"),
        "geographic_unified_district_code": _optional(raw, "Geographic Unified District Code"),
        "us_congressional_district": _optional(raw, "US Congressional District"),
        "state_senate_district": _optional(raw, "CA State Senate District"),
        "state_assembly_district": _optional(raw, "CA State Assembly District"),
        "staff_pupil_services": _optional(raw, "Staff Pupil Services"),
        "staff_other": _optional(raw, "Staff Other"),
    }


def _normalize_row(
    raw: dict[str, str], row_number: int, manifest: DatasetManifest
) -> SchoolGeographyRow:
    school_year = _required(raw, "Academic Year", row_number)
    if school_year != manifest.academic_year:
        raise SchoolDirectoryError(f"row {row_number}: unexpected academic year {school_year}")
    cds_code = _required(raw, "CDS Code", row_number)
    district_cds = _required(raw, "District Code", row_number)
    school_code = _required(raw, "School Code", row_number)
    if not CDS_PATTERN.fullmatch(cds_code):
        raise SchoolDirectoryError(f"row {row_number}: invalid CDS code {cds_code!r}")
    if not DISTRICT_PATTERN.fullmatch(district_cds):
        raise SchoolDirectoryError(f"row {row_number}: invalid district code {district_cds!r}")
    if not SCHOOL_PATTERN.fullmatch(school_code):
        raise SchoolDirectoryError(f"row {row_number}: invalid school code {school_code!r}")
    if cds_code != f"{district_cds}{school_code}":
        raise SchoolDirectoryError(f"row {row_number}: CDS components do not reconcile")
    latitude = _decimal(raw, "Latitude", row_number)
    longitude = _decimal(raw, "Longitude", row_number)
    if not Decimal("-90") <= latitude <= Decimal("90"):
        raise SchoolDirectoryError(f"row {row_number}: latitude is out of range")
    if not Decimal("-180") <= longitude <= Decimal("180"):
        raise SchoolDirectoryError(f"row {row_number}: longitude is out of range")
    status = _required(raw, "Status", row_number).lower()
    if status not in {"active", "closed"}:
        raise SchoolDirectoryError(f"row {row_number}: unsupported status {status!r}")
    return SchoolGeographyRow(
        source_row_number=row_number,
        school_year=school_year,
        cds_code=cds_code,
        district_cds_code=f"{district_cds}{'0' * 7}",
        county_code=cds_code[:2],
        district_code=cds_code[2:7],
        school_code=school_code,
        county_name=_required(raw, "County Name", row_number),
        district_name=_required(raw, "District Name", row_number),
        school_name=_required(raw, "School Name", row_number),
        profile_status=status,
        school_type=_required(raw, "School Type", row_number),
        school_level=_required(raw, "School Level", row_number),
        grade_low=_optional(raw, "Grade Low"),
        grade_high=_optional(raw, "Grade High"),
        open_date=_optional_date(raw, "Open Date", row_number),
        closed_date=_optional_date(raw, "Closed Date", row_number),
        charter=_boolean(raw, "Charter", row_number),
        virtual_type=_required(raw, "Virtual", row_number),
        magnet=_boolean(raw, "Magnet", row_number),
        title_i=_boolean(raw, "Title I", row_number),
        dass=_boolean(raw, "DASS", row_number),
        street=_required(raw, "Street", row_number),
        city=_required(raw, "City", row_number),
        state_code=_required(raw, "State", row_number),
        zip_code=_required(raw, "Zip", row_number),
        latitude=latitude,
        longitude=longitude,
        locale=_optional(raw, "Locale"),
        website_url=_optional(raw, "School Website"),
        enrollment_total=_optional_integer(raw, "Enroll Total", row_number),
        staff_total=_optional_decimal(raw, "Staff Total", row_number),
        teacher_staff=_optional_decimal(raw, "Staff Teacher", row_number),
        administrator_staff=_optional_decimal(raw, "Staff Admin", row_number),
        metadata=_profile_metadata(raw),
    )


def iter_school_geography_rows(
    manifest: DatasetManifest, source_path: str | Path
) -> Iterator[SchoolGeographyRow]:
    """Yield normalized school profiles from the pinned CSV contract."""

    if manifest.adapter != "school_geography_v1":
        raise ManifestError(f"unsupported school geography adapter: {manifest.adapter}")
    with Path(source_path).open("r", encoding=manifest.encoding, newline="") as source_file:
        reader = csv.DictReader(source_file)
        actual_columns = tuple(reader.fieldnames or ())
        if actual_columns != manifest.columns:
            raise SchoolDirectoryError(
                f"header mismatch: expected {manifest.columns}, got {actual_columns}"
            )
        for row_number, raw in enumerate(reader, start=2):
            yield _normalize_row(raw, row_number, manifest)


def inspect_school_geography(
    manifest: DatasetManifest, source_path: str | Path
) -> SchoolGeographyInspection:
    """Verify a complete geography snapshot before database writes."""

    verify_dataset_file(manifest, source_path)
    cds_codes: set[str] = set()
    active_count = 0
    closed_count = 0
    charter_count = 0
    record_count = 0
    for row in iter_school_geography_rows(manifest, source_path):
        record_count += 1
        if row.cds_code in cds_codes:
            raise SchoolDirectoryError(
                f"row {row.source_row_number}: duplicate CDS code {row.cds_code}"
            )
        cds_codes.add(row.cds_code)
        active_count += row.profile_status == "active"
        closed_count += row.profile_status == "closed"
        charter_count += row.charter
    if record_count != manifest.record_count:
        raise SchoolDirectoryError(
            f"record count mismatch: expected {manifest.record_count}, got {record_count}"
        )
    return SchoolGeographyInspection(
        record_count=record_count,
        coordinate_count=record_count,
        active_count=active_count,
        closed_count=closed_count,
        charter_count=charter_count,
        aggregate_level_counts={"S": record_count},
        reporting_categories=(),
        metric_counts={},
    )
