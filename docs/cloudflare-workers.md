# Cloudflare Workers Deployment

## Decision

The v0.1.0 application deploys to Cloudflare Workers using Worker Static Assets. The repository includes a pinned Wrangler configuration that builds and serves `apps/web/dist` with single-page-application fallback. The first release needs no D1 database, R2 bucket, Worker secret, or runtime API.

## Architecture boundary

PostgreSQL remains the canonical private ingestion store. It performs complete-file validation, bulk loading, reconciliation, and provenance tracking outside the request path. A Worker does not download CDE files or run PostgreSQL ETL during a visitor request.

The public delivery path is:

```text
CDE snapshots -> PostgreSQL -> versioned publisher -> compact JSON bundles
                                               -> Worker Static Assets
                                               -> browser
```

The committed v0.1.0 public read model contains 9,946 school profiles, 1,017 district baselines, and 920,813 observations. It is approximately 38 MB across about 500 cacheable files; the largest school shard is under 1 MB. The local canonical database remains approximately 1,009 MB because it retains complete provenance, all aggregation levels, and ingestion indexes.

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

## Operations and custom domain

The first authenticated deployment creates the Worker named `ca-school-explorer`. Attach a custom domain in the Cloudflare dashboard after the deployment is stable. Do not add credentials, account IDs, API tokens, database URLs, or temporary claim URLs to `wrangler.jsonc` or Git.

Static asset requests are the lowest-cost path. If `/api/*` is introduced, add a Worker entry point and limit `assets.run_worker_first` to API routes so ordinary application files continue to bypass Worker compute.

Data updates are batch releases: ingest and verify new source snapshots in PostgreSQL, run `make data-publish`, review the generated manifest and counts, then deploy. Visitor traffic never connects to PostgreSQL.
