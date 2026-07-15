# Roadmap

The roadmap is task-based rather than feature-count-based. The first milestone succeeds when a family can compare three schools in under three minutes and correctly identify one trend, one subgroup difference, and one limitation.

## Phase 0: Validate the problem

- Interview 15 parents across moving, school transition, English learner, special education, demographic, and geographic contexts.
- Interview three to five educators, counselors, or advocates.
- Test the distinction between nearby schools and assigned schools.
- Select one pilot region and 8–12 schools.

## Phase 1: Build the data foundation

- Extend the implemented public-school geography profiles with the continuously updated CDE Directory and authoritative identity history.
- Maintain immutable source manifests and checksums. Five outcome snapshots are implemented for each year from 2022–23 through 2024–25.
- Maintain normalized canonical records and ingestion audit history in PostgreSQL.
- Implement Census Day Enrollment and the canonical school directory. ELA and mathematics indicators are implemented.
- Add fixtures and reconciliation tests.

## Phase 2: Deliver the comparison task

- Add school and district search. School name, district, address, ZIP, county, city, and grade discovery are implemented incrementally in `0.3.x`.
- Compare two to five schools on one multi-year view.
- Add subgroup lenses and reliability notes.
- Add same-district, nearby, and similar-context baselines.
- Show selected schools on a coordinate-based comparison map with clear basemap attribution.
- Provide an experimental seven-indicator profile and user-adjustable weighted composite with explicit coverage warnings.
- Generate reproducible share links.

The ordered implementation plan for discovery, school profiles, geographic context, dashboard context, and new data is documented in [Next Phase Plan](docs/next-phase-plan.md).

## Phase 3: Expand outcome coverage

- Publish reviewed chronic absenteeism, academic, suspension, and graduation bundles from the canonical store.
- Add the distinct Dashboard College/Career Indicator and college-going outcomes for high schools.
- Add staff ratios and selected SARC measures.
- Add a public data freshness and correction page.

## Phase 4: Broaden context carefully

- Evaluate CRDC program, discipline, and safety data.
- Add private-school directory and affidavit profiles in a visibly separate comparison mode without synthetic public-school performance equivalence.
- Add ACS community context with margins of error.
- Evaluate SEDA and Cradle-to-Career integrations.
- Begin Spanish terminology and localization work.

## Deferred until reliable statewide data exist

- Address-level attendance boundary assignment;
- principal history;
- incident-level safety claims;
- unverified special programs, awards, or school characteristics;
- user reviews and ratings;
- AI-generated school recommendations.
