from __future__ import annotations

from dataclasses import replace
from decimal import Decimal
from pathlib import Path

from ca_school_explorer.dataset_manifest import load_dataset_manifest, sha256_file
from ca_school_explorer.school_directory import (
    inspect_school_geography,
    iter_school_geography_rows,
)

ROOT = Path(__file__).resolve().parents[1]


def test_school_geography_validates_location_and_classification(tmp_path: Path) -> None:
    original = load_dataset_manifest(
        ROOT / "config" / "datasets" / "cde_public_school_geography_2025_26.toml"
    )
    row = {
        "OBJECTID": "1",
        "Academic Year": "2025-26",
        "CDS Code": "01100170112607",
        "District Code": "0110017",
        "School Code": "0112607",
        "County Name": "Alameda",
        "District Name": "Alameda County Office of Education",
        "School Name": "Example Academy",
        "School Type": "K-12",
        "Status": "Active",
        "Open Date": "08/28/2006 12:00:00 AM",
        "School Level": "Elem-High Combo",
        "Grade Low": "06",
        "Grade High": "12",
        "Charter": "Y",
        "Virtual": "N",
        "Magnet": "N",
        "Title I": "Y",
        "DASS": "N",
        "Street": "1515 Webster St.",
        "City": "Oakland",
        "Zip": "94612",
        "State": "CA",
        "Enroll Total": "171",
        "Latitude": "37.80467596",
        "Longitude": "-122.2683662",
        "Staff Total": "22",
        "Staff Teacher": "19",
        "Staff Admin": "5",
    }
    source_path = tmp_path / original.filename
    values = [row.get(column, "") for column in original.columns]
    source_path.write_bytes(
        (",".join(original.columns) + "\r\n" + ",".join(values) + "\r\n").encode(original.encoding)
    )
    manifest = replace(
        original,
        dataset_id="test_school_geography",
        download_url="https://example.com/schools.csv",
        byte_size=source_path.stat().st_size,
        sha256=sha256_file(source_path),
        record_count=1,
    )

    inspection = inspect_school_geography(manifest, source_path)
    normalized = next(iter_school_geography_rows(manifest, source_path))

    assert inspection.coordinate_count == 1
    assert inspection.charter_count == 1
    assert normalized.district_cds_code == "01100170000000"
    assert normalized.latitude == Decimal("37.80467596")
    assert normalized.longitude == Decimal("-122.2683662")
    assert normalized.enrollment_total == 171
    assert normalized.school_level == "Elem-High Combo"
