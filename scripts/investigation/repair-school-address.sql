-- REVIEW ONLY. Default execution is a read-only dry run.
-- psql "$REVIEWED_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/investigation/repair-school-address.sql
-- Apply only after review: add -v apply=true. No assessment marks are changed.
\if :{?apply}
\else
  \set apply false
\endif
\if :apply
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS investigation_address_20261112_backup (
  school_id varchar(100) PRIMARY KEY, address text NOT NULL, updated_at timestamp, applied_at timestamptz DEFAULT now()
);
DO $$
DECLARE original text;
BEGIN
  SELECT address INTO STRICT original FROM schools WHERE id='school-001' FOR UPDATE;
  IF original NOT IN ('KEMRI Street, Kisian, Kisumu, Kenya', 'P.O Box 12-20123') THEN
    RAISE EXCEPTION 'Address changed since investigation; inspect before applying';
  END IF;
  IF original <> 'P.O Box 12-20123' THEN
    INSERT INTO investigation_address_20261112_backup(school_id,address,updated_at)
      SELECT id,address,updated_at FROM schools WHERE id='school-001'
      ON CONFLICT (school_id) DO NOTHING;
    UPDATE schools SET address='P.O Box 12-20123',updated_at=now() WHERE id='school-001';
  END IF;
END $$;
SELECT id,address FROM schools WHERE id='school-001';
COMMIT;
\else
BEGIN READ ONLY;
SELECT id,address AS before_address,'P.O Box 12-20123' AS proposed_address,
       address <> 'P.O Box 12-20123' AS needs_change
FROM schools WHERE id='school-001';
ROLLBACK;
\endif
