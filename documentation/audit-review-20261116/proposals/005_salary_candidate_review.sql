-- F10 SELECT-ONLY review aid. Contains no production values; never a backfill.
-- Review every non-singleton, cross-school, deleted-account or historic-ID exception manually.
SELECT p.id AS payroll_record_id,p.school_id,p.teacher_id AS original_teacher_reference,
 count(DISTINCT t.id) AS candidate_count,
 array_agg(DISTINCT t.id) FILTER(WHERE t.id IS NOT NULL) AS candidate_teacher_profiles
FROM payroll_records p
LEFT JOIN teachers t ON (
 p.teacher_id=t.id OR p.teacher_id=t.user_id OR p.teacher_id=t.employee_number
 OR upper(p.teacher_id)=upper(t.tsc_number)
 OR upper(p.teacher_id)=upper('TSC-'||t.tsc_number)
) AND EXISTS(SELECT 1 FROM users u WHERE u.id=t.user_id AND u.school_id=p.school_id)
GROUP BY p.id,p.school_id,p.teacher_id
ORDER BY p.id;
-- candidate_count=1 is necessary, not sufficient, for an HR-approved mapping.
-- The original audit's nine unique matches are an observation at its snapshot,
-- not authorisation to populate nine links blindly today.
