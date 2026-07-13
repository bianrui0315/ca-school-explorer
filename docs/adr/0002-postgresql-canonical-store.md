# ADR 0002: Use PostgreSQL as the Canonical Ingestion Store

- Status: Accepted
- Date: 2026-07-13

## Context

Static public delivery remains the lowest-cost architecture for the MVP, but reproducible multi-source analysis needs durable normalized records, referential integrity, source provenance, and auditable import state. Raw files and frontend bundles alone do not provide safe incremental ingestion or efficient cross-year joins.

## Decision

Use PostgreSQL 17 as the private canonical ingestion store. Source adapters will validate immutable files before a database transaction, bulk load through temporary staging tables, normalize entities and observations, and record source snapshots and import runs.

PostgreSQL is not a public request-time dependency. A later publishing job will generate versioned analytical files and bounded frontend bundles from imported snapshots.

## Consequences

### Benefits

- database constraints protect observation grain and referential integrity;
- source digests make repeated imports idempotent;
- explicit snapshot and import records make failures auditable;
- indexed entity, metric, subgroup, and year queries support export jobs;
- contributors can rebuild the store from migrations, manifests, and official downloads.

### Tradeoffs

- local contributors need Docker or a compatible PostgreSQL instance;
- production ingestion requires backups, patching, credentials, and monitoring;
- raw files and database backups remain outside Git and require separate storage controls;
- publishing remains an additional pipeline stage.

## Revisit conditions

Revisit the boundary between PostgreSQL and static delivery when the product requires authenticated data, arbitrary public filters, partner APIs, or request-time geospatial queries.
