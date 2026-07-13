# Cloudflare Workers Deployment

## Decision

The web application can be deployed to Cloudflare Workers using Worker Static Assets. The repository includes a pinned Wrangler configuration that builds and serves `apps/web/dist` with single-page-application fallback.

Deployment is intentionally deferred until the real-data publishing layer replaces the current synthetic frontend fixture. No Cloudflare account, project, database, bucket, or public URL has been created by this repository change.

## Architecture boundary

PostgreSQL remains the canonical private ingestion store. It performs complete-file validation, bulk loading, reconciliation, and provenance tracking outside the request path. A Worker should not download CDE files or run the PostgreSQL ETL during a visitor request.

The public delivery path is:

```text
CDE snapshots -> PostgreSQL -> reviewed publisher -> small JSON bundles
                                             -> Worker Static Assets / R2
                                             -> browser
```

The local canonical database is approximately 1,009 MB for six snapshots, 1,261,258 facts, and 9,946 geographic profiles. This already exceeds the 500 MB per-database limit of the Cloudflare D1 Free plan. D1 also uses SQLite semantics rather than PostgreSQL, so moving the canonical ETL database to D1 is not the current design. If a dynamic API is needed later, the Worker can serve bounded published bundles from R2 or query a purpose-built read model.

## Local validation

Install dependencies and run the Worker-compatible preview:

```bash
npm install
npm run worker:dev
```

Build and validate the upload without deploying:

```bash
npm run worker:dry-run
```

## Future deployment

After real-data publishing and licensing review are complete:

```bash
npx wrangler login
npm run worker:deploy
```

The first deployment creates the Worker named `ca-school-explorer`. A custom domain can then be attached in Cloudflare. Do not add credentials, account IDs, API tokens, or database URLs to `wrangler.jsonc` or Git.

Static asset requests are the lowest-cost path. If `/api/*` is introduced, add a Worker entry point and limit `assets.run_worker_first` to API routes so ordinary application files continue to bypass Worker compute.
