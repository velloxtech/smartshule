import { IAttendanceRepository, AttendanceFilterCriteria } from '../../core/ports/repositories/ITimetableRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import {
  AttendanceRegister,
  AttendanceStatus,
  AttendanceType,
  StudentAttendanceEntry
} from '../../core/domain/attendance/Attendance';
import { IdGenerator, NotFoundError, ForbiddenError } from '../../core/domain/shared/Errors';
import { UserRole } from '../../core/domain/user/User';

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
    private readonly notificationService: INotificationService
  ) {}

  public async markAttendance(dto: MarkAttendanceDTO) {
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
              `SmartShule Alert: Dear Parent, please note that ${student.fullName} (Adm: ${student.admissionNumber}) was marked ABSENT today (${dto.date}).`
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

  public async getDailyRegister(streamId: string, date: string, type: AttendanceType = AttendanceType.DAILY_MORNING, classRoomId?: string) {
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

    for (const reg of registers) {
      totalPossibleAttendances += reg.summary.total;
      totalPresent += reg.summary.present;
      totalAbsent += reg.summary.absent;
      totalLate += reg.summary.late;
    }

    return {
      totalRegisters: totalSessions,
      aggregateStats: {
        totalCheckins: totalPossibleAttendances,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        overallAttendanceRate: totalPossibleAttendances > 0
          ? Math.round(((totalPresent + totalLate) / totalPossibleAttendances) * 100)
          : 100
      },
      registers: registers.map(r => r.toJSON())
    };
  }

  public async getStudentAttendanceSummary(studentId: string, termId: string, academicYearId: string, requestingUser?: { userId: string; role: UserRole }) {
    if (requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.GUARDIAN) {
      let guardian = await this.guardianRepository.findByUserId(requestingUser.userId);
      if (!guardian) {
        const user = await this.userRepository.findById(requestingUser.userId);
        if (user && user.phone) {
          guardian = await this.guardianRepository.findByPhone(user.phone);
        }
      }
      // Demo parent fallback
      if (guardian && (!guardian.studentIds || guardian.studentIds.length === 0)) {
        const user = await this.userRepository.findById(requestingUser.userId);
        if (user && (user.email === 'parent@smartshule.ac.ke' || user.id === 'usr-parent-01')) {
          const allS = await this.studentRepository.findAll();
          if (allS.length > 0) {
            const targetS = allS.find(s => s.id === 'student-001') || allS[0];
            guardian.linkStudent(targetS.id);
            await this.guardianRepository.update(guardian);
          }
        }
      }
      if (!guardian || !guardian.studentIds.includes(studentId)) {
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
