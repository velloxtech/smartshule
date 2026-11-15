import { AppContainer } from '../../src/infrastructure/container';
import { Pool, PoolClient } from 'pg';
import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import { PostgresCBCAssessmentRepository, PostgresStudentRepository, PostgresAcademicRepository, PostgresAttendanceRepository, PostgresLessonPlanRepository, PostgresGuardianRepository, PostgresUserRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { assessmentScore } from '../../src/core/domain/cbc/AssessmentScore';
import { PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';
import { LessonPlan } from '../../src/core/domain/curriculum-plan/LessonPlan';
import { UserRole } from '../../src/core/domain/user/User';

// This suite must never fall back to .env or a production URL.
const url = process.env.INVESTIGATION_DATABASE_URL;
if (url && (!['localhost', '127.0.0.1'].includes(new URL(url).hostname) || new URL(url).pathname !== '/smartshule_investigation')) {
  throw new Error('Set INVESTIGATION_DATABASE_URL to the isolated localhost smartshule_investigation database.');
}
(url ? describe : describe.skip)('Assessment investigation against isolated PostgreSQL', () => {
  let pool: Pool, client: PoolClient, repo: PostgresCBCAssessmentRepository, useCases: CBCAssessmentUseCases;
  let learner: any;
  beforeAll(async () => {
    pool = new Pool({connectionString:url});
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS lesson_details JSONB NOT NULL DEFAULT '{}'");
    const connection = client as unknown as Pool;
    repo = new PostgresCBCAssessmentRepository(connection);
    useCases = new CBCAssessmentUseCases(repo,new PostgresStudentRepository(connection),new PostgresAcademicRepository(connection),new PostgresAttendanceRepository(connection));
    await client.query("INSERT INTO learning_areas(id,name,code,grade_level,education_level,school_id) VALUES('local-investigation-math','Local Investigation Mathematics','LOCALMATH','GRADE_3','LOWER_PRIMARY','school-001')");
    learner = (await client.query("SELECT * FROM students WHERE grade_level='GRADE_3' AND school_id='school-001' LIMIT 1")).rows[0];
  });
  afterAll(async()=> {if(client){await client.query('ROLLBACK');client.release();}if(pool)await pool.end();});
  it('flags the real 150/100 case without altering or capping its raw score', async()=> {
    const records = await repo.findSummatives({termId:'term-2026-t3',academicYearId:'year-2026'});
    const example = records.find(r=>r.strandScores?.some?.(s=>s.rawScore===150 && s.maxScore===100));
    expect(example).toBeDefined();
    const result = await useCases.listSummativeAssessments({studentId:example!.studentId,termId:'term-2026-t3',academicYearId:'year-2026'});
    const row = result.find(r=>r.id===example!.id || r.duplicateIds?.includes(example!.id))!;
    expect(row.rawScore).toBe(150); expect(row.maxScore).toBe(100);
    expect(row.percentageScore).toBeUndefined(); expect(row.scoreIssue).toContain('exceeds');
    expect((await repo.findSummativeById(example!.id))!.strandScores[0].rawScore).toBe(150);
  });
  it('normalizes non-100 maximums and retains a genuine zero',()=> {
    expect(assessmentScore([{rawScore:30,maxScore:40},{rawScore:15,maxScore:20}]).percentageScore).toBe(75);
    expect(assessmentScore([{rawScore:0,maxScore:50}]).percentageScore).toBe(0);
    expect(assessmentScore([{rawScore:1,maxScore:100}]).percentageScore).toBe(1);
    expect(assessmentScore([{rawScore:20}]).scoreIssue).toBeDefined();
    expect(assessmentScore([{rawScore:30,maxScore:20},{rawScore:0,maxScore:100}]).scoreIssue).toBeDefined();
  });
  it('flags disagreeing historical uploads without selecting the higher score', async()=> {
    const before=(await client.query("SELECT id,strand_scores FROM summative_assessments WHERE student_id='student-g3-002' AND learning_area_id='la-g3-senv' ORDER BY id")).rows;
    const results=await useCases.listSummativeAssessments({studentId:'student-g3-002',termId:'term-2026-t3',academicYearId:'year-2026'});
    const result=results.find(r=>r.learningAreaId==='la-g3-senv')!;
    expect(result.scoreIssue).toContain('Conflicting');
    expect(result.percentageScore).toBeUndefined();
    expect(result.duplicateIds?.length).toBeGreaterThan(1);
    const after=(await client.query("SELECT id,strand_scores FROM summative_assessments WHERE student_id='student-g3-002' AND learning_area_id='la-g3-senv' ORDER BY id")).rows;
    expect(after).toEqual(before);
  });
  it('persists an admission-number upload under the real learner ID and retrieves both Term 3 spellings', async()=> {
    const dto={studentId:learner.admission_number,teacherId:'admin',learningAreaId:'local-investigation-math',termId:'term-2026-t3',academicYearId:'year-2026',strandScores:[{rawScore:30,maxScore:40,performanceLevel:PerformanceLevel.MEETING_EXPECTATIONS}],overallPerformanceLevel:PerformanceLevel.MEETING_EXPECTATIONS};
    const saved=await useCases.recordSummativeAssessment(dto);
    expect(saved.studentId).toBe(learner.id);
    for(const termId of ['term-2026-3','term-2026-t3']) {
      const rows=await useCases.listSummativeAssessments({studentId:learner.id,termId,academicYearId:'year-2026'});
      expect(rows.find(r=>r.id===saved.id || r.duplicateIds?.includes(saved.id))?.percentageScore).toBe(75);
    }
    await expect(useCases.recordSummativeAssessment({...dto,strandScores:[{rawScore:1,maxScore:0,performanceLevel:PerformanceLevel.MEETING_EXPECTATIONS}]})).rejects.toThrow('Maximum');
    await expect(useCases.recordSummativeAssessment({...dto,strandScores:[{rawScore:150,maxScore:100,performanceLevel:PerformanceLevel.EXCEEDING_EXPECTATIONS}]})).rejects.toThrow('cannot exceed');
  });
  it('returns the same percentage for an authorized parent and denies another child', async()=> {
    // Guardian links are independently checked by the existing identity resolver suites.
    jest.spyOn(useCases,'getLinkedStudentIdsForUser').mockResolvedValue([learner.id]);
    const rows=await useCases.listSummativeAssessments({studentId:learner.id,termId:'term-2026-3',academicYearId:'year-2026',requestingUser:{userId:'local-parent',role:UserRole.PARENT}});
    expect(rows.some(r=>r.percentageScore===75)).toBe(true);
    await expect(useCases.listSummativeAssessments({studentId:'another-child',requestingUser:{userId:'local-parent',role:UserRole.PARENT}})).rejects.toThrow('Access denied');
  });
  it('parent portal includes every subject beyond the old five-record cutoff', async()=> {
    const linked = (await client.query("SELECT g.user_id,s.id FROM guardians g JOIN students s ON g.student_ids @> jsonb_build_array(s.id) WHERE s.school_id='school-001' AND s.grade_level='GRADE_3' LIMIT 1")).rows[0];
    expect(linked).toBeDefined();
    const connection=client as unknown as Pool;
    const container=new AppContainer({CBCAssessmentRepository:repo,studentRepository:new PostgresStudentRepository(connection),academicRepository:new PostgresAcademicRepository(connection),guardianRepository:new PostgresGuardianRepository(connection),userRepository:new PostgresUserRepository(connection)});
    const data=await container.studentUseCases.getGuardianPortalData(linked.user_id);
    const children=Array.isArray(data) ? data : (data as any).children;
    const child=children.find((c:any)=>c.id===linked.id);
    expect(child.CBC.latestEvaluations.length).toBeGreaterThan(5);
    const admin=await useCases.listSummativeAssessments({studentId:linked.id});
    expect(child.CBC.latestEvaluations.map((r:any)=>r.id).sort()).toEqual(admin.map(r=>r.id).sort());
    expect(child.CBC.latestEvaluations.map((r:any)=>r.percentageScore)).toEqual(admin.map(r=>r.percentageScore));
  });
  it('round-trips lesson metadata and retains it when updating reflection', async()=> {
    const r=new PostgresLessonPlanRepository(client as unknown as Pool);
    const plan=LessonPlan.create({teacherId:'admin',learningAreaId:'la-g3-mat',classRoomId:learner.classroom_id,lessonDate:'2026-11-12',durationMinutes:40,rollBoys:12,rollGirls:14,strand:'Numbers',subStrand:'Fractions',specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['How do fractions compare?'],coreCompetenciesAddressed:[],valuesAddressed:[],learningResources:['Fraction chart'],steps:[],weekNumber:3,lessonNumber:2,lessonTime:'09:00–09:40',pcis:['Safety']},'local-investigation-lesson');
    await r.save(plan);
    const loaded=(await r.findById(plan.id))!;
    expect(loaded.toJSON()).toMatchObject({weekNumber:3,lessonNumber:2,pcis:['Safety'],rollBoys:12});
    loaded.setReflection('Repeat practical comparison'); await r.update(loaded);
    expect((await r.findById(plan.id))!.toJSON().pcis).toEqual(['Safety']);
  });
});
