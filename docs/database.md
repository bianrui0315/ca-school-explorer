# Database and Real-Data Ingestion

## Current real datasets

The production pipeline ingests five official California Department of Education outcome snapshots for each of 2022–23, 2023–24, and 2024–25:

| Snapshot | 2022–23 rows | 2023–24 rows | 2024–25 rows | Combined canonical facts | Metrics |
| --- | ---: | ---: | ---: | ---: | --- |
| Chronic Absenteeism | 343,652 | 343,602 | 341,490 | 1,028,744 | Chronic absenteeism rate |
| Academic Indicator ELA | 169,367 | 176,564 | 176,088 | 522,019 | ELA distance from standard |
| Academic Indicator Mathematics | 169,597 | 176,806 | 176,260 | 522,663 | Mathematics distance from standard |
| Suspension | 226,179 | 225,157 | 226,461 | 677,797 | Suspension rate |
| Adjusted Cohort Graduation Rate and Outcomes | 113,971 | 113,867 | 113,653 | 1,024,473 | Graduation, A–G completion, dropout |
| **Total** | **1,022,766** | **1,035,996** | **1,033,952** | **3,775,696** | **7 metrics** |

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

Publish the browser-safe read model after all expected snapshots have imported successfully:

```bash
make data-publish
```

The publisher opens a read-only database transaction, selects resolved public schools and current school and district observations, preserves suppression and provenance, then atomically replaces `apps/web/public/data`. It never copies raw source files. The output contract is documented in [`data/contracts/public-data-v1.md`](../data/contracts/public-data-v1.md).

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

The 2024–25 Suspension snapshot contains one CDS code associated with three distinct school names. The pipeline retains all three with `identity_resolution = 'ambiguous'` and name-qualified identity keys. It does not silently merge them. Public publishing excludes unresolved identities until the school directory adapter provides an authoritative crosswalk.

The 2023–24 chronic-absence file includes reporting code `GZ`, which the official CDE file structure defines as `Missing Gender`. The pipeline maps it to the explicit `gender_missing` subgroup. The 2022–23 file uses historical codes `GRKN` and `GRK8` for the same grade spans later labeled `GRTKKN` and `GRTK8`; migration `0007_historical_chronic_absence_grade_spans.sql` maps both aliases to the existing canonical grade-span subgroups. Both initial unmapped-code failures and the successful retries remain in the import audit log.

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

The verified local import contains 12,177 entity identities, 16 imported snapshots, 3,775,696 metric facts, and 9,946 school profiles. Metric facts reference 12,112 of those identities. Sixteen successful import runs reconcile to 3,102,660 source rows and 3,785,642 loaded facts/profiles. Two earlier fail-closed runs record the `GZ` and historical grade-span alias mapping errors before explicit mappings were added. Three entities are explicitly ambiguous; the public publisher uses resolved identities only.

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

Local development uses one container and no paid service. The verified database is approximately 2.9 GB for 16 snapshots, including indexes and provenance metadata. A small managed PostgreSQL instance is adequate for scheduled batch ingestion during the MVP, while raw snapshots and backups belong in low-cost object storage. The database exceeds Cloudflare D1 Free's per-database storage limit and retains PostgreSQL-specific ingestion behavior, so Workers serve precomputed public bundles rather than replace the canonical store. Public traffic does not directly increase PostgreSQL load under the static-first architecture.
