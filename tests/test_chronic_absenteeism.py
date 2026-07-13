from __future__ import annotations

from pathlib import Path

import pytest

from ca_school_explorer.chronic_absenteeism import (
    ChronicAbsenteeismError,
    inspect_chronic_absenteeism,
    iter_chronic_absenteeism_rows,
)
from tests.sample_dataset import write_sample_dataset


def test_inspection_preserves_levels_suppression_and_small_samples(tmp_path: Path) -> None:
    manifest, source_path = write_sample_dataset(tmp_path)

    inspection = inspect_chronic_absenteeism(manifest, source_path)

    assert inspection.record_count == 5
    assert inspection.aggregate_level_counts == {"C": 1, "D": 1, "S": 2, "T": 1}
    assert inspection.reporting_categories == ("SD", "SE", "TA")
    assert inspection.suppressed_count == 1
    assert inspection.small_sample_count == 1


def test_rows_decode_cp1252_and_build_cds_lineage(tmp_path: Path) -> None:
    manifest, source_path = write_sample_dataset(tmp_path)

    rows = list(iter_chronic_absenteeism_rows(manifest, source_path))
    school = rows[-2]

    assert school.entity_name == "Escuela José"
    assert school.entity_cds_code == "01611196000001"
    assert school.parent_cds_code == "01611190000000"
    assert school.suppression_status == "suppressed"


def test_partial_suppression_is_rejected(tmp_path: Path) -> None:
    manifest, source_path = write_sample_dataset(tmp_path)
    content = source_path.read_text(encoding="cp1252")
    source_path.write_text(content.replace("\t*\t*\t*", "\t10\t*\t*"), encoding="cp1252")

    with pytest.raises(ChronicAbsenteeismError, match="partial suppression"):
        list(iter_chronic_absenteeism_rows(manifest, source_path))
