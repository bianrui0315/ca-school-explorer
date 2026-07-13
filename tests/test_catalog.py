from __future__ import annotations

from pathlib import Path

import pytest

from ca_school_explorer.catalog import CatalogError, load_catalog
from ca_school_explorer.cli import main

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "config" / "sources.toml"


def test_repository_catalog_loads() -> None:
    catalog = load_catalog(CATALOG)

    assert catalog.version == 1
    assert len(catalog.sources) >= 10
    assert catalog.sources[0].id == "cde_school_directory"


def test_catalog_rejects_duplicate_ids(tmp_path: Path) -> None:
    catalog_path = tmp_path / "sources.toml"
    catalog_path.write_text(
        """
catalog_version = 1

[[sources]]
id = "duplicate"
name = "First"
publisher = "Publisher"
category = "test"
landing_page_url = "https://example.com/first"
refresh_cadence = "annual"
status = "planned"
license_review = "required"
notes = "Test source."

[[sources]]
id = "duplicate"
name = "Second"
publisher = "Publisher"
category = "test"
landing_page_url = "https://example.com/second"
refresh_cadence = "annual"
status = "planned"
license_review = "required"
notes = "Test source."
""".strip(),
        encoding="utf-8",
    )

    with pytest.raises(CatalogError, match="duplicate source id"):
        load_catalog(catalog_path)


def test_validate_sources_command(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["validate-sources", "--catalog", str(CATALOG)])

    assert exit_code == 0
    assert "Source catalog is valid" in capsys.readouterr().out


def test_list_sources_as_json(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["list-sources", "--catalog", str(CATALOG), "--format", "json"])

    assert exit_code == 0
    assert '"id": "cde_school_directory"' in capsys.readouterr().out
