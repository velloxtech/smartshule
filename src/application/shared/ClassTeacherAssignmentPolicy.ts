import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';

/** Moving a class teacher transfers their duty; subject assignments are independent. */
export async function releasePreviousClassTeacherDuty(
  academic: IAcademicRepository,
  target: { schoolId: string; academicYearId: string; teacherId: string; classRoomId: string; streamId?: string; effectiveFrom?: string },
  teachers?: ITeacherRepository
) {
  const previous = await academic.findClassTeacherAssignments({
    schoolId: target.schoolId, academicYearId: target.academicYearId,
    teacherId: target.teacherId, isActive: true
  });
  for (const assignment of previous) {
    if (assignment.classRoomId === target.classRoomId && (assignment.streamId || '') === (target.streamId || '')) continue;
    assignment.deactivate(target.effectiveFrom);
    await academic.saveClassTeacherAssignment(assignment);
    if (assignment.streamId) {
      const stream = await academic.findStreamById(assignment.streamId);
      if (stream?.classTeacherId === target.teacherId) {
        stream.setClassTeacher(undefined);
        await academic.updateStream(stream);
      }
      const teacher = teachers ? await teachers.findById(target.teacherId) : null;
      if (teacher) {
        teacher.removeStream(assignment.streamId);
        await teachers!.update(teacher);
      }
    }
  }
}
