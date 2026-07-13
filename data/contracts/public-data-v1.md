# Public Data Contract v1

Release `0.2.1` publishes a static, browser-safe read model under `apps/web/public/data`.
It contains derived factual records and source metadata; it does not contain the raw CDE files.

## Files

- `manifest.json` defines metrics, subgroups, source snapshots, release metadata, and the compact observation encoding.
- `schools-index/*.json` contains searchable public-school profiles and the shard identifier for each school. The manifest lists every file so clients can load them in parallel without depending on a fixed shard count.
- `schools/{county}-{bucket}.json` contains school demographics and outcome observations for a bounded shard.
- `districts/{county}.json` contains district baseline observations.

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

## Versioning

Adding optional manifest or profile fields is backward compatible. Changing field meaning, observation order,
or suppression behavior requires a new schema version. Every release records source snapshot identifiers and
SHA-256 digests so a displayed value can be traced to an immutable canonical import.
