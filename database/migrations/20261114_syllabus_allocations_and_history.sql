-- REVIEW ONLY for production. Additive; existing schemes, lessons and taught work are retained.
BEGIN;
ALTER TABLE schemes_of_work ADD COLUMN IF NOT EXISTS planning_state JSONB;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='schemes_planning_state_object' AND conrelid='schemes_of_work'::regclass) THEN
  ALTER TABLE schemes_of_work ADD CONSTRAINT schemes_planning_state_object CHECK (planning_state IS NULL OR jsonb_typeof(planning_state)='object') NOT VALID;
 END IF;
END $$;
COMMIT;
-- Preferred rollback: roll back the application and retain this column and its history.
-- After a verified backup and explicit review only: ALTER TABLE schemes_of_work DROP COLUMN planning_state;
