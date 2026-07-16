# OpenAI Build Week Collaboration Record

Reviewed: July 16, 2026

This record distinguishes the work performed with OpenAI Codex and GPT-5.6 from the product and governance decisions made by the project owner. It is intended to make the hackathon implementation evidence easy to inspect without overstating the role of AI in the published school data.

## Eligibility and primary task evidence

The [OpenAI Build Week rules](https://openai.devpost.com/rules) state that the submission period opened on July 13, 2026 at 9:00 a.m. Pacific Time. California School Explorer's first commit, `88eb23b`, was created on July 13 at 12:03 p.m. PDT, and the implementation was therefore started during the submission period.

The primary Codex task used GPT-5.6 under the model identifier `gpt-5.6-sol`. The task contains the majority of the project's product planning, data investigation, implementation, testing, release verification, and deployment work. Its session identifier is supplied through the private Devpost submission field rather than repeated in this public document.

## How Codex and GPT-5.6 accelerated the build

### Public-data investigation

Codex inspected unfamiliar CDE layouts, compared reporting years, identified schema drift, and helped translate source fields into deterministic adapters. This accelerated work that otherwise would have required repeated manual inspection across large tab-delimited, spreadsheet, and geographic files.

The resulting implementation does not ask the model to interpret individual source rows at runtime. Instead, each source has a pinned manifest, expected columns, byte size, row count, SHA-256 digest, and a testable adapter.

### Architecture and implementation

Codex helped design and implement:

- a canonical PostgreSQL model with immutable snapshots, source-row provenance, deterministic migrations, and least-privilege roles;
- a Python ingestion and publishing pipeline for millions of official observations;
- a sharded browser-safe public data contract that stays within Cloudflare asset limits;
- React and TypeScript comparison, area exploration, school-profile, teaching-resource, map, and responsive interfaces;
- bounded Worker routes for U.S. Census geocoding and official CDE district-area lookup;
- shareable state, missing-data behavior, subgroup controls, geographic references, and similar-context matching.

### Testing and release verification

Codex generated and refined regression tests for source validation, transformations, Worker boundaries, URL state, evidence coverage, map behavior, profile loading, responsive presentation, and edge cases such as suppression and missing years. Each release was checked locally and through GitHub Actions, then verified against the deployed Cloudflare Worker.

### Documentation and review

Codex helped maintain the methodology, architecture decisions, data-quality reports, deployment instructions, changelog, contribution guidance, and source catalog. It also supported rendered desktop and mobile review, accessibility checks, and release-readiness audits.

## Decisions made by the project owner

AI accelerated implementation, but it did not set the product's values or decide what the data should mean. The project owner made and reviewed the following decisions:

1. Do not publish a universal or official-looking school rank.
2. Preserve source suppression and missingness instead of estimating hidden values or converting them to zero.
3. Keep ELA, mathematics, attendance, discipline, graduation, A–G completion, College/Career readiness, and college-going as separate indicators with their own definitions and denominators.
4. Make the optional composite transparent, editable, coverage-aware, and visibly experimental.
5. Do not use protected characteristics to steer address-based housing results.
6. Use student-group outcomes for evidence exploration while warning against small-sample conclusions.
7. Describe district jurisdiction without claiming an assigned school, enrollment eligibility, or attendance boundary.
8. Select similar-context peers from institutional characteristics rather than outcome measures.
9. Use a static-first public release for low-cost access while retaining PostgreSQL as the reproducible source of truth.
10. Keep raw CDE files out of the repository and separate the Apache-2.0 code license from source-data terms.

## Dated implementation evidence

| Date | Representative implementation | Evidence |
| --- | --- | --- |
| July 13 | Repository foundation, first comparison UI, canonical database, real-data ingestion, Cloudflare release, three-year trends, profile chart, and selected-school map | `88eb23b`, `7ed85f0`, `1ab81f1`, `2cc347e`, `011d019` |
| July 14 | Directory discovery, geographic filters, address and radius search, evidence ordering, exact-grade filters, user priorities, coverage thresholds, and shareable state | `46ac8db`, `fad3c2d`, `3553899`, `960b497` |
| July 15 | CCI and college-going data, official district lookup, district polygons, visual redesign, county and statewide context, data completeness, and similar-context peers | `86eee6e`, `b955ca1`, `2b9d2b9`, `5bdb0f7` |
| July 16 | Teacher and school-resource data, dedicated resource comparison, unified school profiles, live-site documentation, and Build Week evidence | `01256d2`, `0e640ab`, `7b32f18`, `79015de` |

The complete record remains available through the repository's dated commit and pull-request history.

## What GPT-5.6 does not do

GPT-5.6 is part of the engineering workflow through Codex. It does not generate the public school metrics, reconstruct suppressed values, predict an individual child's outcome, determine school assignment, or publish an official rating. Those boundaries are deliberate: the public product uses deterministic calculations over cited official data so that every displayed value can be traced and reviewed.

## Reproducibility references

- [Data sources and licensing](../DATA_SOURCES.md)
- [Methodology](../METHODOLOGY.md)
- [Architecture](architecture.md)
- [Database and ingestion](database.md)
- [Public data contract](../data/contracts/public-data-v1.md)
- [Cloudflare deployment](cloudflare-workers.md)
- [Data and service usage review](compliance/data-and-service-usage-review-2026-07-16.md)
