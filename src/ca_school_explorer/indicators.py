"""Normalize additional official CDE indicator datasets into one metric grain."""

from __future__ import annotations

import csv
import hashlib
import re
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from ca_school_explorer.dataset_manifest import DatasetManifest, ManifestError, verify_dataset_file

DATAQUEST_LEVELS = frozenset({"T", "C", "D", "S"})
ACADEMIC_LEVELS = frozenset({"X", "D", "S"})
CODE_PATTERNS = {
    "county": re.compile(r"^[0-9]{2}$"),
    "district": re.compile(r"^[0-9]{5}$"),
    "school": re.compile(r"^[0-9]{7}$"),
    "cds": re.compile(r"^[0-9]{14}$"),
}
type RateFields = tuple[int | None, int | None, Decimal | None, str, str]


class IndicatorDataError(ValueError):
    """Raised when an official indicator file violates its pinned contract."""


@dataclass(frozen=True, slots=True)
class MetricObservation:
    """One normalized metric observation from an official source row."""

    source_row_number: int
    school_year: str
    aggregate_level: str
    entity_identity_key: str
    identity_resolution: str
    entity_cds_code: str
    parent_cds_code: str | None
    entity_type: str
    entity_name: str
    county_code: str | None
    district_code: str | None
    school_code: str | None
    charter_scope: str
    dass_scope: str
    source_reporting_category: str
    metric_id: str
    denominator: int | None
    numerator: int | None
    value: Decimal | None
    suppression_status: str
    reliability_status: str
    metadata: dict[str, Any]

    @property
    def natural_key(self) -> tuple[str, ...]:
        return (
            self.school_year,
            self.entity_type,
            self.entity_cds_code,
            _normalized_name(self.entity_name),
            self.charter_scope,
            self.dass_scope,
            self.source_reporting_category,
            self.metric_id,
        )


@dataclass(frozen=True, slots=True)
class MetricDatasetInspection:
    """Quality-gate summary created before a database transaction starts."""

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
    ambiguous_entity_keys: frozenset[tuple[str, str]]


def _required(raw: dict[str, str], field: str, row_number: int) -> str:
    value = raw.get(field)
    if value is None:
        raise IndicatorDataError(f"row {row_number}: missing field {field!r}")
    stripped = value.strip()
    if not stripped:
        raise IndicatorDataError(f"row {row_number}: {field!r} must not be empty")
    return stripped


def _optional(raw: dict[str, str], field: str) -> str:
    return (raw.get(field) or "").strip()


def _first_optional(raw: dict[str, str], *fields: str) -> str:
    for field in fields:
        value = _optional(raw, field)
        if value:
            return value
    return ""


def _normalized_name(name: str) -> str:
    return " ".join(name.casefold().split())


def _identity_key(
    entity_type: str,
    cds_code: str,
    entity_name: str,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> tuple[str, str]:
    if (entity_type, cds_code) not in ambiguous_entity_keys:
        return f"{entity_type}:{cds_code}", "resolved"
    digest = hashlib.sha256(_normalized_name(entity_name).encode()).hexdigest()[:16]
    return f"{entity_type}:{cds_code}:name:{digest}", "ambiguous"


def _scope(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"", "all"}:
        return "all"
    if normalized in {"y", "yes"}:
        return "yes"
    if normalized in {"n", "no"}:
        return "no"
    raise IndicatorDataError(f"invalid scope {value!r}")


def _validate_code(value: str, kind: str, row_number: int) -> None:
    if not CODE_PATTERNS[kind].fullmatch(value):
        raise IndicatorDataError(f"row {row_number}: invalid {kind} code {value!r}")


def _dataquest_entity(
    raw: dict[str, str],
    aggregate_level: str,
    row_number: int,
) -> tuple[str, str | None, str, str, str | None, str | None, str | None]:
    county = _optional(raw, "CountyCode")
    district = _optional(raw, "DistrictCode")
    school = _optional(raw, "SchoolCode")
    if aggregate_level == "T":
        return "0" * 14, None, "state", "California", None, None, None
    _validate_code(county, "county", row_number)
    if aggregate_level == "C":
        return (
            f"{county}{'0' * 12}",
            "0" * 14,
            "county",
            _required(raw, "CountyName", row_number),
            county,
            None,
            None,
        )
    _validate_code(district, "district", row_number)
    if aggregate_level == "D":
        return (
            f"{county}{district}{'0' * 7}",
            f"{county}{'0' * 12}",
            "district",
            _required(raw, "DistrictName", row_number),
            county,
            district,
            None,
        )
    _validate_code(school, "school", row_number)
    return (
        f"{county}{district}{school}",
        f"{county}{district}{'0' * 7}",
        "school",
        _required(raw, "SchoolName", row_number),
        county,
        district,
        school,
    )


def _academic_entity(
    raw: dict[str, str], row_number: int
) -> tuple[str, str | None, str, str, str | None, str | None, str | None]:
    cds = _required(raw, "cds", row_number)
    _validate_code(cds, "cds", row_number)
    level = _required(raw, "rtype", row_number)
    if level == "X":
        return cds, None, "state", "California", None, None, None
    county, district, school = cds[:2], cds[2:7], cds[7:]
    _validate_code(county, "county", row_number)
    _validate_code(district, "district", row_number)
    if level == "D":
        return (
            cds,
            f"{county}{'0' * 12}",
            "district",
            _required(raw, "districtname", row_number),
            county,
            district,
            None,
        )
    _validate_code(school, "school", row_number)
    return (
        cds,
        f"{county}{district}{'0' * 7}",
        "school",
        _required(raw, "schoolname", row_number),
        county,
        district,
        school,
    )


def _decimal(value: str, row_number: int, field: str) -> Decimal:
    try:
        return Decimal(value)
    except InvalidOperation as error:
        raise IndicatorDataError(f"row {row_number}: invalid numeric field {field!r}") from error


def _integer(value: str, row_number: int, field: str) -> int:
    try:
        parsed = int(value)
    except ValueError as error:
        raise IndicatorDataError(f"row {row_number}: invalid integer field {field!r}") from error
    if parsed < 0:
        raise IndicatorDataError(f"row {row_number}: {field!r} must not be negative")
    return parsed


def _rate_fields(
    denominator_raw: str,
    numerator_raw: str,
    value_raw: str,
    row_number: int,
    *,
    allow_zero_denominator: bool = False,
    reliability_denominator: int | None = None,
) -> RateFields:
    values = (denominator_raw, numerator_raw, value_raw)
    if all(value == "*" for value in values):
        return None, None, None, "suppressed", "suppressed"
    if any(value == "*" for value in values):
        raise IndicatorDataError(f"row {row_number}: partial suppression is not allowed")
    denominator = _integer(denominator_raw, row_number, "denominator")
    numerator = _integer(numerator_raw, row_number, "numerator")
    value = _decimal(value_raw, row_number, "rate")
    if numerator > denominator:
        raise IndicatorDataError(f"row {row_number}: numerator exceeds denominator")
    if denominator == 0:
        if not allow_zero_denominator or numerator != 0 or value != 0:
            raise IndicatorDataError(f"row {row_number}: invalid zero-denominator rate")
    else:
        expected = (Decimal(numerator) * 100 / Decimal(denominator)).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )
        if value != expected:
            raise IndicatorDataError(
                f"row {row_number}: published rate {value} does not reconcile to {expected}"
            )
    sample_size = denominator if reliability_denominator is None else reliability_denominator
    reliability = "small-sample" if sample_size < 30 else "reliable"
    return denominator, numerator, value, "reported", reliability


def _base_observation(
    *,
    row_number: int,
    school_year: str,
    aggregate_level: str,
    entity: tuple[str, str | None, str, str, str | None, str | None, str | None],
    ambiguous_entity_keys: frozenset[tuple[str, str]],
    charter_scope: str,
    dass_scope: str,
    reporting_category: str,
    metric_id: str,
    fields: RateFields,
    metadata: dict[str, Any],
) -> MetricObservation:
    identity_key, resolution = _identity_key(entity[2], entity[0], entity[3], ambiguous_entity_keys)
    return MetricObservation(
        source_row_number=row_number,
        school_year=school_year,
        aggregate_level=aggregate_level,
        entity_identity_key=identity_key,
        identity_resolution=resolution,
        entity_cds_code=entity[0],
        parent_cds_code=entity[1],
        entity_type=entity[2],
        entity_name=entity[3],
        county_code=entity[4],
        district_code=entity[5],
        school_code=entity[6],
        charter_scope=charter_scope,
        dass_scope=dass_scope,
        source_reporting_category=reporting_category,
        metric_id=metric_id,
        denominator=fields[0],
        numerator=fields[1],
        value=fields[2],
        suppression_status=fields[3],
        reliability_status=fields[4],
        metadata=metadata,
    )


def _academic_observations(
    raw: dict[str, str],
    row_number: int,
    manifest: DatasetManifest,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> Iterator[MetricObservation]:
    level = _required(raw, "rtype", row_number)
    if level not in ACADEMIC_LEVELS:
        raise IndicatorDataError(f"row {row_number}: invalid aggregate level {level!r}")
    reporting_year = _required(raw, "reportingyear", row_number)
    expected_reporting_year = f"20{manifest.academic_year[-2:]}"
    if reporting_year != expected_reporting_year:
        raise IndicatorDataError(f"row {row_number}: unexpected reporting year {reporting_year}")
    indicator = _required(raw, "indicator", row_number).upper()
    metric_ids = {"ELA": "ela_distance_from_standard", "MATH": "math_distance_from_standard"}
    metric_id = metric_ids.get(indicator)
    if metric_id is None:
        raise IndicatorDataError(f"row {row_number}: unsupported academic indicator {indicator!r}")
    denominator = _integer(_required(raw, "currdenom", row_number), row_number, "currdenom")
    value_raw = _optional(raw, "currstatus")
    fields: RateFields
    if not value_raw:
        if denominator == 0:
            fields = (denominator, None, None, "not-available", "not-available")
        elif denominator <= 10:
            fields = (denominator, None, None, "suppressed", "suppressed")
        else:
            raise IndicatorDataError(
                f"row {row_number}: missing current status with denominator {denominator}"
            )
    else:
        fields = (
            denominator,
            None,
            _decimal(value_raw, row_number, "currstatus"),
            "reported",
            "small-sample" if denominator < 30 else "reliable",
        )
    entity = _academic_entity(raw, row_number)
    metadata = {
        "prior_denominator": _optional(raw, "priordenom") or None,
        "prior_status": _optional(raw, "priorstatus") or None,
        "change": _optional(raw, "change") or None,
        "status_level": _optional(raw, "statuslevel") or None,
        "change_level": _optional(raw, "changelevel") or None,
        "color": _optional(raw, "color") or None,
        "box": _optional(raw, "box") or None,
        "current_n_size_met": _optional(raw, "currnsizemet") or None,
        "prior_n_size_met": _optional(raw, "priornsizemet") or None,
        "accountability_met": _optional(raw, "accountabilitymet") or None,
        "participation_rate": _optional(raw, "currprate") or None,
        "participation_rate_loss": _optional(raw, "currnumPRLOSS") or None,
        "charter_flag": _optional(raw, "charter_flag") or None,
        "coe_flag": _optional(raw, "coe_flag") or None,
        "dass_flag": _optional(raw, "dass_flag") or None,
    }
    yield _base_observation(
        row_number=row_number,
        school_year=manifest.academic_year,
        aggregate_level=level,
        entity=entity,
        ambiguous_entity_keys=ambiguous_entity_keys,
        charter_scope=_scope(_optional(raw, "charter_flag")),
        dass_scope=_scope(_optional(raw, "dass_flag")),
        reporting_category=_required(raw, "studentgroup", row_number),
        metric_id=metric_id,
        fields=fields,
        metadata=metadata,
    )


def _suspension_observations(
    raw: dict[str, str],
    row_number: int,
    manifest: DatasetManifest,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> Iterator[MetricObservation]:
    school_year = _required(raw, "AcademicYear", row_number)
    if school_year != manifest.academic_year:
        raise IndicatorDataError(f"row {row_number}: unexpected academic year {school_year}")
    level = _required(raw, "AggregateLevel", row_number)
    if level not in DATAQUEST_LEVELS:
        raise IndicatorDataError(f"row {row_number}: invalid aggregate level {level!r}")
    fields = _rate_fields(
        _required(raw, "CumulativeEnrollment", row_number),
        _required(raw, "Unduplicated Count of Students Suspended (Total)", row_number),
        _required(raw, "Suspension Rate (Total)", row_number),
        row_number,
        allow_zero_denominator=True,
    )
    yield _base_observation(
        row_number=row_number,
        school_year=school_year,
        aggregate_level=level,
        entity=_dataquest_entity(raw, level, row_number),
        ambiguous_entity_keys=ambiguous_entity_keys,
        charter_scope=_scope(_required(raw, "CharterYN", row_number)),
        dass_scope="all",
        reporting_category=_required(raw, "ReportingCategory", row_number),
        metric_id="suspension_rate",
        fields=fields,
        metadata={
            "total_suspensions": _optional(raw, "Total Suspensions") or None,
            "defiance_only_students": _optional(
                raw, "Unduplicated Count of Students Suspended (Defiance-Only)"
            )
            or None,
            "violent_injury_count": _optional(raw, "Suspension Count Violent Incident (Injury)")
            or None,
            "violent_no_injury_count": _optional(
                raw, "Suspension Count Violent Incident (No Injury)"
            )
            or None,
            "weapons_count": _optional(raw, "Suspension Count Weapons Possession") or None,
            "drug_related_count": _optional(raw, "Suspension Count Illicit Drug-Related") or None,
            "defiance_suspension_count": _optional(raw, "Suspension Count Defiance-Only") or None,
            "other_reason_count": _optional(raw, "Suspension Count Other Reasons") or None,
        },
    )


def _acgr_observations(
    raw: dict[str, str],
    row_number: int,
    manifest: DatasetManifest,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> Iterator[MetricObservation]:
    school_year = _required(raw, "AcademicYear", row_number)
    if school_year != manifest.academic_year:
        raise IndicatorDataError(f"row {row_number}: unexpected academic year {school_year}")
    level = _required(raw, "AggregateLevel", row_number)
    if level not in DATAQUEST_LEVELS:
        raise IndicatorDataError(f"row {row_number}: invalid aggregate level {level!r}")
    cohort = _required(raw, "CohortStudents", row_number)
    graduate_count = _required(raw, "Regular HS Diploma Graduates (Count)", row_number)
    entity = _dataquest_entity(raw, level, row_number)
    charter_scope = _scope(_required(raw, "CharterSchool", row_number))
    dass_scope = _scope(_required(raw, "DASS", row_number))
    reporting_category = _required(raw, "ReportingCategory", row_number)

    def observation(
        metric_id: str, fields: RateFields, metadata: dict[str, Any]
    ) -> MetricObservation:
        return _base_observation(
            row_number=row_number,
            school_year=school_year,
            aggregate_level=level,
            entity=entity,
            ambiguous_entity_keys=ambiguous_entity_keys,
            charter_scope=charter_scope,
            dass_scope=dass_scope,
            reporting_category=reporting_category,
            metric_id=metric_id,
            fields=fields,
            metadata=metadata,
        )

    graduation = _rate_fields(
        cohort,
        graduate_count,
        _required(raw, "Regular HS Diploma Graduates (Rate)", row_number),
        row_number,
    )
    yield observation("four_year_graduation_rate", graduation, {})
    ag_fields: RateFields
    dropout_fields: RateFields
    if cohort == "*":
        ag_fields = (None, None, None, "suppressed", "suppressed")
        dropout_fields = (None, None, None, "suppressed", "suppressed")
    else:
        cohort_size = _integer(cohort, row_number, "CohortStudents")
        ag_fields = _rate_fields(
            graduate_count,
            _required(raw, "Met UC/CSU Grad Req's (Count)", row_number),
            _required(raw, "Met UC/CSU Grad Req's (Rate)", row_number),
            row_number,
            allow_zero_denominator=True,
            reliability_denominator=cohort_size,
        )
        dropout_fields = _rate_fields(
            cohort,
            _required(raw, "Dropout (Count)", row_number),
            _required(raw, "Dropout (Rate)", row_number),
            row_number,
        )
    yield observation(
        "a_g_completion_rate",
        ag_fields,
        {"rate_denominator": "regular_high_school_diploma_graduates"},
    )
    yield observation("four_year_dropout_rate", dropout_fields, {})


def _cci_observations(
    raw: dict[str, str],
    row_number: int,
    manifest: DatasetManifest,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> Iterator[MetricObservation]:
    level = _required(raw, "rtype", row_number)
    if level not in ACADEMIC_LEVELS:
        raise IndicatorDataError(f"row {row_number}: invalid aggregate level {level!r}")
    reporting_year = _required(raw, "reportingyear", row_number)
    expected_reporting_year = f"20{manifest.academic_year[-2:]}"
    if reporting_year != expected_reporting_year:
        raise IndicatorDataError(f"row {row_number}: unexpected reporting year {reporting_year}")
    if _required(raw, "indicator", row_number).upper() != "CCI":
        raise IndicatorDataError(f"row {row_number}: expected CCI indicator")

    denominator_raw = _required(raw, "currdenom", row_number)
    denominator = _integer(denominator_raw, row_number, "currdenom")
    value_raw = _optional(raw, "currstatus")
    if not value_raw:
        if denominator <= 10:
            fields: RateFields = (
                denominator,
                None,
                None,
                "suppressed",
                "suppressed",
            )
        else:
            raise IndicatorDataError(
                f"row {row_number}: missing CCI status with denominator {denominator}"
            )
    else:
        fields = _rate_fields(
            denominator_raw,
            _required(raw, "curr_prep", row_number),
            value_raw,
            row_number,
        )

    prepared_measures = {
        "summative_assessments": _optional(raw, "curr_prep_summative") or None,
        "advanced_placement": _first_optional(raw, "curr_prep_ap", "curr_prep_apexam") or None,
        "international_baccalaureate": _optional(raw, "curr_prep_ibexam") or None,
        "college_credit": _optional(raw, "curr_prep_collegecredit") or None,
        "a_g_plus": _optional(raw, "curr_prep_agplus") or None,
        "cte_plus": _optional(raw, "curr_prep_cteplus") or None,
        "seal_of_biliteracy": _optional(raw, "curr_prep_ssb") or None,
        "military_science": _optional(raw, "curr_prep_milsci") or None,
        "registered_pre_apprenticeship": _optional(raw, "curr_prep_reg_pre") or None,
        "non_registered_pre_apprenticeship": _optional(raw, "curr_prep_non_reg_pre") or None,
        "state_or_federal_job_program_dass": _first_optional(
            raw, "curr_prep_statefedjobs_dass", "curr_prep_statefedjobs_DASS"
        )
        or None,
        "transition_classroom_work": _optional(raw, "curr_prep_trans_classwk") or None,
    }
    yield _base_observation(
        row_number=row_number,
        school_year=manifest.academic_year,
        aggregate_level=level,
        entity=_academic_entity(raw, row_number),
        ambiguous_entity_keys=ambiguous_entity_keys,
        charter_scope=_scope(_optional(raw, "charter_flag")),
        dass_scope=_scope(_optional(raw, "dass_flag")),
        reporting_category=_required(raw, "studentgroup", row_number),
        metric_id="college_career_prepared_rate",
        fields=fields,
        metadata={
            "student_group_percent": _optional(raw, "studentgroup_pct") or None,
            "approaching_prepared_count": _optional(raw, "curr_aprep") or None,
            "not_prepared_count": _optional(raw, "curr_nprep") or None,
            "prior_denominator": _optional(raw, "priordenom") or None,
            "prior_status": _optional(raw, "priorstatus") or None,
            "change": _optional(raw, "change") or None,
            "status_level": _optional(raw, "statuslevel") or None,
            "change_level": _optional(raw, "changelevel") or None,
            "color": _optional(raw, "color") or None,
            "current_n_size_met": _optional(raw, "currnsizemet") or None,
            "prior_n_size_met": _optional(raw, "priornsizemet") or None,
            "accountability_met": _optional(raw, "accountabilitymet") or None,
            "prepared_measure_counts": prepared_measures,
        },
    )


def _college_going_12_month_observations(
    raw: dict[str, str],
    row_number: int,
    manifest: DatasetManifest,
    ambiguous_entity_keys: frozenset[tuple[str, str]],
) -> Iterator[MetricObservation]:
    school_year = _required(raw, "AcademicYear", row_number)
    if school_year != manifest.academic_year:
        raise IndicatorDataError(f"row {row_number}: unexpected academic year {school_year}")
    level = _required(raw, "AggregateLevel", row_number)
    if level not in DATAQUEST_LEVELS:
        raise IndicatorDataError(f"row {row_number}: invalid aggregate level {level!r}")
    if _required(raw, "CompleterType", row_number) != "TA":
        return

    fields = _rate_fields(
        _required(raw, "High School Completers", row_number),
        _required(raw, "Enrolled In College - Total (12 Months)", row_number),
        _required(raw, "College Going Rate - Total (12 Months)", row_number),
        row_number,
    )
    yield _base_observation(
        row_number=row_number,
        school_year=school_year,
        aggregate_level=level,
        entity=_dataquest_entity(raw, level, row_number),
        ambiguous_entity_keys=ambiguous_entity_keys,
        charter_scope=_scope(_required(raw, "CharterSchool", row_number)),
        dass_scope=_scope(_required(raw, "AlternativeSchoolAccountabilityStatus", row_number)),
        reporting_category=_required(raw, "ReportingCategory", row_number),
        metric_id="college_going_rate_12_month",
        fields=fields,
        metadata={
            "completer_type": "all_high_school_completers",
            "enrolled_in_state": _optional(raw, "Enrolled In-State (12 Months)") or None,
            "enrolled_out_of_state": _optional(raw, "Enrolled Out-of-State (12 Months)") or None,
            "not_enrolled": _optional(raw, "Not Enrolled In College (12 Months)") or None,
            "enrolled_uc": _optional(raw, "Enrolled UC (12 Months)") or None,
            "enrolled_csu": _optional(raw, "Enrolled CSU (12 Months)") or None,
            "enrolled_ccc": _optional(raw, "Enrolled CCC (12 Months)") or None,
            "enrolled_in_state_private": _optional(
                raw, "Enrolled In-State Private (2 and 4 Year) (12 Months)"
            )
            or None,
            "enrolled_out_of_state_four_year": _optional(
                raw,
                "Enrolled Out-of-State 4-Year College (Public/Private) (12 Months)",
            )
            or None,
            "enrolled_out_of_state_two_year": _optional(
                raw,
                "Enrolled Out-of-State 2-Year College (Public/Private) (12 Months)",
            )
            or None,
        },
    )


ADAPTERS = {
    "academic_indicator_v1": _academic_observations,
    "suspension_v1": _suspension_observations,
    "acgr_v1": _acgr_observations,
    "cci_v1": _cci_observations,
    "college_going_12_month_v1": _college_going_12_month_observations,
}


def _source_record_count(manifest: DatasetManifest, source_path: str | Path) -> int:
    with Path(source_path).open("r", encoding=manifest.encoding, newline="") as source_file:
        reader = csv.DictReader(source_file, delimiter="\t")
        actual_columns = tuple(reader.fieldnames or ())
        if actual_columns != manifest.columns:
            raise IndicatorDataError(
                f"header mismatch: expected {manifest.columns}, got {actual_columns}"
            )
        return sum(1 for _ in reader)


def iter_metric_observations(
    manifest: DatasetManifest,
    source_path: str | Path,
    ambiguous_entity_keys: frozenset[tuple[str, str]] = frozenset(),
) -> Iterator[MetricObservation]:
    """Yield normalized observations while enforcing the exact header contract."""

    adapter = ADAPTERS.get(manifest.adapter)
    if adapter is None:
        raise ManifestError(f"unsupported metric adapter: {manifest.adapter}")
    with Path(source_path).open("r", encoding=manifest.encoding, newline="") as source_file:
        reader = csv.DictReader(source_file, delimiter="\t")
        actual_columns = tuple(reader.fieldnames or ())
        if actual_columns != manifest.columns:
            raise IndicatorDataError(
                f"header mismatch: expected {manifest.columns}, got {actual_columns}"
            )
        for row_number, raw in enumerate(reader, start=2):
            yield from adapter(raw, row_number, manifest, ambiguous_entity_keys)


def inspect_metric_dataset(
    manifest: DatasetManifest, source_path: str | Path
) -> MetricDatasetInspection:
    """Verify a source snapshot and summarize its normalized observation grain."""

    if manifest.adapter not in ADAPTERS:
        raise ManifestError(f"unsupported metric adapter: {manifest.adapter}")
    verify_dataset_file(manifest, source_path)
    record_count = _source_record_count(manifest, source_path)
    if record_count != manifest.record_count:
        raise IndicatorDataError(
            f"record count mismatch: expected {manifest.record_count}, got {record_count}"
        )
    levels: Counter[str] = Counter()
    metrics: Counter[str] = Counter()
    categories: set[str] = set()
    natural_keys: set[tuple[str, ...]] = set()
    entity_variants: dict[tuple[str, str], set[tuple[str, str | None]]] = {}
    source_rows: set[int] = set()
    suppressed = 0
    small_sample = 0
    not_available = 0
    observation_count = 0
    for observation in iter_metric_observations(manifest, source_path):
        observation_count += 1
        if observation.source_row_number not in source_rows:
            source_rows.add(observation.source_row_number)
            levels[observation.aggregate_level] += 1
        metrics[observation.metric_id] += 1
        categories.add(observation.source_reporting_category)
        variant = (_normalized_name(observation.entity_name), observation.parent_cds_code)
        entity_variants.setdefault(
            (observation.entity_type, observation.entity_cds_code), set()
        ).add(variant)
        if observation.natural_key in natural_keys:
            raise IndicatorDataError(
                f"row {observation.source_row_number}: duplicate natural observation grain"
            )
        natural_keys.add(observation.natural_key)
        if observation.suppression_status == "suppressed":
            suppressed += 1
        if observation.reliability_status == "small-sample":
            small_sample += 1
        if observation.suppression_status == "not-available":
            not_available += 1
    expected_levels = (
        ACADEMIC_LEVELS
        if manifest.adapter in {"academic_indicator_v1", "cci_v1"}
        else DATAQUEST_LEVELS
    )
    if set(levels) != expected_levels:
        raise IndicatorDataError(
            f"aggregate-level drift: expected {sorted(expected_levels)}, got {sorted(levels)}"
        )
    ambiguous = frozenset(key for key, variants in entity_variants.items() if len(variants) > 1)
    entity_count = sum(len(variants) for variants in entity_variants.values())
    return MetricDatasetInspection(
        record_count=record_count,
        observation_count=observation_count,
        suppressed_count=suppressed,
        small_sample_count=small_sample,
        not_available_count=not_available,
        entity_count=entity_count,
        ambiguous_entity_count=sum(len(entity_variants[key]) for key in ambiguous),
        aggregate_level_counts=dict(sorted(levels.items())),
        reporting_categories=tuple(sorted(categories)),
        metric_counts=dict(sorted(metrics.items())),
        ambiguous_entity_keys=ambiguous,
    )
