# California School Explorer

California School Explorer is an open-source project that turns fragmented public education data into clear, comparable, and trustworthy information for families.

The product is designed around questions such as:

- Is a school improving over time?
- How do outcomes differ for English learners, students with disabilities, racial and ethnic groups, and socioeconomically disadvantaged students?
- How does a school compare with schools in the same district, nearby schools, and schools serving similar student populations?
- Which findings are reliable, and which are limited by small samples, suppression, missing years, or methodology changes?

## Product principles and roadmap

The project does not produce a single school score or a "best schools" ranking. The product roadmap focuses on:

- side-by-side comparison of two to five schools;
- multi-year trends on a shared timeline;
- subgroup-specific views;
- same-district, nearby, and similar-context baselines;
- visible source, denominator, freshness, suppression, and comparability notes;
- reproducible data processing and open methodology.

Read the [project and MVP plan](docs/ca-school-explorer-plan.html) for the research, scope, architecture, cost model, risks, and proposed 8–10 week roadmap.

## v0.1.0 release

The first public release connects the comparison experience to a compact, source-attributed export from the canonical database:

- a responsive React comparison experience for desktop and mobile;
- searchable profiles for 9,946 California public schools and 1,017 district baselines;
- 920,813 current school and district observations from six official CDE snapshots;
- seven indicators: ELA and mathematics distance from standard, chronic absenteeism, suspension, four-year graduation, A–G completion, and four-year dropout;
- 31 student-group lenses, including English learners, students with disabilities, racial and ethnic groups, and socioeconomically disadvantaged students;
- side-by-side comparison for up to five schools, exact-value tables, and same-district context;
- visible denominators, reliability labels, district context, and source notes;
- a PostgreSQL canonical store with deterministic migrations and least-privilege roles;
- pinned, checksum-verified adapters for five CDE 2024–25 outcome datasets and one 2025–26 school geography snapshot;
- 1,261,258 canonical facts covering chronic absenteeism, ELA, mathematics, suspension, four-year graduation, A–G completion, and dropout;
- 9,946 public-school profiles with quality-controlled coordinates, classifications, enrollment, and staffing context;
- source validation, audited bulk ingestion, suppression handling, and idempotent re-imports;
- a Python CLI for catalog, source snapshot, and database operations;
- data governance and methodology documents;
- continuous integration, issue templates, and contribution guidance;
- a validated, self-contained HTML project plan.

The current public bundle contains one outcome year, 2024–25, so the trend view has only one point per series. Historical imports, nearby and similar-school comparisons, the complete College/Career Indicator, and private-school directory context remain roadmap items. The website is an independent informational project, not a CDE product or endorsement.

Raw CDE files are not committed or redistributed. The repository publishes selected factual derived records with source metadata, suppression preserved, and no claim that source data is covered by the Apache-2.0 code license. Formal source-specific permission review remains an open governance item; see [Data Sources and Licensing Policy](DATA_SOURCES.md).

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

Raw files are downloaded into ignored local storage and are never committed by default. The canonical PostgreSQL database currently contains six official snapshots, seven outcome metrics, and a geographic school-profile layer. A–G completion is included, but it must not be labeled as the broader California Dashboard College/Career Indicator, which remains the next priority adapter. See [Database and real-data ingestion](docs/database.md) for the schema, verification gates, queries, backup and restore procedures, and deployment guidance.

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
- [Methodology](METHODOLOGY.md)
- [Roadmap](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Database and real-data ingestion](docs/database.md)
- [Public data contract v1](data/contracts/public-data-v1.md)
- [Cloudflare Workers deployment](docs/cloudflare-workers.md)
- [Static-first architecture decision](docs/adr/0001-static-first-delivery.md)
- [Canonical PostgreSQL architecture decision](docs/adr/0002-postgresql-canonical-store.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Project code is licensed under the [Apache License 2.0](LICENSE). Source datasets are governed by their publishers' terms and are not relicensed by this project.
