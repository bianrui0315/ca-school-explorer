insert into cse.subgroup_source_code (source_key, source_code, subgroup_id)
values
  ('cde_chronic_absenteeism', 'GRKN', 'grades_tk_k'),
  ('cde_chronic_absenteeism', 'GRK8', 'grades_tk_8')
on conflict (source_key, source_code) do update
set subgroup_id = excluded.subgroup_id;
