import {Pool} from 'pg';

/** Also supplied as migration 20261127_document_serial_registry.sql for managed deployments. */
export async function ensureDocumentRegistrySchema(pool:Pool):Promise<void>{
  await pool.query(`
-- Independent of source documents: deleting an original cannot erase its issuance history.
CREATE TABLE IF NOT EXISTS document_serial_registry (
  serial TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, document_type, document_id, content_hash)
);
CREATE INDEX IF NOT EXISTS document_serial_registry_school_date ON document_serial_registry(school_id, issued_at DESC);
CREATE OR REPLACE FUNCTION protect_document_serial_registry() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Document serial records are permanent and cannot be updated, deleted or truncated';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS document_serial_registry_immutable ON document_serial_registry;
CREATE TRIGGER document_serial_registry_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_serial_registry
FOR EACH STATEMENT EXECUTE FUNCTION protect_document_serial_registry();

ALTER TABLE document_serial_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON document_serial_registry FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON document_serial_registry FROM anon'; END IF;
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON document_serial_registry FROM authenticated'; END IF;
END $$;

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

  `);
}
