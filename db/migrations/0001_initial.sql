create schema if not exists cse;

create table if not exists cse.data_source (
  id bigint generated always as identity primary key,
  source_key text not null unique,
  name text not null,
  publisher text not null,
  landing_page_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_source_source_key_format check (source_key ~ '^[a-z0-9_]+$'),
  constraint data_source_landing_page_https check (landing_page_url ~ '^https://')
);

create table if not exists cse.source_snapshot (
  id bigint generated always as identity primary key,
  data_source_id bigint not null references cse.data_source (id),
  dataset_id text not null,
  academic_year text,
  release_date date,
  retrieved_at timestamptz not null,
  download_url text not null,
  original_filename text not null,
  media_type text not null,
  encoding text not null,
  byte_size bigint not null,
  record_count bigint not null,
  sha256 text not null,
  schema_version text not null,
  adapter_version text not null,
  terms_status text not null,
  import_status text not null default 'validated',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint source_snapshot_dataset_id_format check (dataset_id ~ '^[a-z0-9_]+$'),
  constraint source_snapshot_academic_year_format check (
    academic_year is null or academic_year ~ '^[0-9]{4}-[0-9]{2}$'
  ),
  constraint source_snapshot_download_url_https check (download_url ~ '^https://'),
  constraint source_snapshot_byte_size_positive check (byte_size > 0),
  constraint source_snapshot_record_count_nonnegative check (record_count >= 0),
  constraint source_snapshot_sha256_format check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint source_snapshot_terms_status check (
    terms_status in ('approved', 'review-required', 'restricted')
  ),
  constraint source_snapshot_import_status check (
    import_status in ('validated', 'importing', 'imported', 'failed')
  ),
  constraint source_snapshot_source_digest_unique unique (data_source_id, sha256)
);

create table if not exists cse.import_run (
  id bigint generated always as identity primary key,
  source_snapshot_id bigint not null references cse.source_snapshot (id),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rows_read bigint not null default 0,
  rows_loaded bigint not null default 0,
  rows_suppressed bigint not null default 0,
  error_summary text,
  constraint import_run_status check (status in ('running', 'succeeded', 'failed')),
  constraint import_run_row_counts_nonnegative check (
    rows_read >= 0 and rows_loaded >= 0 and rows_suppressed >= 0
  )
);

create table if not exists cse.entity (
  id bigint generated always as identity primary key,
  cds_code text not null unique,
  entity_type text not null,
  name text not null,
  county_code text,
  district_code text,
  school_code text,
  parent_entity_id bigint references cse.entity (id),
  status text not null default 'unknown',
  first_seen_snapshot_id bigint not null references cse.source_snapshot (id),
  last_seen_snapshot_id bigint not null references cse.source_snapshot (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_cds_code_format check (cds_code ~ '^[0-9]{14}$'),
  constraint entity_type_check check (entity_type in ('state', 'county', 'district', 'school')),
  constraint entity_status_check check (status in ('active', 'pending', 'closed', 'merged', 'unknown')),
  constraint entity_county_code_format check (county_code is null or county_code ~ '^[0-9]{2}$'),
  constraint entity_district_code_format check (
    district_code is null or district_code ~ '^[0-9]{5}$'
  ),
  constraint entity_school_code_format check (school_code is null or school_code ~ '^[0-9]{7}$')
);

create table if not exists cse.metric (
  metric_id text primary key,
  label text not null,
  description text not null,
  unit text not null,
  direction text not null,
  numerator_description text,
  denominator_description text,
  methodology_version text not null,
  source_key text not null references cse.data_source (source_key),
  constraint metric_id_format check (metric_id ~ '^[a-z0-9_]+$'),
  constraint metric_unit_check check (unit in ('count', 'percent', 'points', 'ratio')),
  constraint metric_direction_check check (direction in ('higher', 'lower', 'neutral'))
);

create table if not exists cse.subgroup (
  subgroup_id text primary key,
  source_key text not null references cse.data_source (source_key),
  source_code text not null,
  label text not null,
  category_type text not null,
  constraint subgroup_id_format check (subgroup_id ~ '^[a-z0-9_]+$'),
  constraint subgroup_category_type_check check (
    category_type in ('total', 'race_ethnicity', 'gender', 'program', 'grade_span')
  ),
  constraint subgroup_source_code_unique unique (source_key, source_code)
);

create table if not exists cse.fact_metric (
  id bigint generated always as identity primary key,
  entity_id bigint not null references cse.entity (id),
  school_year text not null,
  school_year_start smallint not null,
  metric_id text not null references cse.metric (metric_id),
  subgroup_id text not null references cse.subgroup (subgroup_id),
  numerator bigint,
  denominator bigint,
  value numeric(14, 4),
  suppression_status text not null,
  reliability_status text not null,
  charter_scope text not null,
  dass_scope text not null,
  source_snapshot_id bigint not null references cse.source_snapshot (id),
  source_row_number bigint not null,
  source_reporting_category text not null,
  created_at timestamptz not null default now(),
  constraint fact_metric_school_year_format check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint fact_metric_school_year_start_range check (school_year_start between 1900 and 2200),
  constraint fact_metric_numerator_nonnegative check (numerator is null or numerator >= 0),
  constraint fact_metric_denominator_nonnegative check (denominator is null or denominator >= 0),
  constraint fact_metric_numerator_lte_denominator check (
    numerator is null or denominator is null or numerator <= denominator
  ),
  constraint fact_metric_suppression_status check (
    suppression_status in ('reported', 'suppressed', 'not-available')
  ),
  constraint fact_metric_reliability_status check (
    reliability_status in ('reliable', 'small-sample', 'suppressed', 'not-available', 'method-break')
  ),
  constraint fact_metric_charter_scope check (charter_scope in ('all', 'yes', 'no')),
  constraint fact_metric_dass_scope check (dass_scope in ('all', 'yes', 'no')),
  constraint fact_metric_source_row_positive check (source_row_number > 1),
  constraint fact_metric_source_row_unique unique (source_snapshot_id, source_row_number),
  constraint fact_metric_grain_unique unique (
    source_snapshot_id,
    entity_id,
    school_year,
    metric_id,
    subgroup_id,
    charter_scope,
    dass_scope
  )
);

create index if not exists source_snapshot_source_year_retrieved_idx
  on cse.source_snapshot (data_source_id, academic_year, retrieved_at desc, id desc);
create index if not exists import_run_snapshot_idx on cse.import_run (source_snapshot_id);
create index if not exists entity_parent_idx on cse.entity (parent_entity_id);
create index if not exists entity_first_snapshot_idx on cse.entity (first_seen_snapshot_id);
create index if not exists entity_last_snapshot_idx on cse.entity (last_seen_snapshot_id);
create index if not exists fact_metric_entity_metric_subgroup_year_idx
  on cse.fact_metric (entity_id, metric_id, subgroup_id, school_year_start desc)
  include (value, numerator, denominator, suppression_status, reliability_status);
create index if not exists fact_metric_metric_year_subgroup_entity_idx
  on cse.fact_metric (metric_id, school_year_start desc, subgroup_id, entity_id);
create index if not exists fact_metric_subgroup_idx on cse.fact_metric (subgroup_id);
create index if not exists fact_metric_snapshot_idx on cse.fact_metric (source_snapshot_id);

create or replace view cse.current_source_snapshot as
select distinct on (data_source_id, academic_year)
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
order by data_source_id, academic_year, retrieved_at desc, id desc;

create or replace view cse.current_metric_observation as
select fact.*
from cse.fact_metric as fact
join cse.current_source_snapshot as snapshot on snapshot.id = fact.source_snapshot_id;

create or replace view cse.school_chronic_absenteeism_current as
select
  entity.cds_code,
  entity.name as school_name,
  fact.school_year,
  fact.subgroup_id,
  subgroup.label as subgroup_label,
  fact.numerator as chronic_absenteeism_count,
  fact.denominator as eligible_cumulative_enrollment,
  fact.value as chronic_absenteeism_rate,
  fact.suppression_status,
  fact.reliability_status,
  fact.source_snapshot_id
from cse.current_metric_observation as fact
join cse.entity as entity on entity.id = fact.entity_id
join cse.subgroup as subgroup on subgroup.subgroup_id = fact.subgroup_id
where entity.entity_type = 'school'
  and fact.metric_id = 'chronic_absenteeism_rate'
  and fact.charter_scope in ('yes', 'no')
  and fact.dass_scope in ('yes', 'no');
