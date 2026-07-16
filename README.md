# California School Explorer

**Live website:** [https://ca-school-explorer.thrilling-fragrance.workers.dev/](https://ca-school-explorer.thrilling-fragrance.workers.dev/)

<p align="center">
  <a href="https://ca-school-explorer.thrilling-fragrance.workers.dev/">
    <img src="docs/assets/website-preview.jpg" alt="California School Explorer live website preview" width="1200">
  </a>
</p>

California School Explorer is an open-source project that turns fragmented public education data into clear, comparable, and trustworthy information for families.

## Built with OpenAI Codex and GPT-5.6

California School Explorer was created during OpenAI Build Week. The submission period opened at 9:00 a.m. PDT on July 13, 2026; the repository's first commit was created at 12:03 p.m. PDT that day. The primary Codex task used GPT-5.6 (`gpt-5.6-sol`) for the core build, and its session identifier is supplied privately through the required Devpost field.

OpenAI Codex with GPT-5.6 served as an engineering collaborator throughout the project. It accelerated source-schema investigation, deterministic adapter and migration design, implementation across Python, React, TypeScript, PostgreSQL, and Cloudflare, regression-test generation, responsive and accessibility review, and live-release verification. Representative work is visible in the dated commit history:

| Build Week date | Shipped work | Representative commits |
| --- | --- | --- |
| July 13 | Product foundation, canonical database, official-data adapters, first release, historical trends, profile chart, and map | `88eb23b`, `1ab81f1`, `2cc347e`, `011d019` |
| July 14 | School discovery, address and radius search, evidence ordering, filters, personalization, and shareable location results | `46ac8db`, `fad3c2d`, `3553899`, `960b497` |
| July 15 | College/career data, district boundaries, visual redesign, geographic references, and similar-context matching | `86eee6e`, `b955ca1`, `2b9d2b9`, `5bdb0f7` |
| July 16 | Teaching resources, unified school profiles, public deployment evidence, and submission documentation | `01256d2`, `0e640ab`, `7b32f18`, `79015de` |

The work remained human-directed and reviewable. The project owner made the key product and governance decisions: do not publish a universal school ranking; preserve suppression and missingness; keep unlike denominators separate; prevent protected characteristics from steering housing results; describe district jurisdiction without claiming attendance assignment; and use a static-first public release backed by a reproducible PostgreSQL source of truth. Codex and GPT-5.6 are not used to generate school outcomes, infer suppressed values, or produce an official school rating. The public metrics are reproducibly derived from cited government datasets, and the optional composite remains transparent and user-editable.

See the [Build Week collaboration record](docs/build-week.md) for the development timeline, concrete acceleration examples, human decisions, and verification evidence.

The product is designed around questions such as:

- Is a school improving over time?
- How do outcomes differ for English learners, students with disabilities, racial and ethnic groups, and socioeconomically disadvantaged students?
- How does a school compare with schools in the same district, nearby schools, and schools serving similar student populations?
- Which findings are reliable, and which are limited by small samples, suppression, missing years, or methodology changes?

## Support the project

California School Explorer is an independent open-source project. If it helps your family, you can support continued public-data updates, hosting, and development at [buymeacoffee.com/bianrui0315](https://buymeacoffee.com/bianrui0315).

<a href="https://buymeacoffee.com/bianrui0315">
  <img src="apps/web/public/buy-me-a-coffee-qr.png" alt="QR code for buymeacoffee.com/bianrui0315" width="190">
</a>

## Product principles and roadmap

The project does not produce a "best schools" ranking. It leads with separate indicators; the optional composite is experimental, editable, coverage-aware, and never presented as an official rating. The product roadmap focuses on:

- location-based discovery and side-by-side comparison of two to five schools;
- multi-year trends on a shared timeline;
- subgroup-specific views;
- same-district, nearby, and similar-context baselines;
- visible source, denominator, freshness, suppression, and comparability notes;
- reproducible data processing and open methodology.

Read the [project and MVP plan](docs/ca-school-explorer-plan.html) for the research, scope, architecture, cost model, risks, and proposed 8–10 week roadmap.

## v0.5.1 release

This release adds shareable single-school profiles while retaining the Compare, Area Explorer, and Teaching & resources workspaces:

- stable `/school/{CDS-code}` URLs for every current public school;
- a unified school report with directory facts, latest outcomes, actual three-year trends, subgroup exploration, teaching resources, maps, sources, and limitations;
- direct school-profile actions from comparison cards plus profile search, copy-link, add-to-comparison, and full teaching-comparison flows;
- responsive desktop, mobile, and print layouts with unknown-CDS and partial-data states;

- teacher experience for 2025–26, including total teacher counts, average total and district experience, and transparent experience categories;
- teacher preparation and placement for 2021–22 through 2023–24, with published percentages and teaching-position FTE preserved;
- elementary and secondary class size for 2022–23 through 2024–25, kept separate by grade or subject;
- 2024–25 student support FTE by role and pupils per academic counselor, with blank and unusable zero-ratio values shown as `Not reported`;
- a dedicated `/resources` route with explicit source years, up-to-five-school comparison, mobile internal table scrolling, source notes, and no rating language;
- six new checksum-pinned official CDE snapshots, 432,598 canonical school-resource facts, and 428,035 lazily loaded public resource observations across 441 bounded shards;

- statewide context matching for active public schools using school level, compatible grade span, enrollment, directory designations, and published English learner, students with disabilities, and socioeconomically disadvantaged percentages;
- plain-language reasons for every context match, with no academic, attendance, discipline, graduation, college, or career outcome used to select peers;
- a selectable six-school peer reference calculated after matching with published student-denominator weighting and suppressed rows excluded;
- direct Add to comparison actions and share links that preserve the selected anchor school and peer reference;

- district, county, and California reference series selectable from the comparison controls;
- 59 new source-attributed geographic reference files with 26,765 observations across the published metrics and student groups;
- official CDE county aggregates where available, with ELA, mathematics, and College/Career county values transparently calculated from official district rows using published student denominators;
- a current-year data completeness band that distinguishes current, older-only, and unavailable or suppressed measures for every selected school;
- share links that preserve selected schools, metric, subgroup, year range, geographic reference, and experimental composite weights;
- a direct Compare selected action in Area Explorer;
- clear Compare and Area Explorer navigation, including a dedicated `/area` route that remains directly shareable on the Worker;
- a larger location map with official CDE district polygons for exact California street-address matches, district-type styling, and nearby or full-district focus controls;
- a refined pearl, cobalt, teal, and violet visual system with stronger section boundaries, layered surfaces, responsive spacing, and less crowding;
- a responsive React comparison experience for desktop and mobile;
- searchable profiles for 9,946 California public schools and 1,023 district baselines;
- 2,878,340 school and district outcome observations plus 428,035 teaching-resource observations from 26 official CDE snapshots, including the public-school profile snapshot;
- nine indicators: ELA and mathematics distance from standard, chronic absenteeism, suspension, four-year graduation, A–G completion, four-year dropout, the distinct College/Career Indicator Prepared rate, and 12-month college-going;
- three adjacent outcome years, 2022–23 through 2024–25, for eight indicators on a shared trend timeline with inset endpoints; college-going currently ends in 2022–23 and is labeled separately;
- 32 student-group lenses, including English learners, students with disabilities, racial and ethnic groups, and socioeconomically disadvantaged students;
- location searches by California work address, city, or ZIP with 5–50 mile radii, exact-grade and public-school-type filters, evidence-coverage thresholds, adjustable evidence priorities, match explanations, reproducible share links, and official CDE district-area matching for exact addresses;
- side-by-side comparison for up to five schools, exact-value tables, same-district context, an eight-axis normalized profile, an editable experimental composite, and a selected-school map;
- visible denominators, reliability labels, district, county, or statewide context, calculation basis, and source notes;
- a PostgreSQL canonical store with deterministic migrations and least-privilege roles;
- pinned, checksum-verified adapters for five CDE outcome datasets and CCI in each of 2022–23, 2023–24, and 2024–25, one 2022–23 college-going snapshot, one 2025–26 school geography snapshot, five 2024–25 SARC files, and one 2025–26 Staff Experience file;
- 3,962,208 canonical outcome facts and 432,598 school-resource facts with source-row provenance preserved;
- 9,946 public-school profiles with quality-controlled coordinates, classifications, enrollment, and staffing context;
- source validation, audited bulk ingestion, suppression handling, and idempotent re-imports;
- a Python CLI for catalog, source snapshot, and database operations;
- data governance and methodology documents;
- continuous integration, issue templates, and contribution guidance;
- a validated, self-contained HTML project plan.

The current public bundle contains three adjacent outcome years for the implemented Dashboard and DataQuest measures. CDE advises caution when comparing years because processing and reporting changes may affect results; missing and suppressed values remain unconnected and are never inferred. College-going uses a different high-school-completer denominator, can be affected by National Student Clearinghouse privacy blocks, and currently lags the other indicators. The location finder uses transparent, coverage-aware evidence ordering rather than a universal school ranking. Its personalization settings use grade, public-school type, evidence coverage, and user-selected evidence priorities; protected characteristics do not steer housing-location results. The official district-area lookup confirms district jurisdiction at an exact geocoded point, not school attendance assignment. Nearby never means assigned or eligible. Similar-context matching describes institutional profile similarity, not quality, assignment, or eligibility. Private-school directory context remains a roadmap item. The website is an independent informational project, not a CDE product or endorsement.

Raw CDE files are not committed or redistributed. The repository publishes selected factual derived records with source metadata, suppression preserved, and no claim that source data is covered by the Apache-2.0 code license. Formal source-specific permission review remains an open governance item; see the [Data Sources and Licensing Policy](DATA_SOURCES.md) and the [July 16, 2026 data and service usage review](docs/compliance/data-and-service-usage-review-2026-07-16.md).

## Quick start

### Web experience

Requirements: Node.js 22 or newer.

```bash
npm install
npm run web:dev
```

Open `http://127.0.0.1:5173`. Run the complete web check with:

```bash
make web-check
```

### Data tooling

Requirements: Python 3.12 or newer.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"

ca-school-explorer validate-sources
ca-school-explorer list-sources
```

Run the complete Python check:

```bash
make check
```

After the database has been populated, rebuild the browser-safe public data bundles with:

```bash
export DATABASE_URL=postgresql://cse_admin:local-development-only@127.0.0.1:54329/ca_school_explorer
make data-publish
```

Run both stacks with `make full-check` after installing the Python and Node.js dependencies.

### Real-data database

Requirements: Docker Desktop and the Python environment from the previous section.

```bash
docker compose up -d database
export DATABASE_URL=postgresql://cse_admin:local-development-only@127.0.0.1:54329/ca_school_explorer

ca-school-explorer db-migrate
ca-school-explorer db-install-roles
ca-school-explorer fetch-dataset --manifest config/datasets/cde_suspension_2024_25.toml
ca-school-explorer inspect-dataset --manifest config/datasets/cde_suspension_2024_25.toml
ca-school-explorer ingest-dataset --manifest config/datasets/cde_suspension_2024_25.toml
```

Raw files are downloaded into ignored local storage and are never committed by default. The canonical PostgreSQL database currently contains 19 official outcome snapshots, six teaching-resource snapshots, nine outcome metrics, and one geographic school-profile snapshot. A–G completion, the broader Dashboard CCI Prepared rate, and the 12-month college-going rate remain separate because their denominators and interpretations differ. See [Database and real-data ingestion](docs/database.md) for the schema, verification gates, queries, backup and restore procedures, and deployment guidance.

### Cloudflare Worker release

The release is deployed as Cloudflare Worker Static Assets. PostgreSQL is only needed when regenerating data and is never exposed to visitors.

```bash
npm install
npm run release:check
npx wrangler login
npm run release:deploy
```

For an unclaimed temporary preview without logging in:

```bash
npm run web:build
npx wrangler deploy --temporary
```

See [Cloudflare Workers deployment](docs/cloudflare-workers.md) for the deployment boundary, release size, and custom-domain steps.

## Documentation

- [Data sources and licensing](DATA_SOURCES.md)
- [Build Week collaboration record](docs/build-week.md)
- [Data and service usage review](docs/compliance/data-and-service-usage-review-2026-07-16.md)
- [Methodology](METHODOLOGY.md)
- [Roadmap](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Database and real-data ingestion](docs/database.md)
- [2023–24 historical data quality report](docs/data-quality/2023-24-history.md)
- [2022–23 historical data quality report](docs/data-quality/2022-23-history.md)
- [College/career and postsecondary data quality report](docs/data-quality/college-career-postsecondary.md)
- [Teaching and resources data quality report](docs/data-quality/teaching-resources.md)
- [Public data contract v1](data/contracts/public-data-v1.md)
- [Cloudflare Workers deployment](docs/cloudflare-workers.md)
- [Static-first architecture decision](docs/adr/0001-static-first-delivery.md)
- [Canonical PostgreSQL architecture decision](docs/adr/0002-postgresql-canonical-store.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Project code is licensed under the [Apache License 2.0](LICENSE). Source datasets are governed by their publishers' terms and are not relicensed by this project.
