# Data Sources and Licensing Policy

California School Explorer is designed to consume public data from official publishers. Public availability does not automatically grant permission to relicense or redistribute a source file.

## Source policy

Every source adapter must record:

- publisher and canonical landing page;
- exact download URL;
- retrieval timestamp;
- source release or school year;
- SHA-256 digest of the retrieved file;
- original filename, media type, and byte size;
- schema or record-layout version;
- applicable terms, attribution, and redistribution status;
- known suppression, correction, and comparability notes.

Raw snapshots are immutable. A corrected upstream file is stored as a new snapshot even if the publisher reuses the filename.

## Licensing boundary

The Apache-2.0 project license applies to project code. It does not apply to CDE, federal, local, or third-party source data.

CDE's website copyright statement says that permission may be required to reproduce website material unless otherwise noted. Until a source-specific review is complete:

- do not commit raw source files to Git;
- do not distribute raw source files under the project license;
- do not use CDE seals or imply official endorsement;
- prefer reproducible download instructions and factual derived records;
- document attribution and correction channels in published outputs.

See the versioned source catalog at [`config/sources.toml`](config/sources.toml). A source with `license_review = "required"` is not approved for redistribution.

The catalog review states mean:

- `approved`: the specific dataset carries an explicit reuse status, such as the Public Domain designation on the California Open Data portal;
- `required`: public access has been verified, but the project has not obtained or documented source-specific permission to reproduce the publisher's source file;
- `restricted`: the source must not be included in a public release under the current terms.

The website publishes selected factual derived records rather than copies of CDE source files. Each public release carries source names, landing pages, release years, and immutable snapshot digests; suppression remains null and cannot be reconstructed by the client. The website does not relicense source data, reproduce CDE branding, or claim CDE endorsement. This technical boundary reduces redistribution risk but is not a substitute for formal source-specific permission review.

## July 16, 2026 review

The dated [data and service usage review](docs/compliance/data-and-service-usage-review-2026-07-16.md) covers all active source families and runtime services. Its principal findings are:

- California Public Schools 2025–26 and California School District Areas 2025–26 are explicitly marked `Public domain` on the California Open Data portal and remain `approved`;
- CDE makes the outcome and resource files publicly available for informational, research, and policy use, but its general copyright statement separately requires permission to reproduce website material unless otherwise noted, so those source families remain `required`;
- the public bundle contains selected normalized factual records, not raw CDE files, website text, branding, seals, or source-document replicas;
- the U.S. Census Geocoder is used only for user-initiated location lookup, with a visible source and non-endorsement notice and no project-side address storage;
- OpenStreetMap tiles are loaded only for normal interactive viewing with visible attribution, browser caching, the required tile URL, and no proxying, bulk download, or offline feature.

This review is an engineering governance record, not legal advice or a representation that a publisher has granted permission beyond its published terms. Written confirmation or qualified legal review remains recommended before commercial use or broader redistribution.

## Implemented official sources

The canonical database has pinned adapters for 2022–23, 2023–24, and 2024–25:

- Chronic Absenteeism: 1,028,744 source rows;
- Academic Indicator ELA: 522,019 source rows;
- Academic Indicator Mathematics: 522,663 source rows;
- Suspension: 677,797 source rows;
- Adjusted Cohort Graduation Rate and Outcomes: 341,491 source rows expanded into graduation, A–G completion, and dropout facts.
- College/Career Indicator: 102,370 source rows across 2022–23 through 2024–25, normalized to the distinct Prepared rate with component counts retained as metadata.
- College-Going Rate (12-month): 230,217 source rows for 2022–23, filtered at the documented all-completer grain into 84,142 canonical facts.
- Public School Geography 2025–26: 9,946 quality-controlled school coordinates and classification profiles.
- California School District Areas 2025–26: authoritative public-domain polygons queried by the Worker for district jurisdiction at exact address points.
- Staff Experience 2025–26: 374,325 physical rows filtered to 10,043 school-level, all-gender teacher records and normalized into experience averages and headcounts.
- SARC Teacher Preparation and Placement 2024–25: 10,549 school rows with published teaching-position FTE and percentages for 2021–22 through 2023–24.
- SARC Elementary and Secondary Average Class Size 2024–25: 17,177 physical rows retaining grade, subject, year, and published class-count bands.
- SARC Student Support Services Staff and Ratio of Pupils to Academic Counselor 2024–25: 20,556 physical rows retaining reported support FTE and usable counselor ratios.

Each manifest records the official URL, release date, encoding, byte size, record count, header contract, and SHA-256 digest. Adapters preserve CDE suppression markers, flag reported samples below 30, and reconcile published rates to source counts where counts are available.

The [CDE Accountability Downloadable Data Files](https://www.cde.ca.gov/ds/ad/accdf.asp) page is the primary discovery directory for Dashboard state indicators, local indicators, enrollment, growth, and SARC data. Its College/Career, English Learner Progress, Dashboard Graduation, Science, Local Indicator, and Growth datasets are explicitly cataloged in [`config/sources.toml`](config/sources.toml).

A–G completion is not the California Dashboard College/Career Indicator. The A–G rate uses regular diploma graduates as its denominator; the implemented CCI Prepared rate uses the official CCI population and multiple college and career measures. The 12-month college-going rate uses a third high-school-completer population and is also kept separate.

The next implementation priority is:

1. CDE Public School and District Directory;
2. CDE Census Day Enrollment;
3. Dashboard Graduation status and change;
4. English Learner Progress and Science;
5. additional historical depth for college-going and implemented metrics.

The public directory is continuously updated and organization-reported, so its addresses and classifications may contain omissions or stale values. The implemented public-school geographic layer is an annual, public-domain CDE Geo Hub snapshot with quality-controlled coordinates. It covers open TK–12 sites and is therefore a subset of the complete directory.

Private schools are cataloged separately. CDE's directory and annual Private School Affidavit files generally include schools reporting six or more students. Inclusion is neither CDE approval nor an outcome measure, and private schools will not be ranked against public schools using missing Dashboard metrics.

Additional SARC measures, CRDC, ACS, SEDA, and Cradle-to-Career data remain candidates for reviewed expansion. The implemented staffing and SARC teaching-resource measures remain separate from outcome metrics and are not used to create a school rating.

## Corrections

Report a suspected source, transformation, or interpretation error with the data issue template. Include the source, school year, entity, metric, expected value, observed value, and official evidence when available. Do not include student-level information.
