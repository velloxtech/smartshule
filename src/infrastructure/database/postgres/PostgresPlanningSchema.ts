import { Pool } from 'pg';

/** Additive schema support, equivalent to the calendar and allocation migrations. */
export async function ensurePlanningSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS curriculum_planning_config (
      key TEXT PRIMARY KEY,
      school_id VARCHAR(100) NOT NULL REFERENCES schools(id),
      kind TEXT NOT NULL CHECK (kind IN ('CALENDAR','SEQUENCE')),
      revision INTEGER NOT NULL CHECK (revision > 0),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_curriculum_planning_school ON curriculum_planning_config(school_id,kind);
    ALTER TABLE curriculum_planning_config ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON curriculum_planning_config FROM PUBLIC;
    DO $$ BEGIN
      IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON curriculum_planning_config FROM anon'; END IF;
      IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON curriculum_planning_config FROM authenticated'; END IF;
    END $$;
    ALTER TABLE records_of_work ADD COLUMN IF NOT EXISTS planning_link JSONB;
    ALTER TABLE schemes_of_work ADD COLUMN IF NOT EXISTS planning_state JSONB;
    ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS lesson_details JSONB NOT NULL DEFAULT '{}';
    DO $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='schemes_planning_state_object' AND conrelid='schemes_of_work'::regclass) THEN
        ALTER TABLE schemes_of_work ADD CONSTRAINT schemes_planning_state_object CHECK (planning_state IS NULL OR jsonb_typeof(planning_state)='object') NOT VALID;
      END IF;
    END $$;
  `);
}
