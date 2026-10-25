import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { School, SchoolProps } from '../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../core/domain/academic/ClassRoom';
import { CBCGradeLevel } from '../../core/domain/user/Student';
import { UserRole, isTermInitializationAuthorizedRole, TERM_INITIALIZATION_AUTHORIZED_ROLES } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../core/domain/shared/Errors';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole | string;
  schoolId?: string;
}

export class AcademicUseCases {
  constructor(private readonly academicRepository: IAcademicRepository) {}

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
          address: 'KEMRI Street, Kisian, Kisumu, Kenya',
          logoUrl: '/logo.png',
          currency: 'KES',
          latitude: -0.061234,
          longitude: 34.721234,
          geofenceRadius: 250,
          geofenceEnabled: true
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
      school.phone !== '0745436312'
    ) {
      school = School.create(
        {
          name: 'Grace Seeds School',
          code: school.code || 'GSS-001',
          centerCode: school.centerCode,
          motto: 'The future Begins Here',
          email: 'schoolgraceseeds@gmail.com',
          phone: '0745436312',
          address: school.address || 'KEMRI Street, Kisian, Kisumu, Kenya',
          logoUrl: school.logoUrl || '/logo.png',
          currency: school.currency || 'KES',
          latitude: school.latitude ?? -0.061234,
          longitude: school.longitude ?? 34.721234,
          geofenceRadius: school.geofenceRadius ?? 250,
          geofenceEnabled: school.geofenceEnabled ?? true
        },
        school.id
      );
      await this.academicRepository.updateSchool(school);
    }
    return school.toJSON();
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
    dto: { name?: string; startDate?: string; endDate?: string; termNumber?: number; isCurrent?: boolean }
  ) {
    const term = await this.academicRepository.findTermById(id);
    if (!term) throw new NotFoundError(`Academic term with id ${id}`);

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
    return term.toJSON();
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
    const stream = Stream.create(dto, IdGenerator.generate());
    await this.academicRepository.saveStream(stream);
    return stream.toJSON();
  }

  public async listStreamsByClass(classRoomId: string) {
    const streams = await this.academicRepository.findStreamsByClass(classRoomId);
    return streams.map(s => s.toJSON());
  }

  // Learning Areas (Subjects)
  public async createLearningArea(dto: { name: string; code: string; gradeLevel: CBCGradeLevel; educationLevel: EducationLevel; isElective: boolean; schoolId: string; teacherId?: string }) {
    const learningArea = LearningArea.create(dto, IdGenerator.generate());
    await this.academicRepository.saveLearningArea(learningArea);
    return learningArea.toJSON();
  }

  public async listLearningAreas(filters?: { gradeLevel?: CBCGradeLevel; schoolId?: string }) {
    let areas = await this.academicRepository.findAllLearningAreas(filters);
    if (areas.length === 0) {
      const schoolId = filters?.schoolId || 'school-001';
      const defaultSubjects: { name: string; code: string; gradeLevel: CBCGradeLevel; educationLevel: EducationLevel; isElective: boolean }[] = [
        // 1. Grace Seeds Pre-Primary (Playgroup, PP1, PP2)
        ...[CBCGradeLevel.PLAYGROUP, CBCGradeLevel.PP1, CBCGradeLevel.PP2].flatMap(g => [
          { name: 'Language Activities', code: 'LANG_ACT', gradeLevel: g, educationLevel: EducationLevel.PRE_PRIMARY, isElective: false },
          { name: 'Mathematical Activities', code: 'MATH_ACT', gradeLevel: g, educationLevel: EducationLevel.PRE_PRIMARY, isElective: false },
          { name: 'Creative Activities', code: 'CREAT_ACT', gradeLevel: g, educationLevel: EducationLevel.PRE_PRIMARY, isElective: false },
          { name: 'Religious Activities', code: 'REL_ACT', gradeLevel: g, educationLevel: EducationLevel.PRE_PRIMARY, isElective: false },
          { name: 'Environmental Activities', code: 'ENV_ACT', gradeLevel: g, educationLevel: EducationLevel.PRE_PRIMARY, isElective: false },
        ]),

        // 2. Grace Seeds Lower Primary (Grade 1 - 3)
        ...[CBCGradeLevel.GRADE_1, CBCGradeLevel.GRADE_2, CBCGradeLevel.GRADE_3].flatMap(g => [
          { name: 'English', code: 'ENG', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Mathematics', code: 'MATH', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Kiswahili', code: 'KISW', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Creative Activities', code: 'CREAT', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Environmental Activities', code: 'ENV', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Religious Education', code: 'CRE', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
          { name: 'Indigenous Language', code: 'INDIG', gradeLevel: g, educationLevel: EducationLevel.LOWER_PRIMARY, isElective: false },
        ]),

        // 3. Grace Seeds Upper Primary (Grade 4 - 6)
        ...[CBCGradeLevel.GRADE_4, CBCGradeLevel.GRADE_5, CBCGradeLevel.GRADE_6].flatMap(g => [
          { name: 'Mathematics', code: 'MATH', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'English', code: 'ENG', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Kiswahili', code: 'KISW', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Science and Technology', code: 'SCI_TECH', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Agriculture', code: 'AGRI', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Creative Arts', code: 'ARTS', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Social Studies', code: 'SST', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
          { name: 'Christian Religious Education', code: 'CRE', gradeLevel: g, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false },
        ]),

        // 4. Junior School (Grade 7 - 12 Standard CBC Learning Areas)
        { name: 'Mathematics', code: 'MATH', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'English Language', code: 'ENG', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Kiswahili Language', code: 'KISW', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Integrated Science', code: 'INTSCI', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Health Education', code: 'HLTH', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Social Studies', code: 'SST', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Christian Religious Education', code: 'CRE', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Agriculture & Nutrition', code: 'AGRI', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Pre-Technical Studies', code: 'PRETECH', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Creative Arts & Sports', code: 'ARTS', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Business Studies', code: 'BUS', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
        { name: 'Computer Science', code: 'COMP', gradeLevel: CBCGradeLevel.GRADE_7, educationLevel: EducationLevel.JUNIOR_SCHOOL, isElective: false },
      ];

      for (const subj of defaultSubjects) {
        const la = LearningArea.create(
          {
            name: subj.name,
            code: subj.code,
            gradeLevel: subj.gradeLevel,
            educationLevel: subj.educationLevel,
            isElective: subj.isElective,
            schoolId,
          },
          IdGenerator.generate()
        );
        await this.academicRepository.saveLearningArea(la);
      }
      areas = await this.academicRepository.findAllLearningAreas(filters);
    }
    return areas.map(a => a.toJSON());
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
}
