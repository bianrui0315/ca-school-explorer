# 2022–23 Historical Data Quality Report

## Scope and verdict

Release 0.3.0 adds 2022–23 as the third adjacent outcome year for all seven published indicators. All five official source files passed fail-closed byte-size, SHA-256, row-count, encoding, header, academic-year, reporting-category, numeric, suppression, and database-reconciliation checks.

The three adjacent years are suitable for descriptive comparison with the visible CDE comparability caution. No project method break was detected: each year uses the same adapter and normalized metric definition. Three annual points are still a short series and should not be treated as a forecast or a stable long-term trend.

## Import reconciliation

| Source | 2022–23 source rows | Canonical facts | Suppressed facts |
| --- | ---: | ---: | ---: |
| Chronic Absenteeism | 343,652 | 343,652 | 106,182 |
| Suspension | 226,179 | 226,179 | 85,942 |
| Adjusted Cohort Graduation Rate and Outcomes | 113,971 | 341,913 | 181,458 |
| Academic Indicator ELA | 169,367 | 169,367 | 56,261 |
| Academic Indicator Mathematics | 169,597 | 169,597 | 56,285 |
| **Total** | **1,022,766** | **1,250,708** | **486,128** |

The cohort file produces three facts per source row: four-year graduation, A–G completion, and four-year dropout. The older chronic-absence file uses codes `GRKN` and `GRK8` for the same grade spans later labeled `GRTKKN` and `GRTK8`. The first import failed closed; migration `0007_historical_chronic_absence_grade_spans.sql` adds explicit aliases to the existing canonical grade-span subgroups, and the successful retry loaded every validated row.

## Three-year profile

| Metric | 2022–23 facts | 2022–23 suppressed | Current-school three-year overlap |
| --- | ---: | ---: | ---: |
| A–G completion | 113,971 | 53.07% | 96.41% |
| Chronic absenteeism | 343,652 | 30.89% | 99.16% |
| ELA distance from standard | 169,367 | 33.22% | 99.10% |
| Four-year dropout | 113,971 | 53.07% | 96.41% |
| Four-year graduation | 113,971 | 53.07% | 96.41% |
| Mathematics distance from standard | 169,597 | 33.19% | 99.10% |
| Suspension | 226,179 | 38.00% | 99.15% |

Overlap is the number of current-profile schools with any observation in all three years divided by current-profile schools with 2024–25 data. It measures publishable longitudinal coverage, not whether every subgroup value is reported.

## Validity checks

- Canonical facts after import: 3,775,696 across three years, seven metrics, 12,112 referenced entities, and 32 normalized subgroups.
- Duplicate canonical grain: zero, enforced by database uniqueness constraints.
- Rate values outside 0–100: zero.
- Numerators greater than denominators: zero.
- Reported observations without a value: zero.
- Suppressed observations with a disclosed value or numerator: zero.
- Public export: 9,946 current public-school profiles, 1,023 district baselines, and 2,739,483 observations.
- Porter Ranch Community has reported all-student ELA values of 65.4, 69.6, and 76.1 and mathematics values of 43.9, 56.9, and 60.4 for 2022–23 through 2024–25.

## Statewide reasonableness checks

The normalized all-student, all-charter, all-DASS statewide values for 2022–23 are 24.9% chronic absenteeism, 86.2% four-year graduation, 8.2% four-year dropout, 52.4% A–G completion, 3.6% suspension, −13.6 ELA distance from standard, and −49.1 mathematics distance from standard. Chronic absenteeism and graduation align with the CDE's 2023 Dashboard release summary.

## Sources

- [CDE Chronic Absenteeism Downloadable Data](https://www.cde.ca.gov/ds/ad/filesabd.asp)
- [CDE Suspension Downloadable Data](https://www.cde.ca.gov/ds/ad/filessd.asp)
- [CDE Adjusted Cohort Graduation Rate Data](https://www.cde.ca.gov/ds/ad/filesacgr.asp)
- [CDE Academic Indicator Data Files](https://www.cde.ca.gov/ta/ac/cm/acaddatafiles.asp)
- [CDE 2023 Dashboard release](https://www.cde.ca.gov/nr/ne/yr23/yr23rel87.asp)
