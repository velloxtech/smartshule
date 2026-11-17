-- Targeted production repair, 16 November 2026. Run inside ONE explicit transaction.
-- Keep the existing normalized IDs/settings; move references, then remove only aliases.
-- The guarded runner takes a private backup, locks public tables and verifies all rows.
-- Never run historical seeds to perform this repair.

CREATE SCHEMA IF NOT EXISTS smartshule_maintenance;
REVOKE ALL ON SCHEMA smartshule_maintenance FROM PUBLIC;
CREATE TABLE IF NOT EXISTS smartshule_maintenance.term_consolidation_history (
  removed_id text PRIMARY KEY,
  canonical_id text NOT NULL,
  removed_term jsonb NOT NULL,
  canonical_term jsonb NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  merged_by text NOT NULL DEFAULT current_user
);
ALTER TABLE smartshule_maintenance.term_consolidation_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA smartshule_maintenance FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA smartshule_maintenance FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA smartshule_maintenance FROM %I',r);
    END IF;
  END LOOP;
END $$;

DO $$ DECLARE n int; old_id text; new_id text; old_term public.academic_terms%ROWTYPE;
  kept public.academic_terms%ROWTYPE; col record;
BEGIN
  FOR n IN 1..3 LOOP
    old_id:='term-2026-t'||n; new_id:='term-2026-'||n;
    SELECT * INTO kept FROM public.academic_terms WHERE id=new_id;
    IF NOT FOUND OR kept.academic_year_id<>'year-2026' OR kept.term_number<>n THEN
      RAISE EXCEPTION 'Missing or unexpected canonical term %',new_id;
    END IF;
    SELECT * INTO old_term FROM public.academic_terms WHERE id=old_id;
    IF FOUND THEN
      IF old_term.academic_year_id<>kept.academic_year_id OR old_term.term_number<>kept.term_number
        OR old_term.is_current IS DISTINCT FROM kept.is_current THEN
        RAISE EXCEPTION 'Term scope/current flag conflict for %; explicit review required',old_id;
      END IF;
      INSERT INTO smartshule_maintenance.term_consolidation_history(removed_id,canonical_id,removed_term,canonical_term)
        VALUES(old_id,new_id,to_jsonb(old_term),to_jsonb(kept));
    ELSIF NOT EXISTS(SELECT 1 FROM smartshule_maintenance.term_consolidation_history
      WHERE removed_id=old_id AND canonical_id=new_id) THEN
      RAISE EXCEPTION 'Legacy term % disappeared without reviewed consolidation history',old_id;
    END IF;
    FOR col IN SELECT c.table_name,c.column_name
      FROM information_schema.columns c JOIN information_schema.tables t
        USING(table_catalog,table_schema,table_name)
      WHERE c.table_schema='public' AND t.table_type='BASE TABLE'
        AND c.column_name IN ('term_id','academic_term_id')
        AND c.data_type IN ('text','character varying')
        AND c.table_name NOT ILIKE '%backup%' AND c.table_name NOT IN ('system_logs','deleted_students')
    LOOP
      EXECUTE format('UPDATE public.%I SET %I=$1 WHERE %I=$2',col.table_name,col.column_name,col.column_name)
        USING new_id,old_id;
    END LOOP;
    DELETE FROM public.academic_terms WHERE id=old_id;
  END LOOP;
END $$;

-- Unknown live JSON/key/text references abort rather than being blindly rewritten.
-- Immutable audit/deletion/backup snapshots intentionally retain original identifiers.
DO $$ DECLARE tab record; hits bigint; BEGIN
  FOR tab IN SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
      AND table_name NOT ILIKE '%backup%' AND table_name NOT IN ('system_logs','deleted_students')
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I t WHERE to_jsonb(t)::text ~ $1',tab.table_name)
      INTO hits USING 'term-2026-t[123]';
    IF hits>0 THEN RAISE EXCEPTION 'Unresolved legacy term references in %, rows %',tab.table_name,hits; END IF;
  END LOOP;
END $$;

-- Existing application conflict handling already recognizes this index name.
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_terms_year_number
  ON public.academic_terms(academic_year_id,term_number);
