"""Normalize official school teaching and resource data at school-year grain."""

from __future__ import annotations

import csv
import re
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from ca_school_explorer.dataset_manifest import DatasetManifest, ManifestError, verify_dataset_file

CDS_PATTERN = re.compile(r"^[0-9]{14}$")

TEACHER_PREPARATION_YEARS = {"Y1": "2021-22", "Y2": "2022-23", "Y3": "2023-24"}
CLASS_SIZE_YEARS = {"Y1": "2022-23", "Y2": "2023-24", "Y3": "2024-25"}


class ResourceDataError(ValueError):
    """Raised when a teaching-resource source file violates its pinned contract."""


@dataclass(frozen=True, slots=True)
class ResourceObservation:
    """One normalized resource observation from an official source row."""

    source_row_number: int
    school_year: str
    cds_code: str
    metric_id: str
    dimension: str
    value: Decimal
    numerator: Decimal | None
    denominator: Decimal | None
    metadata: dict[str, Any]

    @property
    def natural_key(self) -> tuple[str, str, str, str]:
        return (self.cds_code, self.school_year, self.metric_id, self.dimension)


@dataclass(frozen=True, slots=True)
class ResourceDatasetInspection:
    """Quality-gate summary created before a resource import starts."""

    record_count: int
    observation_count: int
    suppressed_count: int
    small_sample_count: int
    not_available_count: int
    entity_count: int
    ambiguous_entity_count: int
    aggregate_level_counts: dict[str, int]
    reporting_categories: tuple[str, ...]
    metric_counts: dict[str, int]
    school_years: tuple[str, ...]


def _reader(manifest: DatasetManifest, source_path: str | Path) -> Iterator[dict[str, str]]:
    verify_dataset_file(manifest, source_path)
    with Path(source_path).open(encoding=manifest.encoding, newline="") as source_file:
        reader = csv.DictReader(source_file, delimiter="\t")
        if reader.fieldnames is None:
            raise ResourceDataError("source file does not contain a header")
        actual_columns = tuple(reader.fieldnames)
        if actual_columns != manifest.columns:
            raise ManifestError(
                f"dataset header mismatch: expected {manifest.columns!r}, got {actual_columns!r}"
            )
        yield from reader


def _required(raw: dict[str, str], field: str, row_number: int) -> str:
    value = (raw.get(field) or "").strip()
    if not value:
        raise ResourceDataError(f"row {row_number}: {field!r} must not be empty")
    return value


def _optional_decimal(raw: dict[str, str], field: str, row_number: int) -> Decimal | None:
    value = (raw.get(field) or "").strip()
    if not value:
        return None
    try:
        parsed = Decimal(value)
    except InvalidOperation as error:
        raise ResourceDataError(
            f"row {row_number}: invalid numeric field {field!r}: {value!r}"
        ) from error
    if not parsed.is_finite() or parsed < 0:
        raise ResourceDataError(f"row {row_number}: {field!r} must be nonnegative")
    return parsed


def _cds(raw: dict[str, str], field: str, row_number: int) -> str:
    value = _required(raw, field, row_number)
    if not CDS_PATTERN.fullmatch(value):
        raise ResourceDataError(f"row {row_number}: invalid CDS code {value!r}")
    return value


def _json_number(value: Decimal | None) -> int | float | None:
    if value is None:
        return None
    if value == value.to_integral_value():
        return int(value)
    return float(value)


def _teacher_preparation(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    cds_code = _cds(raw, "CDSCODE", row_number)
    if _required(raw, "SARCYear", row_number) != "2024-2025":
        raise ResourceDataError(f"row {row_number}: unexpected SARCYear")
    categories = {
        "fully_credentialed": ("SNFUL", "SPFUL"),
        "intern": ("SNINT", "SPINT"),
        "without_credentials_or_misassigned": ("SNMIS", "SPMIS"),
        "out_of_field": ("SNOOF", "SPOOF"),
        "unknown": ("SNUNK", "SPUNK"),
    }
    for suffix, school_year in TEACHER_PREPARATION_YEARS.items():
        total = _optional_decimal(raw, f"SNTTP_{suffix}", row_number)
        category_fields = [
            field
            for number_prefix, percent_prefix in categories.values()
            for field in (f"{number_prefix}_{suffix}", f"{percent_prefix}_{suffix}")
        ]
        category_values = [_optional_decimal(raw, field, row_number) for field in category_fields]
        if total is not None and total <= 0:
            if any(value not in {None, Decimal(0)} for value in category_values):
                total = None
            else:
                continue
        for dimension, (number_prefix, percent_prefix) in categories.items():
            numerator = _optional_decimal(raw, f"{number_prefix}_{suffix}", row_number)
            percent = _optional_decimal(raw, f"{percent_prefix}_{suffix}", row_number)
            if numerator is None or percent is None:
                continue
            if percent > 100:
                raise ResourceDataError(
                    f"row {row_number}: invalid teacher-preparation value for {suffix}"
                )
            yield ResourceObservation(
                source_row_number=row_number,
                school_year=school_year,
                cds_code=cds_code,
                metric_id="teacher_assignment_percent",
                dimension=dimension,
                value=percent,
                numerator=numerator,
                denominator=total,
                metadata={"reportingYear": "2024-25"},
            )


def _class_size_observations(
    raw: dict[str, str],
    row_number: int,
    *,
    dimensions: dict[str, str],
    small_prefix: str,
    medium_prefix: str,
    large_prefix: str,
    thresholds: tuple[str, str, str],
) -> Iterator[ResourceObservation]:
    cds_code = _cds(raw, "CDSCODE", row_number)
    sarc_year_field = "SarcYear" if "SarcYear" in raw else "SARCYear"
    if _required(raw, sarc_year_field, row_number) != "2024-2025":
        raise ResourceDataError(f"row {row_number}: unexpected SarcYear")
    for suffix, school_year in CLASS_SIZE_YEARS.items():
        for code, dimension in dimensions.items():
            average = _optional_decimal(raw, f"AVG{code}_{suffix}", row_number)
            if average is None or average <= 0:
                continue
            small = _optional_decimal(raw, f"{small_prefix}{code}_{suffix}", row_number)
            medium = _optional_decimal(raw, f"{medium_prefix}{code}_{suffix}", row_number)
            large = _optional_decimal(raw, f"{large_prefix}{code}_{suffix}", row_number)
            yield ResourceObservation(
                source_row_number=row_number,
                school_year=school_year,
                cds_code=cds_code,
                metric_id="average_class_size",
                dimension=dimension,
                value=average,
                numerator=None,
                denominator=None,
                metadata={
                    "classCounts": {
                        "small": _json_number(small),
                        "medium": _json_number(medium),
                        "large": _json_number(large),
                    },
                    "classSizeBands": {
                        "small": thresholds[0],
                        "medium": thresholds[1],
                        "large": thresholds[2],
                    },
                },
            )


def _elementary_class_size(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    dimensions = {
        "K": "grade_k",
        "1": "grade_1",
        "2": "grade_2",
        "3": "grade_3",
        "4": "grade_4",
        "5": "grade_5",
        "6": "grade_6",
        "O": "grade_other",
    }
    yield from _class_size_observations(
        raw,
        row_number,
        dimensions=dimensions,
        small_prefix="NCS",
        medium_prefix="NCM",
        large_prefix="NCL",
        thresholds=("1-20", "21-32", "33+"),
    )


def _secondary_class_size(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    dimensions = {
        "EN": "subject_english",
        "MA": "subject_mathematics",
        "SC": "subject_science",
        "SS": "subject_social_science",
    }
    yield from _class_size_observations(
        raw,
        row_number,
        dimensions=dimensions,
        small_prefix="NCS",
        medium_prefix="NCM",
        large_prefix="NCL",
        thresholds=("1-22", "23-32", "33+"),
    )


def _counselor_ratio(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    cds_code = _cds(raw, "CDSCode", row_number)
    school_year = _required(raw, "SARCYear", row_number)
    if school_year != "2024-25":
        raise ResourceDataError(f"row {row_number}: unexpected SARCYear")
    value = _optional_decimal(raw, "PTAC", row_number)
    if value is None or value <= 0:
        return
    yield ResourceObservation(
        source_row_number=row_number,
        school_year=school_year,
        cds_code=cds_code,
        metric_id="pupils_per_academic_counselor",
        dimension="all_students",
        value=value,
        numerator=None,
        denominator=None,
        metadata={},
    )


def _support_staff(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    cds_code = _cds(raw, "CDSCode", row_number)
    school_year = _required(raw, "SARCYear", row_number)
    if school_year != "2024-25":
        raise ResourceDataError(f"row {row_number}: unexpected SARCYear")
    dimensions = {
        "COUNS": "counselor",
        "LMT": "library_media_teacher",
        "LMS": "library_services_staff",
        "PSY": "psychologist",
        "SW": "social_worker",
        "NUR": "nurse",
        "SLHS": "speech_language_hearing_specialist",
        "RSNT": "resource_specialist",
        "OTHR": "other",
    }
    for field, dimension in dimensions.items():
        value = _optional_decimal(raw, field, row_number)
        if value is None:
            continue
        yield ResourceObservation(
            source_row_number=row_number,
            school_year=school_year,
            cds_code=cds_code,
            metric_id="support_staff_fte",
            dimension=dimension,
            value=value,
            numerator=None,
            denominator=None,
            metadata={},
        )


def _staff_experience(raw: dict[str, str], row_number: int) -> Iterator[ResourceObservation]:
    if (
        _required(raw, "Aggregate Level", row_number) != "S"
        or _required(raw, "Staff Type", row_number) != "TCH"
        or _required(raw, "Staff Gender", row_number) != "ALL"
    ):
        return
    county = _required(raw, "County Code", row_number)
    district = _required(raw, "District Code", row_number)
    school = _required(raw, "School Code", row_number)
    cds_code = f"{county}{district}{school}"
    if not CDS_PATTERN.fullmatch(cds_code):
        raise ResourceDataError(f"row {row_number}: invalid school CDS components")
    school_year = _required(raw, "Academic Year", row_number)
    if school_year != "2025-26":
        raise ResourceDataError(f"row {row_number}: unexpected Academic Year")
    count_fields = {
        "total": "Total Staff Count",
        "experienced": "Experienced",
        "inexperienced": "Inexperienced",
        "first_year": "First Year",
        "second_year": "Second Year",
    }
    counts = {
        dimension: _optional_decimal(raw, field, row_number)
        for dimension, field in count_fields.items()
    }
    total = counts["total"]
    if total is None or total <= 0:
        return
    if any(value is None for value in counts.values()):
        raise ResourceDataError(f"row {row_number}: incomplete teacher experience counts")
    experienced = counts["experienced"] or Decimal(0)
    inexperienced = counts["inexperienced"] or Decimal(0)
    if experienced + inexperienced != total:
        raise ResourceDataError(f"row {row_number}: experience categories do not reconcile")
    metadata = {
        "schoolGradeSpan": _required(raw, "School Grade Span", row_number),
        "charter": _required(raw, "Charter School", row_number),
        "dass": _required(raw, "DASS", row_number),
    }
    averages = {
        "total": _optional_decimal(raw, "Average Total Years Experience", row_number),
        "district": _optional_decimal(raw, "Average District Years Experience", row_number),
    }
    for dimension, value in averages.items():
        if value is None:
            continue
        yield ResourceObservation(
            source_row_number=row_number,
            school_year=school_year,
            cds_code=cds_code,
            metric_id="teacher_experience_average",
            dimension=dimension,
            value=value,
            numerator=None,
            denominator=total,
            metadata=metadata,
        )
    for dimension, value in counts.items():
        if value is None:
            continue
        yield ResourceObservation(
            source_row_number=row_number,
            school_year=school_year,
            cds_code=cds_code,
            metric_id="teacher_experience_count",
            dimension=dimension,
            value=value,
            numerator=None,
            denominator=total,
            metadata=metadata,
        )


RESOURCE_ADAPTERS = {
    "sarc_teacher_preparation_v1": _teacher_preparation,
    "sarc_elementary_class_size_v1": _elementary_class_size,
    "sarc_secondary_class_size_v1": _secondary_class_size,
    "sarc_counselor_ratio_v1": _counselor_ratio,
    "sarc_support_staff_v1": _support_staff,
    "staff_experience_v1": _staff_experience,
}


def iter_resource_observations(
    manifest: DatasetManifest, source_path: str | Path
) -> Iterator[ResourceObservation]:
    """Yield normalized observations for one supported resource snapshot."""

    adapter = RESOURCE_ADAPTERS.get(manifest.adapter)
    if adapter is None:
        raise ResourceDataError(f"unsupported resource adapter: {manifest.adapter}")
    record_count = 0
    for row_number, raw in enumerate(_reader(manifest, source_path), start=2):
        record_count += 1
        yield from adapter(raw, row_number)
    if record_count != manifest.record_count:
        raise ResourceDataError(
            f"record count mismatch: expected {manifest.record_count}, got {record_count}"
        )


def inspect_school_resources(
    manifest: DatasetManifest, source_path: str | Path
) -> ResourceDatasetInspection:
    """Verify a pinned resource file and summarize its normalized coverage."""

    metric_counts: Counter[str] = Counter()
    dimensions: set[str] = set()
    schools: set[str] = set()
    years: set[str] = set()
    natural_keys: set[tuple[str, str, str, str]] = set()
    observation_count = 0
    for observation in iter_resource_observations(manifest, source_path):
        if observation.natural_key in natural_keys:
            raise ResourceDataError(f"duplicate resource observation: {observation.natural_key}")
        natural_keys.add(observation.natural_key)
        metric_counts[observation.metric_id] += 1
        dimensions.add(observation.dimension)
        schools.add(observation.cds_code)
        years.add(observation.school_year)
        observation_count += 1
    return ResourceDatasetInspection(
        record_count=manifest.record_count,
        observation_count=observation_count,
        suppressed_count=0,
        small_sample_count=0,
        not_available_count=0,
        entity_count=len(schools),
        ambiguous_entity_count=0,
        aggregate_level_counts={"S": len(schools)},
        reporting_categories=tuple(sorted(dimensions)),
        metric_counts=dict(sorted(metric_counts.items())),
        school_years=tuple(sorted(years)),
    )
