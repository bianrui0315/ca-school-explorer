from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from ca_school_explorer.dataset_manifest import DatasetManifest
from ca_school_explorer.school_resources import (
    ResourceDataError,
    inspect_school_resources,
    iter_resource_observations,
)


def _manifest(
    source_path: Path,
    *,
    adapter: str,
    columns: tuple[str, ...],
    record_count: int,
) -> DatasetManifest:
    content = source_path.read_bytes()
    return DatasetManifest(
        manifest_version=1,
        dataset_id="resource_test",
        adapter=adapter,
        schema_version="test-v1",
        source_id="cde_sarc",
        source_name="CDE SARC",
        publisher="California Department of Education",
        landing_page_url="https://example.com/landing",
        download_url="https://example.com/data.txt",
        academic_year="2024-25",
        release_date="2026-01-01",
        filename=source_path.name,
        media_type="text/tab-separated-values",
        encoding="windows-1252",
        sha256=hashlib.sha256(content).hexdigest(),
        byte_size=len(content),
        record_count=record_count,
        terms_status="review-required",
        columns=columns,
    )


def test_counselor_ratio_keeps_positive_values_and_omits_zero(tmp_path: Path) -> None:
    columns = ("CDSCode", "C", "D", "S", "SARCYear", "PTAC")
    source_path = tmp_path / "ractp.txt"
    source_path.write_text(
        "\t".join(columns)
        + "\n01611190130229\t01\t61119\t0130229\t2024-25\t412.00"
        + "\n01611190132142\t01\t61119\t0132142\t2024-25\t0.00\n",
        encoding="windows-1252",
    )
    manifest = _manifest(
        source_path,
        adapter="sarc_counselor_ratio_v1",
        columns=columns,
        record_count=2,
    )

    inspection = inspect_school_resources(manifest, source_path)
    observations = list(iter_resource_observations(manifest, source_path))

    assert inspection.observation_count == 1
    assert inspection.entity_count == 1
    assert observations[0].cds_code == "01611190130229"
    assert observations[0].dimension == "all_students"
    assert str(observations[0].value) == "412.00"


def test_staff_experience_filters_to_school_teacher_all_gender(tmp_path: Path) -> None:
    columns = (
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
        "Staff Type",
        "School Grade Span",
        "Staff Gender",
        "Total Staff Count",
        "Average Total Years Experience",
        "Average District Years Experience",
        "Experienced",
        "Inexperienced",
        "First Year",
        "Second Year",
    )
    source_path = tmp_path / "stex.txt"
    teacher_row = (
        "2025-26\tS\t01\t61119\t0130229\tAlameda\tAlameda Unified\tAlameda High\t"
        "N\tN\tTCH\tGS_912\tALL\t87\t13.0\t10.3\t81\t6\t3\t3"
    )
    administrator_row = teacher_row.replace("\tTCH\t", "\tADM\t")
    source_path.write_text(
        "\t".join(columns) + "\n" + teacher_row + "\n" + administrator_row + "\n",
        encoding="windows-1252",
    )
    manifest = _manifest(
        source_path,
        adapter="staff_experience_v1",
        columns=columns,
        record_count=2,
    )

    observations = list(iter_resource_observations(manifest, source_path))

    assert len(observations) == 7
    assert {observation.metric_id for observation in observations} == {
        "teacher_experience_average",
        "teacher_experience_count",
    }
    total = next(observation for observation in observations if observation.dimension == "total")
    assert total.cds_code == "01611190130229"


def test_staff_experience_rejects_unreconciled_counts(tmp_path: Path) -> None:
    columns = (
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
        "Staff Type",
        "School Grade Span",
        "Staff Gender",
        "Total Staff Count",
        "Average Total Years Experience",
        "Average District Years Experience",
        "Experienced",
        "Inexperienced",
        "First Year",
        "Second Year",
    )
    source_path = tmp_path / "invalid-stex.txt"
    source_path.write_text(
        "\t".join(columns)
        + "\n2025-26\tS\t01\t61119\t0130229\tAlameda\tAlameda Unified\tAlameda High\t"
        + "N\tN\tTCH\tGS_912\tALL\t87\t13.0\t10.3\t80\t6\t3\t3\n",
        encoding="windows-1252",
    )
    manifest = _manifest(
        source_path,
        adapter="staff_experience_v1",
        columns=columns,
        record_count=1,
    )

    with pytest.raises(ResourceDataError, match="do not reconcile"):
        list(iter_resource_observations(manifest, source_path))
