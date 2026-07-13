# Methodology

This document defines the minimum analytical rules for California School Explorer. It will evolve through reviewed pull requests and versioned releases.

## Product principles

1. Show evidence, not a single overall score.
2. Preserve source definitions, numerators, denominators, eligibility, and suppression.
3. Separate observed change from methodology change.
4. Use transparent comparison groups.
5. Collect no child-level personal data in the MVP.
6. Prefer omission over a misleading estimate.

## Canonical grain

The primary fact model is long-form:

```text
entity_id
school_year
metric_id
subgroup_id
grade
subject
numerator
denominator
value
suppression_status
reliability_status
methodology_version
source_snapshot_id
```

Dimensions retain entity history, metric definitions, subgroup definitions, geographic crosswalks, and source metadata.

## Entity identity

The California CDS code is the primary school and district identifier. The entity model must preserve:

- active, pending, closed, merged, and renamed records;
- parent district and county relationships;
- NCES identifiers where available;
- effective dates for identity changes;
- school type, grade span, charter status, and DASS status.

Historical facts remain attached to the entity that reported them. Mergers and renames are not silently rewritten into a current-school-only history.

## Comparison baselines

Every comparison may expose three independent baselines:

- **Same district:** schools under the same district, with compatible grade span and school type.
- **Nearby:** schools ordered by geographic distance from published school coordinates. Nearby never means assigned or eligible.
- **Similar context:** schools matched using public institutional context such as grade span, school type, urbanicity, enrollment size, and shares of socioeconomically disadvantaged students, English learners, and students with disabilities.

Protected characteristics may be used to view an officially published subgroup outcome. They are not used to recommend housing locations or describe a neighborhood as suitable for a demographic group.

## Suppression and small samples

- Preserve all source suppression markers.
- Never reconstruct a suppressed value by subtraction or complementary groups.
- Treat source-published values for 11–29 students as small-N unless a stricter source rule applies.
- Do not calculate peer percentiles, rankings, or confident trends for small-N results.
- Display the numerator and denominator when the source permits it.

## Time-series comparability

Trend lines must break when data are missing or materially incomparable. Known examples include pandemic assessment gaps, unavailable 2019–20 chronic absenteeism data, and enrollment schema changes beginning in 2023–24.

Every metric definition includes a methodology version. A version change may require a visible break even when adjacent years contain values.

## Quality gates

Every source release must pass:

- schema and type checks;
- primary-key uniqueness;
- valid CDS formats and parent relationships;
- join multiplicity checks;
- value range checks;
- numerator less than or equal to denominator;
- suppression preservation;
- category and row-count drift checks;
- valid reconciliation to official aggregates;
- source digest and historical backfill checks;
- comparison eligibility checks.

A failed required check blocks publication.

## Versioning

Published data bundles should identify the application version, methodology version, source snapshot IDs, and build timestamp. Method changes that affect interpretation require release notes and, when appropriate, a major data-product version change.
