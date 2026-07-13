# Architecture

## Goals

- Keep the public beta inexpensive and operationally simple.
- Make every published value reproducible from a versioned source snapshot.
- Minimize runtime infrastructure and privacy exposure.
- Let contributors add source adapters without changing the frontend contract.

## Data flow

```text
Official source pages
  -> source discovery and checksum comparison
  -> immutable raw object storage
  -> source-specific adapters
  -> validation and audited PostgreSQL ingestion
  -> entity, metric, subgroup, and source snapshot dimensions
  -> normalized Parquet publishing layer
  -> precomputed search, nearby, and peer sets
  -> small per-entity bundles and compressed indexes
  -> CDN
  -> browser comparison experience
```

## Proposed components

### Data pipeline

- Python 3.12 and standard Python packaging for environment management;
- PostgreSQL 17 for normalized canonical records and ingestion audit history;
- Polars and DuckDB for streaming and analytical transformations;
- PyArrow and Parquet for publishing and analytical snapshots;
- pytest for fixtures, data contracts, and reconciliation tests;
- GitHub Actions for source checks and deterministic builds.

### Web application

- Next.js, React, and TypeScript;
- pre-rendered public pages where practical;
- client-side comparison of bounded school bundles;
- MapLibre and PMTiles only when mapping becomes essential;
- no accounts or precise household addresses in the MVP.

### Storage and delivery

- object storage for raw and processed snapshots;
- PostgreSQL for private batch ingestion, normalized data, and provenance;
- CDN delivery for search indexes and school bundles;
- no public request-time database dependency in the MVP;
- optional PostGIS when dynamic geography or partner APIs require it.

## Canonical data model

- `entity`: state, county, district, and school identity and lineage;
- `metric`: definition, unit, numerator and denominator meaning, and methodology version;
- `subgroup`: source-specific subgroup definitions and crosswalks;
- `fact_metric`: entity-year-metric-subgroup-grade-subject observations;
- `source_snapshot`: source URL, release, retrieval time, digest, schema, and terms status.

The current schema is intentionally smaller than the target model. Geography, school status, directory attributes, and cross-source identity reconciliation will arrive with their source adapters.

## Operational controls

- immutable source snapshots;
- deterministic, digest-checked database migrations;
- schema-drift detection;
- blocked deployment on required quality failures;
- public freshness and correction metadata;
- dependency and security scanning;
- no secrets in source manifests or generated browser assets.
