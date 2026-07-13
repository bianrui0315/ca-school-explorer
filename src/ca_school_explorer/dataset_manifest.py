"""Versioned dataset manifests and immutable source-file verification."""

from __future__ import annotations

import hashlib
import re
import tomllib
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

MANIFEST_VERSION = 1
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
ACADEMIC_YEAR_PATTERN = re.compile(r"^[0-9]{4}-[0-9]{2}$")


class ManifestError(ValueError):
    """Raised when a dataset manifest or source file fails validation."""


@dataclass(frozen=True, slots=True)
class DatasetManifest:
    """Immutable metadata required to reproduce one official source snapshot."""

    manifest_version: int
    dataset_id: str
    adapter: str
    schema_version: str
    source_id: str
    source_name: str
    publisher: str
    landing_page_url: str
    download_url: str
    academic_year: str
    release_date: str
    filename: str
    media_type: str
    encoding: str
    sha256: str
    byte_size: int
    record_count: int
    terms_status: str
    columns: tuple[str, ...]

    def raw_path(self, output_root: Path = Path("data/raw")) -> Path:
        """Return the conventional ignored path for this source file."""

        return output_root / self.source_id / self.filename


def _required_string(document: dict[str, object], key: str) -> str:
    value = document.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ManifestError(f"{key} must be a non-empty string")
    return value.strip()


def _required_integer(document: dict[str, object], key: str) -> int:
    value = document.get(key)
    if not isinstance(value, int):
        raise ManifestError(f"{key} must be an integer")
    return value


def load_dataset_manifest(path: str | Path) -> DatasetManifest:
    """Load and validate a TOML dataset manifest."""

    manifest_path = Path(path)
    try:
        document = tomllib.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ManifestError(f"dataset manifest not found: {manifest_path}") from error
    except tomllib.TOMLDecodeError as error:
        raise ManifestError(f"invalid TOML in {manifest_path}: {error}") from error

    raw_columns = document.get("columns")
    if not isinstance(raw_columns, list) or not raw_columns:
        raise ManifestError("columns must be a non-empty array")
    if not all(isinstance(column, str) and column.strip() for column in raw_columns):
        raise ManifestError("columns must contain only non-empty strings")

    manifest = DatasetManifest(
        manifest_version=_required_integer(document, "manifest_version"),
        dataset_id=_required_string(document, "dataset_id"),
        adapter=_required_string(document, "adapter"),
        schema_version=_required_string(document, "schema_version"),
        source_id=_required_string(document, "source_id"),
        source_name=_required_string(document, "source_name"),
        publisher=_required_string(document, "publisher"),
        landing_page_url=_required_string(document, "landing_page_url"),
        download_url=_required_string(document, "download_url"),
        academic_year=_required_string(document, "academic_year"),
        release_date=_required_string(document, "release_date"),
        filename=_required_string(document, "filename"),
        media_type=_required_string(document, "media_type"),
        encoding=_required_string(document, "encoding"),
        sha256=_required_string(document, "sha256"),
        byte_size=_required_integer(document, "byte_size"),
        record_count=_required_integer(document, "record_count"),
        terms_status=_required_string(document, "terms_status"),
        columns=tuple(column.strip() for column in raw_columns if isinstance(column, str)),
    )
    _validate_manifest(manifest)
    return manifest


def _validate_manifest(manifest: DatasetManifest) -> None:
    if manifest.manifest_version != MANIFEST_VERSION:
        raise ManifestError(
            f"manifest_version must be {MANIFEST_VERSION}, got {manifest.manifest_version}"
        )
    if not ACADEMIC_YEAR_PATTERN.fullmatch(manifest.academic_year):
        raise ManifestError("academic_year must use YYYY-YY format")
    if not SHA256_PATTERN.fullmatch(manifest.sha256):
        raise ManifestError("sha256 must contain 64 lowercase hexadecimal characters")
    if manifest.byte_size <= 0:
        raise ManifestError("byte_size must be positive")
    if manifest.record_count <= 0:
        raise ManifestError("record_count must be positive")
    if manifest.terms_status not in {"approved", "review-required", "restricted"}:
        raise ManifestError(f"unsupported terms_status: {manifest.terms_status}")
    for field_name, url in (
        ("landing_page_url", manifest.landing_page_url),
        ("download_url", manifest.download_url),
    ):
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ManifestError(f"{field_name} must be an absolute HTTPS URL")


def sha256_file(path: str | Path) -> str:
    """Calculate a source file's SHA-256 digest without loading it into memory."""

    digest = hashlib.sha256()
    with Path(path).open("rb") as source_file:
        for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_dataset_file(manifest: DatasetManifest, path: str | Path) -> None:
    """Fail closed when a local source file differs from its manifest."""

    source_path = Path(path)
    if not source_path.is_file():
        raise ManifestError(f"dataset file not found: {source_path}")
    actual_size = source_path.stat().st_size
    if actual_size != manifest.byte_size:
        raise ManifestError(
            f"byte size mismatch for {source_path}: "
            f"expected {manifest.byte_size}, got {actual_size}"
        )
    actual_digest = sha256_file(source_path)
    if actual_digest != manifest.sha256:
        raise ManifestError(
            f"SHA-256 mismatch for {source_path}: expected {manifest.sha256}, got {actual_digest}"
        )


def fetch_dataset(
    manifest: DatasetManifest,
    output_root: str | Path = Path("data/raw"),
) -> Path:
    """Download and verify an official source file into ignored raw storage."""

    target = manifest.raw_path(Path(output_root))
    if target.exists():
        verify_dataset_file(manifest, target)
        return target

    target.parent.mkdir(parents=True, exist_ok=True)
    temporary_target = target.with_suffix(f"{target.suffix}.part")
    request = urllib.request.Request(
        manifest.download_url,
        headers={"User-Agent": "California-School-Explorer/0.1 (+open-source-data-pipeline)"},
    )
    try:
        with (
            urllib.request.urlopen(request, timeout=120) as response,
            temporary_target.open("wb") as destination,
        ):
            while chunk := response.read(1024 * 1024):
                destination.write(chunk)
        verify_dataset_file(manifest, temporary_target)
        temporary_target.replace(target)
    except Exception:
        temporary_target.unlink(missing_ok=True)
        raise
    return target
