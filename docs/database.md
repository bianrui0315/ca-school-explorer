# Database and Real-Data Ingestion

## Current real dataset

The first production adapter ingests the official California Department of Education 2024–25 Chronic Absenteeism data file. The versioned manifest records:

- release date: March 13, 2026;
- source encoding: Windows-1252 (`cp1252`);
- source size: 33,781,100 bytes;
- source observations: 341,490;
- SHA-256: `c978fe1d0e2e73f60c3ad6d0297dfff86f1cf629dca747b5ac785a2fb00ecf9e`;
- aggregation coverage: state, county, district, and school;
- reporting categories: 25 total, including race and ethnicity, gender, English learners, students with disabilities, socioeconomic disadvantage, and grade spans.

The source file is not committed. `fetch-dataset` downloads it from the pinned official URL into `data/raw/cde_chronic_absenteeism/`, verifies its byte size and digest, and uses an atomic rename only after verification succeeds.

## Local setup

Install Python dependencies, start PostgreSQL, and set the local connection URL:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"

docker compose up -d database
export DATABASE_URL=postgresql://cse_admin:local-development-only@127.0.0.1:54329/ca_school_explorer
```

Apply deterministic migrations and optional group roles:

```bash
ca-school-explorer db-migrate
ca-school-explorer db-install-roles
```

Fetch, inspect, and ingest the complete source:

```bash
ca-school-explorer fetch-dataset
ca-school-explorer inspect-chronic-absenteeism
ca-school-explorer ingest-chronic-absenteeism
```

The ingestion command validates the complete file before changing database state. A successful repeat with the same source digest reuses the imported snapshot and does not duplicate facts.

`docker compose down` stops the service but preserves the named database volume. Do not use `docker compose down -v` unless deleting all local imported data is intentional.

## Data quality gates

The adapter fails closed on:

- byte size, SHA-256, record count, encoding, or header drift;
- an unexpected academic year, aggregation level, or CDS code shape;
- conflicting entity metadata within the same source snapshot;
- duplicate observation grain;
- partial suppression or invalid numeric fields;
- numerators greater than denominators;
- published rates that do not reconcile to CDE counts;
- unmapped reporting categories;
- database row counts that differ from validated source counts.

CDE `*` values are stored as null measures with `suppression_status = 'suppressed'`. Reported groups with fewer than 30 eligible students receive `reliability_status = 'small-sample'`; this is a product caution, not a replacement for CDE suppression policy.

## Schema

The `cse` schema contains:

- `data_source`: publisher and canonical landing-page identity;
- `source_snapshot`: immutable source digest, release, schema, terms, and import state;
- `import_run`: success or failure audit record and reconciled row counts;
- `entity`: state, county, district, and school identities with parent lineage;
- `metric`: versioned metric definitions and direction;
- `subgroup`: source-code crosswalks and human-readable labels;
- `fact_metric`: normalized observations with counts, values, suppression, reliability, scope, and source-row provenance.

Entity identity uses `(entity_type, cds_code)`. This is necessary because the official file contains school-level “District Office” records whose zero-filled CDS values also identify district-level entities.

Foreign keys are indexed. Fact indexes support entity history and metric/year/subgroup exports. The `current_source_snapshot`, `current_metric_observation`, and `school_chronic_absenteeism_current` views expose only the newest successfully imported snapshot for each source and academic year.

## Verification queries

```sql
select import_status, record_count, academic_year, sha256
from cse.source_snapshot;

select status, rows_read, rows_loaded, rows_suppressed
from cse.import_run
order by id desc;

select entity_type, count(*)
from cse.entity
group by entity_type
order by entity_type;

select school_name, subgroup_label, chronic_absenteeism_rate,
       eligible_cumulative_enrollment, reliability_status
from cse.school_chronic_absenteeism_current
where cds_code = $1
order by subgroup_id;
```

The verified local import contains 11,137 entities and 341,490 facts: 1 state, 58 counties, 1,014 districts, and 10,064 school-level entities. It preserves 104,469 suppressed observations and flags 36,072 reported small-sample observations.

## Roles and credentials

`db/security/roles.sql` creates two optional group roles:

- `cse_readonly`: schema usage and table reads;
- `cse_ingest`: reads, inserts, updates, and sequence usage for ingestion.

They are `NOLOGIN` roles. Production login roles should be created by infrastructure management and granted exactly one group role. The credentials in `compose.yaml` and `.env.example` are local-development values only.

## Backup and restore

Create a compressed logical backup:

```bash
docker compose exec -T database pg_dump \
  --username cse_admin \
  --dbname ca_school_explorer \
  --format custom \
  --no-owner > ca-school-explorer.dump
```

Restore into an empty compatible database after credentials are available:

```bash
docker compose exec -T database pg_restore \
  --username cse_admin \
  --dbname ca_school_explorer \
  --clean \
  --if-exists \
  --no-owner < ca-school-explorer.dump
```

Treat backups as data artifacts, not source code. Store them encrypted with retention and restore testing. For a small deployment, a managed PostgreSQL service with daily backups is sufficient; the public website continues to use CDN assets and does not require database capacity for visitor traffic.

## Cost and operations

Local development uses one container and no paid service. The verified database is approximately 216 MB for the first source snapshot. A small managed PostgreSQL instance is adequate for scheduled batch ingestion during the MVP, while raw snapshots and backups belong in low-cost object storage. Scale storage and job memory as years and sources accumulate; public traffic does not directly increase database load under the static-first architecture.
