import { LessonPlan } from '../../src/core/domain/curriculum-plan/LessonPlan';
import { PostgresLessonPlanRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { CreateLessonPlanSchema } from '../../src/infrastructure/http/controllers/CurriculumPlanController';

it('validates and round-trips scheme experiences, assessment methods and step criteria through PostgreSQL metadata', async () => {
  const payload = CreateLessonPlanSchema.parse({ teacherId: 'teacher', schemeOfWorkEntryId: 'entry', learningAreaId: 'area', classRoomId: 'class', lessonDate: '2026-11-16', durationMinutes: 40, strand: 'Numbers', subStrand: 'Fractions', specificLearningOutcomes: ['Compare fractions'], keyInquiryQuestions: ['Which is larger?'], otherLearningAreas:['Art'],communityServiceActivities:'Share fraction models',nonFormalActivity:'Practise at home',assessmentRubric:Array.from({length:3},(_,i)=>({criterion:`Compare fraction ${i+1}`,exceeds:'Independently explains',meets:'Compares accurately',approaching:'Compares with support',below:'Needs more practice'})),learningExperiences: ['Compare paper models'], assessmentMethods: ['Observe comparisons'], learningResources: ['Paper'], coreCompetenciesAddressed: [], valuesAddressed: [], steps: [{ stepNumber: 1, stepTitle: 'Development', durationMinutes: 40, teacherActivities: 'Model', learnerActivities: 'Compare', learningPoints:'Compare equal parts',resources:'Paper models',assessmentCriterion: 'Correctly compare two fractions' }] });
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const repository = new PostgresLessonPlanRepository({ query } as any);
  await repository.save(LessonPlan.create(payload, 'plan'));
  const values = query.mock.calls[0][1];
  const details = JSON.parse(values[27]);
  expect(details.learningExperiences).toEqual(payload.learningExperiences);
  expect(details.assessmentMethods).toEqual(payload.assessmentMethods);
  query.mockResolvedValue({ rows: [{ id: 'plan', teacher_id: 'teacher', lesson_details: details, steps: JSON.parse(values[17]) }] });
  for (const restored of [await repository.findById('plan'), ...(await repository.findAll()), ...(await repository.findBySchemeEntryId('entry'))]) {
    expect(restored!.toJSON().otherLearningAreas).toEqual(payload.otherLearningAreas);
    expect(restored!.toJSON().communityServiceActivities).toEqual(payload.communityServiceActivities);
    expect(restored!.toJSON().nonFormalActivity).toEqual(payload.nonFormalActivity);
    expect(restored!.toJSON().assessmentRubric).toEqual(payload.assessmentRubric);
    expect(restored!.toJSON().steps[0].learningPoints).toBe('Compare equal parts');
    expect(restored!.toJSON().steps[0].resources).toBe('Paper models');
    expect(restored!.toJSON().learningExperiences).toEqual(payload.learningExperiences);
    expect(restored!.toJSON().assessmentMethods).toEqual(payload.assessmentMethods);
    expect(restored!.toJSON().steps[0].assessmentCriterion).toBe(payload.steps[0].assessmentCriterion);
  }
});

it('requires at least three complete rubric criteria when a rubric is supplied',()=>{expect(CreateLessonPlanSchema.partial().safeParse({assessmentRubric:[{criterion:'One'}]}).success).toBe(false);});
