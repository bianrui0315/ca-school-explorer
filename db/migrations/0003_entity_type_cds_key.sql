alter table cse.entity
  drop constraint entity_cds_code_key;

alter table cse.entity
  add constraint entity_type_cds_code_unique unique (entity_type, cds_code);
