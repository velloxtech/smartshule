-- F01/F13 REVIEW PROPOSAL ONLY. Not in database/migrations; never auto-run.
-- Backend-only design. External/direct clients and managed object owners must be reviewed.
-- Capture pg_class.relacl, pg_proc.proacl, pg_namespace.nspacl and pg_default_acl first.
-- This does not move/drop backups, enable RLS en masse, alter owners or remove backend grants.
-- Requires authority to change defaults for postgres AND supabase_admin; any failure rolls back.
-- Global default revocations below also affect FUTURE objects in other schemas for these owners.
-- That wider future scope is deliberate (schema-local revokes cannot undo global defaults),
-- and requires a Supabase-owner review before production use.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
DO $owners$
DECLARE unexpected_owner text;
BEGIN
 SELECT pg_get_userbyid(c.relowner) INTO unexpected_owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
   AND pg_get_userbyid(c.relowner) NOT IN ('postgres','supabase_admin') LIMIT 1;
 IF unexpected_owner IS NOT NULL THEN RAISE EXCEPTION 'Unreviewed creator/owner %; expand the approved owner inventory first',unexpected_owner; END IF;
END $owners$;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
DO $review$
DECLARE browser_role text; creator text; object_kind text;
BEGIN
 FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',browser_role);
  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',browser_role);
  EXECUTE format('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I',browser_role);
 END LOOP;
 FOR creator IN SELECT rolname FROM pg_roles WHERE rolname IN ('postgres','supabase_admin') LOOP
  FOREACH object_kind IN ARRAY ARRAY['TABLES','SEQUENCES','FUNCTIONS'] LOOP
   EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL PRIVILEGES ON %s FROM PUBLIC',creator,object_kind);
   EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON %s FROM PUBLIC',creator,object_kind);
   FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL PRIVILEGES ON %s FROM %I',creator,object_kind,browser_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON %s FROM %I',creator,object_kind,browser_role);
   END LOOP;
  END LOOP;
 END LOOP;
END $review$;
-- Fail closed if role membership/other grants still let a browser role SELECT or mutate.
DO $verify$
DECLARE browser_role text; object_name text;
BEGIN
 FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  SELECT c.relname INTO object_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege(browser_role,c.oid,'SELECT') OR has_table_privilege(browser_role,c.oid,'INSERT')
      OR has_table_privilege(browser_role,c.oid,'UPDATE') OR has_table_privilege(browser_role,c.oid,'DELETE')
      OR has_table_privilege(browser_role,c.oid,'TRUNCATE')) LIMIT 1;
  IF object_name IS NOT NULL THEN RAISE EXCEPTION 'Browser role % retains access to %; review inherited privileges',browser_role,object_name; END IF;
 END LOOP;
END $verify$;
COMMIT;
-- Rollback: restore precisely the captured ACL/default-ACL state, not blanket GRANT ALL.
-- Changing default privileges never retroactively fixes existing objects, hence both phases.
