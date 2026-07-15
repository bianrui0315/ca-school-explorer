# Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project intends to use semantic versioning once the first public API or data bundle is released.

## [Unreleased]

### Added

- List and map views for school discovery, plus radius-based nearby-school results using published coordinates and straight-line distance.
- School discovery by street address, ZIP code, county, city, and individual grade served, using the existing statewide public-school directory.
- Ranked directory matches, filter-only browsing, result counts, and clear empty states.
- A documented next-phase sequence for school profiles, geographic context, dashboard context, and reviewed data expansion.
- A visible school overview with official address, grade span, school type, enrollment, reported staffing, directory designations, and a clearly caveated students-per-reported-teacher calculation.

## [0.3.0] - 2026-07-13

### Added

- Checksum-pinned CDE 2022–23 snapshots for chronic absenteeism, suspension, ELA, mathematics, and adjusted cohort graduation outcomes.
- Three-year trends for all seven indicators, with chart endpoints inset from the plot boundaries.
- A seven-axis normalized indicator profile that preserves missing values instead of plotting them as zero.
- An editable, coverage-aware experimental composite with visible default weights and a clear non-rating disclaimer.
- A lazily loaded selected-school map using published coordinates and visible OpenStreetMap attribution.
- A reproducible 2022–23 historical data-quality report and grade-span source-code aliases for the older chronic-absence file.

### Changed

- Expanded the canonical store to 3,775,696 metric facts across 15 outcome snapshots and one school-profile snapshot.
- Expanded the public Worker bundle to 2,739,483 observations across 2022–23, 2023–24, and 2024–25.
- Expanded district context to 1,023 baselines while retaining 9,946 current public-school profiles and 32 subgroup lenses.

### Known limitations

- The experimental composite is not an official CDE rating, percentile, or ranking; coverage and grade span must be considered.
- OpenStreetMap's community tile service is best-effort and may require a dedicated provider if traffic grows materially.
- A–G completion is included, but the broader California Dashboard College/Career Indicator is not yet implemented.

## [0.2.1] - 2026-07-13

### Fixed

- Add the release identifier to school-index, school-shard, and district-shard request URLs so returning browsers cannot combine a new manifest with stale observations from an older release.

## [0.2.0] - 2026-07-13

### Added

- Checksum-pinned CDE 2023–24 snapshots for chronic absenteeism, suspension, ELA, mathematics, and adjusted cohort graduation outcomes.
- Two-year trends for all seven public indicators, including subgroup and district context.
- Canonical `Missing gender` subgroup support for historical CDE reporting code `GZ`.
- A reproducible data-quality report covering import reconciliation, suppression, validity, statewide checks, and school-level year overlap.

### Changed

- Expanded the canonical store to 2,524,988 metric facts across 11 official snapshots.
- Expanded the public Worker bundle to 1,839,368 school and district observations for 2023–24 and 2024–25.
- Updated the public data catalog to 32 subgroup lenses and 1,019 district baselines.

### Known limitations

- Adjacent-year values use consistent adapters and fields, but CDE cautions that processing and reporting changes can affect comparisons.
- A–G completion is included, but the broader California Dashboard College/Career Indicator is not yet implemented.

## [0.1.1] - 2026-07-13

### Fixed

- Split the statewide school search index into four manifest-declared files so every static asset remains below Cloudflare's 5 MiB temporary-deployment limit.

## [0.1.0] - 2026-07-13

### Added

- Initial open-source repository foundation.
- Versioned public data source catalog and validation CLI.
- Product plan, architecture, methodology, roadmap, and governance documents.
- Continuous integration and GitHub contribution templates.
- PostgreSQL 17 canonical store, deterministic migrations, indexed normalized schema, and least-privilege group roles.
- Checksum-pinned CDE 2024–25 chronic absenteeism manifest, validator, and audited bulk ingestion adapter.
- PostgreSQL integration testing, Docker development environment, and tested backup and restore documentation.
- Seven-indicator canonical dataset with 1,261,258 facts and 9,946 public-school profiles.
- Versioned static publishing pipeline for 920,813 source-attributed school and district observations.
- Statewide school search, up-to-five-school comparison, 31 subgroup lenses, district context, suppression notices, and source metadata.
- Cloudflare Worker Static Assets configuration and one-command release validation and deployment.

### Changed

- Replaced all synthetic frontend fixtures with real published records derived from the canonical PostgreSQL store.
- Split school data into bounded geographic shards and compact observation arrays for CDN delivery.

### Known limitations

- Outcome data in this release covers only the 2024–25 school year; v0.2.0 adds the preceding year.
- A–G completion is included, but the broader California Dashboard College/Career Indicator is not yet implemented.
- Nearby-school, similar-context, private-school, safety, budget, staffing, and postsecondary-outcome views remain roadmap items.
