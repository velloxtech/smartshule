import { TeacherAssignmentAccess, matchesTeachingCohort, teachesAllLowerPrimaryAreas } from '../shared/TeacherAssignmentAccess';
import { releasePreviousClassTeacherDuty } from '../shared/ClassTeacherAssignmentPolicy';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { School, SchoolProps } from '../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../core/domain/academic/ClassRoom';
import { GlobalSubject } from '../../core/domain/academic/GlobalSubject';
import { ClassTeacherAssignment, SubjectTeacherAssignment, SubjectTeacherRole } from '../../core/domain/academic/TeacherAssignment';
import { CBCGradeLevel } from '../../core/domain/user/Student';
import { UserRole, isTermInitializationAuthorizedRole, TERM_INITIALIZATION_AUTHORIZED_ROLES } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../core/domain/shared/Errors';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole | string;
  schoolId?: string;
}

const ACADEMIC_ADMIN_ROLES: string[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.HEAD_TEACHER,
  UserRole.DEPUTY_HEAD_TEACHER,
  'PRINCIPAL',
  'DIRECTOR',
  'MANAGEMENT'
].map(r => String(r).toUpperCase());

function isAcademicAdminRole(role?: string): boolean {
  if (!role) return false;
  return ACADEMIC_ADMIN_ROLES.includes(role.toUpperCase());
}

export class AcademicUseCases {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly teacherRepository?: ITeacherRepository,
    private readonly userRepository?: IUserRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  // School
  public async setupSchool(props: SchoolProps, schoolId?: string) {
    const id = schoolId || IdGenerator.generate();
    const school = School.create(props, id);
    await this.academicRepository.saveSchool(school);
    return school.toJSON();
  }

  public async getSchool(id?: string) {
    let school = await this.academicRepository.getSchool(id);
    if (!school) {
      school = School.create(
        {
          name: 'Grace Seeds School',
          code: 'GSS-001',
          centerCode: undefined,
          motto: 'The future Begins Here',
          email: 'schoolgraceseeds@gmail.com',
          phone: '0745436312',
          address: 'P.O Box 12-40123',
          logoUrl: '/logo.png',
          currency: 'KES',
          latitude: -0.061234,
          longitude: 34.721234,
          geofenceRadius: 250,
          geofenceEnabled: true,
          schoolType: 'DAY'
        },
        id || 'school-001'
      );
      await this.academicRepository.saveSchool(school);
    } else if (
      school.name === 'SmartShule CBC Academy' ||
      school.name === 'SmartShule Academy' ||
      school.name === 'SmartShule' ||
      school.name !== 'Grace Seeds School' ||
      !school.motto ||
      school.motto !== 'The future Begins Here' ||
      school.email !== 'schoolgraceseeds@gmail.com' ||
      school.phone !== '0745436312' ||
      school.schoolType !== 'DAY'
    ) {
      school = School.create(
        {
          name: 'Grace Seeds School',
          code: school.code || 'GSS-001',
          centerCode: school.centerCode,
          motto: 'The future Begins Here',
          email: 'schoolgraceseeds@gmail.com',
          phone: '0745436312',
          address: school.id === 'school-001' ? 'P.O Box 12-40123' : school.address,
          logoUrl: school.logoUrl || '/logo.png',
          currency: school.currency || 'KES',
          latitude: school.latitude ?? -0.061234,
          longitude: school.longitude ?? 34.721234,
          geofenceRadius: school.geofenceRadius ?? 250,
          geofenceEnabled: school.geofenceEnabled ?? true,
          schoolType: 'DAY'
        },
        school.id
      );
      await this.academicRepository.updateSchool(school);
    }
    return { ...school.toJSON(), ...(school.id === 'school-001' ? { address: 'P.O Box 12-40123' } : {}) };
  }

  public async getGeofenceConfig(schoolId?: string) {
    const school = await this.getSchool(schoolId);
    return {
      latitude: (school as any).latitude ?? -0.061234,
      longitude: (school as any).longitude ?? 34.721234,
      geofenceRadius: (school as any).geofenceRadius ?? 250,
      geofenceEnabled: (school as any).geofenceEnabled ?? true,
      schoolName: school.name,
      address: school.address,
      updatedAt: (school as any).updatedAt
    };
  }

  public async updateGeofenceConfig(
    dto: {
      latitude: number;
      longitude: number;
      geofenceRadius?: number;
      geofenceEnabled?: boolean;
      address?: string;
    },
    userRole?: UserRole,
    schoolId?: string
  ) {
    // Strictly enforce: ONLY Super Admin and School Director can enter or update coordinates!
    const isAuthorized =
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SCHOOL_ADMIN;

    if (!isAuthorized) {
      throw new ForbiddenError(
        'School compound geofence coordinates can only be configured by the Super Administrator and School Director.'
      );
    }

    let school = await this.academicRepository.getSchool(schoolId);
    if (!school) {
      await this.getSchool(schoolId);
      school = await this.academicRepository.getSchool(schoolId);
    }

    if (!school) {
      throw new NotFoundError('School record not found.');
    }

    school.updateDetails({
      latitude: dto.latitude,
      longitude: dto.longitude,
      geofenceRadius: dto.geofenceRadius ?? school.geofenceRadius ?? 250,
      geofenceEnabled: dto.geofenceEnabled !== undefined ? dto.geofenceEnabled : school.geofenceEnabled,
      address: dto.address || school.address
    });

    await this.academicRepository.updateSchool(school);
    return this.getGeofenceConfig(school.id);
  }


  // Academic Year
  public async createAcademicYear(dto: { name: string; startDate: string; endDate: string; isCurrent: boolean; schoolId: string }) {
    if (dto.isCurrent) {
      const existingYears = await this.academicRepository.findAllYears(dto.schoolId);
      for (const y of existingYears) {
        if (y.isCurrent) {
          y.setCurrent(false);
          await this.academicRepository.updateYear(y);
        }
      }
    }

    const year = AcademicYear.create(dto, IdGenerator.generate());
    await this.academicRepository.saveYear(year);
    return year.toJSON();
  }

  public async listAcademicYears(schoolId?: string) {
    const years = await this.academicRepository.findAllYears(schoolId);
    return years.map(y => y.toJSON());
  }

  // Academic Term
  public async initializeAcademicTerm(
    dto: {
      academicYearId: string;
      termNumber: number;
      name: string;
      startDate: string;
      endDate: string;
      isCurrent?: boolean;
      schoolId?: string;
    },
    requestingUser?: UserContext
  ) {
    // 1. Role-Based Access Control Defense-in-Depth
    if (!requestingUser || !isTermInitializationAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError(
        'Access denied: Only Super Admin, Admin, and Headteacher accounts may initialize a new academic term.'
      );
    }

    // 2. Validate Academic Year
    if (!dto.academicYearId || !dto.academicYearId.trim()) {
      throw new ValidationError('Academic year identifier is required.');
    }
    const year = await this.academicRepository.findYearById(dto.academicYearId.trim());
    if (!year) {
      throw new NotFoundError('Academic Year', dto.academicYearId);
    }

    // 3. Validate Term Number and Name
    const termNum = Number(dto.termNumber);
    if (!termNum || isNaN(termNum) || termNum < 1 || termNum > 3) {
      throw new ValidationError('Term number must be an integer between 1 and 3.');
    }
    const termName = dto.name?.trim();
    if (!termName) {
      throw new ValidationError('Term name is required (e.g. "Term 1", "Term 2", "Term 3").');
    }

    // 4. Validate Dates
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dto.startDate || !isoDateRegex.test(dto.startDate.trim())) {
      throw new ValidationError('Start date must be in YYYY-MM-DD format.');
    }
    if (!dto.endDate || !isoDateRegex.test(dto.endDate.trim())) {
      throw new ValidationError('End date must be in YYYY-MM-DD format.');
    }
    const startDate = dto.startDate.trim();
    const endDate = dto.endDate.trim();
    if (startDate >= endDate) {
      throw new ValidationError(`Term end date (${endDate}) must be strictly after the start date (${startDate}).`);
    }

    // Validate date consistency with Academic Year
    if (year.startDate && year.endDate) {
      const yearStart = year.startDate.split('T')[0];
      const yearEnd = year.endDate.split('T')[0];
      if (startDate > yearEnd || endDate < yearStart) {
        throw new ValidationError(
          `Term dates (${startDate} to ${endDate}) must be within or aligned with Academic Year ${year.name} (${yearStart} to ${yearEnd}).`
        );
      }
    }

    // 5. Prevent Duplicate Initialization (Application Check)
    const existingTerms = await this.academicRepository.findTermsByYear(year.id);
    const duplicateByNumber = existingTerms.find(t => t.termNumber === termNum);
    if (duplicateByNumber) {
      throw new ConflictError(
        `Term ${termNum} has already been initialized for Academic Year ${year.name} (Existing: "${duplicateByNumber.name}"). Duplicate initialization is prevented.`
      );
    }
    const duplicateByName = existingTerms.find(
      t => t.name.trim().toLowerCase() === termName.toLowerCase()
    );
    if (duplicateByName) {
      throw new ConflictError(
        `An academic term named "${termName}" has already been initialized for Academic Year ${year.name}. Duplicate initialization is prevented.`
      );
    }

    // 6. Safe Activation: If new term is current, deactivate only previous terms
    // All previous examination results, attendance, fee transactions, and receipts remain completely intact
    const shouldBeCurrent = dto.isCurrent !== undefined ? Boolean(dto.isCurrent) : true;
    if (shouldBeCurrent) {
      for (const t of existingTerms) {
        if (t.isCurrent) {
          t.setCurrent(false);
          await this.academicRepository.updateTerm(t);
        }
      }
    }

    // 7. Persist New Term
    const newTerm = AcademicTerm.create(
      {
        academicYearId: year.id,
        termNumber: termNum,
        name: termName,
        startDate,
        endDate,
        isCurrent: shouldBeCurrent
      },
      IdGenerator.generate()
    );

    try {
      await this.academicRepository.saveTerm(newTerm);
    } catch (dbErr: any) {
      if (dbErr.code === '23505' || dbErr.message?.includes('uq_academic_terms')) {
        throw new ConflictError(
          `Term ${termNum} for Academic Year ${year.name} has already been initialized by another concurrent operation.`
        );
      }
      throw dbErr;
    }

    return {
      success: true,
      message: `Academic ${termName} successfully initialized for Academic Year ${year.name}. All existing historical data preserved.`,
      data: newTerm.toJSON(),
      academicYear: year.toJSON()
    };
  }

  public async createAcademicTerm(
    dto: { academicYearId: string; termNumber: number; name: string; startDate: string; endDate: string; isCurrent: boolean },
    requestingUser?: UserContext
  ) {
    if (requestingUser && !isTermInitializationAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError(
        'Access denied: Only Super Admin, Admin, and Headteacher accounts may create or initialize an academic term.'
      );
    }
    if (dto.startDate && dto.endDate && dto.startDate >= dto.endDate) {
      throw new ValidationError(`Term end date (${dto.endDate}) must be after start date (${dto.startDate}).`);
    }

    const existingTerms = await this.academicRepository.findTermsByYear(dto.academicYearId);
    const duplicate = existingTerms.find(t => t.termNumber === dto.termNumber || t.name.trim().toLowerCase() === dto.name.trim().toLowerCase());
    if (duplicate) {
      throw new ConflictError(`Term ${dto.termNumber} ("${dto.name}") already exists for this academic year.`);
    }

    if (dto.isCurrent) {
      for (const t of existingTerms) {
        if (t.isCurrent) {         
          t.setCurrent(false);
          await this.academicRepository.updateTerm(t);
        }
      }
    }

    const term = AcademicTerm.create(dto, IdGenerator.generate());
    await this.academicRepository.saveTerm(term);
    return term.toJSON();
  }

  public async updateAcademicTerm(
    id: string,
    dto: { name?: string; startDate?: string; endDate?: string; termNumber?: number; isCurrent?: boolean },
    actor?: UserContext
  ) {
    const term = await this.academicRepository.findTermById(id);
    if (!term) throw new NotFoundError(`Academic term with id ${id}`);
    if (actor) {
      if (!isAcademicAdminRole(actor.role)) throw new ForbiddenError('Only school administrators can update term dates.');
      const year = await this.academicRepository.findYearById(term.academicYearId);
      if (!year || (actor.schoolId && year.schoolId !== actor.schoolId)) throw new ForbiddenError('Academic term access denied.');
    }
    const start = dto.startDate ?? term.startDate;
    const end = dto.endDate ?? term.endDate;
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!validDate(start) || !validDate(end) || end <= start) throw new ValidationError('Choose a valid closing date after the term opening date.');

    if (dto.isCurrent) {
      const existingTerms = await this.academicRepository.findTermsByYear(term.academicYearId);
      for (const t of existingTerms) {
        if (t.id !== id && t.isCurrent) {
          t.setCurrent(false);
          await this.academicRepository.updateTerm(t);
        }
      }
    }

    term.updateDetails(dto);
    await this.academicRepository.updateTerm(term);
    const persisted = await this.academicRepository.findTermById(id);
    if (!persisted || persisted.startDate !== start || persisted.endDate !== end) {
      throw new ConflictError('The term dates were not saved. Refresh the term and try again.');
    }
    return persisted.toJSON();
  }

  public async activateAcademicTerm(termId: string) {
    const term = await this.academicRepository.findTermById(termId);
    if (!term) throw new NotFoundError(`Academic term with id ${termId}`);

    const existingTerms = await this.academicRepository.findTermsByYear(term.academicYearId);
    for (const t of existingTerms) {
      if (t.id !== termId && t.isCurrent) {
        t.setCurrent(false);
        await this.academicRepository.updateTerm(t);
      }
    }

    term.setCurrent(true);
    await this.academicRepository.updateTerm(term);
    return term.toJSON();
  }

  public async transitionTerm(schoolId?: string, requestingUser?: UserContext) {
    if (requestingUser && !isTermInitializationAuthorizedRole(requestingUser.role)) {
      throw new ForbiddenError(
        'Access denied: Only Super Admin, Admin, and Headteacher accounts may transition academic terms.'
      );
    }
    const context = await this.getCurrentAcademicContext(schoolId);
    if (!context.currentYear) throw new NotFoundError('Active academic year');

    const yearTerms = await this.academicRepository.findTermsByYear(context.currentYear.id);
    const sortedTerms = yearTerms.sort((a, b) => a.termNumber - b.termNumber);

    const currentTerm = context.currentTerm;
    let nextTerm: AcademicTerm | null = null;

    if (currentTerm) {
      const currentIndex = sortedTerms.findIndex(t => t.id === currentTerm.id);
      if (currentIndex >= 0 && currentIndex < sortedTerms.length - 1) {
        nextTerm = sortedTerms[currentIndex + 1];
      }
    } else if (sortedTerms.length > 0) {
      nextTerm = sortedTerms[0];
    }

    if (nextTerm) {
      return await this.activateAcademicTerm(nextTerm.id);
    }

    // All terms in this academic year ended -> advance to next academic year Term 1
    const nextYearNum = parseInt(context.currentYear.name, 10) + 1;
    const allYears = await this.academicRepository.findAllYears(schoolId);
    let nextYear = allYears.find(y => y.name === String(nextYearNum));

    if (!nextYear) {
      nextYear = AcademicYear.create(
        {
          name: String(nextYearNum),
          startDate: `${nextYearNum}-01-05`,
          endDate: `${nextYearNum}-11-20`,
          isCurrent: true,
          schoolId: schoolId || 'school-001'
        },
        IdGenerator.generate()
      );
      // Unset previous year
      const oldYear = await this.academicRepository.findYearById(context.currentYear.id);
      if (oldYear) {
        oldYear.setCurrent(false);
        await this.academicRepository.updateYear(oldYear);
      }
      await this.academicRepository.saveYear(nextYear);
    }

    const newTerm1 = AcademicTerm.create(
      {
        academicYearId: nextYear.id,
        termNumber: 1,
        name: `Term 1 - ${nextYearNum}`,
        startDate: `${nextYearNum}-01-05`,
        endDate: `${nextYearNum}-04-03`,
        isCurrent: true
      },
      IdGenerator.generate()
    );

    if (currentTerm) {
      const prevTerm = await this.academicRepository.findTermById(currentTerm.id);
      if (prevTerm) {
        prevTerm.setCurrent(false);
        await this.academicRepository.updateTerm(prevTerm);
      }
    }

    await this.academicRepository.saveTerm(newTerm1);
    return newTerm1.toJSON();
  }

  public async listTermsByYear(yearId: string) {
    const terms = await this.academicRepository.findTermsByYear(yearId);
    return terms.map(t => t.toJSON());
  }

  public async listAllTerms(schoolId?: string) {
    const years = await this.academicRepository.findAllYears(schoolId);
    let allTerms: AcademicTerm[] = [];
    for (const year of years) {
      const terms = await this.academicRepository.findTermsByYear(year.id);
      allTerms = allTerms.concat(terms);
    }
    return allTerms.map(t => t.toJSON());
  }

  public async getCurrentAcademicContext(schoolId?: string) {
    let currentYear = await this.academicRepository.findCurrentYear(schoolId);
    const allYears = await this.academicRepository.findAllYears(schoolId);

    if (!currentYear && allYears.length === 0) {
      const curCalYear = new Date().getFullYear();
      const yearName = `${curCalYear}`;
      const yearId = `year-${curCalYear}`;

      // Auto-provision Academic Calendar with Kenyan Terms 1, 2, 3
      currentYear = AcademicYear.create(
        {
          name: yearName,
          startDate: `${curCalYear}-01-05`,
          endDate: `${curCalYear}-11-20`,
          isCurrent: true,
          schoolId: schoolId || 'school-001'
        },
        yearId
      );
      await this.academicRepository.saveYear(currentYear);

      const now = new Date();
      const t1Start = new Date(`${curCalYear}-01-05`);
      const t1End = new Date(`${curCalYear}-04-03`);
      const t2Start = new Date(`${curCalYear}-05-04`);
      const t2End = new Date(`${curCalYear}-08-07`);
      const t3Start = new Date(`${curCalYear}-08-24`);
      const t3End = new Date(`${curCalYear}-10-23`);

      const isT1 = now >= t1Start && now <= t1End;
      const isT2 = now >= t2Start && now <= t2End;
      const isT3 = now >= t3Start && now <= t3End;
      const defaultCurrent = !isT1 && !isT2 && !isT3;

      const term1 = AcademicTerm.create(
        {
          academicYearId: currentYear.id,
          termNumber: 1,
          name: `Term 1 - ${yearName}`,
          startDate: `${curCalYear}-01-05`,
          endDate: `${curCalYear}-04-03`,
          isCurrent: isT1 || defaultCurrent
        },
        `term-${curCalYear}-t1`
      );
      const term2 = AcademicTerm.create(
        {
          academicYearId: currentYear.id,
          termNumber: 2,
          name: `Term 2 - ${yearName}`,
          startDate: `${curCalYear}-05-04`,
          endDate: `${curCalYear}-08-07`,
          isCurrent: isT2
        },
        `term-${curCalYear}-t2`
      );
      const term3 = AcademicTerm.create(
        {
          academicYearId: currentYear.id,
          termNumber: 3,
          name: `Term 3 - ${yearName}`,
          startDate: `${curCalYear}-08-24`,
          endDate: `${curCalYear}-10-23`,
          isCurrent: isT3
        },
        `term-${curCalYear}-t3`
      );

      await this.academicRepository.saveTerm(term1);
      await this.academicRepository.saveTerm(term2);
      await this.academicRepository.saveTerm(term3);
    }

    const currentTerm = currentYear ? await this.academicRepository.findCurrentTerm(currentYear.id) : null;
    const yearTerms = currentYear ? await this.academicRepository.findTermsByYear(currentYear.id) : [];

    let termNotice: { type: 'ACTIVE' | 'ENDING_SOON' | 'TERM_ENDED' | 'RECESS'; message: string; daysRemaining?: number } | null = null;
    if (currentTerm) {
      const now = new Date();
      const status = currentTerm.getStatus(now);
      const daysRemaining = currentTerm.getDaysRemaining(now);
      if (status === 'ENDED') {
        termNotice = {
          type: 'TERM_ENDED',
          message: `${currentTerm.name} ended on ${currentTerm.endDate}. Academic session transition is recommended.`,
          daysRemaining: 0
        };
      } else if (currentTerm.isEndingSoon(now)) {
        termNotice = {
          type: 'ENDING_SOON',
          message: `${currentTerm.name} concludes in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${currentTerm.endDate}). Ensure all formative and summative marks are synchronized.`,
          daysRemaining
        };
      } else {
        termNotice = {
          type: 'ACTIVE',
          message: `${currentTerm.name} is in active session (Week ${currentTerm.getCurrentWeek(now)} of ${currentTerm.getTotalWeeks()}). ${daysRemaining} days remaining until closing.`,
          daysRemaining
        };
      }
    }

    return {
      currentYear: currentYear ? currentYear.toJSON() : null,
      currentTerm: currentTerm ? currentTerm.toJSON() : null,
      allTerms: yearTerms.map(t => t.toJSON()),
      termNotice
    };
  }


  // Classrooms & Streams
  public async createClassRoom(dto: { name: string; gradeLevel: CBCGradeLevel; educationLevel: EducationLevel; schoolId: string }) {
    const classRoom = ClassRoom.create(dto, IdGenerator.generate());
    await this.academicRepository.saveClass(classRoom);
    return classRoom.toJSON();
  }

  public async listClassRooms(schoolId?: string) {
    let classes = await this.academicRepository.findAllClasses(schoolId);
    if (classes.length === 0) {
      const defaultGrades: Array<{ name: string; gradeLevel: CBCGradeLevel; educationLevel: EducationLevel }> = [
        { name: 'Playgroup', gradeLevel: CBCGradeLevel.PLAYGROUP, educationLevel: EducationLevel.PRE_PRIMARY },
        { name: 'PP1', gradeLevel: CBCGradeLevel.PP1, educationLevel: EducationLevel.PRE_PRIMARY },
        { name: 'PP2', gradeLevel: CBCGradeLevel.PP2, educationLevel: EducationLevel.PRE_PRIMARY },
        { name: 'Grade 1', gradeLevel: CBCGradeLevel.GRADE_1, educationLevel: EducationLevel.LOWER_PRIMARY },
        { name: 'Grade 2', gradeLevel: CBCGradeLevel.GRADE_2, educationLevel: EducationLevel.LOWER_PRIMARY },
        { name: 'Grade 3', gradeLevel: CBCGradeLevel.GRADE_3, educationLevel: EducationLevel.LOWER_PRIMARY },
        { name: 'Grade 4', gradeLevel: CBCGradeLevel.GRADE_4, educationLevel: EducationLevel.UPPER_PRIMARY },
        { name: 'Grade 5', gradeLevel: CBCGradeLevel.GRADE_5, educationLevel: EducationLevel.UPPER_PRIMARY },
        { name: 'Grade 6', gradeLevel: CBCGradeLevel.GRADE_6, educationLevel: EducationLevel.UPPER_PRIMARY },
        { name: 'Grade 7', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL },
        { name: 'Grade 8', gradeLevel: CBCGradeLevel.GRADE_8, educationLevel: EducationLevel.JUNIOR_SCHOOL },
        { name: 'Grade 9', gradeLevel: CBCGradeLevel.GRADE_9, educationLevel: EducationLevel.JUNIOR_SCHOOL }
      ];

      for (const dg of defaultGrades) {
        const cls = ClassRoom.create(
          {
            name: dg.name,
            gradeLevel: dg.gradeLevel,
            educationLevel: dg.educationLevel,
            schoolId: schoolId || 'school-001'
          },
          IdGenerator.generate()
        );
        await this.academicRepository.saveClass(cls);
      }
      classes = await this.academicRepository.findAllClasses(schoolId);
    }

    const gradeHierarchy: Record<string, number> = {
      [CBCGradeLevel.PLAYGROUP]: 0,
      [CBCGradeLevel.PP1]: 1,
      [CBCGradeLevel.PP2]: 2,
      [CBCGradeLevel.GRADE_1]: 3,
      [CBCGradeLevel.GRADE_2]: 4,
      [CBCGradeLevel.GRADE_3]: 5,
      [CBCGradeLevel.GRADE_4]: 6,
      [CBCGradeLevel.GRADE_5]: 7,
      [CBCGradeLevel.GRADE_6]: 8,
      [CBCGradeLevel.GRADE_7]: 9,
      [CBCGradeLevel.GRADE_8]: 10,
      [CBCGradeLevel.GRADE_9]: 11,
      [CBCGradeLevel.SENIOR_1]: 12,
      [CBCGradeLevel.SENIOR_2]: 13,
      [CBCGradeLevel.SENIOR_3]: 14,
    };

    return classes
      .sort((a, b) => (gradeHierarchy[a.gradeLevel] ?? 99) - (gradeHierarchy[b.gradeLevel] ?? 99))
      .map(c => c.toJSON());
  }

  public async createStream(dto: { classRoomId: string; name: string; capacity: number; classTeacherId?: string }) {
    let year: AcademicYear | null = null;
    const classroom = dto.classTeacherId ? await this.academicRepository.findClassById(dto.classRoomId) : null;
    if (dto.classTeacherId) {
      if (!classroom) throw new NotFoundError('Classroom', dto.classRoomId);
      year = await this.academicRepository.findCurrentYear(classroom.schoolId);
      if (!year) throw new ValidationError('Set the current academic year before assigning a teacher.');
      if (this.teacherRepository && !await this.teacherRepository.findById(dto.classTeacherId)) throw new NotFoundError('Teacher', dto.classTeacherId);
    }
    const stream = Stream.create({ ...dto, classTeacherId: undefined }, IdGenerator.generate());
    await this.academicRepository.saveStream(stream);
    if (dto.classTeacherId && classroom && year) {
      await this.assignClassTeacher({ schoolId: classroom.schoolId, academicYearId: year.id,
        classRoomId: classroom.id, streamId: stream.id, teacherId: dto.classTeacherId });
      stream.setClassTeacher(dto.classTeacherId);
    }
    return stream.toJSON();
  }

  public async listStreamsByClass(classRoomId: string) {
    const streams = await this.academicRepository.findStreamsByClass(classRoomId);
    return streams.map(s => s.toJSON());
  }

  // Global Subjects Catalogue
  public async createGlobalSubject(dto: { name: string; code: string; schoolId?: string; department?: string; description?: string }) {
    const schoolId = dto.schoolId || 'school-001';
    const id = `subj-${dto.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const subject = GlobalSubject.create({
      schoolId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      department: dto.department?.trim(),
      description: dto.description?.trim()
    }, id);
    await this.academicRepository.saveGlobalSubject(subject);
    return subject.toJSON();
  }

  public async listGlobalSubjects(schoolId?: string) {
    const targetSchoolId = schoolId || 'school-001';
    let subjects = await this.academicRepository.findAllGlobalSubjects(targetSchoolId);
    if (subjects.length === 0) {
      const canonicalDefaults: { id: string; code: string; name: string; department: string; description: string }[] = [
        { id: 'subj-math', code: 'MATH', name: 'Mathematics', department: 'Mathematics', description: 'Mathematical Activities and Mathematics across all levels' },
        { id: 'subj-eng', code: 'ENG', name: 'English', department: 'Languages', description: 'English Language Activities, English Reading, and English Language' },
        { id: 'subj-kisw', code: 'KISW', name: 'Kiswahili', department: 'Languages', description: 'Kiswahili Language Activities, Kusoma, and Kiswahili Language' },
        { id: 'subj-lan', code: 'LANG', name: 'Language Activities', department: 'Languages', description: 'Early childhood foundational language activities for Pre-Primary' },
        { id: 'subj-rea', code: 'REA', name: 'Reading & Literacy', department: 'Languages', description: 'Literacy activities, reading fluency, and reading comprehension' },
        { id: 'subj-kuso', code: 'KUSO', name: 'Kusoma', department: 'Languages', description: 'Kiswahili reading comprehension and literacy activities' },
        { id: 'subj-sci', code: 'SCI', name: 'Science', department: 'Sciences', description: 'Science & Technology and Integrated Science' },
        { id: 'subj-env', code: 'ENV', department: 'Sciences', name: 'Environmental Studies', description: 'Environmental Activities and Environmental Studies' },
        { id: 'subj-re', code: 'RE', name: 'Religious Education', department: 'Humanities', description: 'Religious Activities and Christian Religious Education' },
        { id: 'subj-crea', code: 'CREA', name: 'Creative Arts', department: 'Creative Arts', description: 'Psychomotor & Creative Activities, Creative Arts Activities, and Creative Arts & Sports' },
        { id: 'subj-sst', code: 'SST', name: 'Social Studies', department: 'Humanities', description: 'Social Studies across Upper Primary and Junior School' },
        { id: 'subj-agr', code: 'AGRI', name: 'Agriculture & Nutrition', department: 'Applied Sciences', description: 'Agriculture and Nutrition Activities and Agriculture & Nutrition' },
        { id: 'subj-pretech', code: 'PRETECH', name: 'Pre-Technical Studies', department: 'Technical', description: 'Pre-Technical and Pre-Career Studies in Junior School' },
        { id: 'subj-hlth', code: 'HLTH', name: 'Health Education', department: 'Sciences', description: 'Health Education and Life Skills' },
        { id: 'subj-bus', code: 'BUS', name: 'Business Studies', department: 'Humanities', description: 'Business Studies and Financial Literacy' },
        { id: 'subj-comp', code: 'COMP', name: 'Computer Science', department: 'Technical', description: 'Computer Science and Digital Literacy' },
        { id: 'subj-indig', code: 'INDIG', name: 'Indigenous Language', department: 'Languages', description: 'Indigenous Language Activities and Mother Tongue' },
        { id: 'subj-fre', code: 'FRE', name: 'French', department: 'Languages', description: 'French Foreign Language elective' }
      ];

      for (const d of canonicalDefaults) {
        const gs = GlobalSubject.create({
          schoolId: targetSchoolId,
          code: d.code,
          name: d.name,
          department: d.department,
          description: d.description
        }, d.id);
        await this.academicRepository.saveGlobalSubject(gs);
      }
      subjects = await this.academicRepository.findAllGlobalSubjects(targetSchoolId);
    }
    return subjects.map(s => s.toJSON());
  }

  // Learning Areas (Grade-Specific Offerings)
  public async createLearningArea(dto: {
    name: string;
    code: string;
    gradeLevel: CBCGradeLevel;
    educationLevel: EducationLevel;
    isElective: boolean;
    schoolId: string;
    teacherId?: string;
    globalSubjectId?: string;
  }) {
    const learningArea = LearningArea.create(dto, IdGenerator.generate());
    await this.academicRepository.saveLearningArea(learningArea);
    return learningArea.toJSON();
  }

  public async listLearningAreas(filters?: {
    gradeLevel?: CBCGradeLevel;
    schoolId?: string;
    globalSubjectId?: string;
    classroomId?: string;
  }) {
    let resolvedGradeLevel = filters?.gradeLevel;
    if (filters?.classroomId && !resolvedGradeLevel) {
      const cls = await this.academicRepository.findClassById(filters.classroomId);
      if (cls) {
        resolvedGradeLevel = cls.gradeLevel;
      }
    }

    const queryFilters: { gradeLevel?: CBCGradeLevel; schoolId?: string; globalSubjectId?: string } = {};
    if (filters?.schoolId) queryFilters.schoolId = filters.schoolId;
    if (resolvedGradeLevel) queryFilters.gradeLevel = resolvedGradeLevel;
    if (filters?.globalSubjectId) queryFilters.globalSubjectId = filters.globalSubjectId;

    let areas = await this.academicRepository.findAllLearningAreas(queryFilters);
    const globalSubjects = await this.listGlobalSubjects(filters?.schoolId);
    const gsMap = new Map<string, any>();
    globalSubjects.forEach(gs => gsMap.set(gs.id, gs));

    return areas.map(a => {
      const json = a.toJSON();
      const globalSubj = a.globalSubjectId ? gsMap.get(a.globalSubjectId) : undefined;
      return {
        ...json,
        globalSubject: globalSubj || null,
        canonicalSubjectName: globalSubj ? globalSubj.name : a.name,
        canonicalSubjectCode: globalSubj ? globalSubj.code : a.code
      };
    });
  }


  public async deleteClass(id: string): Promise<void> {
    await this.academicRepository.deleteClass(id);
  }

  public async deleteStream(id: string): Promise<void> {
    await this.academicRepository.deleteStream(id);
  }

  public async deleteLearningArea(id: string): Promise<void> {
    await this.academicRepository.deleteLearningArea(id);
  }

  // ==========================================
  // TEACHER ASSIGNMENTS & REASSIGNMENTS
  // ==========================================

  public async assignClassTeacher(
    dto: {
      schoolId: string;
      academicYearId: string;
      classRoomId: string;
      streamId?: string;
      teacherId: string;
      effectiveFrom?: string;
      reason?: string;
    },
    requestingUser?: UserContext
  ) {
    if (requestingUser && !isAcademicAdminRole(requestingUser.role)) {
      throw new ForbiddenError('Only school administrators and head teachers can assign class teachers.');
    }

    if (!dto.schoolId) throw new ValidationError('schoolId is required');
    if (!dto.academicYearId) throw new ValidationError('academicYearId is required');
    if (!dto.classRoomId) throw new ValidationError('classRoomId is required');
    if (!dto.teacherId) throw new ValidationError('teacherId is required');

    // Validate Classroom
    const classroom = await this.academicRepository.findClassById(dto.classRoomId);
    if (!classroom) {
      throw new NotFoundError('Classroom', dto.classRoomId);
    }

    // Validate Stream if provided
    let stream: Stream | null = null;
    if (dto.streamId) {
      stream = await this.academicRepository.findStreamById(dto.streamId);
      if (!stream) {
        throw new NotFoundError('Stream', dto.streamId);
      }
      if (stream.classRoomId !== dto.classRoomId) {
        throw new ValidationError(`Stream ${stream.name} does not belong to class ${classroom.name}`);
      }
    }

    // Validate Teacher if teacherRepository available
    let teacherUser: any = null;
    if (this.teacherRepository) {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (!teacher) {
        throw new NotFoundError('Teacher', dto.teacherId);
      }
      if (this.userRepository) {
        teacherUser = await this.userRepository.findById(teacher.userId);
      }
    }

    const effectiveFrom = dto.effectiveFrom || new Date().toISOString().split('T')[0];

    await releasePreviousClassTeacherDuty(this.academicRepository, { ...dto, effectiveFrom }, this.teacherRepository);

    // Find existing active assignments strictly for this exact stream (or class-wide if streamId is null)
    const allClassAssignments = await this.academicRepository.findClassTeacherAssignments({
      schoolId: dto.schoolId,
      academicYearId: dto.academicYearId,
      classRoomId: dto.classRoomId,
      isActive: true
    });

    const relevantAssignments = allClassAssignments.filter(a =>
      dto.streamId ? a.streamId === dto.streamId : (!a.streamId || a.streamId === null)
    );

    for (const oldAssignment of relevantAssignments) {
      if (oldAssignment.teacherId === dto.teacherId) {
        return oldAssignment.toJSON();
      }
      // Deactivate safely preserving historical record
      oldAssignment.deactivate(effectiveFrom);
      await this.academicRepository.saveClassTeacherAssignment(oldAssignment);
      if (this.teacherRepository && oldAssignment.streamId) {
        const previousTeacher = await this.teacherRepository.findById(oldAssignment.teacherId);
        if (previousTeacher) {
          previousTeacher.removeStream(oldAssignment.streamId);
          await this.teacherRepository.update(previousTeacher);
        }
      }
    }

    // Create new assignment
    const assignment = ClassTeacherAssignment.create(
      {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        teacherId: dto.teacherId,
        assignedByUserId: requestingUser?.userId,
        effectiveFrom,
        isActive: true
      },
      IdGenerator.generate()
    );

    await this.academicRepository.saveClassTeacherAssignment(assignment);

    // Sync stream.classTeacherId for backward compatibility
    if (stream) {
      stream.setClassTeacher(dto.teacherId);
      await this.academicRepository.updateStream(stream);
    }

    // Sync teacher.assignedClassStreamIds for backward compatibility
    if (this.teacherRepository && dto.streamId) {
      try {
        const teacher = await this.teacherRepository.findById(dto.teacherId);
        if (teacher) {
          teacher.assignStream(dto.streamId);
          await this.teacherRepository.update(teacher);
        }
      } catch (err: any) {
        console.warn('[AcademicUseCases] Non-fatal teacher assignedClassStreamIds sync error:', err?.message || err);
      }
    }

    // Audit log if system log available
    if (this.systemLogRepository) {
      await this.systemLogRepository.create({
        schoolId: dto.schoolId,
        level: 'INFO',
        category: 'ACADEMICS',
        action: 'CLASS_TEACHER_ASSIGNED',
        actorUserId: requestingUser?.userId,
        actorEmail: requestingUser?.email,
        actorRole: requestingUser?.role,
        status: 'SUCCESS',
        details: `Assigned teacher ${teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : dto.teacherId} to ${classroom.name}${stream ? ` (${stream.name})` : ''}`,
        metadata: {
          assignmentId: assignment.id,
          classRoomId: dto.classRoomId,
          streamId: dto.streamId,
          teacherId: dto.teacherId,
          academicYearId: dto.academicYearId,
          reason: dto.reason
        }
      } as any).catch(() => {});
    }

    return assignment.toJSON();
  }

  public async listClassTeacherAssignments(filters?: {
    schoolId?: string;
    academicYearId?: string;
    classRoomId?: string;
    streamId?: string;
    teacherId?: string;
    isActive?: boolean;
  }) {
    const assignments = await this.academicRepository.findClassTeacherAssignments(filters);

    const enriched = await Promise.all(
      assignments.map(async a => {
        let teacherName = 'Assigned Teacher';
        let teacherEmployeeNumber = '';
        if (this.teacherRepository) {
          try {
            const t = await this.teacherRepository.findById(a.teacherId);
            if (t) {
              teacherEmployeeNumber = t.employeeNumber;
              if (this.userRepository) {
                const u = await this.userRepository.findById(t.userId);
                if (u) teacherName = `${u.firstName} ${u.lastName}`.trim();
              }
            }
          } catch {}
        }

        let className = '';
        try {
          const c = await this.academicRepository.findClassById(a.classRoomId);
          if (c) className = c.name;
        } catch {}

        let streamName = '';
        if (a.streamId) {
          try {
            const s = await this.academicRepository.findStreamById(a.streamId);
            if (s) streamName = s.name;
          } catch {}
        }

        let academicYearName = '';
        try {
          const y = await this.academicRepository.findYearById(a.academicYearId);
          if (y) academicYearName = y.name;
        } catch {}

        return {
          ...a.toJSON(),
          teacherName,
          teacherEmployeeNumber,
          className,
          streamName,
          academicYearName
        };
      })
    );

    return enriched;
  }

  public async assignSubjectTeacher(
    dto: {
      schoolId: string;
      academicYearId: string;
      classRoomId?: string;
      streamId?: string;
      learningAreaId: string;
      teacherId: string;
      role?: SubjectTeacherRole;
      effectiveFrom?: string;
    },
    requestingUser?: UserContext
  ) {
    if (requestingUser && !isAcademicAdminRole(requestingUser.role)) {
      throw new ForbiddenError('Only school administrators and head teachers can assign subject teachers.');
    }

    if (!dto.schoolId) throw new ValidationError('schoolId is required');
    if (!dto.academicYearId) throw new ValidationError('academicYearId is required');
    if (!dto.learningAreaId) throw new ValidationError('learningAreaId is required');
    if (!dto.teacherId) throw new ValidationError('teacherId is required');
    if (requestingUser?.schoolId && requestingUser.schoolId !== dto.schoolId) throw new ForbiddenError('School access denied.');
    const year = await this.academicRepository.findYearById(dto.academicYearId);
    if (!year || year.schoolId !== dto.schoolId) throw new ValidationError('Select an academic year belonging to this school.');
    const role = dto.role || 'SUBJECT_LEAD';
    if (!['SUBJECT_LEAD', 'SUBJECT_TEACHER', 'ASSESSMENT_APPROVER'].includes(role)) throw new ValidationError('Invalid subject assignment role.');
    let classRoomId = dto.classRoomId;
    if (dto.streamId) {
      const stream = await this.academicRepository.findStreamById(dto.streamId);
      if (!stream || (classRoomId && stream.classRoomId !== classRoomId)) throw new ValidationError('Select a stream belonging to the selected class.');
      classRoomId = stream.classRoomId;
    }
    if (!classRoomId && role !== 'SUBJECT_LEAD') throw new ValidationError('Select a class for this subject teacher assignment.');
    const classroom = classRoomId ? await this.academicRepository.findClassById(classRoomId) : null;
    if (classRoomId && (!classroom || classroom.schoolId !== dto.schoolId)) throw new ValidationError('Select a class belonging to this school.');

    // Validate learning area
    const learningArea = await this.academicRepository.findLearningAreaById(dto.learningAreaId);
    if (!learningArea) {
      throw new NotFoundError('Learning Area', dto.learningAreaId);
    }
    if (learningArea.schoolId !== dto.schoolId || (classroom && learningArea.gradeLevel !== classroom.gradeLevel)) {
      throw new ValidationError('The learning area must belong to this school and match the selected class grade.');
    }

    // Validate teacher
    let teacherUser: any = null;
    if (this.teacherRepository) {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (!teacher) {
        throw new NotFoundError('Teacher', dto.teacherId);
      }
      if (this.userRepository) {
        teacherUser = await this.userRepository.findById(teacher.userId);
      }
    }

    if (teacherUser && teacherUser.schoolId !== dto.schoolId) throw new ValidationError('Select a teacher belonging to this school.');
    const effectiveFrom = dto.effectiveFrom || new Date().toISOString().split('T')[0];

    const existing = (await this.academicRepository.findSubjectTeacherAssignments({
      schoolId: dto.schoolId, academicYearId: dto.academicYearId,
      learningAreaId: dto.learningAreaId, role, isActive: true
    })).filter(a => (a.classRoomId || '') === (classRoomId || '') && (a.streamId || '') === (dto.streamId || ''));
    const duplicate = existing.find(a => a.teacherId === dto.teacherId);
    if (duplicate) return duplicate.toJSON();

    // If SUBJECT_LEAD, deactivate any previous active SUBJECT_LEAD for this learning area and class/stream
    if (role === 'SUBJECT_LEAD') {
      const existingLeads = existing;

      for (const oldLead of existingLeads) {
        if (oldLead.teacherId === dto.teacherId) {
          return oldLead.toJSON();
        }
        oldLead.deactivate(effectiveFrom);
        await this.academicRepository.saveSubjectTeacherAssignment(oldLead);
      }
    }

    const assignment = SubjectTeacherAssignment.create(
      {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        classRoomId,
        streamId: dto.streamId,
        learningAreaId: dto.learningAreaId,
        teacherId: dto.teacherId,
        role,
        assignedByUserId: requestingUser?.userId,
        effectiveFrom,
        isActive: true
      },
      IdGenerator.generate()
    );

    await this.academicRepository.saveSubjectTeacherAssignment(assignment);

    // Audit log
    if (this.systemLogRepository) {
      await this.systemLogRepository.create({
        schoolId: dto.schoolId,
        level: 'INFO',
        category: 'ACADEMICS',
        action: 'SUBJECT_TEACHER_ASSIGNED',
        actorUserId: requestingUser?.userId,
        actorEmail: requestingUser?.email,
        actorRole: requestingUser?.role,
        status: 'SUCCESS',
        details: `Assigned teacher ${teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : dto.teacherId} as ${role} for ${learningArea.name}`,
        metadata: {
          assignmentId: assignment.id,
          learningAreaId: dto.learningAreaId,
          teacherId: dto.teacherId,
          role,
          academicYearId: dto.academicYearId
        }
      } as any).catch(() => {});
    }

    return assignment.toJSON();
  }

  public async listSubjectTeacherAssignments(filters?: {
    schoolId?: string;
    academicYearId?: string;
    classRoomId?: string;
    streamId?: string;
    learningAreaId?: string;
    teacherId?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const assignments = await this.academicRepository.findSubjectTeacherAssignments(filters);

    const enriched = await Promise.all(
      assignments.map(async a => {
        let teacherName = 'Assigned Teacher';
        let teacherEmployeeNumber = '';
        if (this.teacherRepository) {
          try {
            const t = await this.teacherRepository.findById(a.teacherId);
            if (t) {
              teacherEmployeeNumber = t.employeeNumber;
              if (this.userRepository) {
                const u = await this.userRepository.findById(t.userId);
                if (u) teacherName = `${u.firstName} ${u.lastName}`.trim();
              }
            }
          } catch {}
        }

        let learningAreaName = '';
        let learningAreaCode = '';
        try {
          const la = await this.academicRepository.findLearningAreaById(a.learningAreaId);
          if (la) {
            learningAreaName = la.name;
            learningAreaCode = la.code;
          }
        } catch {}

        let className = '';
        if (a.classRoomId) {
          try {
            const c = await this.academicRepository.findClassById(a.classRoomId);
            if (c) className = c.name;
          } catch {}
        }

        let streamName = '';
        if (a.streamId) {
          try {
            const s = await this.academicRepository.findStreamById(a.streamId);
            if (s) streamName = s.name;
          } catch {}
        }

        let academicYearName = '';
        try {
          const y = await this.academicRepository.findYearById(a.academicYearId);
          if (y) academicYearName = y.name;
        } catch {}

        return {
          ...a.toJSON(),
          teacherName,
          teacherEmployeeNumber,
          learningAreaName,
          learningAreaCode,
          className,
          streamName,
          academicYearName
        };
      })
    );

    return enriched;
  }

  public async deactivateSubjectTeacherAssignment(
    assignmentId: string,
    effectiveTo?: string,
    requestingUser?: UserContext
  ) {
    if (requestingUser && !isAcademicAdminRole(requestingUser.role)) {
      throw new ForbiddenError('Only school administrators and head teachers can deactivate subject assignments.');
    }

    const assignments = await this.academicRepository.findSubjectTeacherAssignments({ schoolId: requestingUser?.schoolId });
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      throw new NotFoundError('Subject Teacher Assignment', assignmentId);
    }

    assignment.deactivate(effectiveTo || new Date().toISOString().split('T')[0]);
    await this.academicRepository.saveSubjectTeacherAssignment(assignment);
    return assignment.toJSON();
  }

  public async getTeacherAuthorizedContext(
    requestingUser?: UserContext,
    academicYearId?: string,
    termId?: string
  ): Promise<{
    isGlobalAdmin: boolean;
    teacherId?: string;
    editableLearningAreaIds?: string[];
    teachingModel: 'CLASS_TEACHER' | 'SUBJECT_TEACHER' | 'HYBRID' | 'GLOBAL_ADMIN';
    assignedClasses: Array<{
      id: string;
      name: string;
      gradeLevel: string;
      streams: Array<{ id: string; name: string }>;
      wholeClass?: boolean;
      subjectsByStream?: Record<string, Array<{id:string; code:string; name:string; gradeLevel?:string}>>;
      classTeacherByStream?: Record<string, boolean>;
    }>;
    authorizedSubjectsByClass: Record<string, Array<{
      id: string;
      code: string;
      name: string;
      gradeLevel?: string;
    }>>;
  }> {
    if (!requestingUser) {
      throw new ForbiddenError('Authentication required to retrieve academic context.');
    }

    const schoolId = requestingUser.schoolId || 'school-001';
    const allClasses = await this.academicRepository.findAllClasses(schoolId);
    const allLearningAreas = await this.listLearningAreas({ schoolId });

    // If Admin, Principal, Head Teacher, Super Admin -> return full school context
    if (isAcademicAdminRole(requestingUser.role)) {
      const assignedClasses = await Promise.all(
        allClasses.map(async (cls: ClassRoom) => {
          const streams = await this.academicRepository.findStreamsByClass(cls.id);
          return {
            id: cls.id,
            name: cls.name,
            gradeLevel: cls.gradeLevel,
            streams: streams.map(s => ({ id: s.id, name: s.name }))
          };
        })
      );

      const authorizedSubjectsByClass: Record<string, Array<{ id: string; code: string; name: string; gradeLevel?: string }>> = {};
      for (const cls of allClasses) {
        const clsGrade = (cls.gradeLevel || '').toUpperCase().replace(/[\s-]/g, '_');
        const matchingLas = allLearningAreas.filter((la: any) => {
          if (!la.gradeLevel) return true;
          const laGrade = String(la.gradeLevel).toUpperCase().replace(/[\s-]/g, '_');
          return laGrade === clsGrade || clsGrade.includes(laGrade) || laGrade.includes(clsGrade);
        });
        const lasToUse = matchingLas.length > 0 ? matchingLas : allLearningAreas;
        authorizedSubjectsByClass[cls.id] = lasToUse.map((la: any) => ({
          id: la.id,
          code: la.code,
          name: la.name,
          gradeLevel: la.gradeLevel
        }));
      }

      return {
        isGlobalAdmin: true,
        teachingModel: 'GLOBAL_ADMIN',
        assignedClasses,
        authorizedSubjectsByClass
      };
    }

    if (!this.teacherRepository) {
      return {
        isGlobalAdmin: false,
        teachingModel: 'SUBJECT_TEACHER',
        assignedClasses: [],
        authorizedSubjectsByClass: {}
      };
    }

    const teacher = await this.teacherRepository.findByUserId(requestingUser.userId);
    if (!teacher) {
      return {
        isGlobalAdmin: false,
        teachingModel: 'SUBJECT_TEACHER',
        assignedClasses: [],
        authorizedSubjectsByClass: {}
      };
    }

    // Use the same period-aware policy as learner, curriculum and export requests.
    // Legacy profile arrays are display caches, never a source of permission.
    const access = new TeacherAssignmentAccess(this.academicRepository, this.teacherRepository);
    const scope = { academicYearId, termId };
    const assigned = await access.assignments(requestingUser, scope);
    const assignedClasses = [];
    const editableLearningAreaIds = new Set<string>();
    const authorizedSubjectsByClass: Record<string, Array<{id:string; code:string; name:string; gradeLevel?:string}>> = {};
    // Use one request-local assignment snapshot. Re-reading period/profile/duties for
    // every subject both slows login and risks contradictory results during reassignment.
    // Classes/areas below are already school-scoped; streams are loaded by their class.
    for (const cls of allClasses) {
      const canTeach = (streamId?: string, learningAreaId?: string) =>
        assigned.classes.some(a => matchesTeachingCohort(a, cls.id, streamId)) ||
        assigned.subjects.some(a => matchesTeachingCohort(a, cls.id, streamId) && (!learningAreaId || a.learningAreaId === learningAreaId));
      const wholeClass = canTeach();
      const streams = await this.academicRepository.findStreamsByClass(cls.id);
      const allowedStreams = [];
      const subjectsByStream: Record<string, Array<{id:string; code:string; name:string; gradeLevel?:string}>> = {};
      const classTeacherByStream: Record<string,boolean> = {};
      const subjects = new Map<string, {id:string; code:string; name:string; gradeLevel?:string}>();
      for (const stream of [undefined,...streams]) {
        if (!canTeach(stream?.id)) continue;
        if (stream) allowedStreams.push({id:stream.id,name:stream.name});
        const areas = [];
        for (const area of allLearningAreas.filter(a=>a.gradeLevel===cls.gradeLevel)) {
          if (canTeach(stream?.id, area.id)) {
            const item={id:area.id,code:area.code,name:area.name,gradeLevel:area.gradeLevel};
            areas.push(item); subjects.set(area.id,item);
            if (teachesAllLowerPrimaryAreas(cls.gradeLevel, assigned.classes, cls.id, stream?.id) || assigned.subjects.some(a => ['SUBJECT_TEACHER', 'SUBJECT_LEAD'].includes(a.role)
              && a.learningAreaId === area.id && matchesTeachingCohort(a, cls.id, stream?.id))) editableLearningAreaIds.add(area.id);
          }
        }
        subjectsByStream[stream?.id || ''] = areas;
        classTeacherByStream[stream?.id || ''] = assigned.classes.some(a=>matchesTeachingCohort(a,cls.id,stream?.id));
      }
      if (!wholeClass && !allowedStreams.length) continue;
      assignedClasses.push({id:cls.id,name:cls.name,gradeLevel:cls.gradeLevel,streams:allowedStreams,wholeClass,subjectsByStream,classTeacherByStream});
      authorizedSubjectsByClass[cls.id]=[...subjects.values()];
    }
    return {
      isGlobalAdmin:false, teacherId:teacher.id,
      teachingModel: assigned.classes.length ? (assigned.subjects.length ? 'HYBRID' : 'CLASS_TEACHER') : 'SUBJECT_TEACHER',
      assignedClasses, authorizedSubjectsByClass,
      editableLearningAreaIds: [...editableLearningAreaIds]
    };
  }
}
