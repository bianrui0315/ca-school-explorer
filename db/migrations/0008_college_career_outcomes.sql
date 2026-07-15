insert into cse.data_source (source_key, name, publisher, landing_page_url)
values
  (
    'cde_cci',
    'CDE College/Career Indicator Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ta/ac/cm/ccidatafiles.asp'
  ),
  (
    'cde_college_going_12_month',
    'CDE College-Going Rate for High School Completers (12-Month)',
    'California Department of Education',
    'https://www.cde.ca.gov/ds/ad/filescgr12.asp'
  )
on conflict (source_key) do update
set
  name = excluded.name,
  publisher = excluded.publisher,
  landing_page_url = excluded.landing_page_url,
  updated_at = now();

insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
select 'cde_cci', source_code, subgroup_id
from cse.subgroup_source_code
where source_key = 'cde_academic_indicator'
  and source_code in (
    'ALL', 'AA', 'AI', 'AS', 'FI', 'HI', 'PI', 'WH', 'MR',
    'EL', 'LTEL', 'SED', 'SWD', 'FOS', 'HOM'
  )
on conflict (source_key, source_code) do update
set subgroup_id = excluded.subgroup_id;

insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
select 'cde_college_going_12_month', source_code, subgroup_id
from cse.subgroup_source_code
where source_key = 'cde_acgr'
on conflict (source_key, source_code) do update
set subgroup_id = excluded.subgroup_id;

insert into cse.metric (
  metric_id,
  label,
  description,
  unit,
  direction,
  numerator_description,
  denominator_description,
  methodology_version,
  source_key
)
values
  (
    'college_career_prepared_rate',
    'College/career prepared rate',
    'Share of students in the California College/Career Indicator who are placed in the Prepared level.',
    'percent',
    'higher',
    'Students placed in the College/Career Indicator Prepared level',
    'Students included in the current-year College/Career Indicator',
    'cde-dashboard-cci-2023-2025-v1',
    'cde_cci'
  ),
  (
    'college_going_rate_12_month',
    'College-going rate within 12 months',
    'Share of California public high school completers who enrolled in a U.S. postsecondary institution within 12 months of completing high school.',
    'percent',
    'higher',
    'High school completers enrolled in college within 12 months',
    'Regular diploma, CHSPE, GED, and adult education high school completers; special education certificates are excluded',
    'cde-dataquest-cgr12-2022-23-v1',
    'cde_college_going_12_month'
  )
on conflict (metric_id) do update
set
  label = excluded.label,
  description = excluded.description,
  unit = excluded.unit,
  direction = excluded.direction,
  numerator_description = excluded.numerator_description,
  denominator_description = excluded.denominator_description,
  methodology_version = excluded.methodology_version,
  source_key = excluded.source_key;
