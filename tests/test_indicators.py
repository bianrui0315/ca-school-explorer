from __future__ import annotations

from dataclasses import replace
from decimal import Decimal
from pathlib import Path

from ca_school_explorer.dataset_manifest import DatasetManifest, load_dataset_manifest, sha256_file
from ca_school_explorer.indicators import inspect_metric_dataset, iter_metric_observations

ROOT = Path(__file__).resolve().parents[1]


def _write_rows(
    tmp_path: Path,
    manifest_name: str,
    rows: list[dict[str, str]],
) -> tuple[DatasetManifest, Path]:
    original = load_dataset_manifest(ROOT / "config" / "datasets" / manifest_name)
    source_path = tmp_path / original.filename
    lines = ["\t".join(original.columns)]
    lines.extend("\t".join(row.get(column, "") for column in original.columns) for row in rows)
    source_path.write_bytes(("\r\n".join(lines) + "\r\n").encode(original.encoding))
    manifest = replace(
        original,
        dataset_id=f"test_{original.dataset_id}",
        download_url="https://example.com/test.txt",
        sha256=sha256_file(source_path),
        byte_size=source_path.stat().st_size,
        record_count=len(rows),
    )
    return manifest, source_path


def test_academic_indicator_preserves_reported_and_suppressed_values(tmp_path: Path) -> None:
    manifest, source_path = _write_rows(
        tmp_path,
        "cde_academic_indicator_ela_2024_25.toml",
        [
            {
                "cds": "01611196000001",
                "rtype": "S",
                "schoolname": "Example High",
                "districtname": "Example Unified",
                "countyname": "Alameda",
                "charter_flag": "N",
                "dass_flag": "N",
                "studentgroup": "ALL",
                "currdenom": "120",
                "currstatus": "12.5",
                "priordenom": "118",
                "priorstatus": "8.4",
                "change": "4.1",
                "indicator": "ELA",
                "reportingyear": "2025",
            },
            {
                "cds": "01611196000001",
                "rtype": "S",
                "schoolname": "Example High",
                "districtname": "Example Unified",
                "countyname": "Alameda",
                "charter_flag": "N",
                "dass_flag": "N",
                "studentgroup": "SWD",
                "currdenom": "8",
                "currstatus": "",
                "indicator": "ELA",
                "reportingyear": "2025",
            },
        ],
    )

    observations = list(iter_metric_observations(manifest, source_path))

    assert observations[0].metric_id == "ela_distance_from_standard"
    assert observations[0].value == Decimal("12.5")
    assert observations[0].metadata["change"] == "4.1"
    assert observations[0].charter_scope == "no"
    assert observations[1].value is None
    assert observations[1].suppression_status == "suppressed"


def test_acgr_source_row_expands_to_three_distinct_metrics(tmp_path: Path) -> None:
    manifest, source_path = _write_rows(
        tmp_path,
        "cde_acgr_2024_25.toml",
        [
            {
                "AcademicYear": "2024-25",
                "AggregateLevel": "S",
                "CountyCode": "01",
                "DistrictCode": "61119",
                "SchoolCode": "6000001",
                "CountyName": "Alameda",
                "DistrictName": "Example Unified",
                "SchoolName": "Example High",
                "CharterSchool": "No",
                "DASS": "No",
                "ReportingCategory": "TA",
                "CohortStudents": "100",
                "Regular HS Diploma Graduates (Count)": "90",
                "Regular HS Diploma Graduates (Rate)": "90.0",
                "Met UC/CSU Grad Req's (Count)": "54",
                "Met UC/CSU Grad Req's (Rate)": "60.0",
                "Dropout (Count)": "5",
                "Dropout (Rate)": "5.0",
            }
        ],
    )

    observations = list(iter_metric_observations(manifest, source_path))

    assert [observation.metric_id for observation in observations] == [
        "four_year_graduation_rate",
        "a_g_completion_rate",
        "four_year_dropout_rate",
    ]
    assert [observation.value for observation in observations] == [
        Decimal("90.0"),
        Decimal("60.0"),
        Decimal("5.0"),
    ]


def test_cci_preserves_prepared_rate_and_small_cell_suppression(tmp_path: Path) -> None:
    base = {
        "rtype": "S",
        "schoolname": "Example High",
        "districtname": "Example Unified",
        "countyname": "Alameda",
        "charter_flag": "",
        "coe_flag": "",
        "dass_flag": "",
        "studentgroup_pct": "100.0",
        "indicator": "CCI",
        "reportingyear": "2025",
    }
    manifest, source_path = _write_rows(
        tmp_path,
        "cde_cci_2024_25.toml",
        [
            {
                **base,
                "cds": "01611196000001",
                "studentgroup": "ALL",
                "currdenom": "100",
                "currstatus": "62.0",
                "curr_prep": "62",
                "curr_aprep": "20",
                "curr_nprep": "18",
                "curr_prep_collegecredit": "12",
            },
            {
                **base,
                "cds": "01611196000001",
                "studentgroup": "SWD",
                "studentgroup_pct": "8.0",
                "currdenom": "8",
                "currstatus": "",
                "curr_prep": "",
            },
        ],
    )

    observations = list(iter_metric_observations(manifest, source_path))

    assert observations[0].metric_id == "college_career_prepared_rate"
    assert observations[0].value == Decimal("62.0")
    assert observations[0].numerator == 62
    assert observations[0].metadata["prepared_measure_counts"]["college_credit"] == "12"
    assert observations[1].denominator == 8
    assert observations[1].value is None
    assert observations[1].suppression_status == "suppressed"


def test_college_going_adapter_keeps_only_all_completer_type(tmp_path: Path) -> None:
    base = {
        "AcademicYear": "2022-23",
        "AggregateLevel": "S",
        "CountyCode": "01",
        "DistrictCode": "61119",
        "SchoolCode": "6000001",
        "CountyName": "Alameda",
        "DistrictName": "Example Unified",
        "SchoolName": "Example High",
        "CharterSchool": "No",
        "AlternativeSchoolAccountabilityStatus": "No",
        "ReportingCategory": "TA",
        "High School Completers": "100",
        "Enrolled In College - Total (12 Months)": "72",
        "College Going Rate - Total (12 Months)": "72.0",
    }
    manifest, source_path = _write_rows(
        tmp_path,
        "cde_college_going_12_month_2022_23.toml",
        [
            {**base, "CompleterType": "TA"},
            {**base, "CompleterType": "AGY"},
        ],
    )

    observations = list(iter_metric_observations(manifest, source_path))

    assert len(observations) == 1
    assert observations[0].metric_id == "college_going_rate_12_month"
    assert observations[0].value == Decimal("72.0")
    assert observations[0].numerator == 72
    assert observations[0].denominator == 100


def test_suspension_inspection_preserves_ambiguous_cds_entities(tmp_path: Path) -> None:
    base = {
        "AcademicYear": "2024-25",
        "CharterYN": "All",
        "ReportingCategory": "TA",
        "CumulativeEnrollment": "100",
        "Total Suspensions": "1",
        "Unduplicated Count of Students Suspended (Total)": "1",
        "Unduplicated Count of Students Suspended (Defiance-Only)": "0",
        "Suspension Rate (Total)": "1.0",
        "Suspension Count Violent Incident (Injury)": "0",
        "Suspension Count Violent Incident (No Injury)": "0",
        "Suspension Count Weapons Possession": "0",
        "Suspension Count Illicit Drug-Related": "0",
        "Suspension Count Defiance-Only": "0",
        "Suspension Count Other Reasons": "1",
    }
    rows = [
        {**base, "AggregateLevel": "T", "CountyCode": "00"},
        {
            **base,
            "AggregateLevel": "C",
            "CountyCode": "39",
            "CountyName": "San Joaquin",
        },
        {
            **base,
            "AggregateLevel": "D",
            "CountyCode": "39",
            "DistrictCode": "68627",
            "CountyName": "San Joaquin",
            "DistrictName": "Example District",
        },
    ]
    rows.extend(
        {
            **base,
            "AggregateLevel": "S",
            "CountyCode": "39",
            "DistrictCode": "68627",
            "SchoolCode": "0000001",
            "CountyName": "San Joaquin",
            "DistrictName": "Example District",
            "SchoolName": name,
            "CharterYN": "Yes",
        }
        for name in ("Virtual Academy", "Delta Online", "Insight Academy")
    )
    manifest, source_path = _write_rows(
        tmp_path,
        "cde_suspension_2024_25.toml",
        rows,
    )

    inspection = inspect_metric_dataset(manifest, source_path)
    observations = list(
        iter_metric_observations(manifest, source_path, inspection.ambiguous_entity_keys)
    )
    ambiguous = [item for item in observations if item.identity_resolution == "ambiguous"]

    assert inspection.ambiguous_entity_count == 3
    assert inspection.ambiguous_entity_keys == frozenset({("school", "39686270000001")})
    assert len({item.entity_identity_key for item in ambiguous}) == 3
