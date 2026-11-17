-- READ ONLY: run with a read-only account. Scope is Grace Seeds School only.
BEGIN TRANSACTION READ ONLY;
SELECT current_database(), current_user;
SELECT id,name FROM schools WHERE id='school-001';
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND ((table_name='records_of_work' AND column_name='planning_link') OR (table_name='lesson_plans' AND column_name='lesson_details') OR table_name='curriculum_planning_config')
ORDER BY table_name,column_name;
SELECT 'schemes_missing_verified_owner' AS finding,count(*) FROM schemes_of_work s
JOIN classrooms c ON c.id=s.classroom_id
LEFT JOIN users u ON u.id=s.teacher_id LEFT JOIN teachers t ON t.id=s.teacher_id
WHERE c.school_id='school-001' AND u.id IS NULL AND t.id IS NULL;
SELECT 'historical_entries_without_slot' AS finding,count(*) FROM schemes_of_work s
JOIN classrooms c ON c.id=s.classroom_id
CROSS JOIN LATERAL jsonb_array_elements(s.entries::jsonb) e
WHERE c.school_id='school-001' AND coalesce(e->>'slotId','')='';
SELECT 'active_class_assignments' AS finding,count(*) FROM class_teacher_assignments WHERE school_id='school-001' AND is_active=true;
SELECT 'active_subject_assignments' AS finding,count(*) FROM subject_teacher_assignments WHERE school_id='school-001' AND is_active=true;
ROLLBACK;
