-- pgTAP Setup
-- Execute once: create extension if not exists pgtap;
-- Run: pg_prove -d "postgresql://..." supabase/tests/*.pg.sql
-- Or:  psql -d "postgresql://..." -f supabase/tests/00_setup.pg.sql

begin;
select plan(1);
select ok(true, 'pgTAP extension is available');
rollback;
