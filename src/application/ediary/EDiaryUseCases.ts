import { IEDiaryRepository, EDiaryFilterCriteria } from '../../core/ports/repositories/IEDiaryRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { EDiaryEntry } from '../../core/domain/ediary/EDiaryEntry';
import { UserRole } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateEDiaryEntryDTO {
  schoolId: string;
  streamId: string;
  studentId?: string;
  teacherId: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  title: string;
  homework: string;
  teacherRemarks?: string;
  requirementsTomorrow?: string;
}

export interface AcknowledgeEDiaryDTO {
  entryId: string;
  studentId: string;
  guardianUserId: string;
  note?: string;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
}

export class EDiaryUseCases {
  constructor(
    private readonly ediaryRepository: IEDiaryRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository
  ) {}

  public async createEntry(dto: CreateEDiaryEntryDTO) {
    if (!dto.date || !dto.title || !dto.homework) {
      throw new ValidationError('Date, title, and homework details are required for eDiary entry');
    }

    const entry = EDiaryEntry.create(
      {
        schoolId: dto.schoolId,
        streamId: dto.streamId,
        studentId: dto.studentId,
        teacherId: dto.teacherId,
        teacherName: dto.teacherName,
        date: dto.date,
        title: dto.title,
        homework: dto.homework,
        teacherRemarks: dto.teacherRemarks,
        requirementsTomorrow: dto.requirementsTomorrow,
        acknowledgements: []
      },
      IdGenerator.generate()
    );

    await this.ediaryRepository.save(entry);
    return entry.toJSON();
  }

  public async listEntriesForStudent(
    studentId: string,
    requestingUser?: UserContext,
    limit = 20
  ) {
    // Parent data isolation check
    if (requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(requestingUser.userId);
      if (!guardian || !guardian.studentIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view eDiary entries for your linked children.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    const entries = await this.ediaryRepository.findByStudent(student.id, student.streamId, limit);

    return entries.map(entry => {
      const ack = entry.acknowledgements.find(a => a.studentId === studentId);
      return {
        ...entry.toJSON(),
        isAcknowledgedByParent: !!ack,
        parentAcknowledgement: ack || null,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber
      };
    });
  }

  public async listEntriesForStream(streamId: string, date?: string) {
    const entries = await this.ediaryRepository.findByStream(streamId, date);
    return entries.map(e => e.toJSON());
  }

  public async acknowledgeEntry(dto: AcknowledgeEDiaryDTO) {
    const guardian = await this.guardianRepository.findByUserId(dto.guardianUserId);
    if (!guardian) {
      throw new NotFoundError('Guardian profile for User', dto.guardianUserId);
    }

    if (!guardian.studentIds.includes(dto.studentId)) {
      throw new ForbiddenError('Access denied: You can only acknowledge diary entries for your linked children.');
    }

    const entry = await this.ediaryRepository.findById(dto.entryId);
    if (!entry) {
      throw new NotFoundError('eDiary entry', dto.entryId);
    }

    const guardianUser = await this.userRepository.findById(dto.guardianUserId);
    const parentName = guardianUser ? guardianUser.fullName : 'Parent / Guardian';

    entry.addAcknowledgement({
      guardianId: guardian.id,
      guardianName: parentName,
      studentId: dto.studentId,
      signedAt: new Date().toISOString(),
      note: dto.note
    });

    await this.ediaryRepository.update(entry);

    return {
      success: true,
      message: 'eDiary entry acknowledged successfully',
      entry: entry.toJSON()
    };
  }
}
