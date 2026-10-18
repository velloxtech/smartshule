import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { resolveDatabaseConfig } from '../src/infrastructure/config/databaseResolver';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = resolveDatabaseConfig();
console.log(`[Seeder] Target: ${config.target.toUpperCase()} | Host: ${config.host}:${config.port}/${config.databaseName}`);

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isCloud ? { rejectUnauthorized: false } : false
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database seed for 10 students across 3 classes with randomized marks...');

    // 1. School
    await client.query(`
      INSERT INTO schools (id, name, code, center_code, motto, email, phone, address, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        center_code = EXCLUDED.center_code,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = NOW()
    `, [
      'school-001',
      'Grace Seeds School',
      'GSS-001',
      null,
      'The Future Begins Here',
      'schoolgraceseeds@gmail.com',
      '0745436312',
      'KEMRI Street, Kisian, Kisumu, Kenya',
      'KES'
    ]);

    // 2. Academic Years
    await client.query(`
      INSERT INTO academic_years (id, name, start_date, end_date, is_current, school_id)
      VALUES 
        ('year-2026', '2026', '2026-01-05', '2026-11-20', true, 'school-001'),
        ('year-2025', '2025', '2025-01-06', '2025-11-21', false, 'school-001')
      ON CONFLICT (id) DO UPDATE SET is_current = EXCLUDED.is_current, updated_at = NOW()
    `);

    // 3. Academic Terms for 2026
    await client.query(`
      INSERT INTO academic_terms (id, academic_year_id, term_number, name, start_date, end_date, is_current)
      VALUES 
        ('term-2026-t1', 'year-2026', 1, 'Term 1', '2026-01-05', '2026-04-03', false),
        ('term-2026-t2', 'year-2026', 2, 'Term 2', '2026-05-04', '2026-08-07', false),
        ('term-2026-t3', 'year-2026', 3, 'Term 3', '2026-08-31', '2026-11-20', true)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_current = EXCLUDED.is_current, updated_at = NOW()
    `);

    // 4. Classrooms
    const classIdG4 = '0d4319bd-bb1e-45ea-9cb4-b793bca2a11f';
    const classIdG5 = 'f2c6b843-d6c0-486e-a08d-e5ef568cc4b1';
    const classIdG6 = 'c466ca73-6a74-44be-924f-c9f9bce2c4ce';

    await client.query(`
      INSERT INTO classrooms (id, name, grade_level, education_level, school_id)
      VALUES 
        ($1, 'Grade 4', 'GRADE_4', 'PRIMARY', 'school-001'),
        ($2, 'Grade 5', 'GRADE_5', 'PRIMARY', 'school-001'),
        ($3, 'Grade 6', 'GRADE_6', 'PRIMARY', 'school-001')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade_level = EXCLUDED.grade_level, updated_at = NOW()
    `, [classIdG4, classIdG5, classIdG6]);

    // 5. Streams for the 3 classes
    // In Grade 4: Stream East, Stream West, Stream Alpha (3 classes in Grade 4)
    // Plus Grade 5 and Grade 6 streams
    const streamsToInsert = [
      { id: 'stream-g4-east', classroom_id: classIdG4, name: 'Stream East', capacity: 45 },
      { id: 'stream-g4-west', classroom_id: classIdG4, name: 'Stream West', capacity: 45 },
      { id: 'stream-g4-alpha', classroom_id: classIdG4, name: 'Stream Alpha', capacity: 45 },
      { id: '6139f68a-5e94-4af8-870a-f90d1e4540cd', classroom_id: classIdG5, name: 'Grade 5 Alpha', capacity: 40 },
      { id: 'stream-g6-blue', classroom_id: classIdG6, name: 'Stream Blue', capacity: 45 },
    ];

    for (const s of streamsToInsert) {
      await client.query(`
        INSERT INTO streams (id, classroom_id, name, capacity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, classroom_id = EXCLUDED.classroom_id, updated_at = NOW()
      `, [s.id, s.classroom_id, s.name, s.capacity]);
    }

    // 6. Learning Areas for Grade 4, Grade 5, and Grade 6
    const learningAreasG4 = [
      { id: 'la-g4-math', name: 'Mathematics', code: 'MATH', grade_level: 'GRADE_4' },
      { id: 'la-g4-eng', name: 'English Language', code: 'ENG', grade_level: 'GRADE_4' },
      { id: 'la-g4-kisw', name: 'Kiswahili Language', code: 'KISW', grade_level: 'GRADE_4' },
      { id: 'la-g4-scitech', name: 'Science and Technology', code: 'SCI_TECH', grade_level: 'GRADE_4' },
      { id: 'la-g4-sst', name: 'Social Studies', code: 'SST', grade_level: 'GRADE_4' },
      { id: 'la-g4-cre', name: 'Christian Religious Education', code: 'CRE', grade_level: 'GRADE_4' },
      { id: 'la-g4-agri', name: 'Agriculture & Nutrition', code: 'AGRI', grade_level: 'GRADE_4' },
      { id: 'la-g4-arts', name: 'Creative Arts & Sports', code: 'ARTS', grade_level: 'GRADE_4' },
    ];

    for (const la of learningAreasG4) {
      await client.query(`
        INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id)
        VALUES ($1, $2, $3, $4, 'PRIMARY', false, 'school-001')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, grade_level = EXCLUDED.grade_level, updated_at = NOW()
      `, [la.id, la.name, la.code, la.grade_level]);
    }

    const learningAreasG5 = [
      { id: 'la-g5-math', name: 'Mathematics', code: 'MATH', grade_level: 'GRADE_5' },
      { id: 'la-g5-eng', name: 'English Language', code: 'ENG', grade_level: 'GRADE_5' },
      { id: 'la-g5-kisw', name: 'Kiswahili Language', code: 'KISW', grade_level: 'GRADE_5' },
      { id: 'la-g5-scitech', name: 'Science and Technology', code: 'SCI_TECH', grade_level: 'GRADE_5' },
      { id: 'la-g5-sst', name: 'Social Studies', code: 'SST', grade_level: 'GRADE_5' },
      { id: 'la-g5-cre', name: 'Christian Religious Education', code: 'CRE', grade_level: 'GRADE_5' },
      { id: 'la-g5-agri', name: 'Agriculture & Nutrition', code: 'AGRI', grade_level: 'GRADE_5' },
      { id: 'la-g5-arts', name: 'Creative Arts & Sports', code: 'ARTS', grade_level: 'GRADE_5' },
    ];

    for (const la of learningAreasG5) {
      await client.query(`
        INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id)
        VALUES ($1, $2, $3, $4, 'PRIMARY', false, 'school-001')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, grade_level = EXCLUDED.grade_level, updated_at = NOW()
      `, [la.id, la.name, la.code, la.grade_level]);
    }

    const learningAreasG6 = [
      { id: 'la-g6-math', name: 'Mathematics', code: 'MATH', grade_level: 'GRADE_6' },
      { id: 'la-g6-eng', name: 'English Language', code: 'ENG', grade_level: 'GRADE_6' },
      { id: 'la-g6-kisw', name: 'Kiswahili Language', code: 'KISW', grade_level: 'GRADE_6' },
      { id: 'la-g6-scitech', name: 'Science and Technology', code: 'SCI_TECH', grade_level: 'GRADE_6' },
      { id: 'la-g6-sst', name: 'Social Studies', code: 'SST', grade_level: 'GRADE_6' },
      { id: 'la-g6-cre', name: 'Christian Religious Education', code: 'CRE', grade_level: 'GRADE_6' },
      { id: 'la-g6-agri', name: 'Agriculture & Nutrition', code: 'AGRI', grade_level: 'GRADE_6' },
      { id: 'la-g6-arts', name: 'Creative Arts & Sports', code: 'ARTS', grade_level: 'GRADE_6' },
    ];

    for (const la of learningAreasG6) {
      await client.query(`
        INSERT INTO learning_areas (id, name, code, grade_level, education_level, is_elective, school_id)
        VALUES ($1, $2, $3, $4, 'PRIMARY', false, 'school-001')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, grade_level = EXCLUDED.grade_level, updated_at = NOW()
      `, [la.id, la.name, la.code, la.grade_level]);
    }

    // 7. Teacher
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, school_id)
      VALUES ('user-teacher-01', 'teacher@smartshule.ac.ke', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Grace', 'Muthoni', 'TEACHER', 'ACTIVE', 'school-001')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO teachers (id, user_id, employee_number, specialization)
      VALUES ('teacher-001', 'user-teacher-01', 'TSC-994821', '["MATH", "SCI_TECH"]')
      ON CONFLICT (id) DO NOTHING
    `);

    // Clean up previous seeded students to ensure EXACTLY 10 students per class
    console.log('🧹 Cleaning previous seed students to ensure exact 10 records per class...');
    await client.query(`DELETE FROM summative_assessments WHERE student_id LIKE 'std-adm-2026-%'`);
    await client.query(`DELETE FROM CBC_report_cards WHERE student_id LIKE 'std-adm-2026-%'`);
    await client.query(`DELETE FROM students WHERE id LIKE 'std-adm-2026-%'`);

    // 8. 10 Students in each of the 3 classes
    // Class 1: Grade 4 - Stream East (10 students)
    // Class 2: Grade 4 - Stream West (10 students)
    // Class 3: Grade 4 - Stream Alpha (10 students)
    // Also include Grade 5 and Grade 6 (10 students each) so any class selection has 10 students!
    interface StudentDefinition {
      adm: string;
      first: string;
      last: string;
      gender: string;
      dob: string;
    }

    const classesData: Array<{
      classroomId: string;
      gradeLevel: string;
      streamId: string;
      streamName: string;
      learningAreas: Array<{ id: string; name: string; code: string }>;
      students: StudentDefinition[];
    }> = [
      {
        classroomId: classIdG4,
        gradeLevel: 'GRADE_4',
        streamId: 'stream-g4-east',
        streamName: 'Stream East',
        learningAreas: learningAreasG4,
        students: [
          { adm: 'ADM-2026-001', first: 'Samuel', last: 'Kiprop', gender: 'MALE', dob: '2014-03-15' },
          { adm: 'ADM-2026-002', first: 'Grace', last: 'Wanjiku', gender: 'FEMALE', dob: '2014-06-20' },
          { adm: 'ADM-2026-003', first: 'Brian', last: 'Omondi', gender: 'MALE', dob: '2014-01-11' },
          { adm: 'ADM-2026-004', first: 'Faith', last: 'Chebet', gender: 'FEMALE', dob: '2014-08-04' },
          { adm: 'ADM-2026-005', first: 'Emmanuel', last: 'Mutua', gender: 'MALE', dob: '2014-04-18' },
          { adm: 'ADM-2026-006', first: 'Achieng', last: 'Otieno', gender: 'FEMALE', dob: '2014-09-29' },
          { adm: 'ADM-2026-007', first: 'Kevin', last: 'Maina', gender: 'MALE', dob: '2014-02-14' },
          { adm: 'ADM-2026-008', first: 'Mercy', last: 'Nyambura', gender: 'FEMALE', dob: '2014-11-03' },
          { adm: 'ADM-2026-009', first: 'Daniel', last: 'Kimani', gender: 'MALE', dob: '2014-07-22' },
          { adm: 'ADM-2026-010', first: 'Sharon', last: 'Jerop', gender: 'FEMALE', dob: '2014-10-17' },
        ]
      },
      {
        classroomId: classIdG4,
        gradeLevel: 'GRADE_4',
        streamId: 'stream-g4-west',
        streamName: 'Stream West',
        learningAreas: learningAreasG4,
        students: [
          { adm: 'ADM-2026-011', first: 'Dennis', last: 'Cheruiyot', gender: 'MALE', dob: '2014-05-19' },
          { adm: 'ADM-2026-012', first: 'Esther', last: 'Wairimu', gender: 'FEMALE', dob: '2014-12-08' },
          { adm: 'ADM-2026-013', first: 'Festus', last: 'Kibet', gender: 'MALE', dob: '2014-02-27' },
          { adm: 'ADM-2026-014', first: 'Lydia', last: 'Atieno', gender: 'FEMALE', dob: '2014-07-30' },
          { adm: 'ADM-2026-015', first: 'Collins', last: 'Koech', gender: 'MALE', dob: '2014-03-25' },
          { adm: 'ADM-2026-016', first: 'Brenda', last: 'Moraa', gender: 'FEMALE', dob: '2014-08-16' },
          { adm: 'ADM-2026-017', first: 'Peter', last: 'Kamau', gender: 'MALE', dob: '2014-01-09' },
          { adm: 'ADM-2026-018', first: 'Cynthia', last: 'Chepkemoi', gender: 'FEMALE', dob: '2014-10-21' },
          { adm: 'ADM-2026-019', first: 'Joseph', last: 'Ochieng', gender: 'MALE', dob: '2014-04-12' },
          { adm: 'ADM-2026-020', last: 'Naomi', first: 'Njeri', gender: 'FEMALE', dob: '2014-06-05' },
        ]
      },
      {
        classroomId: classIdG4,
        gradeLevel: 'GRADE_4',
        streamId: 'stream-g4-alpha',
        streamName: 'Stream Alpha',
        learningAreas: learningAreasG4,
        students: [
          { adm: 'ADM-2026-021', first: 'Titus', last: 'Kipruto', gender: 'MALE', dob: '2014-09-14' },
          { adm: 'ADM-2026-022', first: 'Beatrice', last: 'Awino', gender: 'FEMALE', dob: '2014-03-01' },
          { adm: 'ADM-2026-023', first: 'Alex', last: 'Kariuki', gender: 'MALE', dob: '2014-07-19' },
          { adm: 'ADM-2026-024', first: 'Prudence', last: 'Wambui', gender: 'FEMALE', dob: '2014-11-28' },
          { adm: 'ADM-2026-025', first: 'Gideon', last: 'Kiprotich', gender: 'MALE', dob: '2014-05-06' },
          { adm: 'ADM-2026-026', first: 'Diana', last: 'Adhiambo', gender: 'FEMALE', dob: '2014-08-23' },
          { adm: 'ADM-2026-027', first: 'Mark', last: 'Waweru', gender: 'MALE', dob: '2014-02-18' },
          { adm: 'ADM-2026-028', first: 'Peris', last: 'Chepkoech', gender: 'FEMALE', dob: '2014-12-11' },
          { adm: 'ADM-2026-029', first: 'Timothy', last: 'Kiptoo', gender: 'MALE', dob: '2014-04-30' },
          { adm: 'ADM-2026-030', first: 'Ruth', last: 'Anyango', gender: 'FEMALE', dob: '2014-10-02' },
        ]
      },
      {
        classroomId: classIdG5,
        gradeLevel: 'GRADE_5',
        streamId: '6139f68a-5e94-4af8-870a-f90d1e4540cd',
        streamName: 'Grade 5 Alpha',
        learningAreas: learningAreasG5,
        students: [
          { adm: 'ADM-2026-031', first: 'Kelvin', last: 'Ndungu', gender: 'MALE', dob: '2013-02-10' },
          { adm: 'ADM-2026-032', first: 'Joy', last: 'Muthoni', gender: 'FEMALE', dob: '2013-05-14' },
          { adm: 'ADM-2026-033', first: 'Patrick', last: 'Barasa', gender: 'MALE', dob: '2013-08-22' },
          { adm: 'ADM-2026-034', first: 'Stacy', last: 'Kwamboka', gender: 'FEMALE', dob: '2013-11-09' },
          { adm: 'ADM-2026-035', first: 'Allan', last: 'Kiptanui', gender: 'MALE', dob: '2013-01-30' },
          { adm: 'ADM-2026-036', first: 'Maureen', last: 'Achieng', gender: 'FEMALE', dob: '2013-04-18' },
          { adm: 'ADM-2026-037', first: 'Derrick', last: 'Macharia', gender: 'MALE', dob: '2013-07-12' },
          { adm: 'ADM-2026-038', first: 'Ivy', last: 'Chelangat', gender: 'FEMALE', dob: '2013-09-25' },
          { adm: 'ADM-2026-039', first: 'Felix', last: 'Otieno', gender: 'MALE', dob: '2013-03-05' },
          { adm: 'ADM-2026-040', first: 'Vivian', last: 'Njoki', gender: 'FEMALE', dob: '2013-12-17' },
        ]
      },
      {
        classroomId: classIdG6,
        gradeLevel: 'GRADE_6',
        streamId: 'stream-g6-blue',
        streamName: 'Stream Blue',
        learningAreas: learningAreasG6,
        students: [
          { adm: 'ADM-2026-041', first: 'Eric', last: 'Mwangi', gender: 'MALE', dob: '2012-03-12' },
          { adm: 'ADM-2026-042', first: 'Purity', last: 'Chepkirui', gender: 'FEMALE', dob: '2012-06-25' },
          { adm: 'ADM-2026-043', first: 'Collins', last: 'Wafula', gender: 'MALE', dob: '2012-09-08' },
          { adm: 'ADM-2026-044', first: 'Sharon', last: 'Wangari', gender: 'FEMALE', dob: '2012-12-14' },
          { adm: 'ADM-2026-045', first: 'Evans', last: 'Kipkemboi', gender: 'MALE', dob: '2012-02-19' },
          { adm: 'ADM-2026-046', first: 'Millicent', last: 'Anyango', gender: 'FEMALE', dob: '2012-05-30' },
          { adm: 'ADM-2026-047', first: 'George', last: 'Kilonzo', gender: 'MALE', dob: '2012-08-11' },
          { adm: 'ADM-2026-048', first: 'Mercy', last: 'Jebet', gender: 'FEMALE', dob: '2012-10-23' },
          { adm: 'ADM-2026-049', first: 'Simon', last: 'Mutiso', gender: 'MALE', dob: '2012-01-17' },
          { adm: 'ADM-2026-050', first: 'Christine', last: 'Akoth', gender: 'FEMALE', dob: '2012-07-04' },
        ]
      }
    ];

    let totalStudentsInserted = 0;
    let totalAssessmentsInserted = 0;
    let totalReportCardsInserted = 0;

    for (const cls of classesData) {
      console.log(`📝 Inserting 10 students and random marks for class: ${cls.streamName} (${cls.gradeLevel})...`);

      for (const s of cls.students) {
        const studentId = `std-${s.adm.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        // Insert Student
        await client.query(`
          INSERT INTO students (
            id, admission_number, upi_number, first_name, last_name, 
            date_of_birth, gender, grade_level, classroom_id, stream_id, 
            school_id, academic_year_id, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'school-001', 'year-2026', 'ACTIVE')
          ON CONFLICT (id) DO UPDATE SET 
            stream_id = EXCLUDED.stream_id,
            classroom_id = EXCLUDED.classroom_id,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            updated_at = NOW()
        `, [
          studentId,
          s.adm,
          `UPI-${s.adm}`,
          s.first,
          s.last,
          s.dob,
          s.gender,
          cls.gradeLevel,
          cls.classroomId,
          cls.streamId
        ]);
        totalStudentsInserted++;

        // Generate RANDOM marks for this student across all learning areas:
        // Student base proficiency is randomized between 45 and 92
        const studentBaseProficiency = Math.floor(Math.random() * 48) + 45;
        let studentTotalScore = 0;
        const learningAreaAssessmentsForReportCard: any[] = [];

        for (const la of cls.learningAreas) {
          // Subject specific random variance (-12 to +12)
          const subjectRandomJitter = Math.floor(Math.random() * 25) - 12;
          // Resulting raw score clamped between 35 and 99
          const rawScore = Math.max(35, Math.min(99, studentBaseProficiency + subjectRandomJitter));
          studentTotalScore += rawScore;

          // CBC Performance Level:
          // EE: 80 - 100, ME: 65 - 79, AE: 50 - 64, BE: below 50
          const level = rawScore >= 80 ? 'EE' : rawScore >= 65 ? 'ME' : rawScore >= 50 ? 'AE' : 'BE';

          const strandScores = [
            { strandTitle: 'Strand 1 - Core Competencies', rawScore: Math.min(100, Math.max(30, rawScore + Math.floor(Math.random() * 5) - 2)), maxScore: 100 },
            { strandTitle: 'Strand 2 - Practical Application', rawScore: Math.min(100, Math.max(30, rawScore + Math.floor(Math.random() * 5) - 2)), maxScore: 100 },
          ];

          const summativeId = `sum-${studentId}-${la.code}-t3-2026`;
          await client.query(`
            INSERT INTO summative_assessments (
              id, student_id, teacher_id, learning_area_id, term_id, 
              academic_year_id, strand_scores, overall_performance_level, 
              teacher_remarks, evaluation_date
            )
            VALUES ($1, $2, 'teacher-001', $3, 'term-2026-t3', 'year-2026', $4, $5, $6, '2026-10-05')
            ON CONFLICT (id) DO UPDATE SET 
              strand_scores = EXCLUDED.strand_scores,
              overall_performance_level = EXCLUDED.overall_performance_level,
              teacher_remarks = EXCLUDED.teacher_remarks,
              updated_at = NOW()
          `, [
            summativeId,
            studentId,
            la.id,
            JSON.stringify(strandScores),
            level,
            level === 'EE' ? 'Exceeds all required strand indicators.' : level === 'ME' ? 'Consistently meets learning outcomes.' : level === 'AE' ? 'Approaching expectation, needs practice.' : 'Requires ongoing targeted scaffolding.'
          ]);
          totalAssessmentsInserted++;

          learningAreaAssessmentsForReportCard.push({
            learningAreaId: la.id,
            learningAreaName: la.name,
            performanceLevel: level,
            score: rawScore,
            rawScore: rawScore,
            teacherRemarks: `Performance level: ${level}`
          });
        }

        const avgScore = Math.round(studentTotalScore / cls.learningAreas.length);
        const overallLvl = avgScore >= 80 ? 'EE' : avgScore >= 65 ? 'ME' : avgScore >= 50 ? 'AE' : 'BE';

        const reportCardId = `rc-${studentId}-t3-2026`;
        await client.query(`
          INSERT INTO CBC_report_cards (
            id, student_id, term_id, academic_year_id, grade_level, stream_id,
            learning_area_assessments, core_competency_assessments, value_assessments,
            attendance_days_present, attendance_days_total,
            overall_average_score, overall_performance_level,
            class_teacher_remarks, head_teacher_remarks, closing_date, next_term_opening_date
          )
          VALUES ($1, $2, 'term-2026-t3', 'year-2026', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '2026-11-20', '2027-01-04')
          ON CONFLICT (id) DO UPDATE SET 
            learning_area_assessments = EXCLUDED.learning_area_assessments,
            overall_average_score = EXCLUDED.overall_average_score,
            overall_performance_level = EXCLUDED.overall_performance_level,
            updated_at = NOW()
        `, [
          reportCardId,
          studentId,
          cls.gradeLevel,
          cls.streamId,
          JSON.stringify(learningAreaAssessmentsForReportCard),
          JSON.stringify({ "Communication": "Consistently expresses thoughts clearly.", "Collaboration": "Works harmoniously with peers." }),
          JSON.stringify({ "Respect": "Demonstrates high regard for peers and staff.", "Integrity": "Exhibits honesty in all assignments." }),
          Math.floor(Math.random() * 5) + 64,
          68,
          avgScore,
          overallLvl,
          overallLvl === 'EE' ? 'Outstanding student with praiseworthy effort.' : overallLvl === 'ME' ? 'Consistent learner with commendable effort.' : 'Shows potential, requires targeted assistance.',
          'Approved and promoted with commendations.'
        ]);
        totalReportCardsInserted++;
      }
    }

    console.log(`✅ Successfully seeded database with random marks:`);
    console.log(`   - Students Inserted: ${totalStudentsInserted}`);
    console.log(`   - Summative Assessments Inserted: ${totalAssessmentsInserted}`);
    console.log(`   - CBC Report Cards Inserted: ${totalReportCardsInserted}`);
    console.log(`   - Grade 4 Classes: Stream East (10), Stream West (10), Stream Alpha (10)`);
    console.log(`   - Grade 5 Class: Grade 5 Alpha (10)`);
    console.log(`   - Grade 6 Class: Stream Blue (10)`);
    console.log('🎉 Database seeding complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
