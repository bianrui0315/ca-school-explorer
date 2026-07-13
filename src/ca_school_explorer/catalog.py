"""Load and validate the project's public data source catalog."""

from __future__ import annotations

import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_CATALOG_PATH = Path("config/sources.toml")
SUPPORTED_CATALOG_VERSION = 1
ALLOWED_STATUSES = frozenset({"planned", "active", "paused", "retired"})
ALLOWED_LICENSE_REVIEWS = frozenset({"required", "approved", "restricted"})


class CatalogError(ValueError):
    """Raised when the source catalog is missing, malformed, or invalid."""


@dataclass(frozen=True, slots=True)
class SourceDefinition:
    """Metadata required to plan and audit one external data source."""

    id: str
    name: str
    publisher: str
    category: str
    landing_page_url: str
    refresh_cadence: str
    status: str
    license_review: str
    notes: str


@dataclass(frozen=True, slots=True)
class SourceCatalog:
    """A versioned collection of source definitions."""

    version: int
    sources: tuple[SourceDefinition, ...]


def _required_string(raw: Mapping[str, object], key: str, position: int) -> str:
    value = raw.get(key)
    if not isinstance(value, str) or not value.strip():
        raise CatalogError(f"sources[{position}].{key} must be a non-empty string")
    return value.strip()


def _source_from_mapping(raw: Mapping[str, object], position: int) -> SourceDefinition:
    return SourceDefinition(
        id=_required_string(raw, "id", position),
        name=_required_string(raw, "name", position),
        publisher=_required_string(raw, "publisher", position),
        category=_required_string(raw, "category", position),
        landing_page_url=_required_string(raw, "landing_page_url", position),
        refresh_cadence=_required_string(raw, "refresh_cadence", position),
        status=_required_string(raw, "status", position),
        license_review=_required_string(raw, "license_review", position),
        notes=_required_string(raw, "notes", position),
    )


def validate_catalog(catalog: SourceCatalog) -> tuple[str, ...]:
    """Return deterministic validation errors without mutating the catalog."""

    errors: list[str] = []
    seen_ids: set[str] = set()

    if catalog.version != SUPPORTED_CATALOG_VERSION:
        errors.append(f"catalog_version must be {SUPPORTED_CATALOG_VERSION}, got {catalog.version}")

    if not catalog.sources:
        errors.append("catalog must contain at least one source")

    for source in catalog.sources:
        if source.id in seen_ids:
            errors.append(f"duplicate source id: {source.id}")
        seen_ids.add(source.id)

        if source.status not in ALLOWED_STATUSES:
            errors.append(f"{source.id}: unsupported status {source.status!r}")
        if source.license_review not in ALLOWED_LICENSE_REVIEWS:
            errors.append(f"{source.id}: unsupported license_review {source.license_review!r}")

        parsed_url = urlparse(source.landing_page_url)
        if parsed_url.scheme != "https" or not parsed_url.netloc:
            errors.append(f"{source.id}: landing_page_url must be an absolute HTTPS URL")

    return tuple(errors)


def load_catalog(path: str | Path = DEFAULT_CATALOG_PATH) -> SourceCatalog:
    """Load a TOML source catalog and raise ``CatalogError`` when it is invalid."""

    catalog_path = Path(path)
    try:
        document = tomllib.loads(catalog_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise CatalogError(f"source catalog not found: {catalog_path}") from error
    except tomllib.TOMLDecodeError as error:
        raise CatalogError(f"invalid TOML in {catalog_path}: {error}") from error

    raw_version = document.get("catalog_version")
    if not isinstance(raw_version, int):
        raise CatalogError("catalog_version must be an integer")

    raw_sources = document.get("sources")
    if not isinstance(raw_sources, list):
        raise CatalogError("sources must be an array of tables")

    sources: list[SourceDefinition] = []
    for position, raw_source in enumerate(raw_sources):
        if not isinstance(raw_source, dict):
            raise CatalogError(f"sources[{position}] must be a table")
        sources.append(_source_from_mapping(raw_source, position))

    catalog = SourceCatalog(version=raw_version, sources=tuple(sources))
    errors = validate_catalog(catalog)
    if errors:
        raise CatalogError("; ".join(errors))
    return catalog
