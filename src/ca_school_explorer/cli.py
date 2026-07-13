"""Command-line interface for repository foundation tasks."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections.abc import Sequence
from dataclasses import asdict
from pathlib import Path

import psycopg

from ca_school_explorer.catalog import CatalogError, SourceCatalog, load_catalog
from ca_school_explorer.chronic_absenteeism import (
    ChronicAbsenteeismError,
    inspect_chronic_absenteeism,
)
from ca_school_explorer.database import (
    DatabaseError,
    apply_migrations,
    apply_security_roles,
    ingest_chronic_absenteeism,
)
from ca_school_explorer.dataset_manifest import (
    ManifestError,
    fetch_dataset,
    load_dataset_manifest,
)


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

    migrate_parser = subparsers.add_parser("db-migrate", help="Apply PostgreSQL migrations.")
    _add_database_url(migrate_parser)
    migrate_parser.add_argument(
        "--migrations",
        type=Path,
        default=Path("db/migrations"),
        help="Directory containing ordered SQL migrations.",
    )

    roles_parser = subparsers.add_parser(
        "db-install-roles", help="Install optional least-privilege database roles."
    )
    _add_database_url(roles_parser)
    roles_parser.add_argument(
        "--sql",
        type=Path,
        default=Path("db/security/roles.sql"),
        help="Administrative role SQL path.",
    )

    fetch_parser = subparsers.add_parser(
        "fetch-dataset", help="Download and verify a versioned official dataset."
    )
    _add_manifest(fetch_parser)
    fetch_parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("data/raw"),
        help="Ignored root directory for immutable source files.",
    )

    inspect_parser = subparsers.add_parser(
        "inspect-chronic-absenteeism",
        help="Run source-level quality checks without changing the database.",
    )
    _add_manifest(inspect_parser)
    inspect_parser.add_argument(
        "--file", type=Path, help="Source file path; defaults to the manifest's raw path."
    )

    ingest_parser = subparsers.add_parser(
        "ingest-chronic-absenteeism",
        help="Validate and load a CDE chronic absenteeism snapshot into PostgreSQL.",
    )
    _add_database_url(ingest_parser)
    _add_manifest(ingest_parser)
    ingest_parser.add_argument(
        "--file", type=Path, help="Source file path; defaults to the manifest's raw path."
    )
    return parser


def _add_database_url(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL URL. Defaults to DATABASE_URL.",
    )


def _add_manifest(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("config/datasets/cde_chronic_absenteeism_2024_25.toml"),
        help="Versioned dataset manifest path.",
    )


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
        if args.command in {"validate-sources", "list-sources"}:
            catalog = load_catalog(args.catalog)
            if args.command == "validate-sources":
                print(f"Source catalog is valid: {len(catalog.sources)} sources")
            elif args.format == "json":
                print(json.dumps([asdict(source) for source in catalog.sources], indent=2))
            else:
                print(_render_table(catalog))
            return 0

        if args.command == "db-migrate":
            migration_result = apply_migrations(args.database_url, args.migrations)
            print(
                json.dumps(
                    {
                        "applied": migration_result.applied,
                        "skipped": migration_result.skipped,
                    },
                    indent=2,
                )
            )
            return 0

        if args.command == "db-install-roles":
            apply_security_roles(args.database_url, args.sql)
            print("Database roles installed.")
            return 0

        manifest = load_dataset_manifest(args.manifest)
        if args.command == "fetch-dataset":
            path = fetch_dataset(manifest, args.output_root)
            print(path)
            return 0

        source_path = args.file or manifest.raw_path()
        if args.command == "inspect-chronic-absenteeism":
            inspection = inspect_chronic_absenteeism(manifest, source_path)
            print(json.dumps(asdict(inspection), indent=2))
            return 0

        if args.command == "ingest-chronic-absenteeism":
            ingest_result = ingest_chronic_absenteeism(args.database_url, manifest, source_path)
            print(json.dumps(asdict(ingest_result), indent=2))
            return 0

        raise DatabaseError(f"unsupported command: {args.command}")
    except CatalogError as error:
        print(f"Source catalog validation failed: {error}", file=sys.stderr)
    except (
        ChronicAbsenteeismError,
        DatabaseError,
        ManifestError,
        OSError,
        psycopg.Error,
    ) as error:
        print(f"Command failed: {error}", file=sys.stderr)
    return 1
