-- REVIEW before production deployment. No assessment/curriculum records are rewritten.
BEGIN;
CREATE TABLE IF NOT EXISTS curriculum_planning_config (
 key TEXT PRIMARY KEY,
 school_id VARCHAR(100) NOT NULL REFERENCES schools(id),
 kind TEXT NOT NULL CHECK(kind IN ('CALENDAR','SEQUENCE')),
 revision INTEGER NOT NULL CHECK(revision>0),
 data JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_planning_school ON curriculum_planning_config(school_id,kind);
-- Entry slot IDs are stored in existing scheme entries JSON. Lesson metadata uses
-- the previously reviewed lesson_details JSONB column; no historical entries deleted.
ALTER TABLE records_of_work ADD COLUMN IF NOT EXISTS planning_link JSONB;
ALTER TABLE curriculum_planning_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON curriculum_planning_config FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON curriculum_planning_config FROM anon'; END IF;
 IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON curriculum_planning_config FROM authenticated'; END IF;
END $$;
COMMIT;
-- Rollback: export this table first; revert application, then DROP TABLE curriculum_planning_config.
