# ADR 0001: Use Static-First Data Delivery for the MVP

- Status: Accepted
- Date: 2026-07-13

## Context

The first product needs statewide search, multi-school comparison, multi-year trends, subgroup views, and source provenance. It does not need accounts, private profiles, write-heavy collaboration, or arbitrary server-side queries.

A conventional application database would add operating cost, migrations, authentication surface, query controls, and incident response work before those capabilities are necessary.

## Decision

The MVP will precompute:

- a compressed entity search index;
- bounded school and district data bundles;
- nearby-school candidates;
- transparent similar-context peer sets;
- source and reliability metadata.

The web application will retrieve those assets from a CDN and perform bounded comparison in the browser. Raw and canonical analytical data remain in object storage and Parquet, not in the public repository.

## Consequences

### Benefits

- low cash cost and minimal runtime operations;
- highly cacheable public traffic;
- reproducible versioned releases;
- smaller privacy and security surface;
- straightforward local development.

### Tradeoffs

- every new data release requires a build;
- arbitrary filters must be precomputed or deferred;
- bundle size and indexing require discipline;
- accounts and saved lists will need a later service.

## Revisit conditions

Revisit this decision when at least one of the following is validated:

- authenticated saved comparisons;
- partner API requirements;
- complex dynamic peer queries;
- data volume that makes bounded bundles impractical;
- operational evidence that static rebuilds cannot meet freshness goals.
