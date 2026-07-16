insert into cse.data_source (source_key, name, publisher, landing_page_url)
values
  (
    'cde_sarc',
    'CDE School Accountability Report Card Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ta/ac/sa/accessdata2425.asp'
  ),
  (
    'cde_staff_experience',
    'CDE Staff Experience Data',
    'California Department of Education',
    'https://www.cde.ca.gov/ds/ad/filesstex.asp'
  )
on conflict (source_key) do update
set
  name = excluded.name,
  publisher = excluded.publisher,
  landing_page_url = excluded.landing_page_url,
  updated_at = now();

create table cse.resource_metric (
  metric_id text primary key,
  label text not null,
  description text not null,
  unit text not null check (
    unit in ('count', 'fte', 'percent', 'years', 'students_per_class', 'pupils_per_fte')
  ),
  source_key text not null references cse.data_source(source_key),
  methodology_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into cse.resource_metric (
  metric_id,
  label,
  description,
  unit,
  source_key,
  methodology_version
)
values
  (
    'teacher_experience_average',
    'Average teacher experience',
    'Average years of total or district teaching experience among teachers reported by the school.',
    'years',
    'cde_staff_experience',
    'cde-staff-experience-2025-26-v1'
  ),
  (
    'teacher_experience_count',
    'Teacher experience counts',
    'Teacher headcounts by experience category; experienced means more than two years and inexperienced means two years or less.',
    'count',
    'cde_staff_experience',
    'cde-staff-experience-2025-26-v1'
  ),
  (
    'teacher_assignment_percent',
    'Teacher preparation and placement',
    'Share of teaching-position full-time equivalents in each preparation or assignment category.',
    'percent',
    'cde_sarc',
    'cde-sarc-teacher-preparation-2024-25-v1'
  ),
  (
    'average_class_size',
    'Average class size',
    'Average students per reported class by elementary grade or secondary subject.',
    'students_per_class',
    'cde_sarc',
    'cde-sarc-class-size-2024-25-v1'
  ),
  (
    'support_staff_fte',
    'Student support staff',
    'Reported full-time-equivalent positions for student support roles.',
    'fte',
    'cde_sarc',
    'cde-sarc-student-support-2024-25-v1'
  ),
  (
    'pupils_per_academic_counselor',
    'Pupils per academic counselor',
    'Enrollment divided by reported academic counselor full-time-equivalent positions.',
    'pupils_per_fte',
    'cde_sarc',
    'cde-sarc-counselor-ratio-2024-25-v1'
  )
on conflict (metric_id) do update
set
  label = excluded.label,
  description = excluded.description,
  unit = excluded.unit,
  source_key = excluded.source_key,
  methodology_version = excluded.methodology_version,
  updated_at = now();

create table cse.school_resource_fact (
  id bigint generated always as identity primary key,
  entity_id bigint not null references cse.entity(id) on delete cascade,
  school_year text not null check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  school_year_start smallint not null check (school_year_start between 1990 and 2100),
  metric_id text not null references cse.resource_metric(metric_id),
  dimension text not null,
  value numeric(14, 4) not null,
  numerator numeric(14, 4),
  denominator numeric(14, 4),
  source_snapshot_id bigint not null references cse.source_snapshot(id) on delete cascade,
  source_row_number bigint not null check (source_row_number > 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (entity_id, school_year, metric_id, dimension, source_snapshot_id)
);

create index school_resource_fact_entity_year_idx
  on cse.school_resource_fact (entity_id, school_year_start, metric_id);

create index school_resource_fact_snapshot_idx
  on cse.school_resource_fact (source_snapshot_id);

create or replace view cse.current_school_resource_observation as
select
  ranked.id,
  ranked.entity_id,
  ranked.school_year,
  ranked.school_year_start,
  ranked.metric_id,
  ranked.dimension,
  ranked.value,
  ranked.numerator,
  ranked.denominator,
  ranked.source_snapshot_id,
  ranked.source_row_number,
  ranked.metadata,
  ranked.created_at
from (
  select
    fact.*,
    row_number() over (
      partition by fact.entity_id, fact.school_year, fact.metric_id, fact.dimension
      order by snapshot.release_date desc, snapshot.retrieved_at desc, snapshot.id desc
    ) as source_rank
  from cse.school_resource_fact fact
  join cse.source_snapshot snapshot on snapshot.id = fact.source_snapshot_id
  where snapshot.import_status = 'imported'
) ranked
where ranked.source_rank = 1;
