-- Authorized additive production repair, 16 November 2026: F02/F03.
-- No existing rows, values, identifiers or backups are removed or updated.
-- Does not implement the F10 salary identity bridge or broader permissions changes.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
-- Preflight existing-column types, backup and restore-test on a clone first.
-- No acknowledgements, signatures or complaint history are fabricated/backfilled.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledged_by_user_id VARCHAR(100);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledgement_statement TEXT;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledgement_method VARCHAR(50);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledgement_signature TEXT;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledgement_ip VARCHAR(100);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS acknowledgement_status VARCHAR(50);
-- Leave historical status NULL: the existing adapter derives AWAITING_ACKNOWLEDGEMENT
-- for PAID records instead of falsely marking historical salaries as acknowledged.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS parent_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_to_role VARCHAR(50);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_by_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS acknowledged_by_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS acknowledged_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_to_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_to_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_to_role VARCHAR(50);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_by_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS action_taken TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_details TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS closed_by_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS closed_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS closure_notes TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopened_by_user_id VARCHAR(100);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopened_by_name TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopening_reason TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS acknowledgement_deadline TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_deadline TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS review_complaints_school_status ON complaints(school_id,status);
CREATE INDEX IF NOT EXISTS review_complaints_parent ON complaints(parent_user_id);
CREATE INDEX IF NOT EXISTS review_complaints_deadline ON complaints(resolution_deadline) WHERE status NOT IN ('RESOLVED','CLOSED');
-- Retain additive fields on application rollback. Do not drop signed evidence.
-- Per-school reference-number uniqueness is a separate preflight after inspecting live duplicates.

-- Adds request/audit persistence, NOT reversal execution or automatic financial postings.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
CREATE TABLE IF NOT EXISTS public.transaction_reversal_requests (
 id VARCHAR(100) PRIMARY KEY,
 school_id VARCHAR(100) NOT NULL,
 request_reference VARCHAR(100) NOT NULL UNIQUE,
 transaction_type VARCHAR(50) NOT NULL,
 transaction_id VARCHAR(100) NOT NULL,
 transaction_reference TEXT NOT NULL,
 original_receipt_number TEXT,
 student_id VARCHAR(100) NOT NULL,
 student_name TEXT NOT NULL,
 admission_number TEXT NOT NULL,
 original_amount NUMERIC NOT NULL CHECK(original_amount>0),
 requested_reversal_amount NUMERIC NOT NULL CHECK(requested_reversal_amount>0 AND requested_reversal_amount<=original_amount),
 transaction_date VARCHAR(50) NOT NULL,
 reason TEXT NOT NULL,
 explanation TEXT,
 supporting_attachment_url TEXT,
 status VARCHAR(50) NOT NULL CHECK(status IN ('PENDING_ADMIN_APPROVAL','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED')),
 requested_by_user_id VARCHAR(100) NOT NULL,
 requested_by_name TEXT NOT NULL,
 requested_by_role VARCHAR(50) NOT NULL,
 requested_at TIMESTAMPTZ NOT NULL,
 reviewed_by_user_id VARCHAR(100),
 reviewed_by_name TEXT,
 reviewed_at TIMESTAMPTZ,
 approval_comment TEXT,
 rejection_reason TEXT,
 reversal_receipt_number TEXT,
 reversal_receipt_payload JSONB,
 financial_impact_preview JSONB,
 error_message TEXT,
 audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(audit_trail)='array'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_reversals_school_status ON transaction_reversal_requests(school_id,status,requested_at);
CREATE INDEX IF NOT EXISTS review_reversals_transaction ON transaction_reversal_requests(school_id,transaction_type,transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS review_one_live_reversal ON transaction_reversal_requests(school_id,transaction_type,transaction_id)
 WHERE status IN ('PENDING_ADMIN_APPROVAL','APPROVED','PROCESSING');
ALTER TABLE transaction_reversal_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON transaction_reversal_requests FROM PUBLIC;
DO $review$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON transaction_reversal_requests FROM %I',r);
 END LOOP;
END $review$;
-- Current reference lookup is global, hence global UNIQUE(request_reference).
-- Pending lookup must include APPROVED and school/type; code still needs conflict-to-409 handling.
-- Add canonical school/student/user FKs only after cross-school and historical-reference preflight.
-- Keep the table/audit trail on application rollback; never delete completed reversal evidence.
COMMIT;
