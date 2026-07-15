# College/Career and Postsecondary Data Quality Report

## Scope

Release 0.4.0 adds three official California Dashboard College/Career Indicator snapshots and the latest CDE 12-month College-Going Rate file. It also adds a point-in-polygon lookup against the public-domain CDE 2025–26 school district area service.

The metrics remain distinct:

- `college_career_prepared_rate` is the official percentage of the CCI population placed in the Prepared level.
- `college_going_rate_12_month` is the percentage of California public high school completers found enrolled in a U.S. postsecondary institution within 12 months.
- `a_g_completion_rate` remains the share of regular diploma graduates meeting UC/CSU entrance requirements.

These measures must not be substituted for one another because they use different denominators and qualifying events.

## Source snapshots

| Dataset | School year | Source records | Canonical observations | Suppressed | SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| CCI | 2022–23 | 32,438 | 32,438 | 14,765 | `c7e69c7136b8b5e168c1ccbb9c0e54c7c6a8fb9f670c9846a0e08c83354f8e7f` |
| CCI | 2023–24 | 34,983 | 34,983 | 15,453 | `dd82ddf40d9bb50b0ce92fd2704276a2fa04c118acef728b53476de8a2410bdd` |
| CCI | 2024–25 | 34,949 | 34,949 | 15,548 | `a515082440741da7f03d14c5ae73f084d978301faadcf8889ff42484a5c73eb4` |
| College-going, 12-month | 2022–23 | 230,217 | 84,142 | 36,462 | `d57379f76a2038af0e0bbc7aaa761fca27ef9a4c3b94ba904e6ce37c6a21b727` |

All four files passed byte-size, digest, UTF-8, exact-header, physical record-count, academic-year, aggregation-level, CDS-code, numeric, suppression, natural-grain, and database-reconciliation checks. Every reported headline rate recalculated exactly to the published one-decimal rate from its source numerator and denominator.

The college-going file contains four completer types. The canonical adapter intentionally retains only `TA`, the all-high-school-completer type, producing 84,142 observations from 230,217 validated physical source records. This prevents the A–G and non-graduate-completer subsets from being counted as independent headline metrics.

## School-level coverage

| Metric and year | All-student school rows | Reported values | Suppressed values | Rows matched to current public profiles |
| --- | ---: | ---: | ---: | ---: |
| CCI 2022–23 | 2,542 | 2,307 | 235 | 2,463 |
| CCI 2023–24 | 2,552 | 2,308 | 244 | 2,493 |
| CCI 2024–25 | 2,551 | 2,289 | 262 | 2,506 |
| College-going 2022–23 | 2,591 | 2,213 | 378 | 2,400 |

Public publishing requires a resolved entity identity and a current CDE public-school profile. Historical schools without a current profile remain in PostgreSQL but are not forced into the current-school browser bundle.

CCI 2022–23 does not contain the later `LTEL` reporting category. The 2023–24 and 2024–25 files do. Missing category-year combinations remain absent and are not imputed.

## Interpretation limits

- The CCI denominator can include students from two graduation cohort types. Its qualifying college and career measures evolve; the 2025 file changes the AP measure and the treatment of the transition classroom/work measure relative to 2024. The UI links the official record layout and cautions against treating a method change as purely student change.
- The latest public 12-month college-going file currently ends in 2022–23. It is displayed with its actual year and excluded from the current-year composite and location evidence score.
- College-going includes regular diploma, CHSPE, GED, and adult education high school completers and excludes special education certificates of completion. It is not the adjusted four-year graduation cohort.
- National Student Clearinghouse matches can omit FERPA-blocked directory information. CDE reports that these blocks can reduce observed enrollment, so the rate is evidence of recorded college-going rather than a complete individual-outcome census.
- Suppressed cells remain null. The project never reconstructs them from totals or complementary groups.

## District boundary validation

The Worker sends exact geocoded coordinates by same-origin POST to the CDE `DistrictAreas2526` ArcGIS service with `returnGeometry=false`. Requests and upstream responses have byte limits and an eight-second timeout; responses are marked `private, no-store`. A test point at 12450 Mason Avenue in Porter Ranch returns Los Angeles Unified, CDS `19647330000000`, as a 2025–26 unified district serving PK–12.

District areas can overlap where separate elementary and high school districts serve the same territory, so the API returns every intersecting district and preserves district type and grade span. The result confirms district jurisdiction only. It does not claim an assigned school, transfer right, or enrollment eligibility.

## Official references

- [CDE College/Career Indicator files](https://www.cde.ca.gov/ta/ac/cm/ccidatafiles.asp)
- [CDE CCI 2024–2025 record layout](https://www.cde.ca.gov/ta/ac/cm/ccdata2024.asp)
- [CDE 12-month College-Going Rate files](https://www.cde.ca.gov/ds/ad/filescgr12.asp)
- [CDE 12-month College-Going Rate file structure](https://www.cde.ca.gov/ds/ad/fscgr12.asp)
- [CDE California School District Areas 2025–26](https://lab.data.ca.gov/dataset/california-school-district-areas-2025-26)
