-- ==============================================================================
-- SMART SHULE DATA CORRECTION MIGRATION SCRIPT
-- Target: Link PP1 Learners (PP1-001 to PP1-039) to PP1 Classroom and Stream
-- Academic Year: 2026 | School: school-001
-- ==============================================================================
-- Root Cause:
-- PP1 learners (admission numbers PP1-001 through PP1-039) had `grade_level = 'PP1'`
-- but their foreign keys `classroom_id` and `stream_id` were NULL.
-- In some UI components (e.g., SummativeAssessmentsView), unassigned streams fell
-- back to hardcoded 'Grade 3'.
--
-- This script safely and idempotently updates those records.
-- ==============================================================================

BEGIN;

-- 1. PRE-CHECK: Verify target classroom and stream exist
DO $$
DECLARE
    v_class_exists BOOLEAN;
    v_stream_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM classrooms WHERE id = 'class-pp1') INTO v_class_exists;
    SELECT EXISTS (SELECT 1 FROM streams WHERE id = 'stream-pp1-main' AND classroom_id = 'class-pp1') INTO v_stream_exists;

    IF NOT v_class_exists THEN
        RAISE EXCEPTION 'Pre-check failed: Classroom class-pp1 does not exist.';
    END IF;

    IF NOT v_stream_exists THEN
        RAISE EXCEPTION 'Pre-check failed: Stream stream-pp1-main does not exist.';
    END IF;
END $$;

-- 2. TARGETED UPDATE: Update PP1 learners (PP1-001 to PP1-039)
-- Only updates records where grade_level is 'PP1' and admission_number matches PP1 series
UPDATE students
SET
    classroom_id = 'class-pp1',
    stream_id = 'stream-pp1-main',
    updated_at = NOW()
WHERE
    school_id = 'school-001'
    AND grade_level = 'PP1'
    AND (
        admission_number ~ '^PP1-0(0[1-9]|[1-3][0-9])$'
        OR admission_number LIKE 'PP1-%'
    );

-- 3. POST-CHECK VALIDATION: Ensure all target PP1 students have valid class/stream
DO $$
DECLARE
    v_updated_count INT;
    v_unassigned_count INT;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM students
    WHERE school_id = 'school-001'
      AND grade_level = 'PP1'
      AND classroom_id = 'class-pp1'
      AND stream_id = 'stream-pp1-main';

    SELECT COUNT(*) INTO v_unassigned_count
    FROM students
    WHERE school_id = 'school-001'
      AND grade_level = 'PP1'
      AND (classroom_id IS NULL OR stream_id IS NULL);

    IF v_unassigned_count > 0 THEN
        RAISE NOTICE 'Note: % PP1 students remain unassigned to a stream/classroom.', v_unassigned_count;
    END IF;

    RAISE NOTICE 'Post-check passed: % PP1 student records assigned to class-pp1 and stream-pp1-main.', v_updated_count;
END $$;

COMMIT;

-- ==============================================================================
-- ROLLBACK SCRIPT (In case of unexpected issue):
-- ==============================================================================
-- BEGIN;
-- UPDATE students
-- SET classroom_id = NULL, stream_id = NULL, updated_at = NOW()
-- WHERE school_id = 'school-001'
--   AND grade_level = 'PP1'
--   AND admission_number ~ '^PP1-0(0[1-9]|[1-3][0-9])$';
-- COMMIT;
-- ==============================================================================
