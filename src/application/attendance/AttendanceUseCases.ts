import { IAttendanceRepository, AttendanceFilterCriteria } from '../../core/ports/repositories/ITimetableRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository, ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import { UserContext } from '../students/StudentUseCases';
import {
  AttendanceRegister,
  AttendanceStatus,
  AttendanceType,
  StudentAttendanceEntry,
  AbsenceFollowUp
} from '../../core/domain/attendance/Attendance';
import { IdGenerator, NotFoundError, ForbiddenError } from '../../core/domain/shared/Errors';
import { UserRole } from '../../core/domain/user/User';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';

export interface MarkAttendanceDTO {
  schoolId: string;
  classRoomId: string;
  streamId?: string;
  academicYearId: string;
  termId: string;
  date: string; // YYYY-MM-DD
  type: AttendanceType;
  markedByTeacherId: string;
  entries: {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
  notifyGuardiansForAbsence?: boolean;
}

export class AttendanceUseCases {
  constructor(
    private readonly attendanceRepository: IAttendanceRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly teacherRepository?: ITeacherRepository,
    private readonly academicRepository?: IAcademicRepository
  ) {}

  private async assertTeacherAssignedToClass(classRoomId?: string, streamId?: string, requestingUser?: UserContext) {
    if (!requestingUser || requestingUser.role !== UserRole.TEACHER) return;
    if (!this.teacherRepository) return;

    let teacher = await this.teacherRepository.findByUserId(requestingUser.userId);
    if (!teacher) teacher = await this.teacherRepository.findById(requestingUser.userId);
    if (!teacher) {
      throw new ForbiddenError('No teacher profile associated with your account.');
    }

    const assignedStreams = new Set<string>(teacher.assignedClassStreamIds || []);
    const assignedClasses = new Set<string>();

    if (this.academicRepository) {
      try {
        const ctas = await this.academicRepository.findClassTeacherAssignments({ teacherId: teacher.id, isActive: true });
        for (const a of ctas) {
          if (a.streamId) assignedStreams.add(a.streamId);
          if (a.classRoomId) assignedClasses.add(a.classRoomId);
        }
      } catch {}

      try {
        const stas = await this.academicRepository.findSubjectTeacherAssignments({ teacherId: teacher.id, isActive: true });
        for (const s of stas) {
          if (s.streamId) assignedStreams.add(s.streamId);
          if (s.classRoomId) assignedClasses.add(s.classRoomId);
        }
      } catch {}
    }

    const streamMatches = streamId && (assignedStreams.has(streamId) || assignedClasses.has(streamId));
    const classMatches = classRoomId && assignedClasses.has(classRoomId);

    if (!streamMatches && !classMatches) {
      throw new ForbiddenError('Access denied: You are not authorized to mark or view attendance for this class or stream.');
    }
  }

  public async markAttendance(dto: MarkAttendanceDTO, requestingUser?: UserContext) {
    if (requestingUser && requestingUser.role === UserRole.TEACHER) {
      await this.assertTeacherAssignedToClass(dto.classRoomId, dto.streamId, requestingUser);
    }

    let register = await this.attendanceRepository.findRegister(dto.streamId || '', dto.date, dto.type, dto.classRoomId);

    const formattedEntries: StudentAttendanceEntry[] = [];
    for (const item of dto.entries) {
      const student = await this.studentRepository.findById(item.studentId);
      let parentNotified = false;

      // SMS alert trigger for absent students if flag is on
      if (dto.notifyGuardiansForAbsence && item.status === AttendanceStatus.ABSENT && student) {
        const guardians = await this.guardianRepository.findByStudentId(student.id);
        for (const g of guardians) {
          const u = await this.userRepository.findById(g.userId);
          if (u && u.phone) {
            await this.notificationService.sendSms(
              u.phone,
              `Grace Seeds School Alert: Dear Parent, please note that ${student.fullName} (Adm: ${student.admissionNumber}) was marked ABSENT today (${dto.date}).`
            );
            parentNotified = true;
          }
        }
      }

      formattedEntries.push({
        studentId: item.studentId,
        studentName: student ? student.fullName : 'Student',
        admissionNumber: student ? student.admissionNumber : '',
        status: item.status,
        remarks: item.remarks,
        parentNotified
      });
    }

    if (register) {
      for (const entry of formattedEntries) {
        register.markEntry(entry);
      }
      await this.attendanceRepository.updateRegister(register);
    } else {
      register = AttendanceRegister.create(
        {
          schoolId: dto.schoolId,
          classRoomId: dto.classRoomId,
          streamId: dto.streamId || '',
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          date: dto.date,
          type: dto.type,
          markedByTeacherId: dto.markedByTeacherId,
          entries: formattedEntries
        },
        IdGenerator.generate()
      );
      await this.attendanceRepository.saveRegister(register);
    }

    return register.toJSON();
  }

  public async getDailyRegister(streamId: string, date: string, type: AttendanceType = AttendanceType.DAILY_MORNING, classRoomId?: string, requestingUser?: UserContext) {
    if (requestingUser && requestingUser.role === UserRole.TEACHER) {
      await this.assertTeacherAssignedToClass(classRoomId, streamId, requestingUser);
    }
    const register = await this.attendanceRepository.findRegister(streamId, date, type, classRoomId);
    if (!register) throw new NotFoundError('Attendance Register for the specified date');
    return register.toJSON();
  }

  public async getAttendanceReport(filters: AttendanceFilterCriteria) {
    const registers = await this.attendanceRepository.findRegisters(filters);
    const totalSessions = registers.length;

    let totalPossibleAttendances = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalSick = 0;

    for (const reg of registers) {
      totalPossibleAttendances += reg.summary.total;
      totalPresent += reg.summary.present;
      totalAbsent += reg.summary.absent;
      totalLate += reg.summary.late;
      totalExcused += reg.summary.excused || 0;
      totalSick += reg.summary.sick || 0;
    }

    return {
      totalRegisters: totalSessions,
      aggregateStats: {
        totalCheckins: totalPossibleAttendances,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused + totalSick,
        overallAttendanceRate: totalPossibleAttendances > 0
          ? Math.round(((totalPresent + totalLate) / totalPossibleAttendances) * 100)
          : 100
      },
      registers: registers.map(r => r.toJSON())
    };
  }

  public async recordAbsenceFollowUp(
    registerId: string,
    studentId: string,
    followUpData: Partial<AbsenceFollowUp>,
    requestingUser?: { userId?: string; id?: string; fullName?: string; name?: string; role?: string }
  ) {
    const register = await this.attendanceRepository.findRegisterById(registerId);
    if (!register) throw new NotFoundError('Attendance Register', registerId);

    const followUp: AbsenceFollowUp = {
      contactedAt: followUpData.contactedAt || new Date().toISOString(),
      contactMethod: followUpData.contactMethod || 'PHONE_CALL',
      contactedByUserId: requestingUser?.userId || requestingUser?.id || followUpData.contactedByUserId || 'staff-01',
      contactedByName: requestingUser?.fullName || requestingUser?.name || followUpData.contactedByName || 'School Management',
      guardianResponse: followUpData.guardianResponse,
      resolutionStatus: followUpData.resolutionStatus || 'RESOLVED',
      assignedTo: followUpData.assignedTo,
      notes: followUpData.notes
    };

    register.updateEntryFollowUp(studentId, followUp);
    await this.attendanceRepository.updateRegister(register);
    return register.toJSON();
  }

  public async getStudentAttendanceSummary(studentId: string, termId: string, academicYearId: string, requestingUser?: { userId: string; role: UserRole; isGuardianRoute?: boolean }) {
    const isParent = requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.GUARDIAN || Boolean((requestingUser as any)?.isGuardianRoute);
    if (isParent && requestingUser) {
      const res = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
        userId: requestingUser.userId,
        guardianRepository: this.guardianRepository,
        studentRepository: this.studentRepository,
        userRepository: this.userRepository
      });

      if (!res.studentIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view attendance for your registered children.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);

    const registers = await this.attendanceRepository.findRegisters({
      streamId: student.streamId,
      termId,
      academicYearId
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let sick = 0;
    const history = [];

    for (const reg of registers) {
      const entry = reg.entries.find(e => e.studentId === studentId);
      if (entry) {
        if (entry.status === AttendanceStatus.PRESENT) present++;
        else if (entry.status === AttendanceStatus.ABSENT) absent++;
        else if (entry.status === AttendanceStatus.LATE) late++;
        else if (entry.status === AttendanceStatus.EXCUSED) excused++;
        else if (entry.status === AttendanceStatus.SICK) sick++;

        history.push({
          date: reg.date,
          type: reg.type,
          status: entry.status,
          remarks: entry.remarks
        });
      }
    }

    const total = present + absent + late + excused + sick;

    return {
      studentId: student.id,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      stats: {
        totalDays: total,
        present,
        absent,
        late,
        excused,
        sick,
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 100
      },
      history
    };
  }
}