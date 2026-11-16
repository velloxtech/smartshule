-- F10 REVIEW PROPOSAL ONLY. Does not modify existing payroll keys, figures or payment status.
-- A reviewed one-record -> one-teacher bridge makes a non-destructive read fix possible.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE IF NOT EXISTS public.payroll_teacher_link_reviews (
 payroll_record_id VARCHAR(100) PRIMARY KEY REFERENCES payroll_records(id) ON DELETE RESTRICT,
 school_id VARCHAR(100) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 teacher_profile_id VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
 original_teacher_reference TEXT NOT NULL,
 reviewed_by_user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 review_reason TEXT NOT NULL CHECK(length(trim(review_reason))>=3)
);
CREATE INDEX IF NOT EXISTS review_salary_teacher_school ON payroll_teacher_link_reviews(teacher_profile_id,school_id);
ALTER TABLE payroll_teacher_link_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payroll_teacher_link_reviews FROM PUBLIC;
DO $review$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON payroll_teacher_link_reviews FROM %I',r);
 END LOOP;
END $review$;
COMMIT;
-- Do not automatically INSERT candidate matches. Registrar/HR must approve each row.
-- Proposed backend lookup, with authenticated actor values bound as $1/$2:
-- SELECT p.* FROM payroll_records p
-- JOIN teachers t ON t.user_id=$1
-- JOIN users u ON u.id=t.user_id AND u.school_id=$2
-- LEFT JOIN payroll_teacher_link_reviews m ON m.payroll_record_id=p.id
-- WHERE p.school_id=$2 AND (
--   p.teacher_id=t.id OR (m.teacher_profile_id=t.id AND m.school_id=p.school_id
--                        AND m.original_teacher_reference=p.teacher_id));
-- Use the SAME resolver for acknowledge/dispute and signing ownership, not reads alone.
-- New generation should persist teachers.id and use it for same-month checks.
-- Display TSC/employee identifiers separately; never OR-match arbitrary request-supplied references.
-- Rollback: roll back the read bridge and retain mappings. No regeneration or salary reposting.
