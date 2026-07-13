# Database and Real-Data Ingestion

## Current real datasets

The production pipeline ingests five official California Department of Education 2024–25 snapshots:

| Snapshot | Source rows | Canonical facts | Metrics |
| --- | ---: | ---: | --- |
| Chronic Absenteeism | 341,490 | 341,490 | Chronic absenteeism rate |
| Academic Indicator ELA | 176,088 | 176,088 | ELA distance from standard |
| Academic Indicator Mathematics | 176,260 | 176,260 | Mathematics distance from standard |
| Suspension | 226,461 | 226,461 | Suspension rate |
| Adjusted Cohort Graduation Rate and Outcomes | 113,653 | 340,959 | Graduation, A–G completion, dropout |
| **Total** | **1,033,952** | **1,261,258** | **7 metrics** |

The database also contains 9,946 public-school profiles from CDE's public-domain 2025–26 geographic layer. Every profile has quality-controlled coordinates and includes school type, level, grade range, charter, virtual, magnet, Title I, DASS, enrollment, and selected staff context.

Every versioned manifest records the release, exact URL, encoding, byte size, record count, SHA-256 digest, and complete header contract. Source files are not committed. `fetch-dataset` downloads into `data/raw/<source_id>/`, verifies the file, and uses an atomic rename only after verification succeeds.

The A–G completion rate is not the broader Dashboard College/Career Indicator. It measures the share of regular diploma graduates meeting UC/CSU entrance requirements. CCI will be modeled separately because its population and measures differ.

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

Fetch, inspect, and ingest any pinned source:

```bash
MANIFEST=config/datasets/cde_suspension_2024_25.toml
ca-school-explorer fetch-dataset --manifest "$MANIFEST"
ca-school-explorer inspect-dataset --manifest "$MANIFEST"
ca-school-explorer ingest-dataset --manifest "$MANIFEST"
```

School geography uses its profile-specific load command:

```bash
MANIFEST=config/datasets/cde_public_school_geography_2025_26.toml
ca-school-explorer fetch-dataset --manifest "$MANIFEST"
ca-school-explorer inspect-dataset --manifest "$MANIFEST"
ca-school-explorer ingest-school-geography --manifest "$MANIFEST"
```

The ingestion command validates the complete file before changing database state. A successful repeat with the same source digest reuses the imported snapshot and does not duplicate facts.

`docker compose down` stops the service but preserves the named database volume. Do not use `docker compose down -v` unless deleting all local imported data is intentional.

## Data quality gates

Adapters fail closed on:

- byte size, SHA-256, record count, encoding, or header drift;
- an unexpected academic year, aggregation level, or CDS code shape;
- conflicting or ambiguous entity metadata within the same source snapshot;
- duplicate observation grain;
- partial suppression or invalid numeric fields;
- numerators greater than denominators;
- published rates that do not reconcile to CDE counts;
- unmapped reporting categories;
- database row counts that differ from validated source counts.

CDE `*` values are stored as null measures with `suppression_status = 'suppressed'`. Academic observations with zero current-year denominator are `not-available`. Reported groups with fewer than 30 students receive `reliability_status = 'small-sample'`; this is a product caution, not a replacement for CDE suppression policy.

The 2024–25 Suspension snapshot contains one CDS code associated with three distinct school names. The pipeline retains all three with `identity_resolution = 'ambiguous'` and name-qualified identity keys. It does not silently merge them. Public publishing should exclude or visibly qualify unresolved identities until the school directory adapter provides an authoritative crosswalk.

## Schema

The `cse` schema contains:

- `data_source`: publisher and canonical landing-page identity;
- `source_snapshot`: immutable source digest, release, schema, terms, and import state;
- `import_run`: success or failure audit record and reconciled row counts;
- `entity`: state, county, district, and school identities with parent lineage and resolution state;
- `entity_profile`: versioned sector, classification, address, coordinate, enrollment, and staffing context;
- `metric`: versioned metric definitions and direction;
- `subgroup`: canonical subgroup labels shared across sources;
- `subgroup_source_code`: source-specific reporting codes mapped to canonical subgroups;
- `fact_metric`: normalized observations with counts, values, suppression, reliability, source-row provenance, and source-specific explanatory metadata.

Entity identity uses a stable `identity_key`, normally `<entity_type>:<cds_code>`. Ambiguous source collisions use a deterministic name-qualified key while retaining the original CDS code for later resolution. This also permits school-level “District Office” records whose zero-filled CDS values identify district-level entities in other aggregate levels.

Foreign keys are indexed. Fact indexes support entity history and metric/year/subgroup exports. `current_source_snapshot` selects the newest successful version of each dataset and academic year, so ELA and mathematics can coexist under the same source. `school_indicator_current` exposes the current school-level records across every metric.

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

select school_name, metric_label, subgroup_label, value,
       denominator, reliability_status
from cse.school_indicator_current
where cds_code = $1
order by metric_id, subgroup_id;
```

The verified local import contains 11,891 entities, six snapshots, 1,261,258 metric facts, and 9,946 school profiles. All six import runs succeeded and reconcile to 1,043,898 source rows and 1,271,204 loaded facts/profiles. Three entities are explicitly ambiguous; the remaining 11,888 are resolved at the source-ingestion level.

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

Local development uses one container and no paid service. The verified database is approximately 1,009 MB for six snapshots, including indexes and provenance metadata. A small managed PostgreSQL instance is adequate for scheduled batch ingestion during the MVP, while raw snapshots and backups belong in low-cost object storage. The database already exceeds Cloudflare D1 Free's per-database storage limit and retains PostgreSQL-specific ingestion behavior, so Workers will serve precomputed public bundles rather than replace the canonical store. Public traffic does not directly increase PostgreSQL load under the static-first architecture.
