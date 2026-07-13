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

The v0.1.0 website publishes selected factual derived records rather than copies of CDE source files. Each public release carries source names, landing pages, release years, and immutable snapshot digests; suppression remains null and cannot be reconstructed by the client. The website does not relicense source data, reproduce CDE branding, or claim CDE endorsement. This technical boundary reduces redistribution risk but is not a substitute for formal source-specific permission review.

## Implemented official sources

The canonical database has pinned 2024–25 adapters for:

- Chronic Absenteeism: 341,490 source rows;
- Academic Indicator ELA: 176,088 source rows;
- Academic Indicator Mathematics: 176,260 source rows;
- Suspension: 226,461 source rows;
- Adjusted Cohort Graduation Rate and Outcomes: 113,653 source rows expanded into graduation, A–G completion, and dropout facts.
- Public School Geography 2025–26: 9,946 quality-controlled school coordinates and classification profiles.

Each manifest records the official URL, release date, encoding, byte size, record count, header contract, and SHA-256 digest. Adapters preserve CDE suppression markers, flag reported samples below 30, and reconcile published rates to source counts where counts are available.

The [CDE Accountability Downloadable Data Files](https://www.cde.ca.gov/ds/ad/accdf.asp) page is the primary discovery directory for Dashboard state indicators, local indicators, enrollment, growth, and SARC data. Its College/Career, English Learner Progress, Dashboard Graduation, Science, Local Indicator, and Growth datasets are explicitly cataloged in [`config/sources.toml`](config/sources.toml).

A–G completion is not the California Dashboard College/Career Indicator. The implemented A–G rate uses regular diploma graduates as its denominator. CCI uses combined four- and five-year graduates and multiple college and career measures, so it will receive a separate adapter and metric definition.

The next implementation priority is:

1. CDE Public School and District Directory;
2. CDE Census Day Enrollment;
3. CDE College/Career Indicator;
4. Dashboard Graduation status and change;
5. English Learner Progress and Science;
6. additional historical years for implemented metrics.

The public directory is continuously updated and organization-reported, so its addresses and classifications may contain omissions or stale values. The implemented public-school geographic layer is an annual, public-domain CDE Geo Hub snapshot with quality-controlled coordinates. It covers open TK–12 sites and is therefore a subset of the complete directory.

Private schools are cataloged separately. CDE's directory and annual Private School Affidavit files generally include schools reporting six or more students. Inclusion is neither CDE approval nor an outcome measure, and private schools will not be ranked against public schools using missing Dashboard metrics.

Staffing, SARC, CRDC, ACS, SEDA, and Cradle-to-Career data follow after the entity model and comparison rules are stable.

## Corrections

Report a suspected source, transformation, or interpretation error with the data issue template. Include the source, school year, entity, metric, expected value, observed value, and official evidence when available. Do not include student-level information.
