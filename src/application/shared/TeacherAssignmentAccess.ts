import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { ForbiddenError } from '../../core/domain/shared/Errors';

export interface AcademicActor { userId: string; role: string; schoolId?: string }
export interface TeachingScope { schoolId?: string; classRoomId?: string; classroomId?: string; streamId?: string; learningAreaId?: string; academicYearId?: string; termId?: string; teacherId?: string; lessonDate?: string }
export const sameTerm = (a: string, b: string) => a.replace(/-t([1-3])$/, '-$1') === b.replace(/-t([1-3])$/, '-$1');
export const matchesTeachingCohort = (a: {classRoomId?: string; streamId?: string}, classId: string, streamId?: string) =>
  (a.classRoomId === classId || (!a.classRoomId && Boolean(a.streamId) && a.streamId === streamId))
  && (!a.streamId || Boolean(streamId && a.streamId === streamId));
const supervisors = ['SUPER_ADMIN','ADMIN','SCHOOL_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'];
export class TeacherAssignmentAccess {
  constructor(private academic: IAcademicRepository, private teachers: ITeacherRepository) {}
  async context(actor: AcademicActor, scope: TeachingScope = {}) {
    if (!actor?.schoolId) throw new ForbiddenError('A school-scoped account is required.');
    if (scope.schoolId && scope.schoolId !== actor.schoolId) throw new ForbiddenError('School access denied.');
    const year = scope.academicYearId ? await this.academic.findYearById(scope.academicYearId) : await this.academic.findCurrentYear(actor.schoolId);
    if (!year || year.schoolId !== actor.schoolId) throw new ForbiddenError('Academic year access denied.');
    const currentTerm = await this.academic.findCurrentTerm(year.id);
    let term = scope.termId ? await this.academic.findTermById(scope.termId) : currentTerm;
    if (!term && scope.termId) term = (await this.academic.findTermsByYear(year.id)).find(t => sameTerm(t.id, scope.termId!)) || null;
    if (!term || term.academicYearId !== year.id) throw new ForbiddenError('Select a valid academic year and term.');
    return { year, term, isCurrentPeriod: Boolean(year.isCurrent && currentTerm && sameTerm(currentTerm.id, term.id)) };
  }
  async assignments(actor: AcademicActor, scope: TeachingScope = {}) {
    const { year, term, isCurrentPeriod } = await this.context(actor, scope);
    const teacher = await this.teachers.findByUserId(actor.userId) || await this.teachers.findById(actor.userId);
    if (!teacher) throw new ForbiddenError('No teacher profile is linked to this account.');
    const [classes, subjects] = await Promise.all([
      this.academic.findClassTeacherAssignments({teacherId:teacher.id,schoolId:actor.schoolId,academicYearId:year.id,isActive:true}),
      this.academic.findSubjectTeacherAssignments({teacherId:teacher.id,schoolId:actor.schoolId,academicYearId:year.id,isActive:true})
    ]);
    const date = new Date().toISOString().slice(0,10);
    // Resolve the assignment once for the selected period. Eligible lesson dates are
    // calendar data, not a way for a caller to change the authorization date.
    // Historical/future periods use their bounds; current terms respect today's changes.
    const point = isCurrentPeriod
      ? date
      : date < term.startDate ? term.startDate : date > term.endDate ? term.endDate : date;
    const active = (a: any) => a.isActive && a.schoolId === actor.schoolId && a.academicYearId === year.id && (!a.effectiveFrom || a.effectiveFrom <= point) && (!a.effectiveTo || a.effectiveTo >= point);
    return {teacher,year,term,classes:classes.filter(active),subjects:subjects.filter(active)};
  }
  async can(actor: AcademicActor, scope: TeachingScope, privateWork = false): Promise<boolean> {
    try { await this.assert(actor,scope,privateWork); return true; } catch(e) { if(e instanceof ForbiddenError) return false; throw e; }
  }
  async canClassTeacher(actor:AcademicActor,scope:TeachingScope):Promise<boolean> {
    try {
      await this.assert(actor,scope);
      if(supervisors.includes(actor.role))return true;
      const assigned=await this.assignments(actor,scope);
      const classId=scope.classRoomId||scope.classroomId||(scope.streamId?(await this.academic.findStreamById(scope.streamId))?.classRoomId:undefined);
      return assigned.classes.some(a=>(a.classRoomId===classId||(!a.classRoomId&&a.streamId===scope.streamId))&&(!a.streamId||a.streamId===scope.streamId));
    }catch(e){if(e instanceof ForbiddenError)return false;throw e;}
  }
  /** Dictionary editing requires an explicit subject duty, never a class-teacher duty. */
  async editableLearningAreaIds(actor: AcademicActor, scope: TeachingScope = {}): Promise<string[]> {
    if (actor.role !== 'TEACHER') return [];
    const assigned = await this.assignments(actor, scope);
    const editable = new Set<string>();
    for (const assignment of assigned.subjects) {
      if (!['SUBJECT_TEACHER', 'SUBJECT_LEAD'].includes(assignment.role)) continue;
      const stream = assignment.streamId ? await this.academic.findStreamById(assignment.streamId) : null;
      if (assignment.streamId && (!stream || (assignment.classRoomId && stream.classRoomId !== assignment.classRoomId))) continue;
      const classId = assignment.classRoomId || stream?.classRoomId;
      if (!classId) continue;
      const classroom = await this.academic.findClassById(classId);
      const area = await this.academic.findLearningAreaById(assignment.learningAreaId);
      if (classroom && area && classroom.schoolId === actor.schoolId && area.schoolId === actor.schoolId && area.gradeLevel === classroom.gradeLevel) editable.add(area.id);
    }
    return [...editable];
  }
  async assertSubjectEditor(actor: AcademicActor, learningAreaId: string, gradeLevel?: string) {
    const area = await this.academic.findLearningAreaById(learningAreaId);
    if (!area || (actor.schoolId && area.schoolId !== actor.schoolId)) throw new ForbiddenError('Learning area access denied.');
    if (supervisors.includes(actor.role)) return;
    if (!actor.schoolId || (gradeLevel && gradeLevel !== area.gradeLevel) || !(await this.editableLearningAreaIds(actor)).includes(learningAreaId)) {
      throw new ForbiddenError('Only the assigned subject teacher can change this subject’s strands and sub-strands. Class-teacher access is view only.');
    }
  }
  async assertSubjectTeaching(actor: AcademicActor, scope: TeachingScope) {
    await this.assert(actor, scope);
    if (supervisors.includes(actor.role)) return;
    const assigned = await this.assignments(actor, scope);
    const classId = scope.classRoomId || scope.classroomId || (scope.streamId ? (await this.academic.findStreamById(scope.streamId))?.classRoomId : undefined);
    const permitted = assigned.subjects.some(a => ['SUBJECT_TEACHER', 'SUBJECT_LEAD'].includes(a.role)
      && a.learningAreaId === scope.learningAreaId
      && (a.classRoomId === classId || (!a.classRoomId && a.streamId === scope.streamId))
      && (!a.streamId || a.streamId === scope.streamId));
    if (!permitted) throw new ForbiddenError('Only the assigned subject teacher can plan this learning area. Class-teacher coverage access is view only.');
  }
  async assert(actor: AcademicActor, scope: TeachingScope, privateWork = false) {
    if (!actor?.schoolId || (scope.schoolId && scope.schoolId !== actor.schoolId)) throw new ForbiddenError('School access denied.');
    const classId = scope.classRoomId || scope.classroomId;
    const classroom = classId ? await this.academic.findClassById(classId) : null;
    if (classId && (!classroom || classroom.schoolId !== actor.schoolId)) throw new ForbiddenError('Class access denied.');
    const stream = scope.streamId ? await this.academic.findStreamById(scope.streamId) : null;
    if (scope.streamId && (!stream || (classId && stream.classRoomId !== classId))) throw new ForbiddenError('Stream access denied.');
    const actualClass = classId || stream?.classRoomId;
    if (!actualClass) throw new ForbiddenError('An explicit class or stream is required.');
    const resolvedClass = classroom || await this.academic.findClassById(actualClass);
    if (!resolvedClass || resolvedClass.schoolId !== actor.schoolId) throw new ForbiddenError('Class access denied.');
    if (scope.learningAreaId) {
      const area = await this.academic.findLearningAreaById(scope.learningAreaId);
      if (!area || area.schoolId !== actor.schoolId || area.gradeLevel !== resolvedClass.gradeLevel) throw new ForbiddenError('Learning area does not belong to this school and class.');
    }
    if (supervisors.includes(actor.role)) return;
    if (actor.role !== 'TEACHER') throw new ForbiddenError('Teaching access denied.');
    const assigned = await this.assignments(actor,scope);
    if (privateWork && scope.teacherId && ![actor.userId,assigned.teacher.id].includes(scope.teacherId)) throw new ForbiddenError('Another teacher’s private work requires a supervisory role.');
    const cohort = (a: {classRoomId?: string; streamId?: string}) => matchesTeachingCohort(a, actualClass, scope.streamId);
    const permitted = assigned.classes.some(cohort) || assigned.subjects.some(a => cohort(a) && (!scope.learningAreaId || a.learningAreaId === scope.learningAreaId));
    if (!permitted) throw new ForbiddenError('No active assignment permits this class, stream and learning area in the selected period.');
  }
}
