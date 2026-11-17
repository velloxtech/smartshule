-- ==============================================================================
-- SMARTSHULE PRODUCTION MIGRATION: GLOBAL SUBJECT CATALOGUE & REFERENCE REPAIR
-- ==============================================================================
-- Institution:     Grace Seeds School (school-001)
-- Target:          Supabase Live Production & Local PostgreSQL
-- Purpose:
--   1. Establish canonical Global Subject Catalogue (global_subjects)
--   2. Reference canonical global subject from each grade-specific learning area
--   3. Replace invalid (school_id, code) constraint with (school_id, grade_level, code)
--   4. Seed missing grade-specific learning areas for Pre-Primary, Lower Primary, Upper Primary
--   5. Repair cross-grade summative assessments (1,250 records)
--   6. Repair cross-grade strands, schemes of work, and curriculum trackers
--   7. Maintain 100% preservation of all assessment history, marks, and remarks
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CREATE GLOBAL SUBJECTS CATALOGUE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_subjects (
  id VARCHAR(50) PRIMARY KEY,
  school_id VARCHAR(50) NOT NULL DEFAULT 'school-001',
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_global_subjects_school_code UNIQUE (school_id, code)
);

-- Seed Canonical Global Subjects
INSERT INTO global_subjects (id, school_id, code, name, department, description, created_at, updated_at)
VALUES
  ('subj-math', 'school-001', 'MATH', 'Mathematics', 'Mathematics', 'Mathematical Activities and Mathematics curriculum across all levels', NOW(), NOW()),
  ('subj-eng', 'school-001', 'ENG', 'English', 'Languages', 'English Language Activities, English Reading, and English Language', NOW(), NOW()),
  ('subj-kisw', 'school-001', 'KISW', 'Kiswahili', 'Languages', 'Kiswahili Language Activities, Kusoma, and Kiswahili Language', NOW(), NOW()),
  ('subj-lan', 'school-001', 'LANG', 'Language Activities', 'Languages', 'Early childhood foundational language activities for Pre-Primary', NOW(), NOW()),
  ('subj-rea', 'school-001', 'REA', 'Reading & Literacy', 'Languages', 'Literacy activities, reading fluency, and reading comprehension', NOW(), NOW()),
  ('subj-kuso', 'school-001', 'KUSO', 'Kusoma', 'Languages', 'Kiswahili reading comprehension and literacy activities', NOW(), NOW()),
  ('subj-sci', 'school-001', 'SCI', 'Science', 'Sciences', 'Science & Technology and Integrated Science', NOW(), NOW()),
  ('subj-env', 'school-001', 'ENV', 'Environmental Studies', 'Sciences', 'Environmental Activities and Environmental Studies', NOW(), NOW()),
  ('subj-re', 'school-001', 'RE', 'Religious Education', 'Humanities', 'Religious Activities and Christian Religious Education', NOW(), NOW()),
  ('subj-crea', 'school-001', 'CREA', 'Creative Arts', 'Creative Arts', 'Psychomotor & Creative Activities, Creative Arts Activities, and Creative Arts & Sports', NOW(), NOW()),
  ('subj-sst', 'school-001', 'SST', 'Social Studies', 'Humanities', 'Social Studies across Upper Primary and Junior School', NOW(), NOW()),
  ('subj-agr', 'school-001', 'AGRI', 'Agriculture & Nutrition', 'Applied Sciences', 'Agriculture and Nutrition Activities and Agriculture & Nutrition', NOW(), NOW()),
  ('subj-pretech', 'school-001', 'PRETECH', 'Pre-Technical Studies', 'Technical', 'Pre-Technical and Pre-Career Studies in Junior School', NOW(), NOW()),
  ('subj-hlth', 'school-001', 'HLTH', 'Health Education', 'Sciences', 'Health Education and Life Skills', NOW(), NOW()),
  ('subj-bus', 'school-001', 'BUS', 'Business Studies', 'Humanities', 'Business Studies and Financial Literacy', NOW(), NOW()),
  ('subj-comp', 'school-001', 'COMP', 'Computer Science', 'Technical', 'Computer Science and Digital Literacy', NOW(), NOW()),
  ('subj-indig', 'school-001', 'INDIG', 'Indigenous Language', 'Languages', 'Indigenous Language Activities and Mother Tongue', NOW(), NOW()),
  ('subj-fre', 'school-001', 'FRE', 'French', 'Languages', 'French Foreign Language elective', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  department = EXCLUDED.department,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. ALTER LEARNING_AREAS TABLE: ADD GLOBAL_SUBJECT_ID & FIX CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE learning_areas ADD COLUMN IF NOT EXISTS global_subject_id VARCHAR(50);

-- Drop obsolete school-wide code constraints that prevented grade-specific offerings
ALTER TABLE learning_areas DROP CONSTRAINT IF EXISTS unique_school_subject_code;
ALTER TABLE learning_areas DROP CONSTRAINT IF EXISTS uq_school_learning_area_code;
ALTER TABLE learning_areas DROP CONSTRAINT IF EXISTS unique_school_grade_subject_code;

-- Temporary table with canonical grade-specific offerings
CREATE TEMP TABLE target_learning_areas (
  id VARCHAR(50),
  name VARCHAR(100),
  code VARCHAR(30),
  grade_level VARCHAR(30),
  education_level VARCHAR(30),
  is_elective BOOLEAN,
  school_id VARCHAR(50),
  global_subject_id VARCHAR(50)
) ON COMMIT DROP;

INSERT INTO target_learning_areas (id, name, code, grade_level, education_level, is_elective, school_id, global_subject_id)
VALUES
  -- Playgroup
  ('la-pg-lang', 'Language Activities', 'LANG', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-lan'),
  ('la-pg-env', 'Environmental Activities', 'ENVI', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-pg-mat', 'Mathematical Activities', 'MAT', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-pg-crea', 'Psychomotor and Creative Activities', 'CREA', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-crea'),
  ('la-pg-cre', 'Religious Activities', 'CRE', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-pg-rea', 'Reading Activities', 'REA', 'PLAYGROUP', 'PRE_PRIMARY', false, 'school-001', 'subj-rea'),

  -- PP1
  ('la-pp1-lang', 'Language Activities', 'LAN', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-lan'),
  ('la-pp1-lit', 'Literacy Activities', 'LIT', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-rea'),
  ('la-pp1-cre', 'Religious Activities', 'SRE', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-pp1-mat', 'Mathematical Activities', 'MAT', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-pp1-env', 'Environmental Activities', 'ENV', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-pp1-crea', 'Psychomotor and Creative Activities', 'CREA', 'PP1', 'PRE_PRIMARY', false, 'school-001', 'subj-crea'),

  -- PP2
  ('la-pp2-lang', 'Language Activities', 'LAN', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-lan'),
  ('la-pp2-lit', 'Literacy Activities', 'LIT', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-rea'),
  ('la-pp2-cre', 'Religious Activities', 'SRE', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-pp2-mat', 'Mathematical Activities', 'MAT', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-pp2-env', 'Environmental Activities', 'ENV', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-pp2-crea', 'Psychomotor and Creative Activities', 'CREA', 'PP2', 'PRE_PRIMARY', false, 'school-001', 'subj-crea'),

  -- Grade 1
  ('la-g1-mat', 'Mathematical Activities', 'MAT', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-g1-eng', 'English Language Activities', 'ENG', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-eng'),
  ('la-g1-kis', 'Kiswahili Language Activities', 'KIS', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-kisw'),
  ('la-g1-senv', 'Environmental Activities', 'ENVI', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-g1-cre', 'Christian Religious Education', 'CRE', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-g1-crea', 'Creative Arts Activities', 'CREA', 'GRADE_1', 'LOWER_PRIMARY', false, 'school-001', 'subj-crea'),

  -- Grade 2
  ('la-g2-mat', 'Mathematical Activities', 'MAT', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-g2-eng', 'English Language Activities', 'ENG', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-eng'),
  ('la-g2-kis', 'Kiswahili Language Activities', 'KIS', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-kisw'),
  ('la-g2-senv', 'Environmental Activities', 'ENVI', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-g2-cre', 'Christian Religious Education', 'CRE', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-g2-crea', 'Creative Arts Activities', 'CREA', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-crea'),
  ('la-g2-rea', 'English Reading Activities', 'REA', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-rea'),
  ('la-g2-wku', 'Kusoma Activities', 'KUSO', 'GRADE_2', 'LOWER_PRIMARY', false, 'school-001', 'subj-kuso'),

  -- Grade 3
  ('la-g3-mat', 'Mathematical Activities', 'MAT', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-g3-eng', 'English Language Activities', 'ENG', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-eng'),
  ('la-g3-kis', 'Kiswahili Language Activities', 'KIS', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-kisw'),
  ('la-g3-senv', 'Environmental Activities', 'ENV', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-env'),
  ('la-g3-cre', 'Christian Religious Education', 'CRE', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-g3-crea', 'Creative Arts Activities', 'CREA', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-crea'),
  ('la-g3-rea', 'English Reading Activities', 'REA', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-rea'),
  ('la-g3-wku', 'Kusoma Activities', 'KUSO', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-kuso'),
  ('la-g3-agr', 'Agriculture and Nutrition Activities', 'AGR', 'GRADE_3', 'LOWER_PRIMARY', false, 'school-001', 'subj-agr'),

  -- Grade 4
  ('la-g4-mat', 'Mathematics Activities', 'MAT', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-math'),
  ('la-g4-eng', 'English Language Activities', 'ENG', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-eng'),
  ('la-g4-kis', 'Kiswahili Language Activities', 'KIS', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-kisw'),
  ('la-g4-sci', 'Science and Technology', 'SCI', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-sci'),
  ('la-g4-agr', 'Agriculture and Nutrition', 'AGR', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-agr'),
  ('la-g4-cre', 'Christian Religious Education', 'CRE', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-re'),
  ('la-g4-crea', 'Creative Arts Activities', 'CREA', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-crea'),
  ('la-g4-sst', 'Social Studies', 'SST', 'GRADE_4', 'UPPER_PRIMARY', false, 'school-001', 'subj-sst'),

  -- Grade 7
  ('dd23c266-4703-42af-8f1b-76a55ce51e39', 'Mathematics', 'MATH', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-math'),
  ('8d9411e8-cf3b-46c2-a22c-f1f0e8fe1dce', 'English Language', 'ENG', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-eng'),
  ('abbcb4e0-c2e6-49de-8e79-5afb60ea1b57', 'Kiswahili Language', 'KISW', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-kisw'),
  ('942e2926-b01d-4c5a-acea-1ff867977c8c', 'Integrated Science', 'INTSCI', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-sci'),
  ('a968b6ae-0eac-49de-bc48-a612155d8e5b', 'Christian Religious Education', 'CRE', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-re'),
  ('44d5297b-5ba2-4bb8-bfe7-93ff8dcae6cd', 'Agriculture & Nutrition', 'AGRI', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-agr'),
  ('e462bcfc-d8a9-451c-986b-bfa9ffb136c8', 'Creative Arts & Sports', 'ARTS', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-crea'),
  ('24620009-e46c-4dcc-9934-1a4ae598267d', 'Pre-Technical Studies', 'PRETECH', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-pretech'),
  ('b7774aa0-7697-4634-b662-da2faf874d86', 'Social Studies', 'SST', 'GRADE_7', 'JUNIOR_SCHOOL', false, 'school-001', 'subj-sst');

-- 1. First, update existing rows that match (school_id, grade_level, code)
UPDATE learning_areas la
SET 
  global_subject_id = tla.global_subject_id,
  name = tla.name,
  education_level = tla.education_level,
  updated_at = NOW()
FROM target_learning_areas tla
WHERE la.school_id = tla.school_id
  AND la.grade_level = tla.grade_level
  AND la.code = tla.code;

-- 2. Insert any that do not exist yet by (school_id, grade_level, code)
INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id, global_subject_id, created_at, updated_at)
SELECT tla.id, tla.name, tla.code, tla.grade_level, tla.education_level, tla.is_elective, tla.school_id, tla.global_subject_id, NOW(), NOW()
FROM target_learning_areas tla
WHERE NOT EXISTS (
  SELECT 1 FROM learning_areas la
  WHERE la.school_id = tla.school_id
    AND la.grade_level = tla.grade_level
    AND la.code = tla.code
);

-- Add new unique constraint per (school_id, grade_level, code)
ALTER TABLE learning_areas ADD CONSTRAINT unique_school_grade_subject_code UNIQUE (school_id, grade_level, code);

-- Also ensure any other remaining learning areas have their global_subject_id assigned
UPDATE learning_areas SET global_subject_id = 'subj-math' WHERE (name ILIKE '%math%' OR code ILIKE '%mat%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-eng' WHERE (name ILIKE '%english%' OR code = 'ENG') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-kisw' WHERE (name ILIKE '%kiswahili%' OR code ILIKE '%kis%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-lan' WHERE (name ILIKE '%language activities%' OR code ILIKE '%lan%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-rea' WHERE (name ILIKE '%reading%' OR name ILIKE '%literacy%' OR code = 'REA' OR code = 'LIT') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-kuso' WHERE (name ILIKE '%kusoma%' OR code = 'KUSO' OR code = 'WKU') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-sci' WHERE (name ILIKE '%science%' OR code ILIKE '%sci%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-env' WHERE (name ILIKE '%environ%' OR code ILIKE '%env%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-re' WHERE (name ILIKE '%religious%' OR name ILIKE '%christian%' OR code = 'CRE' OR code = 'SRE') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-crea' WHERE (name ILIKE '%creative%' OR name ILIKE '%arts%' OR code = 'CREA' OR code = 'ARTS') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-sst' WHERE (name ILIKE '%social%' OR code = 'SST') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-agr' WHERE (name ILIKE '%agri%' OR code ILIKE '%agr%') AND global_subject_id IS NULL;
UPDATE learning_areas SET global_subject_id = 'subj-pretech' WHERE (name ILIKE '%tech%' OR code = 'PRETECH') AND global_subject_id IS NULL;

-- Add Foreign Key constraint to enforce referential integrity
ALTER TABLE learning_areas DROP CONSTRAINT IF EXISTS fk_learning_areas_global_subject;
ALTER TABLE learning_areas ADD CONSTRAINT fk_learning_areas_global_subject 
  FOREIGN KEY (global_subject_id) REFERENCES global_subjects(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 4. REPAIR CROSS-GRADE SUMMATIVE ASSESSMENTS (1,250 RECORDS)
-- ------------------------------------------------------------------------------

-- Grade 1: 372 records
UPDATE summative_assessments SET learning_area_id = 'la-g1-eng' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-eng%';
UPDATE summative_assessments SET learning_area_id = 'la-g1-cre' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-cre-%';
UPDATE summative_assessments SET learning_area_id = 'la-g1-crea' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-crea-%';
UPDATE summative_assessments SET learning_area_id = 'la-g1-kis' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-kis-%';
UPDATE summative_assessments SET learning_area_id = 'la-g1-mat' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-mat-%';
UPDATE summative_assessments SET learning_area_id = 'la-g1-senv' WHERE id LIKE 'sum-g1-%' AND id LIKE '%-envi-%';

-- Grade 2: 240 records
UPDATE summative_assessments SET learning_area_id = 'la-g2-eng' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-eng%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-cre' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-cre-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-crea' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-crea-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-kis' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-kis-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-mat' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-mat-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-rea' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-rea-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-wku' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-kuso-%';
UPDATE summative_assessments SET learning_area_id = 'la-g2-senv' WHERE id LIKE 'sum-g2-%' AND id LIKE '%-envi-%';

-- Grade 3: 126 records (English & CRE)
UPDATE summative_assessments SET learning_area_id = 'la-g3-eng' WHERE id LIKE 'sum-g3-%' AND id LIKE '%-eng%';
UPDATE summative_assessments SET learning_area_id = 'la-g3-cre' WHERE id LIKE 'sum-g3-%' AND id LIKE '%-cre%' AND id NOT LIKE '%-crea%';

-- Grade 4: 196 records
UPDATE summative_assessments SET learning_area_id = 'la-g4-agr' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-agr-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-cre' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-cre-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-eng' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-eng-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-kis' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-kis-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-mat' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-mat-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-crea' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-crea-%';
UPDATE summative_assessments SET learning_area_id = 'la-g4-sst' WHERE id LIKE 'sum-g4-%' AND id LIKE '%-sst-%';

-- Playgroup: 202 records
UPDATE summative_assessments SET learning_area_id = 'la-pg-cre' WHERE id LIKE 'sum-pg-%' AND id LIKE '%-cre-%';
UPDATE summative_assessments SET learning_area_id = 'la-pg-crea' WHERE id LIKE 'sum-pg-%' AND id LIKE '%-crea-%';
UPDATE summative_assessments SET learning_area_id = 'la-pg-mat' WHERE id LIKE 'sum-pg-%' AND id LIKE '%-mat-%';
UPDATE summative_assessments SET learning_area_id = 'la-pg-rea' WHERE id LIKE 'sum-pg-%' AND id LIKE '%-rea-%';

-- PP1: 114 records
UPDATE summative_assessments SET learning_area_id = 'la-pp1-crea' WHERE id LIKE 'sum-pp1-%' AND id LIKE '%-crea-%';
UPDATE summative_assessments SET learning_area_id = 'la-pp1-env' WHERE id LIKE 'sum-pp1-%' AND id LIKE '%-env-%';
UPDATE summative_assessments SET learning_area_id = 'la-pp1-mat' WHERE id LIKE 'sum-pp1-%' AND id LIKE '%-mat-%';

-- ------------------------------------------------------------------------------
-- 5. REPAIR CROSS-GRADE STRANDS, SCHEMES, AND CURRICULUM TRACKERS
-- ------------------------------------------------------------------------------

-- Strands
UPDATE strands 
SET learning_area_id = 'la-g3-kis' 
WHERE id = 'bfbbb077-960a-4024-b99b-c11443ec64b2'; -- 'Kusikiliza na kuongea' (Grade 3 Kiswahili)

UPDATE strands 
SET learning_area_id = 'la-g3-kis' 
WHERE id = '01259a02-120b-4845-b540-895c5f3e5a3b'; -- 'Ndege nimpendaye' (Grade 3 Kiswahili)

-- Schemes of Work
UPDATE schemes_of_work 
SET learning_area_id = 'la-g3-kis',
    classroom_id = 'class-grade-3'
WHERE id = 'fe78d8c3-1e4d-4417-a659-2d4cf7f4bcb1'; -- 'Grade 3 Kiswahili schemes of work'

-- Curriculum Trackers
UPDATE curriculum_trackers 
SET learning_area_id = 'la-g3-kis',
    classroom_id = 'class-grade-3',
    subject_name = 'Kiswahili Language Activities'
WHERE id = 'd06d71c1-232c-4b7e-9e37-006cd4fd95bc';

COMMIT;
