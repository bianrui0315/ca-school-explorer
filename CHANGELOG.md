# Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project intends to use semantic versioning once the first public API or data bundle is released.

## [Unreleased]

## [0.4.3] - 2026-07-15

### Added

- Statewide similar-context matching based on school level, compatible grade span, enrollment, directory designations, and public EL, SWD, and SED profile percentages.
- Plain-language match explanations and direct peer-to-comparison actions without a rank or quality score.
- A selectable six-school peer reference for the trend chart and comparison table.
- Reproducible peer-reference links that preserve the selected anchor school.

### Changed

- Public school summaries now include the three profile percentages required for browser-side matching; outcome records remain separate and are never used to find peers.
- Similar-peer reference values are calculated after matching using published student-denominator weighting, with suppressed and unavailable values excluded rather than reconstructed.

### Known limitations

- Similarity describes public institutional context, not school quality, attendance assignment, admission eligibility, or causal comparability.
- Peer sets use the latest published school profile. Profile changes between directory releases can change the matched set.

## [0.4.2] - 2026-07-15

### Added

- Selectable same-district, same-county, and California comparison references.
- A versioned public bundle of 58 county references and one statewide reference with metric-level calculation-basis metadata.
- Current-year, older-only, and unavailable data-completeness summaries for each selected school.
- Reproducible comparison links that preserve schools, metric, subgroup, year range, reference selection, and composite weights.
- A direct Area Explorer action for opening the selected schools in Compare.

### Changed

- County ELA, mathematics, and College/Career reference values are transparently calculated from official district rows using published denominators; other county values use official CDE county aggregates.
- The comparison control bar and responsive layout now accommodate geographic context and sharing without crowding the chart.

### Known limitations

- County references require all selected schools to share a county; district references require all selected schools to share a district.
- A public county aggregate is not available for every metric grain. Derived county rows preserve source suppression and do not reconstruct hidden district values.

## [0.4.1] - 2026-07-15

### Added

- A dedicated Area Explorer page at `/area`, with persistent Compare and Area Explorer navigation.
- Official CDE district polygon rendering for exact-address searches, including separate unified, elementary, and high-school district styling.
- Nearby-school and full-district map focus controls, a district context panel, and responsive map layouts.

### Changed

- Reworked the application visual system with a layered pearl background, stronger surface boundaries, refined cobalt, teal, and violet accents, and more deliberate spacing.
- Moved location grade-band results below the map so the geographic view remains the primary Area Explorer surface.
- Simplified upstream district geometry for display while retaining the exact point-in-polygon result returned by the official service.

### Known limitations

- District polygons show district jurisdiction, not individual school attendance boundaries or assigned schools.
- Boundary geometry is display-oriented and must not be used for surveying, parcel, or legal decisions.

## [0.4.0] - 2026-07-15

### Added

- Three official College/Career Indicator snapshots for 2022–23 through 2024–25 and the official 2022–23 12-month College-Going Rate file.
- Separate CCI Prepared and college-going metrics with subgroup, suppression, denominator, provenance, and source-specific caveat support.
- An eight-indicator current-year profile and revised editable weights; the older college-going measure remains outside current-year scoring.
- Official CDE 2025–26 district-area lookup for exact addresses, including overlapping district types and explicit non-assignment language.
- Bounded no-store Worker routing, frontend district context, and regression tests for the new official boundary lookup.

### Changed

- Expanded the canonical store to 3,962,208 facts across nine metrics and 20 imported snapshots including the school-profile snapshot.
- Expanded the public Worker bundle to 2,878,340 school and district observations.
- Updated high-school location evidence to include CCI while preserving a 100% transparent base-weight total.

### Known limitations

- District jurisdiction is not school attendance assignment; assigned-school claims require current official local district sources.
- College-going currently ends in 2022–23, uses a distinct completer population, and can be reduced by National Student Clearinghouse privacy blocks.
- CCI measure definitions can change between Dashboard releases.

## [0.3.2] - 2026-07-14

### Added

- Exact grade and district-operated, charter, or magnet filters for location evidence matches.
- Adjustable academic, attendance, school-climate, and graduation or college-preparation priorities that transparently multiply the published grade-band weights.
- User-selectable 50%, 70%, 90%, or 100% minimum evidence coverage, with academic evidence still required for eligibility.
- A primary evidence-driver explanation for every matched school and an explicit Copy share link action that preserves the search center and personalization settings.
- Validation for personalized recommendation ordering, eligibility filters, shared URL parsing, and the rendered interaction flow.

### Changed

- Exact-grade searches now show one focused result group while retaining the grouped elementary, middle, and high school view for an all-grade search.
- Location matches now exclude schools that fail the selected evidence-coverage threshold instead of displaying them as limited recommendations.

## [0.3.1] - 2026-07-14

### Added

- A work-address, city, or ZIP location finder with 5, 10, 15, 25, and 50 mile radii, grouped elementary, middle, and high school evidence matches, and a focused result map.
- A same-origin Worker geocoding endpoint backed by the U.S. Census Geocoder, with bounded request and response bodies, California-only results, timeouts, no-store responses, and no project-side address storage.
- A compact latest all-student observation summary in the statewide school index so local evidence matching does not download hundreds of school detail shards.
- Transparent grade-band weights, evidence coverage guardrails, source values and years, distance tie-breaking, and direct addition of a local match to the comparison dashboard.
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
