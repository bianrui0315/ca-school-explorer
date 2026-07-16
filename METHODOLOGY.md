# Methodology

This document defines the minimum analytical rules for California School Explorer. It will evolve through reviewed pull requests and versioned releases.

## Product principles

1. Lead with separate evidence. Any composite must remain optional, experimental, coverage-aware, and visibly weighted; it is never an official rating or ranking.
2. Preserve source definitions, numerators, denominators, eligibility, and suppression.
3. Separate observed change from methodology change.
4. Use transparent comparison groups.
5. Collect no child-level personal data in the MVP.
6. Prefer omission over a misleading estimate.

## Canonical grain

The primary fact model is long-form:

```text
entity_id
entity_identity_resolution
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
source_row_number
```

Dimensions retain entity history, metric definitions, subgroup definitions, geographic crosswalks, and source metadata.

Teaching and resource observations use a separate long-form grain because a grade, subject, assignment category, experience category, or support role is not a student subgroup:

```text
entity_id
school_year
resource_metric_id
dimension
value
numerator
denominator
source_snapshot_id
source_row_number
metadata
```

Missing resource values are omitted rather than converted to zero. Published zero support-staff FTE may remain zero, while a blank or `0.00` pupils-per-counselor ratio is unavailable because it does not describe a usable ratio.

## Entity identity

The California CDS code is the primary source identifier, but it is not assumed to be collision-free across every downloadable file. A stable entity identity key and resolution state preserve:

- active, pending, closed, merged, and renamed records;
- parent district and county relationships;
- NCES identifiers where available;
- effective dates for identity changes;
- school type, grade span, charter status, and DASS status.

When one source snapshot associates a CDS code with multiple school identities, records remain separate and are marked ambiguous. They are not silently merged or published as resolved until an authoritative crosswalk supports the decision.

Historical facts remain attached to the entity that reported them. Mergers and renames are not silently rewritten into a current-school-only history.

## Comparison baselines

Every comparison may expose three independent baselines:

- **Same district:** schools under the same district, with compatible grade span and school type.
- **Nearby:** schools ordered by geographic distance from published school coordinates. Nearby never means assigned or eligible.
- **Similar context:** schools matched using public institutional context such as grade span, school type, urbanicity, enrollment size, and shares of socioeconomically disadvantaged students, English learners, and students with disabilities.

Protected characteristics may be used to view an officially published subgroup outcome. They are not used to recommend housing locations or describe a neighborhood as suitable for a demographic group.

## Teaching and resource context

Teacher experience, teacher preparation and placement, class size, support-staff FTE, and pupils per academic counselor are descriptive context. They are not normalized, weighted, or included in the experimental outcome composite. Higher or lower values are not automatically better.

Staff Experience uses school-level, teacher, all-gender rows. Teacher experience values are headcounts and years, not FTE. Experienced means more than two years, and accepted rows must reconcile experienced plus inexperienced teachers to the published total.

SARC teacher-preparation percentages and teaching-position FTE remain as published because independently rounded FTE cannot safely be used to recompute the displayed percentage. Class size remains separate by elementary grade or secondary subject and is not averaged into one school value. Support roles retain their published FTE units.

The interface keeps reporting years explicit: Staff Experience is currently 2025–26, class size and student support are 2024–25, and teacher preparation currently ends in 2023–24. These values must not be presented as one synchronized snapshot. No small-school reliability threshold is invented when a source does not publish one; the reported teacher count remains visible instead.

## Location evidence matches

The location finder accepts a California street address, city, or ZIP code and returns up to three evidence matches for each compatible grade band within a user-selected straight-line radius. A user may instead select an exact child grade and district-operated, charter, or magnet status as institutional eligibility filters. Street addresses are resolved by the U.S. Census Geocoder through the Worker and are not stored by this project. Exact matched coordinates are then sent through the Worker to CDE's authoritative 2025–26 district-area service. The returned elementary, high, or unified district areas establish district jurisdiction at that point; they do not establish an assigned school, transfer eligibility, or current enrollment rules. The Worker requests display-simplified WGS84 GeoJSON from the same official point-in-polygon response and validates polygon structure before returning it to the browser. The displayed outline is geographic context, not survey-grade or parcel-level geometry. City and ZIP searches use an approximate center calculated from published coordinates and do not claim a district-area match. A mapped school may appear in more than one band when its published grade span crosses bands.

This feature is an exploratory shortlist, not an attendance-school-boundary lookup or a universal quality ranking. It uses only the latest reliable all-student observation for each included indicator. Elementary and middle school weights are ELA 35%, mathematics 35%, chronic absence 20%, and suspension 10%. High school weights are ELA 20%, mathematics 20%, College/Career Indicator Prepared 12%, four-year graduation 12%, chronic absence 10%, A–G completion 8%, four-year dropout 8%, and suspension 10%. The older 2022–23 college-going rate is visible in school comparison but is not mixed into this latest-year location score.

Each source value uses the same 0–100 normalization defined below. A user may require at least 50%, 70%, 90%, or 100% of the selected grade-band evidence weight. At least one reliable academic indicator is always required. Academic, attendance, school-climate, and graduation or college-preparation priority multipliers of 0.5, 1, 1.5, or 2 may change the effective indicator weights; the interface exposes the choices and retains the documented base weights. Missing indicators remain missing and available weights are normalized proportionally.

Eligible results are ordered by normalized evidence score, then available evidence coverage, straight-line distance, and school name. Distance is not included in the score and only breaks a remaining tie. The interface displays distance, evidence coverage, a primary evidence driver, indicator values, and school years so families can inspect the result before adding a school to comparison. Share URLs are generated only through an explicit user action and preserve the displayed center and non-sensitive preferences. Protected traits are not location-finder inputs; official subgroup outcomes remain available in the comparison workspace after a school is selected.

## Normalized indicator view and experimental composite

The eight-axis comparison and experimental composite use the latest selected school year and student subgroup. They include CCI Prepared but exclude the older college-going measure from the composite. They transform unlike source units into a transparent 0–100 comparison index:

- higher-is-better percentages retain their source value;
- lower-is-better percentages use `100 - source value`;
- ELA and mathematics distance from standard use `clamp(50 + distance / 3, 0, 100)`, so −150 maps to 0, the grade-level standard maps to 50, and +150 maps to 100;
- missing, suppressed, and not-applicable observations remain missing and are never converted to zero.

The default experimental weights are ELA 18%, mathematics 18%, CCI Prepared 14%, chronic absenteeism 12%, four-year graduation 12%, suspension 12%, four-year dropout 8%, and A–G completion 6%. Users may edit them. If weights do not total 100%, the interface can normalize them proportionally.

For a school with available indicator set `A`, the composite is:

```text
sum(normalized_value_i * weight_i for i in A)
------------------------------------------------
          sum(weight_i for i in A)
```

The interface always displays both available-indicator count and available-weight coverage. Missing indicators are excluded and the remaining weights are rebalanced, so two schools with different coverage or grade spans require caution and may not be directly comparable. Scores preserve selection order and do not create rank positions, winners, or school-quality labels.

## Suppression and small samples

- Preserve all source suppression markers.
- Never reconstruct a suppressed value by subtraction or complementary groups.
- Treat source-published values for 11–29 students as small-N unless a stricter source rule applies.
- Do not calculate peer percentiles, rankings, or confident trends for small-N results.
- Display the numerator and denominator when the source permits it.

## College/career and postsecondary outcomes

The CCI metric is the official current-year percentage placed in the Prepared level. Its denominator can include students from two graduation cohort types, and its qualifying college and career measures can change between Dashboard releases. Component counts are retained in canonical metadata, but the first public view leads with the official Prepared rate and source methodology.

The 12-month college-going rate is the share of California public high school completers found enrolled in a U.S. public or private, two- or four-year postsecondary institution within 12 months. Its denominator includes regular diploma, CHSPE, GED, and adult education high school completers and excludes special education certificates of completion. It is not the four-year graduation cohort. The measure combines CALPADS completion records with National Student Clearinghouse matches; FERPA directory-information blocks can reduce the observed enrollment count. The latest public file currently ends in 2022–23, so the UI labels its year and does not mix it into current-year composite or location scores.

## Time-series comparability

Trend lines must break when data are missing or materially incomparable. Known examples include pandemic assessment gaps, unavailable 2019–20 chronic absenteeism data, and enrollment schema changes beginning in 2023–24.

Every metric definition includes a methodology version. A version change may require a visible break even when adjacent years contain values.

## Quality gates

Every source release must pass:

- schema and type checks;
- primary-key uniqueness;
- explicit detection of identity collisions;
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
