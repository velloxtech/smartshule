-- F03 REVIEW PROPOSAL ONLY. Supports the existing 33-field PostgreSQL repository contract.
-- Adds request/audit persistence, NOT reversal execution or automatic financial postings.
BEGIN;
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
COMMIT;
-- Current reference lookup is global, hence global UNIQUE(request_reference).
-- Pending lookup must include APPROVED and school/type; code still needs conflict-to-409 handling.
-- Add canonical school/student/user FKs only after cross-school and historical-reference preflight.
-- Keep the table/audit trail on application rollback; never delete completed reversal evidence.
