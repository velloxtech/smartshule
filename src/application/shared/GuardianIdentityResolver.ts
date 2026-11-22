import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { Guardian } from '../../core/domain/user/Guardian';
import { Student, StudentStatus } from '../../core/domain/user/Student';

export interface ResolveGuardianResult {
  guardian: Guardian | null;
  studentIds: string[];
  students: Student[];
  hasEnrolledChildren: boolean;
}

export class GuardianIdentityResolver {
  /**
   * Authoritatively resolves linked students for an authenticated user based on
   * server-verified identity and students.guardian_ids JSONB relationship.
   *
   * Security Invariant:
   * A family relationship requires a learner-side guardian link or an explicit normalized parent link.
   * Client-supplied guardian/student IDs and unverified guardian.student_ids arrays are never trusted.
   */
  public static async resolveLinkedStudentIdsForUser(params: {
    userId: string;
    userPhone?: string;
    userEmail?: string;
    permission?: 'finance' | 'academics';
    guardianRepository: IGuardianRepository;
    studentRepository: IStudentRepository;
    userRepository?: IUserRepository;
  }): Promise<ResolveGuardianResult> {
    const { userId, guardianRepository, studentRepository, userRepository } = params;

    // Account/profile and learner-side links are authoritative. Phone matches,
    // cached studentIds and demo identities must never grant family access.
    const guardian = await guardianRepository.findByUserId(userId);
    const user = userRepository ? await userRepository.findById(userId) : null;
    if (!guardian || guardian.userId !== userId || (userRepository && !user?.schoolId)) {
      return {guardian:null,studentIds:[],students:[],hasEnrolledChildren:false};
    }
    const permissions=await studentRepository.findParentPermissions?.(userId)||[];
    const byStudent=new Map(permissions.map(row=>[row.studentId,row]));
    const normalized=permissions.length ? await studentRepository.findByIds(permissions.map(row=>row.studentId)) : [];
    const candidates = [...normalized,...await studentRepository.findByGuardianId(guardian.id),
      ...await studentRepository.findByGuardianId(userId)];
    const students = [...new Map(candidates.filter(student =>
      (!user?.schoolId || student.schoolId === user.schoolId) &&
      (student.status === StudentStatus.ACTIVE || !student.status) &&
      (student.guardianIds.some(id => id === guardian.id || id === userId) || byStudent.has(student.id)) &&
      (params.permission !== 'finance' || byStudent.get(student.id)?.canViewFinances !== false) &&
      (params.permission !== 'academics' || byStudent.get(student.id)?.canViewAcademics !== false)
    ).map(student => [student.id,student])).values()];
    return {guardian,students,studentIds:students.map(student=>student.id),hasEnrolledChildren:students.length>0};
  }
}
