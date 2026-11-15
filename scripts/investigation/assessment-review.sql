-- Read-only review. No guessed scores, maxima, learner links or deletions.
BEGIN READ ONLY;
WITH scoped AS (
 SELECT a.* FROM summative_assessments a JOIN students s ON s.id=a.student_id WHERE s.school_id='school-001'
), grouped AS (
 SELECT student_id,learning_area_id,regexp_replace(term_id,'-t([1-3])$','-\1') AS term,academic_year_id,
        count(*) AS copies,array_agg(id ORDER BY id) AS assessment_ids
 FROM scoped GROUP BY 1,2,3,4 HAVING count(*)>1
)
SELECT term, count(*) AS duplicate_groups, sum(copies-1) AS extra_rows FROM grouped GROUP BY term;
SELECT a.id,a.term_id,a.learning_area_id,score->>'rawScore' AS raw_score,score->>'maxScore' AS configured_maximum
FROM summative_assessments a JOIN students s ON s.id=a.student_id
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.strand_scores)='array' THEN a.strand_scores ELSE '[]'::jsonb END) score
WHERE s.school_id='school-001' AND (score->>'rawScore')::numeric > (score->>'maxScore')::numeric
ORDER BY a.id;
ROLLBACK;
