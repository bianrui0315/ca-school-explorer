insert into cse.data_source (source_key, name, publisher, landing_page_url)
values
  (
    'cde_academic_indicator',
    'CDE Academic Indicator Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ta/ac/cm/acaddatafiles.asp'
  ),
  (
    'cde_suspension',
    'CDE Suspension Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ds/ad/filessd.asp'
  ),
  (
    'cde_acgr',
    'CDE Adjusted Cohort Graduation Rate and Outcome Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ds/ad/filesacgr.asp'
  )
on conflict (source_key) do update
set
  name = excluded.name,
  publisher = excluded.publisher,
  landing_page_url = excluded.landing_page_url,
  updated_at = now();

alter table cse.entity
  add column identity_key text,
  add column identity_resolution text not null default 'resolved';

update cse.entity
set identity_key = entity_type || ':' || cds_code
where identity_key is null;

alter table cse.entity
  alter column identity_key set not null,
  add constraint entity_identity_key_unique unique (identity_key),
  add constraint entity_identity_resolution_check check (
    identity_resolution in ('resolved', 'ambiguous')
  ),
  drop constraint entity_type_cds_code_unique;

create index entity_type_cds_code_idx on cse.entity (entity_type, cds_code);

create table cse.subgroup_source_code (
  source_key text not null references cse.data_source (source_key),
  source_code text not null,
  subgroup_id text not null references cse.subgroup (subgroup_id),
  created_at timestamptz not null default now(),
  primary key (source_key, source_code)
);

insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
select source_key, source_code, subgroup_id
from cse.subgroup;

alter table cse.subgroup
  drop constraint subgroup_source_code_unique,
  drop column source_key,
  drop column source_code;

create index subgroup_source_code_subgroup_idx
  on cse.subgroup_source_code (subgroup_id);

insert into cse.subgroup (subgroup_id, label, category_type)
values
  ('long_term_english_learners', 'Long-term English learners', 'program'),
  ('english_learners_only', 'English learners only', 'program'),
  ('recently_reclassified', 'Recently reclassified English learners', 'program'),
  ('english_only', 'English only', 'program'),
  ('smarter_balanced_assessment', 'Smarter Balanced assessment', 'program'),
  ('alternate_assessment', 'California Alternate Assessment', 'program')
on conflict (subgroup_id) do update
set
  label = excluded.label,
  category_type = excluded.category_type;

insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
values
  ('cde_academic_indicator', 'ALL', 'all'),
  ('cde_academic_indicator', 'AA', 'african_american'),
  ('cde_academic_indicator', 'AI', 'american_indian_alaska_native'),
  ('cde_academic_indicator', 'AS', 'asian'),
  ('cde_academic_indicator', 'FI', 'filipino'),
  ('cde_academic_indicator', 'HI', 'hispanic_latino'),
  ('cde_academic_indicator', 'PI', 'pacific_islander'),
  ('cde_academic_indicator', 'WH', 'white'),
  ('cde_academic_indicator', 'MR', 'two_or_more_races'),
  ('cde_academic_indicator', 'EL', 'english_learners'),
  ('cde_academic_indicator', 'LTEL', 'long_term_english_learners'),
  ('cde_academic_indicator', 'ELO', 'english_learners_only'),
  ('cde_academic_indicator', 'RFP', 'recently_reclassified'),
  ('cde_academic_indicator', 'EO', 'english_only'),
  ('cde_academic_indicator', 'SED', 'socioeconomically_disadvantaged'),
  ('cde_academic_indicator', 'SWD', 'students_with_disabilities'),
  ('cde_academic_indicator', 'FOS', 'foster'),
  ('cde_academic_indicator', 'HOM', 'homeless'),
  ('cde_academic_indicator', 'SBA', 'smarter_balanced_assessment'),
  ('cde_academic_indicator', 'CAA', 'alternate_assessment'),
  ('cde_suspension', 'TA', 'all'),
  ('cde_suspension', 'RB', 'african_american'),
  ('cde_suspension', 'RI', 'american_indian_alaska_native'),
  ('cde_suspension', 'RA', 'asian'),
  ('cde_suspension', 'RF', 'filipino'),
  ('cde_suspension', 'RH', 'hispanic_latino'),
  ('cde_suspension', 'RD', 'race_not_reported'),
  ('cde_suspension', 'RP', 'pacific_islander'),
  ('cde_suspension', 'RT', 'two_or_more_races'),
  ('cde_suspension', 'RW', 'white'),
  ('cde_suspension', 'GF', 'female'),
  ('cde_suspension', 'GM', 'male'),
  ('cde_suspension', 'GX', 'non_binary'),
  ('cde_suspension', 'SE', 'english_learners'),
  ('cde_suspension', 'SD', 'students_with_disabilities'),
  ('cde_suspension', 'SS', 'socioeconomically_disadvantaged'),
  ('cde_suspension', 'SM', 'migrant'),
  ('cde_suspension', 'SF', 'foster'),
  ('cde_suspension', 'SH', 'homeless'),
  ('cde_acgr', 'TA', 'all'),
  ('cde_acgr', 'RB', 'african_american'),
  ('cde_acgr', 'RI', 'american_indian_alaska_native'),
  ('cde_acgr', 'RA', 'asian'),
  ('cde_acgr', 'RF', 'filipino'),
  ('cde_acgr', 'RH', 'hispanic_latino'),
  ('cde_acgr', 'RD', 'race_not_reported'),
  ('cde_acgr', 'RP', 'pacific_islander'),
  ('cde_acgr', 'RT', 'two_or_more_races'),
  ('cde_acgr', 'RW', 'white'),
  ('cde_acgr', 'GF', 'female'),
  ('cde_acgr', 'GM', 'male'),
  ('cde_acgr', 'GX', 'non_binary'),
  ('cde_acgr', 'SE', 'english_learners'),
  ('cde_acgr', 'SD', 'students_with_disabilities'),
  ('cde_acgr', 'SS', 'socioeconomically_disadvantaged'),
  ('cde_acgr', 'SM', 'migrant'),
  ('cde_acgr', 'SF', 'foster'),
  ('cde_acgr', 'SH', 'homeless')
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
    'ela_distance_from_standard',
    'ELA distance from standard',
    'Average distance in scale-score points from the grade-level standard in English language arts/literacy.',
    'points',
    'higher',
    null,
    'Students included in the current-year academic indicator status',
    'cde-dashboard-2025-v1',
    'cde_academic_indicator'
  ),
  (
    'math_distance_from_standard',
    'Mathematics distance from standard',
    'Average distance in scale-score points from the grade-level standard in mathematics.',
    'points',
    'higher',
    null,
    'Students included in the current-year academic indicator status',
    'cde-dashboard-2025-v1',
    'cde_academic_indicator'
  ),
  (
    'suspension_rate',
    'Suspension rate',
    'Share of cumulative enrollment represented by unduplicated students suspended at least once.',
    'percent',
    'lower',
    'Unduplicated students suspended at least once',
    'Cumulative enrollment',
    'cde-dataquest-2024-25-v2',
    'cde_suspension'
  ),
  (
    'four_year_graduation_rate',
    'Four-year graduation rate',
    'Share of the adjusted four-year cohort receiving a regular high school diploma.',
    'percent',
    'higher',
    'Regular high school diploma graduates',
    'Adjusted four-year cohort students',
    'cde-dataquest-2024-25-v1',
    'cde_acgr'
  ),
  (
    'a_g_completion_rate',
    'A–G completion rate',
    'Share of regular high school diploma graduates meeting UC/CSU entrance requirements.',
    'percent',
    'higher',
    'Graduates meeting UC/CSU entrance requirements',
    'Regular high school diploma graduates',
    'cde-dataquest-2024-25-v1',
    'cde_acgr'
  ),
  (
    'four_year_dropout_rate',
    'Four-year dropout rate',
    'Share of the adjusted four-year cohort reported as dropouts.',
    'percent',
    'lower',
    'Adjusted cohort dropouts',
    'Adjusted four-year cohort students',
    'cde-dataquest-2024-25-v1',
    'cde_acgr'
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

alter table cse.fact_metric
  add column metadata jsonb not null default '{}'::jsonb,
  drop constraint fact_metric_source_row_unique,
  add constraint fact_metric_source_row_metric_unique unique (
    source_snapshot_id,
    source_row_number,
    metric_id,
    school_year
  );

create or replace view cse.current_source_snapshot as
select distinct on (data_source_id, dataset_id, academic_year)
  id,
  data_source_id,
  dataset_id,
  academic_year,
  release_date,
  retrieved_at,
  sha256,
  record_count
from cse.source_snapshot
where import_status = 'imported'
order by data_source_id, dataset_id, academic_year, retrieved_at desc, id desc;

create or replace view cse.current_metric_observation as
select fact.*
from cse.fact_metric as fact
join cse.current_source_snapshot as snapshot on snapshot.id = fact.source_snapshot_id;

create or replace view cse.school_indicator_current as
select
  entity.identity_key,
  entity.identity_resolution,
  entity.cds_code,
  entity.name as school_name,
  fact.school_year,
  fact.metric_id,
  metric.label as metric_label,
  metric.unit,
  metric.direction,
  fact.subgroup_id,
  subgroup.label as subgroup_label,
  fact.numerator,
  fact.denominator,
  fact.value,
  fact.suppression_status,
  fact.reliability_status,
  fact.metadata,
  fact.source_snapshot_id
from cse.current_metric_observation as fact
join cse.entity as entity on entity.id = fact.entity_id
join cse.metric as metric on metric.metric_id = fact.metric_id
join cse.subgroup as subgroup on subgroup.subgroup_id = fact.subgroup_id
where entity.entity_type = 'school';
