BEGIN;

-- Keep the most recently assigned duty when upgrading existing data.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY school_id, academic_year_id, teacher_id
    ORDER BY effective_from DESC NULLS LAST, created_at DESC, id DESC
  ) AS position
  FROM class_teacher_assignments
  WHERE is_active = TRUE
)
UPDATE class_teacher_assignments AS assignment
SET is_active = FALSE, effective_to = COALESCE(effective_to, CURRENT_DATE::text), updated_at = NOW()
FROM ranked
WHERE ranked.id = assignment.id AND ranked.position > 1;

-- Remove obsolete stream links only for duties in the current academic year.
UPDATE streams AS stream
SET class_teacher_id = NULL, updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM class_teacher_assignments AS assignment
  JOIN academic_years AS year ON year.id = assignment.academic_year_id
  WHERE assignment.stream_id = stream.id
    AND assignment.teacher_id = stream.class_teacher_id
    AND year.is_current = TRUE AND assignment.is_active = FALSE
)
AND NOT EXISTS (
  SELECT 1 FROM class_teacher_assignments AS assignment
  JOIN academic_years AS year ON year.id = assignment.academic_year_id
  WHERE assignment.stream_id = stream.id
    AND assignment.teacher_id = stream.class_teacher_id
    AND year.is_current = TRUE AND assignment.is_active = TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_teacher_one_active_duty
  ON class_teacher_assignments (school_id, academic_year_id, teacher_id)
  WHERE is_active = TRUE;

COMMIT;
