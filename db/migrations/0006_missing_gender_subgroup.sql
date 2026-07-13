insert into cse.subgroup (subgroup_id, label, category_type)
values ('gender_missing', 'Missing gender', 'gender')
on conflict (subgroup_id) do update
set
  label = excluded.label,
  category_type = excluded.category_type;

insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
values
  ('cde_chronic_absenteeism', 'GZ', 'gender_missing'),
  ('cde_suspension', 'GZ', 'gender_missing'),
  ('cde_acgr', 'GZ', 'gender_missing')
on conflict (source_key, source_code) do update
set subgroup_id = excluded.subgroup_id;
