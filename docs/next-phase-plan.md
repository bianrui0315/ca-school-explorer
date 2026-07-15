# Next Phase Plan

This phase turns the comparison dashboard into a practical school-discovery workflow while preserving the project's evidence-first, no-ranking position.

## Product outcome

A family should be able to move from a place or grade need to a small, explainable comparison set without assuming that proximity determines enrollment eligibility.

## Work sequence

### 1. School discovery

- Search by school name, district, street address, city, county, ZIP code, or CDS code.
- Filter by county, city, and individual grade served.
- Rank exact school and ZIP matches ahead of broader directory matches.
- Keep filter-only browsing usable and show result counts and empty states.
- Preserve the five-school comparison limit.

### 2. School overview

- Add a concise profile summary for address, grade span, school type, charter status, enrollment, and staffing.
- Derive clearly labeled student-to-teacher context where both source values are available.
- Show important directory flags without presenting them as quality judgments.

Status: implemented using the existing versioned public-school directory bundle.

### 3. Geographic context

- Add a map mode for filtered search results and selected schools.
- Add distance-based nearby-school discovery from published school coordinates.
- Keep a persistent warning that nearby does not mean assigned or eligible.
- Evaluate a geocoding provider before accepting arbitrary household addresses; do not infer attendance boundaries without authoritative boundary data.

Status: search-result maps and radius-based nearby-school discovery are implemented using published school coordinates. Household-address geocoding and attendance boundaries remain deferred.

### 4. Dashboard context

- Add county and statewide reference series where metric grain and subgroup definitions reconcile.
- Add indicator coverage and missing-data summaries.
- Add reproducible comparison links with selected schools, metric, subgroup, and year range.
- Improve small-screen navigation and comparison-table scanning.

### 5. Data expansion

- Implement the California Dashboard College/Career Indicator as a distinct metric.
- Evaluate college-going and postsecondary outcome sources.
- Add reviewed staffing and selected SARC measures.
- Add ACS community context with margins of error.
- Publish private-school directory records in a separate mode without implying comparable public-school outcome coverage.

## Release boundaries

- `0.3.x`: discovery, profile usability, and comparison refinements using the existing public bundle.
- `0.4.0`: new reviewed indicator or contextual datasets that require a public-data release.
- Automated deployment remains optional; local release checks and authenticated Wrangler deployment continue to work.

## Acceptance criteria for discovery

- A ZIP or street-address query returns the expected school records from the public directory.
- County, city, and grade filters work alone and in combination.
- Grade filtering expands a published grade span rather than relying on school-name heuristics.
- Selected schools are excluded from results and no more than five schools can be compared.
- Search and filters work at desktop and mobile widths with keyboard-visible focus states.
- No search result claims attendance assignment or enrollment eligibility.
