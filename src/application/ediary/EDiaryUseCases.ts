import { IEDiaryRepository, EDiaryFilterCriteria } from '../../core/ports/repositories/IEDiaryRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { EDiaryEntry, EDiaryHomeworkTask } from '../../core/domain/ediary/EDiaryEntry';
import { UserRole } from '../../core/domain/user/User';
import { StudentStatus } from '../../core/domain/user/Student';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';

export interface ParentEDiaryFeedFilters {
  studentId?: string;
  academicYearId?: string;
  termId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  limit?: number;
}

export interface CreateEDiaryEntryDTO {
  id?: string;
  schoolId: string;
  classRoomId?: string;
  streamId: string;
  studentId?: string;
  teacherId: string;
  teacherName?: string;
  academicYearId?: string;
  termId?: string;
  date: string; // YYYY-MM-DD
  title?: string;
  homework?: string;
  homeworkTasks?: Array<{
    learningArea: string;
    description: string;
    dueDate?: string;
  }>;
  teacherRemarks?: string;
  requirementsTomorrow?: string;
  tomorrowRequirements?: string[] | string;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface AcknowledgeEDiaryDTO {
  entryId: string;
  studentId?: string;
  guardianUserId: string;
  guardianName?: string;
  note?: string;
  parentNote?: string;
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
    private readonly userRepository: IUserRepository,
    private readonly academicRepository?: IAcademicRepository
  ) {}

  public async createEntry(dto: CreateEDiaryEntryDTO) {
    if (!dto.date || !dto.date.trim()) {
      throw new ValidationError('Date is required for eDiary entry');
    }
    if ((!dto.streamId || !dto.streamId.trim()) && (!dto.classRoomId || !dto.classRoomId.trim())) {
      throw new ValidationError('Stream ID or Classroom ID is required for eDiary entry');
    }
    if (!dto.schoolId || !dto.schoolId.trim()) {
      throw new ValidationError('School ID is required for eDiary entry');
    }

    // 1. Normalize homework tasks
    let normalizedTasks: EDiaryHomeworkTask[] = [];
    if (Array.isArray(dto.homeworkTasks)) {
      normalizedTasks = dto.homeworkTasks
        .filter(t => t && (t.learningArea || t.description))
        .map(t => ({
          learningArea: (t.learningArea || 'General').trim(),
          description: (t.description || '').trim(),
          dueDate: (t.dueDate || dto.date).trim()
        }));
    }

    if (normalizedTasks.length === 0 && dto.homework && dto.homework.trim()) {
      normalizedTasks = [
        {
          learningArea: 'General Homefun',
          description: dto.homework.trim(),
          dueDate: dto.date
        }
      ];
    }

    const hasTasks = normalizedTasks.length > 0;
    const hasRemarks = Boolean(dto.teacherRemarks && dto.teacherRemarks.trim());
    const hasHomework = Boolean(dto.homework && dto.homework.trim());

    if (!hasTasks && !hasRemarks && !hasHomework) {
      throw new ValidationError('At least one homefun activity or teacher remark is required to record an eDiary entry');
    }

    // 2. Synthesize homework summary text (for WhatsApp & backward compatibility)
    const homework = (
      dto.homework && dto.homework.trim()
        ? dto.homework.trim()
        : normalizedTasks.map(t => `${t.learningArea}: ${t.description}`).join('; ')
    );

    // 3. Normalize tomorrow's requirements
    let tomorrowRequirements: string[] = [];
    if (Array.isArray(dto.tomorrowRequirements)) {
      tomorrowRequirements = dto.tomorrowRequirements
        .map(r => String(r).trim())
        .filter(Boolean);
    } else if (typeof dto.tomorrowRequirements === 'string' && dto.tomorrowRequirements.trim()) {
      tomorrowRequirements = dto.tomorrowRequirements
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);
    } else if (dto.requirementsTomorrow && dto.requirementsTomorrow.trim()) {
      tomorrowRequirements = dto.requirementsTomorrow
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);
    }

    const requirementsTomorrow = (
      dto.requirementsTomorrow && dto.requirementsTomorrow.trim()
        ? dto.requirementsTomorrow.trim()
        : tomorrowRequirements.join(', ')
    );

    // 4. Default Title
    const title = (
      dto.title && dto.title.trim()
        ? dto.title.trim()
        : `Daily Homefun & Communication Diary (${dto.date})`
    );

    // 5. Resolve Teacher Name if not provided
    let teacherName = dto.teacherName;
    if (!teacherName && dto.teacherId) {
      try {
        const u = await this.userRepository.findById(dto.teacherId);
        if (u) teacherName = u.fullName;
      } catch {}
    }

    // 6. Resolve Academic Period if not provided
    let academicYearId = dto.academicYearId;
    let termId = dto.termId;
    if ((!academicYearId || !termId) && this.academicRepository) {
      try {
        const activeYear = await this.academicRepository.findCurrentYear(dto.schoolId);
        if (activeYear) {
          academicYearId = academicYearId || activeYear.id;
          const activeTerm = await this.academicRepository.findCurrentTerm(activeYear.id);
          if (activeTerm) {
            termId = termId || activeTerm.id;
          }
        }
      } catch {}
    }

    const status = dto.status || 'PUBLISHED';

    // 7. Update explicit entry if ID provided (allows draft editing and updating specific entry)
    let existingEntry: EDiaryEntry | null = null;
    if (dto.id && dto.id.trim()) {
      existingEntry = await this.ediaryRepository.findById(dto.id.trim());
    }

    if (existingEntry) {
      // Update ONLY the intended entry (never overwrites or modifies other entries)
      existingEntry.updateContent({
        title,
        homework,
        homeworkTasks: normalizedTasks,
        teacherRemarks: dto.teacherRemarks,
        tomorrowRequirements,
        requirementsTomorrow,
        status,
        teacherName: teacherName || existingEntry.teacherName,
        classRoomId: dto.classRoomId || existingEntry.classRoomId,
        academicYearId: academicYearId || existingEntry.academicYearId,
        termId: termId || existingEntry.termId
      });
      await this.ediaryRepository.update(existingEntry);
      return existingEntry.toJSON();
    }

    // 8. Create new distinct persistent entry with its own unique identifier
    const entry = EDiaryEntry.create(
      {
        schoolId: dto.schoolId,
        classRoomId: dto.classRoomId || dto.streamId || '',
        streamId: dto.streamId || '',
        studentId: dto.studentId,
        teacherId: dto.teacherId,
        teacherName,
        academicYearId,
        termId,
        date: dto.date,
        title,
        homework,
        homeworkTasks: normalizedTasks,
        teacherRemarks: dto.teacherRemarks,
        requirementsTomorrow,
        tomorrowRequirements,
        acknowledgements: [],
        status
      },
      IdGenerator.generate()
    );

    await this.ediaryRepository.save(entry);
    return entry.toJSON();
  }

  private async getGuardianForUser(userId: string) {
    let guardian = await this.guardianRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    if (!guardian && user) {
      if (user.phone) {
        guardian = await this.guardianRepository.findByPhone(user.phone);
      }
      if (!guardian) {
        const allG = await this.guardianRepository.findAll();
        guardian = allG.find(g => g.emergencyContact === user.phone || g.userId === user.id) || null;
      }
      if (guardian) {
        guardian.setUserId(user.id);
        await this.guardianRepository.update(guardian);
      }
    }

    // Link demo parent if needed
    if (guardian && (!guardian.studentIds || guardian.studentIds.length === 0)) {
      if (user && (user.email === 'parent@smartshule.ac.ke' || user.id === 'usr-parent-01')) {
        const allS = await this.studentRepository.findAll();
        if (allS.length > 0) {
          const targetS = allS.find(s => s.id === 'student-001') || allS[0];
          guardian.linkStudent(targetS.id);
          await this.guardianRepository.update(guardian);
        }
      }
    }
    return guardian;
  }

  public async getLinkedStudentIdsForUser(userId: string): Promise<string[]> {
    if (!this.guardianRepository || !this.studentRepository) return [];
    const res = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
      userId,
      guardianRepository: this.guardianRepository,
      studentRepository: this.studentRepository,
      userRepository: this.userRepository
    });
    return res.studentIds;
  }

  public async getFeedForParent(
    requestingUser: UserContext,
    filters?: ParentEDiaryFeedFilters
  ) {
    if (!requestingUser || !requestingUser.userId) {
      throw new ForbiddenError('Authentication required to access parent eDiary feed.');
    }

    // 1. Authoritative resolution of linked children from token identity
    const res = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
      userId: requestingUser.userId,
      guardianRepository: this.guardianRepository,
      studentRepository: this.studentRepository,
      userRepository: this.userRepository
    });

    // 2. Strict isolation: Filter to active enrolled learners only
    // Withdrawn, unlinked, or archived learners are strictly excluded
    const activeStudents = res.students.filter(
      s => s.status === StudentStatus.ACTIVE || !s.status || (s.status as any) === 'ACTIVE'
    );

    // If parent has no active linked children, return empty feed (never leak school entries or error)
    if (activeStudents.length === 0) {
      return [];
    }

    const activeChildIds = activeStudents.map(s => s.id);

    // 3. Child-specific filtering & tampering protection:
    // If client supplied a studentId, verify that the child legally belongs to this authenticated parent
    let targetStudents = activeStudents;
    if (filters?.studentId && filters.studentId.trim()) {
      const requestedId = filters.studentId.trim();
      if (!activeChildIds.includes(requestedId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view eDiary entries for your linked children.');
      }
      targetStudents = activeStudents.filter(s => s.id === requestedId);
    }

    // 4. Resolve stream IDs, classroom IDs, and student IDs for target children
    const streamIds = Array.from(
      new Set(targetStudents.map(s => s.streamId).filter(Boolean))
    ) as string[];
    const classRoomIds = Array.from(
      new Set(targetStudents.map(s => s.classroomId).filter(Boolean))
    ) as string[];
    const studentIds = targetStudents.map(s => s.id);

    if (streamIds.length === 0 && classRoomIds.length === 0 && studentIds.length === 0) {
      return [];
    }

    // 5. Query published entries from repository
    // Strictly published only: Drafts and unapproved entries are NEVER returned
    const entries = await this.ediaryRepository.findByStreams(streamIds, studentIds, {
      classRoomIds,
      academicYearId: filters?.academicYearId,
      termId: filters?.termId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      date: filters?.date,
      status: 'PUBLISHED',
      limit: filters?.limit || 100
    });

    // Enforce publication check at domain use-case boundary
    const publishedEntries = entries.filter(e => e.status === 'PUBLISHED');

    // 6. Sibling deduplication & metadata enrichment
    // If multiple siblings share a class/stream, deduplicate entries by unique entry id
    const uniqueMap = new Map<string, any>();

    for (const entry of publishedEntries) {
      if (uniqueMap.has(entry.id)) {
        continue;
      }

      // Identify which of the parent's target children this entry applies to
      const matchingLearners = targetStudents.filter(s => {
        if (entry.studentId) {
          return s.id === entry.studentId;
        }
        const matchesStream = Boolean(s.streamId && entry.streamId && s.streamId === entry.streamId);
        const matchesClass = Boolean(s.classroomId && entry.classRoomId && s.classroomId === entry.classRoomId);
        return matchesStream || matchesClass;
      });

      // If this entry does not match any of the target children, skip it
      if (matchingLearners.length === 0) {
        continue;
      }

      const applicableStudents = matchingLearners.map(s => ({
        id: s.id,
        name: s.fullName,
        admissionNumber: s.admissionNumber,
        grade: s.gradeLevel ? s.gradeLevel.replace(/_/g, ' ') : 'CBC',
        streamId: s.streamId
      }));

      // Find acknowledgements matching this guardian or these children
      const matchingAcks = entry.acknowledgements.filter(a =>
        a.guardianUserId === requestingUser.userId ||
        (res.guardian && a.guardianId === res.guardian.id) ||
        matchingLearners.some(s => s.id === a.studentId)
      );

      const isAcknowledged = matchingLearners.some(s =>
        entry.acknowledgements.some(a =>
          a.studentId === s.id &&
          (a.guardianUserId === requestingUser.userId || (res.guardian && a.guardianId === res.guardian.id))
        )
      );

      uniqueMap.set(entry.id, {
        ...entry.toJSON(),
        applicableStudents,
        studentName: applicableStudents.map(s => s.name).join(', '),
        admissionNumber: applicableStudents.map(s => s.admissionNumber).join(', '),
        grade: applicableStudents.map(s => s.grade).join(', '),
        isAcknowledgedByParent: isAcknowledged,
        parentAcknowledgements: matchingAcks,
        parentAcknowledgement: matchingAcks.length > 0 ? matchingAcks[0] : null
      });
    }

    return Array.from(uniqueMap.values());
  }

  public async listEntriesForStudent(
    studentId: string,
    requestingUser?: UserContext,
    limit = 20
  ) {
    // Parent data isolation check
    const isGuardian = requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT;
    if (isGuardian) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view eDiary entries for your linked children.');
      }
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    if (isGuardian && (student.status === StudentStatus.WITHDRAWN || (student.status as any) === 'WITHDRAWN' || student.status === StudentStatus.ARCHIVED)) {
      throw new ForbiddenError('Access denied: Learner is no longer actively enrolled.');
    }

    let entries = await this.ediaryRepository.findByStudent(student.id, student.streamId, limit);

    // Filter out DRAFT entries for parents/guardians
    if (isGuardian) {
      entries = entries.filter(e => e.status !== 'DRAFT');
    }

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

  public async listEntriesForStream(streamId: string, date?: string, requestingUser?: UserContext) {
    const isGuardian = requestingUser?.role === UserRole.GUARDIAN || requestingUser?.role === UserRole.PARENT;
    if (isGuardian) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (childIds.length) {
        const children = await this.studentRepository.findByIds(childIds);
        const hasChildInStream = children.some(c => c.streamId === streamId);
        if (!hasChildInStream) {
          throw new ForbiddenError('Access denied: You cannot view stream diary entries for classes your child is not enrolled in.');
        }
      } else {
        return [];
      }
    }

    let entries = await this.ediaryRepository.findByStream(streamId, date);

    // Guardians only see PUBLISHED entries; teachers see all (including DRAFTs)
    if (isGuardian) {
      entries = entries.filter(e => e.status !== 'DRAFT');
    }

    return entries.map(e => e.toJSON());
  }

  public async acknowledgeEntry(dto: AcknowledgeEDiaryDTO) {
    let guardian = await this.getGuardianForUser(dto.guardianUserId);
    if (!guardian) {
      throw new NotFoundError('Guardian profile for User', dto.guardianUserId);
    }

    const entry = await this.ediaryRepository.findById(dto.entryId);
    if (!entry) {
      throw new NotFoundError('eDiary entry', dto.entryId);
    }

    const childIds = await this.getLinkedStudentIdsForUser(dto.guardianUserId);
    if (childIds.length === 0) {
      throw new ForbiddenError('Access denied: No linked children found for guardian account.');
    }

    // Resolve target student(s) to acknowledge:
    // If studentId was explicitly passed, verify it belongs to this guardian
    // If omitted, find all children belonging to entry stream/class
    const candidateStudents = await this.studentRepository.findByIds(childIds);
    const matchingStudents = candidateStudents.filter(
      c => c.streamId === entry.streamId || (entry.classRoomId && c.classroomId === entry.classRoomId)
    );

    let targetStudentIds: string[] = [];
    if (dto.studentId) {
      if (!childIds.includes(dto.studentId)) {
        throw new ForbiddenError('Access denied: You can only acknowledge diary entries for your linked children.');
      }
      targetStudentIds = [dto.studentId];
    } else {
      if (matchingStudents.length === 0) {
        throw new ForbiddenError('Access denied: You cannot acknowledge a diary entry for a class none of your children belong to.');
      }
      targetStudentIds = matchingStudents.map(c => c.id);
    }

    const guardianUser = await this.userRepository.findById(dto.guardianUserId);
    const parentName = dto.guardianName || (guardianUser ? guardianUser.fullName : 'Parent / Guardian');
    const note = dto.parentNote || dto.note;

    for (const sid of targetStudentIds) {
      entry.addAcknowledgement({
        guardianId: guardian.id,
        guardianUserId: dto.guardianUserId,
        guardianName: parentName,
        studentId: sid,
        signedAt: new Date().toISOString(),
        note,
        parentNote: note
      });
    }

    await this.ediaryRepository.update(entry);

    const entryJson = entry.toJSON();
    return {
      success: true,
      message: 'eDiary entry acknowledged successfully',
      data: {
        ...entryJson,
        entry: entryJson
      },
      entry: entryJson
    };
  }

  public async deleteEntry(id: string, requestingUser?: { userId: string; role: string }): Promise<void> {
    const entry = await this.ediaryRepository.findById(id);
    if (!entry) throw new NotFoundError('eDiary entry', id);
    if (requestingUser?.role === UserRole.TEACHER && entry.teacherId !== requestingUser.userId) {
      throw new ForbiddenError('You can only delete your own eDiary entries.');
    }
    await this.ediaryRepository.delete(id);
  }
}
