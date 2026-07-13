do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cse_readonly') then
    create role cse_readonly nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'cse_ingest') then
    create role cse_ingest nologin;
  end if;
end
$$;

revoke all on schema cse from public;
grant usage on schema cse to cse_readonly, cse_ingest;

grant select on all tables in schema cse to cse_readonly;
grant select, insert, update on all tables in schema cse to cse_ingest;
grant usage, select on all sequences in schema cse to cse_ingest;

alter default privileges in schema cse grant select on tables to cse_readonly;
alter default privileges in schema cse grant select, insert, update on tables to cse_ingest;
alter default privileges in schema cse grant usage, select on sequences to cse_ingest;
