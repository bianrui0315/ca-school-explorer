"""Command-line interface for repository foundation tasks."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from dataclasses import asdict
from pathlib import Path

from ca_school_explorer.catalog import CatalogError, SourceCatalog, load_catalog


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ca-school-explorer",
        description="Inspect and validate California School Explorer data source metadata.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser(
        "validate-sources", help="Validate the source catalog and exit."
    )
    validate_parser.add_argument(
        "--catalog", type=Path, default=Path("config/sources.toml"), help="Catalog TOML path."
    )

    list_parser = subparsers.add_parser("list-sources", help="List cataloged data sources.")
    list_parser.add_argument(
        "--catalog", type=Path, default=Path("config/sources.toml"), help="Catalog TOML path."
    )
    list_parser.add_argument(
        "--format", choices=("table", "json"), default="table", help="Output format."
    )
    return parser


def _render_table(catalog: SourceCatalog) -> str:
    headers = ("ID", "CATEGORY", "STATUS", "SOURCE")
    rows = [(source.id, source.category, source.status, source.name) for source in catalog.sources]
    widths = [
        max(len(headers[index]), *(len(row[index]) for row in rows))
        for index in range(len(headers))
    ]

    def render_row(row: tuple[str, ...]) -> str:
        return "  ".join(value.ljust(widths[index]) for index, value in enumerate(row))

    separator = render_row(tuple("-" * width for width in widths))
    return "\n".join([render_row(headers), separator, *map(render_row, rows)])


def main(argv: Sequence[str] | None = None) -> int:
    """Run the CLI and return a process exit code."""

    args = _build_parser().parse_args(argv)
    try:
        catalog = load_catalog(args.catalog)
    except CatalogError as error:
        print(f"Source catalog validation failed: {error}", file=sys.stderr)
        return 1

    if args.command == "validate-sources":
        print(f"Source catalog is valid: {len(catalog.sources)} sources")
        return 0

    if args.format == "json":
        print(json.dumps([asdict(source) for source in catalog.sources], indent=2))
    else:
        print(_render_table(catalog))
    return 0
