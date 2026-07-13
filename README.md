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

The repository now includes a first interactive product slice:

- a responsive React comparison experience for desktop and mobile;
- synthetic fixture data for five fictional schools;
- four metrics, three student-group lenses, multi-year trends, and exact-value tables;
- visible denominators, reliability labels, district context, and source notes;
- an initial catalog of official data sources;
- a dependency-free Python CLI for catalog inspection and validation;
- data governance and methodology documents;
- continuous integration, issue templates, and contribution guidance;
- a validated, self-contained HTML project plan.

The web experience intentionally uses synthetic values. No displayed value describes a real school, and the current version must not be used for school or housing decisions. Source licensing and redistribution terms must be reviewed before raw or derived datasets are published.

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

## Documentation

- [Data sources and licensing](DATA_SOURCES.md)
- [Methodology](METHODOLOGY.md)
- [Roadmap](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Static-first architecture decision](docs/adr/0001-static-first-delivery.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Project code is licensed under the [Apache License 2.0](LICENSE). Source datasets are governed by their publishers' terms and are not relicensed by this project.
