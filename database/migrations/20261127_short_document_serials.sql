-- Short public serials are permanent aliases; existing issuance records and printed serials stay valid.
CREATE TABLE IF NOT EXISTS document_serial_aliases (
  serial TEXT PRIMARY KEY CHECK (serial ~ '^[0-9][A-Z][0-9]{2}[A-Z][0-9][A-Z][0-9]{2}$'),
  document_serial TEXT NOT NULL UNIQUE REFERENCES document_serial_registry(serial),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS document_serial_aliases_immutable ON document_serial_aliases;
CREATE TRIGGER document_serial_aliases_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_serial_aliases
FOR EACH STATEMENT EXECUTE FUNCTION protect_document_serial_registry();
ALTER TABLE document_serial_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON document_serial_aliases FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON document_serial_aliases FROM anon'; END IF;
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON document_serial_aliases FROM authenticated'; END IF;
END $$;
