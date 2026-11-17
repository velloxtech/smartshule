-- Application schema support. Apply locally for testing; review before production deployment.
-- Rollback: export lesson_details first, revert application, then DROP COLUMN lesson_details.
BEGIN;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS lesson_details JSONB NOT NULL DEFAULT '{}';
COMMIT;
