-- Review and execute only if the corresponding repair was applied.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM schools s JOIN investigation_address_20261112_backup b ON b.school_id=s.id
             WHERE s.id='school-001' AND s.address <> 'P.O Box 12-20123') THEN
    RAISE EXCEPTION 'School address changed after repair; refusing to overwrite';
  END IF;
END $$;
UPDATE schools s SET address=b.address,updated_at=now()
FROM investigation_address_20261112_backup b WHERE s.id=b.school_id AND s.id='school-001';
-- Retain backup for audit. Do not drop it automatically.
COMMIT;
