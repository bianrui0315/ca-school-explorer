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

## Initial official sources

The first implementation priority is:

1. CDE Public School and District Directory;
2. CDE Census Day Enrollment;
3. CDE Academic Indicator Data;
4. CDE Chronic Absenteeism Data;
5. CDE Suspension Data;
6. CDE graduation and college-going data.

Staffing, SARC, CRDC, ACS, SEDA, and Cradle-to-Career data follow after the entity model and comparison rules are stable.

## Corrections

Report a suspected source, transformation, or interpretation error with the data issue template. Include the source, school year, entity, metric, expected value, observed value, and official evidence when available. Do not include student-level information.
