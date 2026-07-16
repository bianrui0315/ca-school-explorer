# Teaching and Resources Data Quality Report

Release 0.5.0 adds six checksum-pinned California Department of Education source files to a separate school-resource fact model. The public site keeps source reporting years separate and does not convert these measures into a score or ranking.

## Source snapshots

| Dataset | Official reporting year | Posted or updated | Physical rows | Normalized observations | Database observations matched to known school entities |
| --- | --- | --- | ---: | ---: | ---: |
| SARC Teacher Preparation and Placement | 2024–25 report; school values for 2021–22 through 2023–24 | 2026-03-27 | 10,549 | 148,857 | 148,175 |
| SARC Average Class Size, Elementary | 2024–25 report; values for 2022–23 through 2024–25 | 2026-03-27 | 10,399 | 131,678 | 131,319 |
| SARC Average Class Size, Secondary | 2024–25 report; values for 2022–23 through 2024–25 | 2026-03-27 | 6,778 | 54,622 | 54,112 |
| SARC Ratio of Pupils to Academic Counselor | 2024–25 | 2025-12-04 | 10,278 | 5,817 | 5,817 |
| SARC Student Support Services Staff | 2024–25 | 2025-12-04 | 10,278 | 23,085 | 23,077 |
| Staff Experience | 2025–26 | 2026-07-14 | 374,325 | 70,301 | 70,098 |

Every file passed byte-size, SHA-256, record-count, encoding, complete-header, academic-year, CDS-code, nonnegative-numeric, natural-key uniqueness, and database write-count checks. The six snapshots add 432,598 canonical school-resource facts. The browser-safe release includes 428,035 observations for the 9,946 schools in the current public profile directory.

## Current-profile coverage

Coverage is the share of the 9,946 current public-school profiles with at least one usable value at the latest year available for that measure.

| Measure | Latest data year | Schools | Coverage |
| --- | --- | ---: | ---: |
| Teacher experience | 2025–26 | 9,936 | 99.9% |
| Teacher preparation and placement | 2023–24 | 9,834 | 98.9% |
| Average class size | 2024–25 | 9,769 | 98.2% |
| Student support staff FTE | 2024–25 | 8,943 | 89.9% |
| Pupils per academic counselor | 2024–25 | 5,813 | 58.4% |

The counselor ratio is substantially less complete and varies by grade span. A blank or published `0.00` ratio is omitted from the public observations and displayed as `Not reported`; it is never interpreted as zero pupils per counselor. Blank support-staff fields also remain unavailable. A reported support-staff zero remains a reported zero.

## Measure-specific rules

- Staff Experience uses only school-level, teacher, all-gender records. Teacher headcounts are not labeled as FTE. Experienced means more than two years; inexperienced means two years or less. Every accepted row reconciles experienced plus inexperienced to total teachers.
- Teacher preparation percentages and teaching-position FTE are preserved as published. Because FTE values are rounded independently, percentages are not recomputed from the displayed rounded FTE.
- Elementary class size is retained by kindergarten, grades one through six, and other elementary classes. Secondary class size is retained separately for English, mathematics, science, and social science.
- Published class-count bands are retained in provenance metadata. Elementary bands are 1–20, 21–32, and 33 or more; secondary bands are 1–22, 23–32, and 33 or more.
- Support services are retained as reported FTE by role. Headcounts, FTE, ratios, and years of experience are not treated as interchangeable units.
- No small-sample label is invented for Staff Experience because the source does not publish a universal small-school threshold. The interface shows the reported teacher count so readers can judge context.

## School-level verification

Porter Ranch Community (`19647330126607`) was used as a release verification case. The database and public shard agree on:

- 57 teachers, 12.2 average total years of experience, and 12.0 average district years in 2025–26;
- 90.0% fully credentialed teaching assignments and 56.0 teaching-position FTE in 2023–24;
- reported elementary and secondary class-size values in 2023–24 and 2024–25;
- 2.0 counselor FTE, 1.0 library media teacher FTE, 5.0 other support FTE, and 698 pupils per academic counselor in 2024–25.

## Interpretation limits

These records describe teaching and resource context, not effectiveness or school quality. Grade span, enrollment, program model, shared district staff, vacancies, contracting practices, and local reporting choices can affect the values. SARC data are supplied as a courtesy for local report-card development, and local educational agencies remain responsible for their SARC completeness and accuracy. Reporting years differ across sections and must not be presented as one synchronized snapshot.
