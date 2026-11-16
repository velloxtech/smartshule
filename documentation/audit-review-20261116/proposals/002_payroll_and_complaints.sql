-- F02 REVIEW PROPOSAL ONLY. Additive; not auto-discovered as a migration.
-- Preflight existing-column types, backup and restore-test on a clone first.
-- No acknowledgements, signatures or complaint history are fabricated/backfilled.
BEGIN;
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
COMMIT;
-- Retain additive fields on application rollback. Do not drop signed evidence.
-- Per-school reference-number uniqueness is a separate preflight after inspecting live duplicates.
