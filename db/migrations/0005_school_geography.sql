insert into cse.data_source (source_key, name, publisher, landing_page_url)
values (
  'cde_public_school_geography',
  'California Public Schools 2025-26 Geographic Data',
  'California Department of Education',
  'https://lab.data.ca.gov/dataset/california-public-schools-2025-26'
)
on conflict (source_key) do update
set
  name = excluded.name,
  publisher = excluded.publisher,
  landing_page_url = excluded.landing_page_url,
  updated_at = now();

create table cse.entity_profile (
  id bigint generated always as identity primary key,
  entity_id bigint not null references cse.entity (id),
  source_snapshot_id bigint not null references cse.source_snapshot (id),
  school_year text not null,
  sector text not null,
  profile_status text not null,
  school_type text not null,
  school_level text not null,
  grade_low text,
  grade_high text,
  open_date date,
  closed_date date,
  charter boolean not null,
  virtual_type text not null,
  magnet boolean not null,
  title_i boolean not null,
  dass boolean not null,
  street text not null,
  city text not null,
  state_code text not null,
  zip_code text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(11, 7) not null,
  locale text,
  website_url text,
  enrollment_total integer,
  staff_total numeric(12, 2),
  teacher_staff numeric(12, 2),
  administrator_staff numeric(12, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint entity_profile_school_year_format check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint entity_profile_sector_check check (sector in ('public', 'private')),
  constraint entity_profile_state_code_format check (state_code ~ '^[A-Z]{2}$'),
  constraint entity_profile_latitude_range check (latitude between -90 and 90),
  constraint entity_profile_longitude_range check (longitude between -180 and 180),
  constraint entity_profile_enrollment_nonnegative check (
    enrollment_total is null or enrollment_total >= 0
  ),
  constraint entity_profile_staff_nonnegative check (
    (staff_total is null or staff_total >= 0)
    and (teacher_staff is null or teacher_staff >= 0)
    and (administrator_staff is null or administrator_staff >= 0)
  ),
  constraint entity_profile_snapshot_entity_unique unique (source_snapshot_id, entity_id)
);

create index entity_profile_entity_year_idx
  on cse.entity_profile (entity_id, school_year desc);
create index entity_profile_snapshot_idx
  on cse.entity_profile (source_snapshot_id);
create index entity_profile_location_idx
  on cse.entity_profile (latitude, longitude);
create index entity_profile_classification_idx
  on cse.entity_profile (sector, profile_status, school_level, charter);

create or replace view cse.current_entity_profile as
select profile.*
from cse.entity_profile as profile
join cse.current_source_snapshot as snapshot
  on snapshot.id = profile.source_snapshot_id;
