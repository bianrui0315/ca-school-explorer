# Data and Service Usage Review

Review date: July 16, 2026
Scope: California School Explorer v0.5.1 and the public Cloudflare deployment

## Purpose and limits

This engineering review records the published terms, attribution requirements, privacy boundaries, and redistribution controls for the external data and runtime services currently used by California School Explorer. It supports transparent release and hackathon review, but it is not legal advice and does not replace written permission from a publisher or advice from qualified counsel.

The review applies only to active sources and services. Planned sources in `config/sources.toml` must complete a separate review before implementation.

## Executive conclusion

- The two implemented California Open Data geography sources are explicitly designated `Public domain` on their dataset pages.
- CDE outcome and resource files are intentionally published for public informational, research, and policy use. CDE's separate copyright statement says permission is required to reproduce website material unless otherwise noted. The project therefore keeps those source families at `review-required`, does not publish raw files or source-document replicas, and distributes only selected normalized factual records with attribution and provenance.
- The U.S. Census Bureau permits API-backed applications subject to its terms and asks applications to identify the source and disclaim endorsement. The project uses the Geocoder only for user-initiated searches, displays a tailored non-endorsement notice, and does not store submitted addresses or matched coordinates.
- Current OpenStreetMap use follows the ODbL attribution and community tile-service requirements: the correct URL, visible linked attribution, normal interactive viewing, browser caching, and no proxy, prefetch, bulk download, or offline mode.
- The top-level runtime and build dependencies reviewed here use established open-source licenses, including MIT, BSD-2-Clause, Apache-2.0, and LGPL-3.0-only. Their licenses remain separate from the project's Apache-2.0 license.

No review finding changes the official meaning of a source value or permits CDE branding, endorsement claims, hidden-value reconstruction, or raw-source relicensing.

## Active source review

| Source family | Current use | Published evidence | Review result and controls |
| --- | --- | --- | --- |
| California Public Schools 2025–26 | School locations, directory context, enrollment, staffing, and institutional characteristics | The [California Open Data dataset](https://lab.data.ca.gov/dataset/california-public-schools-2025-26) identifies CDE as the organization and the license as `Public domain`. | `approved`; pinned snapshot and source attribution retained. |
| California School District Areas 2025–26 | Exact-point district jurisdiction and display polygons | The [California Open Data dataset](https://lab.data.ca.gov/dataset/california-school-district-areas-2025-26) identifies the license as `Public domain`; the linked ArcGIS layer exposes a public query operation. | `approved`; query only, bounded responses, no assignment claim, source year displayed. |
| Academic Indicator, ELA and mathematics | Distance-from-standard trends and context | CDE lists aggregate downloadable files as public resources in [About CDE's Educational Data](https://www.cde.ca.gov/ds/ad/aedo.asp); the [CDE copyright statement](https://www.cde.ca.gov/re/di/cr/index.asp) separately governs reproduction of website material. | `review-required`; no raw file, page text, branding, or source replica is distributed. Selected facts retain source, year, denominator, and suppression. |
| Chronic Absenteeism | Attendance trends and comparisons | Same CDE public-data and copyright framework. | `review-required`; same derived-record, attribution, and suppression controls. |
| Suspension | School-climate evidence and comparisons | Same CDE public-data and copyright framework. | `review-required`; same derived-record, attribution, and suppression controls. |
| Adjusted Cohort Graduation Rate and Outcomes | Graduation, A–G completion, and dropout | Same CDE public-data and copyright framework. | `review-required`; outcome populations remain separate and raw rows are not distributed. |
| College/Career Indicator | Official CCI Prepared rate | Same CDE public-data and copyright framework. | `review-required`; CCI remains distinct from A–G and college-going, with published denominator and source notes. |
| College-Going Rate, 12-month | Recorded postsecondary enrollment after high-school completion | CDE publishes the aggregate file; its documentation notes the combined CALPADS and National Student Clearinghouse basis. | `review-required`; no student-level or direct Clearinghouse data is accessed, and privacy-block limitations remain visible. |
| Staff Experience | Teacher counts and experience measures | Same CDE public-data and copyright framework. | `review-required`; selected school-level, all-gender facts only. |
| School Accountability Report Card data | Teacher preparation, class size, support staff, and counselor ratios | Same CDE public-data and copyright framework; CDE describes SARC as public comparison information. | `review-required`; selected numeric facts only, reporting year displayed, narrative source text not republished. |

## Runtime service review

### U.S. Census Bureau Geocoder

The application sends a street-address query to the public [Census Geocoding Services API](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html) through a bounded same-origin Worker route. It returns only the matched address and coordinates needed for the user's search.

The Census Bureau's [API Terms of Service](https://www.census.gov/data/developers/about/terms-of-service.html) allow applications to search, display, analyze, retrieve, and view Census information, subject to privacy, attribution, non-endorsement, and service-limit conditions. California School Explorer:

- names the U.S. Census Bureau Geocoder in the result flow;
- displays: “This product uses the U.S. Census Bureau Geocoder but is not endorsed or certified by the Census Bureau”;
- does not imply Census endorsement or certification;
- sends requests only after a user submits a location search;
- does not store the submitted address or matched coordinates;
- bounds request and response sizes, applies a timeout, and marks responses `private, no-store`;
- does not attempt to identify a Census respondent or combine the result with individual-level Census data.

The notice is tailored to the actual Geocoder rather than inaccurately claiming use of the separate Census Data API.

### CDE ArcGIS district-area service

After an exact geocode, the Worker sends the matched point to the public `DistrictAreas2526` feature service. The query returns the intersecting districts and simplified display geometry using bounded precision, offset, field selection, and a 500 KB response limit. The underlying dataset is explicitly Public Domain on California Open Data, and the service advertises the public `Query` operation.

Requests and responses are bounded, time-limited, and not stored. The UI states that district jurisdiction is not a school attendance assignment, enrollment guarantee, survey, or legal boundary determination.

### OpenStreetMap data and tiles

[OpenStreetMap's copyright page](https://www.openstreetmap.org/copyright) licenses its database under ODbL and requires attribution plus a link or notice that makes the license available. Each interactive map displays linked `© OpenStreetMap contributors` attribution.

The [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/) permits normal interactive human viewing and requires the canonical tile URL, visible attribution, normal caching, and identifiable browser traffic. The application:

- uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;
- loads tiles directly in the visitor's browser with the normal browser referrer and user agent;
- honors normal browser and server caching;
- does not proxy or strip the referrer;
- does not prefetch regions, bulk-download tiles, offer offline maps, or run background map scans.

The community tile endpoint is best-effort. Before sustained or material traffic, the project should move to a provider that explicitly supports production volume while retaining OSM attribution.

## Software dependency review

The repository's top-level JavaScript dependencies declare the following licenses in their installed package metadata:

| Package | Reviewed version | Declared license |
| --- | --- | --- |
| React | 19.2.7 | MIT |
| React DOM | 19.2.7 | MIT |
| Leaflet | 1.9.4 | BSD-2-Clause |
| Vite | 8.1.4 | MIT |
| Vitest | 4.1.10 | MIT |
| Wrangler | 4.110.0 | MIT OR Apache-2.0 |

The installed top-level Python runtime and test dependencies declare:

| Package | Reviewed version | Declared license |
| --- | --- | --- |
| Psycopg | 3.3.4 | LGPL-3.0-only |
| Psycopg Binary | 3.3.4 | LGPL-3.0-only |
| mypy | 1.20.2 | MIT |
| pytest | 8.4.2 | MIT |
| Ruff | 0.15.22 | MIT |

Package lockfiles remain committed for reproducibility. Dependency licenses and upstream notices are not replaced by the repository's Apache-2.0 license. A full transitive software-composition scan remains appropriate before a commercial release.

## Privacy and student-data boundary

- The project uses public, aggregate school, district, county, and statewide records; it does not ingest student-level records.
- Source suppression is preserved and never reconstructed.
- Small published denominators receive reliability warnings.
- A street address may be personal information. It is transmitted only after the user initiates a search, is sent to the Census Geocoder and then as coordinates to the CDE district service, and is not stored by this project.
- A share link containing the displayed center is created only after the user chooses the share action.
- Protected characteristics do not steer location ordering. Student-group results are available only as published school evidence with source caveats.

## Residual risks and required controls

| Priority | Risk | Required control |
| --- | --- | --- |
| Before broader redistribution | CDE's public-data purpose and general copyright statement do not provide a dataset-specific license for the active outcome and resource files. | Keep `review-required`; publish no raw files, page text, branding, seals, or source replicas. Seek written clarification from `DataQuest@cde.ca.gov` and, for copyright scope, `cdepress@cde.ca.gov`, or obtain qualified legal review. |
| Before adding any planned source | Planned CRDC, ACS, SEDA, Cradle-to-Career, directory, and private-school sources have not completed this review. | Do not ingest or publish them until their terms, attribution, privacy, and redistribution requirements are recorded. |
| Before sustained traffic | The OSM community tile server is not a production SLA. | Monitor usage and migrate to an appropriate OSM-derived provider before material scale; keep attribution. |
| Every release | Upstream terms and dataset metadata can change. | Recheck official terms when refreshing sources, record the review date, preserve pinned manifests, and fail closed on restricted sources. |
| Demo and marketing | Third-party seals, logos, screenshots, or music can create separate trademark or copyright issues. | Demonstrate the project's own UI, retain textual source attribution, avoid CDE seals and unrelated logos, and use no copyrighted music without permission. |

## Release checklist

- [x] Raw source files are ignored and absent from Git.
- [x] Public records carry source labels, URLs, and reporting years.
- [x] Suppression and missingness are preserved.
- [x] CDE endorsement is disclaimed and no CDE seal is used.
- [x] California Open Data Public Domain designations are recorded for both geography sources.
- [x] Census source and non-endorsement language are visible in the address flow.
- [x] OpenStreetMap attribution is visible and linked on each map.
- [x] OSM tiles are interactive-only, direct, cached, and not bulk downloaded.
- [x] Code and source-data licensing boundaries are documented.
- [ ] Written CDE clarification or qualified legal review has been obtained for broader redistribution of the active outcome and resource source families.

## Review sources

- [CDE: About CDE's Educational Data](https://www.cde.ca.gov/ds/ad/aedo.asp)
- [CDE: Copyright Statement](https://www.cde.ca.gov/re/di/cr/index.asp)
- [California Open Data: California Public Schools 2025–26](https://lab.data.ca.gov/dataset/california-public-schools-2025-26)
- [California Open Data: California School District Areas 2025–26](https://lab.data.ca.gov/dataset/california-school-district-areas-2025-26)
- [U.S. Census Bureau: Geocoding Services API](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html)
- [U.S. Census Bureau: API Terms of Service](https://www.census.gov/data/developers/about/terms-of-service.html)
- [OpenStreetMap: Copyright and License](https://www.openstreetmap.org/copyright)
- [OpenStreetMap Foundation: Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
