insert into cse.data_source (source_key, name, publisher, landing_page_url)
values (
  'cde_chronic_absenteeism',
  'CDE Chronic Absenteeism Data',
  'California Department of Education',
  'https://www.cde.ca.gov/ds/ad/filesabd.asp'
)
on conflict (source_key) do update
set
  name = excluded.name,
  publisher = excluded.publisher,
  landing_page_url = excluded.landing_page_url,
  updated_at = now();

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
values (
  'chronic_absenteeism_rate',
  'Chronic absenteeism rate',
  'Share of eligible cumulative enrollment identified as chronically absent.',
  'percent',
  'lower',
  'Students identified as chronically absent',
  'Chronic absenteeism eligible cumulative enrollment',
  'cde-2024-25-v1',
  'cde_chronic_absenteeism'
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

insert into cse.subgroup (subgroup_id, source_key, source_code, label, category_type)
values
  ('all', 'cde_chronic_absenteeism', 'TA', 'All students', 'total'),
  ('african_american', 'cde_chronic_absenteeism', 'RB', 'African American', 'race_ethnicity'),
  ('american_indian_alaska_native', 'cde_chronic_absenteeism', 'RI', 'American Indian or Alaska Native', 'race_ethnicity'),
  ('asian', 'cde_chronic_absenteeism', 'RA', 'Asian', 'race_ethnicity'),
  ('filipino', 'cde_chronic_absenteeism', 'RF', 'Filipino', 'race_ethnicity'),
  ('hispanic_latino', 'cde_chronic_absenteeism', 'RH', 'Hispanic or Latino', 'race_ethnicity'),
  ('race_not_reported', 'cde_chronic_absenteeism', 'RD', 'Race or ethnicity not reported', 'race_ethnicity'),
  ('pacific_islander', 'cde_chronic_absenteeism', 'RP', 'Pacific Islander', 'race_ethnicity'),
  ('two_or_more_races', 'cde_chronic_absenteeism', 'RT', 'Two or more races', 'race_ethnicity'),
  ('white', 'cde_chronic_absenteeism', 'RW', 'White', 'race_ethnicity'),
  ('female', 'cde_chronic_absenteeism', 'GF', 'Female', 'gender'),
  ('male', 'cde_chronic_absenteeism', 'GM', 'Male', 'gender'),
  ('non_binary', 'cde_chronic_absenteeism', 'GX', 'Non-binary gender', 'gender'),
  ('english_learners', 'cde_chronic_absenteeism', 'SE', 'English learners', 'program'),
  ('students_with_disabilities', 'cde_chronic_absenteeism', 'SD', 'Students with disabilities', 'program'),
  ('socioeconomically_disadvantaged', 'cde_chronic_absenteeism', 'SS', 'Socioeconomically disadvantaged', 'program'),
  ('migrant', 'cde_chronic_absenteeism', 'SM', 'Migrant students', 'program'),
  ('foster', 'cde_chronic_absenteeism', 'SF', 'Foster youth', 'program'),
  ('homeless', 'cde_chronic_absenteeism', 'SH', 'Homeless students', 'program'),
  ('grades_tk_k', 'cde_chronic_absenteeism', 'GRTKKN', 'Grades TK–K', 'grade_span'),
  ('grades_1_3', 'cde_chronic_absenteeism', 'GR13', 'Grades 1–3', 'grade_span'),
  ('grades_4_6', 'cde_chronic_absenteeism', 'GR46', 'Grades 4–6', 'grade_span'),
  ('grades_7_8', 'cde_chronic_absenteeism', 'GR78', 'Grades 7–8', 'grade_span'),
  ('grades_tk_8', 'cde_chronic_absenteeism', 'GRTK8', 'Grades TK–8', 'grade_span'),
  ('grades_9_12', 'cde_chronic_absenteeism', 'GR912', 'Grades 9–12', 'grade_span')
on conflict (subgroup_id) do update
set
  source_key = excluded.source_key,
  source_code = excluded.source_code,
  label = excluded.label,
  category_type = excluded.category_type;
