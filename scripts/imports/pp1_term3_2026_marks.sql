-- ==============================================================================
-- SMARTSHULE CBC EXAMINATION MARKS IMPORT
-- ==============================================================================
-- Institution:     Grace Seeds School (school-001)
-- Cohort:          PP1 (Pre-Primary 1)
-- Classroom:       PP1 (id: class-pp1, stream: stream-pp1-main)
-- Academic Period: Year 2026 (id: year-2026), Term 3 (id: term-2026-t3)
-- Source:          Handwritten Results Sheet (Term 3 Examination)
-- Subjects (6):    REA  -> la-pp1-lit  (Literacy Activities, Code: LIT)
--                  MAT  -> la-pp1-mat  (Mathematical Activities, Code: MAT)
--                  ENVI -> la-pp1-env  (Environmental Activities, Code: ENV)
--                  CRE  -> la-pp1-cre  (Religious Activities, Code: SRE)
--                  CREA -> la-pp1-crea (Psychomotor and Creative Activities, Code: CRE)
--                  LAN  -> la-pp1-lang (Language Activities, Code: LAN)
--
-- Cohort Scope:    PP1-001 to PP1-038 (38 active learners with valid marks)
-- Note on PP1-039: PP1-039 (Joseph Sifa) marks are MISSING in source sheet.
--                  Explicitly excluded so NO false 0 marks are created.
-- Expected Rows:   38 learners * 6 subjects = 228 summative_assessments records.
-- ==============================================================================

-- ==============================================================================
-- PRE-IMPORT VERIFICATION QUERIES (Run these first in Supabase SQL Editor)
-- ==============================================================================

-- 1. Verify Academic Year and Term existence
SELECT id, name, is_current FROM academic_years WHERE id = 'year-2026';
SELECT id, academic_year_id, term_number, name, is_current FROM academic_terms WHERE id = 'term-2026-t3';

-- 2. Verify all 6 PP1 Learning Areas
SELECT id, name, code, grade_level 
FROM learning_areas 
WHERE grade_level = 'PP1' 
ORDER BY id;

-- 3. Confirm all 38 PP1 learners are registered and active
SELECT COUNT(*) AS active_pp1_learners_count 
FROM students 
WHERE admission_number BETWEEN 'PP1-001' AND 'PP1-038'
  AND status = 'ACTIVE';

-- 4. Check existing records in summative_assessments for PP1 in Term 3
SELECT COUNT(*) AS existing_target_marks_count
FROM summative_assessments s
JOIN students st ON s.student_id = st.id
WHERE st.admission_number BETWEEN 'PP1-001' AND 'PP1-038'
  AND s.learning_area_id IN ('la-pp1-lit', 'la-pp1-mat', 'la-pp1-env', 'la-pp1-cre', 'la-pp1-crea', 'la-pp1-lang')
  AND s.term_id = 'term-2026-t3';

-- 5. Inspect existing legacy 'la-general' records (if any)
SELECT COUNT(*) AS existing_legacy_general_records
FROM summative_assessments s
JOIN students st ON s.student_id = st.id
WHERE st.admission_number BETWEEN 'PP1-001' AND 'PP1-039'
  AND s.learning_area_id = 'la-general'
  AND s.term_id = 'term-2026-t3';


-- ==============================================================================
-- TRANSACTIONAL IMPORT: 228 GRANULAR CBC SUMMATIVE ASSESSMENT RECORDS
-- ==============================================================================
BEGIN;

WITH raw_marks(admission_number, rea, mat, envi, cre, crea, lan) AS (
  VALUES
    ('PP1-001', 95, 96, 100, 91, 80, 100),
    ('PP1-002', 100, 85, 95, 100, 80, 89),
    ('PP1-003', 100, 81, 100, 82, 90, 94),
    ('PP1-004', 84, 88, 90, 91, 90, 94),
    ('PP1-005', 89, 85, 85, 100, 80, 94),
    ('PP1-006', 95, 92, 100, 91, 50, 100),
    ('PP1-007', 95, 81, 100, 73, 80, 94),
    ('PP1-008', 84, 92, 70, 91, 90, 94),
    ('PP1-009', 89, 85, 95, 91, 70, 89),
    ('PP1-010', 95, 54, 100, 91, 80, 94),
    ('PP1-011', 89, 81, 90, 95, 60, 94),
    ('PP1-012', 95, 88, 70, 82, 80, 89),
    ('PP1-013', 89, 98, 100, 82, 40, 89),
    ('PP1-014', 89, 65, 85, 73, 90, 85),
    ('PP1-015', 100, 92, 70, 73, 60, 89),
    ('PP1-016', 89, 92, 70, 73, 60, 94),
    ('PP1-017', 84, 77, 100, 55, 70, 89),
    ('PP1-018', 89, 31, 95, 100, 80, 78),
    ('PP1-019', 74, 77, 98, 64, 70, 89),
    ('PP1-020', 89, 65, 100, 82, 40, 94),
    ('PP1-021', 89, 46, 65, 91, 70, 89),
    ('PP1-022', 95, 69, 65, 91, 30, 94),
    ('PP1-023', 89, 42, 70, 100, 50, 89),
    ('PP1-024', 74, 65, 60, 100, 70, 67),
    ('PP1-025', 89, 35, 95, 91, 30, 94),
    ('PP1-026', 95, 38, 85, 73, 50, 89),
    ('PP1-027', 89, 88, 90, 55, 40, 67),
    ('PP1-028', 89, 88, 95, 82, 30, 33),
    ('PP1-029', 74, 42, 75, 82, 50, 94),
    ('PP1-030', 95, 35, 60, 64, 70, 89),
    ('PP1-031', 68, 50, 75, 91, 30, 89),
    ('PP1-032', 89, 62, 95, 55, 30, 67),
    ('PP1-033', 100, 31, 90, 64, 30, 78),
    ('PP1-034', 95, 31, 60, 64, 40, 94),
    ('PP1-035', 100, 42, 70, 64, 30, 78),
    ('PP1-036', 53, 42, 75, 73, 50, 89),
    ('PP1-037', 89, 42, 80, 27, 40, 67),
    ('PP1-038', 63, 26, 50, 64, 30, 94)
),
unpivoted_marks AS (
  SELECT admission_number, 'la-pp1-lit'  AS learning_area_id, rea  AS raw_score FROM raw_marks UNION ALL
  SELECT admission_number, 'la-pp1-mat'  AS learning_area_id, mat  AS raw_score FROM raw_marks UNION ALL
  SELECT admission_number, 'la-pp1-env'  AS learning_area_id, envi AS raw_score FROM raw_marks UNION ALL
  SELECT admission_number, 'la-pp1-cre'  AS learning_area_id, cre  AS raw_score FROM raw_marks UNION ALL
  SELECT admission_number, 'la-pp1-crea' AS learning_area_id, crea AS raw_score FROM raw_marks UNION ALL
  SELECT admission_number, 'la-pp1-lang' AS learning_area_id, lan  AS raw_score FROM raw_marks
),
resolved_marks AS (
  SELECT
    -- Deterministic, clean primary key: e.g. sum-pp1-001-lit-t3
    'sum-' || LOWER(s.admission_number) || '-' || REPLACE(m.learning_area_id, 'la-pp1-', '') || '-t3' AS id,
    s.id AS student_id,
    'admin' AS teacher_id,
    m.learning_area_id,
    'term-2026-t3' AS term_id,
    'year-2026' AS academic_year_id,
    jsonb_build_array(
      jsonb_build_object(
        'strandId', m.learning_area_id,
        'strandTitle', la.name || ' Core Strand',
        'rawScore', m.raw_score,
        'maxScore', 100,
        'performanceLevel',
          CASE
            WHEN m.raw_score >= 80 THEN 'EE'
            WHEN m.raw_score >= 65 THEN 'ME'
            WHEN m.raw_score >= 50 THEN 'AE'
            ELSE 'BE'
          END
      )
    ) AS strand_scores,
    CASE
      WHEN m.raw_score >= 80 THEN 'EE'
      WHEN m.raw_score >= 65 THEN 'ME'
      WHEN m.raw_score >= 50 THEN 'AE'
      ELSE 'BE'
    END AS overall_performance_level,
    CASE
      WHEN m.raw_score >= 80 THEN 'Exemplary competency achieved in learning area'
      WHEN m.raw_score >= 65 THEN 'Consistently achieves learning expectations'
      WHEN m.raw_score >= 50 THEN 'Progressing towards expected competency'
      ELSE 'Needs targeted intervention and support'
    END AS teacher_remarks,
    '2026-10-25' AS evaluation_date,
    NOW() AS created_at,
    NOW() AS updated_at
  FROM unpivoted_marks m
  JOIN students s ON s.admission_number = m.admission_number
  JOIN learning_areas la ON la.id = m.learning_area_id
)
INSERT INTO summative_assessments (
  id,
  student_id,
  teacher_id,
  learning_area_id,
  term_id,
  academic_year_id,
  strand_scores,
  overall_performance_level,
  teacher_remarks,
  evaluation_date,
  created_at,
  updated_at
)
SELECT
  id,
  student_id,
  teacher_id,
  learning_area_id,
  term_id,
  academic_year_id,
  strand_scores,
  overall_performance_level,
  teacher_remarks,
  evaluation_date,
  created_at,
  updated_at
FROM resolved_marks
ON CONFLICT (id) DO UPDATE SET
  strand_scores = EXCLUDED.strand_scores,
  overall_performance_level = EXCLUDED.overall_performance_level,
  teacher_remarks = EXCLUDED.teacher_remarks,
  evaluation_date = EXCLUDED.evaluation_date,
  updated_at = NOW();

-- Optional: Clean up legacy, malformed 'la-general' bundled rows for PP1 learners in Term 3
-- This ensures the broadsheet and report cards strictly pull the granular, verified marks.
DELETE FROM summative_assessments
WHERE learning_area_id = 'la-general'
  AND term_id = 'term-2026-t3'
  AND student_id IN (
    SELECT id FROM students WHERE admission_number BETWEEN 'PP1-001' AND 'PP1-039'
  );

COMMIT;


-- ==============================================================================
-- POST-IMPORT VERIFICATION QUERIES (Run these immediately after COMMIT)
-- ==============================================================================

-- 1. Confirm total inserted marks for PP1 in Term 3 (Must be exactly 228)
SELECT COUNT(*) AS total_imported_marks
FROM summative_assessments s
JOIN students st ON s.student_id = st.id
WHERE st.admission_number BETWEEN 'PP1-001' AND 'PP1-038'
  AND s.term_id = 'term-2026-t3'
  AND s.learning_area_id IN ('la-pp1-lit', 'la-pp1-mat', 'la-pp1-env', 'la-pp1-cre', 'la-pp1-crea', 'la-pp1-lang');

-- 2. Confirm breakdown per subject (Must be exactly 38 records per subject)
SELECT 
  la.id,
  la.name AS learning_area_name,
  la.code AS subject_code,
  COUNT(s.id) AS evaluated_students_count,
  ROUND(AVG((s.strand_scores->0->>'rawScore')::numeric), 2) AS mean_score,
  MIN((s.strand_scores->0->>'rawScore')::numeric) AS min_score,
  MAX((s.strand_scores->0->>'rawScore')::numeric) AS max_score
FROM learning_areas la
LEFT JOIN summative_assessments s ON s.learning_area_id = la.id AND s.term_id = 'term-2026-t3'
WHERE la.grade_level = 'PP1'
GROUP BY la.id, la.name, la.code
ORDER BY la.id;

-- 3. Verify that PP1-039 (Joseph Sifa) has NO false 0 marks
SELECT st.admission_number, st.first_name, st.last_name, COUNT(s.id) AS marks_count
FROM students st
LEFT JOIN summative_assessments s ON s.student_id = st.id AND s.term_id = 'term-2026-t3'
WHERE st.admission_number = 'PP1-039'
GROUP BY st.admission_number, st.first_name, st.last_name;

-- 4. Sample verification of top learner (PP1-001 Cedrick Miker)
SELECT 
  st.admission_number,
  st.first_name || ' ' || st.last_name AS learner_name,
  la.name AS subject,
  s.strand_scores->0->>'rawScore' AS raw_score,
  s.overall_performance_level AS performance_level,
  s.teacher_remarks
FROM summative_assessments s
JOIN students st ON s.student_id = st.id
JOIN learning_areas la ON s.learning_area_id = la.id
WHERE st.admission_number = 'PP1-001'
  AND s.term_id = 'term-2026-t3'
ORDER BY la.id;
