from __future__ import annotations

from pathlib import Path

from ca_school_explorer.dataset_manifest import DatasetManifest, sha256_file

SAMPLE_COLUMNS = (
    "Academic Year",
    "Aggregate Level",
    "County Code",
    "District Code",
    "School Code",
    "County Name",
    "District Name",
    "School Name",
    "Charter School",
    "DASS",
    "Reporting Category",
    "ChronicAbsenteeismEligibleCumulativeEnrollment",
    "ChronicAbsenteeismCount",
    "ChronicAbsenteeismRate",
)

SAMPLE_ROWS = (
    ("2024-25", "T", "", "", "", "", "", "", "All", "All", "TA", "100", "10", "10.0"),
    (
        "2024-25",
        "C",
        "01",
        "",
        "",
        "Alameda",
        "",
        "",
        "All",
        "All",
        "SE",
        "20",
        "3",
        "15.0",
    ),
    (
        "2024-25",
        "D",
        "01",
        "61119",
        "",
        "Alameda",
        "Alameda Unified",
        "",
        "All",
        "All",
        "TA",
        "100",
        "9",
        "9.0",
    ),
    (
        "2024-25",
        "S",
        "01",
        "61119",
        "6000001",
        "Alameda",
        "Alameda Unified",
        "Escuela José",
        "No",
        "No",
        "SD",
        "*",
        "*",
        "*",
    ),
    (
        "2024-25",
        "S",
        "01",
        "61119",
        "0000000",
        "Alameda",
        "Alameda Unified",
        "District Office",
        "No",
        "No",
        "TA",
        "50",
        "5",
        "10.0",
    ),
)


def write_sample_dataset(tmp_path: Path) -> tuple[DatasetManifest, Path]:
    source_path = tmp_path / "sample-chronic-absenteeism.txt"
    lines = ["\t".join(SAMPLE_COLUMNS), *("\t".join(row) for row in SAMPLE_ROWS)]
    source_path.write_bytes(("\r\n".join(lines) + "\r\n").encode("cp1252"))
    manifest = DatasetManifest(
        manifest_version=1,
        dataset_id="test_chronic_absenteeism_2024_25",
        adapter="chronic_absenteeism_v1",
        schema_version="test-v1",
        source_id="cde_chronic_absenteeism",
        source_name="CDE Chronic Absenteeism Data",
        publisher="California Department of Education",
        landing_page_url="https://www.cde.ca.gov/ds/ad/filesabd.asp",
        download_url="https://example.com/sample.txt",
        academic_year="2024-25",
        release_date="2026-03-13",
        filename=source_path.name,
        media_type="text/tab-separated-values",
        encoding="cp1252",
        sha256=sha256_file(source_path),
        byte_size=source_path.stat().st_size,
        record_count=len(SAMPLE_ROWS),
        terms_status="review-required",
        columns=SAMPLE_COLUMNS,
    )
    return manifest, source_path
