# 2023–24 Historical Data Quality Report

## Scope and verdict

Release 0.2.0 adds one prior outcome year, 2023–24, to the existing 2024–25 public indicators. All five official source files passed fail-closed byte-size, SHA-256, row-count, encoding, header, academic-year, reporting-category, numeric, suppression, and database-reconciliation checks.

The two adjacent years are suitable for descriptive trend comparison with a visible CDE comparability caution. No project method break was detected: each year uses the same adapter and normalized metric definition. This does not override CDE's warning that processing or reporting changes may affect comparisons.

## Import reconciliation

| Source | 2023–24 source rows | Canonical facts | Suppressed facts |
| --- | ---: | ---: | ---: |
| Chronic Absenteeism | 343,602 | 343,602 | 105,833 |
| Suspension | 225,157 | 225,157 | 84,708 |
| Adjusted Cohort Graduation Rate and Outcomes | 113,867 | 341,601 | 179,505 |
| Academic Indicator ELA | 176,564 | 176,564 | 59,616 |
| Academic Indicator Mathematics | 176,806 | 176,806 | 59,488 |
| **Total** | **1,035,996** | **1,263,730** | **489,150** |

The cohort file produces three facts per source row: four-year graduation, A–G completion, and four-year dropout. A first chronic-absence import attempt failed closed on previously unseen code `GZ`; the official file structure defines it as `Missing Gender`. Migration `0006_missing_gender_subgroup.sql` adds that explicit mapping, and the successful retry loaded all validated rows. The failed and successful attempts remain in `cse.import_run` as audit evidence.

## Cross-year profile

| Metric | 2023–24 facts | 2024–25 facts | 2023–24 suppressed | 2024–25 suppressed | Current-school two-year overlap |
| --- | ---: | ---: | ---: | ---: | ---: |
| A–G completion | 113,867 | 113,653 | 52.55% | 52.92% | 97.93% |
| Chronic absenteeism | 343,602 | 341,490 | 30.80% | 30.59% | 99.59% |
| ELA distance from standard | 176,564 | 176,088 | 33.76% | 33.39% | 99.53% |
| Four-year dropout | 113,867 | 113,653 | 52.55% | 52.92% | 97.93% |
| Four-year graduation | 113,867 | 113,653 | 52.55% | 52.92% | 97.93% |
| Mathematics distance from standard | 176,806 | 176,260 | 33.65% | 33.30% | 99.54% |
| Suspension | 225,157 | 226,461 | 37.62% | 38.00% | 99.55% |

Overlap is the number of current-profile schools with data in both years divided by those with current-year data. It measures publishable longitudinal coverage, not whether every subgroup value is reported.

## Validity checks

- Canonical facts after import: 2,524,988 across two years, seven metrics, 11,971 referenced entities, and 32 normalized subgroups.
- Duplicate canonical grain: zero, enforced by database uniqueness constraints.
- Rate values outside 0–100: zero.
- Numerators greater than denominators: zero.
- Reported observations without a value: zero.
- Suppressed observations with a disclosed value or numerator: zero.
- Some suppressed or unavailable records retain an eligible-population denominator supplied by CDE; the protected measure remains null.
- Public export: 9,946 current public-school profiles, 1,019 district baselines, and 1,839,368 observations.

## Statewide reasonableness checks

The normalized all-student, all-charter, all-DASS statewide values for 2023–24 are 20.4% chronic absenteeism, 86.4% four-year graduation, 8.9% four-year dropout, 51.9% A–G completion, 3.3% suspension, −13.2 ELA distance from standard, and −47.6 mathematics distance from standard. Chronic absenteeism and graduation reconcile to CDE's 2024 statewide release highlights.

## Sources

- [CDE Chronic Absenteeism Downloadable Data](https://www.cde.ca.gov/ds/ad/filesabd.asp)
- [CDE Suspension Downloadable Data](https://www.cde.ca.gov/ds/ad/filessd.asp)
- [CDE Adjusted Cohort Graduation Rate Data](https://www.cde.ca.gov/ds/ad/filesacgr.asp)
- [CDE Academic Indicator Data Files](https://www.cde.ca.gov/ta/ac/cm/acaddatafiles.asp)
- [CDE 2024 Dashboard release](https://www.cde.ca.gov/nr/ne/yr24/yr24rel49.asp)
