from __future__ import annotations

from pathlib import Path

import pytest

from ca_school_explorer.dataset_manifest import (
    ManifestError,
    load_dataset_manifest,
    verify_dataset_file,
)
from tests.sample_dataset import write_sample_dataset

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "config" / "datasets" / "cde_chronic_absenteeism_2024_25.toml"


def test_repository_dataset_manifest_loads() -> None:
    manifest = load_dataset_manifest(MANIFEST_PATH)

    assert manifest.source_id == "cde_chronic_absenteeism"
    assert manifest.academic_year == "2024-25"
    assert manifest.encoding == "cp1252"
    assert manifest.record_count == 341490
    assert len(manifest.columns) == 14


def test_dataset_file_verification_rejects_changed_bytes(tmp_path: Path) -> None:
    manifest, source_path = write_sample_dataset(tmp_path)
    source_path.write_bytes(source_path.read_bytes() + b"changed")

    with pytest.raises(ManifestError, match="byte size mismatch"):
        verify_dataset_file(manifest, source_path)
