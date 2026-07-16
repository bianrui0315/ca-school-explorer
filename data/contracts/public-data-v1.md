# Public Data Contract v1

Release `0.5.0` publishes a static, browser-safe read model under `apps/web/public/data`.
It contains derived factual records and source metadata; it does not contain the raw CDE files.

## Files

- `manifest.json` defines metrics, subgroups, source snapshots, release metadata, and the compact observation encoding.
- `schools-index/*.json` contains searchable public-school profiles and the shard identifier for each school. The manifest lists every file so clients can load them in parallel without depending on a fixed shard count.
- `schools/{county}-{bucket}.json` contains school demographics and outcome observations for a bounded shard.
- `districts/{county}.json` contains district baseline observations.
- `resources/{county}-{bucket}.json` contains lazily loaded school teaching and resource observations for the same bounded shard identifier used by school detail files.

All files use `schemaVersion: 1`. A consumer must reject unknown schema versions rather than guessing.

## Observation encoding

Observations are compact arrays whose fields are declared by `manifest.observationEncoding`:

```text
[year, metricIndex, subgroupIndex, value, numerator, denominator, reliabilityCode, sourceSnapshotId]
```

`metricIndex` and `subgroupIndex` point to the ordered arrays in the manifest. Reliability codes are:

- `0`: reliable
- `1`: small sample
- `2`: suppressed
- `3`: not available
- `4`: methodology break

Suppressed values remain `null`. Consumers must not reconstruct them from other observations.

School index profiles may include `latestObservations`, a compact summary of the latest all-student record per metric. Its fields are declared by `manifest.latestObservationEncoding`:

```text
[year, metricIndex, value, denominator, reliabilityCode, sourceSnapshotId]
```

This optional summary supports statewide and radius-based discovery without loading every detail shard. It preserves null values and source reliability; clients must apply the same suppression rules as full observations. School detail shards remain the authoritative browser read model for subgroup and time-series comparison.

Resource observations are compact arrays whose fields are declared by `manifest.resourceObservationEncoding`:

```text
[schoolYear, metricIndex, dimension, value, numerator, denominator, sourceSnapshotId, metadata]
```

`metricIndex` points to `manifest.resourceMetrics`. `dimension` retains the official grade, subject, assignment category, experience category, or support role. Resource years are strings because sections can publish different sets of school years. Missing source values are omitted and clients display them as unavailable; they must not be zero-filled. Resource observations are deliberately stored in separate files so normal outcome comparison does not download them.

## Versioning

Adding optional manifest or profile fields is backward compatible. Changing field meaning, observation order,
or suppression behavior requires a new schema version. Every release records source snapshot identifiers and
SHA-256 digests so a displayed value can be traced to an immutable canonical import.
