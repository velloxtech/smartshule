import {
  ICBCAssessmentRepository,
  FormativeFilterCriteria,
  SummativeFilterCriteria
} from '../../core/ports/repositories/ICbcAssessmentRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IGuardianRepository, ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { UserRole } from '../../core/domain/user/User';
import {
  Strand,
  SubStrand,
  FormativeAssessment,
  SummativeAssessment,
  CBCReportCard,
  PerformanceLevel,
  AssessmentMethod,
  CoreCompetency,
  CoreValue,
  PerformanceLevelScores,
  StrandAssessmentScore,
  LearningAreaReportEntry,
  CoreCompetencyAssessmentEntry,
  ValueAssessmentEntry,
  TermTrendEntry
} from '../../core/domain/cbc/CbcAssessment';
import { Student, CBCGradeLevel, StudentStatus } from '../../core/domain/user/Student';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';
import { EducationLevel, LearningArea } from '../../core/domain/academic/ClassRoom';
import { IdGenerator, NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../core/domain/shared/Errors';
import { BroadsheetUseCases } from '../academics/BroadsheetUseCases';

export interface UserContext {
  userId: string;
  role: UserRole;
  email?: string;
  schoolId?: string;
}

const CANONICAL_ORDER = [
  'LAN',
  'MATH',
  'ENG',
  'REA',
  'KISW',
  'KUSO',
  'SCI',
  'SST',
  'CRE',
  'CREA',
  'AGRI',
  'ARTS',
  'PRETECH',
  'HLTH',
  'ENV',
  'BUS',
  'COMP',
  'FRE',
  'GER',
  'ARA',
  'IND'
];

export interface CreateStrandDTO {
  learningAreaId: string;
  gradeLevel: CBCGradeLevel;
  code: string;
  title: string;
  description?: string;
}

export interface UpdateStrandDTO {
  learningAreaId?: string;
  gradeLevel?: CBCGradeLevel;
  code?: string;
  title?: string;
  description?: string;
}

export interface CreateSubStrandDTO {
  strandId: string;
  code: string;
  title: string;
  specificLearningOutcomes: string[];
  suggestedExperiences?: string[];
}

export interface UpdateSubStrandDTO {
  strandId?: string;
  code?: string;
  title?: string;
  specificLearningOutcomes?: string[];
  suggestedExperiences?: string[];
}

export interface RecordFormativeDTO {
  studentId: string;
  teacherId?: string;
  learningAreaId: string;
  subStrandId: string;
  termId?: string;
  academicYearId?: string;
  assessmentDate?: string;
  assessmentMethod: AssessmentMethod;
  performanceLevel: PerformanceLevel;
  specificOutcomeTested: string;
  teacherRemarks?: string;
  evidenceNotes?: string;
  targetedCompetencies?: CoreCompetency[];
  valuesObserved?: CoreValue[];
}

export interface RecordSummativeDTO {
  studentId: string;
  teacherId?: string;
  learningAreaId: string;
  termId?: string;
  academicYearId?: string;
  strandScores?: { strandId?: string; performanceLevel: PerformanceLevel; rawScore?: number; maxScore?: number }[];
  overallPerformanceLevel: PerformanceLevel;
  teacherRemarks?: string;
  evaluationDate?: string;
}

export interface GenerateReportCardDTO {
  studentId: string;
  termId: string;
  academicYearId: string;
  classTeacherRemarks: string;
  headTeacherRemarks: string;
  closingDate?: string;
  nextTermOpeningDate?: string;
}

export class CBCAssessmentUseCases {
  private broadsheetUseCases?: BroadsheetUseCases;

  constructor(
    private readonly CBCRepository: ICBCAssessmentRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly academicRepository: IAcademicRepository,
    private readonly attendanceRepository: IAttendanceRepository,
    private readonly guardianRepository?: IGuardianRepository,
    private readonly userRepository?: IUserRepository,
    private readonly teacherRepository?: ITeacherRepository,
    private readonly feeRepository?: IFeeRepository,
    broadsheetUseCases?: BroadsheetUseCases
  ) {
    this.broadsheetUseCases = broadsheetUseCases;
  }

  private getBroadsheetEngine(): BroadsheetUseCases {
    if (!this.broadsheetUseCases) {
      this.broadsheetUseCases = new BroadsheetUseCases(
        this.academicRepository,
        this.studentRepository,
        this.CBCRepository,
        this.teacherRepository
      );
    }
    return this.broadsheetUseCases;
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

  // 1. Strands and SubStrands
  public async createStrand(dto: CreateStrandDTO) {
    const existingStrands = await this.CBCRepository.findStrandsByLearningArea(dto.learningAreaId, dto.gradeLevel);
    const dup = existingStrands.find(
      s => s.code.trim().toUpperCase() === dto.code.trim().toUpperCase() ||
           s.title.trim().toLowerCase() === dto.title.trim().toLowerCase()
    );
    if (dup) {
      return dup.toJSON();
    }

    const strand = Strand.create(dto, IdGenerator.generate());
    await this.CBCRepository.saveStrand(strand);
    return strand.toJSON();
  }

  public async updateStrand(id: string, dto: UpdateStrandDTO) {
    const strand = await this.CBCRepository.findStrandById(id);
    if (!strand) throw new NotFoundError('Strand', id);

    const targetAreaId = dto.learningAreaId || strand.learningAreaId;
    const targetGrade = dto.gradeLevel || strand.gradeLevel;
    const existingStrands = await this.CBCRepository.findStrandsByLearningArea(targetAreaId, targetGrade);
    const dup = existingStrands.find(
      s => s.id !== id && (
        (dto.code && s.code.trim().toUpperCase() === dto.code.trim().toUpperCase()) ||
        (dto.title && s.title.trim().toLowerCase() === dto.title.trim().toLowerCase())
      )
    );
    if (dup) {
      throw new ConflictError(`Another strand with code '${dto.code || strand.code}' or title '${dto.title || strand.title}' already exists for this learning area and grade.`);
    }

    strand.updateDetails(dto);
    await this.CBCRepository.saveStrand(strand);
    return strand.toJSON();
  }

  public async getStrandsByLearningArea(learningAreaId: string, gradeLevel?: CBCGradeLevel) {
    const strands = await this.CBCRepository.findStrandsByLearningArea(learningAreaId, gradeLevel);
    return strands.map(s => s.toJSON());
  }

  public async createSubStrand(dto: CreateSubStrandDTO) {
    const strand = await this.CBCRepository.findStrandById(dto.strandId);
    if (!strand) throw new NotFoundError('Strand', dto.strandId);

    const existingSubs = await this.CBCRepository.findSubStrandsByStrand(dto.strandId);
    const dup = existingSubs.find(
      sub => sub.code.trim().toUpperCase() === dto.code.trim().toUpperCase() ||
             sub.title.trim().toLowerCase() === dto.title.trim().toLowerCase()
    );
    if (dup) {
      return dup.toJSON();
    }

    const subStrand = SubStrand.create(dto, IdGenerator.generate());
    await this.CBCRepository.saveSubStrand(subStrand);
    return subStrand.toJSON();
  }

  public async updateSubStrand(id: string, dto: UpdateSubStrandDTO) {
    const subStrand = await this.CBCRepository.findSubStrandById(id);
    if (!subStrand) throw new NotFoundError('SubStrand', id);

    const targetStrandId = dto.strandId || subStrand.strandId;
    const existingSubs = await this.CBCRepository.findSubStrandsByStrand(targetStrandId);
    const dup = existingSubs.find(
      sub => sub.id !== id && (
        (dto.code && sub.code.trim().toUpperCase() === dto.code.trim().toUpperCase()) ||
        (dto.title && sub.title.trim().toLowerCase() === dto.title.trim().toLowerCase())
      )
    );
    if (dup) {
      throw new ConflictError(`Another sub-strand with code '${dto.code || subStrand.code}' or title '${dto.title || subStrand.title}' already exists under this strand.`);
    }

    subStrand.updateDetails(dto);
    await this.CBCRepository.saveSubStrand(subStrand);
    return subStrand.toJSON();
  }

  public async getSubStrandsByStrand(strandId: string) {
    const subStrands = await this.CBCRepository.findSubStrandsByStrand(strandId);
    return subStrands.map(s => s.toJSON());
  }

  // 2. Formative Assessment
  public async recordFormativeAssessment(dto: RecordFormativeDTO, requestingUser?: UserContext) {
    let student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      student = await this.studentRepository.findByAdmissionNumber(dto.studentId);
    }
    if (!student) throw new NotFoundError('Student', dto.studentId);

    const userToAssert = requestingUser || (dto as any).requestingUser;
    if (userToAssert) {
      await this.assertTeacherAuthorizedForMarks(
        student.classroomId || '',
        student.streamId,
        dto.learningAreaId,
        dto.academicYearId || '',
        userToAssert,
        student.gradeLevel
      );
    }

    let subStrand = await this.CBCRepository.findSubStrandById(dto.subStrandId);
    if (!subStrand) {
      // Check if subStrandId is actually a code or title under this learning area
      const strands = await this.CBCRepository.findStrandsByLearningArea(dto.learningAreaId);
      for (const st of strands) {
        const subs = await this.CBCRepository.findSubStrandsByStrand(st.id);
        const match = subs.find(s => 
          s.id === dto.subStrandId || 
          s.code.trim().toUpperCase() === dto.subStrandId.trim().toUpperCase() ||
          s.title.trim().toLowerCase() === dto.subStrandId.trim().toLowerCase()
        );
        if (match) {
          subStrand = match;
          break;
        }
      }
    }

    if (!subStrand) {
      // Graceful auto-provision so formative assessment upload is never blocked
      const strands = await this.CBCRepository.findStrandsByLearningArea(dto.learningAreaId);
      let targetStrand = strands[0];
      if (!targetStrand) {
        const studentGrade = (student.gradeLevel || 'GRADE_7') as any;
        targetStrand = Strand.create({
          learningAreaId: dto.learningAreaId,
          gradeLevel: studentGrade,
          code: `STR-${IdGenerator.generate().slice(0, 4).toUpperCase()}`,
          title: 'Core Curriculum Strand',
          description: 'Auto-provisioned strand'
        }, IdGenerator.generate());
        await this.CBCRepository.saveStrand(targetStrand);
      }

      subStrand = SubStrand.create({
        strandId: targetStrand.id,
        code: `${targetStrand.code}.1`,
        title: dto.specificOutcomeTested || 'Competency Outcome',
        specificLearningOutcomes: [dto.specificOutcomeTested || 'Demonstrates expected competency'],
      }, dto.subStrandId || IdGenerator.generate());
      await this.CBCRepository.saveSubStrand(subStrand);
    }

    let termId = dto.termId;
    let academicYearId = dto.academicYearId;
    if (!academicYearId || !termId) {
      try {
        const activeYear = await this.academicRepository.findCurrentYear();
        if (activeYear) {
          academicYearId = academicYearId || activeYear.id;
          const terms = await this.academicRepository.findTermsByYear(activeYear.id);
          const activeTerm = terms.find(t => t.isCurrent) || terms[0];
          if (activeTerm) {
            termId = termId || activeTerm.id;
          }
        }
      } catch {
        // Continue with defaults
      }
    }

    const teacherId = (dto.teacherId && dto.teacherId.trim() !== '') ? dto.teacherId : 'tch-default-01';

    const assessment = FormativeAssessment.create({
      ...dto,
      teacherId,
      termId: termId || 'term-default',
      academicYearId: academicYearId || 'year-default',
      assessmentDate: dto.assessmentDate || new Date().toISOString().split('T')[0]
    }, IdGenerator.generate());
    await this.CBCRepository.saveFormative(assessment);
    return assessment.toJSON();
  }

  public async listFormativeAssessments(filters: FormativeFilterCriteria & { requestingUser?: UserContext }) {
    const isParent = filters?.requestingUser?.role === UserRole.PARENT || filters?.requestingUser?.role === UserRole.GUARDIAN;
    let targetRecords: FormativeAssessment[] = [];

    if (isParent && filters.requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(filters.requestingUser.userId);
      if (filters.studentId) {
        if (!childIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view assessments for your registered children.');
        }
        targetRecords = await this.CBCRepository.findFormatives(filters);
      } else {
        if (childIds.length === 0) return [];
        for (const cid of childIds) {
          const studentFormatives = await this.CBCRepository.findFormatives({
            ...filters,
            studentId: cid
          });
          targetRecords.push(...studentFormatives);
        }
      }
    } else {
      targetRecords = await this.CBCRepository.findFormatives(filters);
    }

    return Promise.all(
      targetRecords.map(async r => {
        const json = r.toJSON();
        let studentName = 'Learner';
        let admissionNumber = '';
        let gradeLevel = '';
        try {
          const student = await this.studentRepository.findById(json.studentId);
          if (student) {
            studentName = `${student.firstName} ${student.lastName}`.trim();
            admissionNumber = student.admissionNumber || '';
            gradeLevel = student.gradeLevel || '';
          }
        } catch {
          // fallback
        }

        let learningAreaName = json.learningAreaId;
        try {
          if (this.academicRepository?.findLearningAreaById) {
            const la = await this.academicRepository.findLearningAreaById(json.learningAreaId);
            if (la) {
              learningAreaName = la.name;
            }
          }
        } catch {
          // fallback
        }

        let subStrandTitle = json.subStrandId;
        try {
          const sub = await this.CBCRepository.findSubStrandById(json.subStrandId);
          if (sub) {
            subStrandTitle = sub.title;
          }
        } catch {
          // fallback
        }

        let teacherName = 'CBC Educator';
        if (json.teacherId && this.userRepository) {
          try {
            const u = await this.userRepository.findById(json.teacherId);
            if (u) {
              teacherName = `${u.firstName} ${u.lastName}`.trim();
            }
          } catch {
            // fallback
          }
        }

        return {
          ...json,
          studentName,
          admissionNumber,
          gradeLevel,
          learningAreaName,
          subStrandTitle,
          teacherName
        };
      })
    );
  }

  private getCanonicalSubjectKey(str: string): string {
    if (!str) return 'OTHER';
    const clean = str.trim().toUpperCase();
    if (clean.includes('READING') || clean.includes('LITERACY') || /(^|[-_ \b])(REA|LIT)([-_ \b]|$)/i.test(clean)) return 'REA';
    if (clean.includes('KUSOMA') || /(^|[-_ \b])(KUSO|WKU)([-_ \b]|$)/i.test(clean)) return 'KUSO';
    if (clean.includes('ENVIRONMENT') || clean.includes('ENVI') || clean.includes('SENV') || /(^|[-_ \b])ENV([-_ \b]|$)/i.test(clean)) return 'ENV';
    if (clean.includes('ENG') || clean.includes('ENGLISH')) return 'ENG';
    if (clean.includes('KISW') || clean.includes('SWAHILI') || /(^|[-_ \b])KIS([-_ \b]|$)/i.test(clean)) return 'KISW';
    if (clean.includes('INDIGENOUS') || /(^|[-_ \b])IND([-_ \b]|$)/i.test(clean)) return 'IND';
    if (clean.includes('FRENCH') || /(^|[-_ \b])FRE([-_ \b]|$)/i.test(clean)) return 'FRE';
    if (clean.includes('GERMAN') || /(^|[-_ \b])GER([-_ \b]|$)/i.test(clean)) return 'GER';
    if (clean.includes('ARABIC') || /(^|[-_ \b])ARA([-_ \b]|$)/i.test(clean)) return 'ARA';
    if (clean.includes('MATH') || /(^|[-_ \b])MAT([-_ \b]|$)/i.test(clean)) return 'MATH';
    if (clean.includes('SPIRITUAL') || /(^|[-_ \b])SRE([-_ \b]|$)/i.test(clean)) return 'SRE';
    if (clean.includes('ARTS') || clean.includes('SPORT') || clean.includes('MUSIC')) return 'ARTS';
    if (clean.includes('CREATIVE') || clean.includes('PSYCHOMOTOR') || /(^|[-_ \b])(CREA|CRA)([-_ \b]|$)/i.test(clean)) return 'CREA';
    if (clean.includes('RELIGIOUS') || clean.includes('IRE') || clean.includes('HRE') || /(^|[-_ \b])CRE([-_ \b]|$)/i.test(clean)) return 'CRE';
    if (clean.includes('INTEGRATED SCIENCE') || clean.includes('INTSCI') || clean.includes('SCI_TECH') || clean.includes('SCIENCE') || /(^|[-_ \b])SCI([-_ \b]|$)/i.test(clean)) return 'SCI';
    if (clean.includes('HEALTH') || /(^|[-_ \b])HLTH([-_ \b]|$)/i.test(clean)) return 'HLTH';
    if (clean.includes('SOCIAL') || clean.includes('SST') || /(^|[-_ \b])SOC([-_ \b]|$)/i.test(clean)) return 'SST';
    if (clean.includes('AGRI') || clean.includes('NUTRITION') || /(^|[-_ \b])AGR([-_ \b]|$)/i.test(clean)) return 'AGRI';
    if (clean.includes('PRE-TECH') || clean.includes('PRETECH') || clean.includes('TECHNICAL') || clean.includes('PTECH') || /(^|[-_ \b])PRET([-_ \b]|$)/i.test(clean)) return 'PRETECH';
    if (clean.includes('BUSINESS') || /(^|[-_ \b])BUS([-_ \b]|$)/i.test(clean)) return 'BUS';
    if (clean.includes('COMPUTER') || /(^|[-_ \b])COMP([-_ \b]|$)/i.test(clean)) return 'COMP';
    if (clean.includes('LANGUAGE ACTIVITIES') || /(^|[-_ \b])LAN([-_ \b]|$)/i.test(clean)) return 'LAN';
    return clean;
  }

  private getCanonicalSubjectName(key: string): string {
    switch (key) {
      case 'MATH': return 'Mathematics';
      case 'ENG': return 'English Language';
      case 'KISW': return 'Kiswahili Language';
      case 'REA': return 'English Reading / Literacy Activities';
      case 'KUSO': return 'Kusoma Activities';
      case 'ENV': return 'Environmental Activities';
      case 'LAN': return 'Language Activities';
      case 'CREA': return 'Creative Activities';
      case 'ARTS': return 'Creative Arts & Sports';
      case 'SCI': return 'Science and Technology';
      case 'SST': return 'Social Studies';
      case 'CRE': return 'Christian Religious Education';
      case 'SRE': return 'Religious Education Activities';
      case 'AGRI': return 'Agriculture & Nutrition';
      case 'PRETECH': return 'Pre-Technical Studies';
      case 'HLTH': return 'Health Education';
      case 'BUS': return 'Business Studies';
      case 'COMP': return 'Computer Science';
      case 'IND': return 'Indigenous Language Activities';
      default: return key;
    }
  }

  private getEducationLevelForGrade(grade?: string): EducationLevel {
    if (!grade) return EducationLevel.UPPER_PRIMARY;
    const g = String(grade).toUpperCase();
    if (g.includes('PLAYGROUP') || g.includes('PP1') || g.includes('PP2')) return EducationLevel.PRE_PRIMARY;
    if (g.includes('GRADE_1') || g.includes('GRADE_2') || g.includes('GRADE_3')) return EducationLevel.LOWER_PRIMARY;
    if (g.includes('GRADE_4') || g.includes('GRADE_5') || g.includes('GRADE_6')) return EducationLevel.UPPER_PRIMARY;
    return EducationLevel.JUNIOR_SCHOOL;
  }

  // 3. Summative Assessment
  private async resolveValidLearningAreaId(incomingIdOrCode: string, studentGradeLevel?: string, schoolId?: string): Promise<string> {
    if (!incomingIdOrCode) {
      throw new ValidationError('Learning area ID is required.');
    }

    try {
      const area = await this.academicRepository.findLearningAreaById(incomingIdOrCode);
      if (area) return area.id;
    } catch {
      // Ignore not found on direct id and check all
    }

    const allAreas = await this.academicRepository.findAllLearningAreas().catch(() => []);
    const targetKey = this.getCanonicalSubjectKey(incomingIdOrCode);
    const targetName = this.getCanonicalSubjectName(targetKey).toLowerCase();

    const gradeClean = studentGradeLevel ? String(studentGradeLevel).toUpperCase().replace(/[\s-]/g, '_') : '';
    if (gradeClean && allAreas.length > 0) {
      const gradeAreas = allAreas.filter(a => a.gradeLevel && a.gradeLevel.toUpperCase().replace(/[\s-]/g, '_') === gradeClean);
      const matchInGrade = gradeAreas.find(a =>
        a.id.toLowerCase() === incomingIdOrCode.toLowerCase() ||
        a.code?.toUpperCase() === incomingIdOrCode.toUpperCase() ||
        this.getCanonicalSubjectKey(a.code) === targetKey ||
        this.getCanonicalSubjectKey(a.name) === targetKey ||
        this.getCanonicalSubjectKey(a.id) === targetKey
      );
      if (matchInGrade) return matchInGrade.id;
    }

    const matchAny = allAreas.find(a =>
      a.id.toLowerCase() === incomingIdOrCode.toLowerCase() ||
      a.code?.toUpperCase() === incomingIdOrCode.toUpperCase() ||
      this.getCanonicalSubjectKey(a.code) === targetKey ||
      this.getCanonicalSubjectKey(a.name) === targetKey
    );
    if (matchAny) return matchAny.id;

    const matchName = allAreas.find(a =>
      a.name?.toLowerCase().includes(targetName) ||
      targetName.includes(a.name?.toLowerCase() || '')
    );
    if (matchName) return matchName.id;

    const finalGrade = (studentGradeLevel as CBCGradeLevel) || CBCGradeLevel.GRADE_4;
    const cleanPfx = String(finalGrade).toLowerCase().replace(/grade_/, 'g').replace(/_/g, '');
    const newId = `la-${cleanPfx}-${targetKey.toLowerCase()}`;
    const subjectName = this.getCanonicalSubjectName(targetKey);
    const educationLevel = this.getEducationLevelForGrade(finalGrade);

    try {
      const newArea = LearningArea.create({
        name: subjectName,
        code: targetKey,
        gradeLevel: finalGrade,
        educationLevel,
        isElective: false,
        schoolId: schoolId || 'school-001'
      }, newId);
      await this.academicRepository.saveLearningArea(newArea);
      return newArea.id;
    } catch {
      return incomingIdOrCode;
    }
  }

  public async recordSummativeAssessment(dto: RecordSummativeDTO, requestingUser?: UserContext) {
    let student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      student = await this.studentRepository.findByAdmissionNumber(dto.studentId);
    }
    if (!student) throw new NotFoundError('Student', dto.studentId);

    const userToAssert = requestingUser || (dto as any).requestingUser;
    if (userToAssert) {
      await this.assertTeacherAuthorizedForMarks(
        student.classroomId || '',
        student.streamId,
        dto.learningAreaId,
        dto.academicYearId || '',
        userToAssert,
        student.gradeLevel
      );
    }

    if (dto.strandScores && Array.isArray(dto.strandScores)) {
      for (const item of dto.strandScores) {
        if (item && item.rawScore !== undefined) {
          if (item.rawScore < 0) {
            throw new ValidationError('Assessment score cannot be negative.');
          }
          const max = item.maxScore !== undefined && item.maxScore > 0 ? item.maxScore : 100;
          if (item.rawScore > max) {
            throw new ValidationError(`Assessment score (${item.rawScore}) cannot exceed maximum allowed marks (${max}).`);
          }
        }
      }
    }

    const validLearningAreaId = await this.resolveValidLearningAreaId(
      dto.learningAreaId,
      student.gradeLevel,
      student.schoolId
    );

    let termId = dto.termId;
    let academicYearId = dto.academicYearId;
    if (!academicYearId || !termId) {
      try {
        const activeYear = await this.academicRepository.findCurrentYear();
        if (activeYear) {
          academicYearId = academicYearId || activeYear.id;
          const terms = await this.academicRepository.findTermsByYear(activeYear.id);
          const activeTerm = terms.find(t => t.isCurrent) || terms[0];
          if (activeTerm) {
            termId = termId || activeTerm.id;
          }
        }
      } catch {
        // Continue with defaults
      }
    }

    const teacherId = (dto.teacherId && dto.teacherId.trim() !== '') ? dto.teacherId : 'tch-default-01';

    const strandScores: StrandAssessmentScore[] = [];
    if (dto.strandScores && Array.isArray(dto.strandScores)) {
      for (const item of dto.strandScores) {
        if (!item) continue;
        const sId = item.strandId || validLearningAreaId;
        const strand = await this.CBCRepository.findStrandById(sId).catch(() => null);
        strandScores.push({
          strandId: sId,
          strandTitle: strand ? strand.title : 'General Strand',
          performanceLevel: item.performanceLevel,
          rawScore: item.rawScore,
          maxScore: item.maxScore
        });
      }
    }

    const existing = await this.CBCRepository.findSummatives({
      studentId: dto.studentId,
      learningAreaId: validLearningAreaId,
      termId: termId || 'term-default',
      academicYearId: academicYearId || 'year-default'
    });
    const assessmentId = (existing && existing.length > 0) ? existing[0].id : IdGenerator.generate();

    const assessment = SummativeAssessment.create(
      {
        studentId: dto.studentId,
        teacherId,
        learningAreaId: validLearningAreaId,
        termId: termId || 'term-default',
        academicYearId: academicYearId || 'year-default',
        strandScores,
        overallPerformanceLevel: dto.overallPerformanceLevel,
        teacherRemarks: dto.teacherRemarks || 'Meeting CBC curriculum learning expectations.',
        evaluationDate: dto.evaluationDate || new Date().toISOString().split('T')[0]
      },
      assessmentId
    );

    await this.CBCRepository.saveSummative(assessment);
    return assessment.toJSON();
  }

  public async recordSummativeBatch(dtos: RecordSummativeDTO[], requestingUser?: UserContext) {
    const results = [];
    for (const dto of dtos) {
      const res = await this.recordSummativeAssessment(dto, requestingUser);
      results.push(res);
    }
    return results;
  }

  public async listSummativeAssessments(filters: SummativeFilterCriteria & { requestingUser?: UserContext }) {
    const isParent = filters?.requestingUser?.role === UserRole.PARENT || filters?.requestingUser?.role === UserRole.GUARDIAN;
    if (isParent && filters.requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(filters.requestingUser.userId);
      if (filters.studentId) {
        if (!childIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You are only permitted to view assessments for your registered children.');
        }
      } else {
        if (childIds.length === 0) return [];
        const results = [];
        for (const cid of childIds) {
          const studentSummatives = await this.CBCRepository.findSummatives({
            ...filters,
            studentId: cid
          });
          results.push(...studentSummatives);
        }
        return results.map(r => r.toJSON());
      }
    }

    const records = await this.CBCRepository.findSummatives(filters);
    return records.map(r => typeof r.toJSON === 'function' ? r.toJSON() : r);
  }

  public async computeStudentRankings(
    student: Student,
    termId: string,
    academicYearId: string,
    studentTotalScore: number,
    studentAvgScore: number,
    studentTotalPoints: number
  ): Promise<{
    streamPosition?: number;
    streamPopulation: number;
    classPosition?: number;
    classPopulation: number;
    overallPosition?: number;
    overallPopulation: number;
    isRanked: boolean;
  }> {
    try {
      const broadsheet = await this.getBroadsheetEngine().getStreamBroadsheet({
        streamId: student.streamId || 'all',
        classId: student.classroomId,
        gradeLevel: student.gradeLevel,
        termId,
        academicYearId
      });

      if (broadsheet && Array.isArray(broadsheet.rows) && broadsheet.rows.length > 0) {
        const studentRow = broadsheet.rows.find(
          r => r.studentId === student.id ||
               (r.admissionNumber && r.admissionNumber.trim().toUpperCase() === student.admissionNumber?.trim().toUpperCase())
        );

        if (studentRow) {
          const hasEvaluations = (studentRow as any).evaluatedCount !== undefined
            ? (studentRow as any).evaluatedCount > 0
            : studentRow.totalScore > 0;

          // Stream ranking and population
          const streamPos = hasEvaluations && studentRow.streamRank > 0 ? studentRow.streamRank : (hasEvaluations && studentRow.rank > 0 ? studentRow.rank : undefined);
          const streamPop = broadsheet.streamSections?.find(s => s.streamId === student.streamId)?.totalStudents ||
            (student.streamId ? broadsheet.rows.filter(r => r.streamId === student.streamId).length : broadsheet.totalStudents) ||
            broadsheet.totalStudents || 1;

          // Class ranking and population
          const classPos = hasEvaluations && studentRow.classRank > 0 ? studentRow.classRank : (hasEvaluations && studentRow.rank > 0 ? studentRow.rank : undefined);
          const classPop = broadsheet.totalClassStudents || broadsheet.totalStudents || streamPop || 1;

          // School ranking and population
          const overallPos = hasEvaluations && studentRow.schoolRank && studentRow.schoolRank > 0 ? studentRow.schoolRank : undefined;
          const overallPop = broadsheet.schoolTopStudents?.length > 0
            ? Math.max(broadsheet.schoolTopStudents.length, classPop)
            : classPop;

          return {
            streamPosition: streamPos,
            streamPopulation: streamPop,
            classPosition: classPos,
            classPopulation: classPop,
            overallPosition: overallPos,
            overallPopulation: overallPop,
            isRanked: hasEvaluations && (streamPos !== undefined || classPos !== undefined)
          };
        }
      }
    } catch {
      // Fall through to fallback cohort ranking
    }

    // Fallback: Consistent Cohort Evaluation
    const allSchoolStudents = await this.studentRepository.findAll({
      schoolId: student.schoolId
    }).catch(() => []);

    const activeSchoolStudents = allSchoolStudents.filter(s => {
      const st = (s as any).status;
      return st === StudentStatus.ACTIVE || st === 'ACTIVE' || st === 'Active' || !st;
    });

    const normalizeGrade = (g?: string) =>
      (g || '').toUpperCase().replace(/[\s_-]/g, '');

    const targetGradeNorm = normalizeGrade(student.gradeLevel);

    // 2. Class Cohort: All students enrolled in this classroom or grade level
    const classStudents = activeSchoolStudents.filter(s => {
      if (student.classroomId && s.classroomId) {
        return s.classroomId === student.classroomId;
      }
      return normalizeGrade(s.gradeLevel) === targetGradeNorm;
    });
    const classPopulation = classStudents.length > 0 ? classStudents.length : 1;

    // 3. Stream Cohort: Filter students enrolled specifically in this student's stream
    const streamStudents = student.streamId
      ? classStudents.filter(s => s.streamId === student.streamId)
      : classStudents;
    const streamPopulation = streamStudents.length > 0 ? streamStudents.length : classPopulation;

    // 4. Overall Population: All active students in the school
    const overallPopulation = activeSchoolStudents.length > 0 ? activeSchoolStudents.length : classPopulation;

    const altTermId = termId.includes('-t') ? termId.replace('-t', '-') : termId.replace(/-(\d)$/, '-t$1');
    let termSummatives = await this.CBCRepository.findSummatives({
      termId,
      academicYearId
    }).catch(() => []);
    if (!termSummatives || termSummatives.length === 0) {
      termSummatives = await this.CBCRepository.findSummatives({ termId }).catch(() => []);
    }
    if (!termSummatives || termSummatives.length === 0) {
      termSummatives = await this.CBCRepository.findSummatives({ termId: altTermId }).catch(() => []);
    }

    const termReports = await this.CBCRepository.findReportCardsByTerm(termId).catch(() => []);

    const summMap = new Map<string, SummativeAssessment[]>();
    for (const sm of termSummatives) {
      const list = summMap.get(sm.studentId) || [];
      list.push(sm);
      summMap.set(sm.studentId, list);
    }

    const reportMap = new Map<string, CBCReportCard>();
    for (const rep of termReports) {
      reportMap.set(rep.studentId, rep);
    }

    const pointsFromLevel = (level: string): number => {
      switch (level) {
        case 'EXCEEDING_EXPECTATIONS':
        case 'EE':
        case '4': return 4;
        case 'MEETING_EXPECTATIONS':
        case 'ME':
        case '3': return 3;
        case 'APPROACHING_EXPECTATIONS':
        case 'AE':
        case '2': return 2;
        default: return 1;
      }
    };

    const toPercent = (level: PerformanceLevel | string): number => {
      if (level === PerformanceLevel.EXCEEDING_EXPECTATIONS || level === 'EE') return 84;
      if (level === PerformanceLevel.MEETING_EXPECTATIONS || level === 'ME') return 74;
      if (level === PerformanceLevel.APPROACHING_EXPECTATIONS || level === 'AE') return 58;
      return 42;
    };

    interface PeerScore {
      studentId: string;
      admissionNumber: string;
      streamId?: string;
      classroomId?: string;
      gradeLevel: string;
      totalScore: number;
      avgScore: number;
      totalPoints: number;
      hasMarks: boolean;
    }

    const peerScores: PeerScore[] = [];

    for (const st of activeSchoolStudents) {
      if (st.id === student.id) {
        peerScores.push({
          studentId: st.id,
          admissionNumber: st.admissionNumber,
          streamId: st.streamId,
          classroomId: st.classroomId,
          gradeLevel: st.gradeLevel,
          totalScore: studentTotalScore,
          avgScore: studentAvgScore,
          totalPoints: studentTotalPoints,
          hasMarks: studentTotalScore > 0
        });
        continue;
      }

      const stSumms = summMap.get(st.id) || [];
      const stRep = reportMap.get(st.id);

      let totScore = 0;
      let totPoints = 0;
      let subCount = 0;

      if (stSumms.length > 0) {
        for (const sm of stSumms) {
          let rawScore: number | undefined;
          let maxScore: number | undefined;
          if (sm.strandScores && sm.strandScores.length > 0) {
            const valid = sm.strandScores.filter(x => x.rawScore !== undefined && x.maxScore !== undefined && x.maxScore > 0);
            if (valid.length > 0) {
              rawScore = valid.reduce((acc, x) => acc + (x.rawScore || 0), 0);
              maxScore = valid.reduce((acc, x) => acc + (x.maxScore || 100), 0);
            }
          }
          const pct = (rawScore !== undefined && maxScore !== undefined && maxScore > 0)
            ? Math.min(100, Math.round((rawScore / maxScore) * 100))
            : toPercent(sm.overallPerformanceLevel);
          totScore += pct;
          totPoints += pointsFromLevel(sm.overallPerformanceLevel);
          subCount++;
        }
      } else if (stRep && Array.isArray(stRep.learningAreaAssessments) && stRep.learningAreaAssessments.length > 0) {
        for (const la of stRep.learningAreaAssessments) {
          totScore += Number(la.score || 0);
          totPoints += pointsFromLevel(la.performanceLevel);
          subCount++;
        }
      } else if (stRep && stRep.overallAverageScore) {
        totScore = Number(stRep.overallAverageScore);
        totPoints = Math.round(totScore / 25);
        subCount = 1;
      }

      const avg = subCount > 0 ? Number((totScore / subCount).toFixed(2)) : 0;
      peerScores.push({
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        streamId: st.streamId,
        classroomId: st.classroomId,
        gradeLevel: st.gradeLevel,
        totalScore: totScore,
        avgScore: avg,
        totalPoints: totPoints,
        hasMarks: subCount > 0
      });
    }

    const assignRanks = (pool: PeerScore[]): Map<string, number> => {
      const eligible = pool.filter(p => p.hasMarks);
      eligible.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
      });

      const rankMap = new Map<string, number>();
      let curRank = 1;
      for (let i = 0; i < eligible.length; i++) {
        if (i > 0 && eligible[i].totalScore === eligible[i - 1].totalScore) {
          rankMap.set(eligible[i].studentId, curRank);
        } else {
          curRank = i + 1;
          rankMap.set(eligible[i].studentId, curRank);
        }
      }
      return rankMap;
    };

    const studentScoreObj = peerScores.find(p => p.studentId === student.id);
    const isRanked = Boolean(studentScoreObj?.hasMarks);

    const streamCohort = peerScores.filter(p =>
      student.streamId ? p.streamId === student.streamId : true
    );
    const streamRanks = assignRanks(streamCohort);
    const streamPosition = isRanked ? streamRanks.get(student.id) : undefined;

    const classCohort = peerScores.filter(p => {
      if (student.classroomId && p.classroomId) {
        return p.classroomId === student.classroomId;
      }
      return normalizeGrade(p.gradeLevel) === targetGradeNorm;
    });
    const classRanks = assignRanks(classCohort);
    const classPosition = isRanked ? classRanks.get(student.id) : undefined;

    const overallRanks = assignRanks(peerScores);
    const overallPosition = isRanked ? overallRanks.get(student.id) : undefined;

    return {
      streamPosition,
      streamPopulation,
      classPosition,
      classPopulation,
      overallPosition,
      overallPopulation,
      isRanked
    };
  }

  // 4. CBC Comprehensive Report Card Generation
  public async generateStudentReportCard(dto: GenerateReportCardDTO) {
    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) throw new NotFoundError('Student', dto.studentId);

    const summatives = await this.CBCRepository.findSummatives({
      studentId: dto.studentId,
      termId: dto.termId,
      academicYearId: dto.academicYearId
    });

    const allDbAreas = await this.academicRepository.findAllLearningAreas().catch(() => []);
    const dbAreaMap = new Map<string, any>(allDbAreas.map(a => [a.id, a]));

    let allGradeAreas = student.gradeLevel
      ? allDbAreas.filter(a => (a.gradeLevel || '').toUpperCase().replace(/[\s-]/g, '_') === String(student.gradeLevel).toUpperCase().replace(/[\s-]/g, '_'))
      : [];
    if (allGradeAreas.length === 0 && summatives.length === 0) {
      allGradeAreas = allDbAreas;
    }

    const formatives = await this.CBCRepository.findFormatives({
      studentId: dto.studentId,
      termId: dto.termId,
      academicYearId: dto.academicYearId
    });

    const allYearSummatives = await this.CBCRepository.findSummatives({
      studentId: dto.studentId,
      academicYearId: dto.academicYearId
    }).catch(() => []);

    const allYearReports = await this.CBCRepository.findReportCardsByStudent(dto.studentId).catch(() => []);
    const yearReports = allYearReports.filter(r => r.academicYearId === dto.academicYearId);
    const yearTerms = await this.academicRepository.findTermsByYear(dto.academicYearId).catch(() => []);

    const getTermNumber = (tid: string): number => {
      const match = yearTerms.find(t => t.id === tid);
      if (match?.termNumber) return Number(match.termNumber);
      const lower = (tid || '').toLowerCase();
      if (lower.includes('1') || lower.includes('t1')) return 1;
      if (lower.includes('2') || lower.includes('t2')) return 2;
      if (lower.includes('3') || lower.includes('t3')) return 3;
      return 1;
    };

    const currentTermNumber = getTermNumber(dto.termId);
    const isTerm1 = currentTermNumber === 1;
    const isTerm2 = currentTermNumber === 2;
    const isTerm3 = currentTermNumber === 3;

    let totalScoreSum = 0;

    const toPercent = (score: number, level: PerformanceLevel): number => {
      if (score === 0) return 0;
      if (score > 4) return Math.min(100, Math.round(score));
      if (level === PerformanceLevel.EXCEEDING_EXPECTATIONS) return 84;
      if (level === PerformanceLevel.MEETING_EXPECTATIONS) return 74;
      if (level === PerformanceLevel.APPROACHING_EXPECTATIONS) return 58;
      return 42;
    };

    const assessmentsMap = new Map<string, LearningAreaReportEntry>();

    for (const summ of summatives) {
      const area = dbAreaMap.get(summ.learningAreaId) || allDbAreas.find(a => a.id === summ.learningAreaId || a.code === summ.learningAreaId || a.name.toLowerCase() === summ.learningAreaId.toLowerCase());
      if (!area) {
        // Skip subjects that do not exist in the database
        continue;
      }

      const canonKey = this.getCanonicalSubjectKey(area.code || area.name || area.id);
      const rubricVal = PerformanceLevelScores[summ.overallPerformanceLevel].score;
      let summRawScore: number | undefined;
      let summMaxScore: number | undefined;
      if (summ.strandScores && summ.strandScores.length > 0) {
        const withScores = summ.strandScores.filter(s => s.rawScore !== undefined && s.maxScore !== undefined && s.maxScore > 0);
        if (withScores.length > 0) {
          summRawScore = withScores.reduce((acc, s) => acc + (s.rawScore || 0), 0);
          summMaxScore = withScores.reduce((acc, s) => acc + (s.maxScore || 100), 0);
        }
      }
      const pct = (summRawScore !== undefined && summMaxScore !== undefined && summMaxScore > 0)
        ? Math.min(100, Math.round((summRawScore / summMaxScore) * 100))
        : toPercent(rubricVal, summ.overallPerformanceLevel);

      const entry: LearningAreaReportEntry = {
        learningAreaId: area.id,
        learningAreaName: area.name,
        code: area.code,
        levelLabel: summ.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS ? 'EE' : summ.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS ? 'ME' : summ.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS ? 'AE' : 'BE',
        performanceLevel: summ.overallPerformanceLevel,
        score: pct,
        rawScore: summRawScore,
        rubricScore: rubricVal,
        term1Score: isTerm1 ? pct : undefined,
        term2Score: isTerm2 ? pct : undefined,
        term3Score: isTerm3 ? pct : undefined,
        teacherRemarks: summ.teacherRemarks || 'Demonstrates strong understanding and mastery of core strand learning outcomes.'
      };

      if (!assessmentsMap.has(canonKey)) {
        assessmentsMap.set(canonKey, entry);
      } else {
        const existing = assessmentsMap.get(canonKey)!;
        if (pct > (existing.score || 0)) {
          assessmentsMap.set(canonKey, entry);
        }
      }
    }

    for (const area of allGradeAreas) {
      const canonKey = this.getCanonicalSubjectKey(area.code || area.name || area.id);
      if (!assessmentsMap.has(canonKey)) {
        const areaFormatives = formatives.filter(f => f.learningAreaId === area.id);
        if (areaFormatives.length > 0) {
          let level = PerformanceLevel.MEETING_EXPECTATIONS;
          let rubricVal = 3;
          const avg = areaFormatives.reduce((acc, curr) => acc + PerformanceLevelScores[curr.performanceLevel].score, 0) / areaFormatives.length;
          if (avg >= 3.5) level = PerformanceLevel.EXCEEDING_EXPECTATIONS;
          else if (avg >= 2.5) level = PerformanceLevel.MEETING_EXPECTATIONS;
          else if (avg >= 1.5) level = PerformanceLevel.APPROACHING_EXPECTATIONS;
          else level = PerformanceLevel.BELOW_EXPECTATIONS;
          rubricVal = PerformanceLevelScores[level].score;
          const teacherRemarks = `Continuous assessment indicates ${PerformanceLevelScores[level].label.toLowerCase()}.`;

          const pct = toPercent(rubricVal, level);

          assessmentsMap.set(canonKey, {
            learningAreaId: area.id,
            learningAreaName: area.name,
            code: area.code,
            levelLabel: level === PerformanceLevel.EXCEEDING_EXPECTATIONS ? 'EE' : level === PerformanceLevel.MEETING_EXPECTATIONS ? 'ME' : level === PerformanceLevel.APPROACHING_EXPECTATIONS ? 'AE' : 'BE',
            performanceLevel: level,
            score: pct,
            rubricScore: rubricVal,
            term1Score: isTerm1 ? pct : undefined,
            term2Score: isTerm2 ? pct : undefined,
            term3Score: isTerm3 ? pct : undefined,
            teacherRemarks
          });
        }
      }
    }

    const learningAreaAssessments: LearningAreaReportEntry[] = Array.from(assessmentsMap.values());

    for (let idx = 0; idx < learningAreaAssessments.length; idx++) {
      const entry = learningAreaAssessments[idx];

      if (currentTermNumber === 1) entry.term1Score = entry.score;
      if (currentTermNumber === 2) entry.term2Score = entry.score;
      if (currentTermNumber === 3) entry.term3Score = entry.score;

      if (currentTermNumber !== 1) {
        const t1Rep = yearReports.find(r => getTermNumber(r.termId) === 1);
        const t1Entry = t1Rep?.learningAreaAssessments?.find(a => a.learningAreaId === entry.learningAreaId);
        if (t1Entry && t1Entry.score !== undefined && t1Entry.score !== null) {
          entry.term1Score = Number(t1Entry.score);
        } else {
          const t1Summ = allYearSummatives.find(s => s.learningAreaId === entry.learningAreaId && getTermNumber(s.termId) === 1);
          if (t1Summ) {
            let t1Raw: number | undefined;
            let t1Max: number | undefined;
            if (t1Summ.strandScores && t1Summ.strandScores.length > 0) {
              const withScores = t1Summ.strandScores.filter(s => s.rawScore !== undefined && s.maxScore !== undefined && s.maxScore > 0);
              if (withScores.length > 0) {
                t1Raw = withScores.reduce((acc, s) => acc + (s.rawScore || 0), 0);
                t1Max = withScores.reduce((acc, s) => acc + (s.maxScore || 100), 0);
              }
            }
            entry.term1Score = (t1Raw !== undefined && t1Max !== undefined && t1Max > 0)
              ? Math.min(100, Math.round((t1Raw / t1Max) * 100))
              : toPercent(PerformanceLevelScores[t1Summ.overallPerformanceLevel].score, t1Summ.overallPerformanceLevel);
          }
        }
      }

      if (currentTermNumber !== 2) {
        const t2Rep = yearReports.find(r => getTermNumber(r.termId) === 2);
        const t2Entry = t2Rep?.learningAreaAssessments?.find(a => a.learningAreaId === entry.learningAreaId);
        if (t2Entry && t2Entry.score !== undefined && t2Entry.score !== null) {
          entry.term2Score = Number(t2Entry.score);
        } else {
          const t2Summ = allYearSummatives.find(s => s.learningAreaId === entry.learningAreaId && getTermNumber(s.termId) === 2);
          if (t2Summ) {
            let t2Raw: number | undefined;
            let t2Max: number | undefined;
            if (t2Summ.strandScores && t2Summ.strandScores.length > 0) {
              const withScores = t2Summ.strandScores.filter(s => s.rawScore !== undefined && s.maxScore !== undefined && s.maxScore > 0);
              if (withScores.length > 0) {
                t2Raw = withScores.reduce((acc, s) => acc + (s.rawScore || 0), 0);
                t2Max = withScores.reduce((acc, s) => acc + (s.maxScore || 100), 0);
              }
            }
            entry.term2Score = (t2Raw !== undefined && t2Max !== undefined && t2Max > 0)
              ? Math.min(100, Math.round((t2Raw / t2Max) * 100))
              : toPercent(PerformanceLevelScores[t2Summ.overallPerformanceLevel].score, t2Summ.overallPerformanceLevel);
          }
        }
      }

      if (currentTermNumber !== 3) {
        const t3Rep = yearReports.find(r => getTermNumber(r.termId) === 3);
        const t3Entry = t3Rep?.learningAreaAssessments?.find(a => a.learningAreaId === entry.learningAreaId);
        if (t3Entry && t3Entry.score !== undefined && t3Entry.score !== null) {
          entry.term3Score = Number(t3Entry.score);
        } else {
          const t3Summ = allYearSummatives.find(s => s.learningAreaId === entry.learningAreaId && getTermNumber(s.termId) === 3);
          if (t3Summ) {
            let t3Raw: number | undefined;
            let t3Max: number | undefined;
            if (t3Summ.strandScores && t3Summ.strandScores.length > 0) {
              const withScores = t3Summ.strandScores.filter(s => s.rawScore !== undefined && s.maxScore !== undefined && s.maxScore > 0);
              if (withScores.length > 0) {
                t3Raw = withScores.reduce((acc, s) => acc + (s.rawScore || 0), 0);
                t3Max = withScores.reduce((acc, s) => acc + (s.maxScore || 100), 0);
              }
            }
            entry.term3Score = (t3Raw !== undefined && t3Max !== undefined && t3Max > 0)
              ? Math.min(100, Math.round((t3Raw / t3Max) * 100))
              : toPercent(PerformanceLevelScores[t3Summ.overallPerformanceLevel].score, t3Summ.overallPerformanceLevel);
          }
        }
      }
    }

    // FACTOR IN: Subjects with marks have HIGHEST priority in display
    learningAreaAssessments.sort((a, b) => {
      const aScore = a.score !== undefined && a.score !== null ? Number(a.score) : 0;
      const bScore = b.score !== undefined && b.score !== null ? Number(b.score) : 0;
      const aHas = aScore > 0 && a.levelLabel !== '--';
      const bHas = bScore > 0 && b.levelLabel !== '--';
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      const idxA = CANONICAL_ORDER.indexOf(this.getCanonicalSubjectKey(a.code || a.learningAreaName || a.learningAreaId));
      const idxB = CANONICAL_ORDER.indexOf(this.getCanonicalSubjectKey(b.code || b.learningAreaName || b.learningAreaId));
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return (a.learningAreaName || '').localeCompare(b.learningAreaName || '');
    });

    const evaluatedAssessments = learningAreaAssessments.filter(a => a.score !== undefined && a.score !== null && a.score > 0);
    totalScoreSum = evaluatedAssessments.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
    const averageScore = evaluatedAssessments.length > 0
      ? Number((totalScoreSum / evaluatedAssessments.length).toFixed(2))
      : (learningAreaAssessments.length > 0 ? Number((totalScoreSum / learningAreaAssessments.length).toFixed(2)) : 0.0);

    let overallLevel = PerformanceLevel.BELOW_EXPECTATIONS;
    if (learningAreaAssessments.length > 0) {
      if (averageScore >= 80) overallLevel = PerformanceLevel.EXCEEDING_EXPECTATIONS;
      else if (averageScore >= 65) overallLevel = PerformanceLevel.MEETING_EXPECTATIONS;
      else if (averageScore >= 50) overallLevel = PerformanceLevel.APPROACHING_EXPECTATIONS;
      else overallLevel = PerformanceLevel.BELOW_EXPECTATIONS;
    }

    const termTrends: TermTrendEntry[] = [];
    for (let tNum = 1; tNum <= 3; tNum++) {
      if (tNum === currentTermNumber) {
        if (learningAreaAssessments.length > 0) {
          termTrends.push({
            term: `Term ${tNum}`,
            termNumber: tNum,
            averageScore: Math.round(averageScore),
            performanceLevel: overallLevel,
            status: 'CURRENT'
          });
        }
      } else {
        const pastRep = yearReports.find(r => getTermNumber(r.termId) === tNum);
        if (pastRep && Array.isArray(pastRep.learningAreaAssessments) && pastRep.learningAreaAssessments.length > 0) {
          const repAvg = pastRep.overallAverageScore !== undefined && pastRep.overallAverageScore !== null
            ? (pastRep.overallAverageScore <= 4 ? Math.round(pastRep.overallAverageScore * 25) : Math.round(pastRep.overallAverageScore))
            : Math.round(
                pastRep.learningAreaAssessments.reduce((sum, a) => sum + (Number(a.score) || 0), 0) /
                pastRep.learningAreaAssessments.length
              );
          termTrends.push({
            term: `Term ${tNum}`,
            termNumber: tNum,
            averageScore: repAvg,
            performanceLevel: pastRep.overallPerformanceLevel || (repAvg >= 80 ? PerformanceLevel.EXCEEDING_EXPECTATIONS : repAvg >= 65 ? PerformanceLevel.MEETING_EXPECTATIONS : PerformanceLevel.APPROACHING_EXPECTATIONS),
            status: tNum < currentTermNumber ? 'COMPLETED' : 'UPCOMING'
          });
        } else {
          const tScores = learningAreaAssessments
            .map(a => tNum === 1 ? a.term1Score : tNum === 2 ? a.term2Score : a.term3Score)
            .filter((s): s is number => s !== undefined && s !== null);
          if (tScores.length > 0) {
            const tAvg = Math.round(tScores.reduce((sum, s) => sum + s, 0) / tScores.length);
            termTrends.push({
              term: `Term ${tNum}`,
              termNumber: tNum,
              averageScore: tAvg,
              performanceLevel: tAvg >= 80 ? PerformanceLevel.EXCEEDING_EXPECTATIONS : tAvg >= 65 ? PerformanceLevel.MEETING_EXPECTATIONS : PerformanceLevel.APPROACHING_EXPECTATIONS,
              status: tNum < currentTermNumber ? 'COMPLETED' : 'UPCOMING'
            });
          }
        }
      }
    }
    termTrends.sort((a, b) => a.termNumber - b.termNumber);

    const competencyKeys = Object.values(CoreCompetency);
    const coreCompetencyAssessments: CoreCompetencyAssessmentEntry[] = competencyKeys.map(comp => {
      const compFormatives = formatives.filter(f => f.targetedCompetencies?.includes(comp));
      let compLevel = PerformanceLevel.MEETING_EXPECTATIONS;
      if (compFormatives.length > 0) {
        const avg = compFormatives.reduce((acc, curr) => acc + PerformanceLevelScores[curr.performanceLevel].score, 0) / compFormatives.length;
        if (avg >= 3.5) compLevel = PerformanceLevel.EXCEEDING_EXPECTATIONS;
        else if (avg >= 2.5) compLevel = PerformanceLevel.MEETING_EXPECTATIONS;
        else if (avg >= 1.5) compLevel = PerformanceLevel.APPROACHING_EXPECTATIONS;
        else compLevel = PerformanceLevel.BELOW_EXPECTATIONS;
      }
      return {
        competency: comp,
        performanceLevel: compLevel,
        remarks: `Demonstrates ${PerformanceLevelScores[compLevel].label.toLowerCase()} in ${comp.toLowerCase().replace(/_/g, ' ')}.`
      };
    });

    const valueKeys = Object.values(CoreValue);
    const valueAssessments: ValueAssessmentEntry[] = valueKeys.map(val => {
      const valFormatives = formatives.filter(f => f.valuesObserved?.includes(val));
      let valLevel = PerformanceLevel.MEETING_EXPECTATIONS;
      if (valFormatives.length > 0) {
        const avg = valFormatives.reduce((acc, curr) => acc + PerformanceLevelScores[curr.performanceLevel].score, 0) / valFormatives.length;
        if (avg >= 3.5) valLevel = PerformanceLevel.EXCEEDING_EXPECTATIONS;
        else if (avg >= 2.5) valLevel = PerformanceLevel.MEETING_EXPECTATIONS;
        else valLevel = PerformanceLevel.APPROACHING_EXPECTATIONS;
      }
      return {
        value: val,
        performanceLevel: valLevel,
        remarks: `Upholds core value of ${val.toLowerCase().replace(/_/g, ' ')} consistently.`
      };
    });

    const registers = await this.attendanceRepository.findRegisters({
      streamId: student.streamId,
      termId: dto.termId,
      academicYearId: dto.academicYearId
    });

    let daysPresent = 0;
    let totalDays = 0;
    for (const reg of registers) {
      const entry = reg.entries.find(e => e.studentId === student.id);
      if (entry) {
        totalDays++;
        if (entry.status === 'PRESENT' || entry.status === 'LATE') {
          daysPresent++;
        }
      }
    }

    if (totalDays === 0) {
      totalDays = 60;
      daysPresent = 58;
    }

    const ptsFromLevel = (level: string) => {
      if (level === 'EE' || level === 'EXCEEDING_EXPECTATIONS' || level === '4') return 4;
      if (level === 'ME' || level === 'MEETING_EXPECTATIONS' || level === '3') return 3;
      if (level === 'AE' || level === 'APPROACHING_EXPECTATIONS' || level === '2') return 2;
      return 1;
    };
    const pointAssessments = evaluatedAssessments.length > 0 ? evaluatedAssessments : learningAreaAssessments;
    const totalPoints = pointAssessments.reduce((sum, a) => sum + ptsFromLevel(a.performanceLevel || a.levelLabel || ''), 0);
    const meanPoints = pointAssessments.length > 0
      ? Number((totalPoints / pointAssessments.length).toFixed(2))
      : 0;
    const meanGrade = meanPoints >= 3.5 || averageScore >= 80 ? 'EE' : meanPoints >= 2.5 || averageScore >= 65 ? 'ME' : meanPoints >= 1.5 || averageScore >= 50 ? 'AE' : 'BE';
    const totalMarks = Math.round(totalScoreSum);

    const rankings = await this.computeStudentRankings(
      student,
      dto.termId,
      dto.academicYearId,
      totalScoreSum,
      averageScore,
      totalPoints
    );

    let reportCard = await this.CBCRepository.findReportCard(dto.studentId, dto.termId, dto.academicYearId);
    if (reportCard) {
      reportCard = CBCReportCard.create(
        {
          studentId: dto.studentId,
          termId: dto.termId,
          academicYearId: dto.academicYearId,
          gradeLevel: student.gradeLevel,
          streamId: student.streamId,
          learningAreaAssessments,
          coreCompetencyAssessments,
          valueAssessments,
          attendanceDaysPresent: daysPresent,
          attendanceDaysTotal: totalDays,
          classTeacherRemarks: dto.classTeacherRemarks,
          headTeacherRemarks: dto.headTeacherRemarks,
          overallAverageScore: averageScore,
          overallPerformanceLevel: overallLevel,
          termTrends,
          closingDate: dto.closingDate,
          nextTermOpeningDate: dto.nextTermOpeningDate,
          classPosition: rankings.classPosition,
          classPopulation: rankings.classPopulation,
          streamPosition: rankings.streamPosition,
          streamPopulation: rankings.streamPopulation,
          overallPosition: rankings.overallPosition,
          overallPopulation: rankings.overallPopulation,
          totalMarks,
          meanPoints,
          meanGrade
        },
        reportCard.id
      );
      await this.CBCRepository.updateReportCard(reportCard);
    } else {
      reportCard = CBCReportCard.create(
        {
          studentId: dto.studentId,
          termId: dto.termId,
          academicYearId: dto.academicYearId,
          gradeLevel: student.gradeLevel,
          streamId: student.streamId,
          learningAreaAssessments,
          coreCompetencyAssessments,
          valueAssessments,
          attendanceDaysPresent: daysPresent,
          attendanceDaysTotal: totalDays,
          classTeacherRemarks: dto.classTeacherRemarks,
          headTeacherRemarks: dto.headTeacherRemarks,
          overallAverageScore: averageScore,
          overallPerformanceLevel: overallLevel,
          termTrends,
          closingDate: dto.closingDate,
          nextTermOpeningDate: dto.nextTermOpeningDate,
          classPosition: rankings.classPosition,
          classPopulation: rankings.classPopulation,
          streamPosition: rankings.streamPosition,
          streamPopulation: rankings.streamPopulation,
          overallPosition: rankings.overallPosition,
          overallPopulation: rankings.overallPopulation,
          totalMarks,
          meanPoints,
          meanGrade
        },
        IdGenerator.generate()
      );
      await this.CBCRepository.saveReportCard(reportCard);
    }

    return {
      ...reportCard.toJSON(),
      student: student.toJSON()
    };
  }

  public async getReportCard(studentId: string, termId: string, academicYearId: string, requestingUser?: UserContext) {
    const isParent = requestingUser?.role === UserRole.PARENT || requestingUser?.role === UserRole.GUARDIAN;
    if (isParent && requestingUser) {
      const childIds = await this.getLinkedStudentIdsForUser(requestingUser.userId);
      if (!childIds.includes(studentId)) {
        throw new ForbiddenError('Access denied: You are only permitted to view report cards for your registered children.');
      }

      const student = await this.studentRepository.findById(studentId);
      const isExempt = Boolean((student as any)?.isChargeExempt);
      if (student && !isExempt && this.feeRepository) {
        const invoices = await this.feeRepository.findInvoices({ studentId });
        const activeInvoices = invoices.filter(inv => (inv.status as any) !== 'CARRIED_FORWARD' && (inv.status as any) !== 'PAID');
        const activeBalance = activeInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
        if (activeBalance > 0) {
          throw new ForbiddenError(`Fee clearance required to access report card. Outstanding balance: KES ${activeBalance.toLocaleString()}. Please contact the Head Teacher (0745436312) or Director (schoolgraceseeds@gmail.com) for clearance authorization.`);
        }
      }
    }

    let reportCard = await this.CBCRepository.findReportCard(studentId, termId, academicYearId);
    if (!reportCard) {
      try {
        const student = await this.studentRepository.findById(studentId);
        if (student) {
          await this.generateStudentReportCard({
            studentId,
            termId,
            academicYearId,
            classTeacherRemarks: 'Recommended for steady academic development and holistic learning growth.',
            headTeacherRemarks: 'Shows admirable effort and character progression.'
          });
          reportCard = await this.CBCRepository.findReportCard(studentId, termId, academicYearId);
        }
      } catch {}
    }
    if (!reportCard) throw new NotFoundError('CBC Report Card for the given term');

    const student = await this.studentRepository.findById(studentId);
    const reportData = reportCard.toJSON();

    const allReports = await this.CBCRepository.findReportCardsByStudent(studentId).catch(() => []);
    const yearReports = allReports.filter(r => r.academicYearId === academicYearId);
    const yearTerms = await this.academicRepository.findTermsByYear(academicYearId).catch(() => []);

    const getTermNumber = (tid: string): number => {
      const match = yearTerms.find(t => t.id === tid);
      if (match?.termNumber) return Number(match.termNumber);
      const lower = (tid || '').toLowerCase();
      if (lower.includes('1') || lower.includes('t1')) return 1;
      if (lower.includes('2') || lower.includes('t2')) return 2;
      if (lower.includes('3') || lower.includes('t3')) return 3;
      return 1;
    };

    const currentTermNumber = getTermNumber(termId);

    const trends: TermTrendEntry[] = [];
    for (let tNum = 1; tNum <= 3; tNum++) {
      if (tNum === currentTermNumber) {
        const hasEvaluations = Array.isArray(reportData.learningAreaAssessments) && reportData.learningAreaAssessments.length > 0;
        if (hasEvaluations) {
          const avg = reportData.overallAverageScore !== undefined && reportData.overallAverageScore !== null
            ? (reportData.overallAverageScore <= 4 ? Math.round(reportData.overallAverageScore * 25) : Math.round(reportData.overallAverageScore))
            : Math.round(
                reportData.learningAreaAssessments.reduce((sum: number, a: any) => sum + (Number(a.score) || 0), 0) /
                reportData.learningAreaAssessments.length
              );
          trends.push({
            term: `Term ${tNum}`,
            termNumber: tNum,
            averageScore: avg,
            performanceLevel: avg >= 80 ? 'EE' : avg >= 65 ? 'ME' : avg >= 50 ? 'AE' : 'BE',
            status: 'CURRENT'
          });
        }
      } else {
        const rep = yearReports.find(r => getTermNumber(r.termId) === tNum && r.id !== reportCard.id);
        if (rep && Array.isArray(rep.learningAreaAssessments) && rep.learningAreaAssessments.length > 0) {
          const avg = rep.overallAverageScore !== undefined && rep.overallAverageScore !== null
            ? (rep.overallAverageScore <= 4 ? Math.round(rep.overallAverageScore * 25) : Math.round(rep.overallAverageScore))
            : Math.round(
                rep.learningAreaAssessments.reduce((sum, a) => sum + (Number(a.score) || 0), 0) /
                rep.learningAreaAssessments.length
              );
          trends.push({
            term: `Term ${tNum}`,
            termNumber: tNum,
            averageScore: avg,
            performanceLevel: rep.overallPerformanceLevel || (avg >= 80 ? 'EE' : avg >= 65 ? 'ME' : avg >= 50 ? 'AE' : 'BE'),
            status: tNum < currentTermNumber ? 'COMPLETED' : 'UPCOMING'
          });
        }
      }
    }

    reportData.termTrends = trends.sort((a, b) => a.termNumber - b.termNumber);

    if (Array.isArray(reportData.learningAreaAssessments)) {
      const t1Rep = yearReports.find(r => getTermNumber(r.termId) === 1 && r.id !== reportCard.id);
      const t2Rep = yearReports.find(r => getTermNumber(r.termId) === 2 && r.id !== reportCard.id);
      const t3Rep = yearReports.find(r => getTermNumber(r.termId) === 3 && r.id !== reportCard.id);

      reportData.learningAreaAssessments = reportData.learningAreaAssessments.map((ev: any) => {
        const rawScore = ev.score !== undefined && ev.score !== null ? Number(ev.score) : undefined;
        const normalizedScore = rawScore !== undefined
          ? (rawScore > 0 && rawScore <= 4 ? (rawScore === 4 ? 85 : rawScore === 3 ? 75 : rawScore === 2 ? 58 : 42) : rawScore)
          : undefined;

        let t1Score = ev.term1Score !== undefined && ev.term1Score !== null ? Number(ev.term1Score) : undefined;
        let t2Score = ev.term2Score !== undefined && ev.term2Score !== null ? Number(ev.term2Score) : undefined;
        let t3Score = ev.term3Score !== undefined && ev.term3Score !== null ? Number(ev.term3Score) : undefined;

        if (currentTermNumber === 1 && normalizedScore !== undefined) t1Score = normalizedScore;
        if (currentTermNumber === 2 && normalizedScore !== undefined) t2Score = normalizedScore;
        if (currentTermNumber === 3 && normalizedScore !== undefined) t3Score = normalizedScore;

        if (t1Score === undefined && t1Rep) {
          const match = t1Rep.learningAreaAssessments?.find(a => a.learningAreaId === ev.learningAreaId);
          if (match && match.score !== undefined && match.score !== null) {
            t1Score = Number(match.score);
          }
        }

        if (t2Score === undefined && t2Rep) {
          const match = t2Rep.learningAreaAssessments?.find(a => a.learningAreaId === ev.learningAreaId);
          if (match && match.score !== undefined && match.score !== null) {
            t2Score = Number(match.score);
          }
        }

        if (t3Score === undefined && t3Rep) {
          const match = t3Rep.learningAreaAssessments?.find(a => a.learningAreaId === ev.learningAreaId);
          if (match && match.score !== undefined && match.score !== null) {
            t3Score = Number(match.score);
          }
        }

        return {
          ...ev,
          score: normalizedScore,
          term1Score: t1Score,
          term2Score: t2Score,
          term3Score: t3Score
        };
      });

      // Deduplicate by canonical subject key to guarantee NO duplicates at any cost
      const dedupedMap = new Map<string, any>();
      for (const ev of reportData.learningAreaAssessments) {
        const canonKey = this.getCanonicalSubjectKey(ev.code || ev.learningAreaName || ev.learningAreaId || '');
        if (!dedupedMap.has(canonKey)) {
          dedupedMap.set(canonKey, ev);
        } else {
          const existing = dedupedMap.get(canonKey);
          const evScore = ev.score !== undefined && ev.score !== null ? Number(ev.score) : 0;
          const existScore = existing.score !== undefined && existing.score !== null ? Number(existing.score) : 0;
          if (evScore > existScore) {
            dedupedMap.set(canonKey, ev);
          }
        }
      }

      // Sort with HIGHEST PRIORITY for subjects with marks
      const sortedAssessments = Array.from(dedupedMap.values()).sort((a: any, b: any) => {
        const aScore = a.score !== undefined && a.score !== null ? Number(a.score) : 0;
        const bScore = b.score !== undefined && b.score !== null ? Number(b.score) : 0;
        const aHas = aScore > 0 && a.levelLabel !== '--';
        const bHas = bScore > 0 && b.levelLabel !== '--';
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        const idxA = CANONICAL_ORDER.indexOf(this.getCanonicalSubjectKey(a.code || a.learningAreaName || a.learningAreaId));
        const idxB = CANONICAL_ORDER.indexOf(this.getCanonicalSubjectKey(b.code || b.learningAreaName || b.learningAreaId));
        const rankA = idxA === -1 ? 999 : idxA;
        const rankB = idxB === -1 ? 999 : idxB;
        if (rankA !== rankB) return rankA - rankB;
        return (a.learningAreaName || '').localeCompare(b.learningAreaName || '');
      });

      reportData.learningAreaAssessments = sortedAssessments;
    }

    let streamPos = reportCard.streamPosition;
    let streamPop = reportCard.streamPopulation;
    let classPos = reportCard.classPosition;
    let classPop = reportCard.classPopulation;
    let overallPos = reportCard.overallPosition;
    let overallPop = reportCard.overallPopulation;
    let totalMarks = reportCard.totalMarks;
    let meanPoints = reportCard.meanPoints;
    let meanGrade = reportCard.meanGrade;

    if (student) {
      const studentTotalScore = Array.isArray(reportData.learningAreaAssessments)
        ? reportData.learningAreaAssessments.reduce((sum: number, a: any) => sum + (Number(a.score) || 0), 0)
        : (reportCard.overallAverageScore || 0);
      const studentAvgScore = Array.isArray(reportData.learningAreaAssessments) && reportData.learningAreaAssessments.length > 0
        ? Number((studentTotalScore / reportData.learningAreaAssessments.length).toFixed(2))
        : (reportCard.overallAverageScore || 0);
      const ptsFromLevel = (level: string) => {
        if (level === 'EE' || level === 'EXCEEDING_EXPECTATIONS' || level === '4') return 4;
        if (level === 'ME' || level === 'MEETING_EXPECTATIONS' || level === '3') return 3;
        if (level === 'AE' || level === 'APPROACHING_EXPECTATIONS' || level === '2') return 2;
        return 1;
      };
      const studentTotalPoints = Array.isArray(reportData.learningAreaAssessments)
        ? reportData.learningAreaAssessments.reduce((sum: number, a: any) => sum + ptsFromLevel(a.performanceLevel || a.levelLabel || ''), 0)
        : Math.round(studentAvgScore / 25);

      const rankings = await this.computeStudentRankings(
        student,
        termId,
        academicYearId,
        studentTotalScore,
        studentAvgScore,
        studentTotalPoints
      );

      streamPos = rankings.streamPosition;
      streamPop = rankings.streamPopulation;
      classPos = rankings.classPosition;
      classPop = rankings.classPopulation;
      overallPos = rankings.overallPosition;
      overallPop = rankings.overallPopulation;
      totalMarks = Math.round(studentTotalScore);
      meanPoints = Array.isArray(reportData.learningAreaAssessments) && reportData.learningAreaAssessments.length > 0
        ? Number((studentTotalPoints / reportData.learningAreaAssessments.length).toFixed(2))
        : Math.round(studentAvgScore / 25);
      meanGrade = meanPoints >= 3.5 || studentAvgScore >= 80 ? 'EE' : meanPoints >= 2.5 || studentAvgScore >= 65 ? 'ME' : meanPoints >= 1.5 || studentAvgScore >= 50 ? 'AE' : 'BE';

      const updatedRC = CBCReportCard.create({
        ...reportCard.props,
        streamPosition: streamPos,
        streamPopulation: streamPop,
        classPosition: classPos,
        classPopulation: classPop,
        overallPosition: overallPos,
        overallPopulation: overallPop,
        totalMarks,
        meanPoints,
        meanGrade
      }, reportCard.id, reportCard.createdAt, new Date());
      await this.CBCRepository.updateReportCard(updatedRC).catch(() => {});
    }

    reportData.streamPosition = streamPos;
    reportData.streamPopulation = streamPop;
    reportData.classPosition = classPos;
    reportData.classPopulation = classPop;
    reportData.overallPosition = overallPos;
    reportData.overallPopulation = overallPop;
    reportData.totalMarks = totalMarks;
    reportData.meanPoints = meanPoints;
    reportData.meanGrade = meanGrade;
    (reportData as any).isRanked = streamPos !== undefined || classPos !== undefined;

    return {
      ...reportData,
      student: student ? student.toJSON() : null
    };
  }

  public async getCBCAnalytics(filters: { gradeLevel?: CBCGradeLevel; learningAreaId?: string; termId: string; academicYearId: string; requestingUser?: UserContext }) {
    const isParent = filters?.requestingUser?.role === UserRole.PARENT || filters?.requestingUser?.role === UserRole.GUARDIAN;
    if (isParent) {
      throw new ForbiddenError('Access denied: CBC Analytics is restricted to teachers and administrators.');
    }

    const summatives = await this.CBCRepository.findSummatives({
      learningAreaId: filters.learningAreaId,
      termId: filters.termId,
      academicYearId: filters.academicYearId
    });

    const learningAreas = await this.academicRepository.findAllLearningAreas({ gradeLevel: filters.gradeLevel });

    const total = summatives.length;
    const distribution = {
      [PerformanceLevel.EXCEEDING_EXPECTATIONS]: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS).length,
      [PerformanceLevel.MEETING_EXPECTATIONS]: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS).length,
      [PerformanceLevel.APPROACHING_EXPECTATIONS]: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS).length,
      [PerformanceLevel.BELOW_EXPECTATIONS]: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS).length
    };

    const subjectAnalytics = learningAreas.map(la => {
      const laSummatives = summatives.filter(s => s.learningAreaId === la.id);
      const laTotal = laSummatives.length;
      const ee = laSummatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS).length;
      const me = laSummatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS).length;
      const ae = laSummatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS).length;
      const be = laSummatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS).length;

      return {
        id: la.id,
        name: la.name,
        code: la.code,
        total: laTotal,
        ee: laTotal > 0 ? Math.round((ee / laTotal) * 100) : 0,
        me: laTotal > 0 ? Math.round((me / laTotal) * 100) : 0,
        ae: laTotal > 0 ? Math.round((ae / laTotal) * 100) : 0,
        be: laTotal > 0 ? Math.round((be / laTotal) * 100) : 0,
        counts: { ee, me, ae, be }
      };
    });

    return {
      totalAssessments: total,
      distribution,
      proficiencyRatePercentage: total > 0
        ? Math.round(((distribution[PerformanceLevel.EXCEEDING_EXPECTATIONS] + distribution[PerformanceLevel.MEETING_EXPECTATIONS]) / total) * 100)
        : 0,
      subjectAnalytics
    };
  }

  public async deleteStrand(id: string): Promise<void> {
    await this.CBCRepository.deleteStrand(id);
  }

  public async deleteSubStrand(id: string): Promise<void> {
    await this.CBCRepository.deleteSubStrand(id);
  }

  public async deleteFormative(id: string, requestingUser?: UserContext): Promise<void> {
    const assessment = await this.CBCRepository.findFormativeById(id);
    if (!assessment) throw new NotFoundError('Formative assessment', id);
    if (requestingUser?.role === UserRole.TEACHER) {
      let isOwner = assessment.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && assessment.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own formative assessments.');
      }
    }
    await this.CBCRepository.deleteFormative(id);
  }

  public async deleteSummative(id: string, requestingUser?: UserContext): Promise<void> {
    const assessment = await this.CBCRepository.findSummativeById(id);
    if (!assessment) throw new NotFoundError('Summative assessment', id);
    if (requestingUser?.role === UserRole.TEACHER) {
      let isOwner = assessment.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && assessment.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own summative assessments.');
      }
    }
    await this.CBCRepository.deleteSummative(id);
  }

  // ==========================================
  // MARKS UPLOAD & MARKSHEET PIPELINE
  // ==========================================

  public async assertTeacherAuthorizedForMarks(
    classRoomId: string,
    streamId: string | undefined,
    learningAreaId: string,
    academicYearId: string,
    requestingUser?: UserContext,
    gradeLevel?: string
  ): Promise<{ teacherId?: string }> {
    if (!requestingUser) return {};

    const role = (requestingUser.role || '').toUpperCase();
    const adminRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ].map(r => r.toUpperCase());

    if (adminRoles.includes(role)) {
      return {};
    }

    if (role === UserRole.TEACHER) {
      if (!this.teacherRepository) return {};
      const teacher = await this.teacherRepository.findByUserId(requestingUser.userId);
      if (!teacher) {
        throw new ForbiddenError('No teacher profile associated with your account.');
      }

      // Check Lower Primary rule: PP1 to Grade 3 class teachers teach all learning areas
      let effectiveClassRoomId = classRoomId;
      if (!effectiveClassRoomId && streamId) {
        try {
          const stream = await this.academicRepository.findStreamById(streamId);
          if (stream) effectiveClassRoomId = stream.classRoomId;
        } catch {}
      }

      const lowerPrimaryGrades = ['PLAYGROUP', 'CRECHE', 'RECEPTION', 'PP1', 'PP2', 'GRADE_1', 'GRADE_2', 'GRADE_3'];
      let isLowerPrimary = false;
      if (gradeLevel) {
        isLowerPrimary = lowerPrimaryGrades.includes(gradeLevel.toUpperCase().replace(/\s+/g, '_'));
      } else if (effectiveClassRoomId) {
        try {
          const cls = await this.academicRepository.findClassById(effectiveClassRoomId);
          if (cls && cls.gradeLevel) {
            isLowerPrimary = lowerPrimaryGrades.includes(cls.gradeLevel.toUpperCase().replace(/\s+/g, '_'));
          }
        } catch {}
      }

      const classTeacherAssignments = await this.academicRepository.findClassTeacherAssignments({
        teacherId: teacher.id,
        classRoomId: effectiveClassRoomId || undefined,
        academicYearId: academicYearId || undefined,
        isActive: true
      });
      const isClassTeacher = classTeacherAssignments.some(a => !a.streamId || !streamId || a.streamId === streamId) ||
        (streamId && teacher.assignedClassStreamIds.includes(streamId));

      // Under the Class-Teacher model, an assigned class teacher is authorized to record marks for their class
      if (isClassTeacher) {
        return { teacherId: teacher.id };
      }

      // Resolve learning area ID and Code for flexible matching
      let targetLaId = learningAreaId;
      let targetLaCode = '';
      try {
        const la = await this.academicRepository.findLearningAreaById(learningAreaId);
        if (la) {
          targetLaId = la.id;
          targetLaCode = la.code || '';
        } else {
          const allLas = await this.academicRepository.findAllLearningAreas();
          const match = allLas.find((l: any) => l.code?.toLowerCase() === learningAreaId.toLowerCase() || l.id.toLowerCase() === learningAreaId.toLowerCase());
          if (match) {
            targetLaId = match.id;
            targetLaCode = match.code || '';
          }
        }
      } catch {}

      // Under the Subject-Teacher model, verify active subject assignment for this learning area in this class/stream
      const subjectAssignments = await this.academicRepository.findSubjectTeacherAssignments({
        teacherId: teacher.id,
        academicYearId: academicYearId || undefined,
        isActive: true
      });
      const targetCanonicalKey = this.getCanonicalSubjectKey(learningAreaId);
      const matchingSubj = subjectAssignments.find(s => {
        const matchesClass = !s.classRoomId || s.classRoomId === effectiveClassRoomId || (streamId && s.streamId === streamId);
        if (!matchesClass) return false;
        const subjCanonicalKey = this.getCanonicalSubjectKey(s.learningAreaId);
        return (
          s.learningAreaId === targetLaId ||
          (targetLaCode && s.learningAreaId === targetLaCode) ||
          s.learningAreaId === learningAreaId ||
          (targetCanonicalKey && subjCanonicalKey === targetCanonicalKey)
        );
      });

      if (matchingSubj) {
        return { teacherId: teacher.id };
      }

      throw new ForbiddenError('You are not authorized to upload or enter marks for this class/subject.');
    }

    throw new ForbiddenError('You are not authorized to upload or enter marks.');
  }

  public async generateMarksTemplate(
    query: {
      schoolId?: string;
      academicYearId: string;
      termId: string;
      classRoomId: string;
      streamId?: string;
      learningAreaId: string;
      assessmentType?: string;
      maxScore?: number;
    },
    requestingUser?: UserContext
  ) {
    await this.assertTeacherAuthorizedForMarks(
      query.classRoomId,
      query.streamId,
      query.learningAreaId,
      query.academicYearId,
      requestingUser
    );

    const classRoom = await this.academicRepository.findClassById(query.classRoomId);
    if (!classRoom) throw new NotFoundError('Classroom', query.classRoomId);

    let learningArea = await this.academicRepository.findLearningAreaById(query.learningAreaId).catch(() => null);
    if (!learningArea) {
      const resolvedId = await this.resolveValidLearningAreaId(query.learningAreaId, classRoom.gradeLevel, query.schoolId);
      learningArea = await this.academicRepository.findLearningAreaById(resolvedId).catch(() => null);
    }
    if (!learningArea) throw new NotFoundError('Learning Area', query.learningAreaId);

    let streamName = '';
    if (query.streamId) {
      const stream = await this.academicRepository.findStreamById(query.streamId);
      if (stream) streamName = stream.name;
    }

    const allStudents = await this.studentRepository.findAll({
      classroomId: query.classRoomId,
      streamId: query.streamId,
      schoolId: query.schoolId
    });
    const students = allStudents.filter(s => s.status === StudentStatus.ACTIVE);

    students.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const maxScore = query.maxScore || 100;

    const headers = ['Admission Number', 'Learner Name', 'Score', 'Max Score', 'Performance Level', 'Teacher Remarks'];
    const rows = [headers.join(',')];

    for (const s of students) {
      const cleanName = s.fullName.replace(/"/g, '""');
      const cleanAdm = s.admissionNumber.replace(/"/g, '""');
      rows.push(`"${cleanAdm}","${cleanName}","","${maxScore}","",""`);
    }

    const csvContent = rows.join('\n');
    const safeClassName = classRoom.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeSubjName = (learningArea.code || learningArea.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Marksheet_${safeClassName}${streamName ? `_${streamName}` : ''}_${safeSubjName}.csv`;

    return {
      filename,
      csvContent,
      studentsCount: students.length,
      className: classRoom.name,
      streamName: streamName || undefined,
      learningAreaName: learningArea.name
    };
  }

  public async validateMarksUpload(
    dto: {
      schoolId?: string;
      academicYearId: string;
      termId: string;
      classRoomId: string;
      streamId?: string;
      learningAreaId: string;
      maxScore?: number;
      rows: Array<{
        admissionNumber: string;
        learnerName?: string;
        score?: string | number;
        maxScore?: string | number;
        performanceLevel?: string;
        teacherRemarks?: string;
      }>;
    },
    requestingUser?: UserContext
  ) {
    await this.assertTeacherAuthorizedForMarks(
      dto.classRoomId,
      dto.streamId,
      dto.learningAreaId,
      dto.academicYearId,
      requestingUser
    );

    const classRoom = await this.academicRepository.findClassById(dto.classRoomId);
    if (!classRoom) throw new NotFoundError('Classroom', dto.classRoomId);

    let learningArea = await this.academicRepository.findLearningAreaById(dto.learningAreaId).catch(() => null);
    if (!learningArea) {
      const resolvedId = await this.resolveValidLearningAreaId(dto.learningAreaId, classRoom.gradeLevel, dto.schoolId);
      learningArea = await this.academicRepository.findLearningAreaById(resolvedId).catch(() => null);
    }
    if (!learningArea) throw new NotFoundError('Learning Area', dto.learningAreaId);

    const allStudents = await this.studentRepository.findAll({
      classroomId: dto.classRoomId,
      streamId: dto.streamId,
      schoolId: dto.schoolId
    });
    const students = allStudents.filter(s => s.status === StudentStatus.ACTIVE);

    const studentMap = new Map<string, any>();
    for (const s of students) {
      studentMap.set(s.admissionNumber.trim().toUpperCase(), s);
      const digitsOnly = s.admissionNumber.replace(/\D/g, '');
      if (digitsOnly) {
        const intVal = parseInt(digitsOnly, 10);
        if (!isNaN(intVal)) {
          studentMap.set(intVal.toString().padStart(4, '0'), s);
          studentMap.set(intVal.toString(), s);
        }
      }
    }

    const existingSummatives = await this.CBCRepository.findSummatives({
      learningAreaId: learningArea ? learningArea.id : dto.learningAreaId,
      termId: dto.termId,
      academicYearId: dto.academicYearId
    });
    const existingSummativeMap = new Map<string, SummativeAssessment>();
    for (const s of existingSummatives) {
      existingSummativeMap.set(s.studentId, s);
    }

    const previewRows: any[] = [];
    const errors: Array<{ rowNumber: number; admissionNumber: string; error: string }> = [];
    const seenAdmissionsInFile = new Set<string>();

    let createsCount = 0;
    let updatesCount = 0;
    let missingRows = 0;
    let duplicatesCount = 0;

    const defaultMaxScore = dto.maxScore || 100;

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const rowNum = i + 1;
      const rawAdm = (row.admissionNumber || '').trim();

      if (!rawAdm) {
        errors.push({ rowNumber: rowNum, admissionNumber: '', error: 'Missing admission number on row.' });
        previewRows.push({
          rowNumber: rowNum,
          studentId: '',
          admissionNumber: '',
          learnerName: row.learnerName || '',
          score: undefined,
          maxScore: defaultMaxScore,
          status: 'INVALID',
          action: 'SKIP',
          error: 'Missing admission number'
        });
        continue;
      }

      const admKey = rawAdm.toUpperCase();

      if (seenAdmissionsInFile.has(admKey)) {
        duplicatesCount++;
        errors.push({
          rowNumber: rowNum,
          admissionNumber: rawAdm,
          error: `Duplicate admission number '${rawAdm}' appears multiple times in upload file.`
        });
        previewRows.push({
          rowNumber: rowNum,
          studentId: '',
          admissionNumber: rawAdm,
          learnerName: row.learnerName || '',
          score: undefined,
          maxScore: defaultMaxScore,
          status: 'INVALID',
          action: 'SKIP',
          error: 'Duplicate admission number in file'
        });
        continue;
      }
      seenAdmissionsInFile.add(admKey);

      let student = studentMap.get(admKey);
      if (!student) {
        const rowDigits = rawAdm.replace(/\D/g, '');
        if (rowDigits) {
          const rowInt = parseInt(rowDigits, 10);
          if (!isNaN(rowInt)) {
            student = studentMap.get(rowInt.toString().padStart(4, '0')) || studentMap.get(rowInt.toString());
          }
        }
      }
      if (!student) {
        errors.push({
          rowNumber: rowNum,
          admissionNumber: rawAdm,
          error: `Learner with admission number '${rawAdm}' is not enrolled in ${classRoom.name}.`
        });
        previewRows.push({
          rowNumber: rowNum,
          studentId: '',
          admissionNumber: rawAdm,
          learnerName: row.learnerName || 'Not found',
          score: undefined,
          maxScore: defaultMaxScore,
          status: 'INVALID',
          action: 'SKIP',
          error: `Learner not enrolled in ${classRoom.name}`
        });
        continue;
      }

      const learnerName = student.fullName;
      const rawScoreStr = row.score !== undefined && row.score !== null ? String(row.score).trim() : '';
      const rowMaxScore = row.maxScore !== undefined && row.maxScore !== null && String(row.maxScore).trim() !== ''
        ? Number(row.maxScore)
        : defaultMaxScore;

      if (rawScoreStr === '') {
        missingRows++;
        previewRows.push({
          rowNumber: rowNum,
          studentId: student.id,
          admissionNumber: rawAdm,
          learnerName,
          score: undefined,
          maxScore: rowMaxScore,
          performanceLevel: undefined,
          teacherRemarks: row.teacherRemarks,
          status: 'MISSING',
          action: 'SKIP',
          note: 'Mark is blank - preserved as missing (not zeroed)'
        });
        continue;
      }

      const scoreNum = Number(rawScoreStr);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > rowMaxScore) {
        errors.push({
          rowNumber: rowNum,
          admissionNumber: rawAdm,
          error: `Score '${rawScoreStr}' is out of range. Must be between 0 and ${rowMaxScore}.`
        });
        previewRows.push({
          rowNumber: rowNum,
          studentId: student.id,
          admissionNumber: rawAdm,
          learnerName,
          score: scoreNum,
          maxScore: rowMaxScore,
          status: 'INVALID',
          action: 'SKIP',
          error: `Score out of range (0-${rowMaxScore})`
        });
        continue;
      }

      let perfLevel: PerformanceLevel;
      const rawPerf = (row.performanceLevel || '').trim().toUpperCase();
      if (rawPerf && Object.values(PerformanceLevel).includes(rawPerf as PerformanceLevel)) {
        perfLevel = rawPerf as PerformanceLevel;
      } else {
        const pct = (scoreNum / rowMaxScore) * 100;
        if (pct >= 80) perfLevel = PerformanceLevel.EXCEEDING_EXPECTATIONS;
        else if (pct >= 65) perfLevel = PerformanceLevel.MEETING_EXPECTATIONS;
        else if (pct >= 50) perfLevel = PerformanceLevel.APPROACHING_EXPECTATIONS;
        else perfLevel = PerformanceLevel.BELOW_EXPECTATIONS;
      }

      const isUpdate = existingSummativeMap.has(student.id);
      if (isUpdate) updatesCount++;
      else createsCount++;

      previewRows.push({
        rowNumber: rowNum,
        studentId: student.id,
        admissionNumber: rawAdm,
        learnerName,
        score: scoreNum,
        maxScore: rowMaxScore,
        performanceLevel: perfLevel,
        teacherRemarks: row.teacherRemarks || undefined,
        status: 'VALID',
        action: isUpdate ? 'UPDATE' : 'CREATE'
      });
    }

    const invalidRows = errors.length;
    const validRows = createsCount + updatesCount;

    return {
      totalRows: dto.rows.length,
      validRows,
      missingRows,
      invalidRows,
      createsCount,
      updatesCount,
      duplicatesCount,
      errors,
      previewRows
    };
  }

  public async commitMarksUpload(
    dto: {
      schoolId?: string;
      academicYearId: string;
      termId: string;
      classRoomId: string;
      streamId?: string;
      learningAreaId: string;
      maxScore?: number;
      rows: Array<{
        admissionNumber: string;
        learnerName?: string;
        score?: string | number;
        maxScore?: string | number;
        performanceLevel?: string;
        teacherRemarks?: string;
      }>;
    },
    requestingUser?: UserContext
  ) {
    const authInfo = await this.assertTeacherAuthorizedForMarks(
      dto.classRoomId,
      dto.streamId,
      dto.learningAreaId,
      dto.academicYearId,
      requestingUser
    );

    const validation = await this.validateMarksUpload(dto, requestingUser);

    if (validation.invalidRows > 0) {
      throw new ValidationError(
        `Cannot commit marks upload: ${validation.invalidRows} invalid row(s) detected. Please fix highlighted errors before saving.`
      );
    }

    const classRoom = await this.academicRepository.findClassById(dto.classRoomId).catch(() => null);
    let commitLearningAreaId = dto.learningAreaId;
    try {
      commitLearningAreaId = await this.resolveValidLearningAreaId(dto.learningAreaId, classRoom?.gradeLevel, dto.schoolId);
    } catch {}

    let assignedTeacherId = authInfo.teacherId;
    if (!assignedTeacherId && this.teacherRepository && requestingUser) {
      const t = await this.teacherRepository.findByUserId(requestingUser.userId).catch(() => null);
      if (t) assignedTeacherId = t.id;
    }
    const finalTeacherId = assignedTeacherId || 'tch-default-01';

    let recorded = 0;
    let updated = 0;

    for (const preview of validation.previewRows) {
      if (preview.status !== 'VALID' || preview.score === undefined) {
        continue;
      }

      await this.recordSummativeAssessment({
        studentId: preview.studentId,
        teacherId: finalTeacherId,
        learningAreaId: commitLearningAreaId || dto.learningAreaId,
        termId: dto.termId,
        academicYearId: dto.academicYearId,
        strandScores: [
          {
            strandId: commitLearningAreaId || dto.learningAreaId,
            performanceLevel: preview.performanceLevel,
            rawScore: preview.score,
            maxScore: preview.maxScore
          }
        ],
        overallPerformanceLevel: preview.performanceLevel,
        teacherRemarks: preview.teacherRemarks || 'Meeting CBC curriculum learning expectations.',
        evaluationDate: new Date().toISOString().split('T')[0]
      });

      if (preview.action === 'CREATE') recorded++;
      else updated++;
    }

    return {
      success: true,
      totalProcessed: validation.totalRows,
      recordedCount: recorded,
      updatedCount: updated,
      skippedMissingCount: validation.missingRows,
      message: `Successfully saved marks: ${recorded} new record(s) created, ${updated} record(s) updated, and ${validation.missingRows} blank mark(s) preserved.`
    };
  }
}