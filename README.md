# California School Explorer

California School Explorer is an open-source project that turns fragmented public education data into clear, comparable, and trustworthy information for families.

The product is designed around questions such as:

- Is a school improving over time?
- How do outcomes differ for English learners, students with disabilities, racial and ethnic groups, and socioeconomically disadvantaged students?
- How does a school compare with schools in the same district, nearby schools, and schools serving similar student populations?
- Which findings are reliable, and which are limited by small samples, suppression, missing years, or methodology changes?

## Product direction

The project will not produce a single school score or a "best schools" ranking. The first release will focus on:

- side-by-side comparison of two to five schools;
- multi-year trends on a shared timeline;
- subgroup-specific views;
- same-district, nearby, and similar-context baselines;
- visible source, denominator, freshness, suppression, and comparability notes;
- reproducible data processing and open methodology.

Read the [project and MVP plan](docs/ca-school-explorer-plan.html) for the research, scope, architecture, cost model, risks, and proposed 8–10 week roadmap.

## Repository status

The repository now includes a first interactive product slice and a real-data foundation:

- a responsive React comparison experience for desktop and mobile;
- synthetic fixture data for five fictional schools;
- four metrics, three student-group lenses, multi-year trends, and exact-value tables;
- visible denominators, reliability labels, district context, and source notes;
- an initial catalog of official data sources;
- a PostgreSQL canonical store with deterministic migrations and least-privilege roles;
- pinned, checksum-verified adapters for five CDE 2024–25 outcome datasets and one 2025–26 school geography snapshot;
- 1,261,258 canonical facts covering chronic absenteeism, ELA, mathematics, suspension, four-year graduation, A–G completion, and dropout;
- 9,946 public-school profiles with quality-controlled coordinates, classifications, enrollment, and staffing context;
- source validation, audited bulk ingestion, suppression handling, and idempotent re-imports;
- a Python CLI for catalog, source snapshot, and database operations;
- data governance and methodology documents;
- continuous integration, issue templates, and contribution guidance;
- a validated, self-contained HTML project plan.

The database pipeline uses real official records. The web experience still intentionally uses synthetic values until a reviewed publishing layer connects the canonical store to frontend bundles. No currently displayed value describes a real school, and the web experience must not yet be used for school or housing decisions. Source licensing and redistribution terms must be reviewed before raw or derived datasets are published.

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

### Cloudflare Worker preview

The Vite application is ready to run as Cloudflare Worker Static Assets without publishing the canonical database:

```bash
npm run worker:dev
npm run worker:dry-run
```

`npm run worker:deploy` is intentionally manual. The public site still uses synthetic fixture values until a reviewed publishing layer exports small, source-attributed real-data bundles. See [Cloudflare Workers deployment](docs/cloudflare-workers.md).

## Documentation

- [Data sources and licensing](DATA_SOURCES.md)
- [Methodology](METHODOLOGY.md)
- [Roadmap](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Database and real-data ingestion](docs/database.md)
- [Cloudflare Workers deployment](docs/cloudflare-workers.md)
- [Static-first architecture decision](docs/adr/0001-static-first-delivery.md)
- [Canonical PostgreSQL architecture decision](docs/adr/0002-postgresql-canonical-store.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Project code is licensed under the [Apache License 2.0](LICENSE). Source datasets are governed by their publishers' terms and are not relicensed by this project.
