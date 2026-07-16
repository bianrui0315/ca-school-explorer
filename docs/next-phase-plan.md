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

Status: implemented using the existing versioned public-school directory bundle. Release `0.5.1` adds a stable, shareable single-school report that reuses the same outcome, subgroup, resource, and geographic evidence.

### 3. Geographic context

- Add a map mode for filtered search results and selected schools.
- Add distance-based nearby-school discovery from published school coordinates.
- Keep a persistent warning that nearby does not mean assigned or eligible.
- Evaluate a geocoding provider before accepting arbitrary household addresses; do not infer attendance boundaries without authoritative boundary data.

Status: search-result maps and radius-based nearby-school discovery are implemented using published school coordinates. A work-address, city, or ZIP finder now returns transparent evidence matches by grade band. Street addresses use the U.S. Census Geocoder through the Worker and are not stored by this project. Attendance boundaries remain deferred.

### 4. Location evidence matches

- Accept 5, 10, 15, 25, and 50 mile radii around a California work address, city, or ZIP.
- Group a short list by elementary, middle, and high school grades served.
- Order only by documented, coverage-aware indicator evidence; use distance only as a tie-break.
- Show distance, evidence coverage, latest values and years, and the non-assignment warning.
- Filter by exact grade and public-school type, set a minimum evidence threshold, and adjust transparent evidence priorities without using protected traits.
- Explain the strongest evidence driver and reproduce the same location search from an explicitly generated share link.
- Let a family add a result to the existing comparison without duplicating the analytical workflow.

Status: implemented with latest reliable all-student observations in the public school index and no AI model dependency. Release `0.3.2` adds the personalized filters, priority multipliers, evidence threshold, explanation, and share-link flow.

### 5. Dashboard context

- Add county and statewide reference series where metric grain and subgroup definitions reconcile.
- Add indicator coverage and missing-data summaries.
- Add reproducible comparison links with selected schools, metric, subgroup, and year range.
- Improve small-screen navigation and comparison-table scanning.

Status: county and statewide references, coverage summaries, full comparison share links, and the Area Explorer-to-Compare handoff are implemented in release `0.4.2`. Release `0.4.3` adds transparent statewide similar-context peers, direct comparison handoff, and a denominator-weighted peer reference. Matching excludes all outcome indicators. County academic and CCI references explicitly disclose denominator-weighted district aggregation where CDE does not publish a matching county row.

### 6. Data expansion

- Maintain the implemented California Dashboard College/Career Indicator as a distinct metric.
- Maintain the implemented 12-month college-going outcome and add later official years without mixing lagged values into current-year scores.
- Extend exact-address district jurisdiction with current official local attendance-school locators only where the district provides a verifiable source and effective date.
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
- A real California street address resolves through the Worker and returns grouped, evidence-labeled results without storing the submitted address.
- Changing the radius recomputes the shortlist and map without another geocoding request.
- Exact grade, school type, minimum evidence, and priority settings reproduce through a validated share link.
- Protected traits do not alter location-match eligibility or ordering.
