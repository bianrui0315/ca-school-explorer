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
  -> validation and normalized Parquet
  -> entity, metric, subgroup, and geography dimensions
  -> precomputed search, nearby, and peer sets
  -> small per-entity bundles and compressed indexes
  -> CDN
  -> browser comparison experience
```

## Proposed components

### Data pipeline

- Python 3.12 and uv for environment management;
- Polars and DuckDB for streaming and analytical transformations;
- PyArrow and Parquet for the canonical processed layer;
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
- CDN delivery for search indexes and school bundles;
- no runtime relational database in the MVP;
- optional Postgres and PostGIS only when saved lists, accounts, dynamic queries, or partner APIs require them.

## Canonical data model

- `dim_entity`: school and district identity, status, lineage, and classifications;
- `dim_metric`: definition, unit, numerator and denominator meaning, and methodology version;
- `dim_subgroup`: source-specific subgroup definitions and crosswalks;
- `dim_geography`: coordinates, district areas, Census geographies, and crosswalk quality;
- `fact_metric`: entity-year-metric-subgroup-grade-subject observations;
- `source_snapshot`: source URL, release, retrieval time, digest, schema, and terms status.

## Operational controls

- immutable source snapshots;
- schema-drift detection;
- blocked deployment on required quality failures;
- public freshness and correction metadata;
- dependency and security scanning;
- no secrets in source manifests or generated browser assets.
