# Cloudflare Workers Deployment

## Decision

The application deploys to Cloudflare Workers using Worker Static Assets. The repository includes a pinned Wrangler configuration that builds and serves `apps/web/dist` with single-page-application fallback. The current release needs no D1 database, R2 bucket, Worker secret, or runtime API.

## Architecture boundary

PostgreSQL remains the canonical private ingestion store. It performs complete-file validation, bulk loading, reconciliation, and provenance tracking outside the request path. A Worker does not download CDE files or run PostgreSQL ETL during a visitor request.

The public delivery path is:

```text
CDE snapshots -> PostgreSQL -> versioned publisher -> compact JSON bundles
                                               -> Worker Static Assets
                                               -> browser
```

The committed public read model contains 9,946 school profiles, 1,023 district baselines, and 2,739,483 observations. It is approximately 89 MB across about 500 cacheable files. The statewide search index is split into four manifest-declared files, and the largest release asset is approximately 2.17 MB. The local canonical database is approximately 2.9 GB because it retains complete provenance, all aggregation levels, and ingestion indexes.

The interactive map loads Leaflet only when the map section approaches the viewport. Map tiles are requested directly by the visitor's browser from the official OpenStreetMap tile endpoint, with visible contributor attribution and normal browser caching. The Worker does not proxy, prefetch, or bulk-download tiles. OpenStreetMap provides this community service on a best-effort basis; sustained high traffic should move to a dedicated OSM-derived tile provider without changing the application data model.

## One-command release

Install dependencies, validate the release, authenticate once, and deploy:

```bash
npm install
npm run release:check
npx wrangler login
npm run release:deploy
```

Subsequent releases only need the check and deploy commands. Wrangler prints the public `workers.dev` URL after deployment.

## Temporary preview

An unauthenticated preview can be created and claimed by a Cloudflare account:

```bash
npm run web:build
npx wrangler deploy --temporary
```

Wrangler prints a temporary URL and a private claim URL. Claim it within the time window shown by Wrangler; do not post the claim URL publicly.

## Local development

Run the same Worker asset path locally:

```bash
npm run worker:dev
```

Build and validate the upload without deploying:

```bash
npm run worker:dry-run
```

## Operations and optional custom domain

The first authenticated deployment creates the Worker named `ca-school-explorer`. The default `workers.dev` URL is sufficient; a custom domain is optional. Do not add credentials, account IDs, API tokens, database URLs, or temporary claim URLs to `wrangler.jsonc` or Git.

Static asset requests are the lowest-cost path. If `/api/*` is introduced, add a Worker entry point and limit `assets.run_worker_first` to API routes so ordinary application files continue to bypass Worker compute.

Data updates are batch releases: ingest and verify new source snapshots in PostgreSQL, run `make data-publish`, review the generated manifest and counts, then deploy. Visitor traffic never connects to PostgreSQL.
