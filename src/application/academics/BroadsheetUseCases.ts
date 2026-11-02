import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ICBCAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { Stream } from '../../core/domain/academic/ClassRoom';
import { PerformanceLevel } from '../../core/domain/cbc/CbcAssessment';
import { CBCGradeLevel, Student, StudentStatus } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';
import { NotFoundError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';
import { UserContext } from '../students/StudentUseCases';

export interface BroadsheetQueryDTO {
  streamId: string;
  classId?: string;
  gradeLevel?: string;
  termId?: string;
  academicYearId?: string;
  examType?: string;
}

export interface StudentSubjectScore {
  learningAreaId: string;
  learningAreaName: string;
  performanceLevel: PerformanceLevel;
  numericScore: number;
  levelLabel: string;
  points: number;
  subjectRank: number;
}

export interface BroadsheetRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gender: string;
  streamId?: string;
  streamName?: string;
  className?: string;
  subjects: Record<string, StudentSubjectScore>;
  totalScore: number;
  averageScore: number;
  totalPoints: number;
  meanPoints: number;
  overallPerformanceLevel: PerformanceLevel;
  rank: number;
  streamRank: number;
  classRank: number;
  schoolRank?: number;
  evaluatedCount?: number;
  isPending?: boolean;
  remarks: string;
}

export interface BroadsheetSubjectSummary {
  learningAreaId: string;
  learningAreaName: string;
  averageScore: number;
  meanPoints: number;
  highestScore: number;
  lowestScore: number;
  highestScorerName?: string;
  passRate: number;
  counts: {
    EE: number;
    ME: number;
    AE: number;
    BE: number;
  };
}

export interface GenderStats {
  boysCount: number;
  girlsCount: number;
  totalCount: number;
  boysMeanScore: number;
  girlsMeanScore: number;
  boysMeanPoints: number;
  girlsMeanPoints: number;
  boysEE: number;
  boysME: number;
  boysAE: number;
  boysBE: number;
  girlsEE: number;
  girlsME: number;
  girlsAE: number;
  girlsBE: number;
  topBoyName?: string;
  topBoyScore?: number;
  topGirlName?: string;
  topGirlScore?: number;
}

export interface ClassRankingItem {
  rank: number;
  classId: string;
  className: string;
  streamId?: string;
  streamName: string;
  totalStudents: number;
  meanScore: number;
  overallPerformanceLevel: string;
  topStudentName: string;
  topStudentScore: number;
  topStudentAdmissionNumber?: string;
  qualityPassRate: number;
  counts: {
    EE: number;
    ME: number;
    AE: number;
    BE: number;
  };
}

export interface BestClassPerSubjectItem {
  learningAreaId: string;
  learningAreaName: string;
  bestStreamId: string;
  bestStreamName: string;
  bestClassName: string;
  meanScore: number;
  performanceLevel: string;
  totalStudents: number;
  runnerUpStreamName?: string;
  runnerUpMeanScore?: number;
}

export interface BestStudentPerSubjectItem {
  learningAreaId: string;
  learningAreaName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  streamName: string;
  gender: string;
  score: number;
  performanceLevel: string;
  scope?: 'SCHOOL' | 'CLASS';
}

export interface StreamSection {
  streamId: string;
  streamName: string;
  className: string;
  rows: BroadsheetRow[];
  subjectSummaries: BroadsheetSubjectSummary[];
  streamMeanScore: number;
  streamMeanPoints: number;
  totalStudents: number;
}

export interface BroadsheetResult {
  streamId: string;
  streamName: string;
  classId?: string;
  className: string;
  gradeLevel: string;
  termName: string;
  yearName: string;
  examType: string;
  learningAreas: Array<{ id: string; name: string }>;
  rows: BroadsheetRow[];
  streamSections?: StreamSection[];
  subjectSummaries: BroadsheetSubjectSummary[];
  streamMeanScore: number;
  streamMeanPoints: number;
  totalStudents: number;
  totalClassStudents: number;
  genderStats: GenderStats;

  // Class & Stream Level Analytics
  classRankings: ClassRankingItem[];
  bestClassesPerSubject: BestClassPerSubjectItem[];
  bestStudentsPerSubject: BestStudentPerSubjectItem[];

  // School-Wide Analytics
  schoolClassRankings: ClassRankingItem[];
  schoolTopStudents: BroadsheetRow[];
  schoolSubjectSummaries: BroadsheetSubjectSummary[];
  schoolBestStudentsPerSubject: BestStudentPerSubjectItem[];
}

const CANONICAL_ORDER = [
  'LAN',
  'ENG',
  'REA',
  'MATH',
  'KISW',
  'KUSO',
  'ENV',
  'ENVI',
  'CRE',
  'SRE',
  'CREA',
  'SCI',
  'SST',
  'AGRI',
  'ARTS',
  'PRETECH',
  'HLTH',
  'BUS',
  'COMP',
  'FRE',
  'GER',
  'ARA',
  'IND'
];

export class BroadsheetUseCases {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly CBCAssessmentRepository: ICBCAssessmentRepository,
    private readonly teacherRepository?: ITeacherRepository
  ) {}

  public async getClassAnalytics(classId: string, termId?: string, academicYearId?: string, requestingUser?: UserContext) {
    if (requestingUser && requestingUser.role === UserRole.TEACHER) {
      if (this.teacherRepository) {
        let teacher = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (!teacher) teacher = await this.teacherRepository.findById(requestingUser.userId);
        if (teacher) {
          const assignedClasses = new Set<string>();
          const assignedStreams = new Set<string>(teacher.assignedClassStreamIds || []);
          try {
            const ctas = await this.academicRepository.findClassTeacherAssignments({ teacherId: teacher.id, isActive: true });
            for (const a of ctas) {
              if (a.classRoomId) assignedClasses.add(a.classRoomId);
              if (a.streamId) assignedStreams.add(a.streamId);
            }
          } catch {}
          try {
            const stas = await this.academicRepository.findSubjectTeacherAssignments({ teacherId: teacher.id, isActive: true });
            for (const s of stas) {
              if (s.classRoomId) assignedClasses.add(s.classRoomId);
              if (s.streamId) assignedStreams.add(s.streamId);
            }
          } catch {}
          if (!assignedClasses.has(classId) && !assignedStreams.has(classId)) {
            throw new ForbiddenError('Access denied: You are not authorized to view analytics for this class.');
          }
        }
      }
    }

    const allClasses = await this.academicRepository.findAllClasses();
    const classRoom = allClasses.find(c => c.id === classId) || null;
    return {
      classId,
      className: classRoom?.name || 'Class',
      termId: termId || 'term-default',
      academicYearId: academicYearId || 'year-default',
      analyticsSummary: {
        totalLearners: 0,
        meanScore: 0,
      }
    };
  }

  public async getStreamBroadsheet(query: BroadsheetQueryDTO, requestingUser?: UserContext): Promise<BroadsheetResult> {
    if (!query.streamId) {
      throw new ValidationError('Stream ID is required to generate broadsheet.');
    }

    const isAllStreams =
      query.streamId.toLowerCase() === 'all' ||
      query.streamId.toLowerCase().startsWith('all_') ||
      query.streamId.toLowerCase().startsWith('all-');

    if (requestingUser && requestingUser.role === UserRole.TEACHER) {
      if (!this.teacherRepository) {
        throw new ForbiddenError('Teacher repository unavailable to verify permissions.');
      }
      let teacher = await this.teacherRepository.findByUserId(requestingUser.userId);
      if (!teacher) {
        teacher = await this.teacherRepository.findById(requestingUser.userId);
      }
      if (!teacher) {
        throw new ForbiddenError('No teacher profile associated with your account.');
      }

      const assignedStreams = new Set<string>(teacher.assignedClassStreamIds || []);
      const assignedClasses = new Set<string>();

      try {
        const ctas = await this.academicRepository.findClassTeacherAssignments({
          teacherId: teacher.id,
          isActive: true
        });
        for (const a of ctas) {
          if (a.streamId) assignedStreams.add(a.streamId);
          if (a.classRoomId) assignedClasses.add(a.classRoomId);
        }
      } catch {}

      try {
        const stas = await this.academicRepository.findSubjectTeacherAssignments({
          teacherId: teacher.id,
          isActive: true
        });
        for (const s of stas) {
          if (s.streamId) assignedStreams.add(s.streamId);
          if (s.classRoomId) assignedClasses.add(s.classRoomId);
        }
      } catch {}

      const matchesStream = query.streamId && (assignedStreams.has(query.streamId) || assignedClasses.has(query.streamId));
      const matchesClass = query.classId && assignedClasses.has(query.classId);

      let matchesAllClass = false;
      if (isAllStreams) {
        const targetClassId = query.classId || (query.streamId.includes('_') ? query.streamId.split('_')[1] : undefined);
        if (targetClassId && assignedClasses.has(targetClassId)) {
          matchesAllClass = true;
        }
      }

      if (!matchesStream && !matchesClass && !matchesAllClass) {
        throw new ForbiddenError('Access denied: You are not authorized to view the broadsheet for this stream or class.');
      }
    }

    const allClasses = typeof this.academicRepository.findAllClasses === 'function'
      ? await this.academicRepository.findAllClasses()
      : [];

    let stream: any = null;
    let classRoom: any = null;

    if (isAllStreams) {
      let targetClassId = query.classId;
      if (!targetClassId && query.streamId.includes('_')) {
        targetClassId = query.streamId.split('_')[1];
      }
      if (!targetClassId && query.streamId.includes('-') && query.streamId !== 'all') {
        targetClassId = query.streamId.substring(4);
      }
      if (targetClassId) {
        classRoom = await this.academicRepository.findClassById(targetClassId);
        if (!classRoom) {
          classRoom = allClasses.find(
            c => c.name.toLowerCase() === targetClassId!.toLowerCase() ||
                 c.gradeLevel.toLowerCase() === targetClassId!.toLowerCase()
          ) || null;
        }
      }
      if (!classRoom && query.gradeLevel) {
        const normGrade = query.gradeLevel.toUpperCase().replace(/[\s_-]/g, '');
        classRoom = allClasses.find(
          c => (c.gradeLevel || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade ||
               (c.name || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade
        ) || null;
      }
      if (!classRoom) {
        for (const cls of allClasses) {
          const clsStreams = await this.academicRepository.findStreamsByClass(cls.id);
          if (clsStreams.length > 0) {
            classRoom = cls;
            break;
          }
        }
        if (!classRoom && allClasses.length > 0) {
          classRoom = allClasses[0];
        }
      }
    } else {
      stream = await this.academicRepository.findStreamById(query.streamId);
      if (!stream) {
        const cls = await this.academicRepository.findClassById(query.streamId);
        if (cls) {
          classRoom = cls;
        } else if (query.classId) {
          classRoom = await this.academicRepository.findClassById(query.classId);
        }
        if (!classRoom && query.gradeLevel) {
          const normGrade = query.gradeLevel.toUpperCase().replace(/[\s_-]/g, '');
          classRoom = allClasses.find(
            c => (c.gradeLevel || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade ||
                 (c.name || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade
          ) || null;
        }
        if (!classRoom) {
          throw new NotFoundError('Stream not found.');
        }
      } else {
        classRoom = await this.academicRepository.findClassById(stream.classRoomId);
      }
    }

    if (!classRoom && allClasses.length > 0) {
      if (query.gradeLevel) {
        const normGrade = query.gradeLevel.toUpperCase().replace(/[\s_-]/g, '');
        const matched = allClasses.find(
          c => (c.gradeLevel || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade ||
               (c.name || '').toUpperCase().replace(/[\s_-]/g, '') === normGrade
        );
        if (matched) classRoom = matched;
      }
      if (!classRoom) {
        classRoom = allClasses[0];
      }
    }

    const gradeLevel = classRoom?.gradeLevel || CBCGradeLevel.GRADE_4;
    const examType = query.examType || 'End of Term';

    // 1. Resolve Academic Year
    const allYears = typeof this.academicRepository.findAllYears === 'function'
      ? await this.academicRepository.findAllYears()
      : [];
    let year: any = null;

    if (query.academicYearId) {
      const qYear = query.academicYearId.trim().toLowerCase();
      year = allYears.find(y => y.id.toLowerCase() === qYear) || null;
      if (!year) {
        year = allYears.find(
          y => y.name.toLowerCase() === qYear ||
               y.name.toLowerCase().includes(qYear) ||
               qYear.includes(y.name.toLowerCase())
        ) || null;
      }
      if (!year) {
        year = await this.academicRepository.findYearById(query.academicYearId);
      }
    }
    if (!year) {
      year = await this.academicRepository.findCurrentYear();
    }
    if (!year && allYears.length > 0) {
      year = allYears.find(y => y.isCurrent) || allYears[0];
    }
    const curCalYear = new Date().getFullYear().toString();
    const academicYearId = year?.id || `year-${curCalYear}`;
    const yearName = year?.name || curCalYear;

    // 2. Resolve Academic Term
    let term: any = null;
    let allTermsForYear: any[] = [];
    if (year && typeof this.academicRepository.findTermsByYear === 'function') {
      allTermsForYear = await this.academicRepository.findTermsByYear(year.id);
    }
    if (!allTermsForYear || allTermsForYear.length === 0) {
      const cur = await this.academicRepository.findCurrentTerm();
      if (cur) allTermsForYear = [cur];
    }

    if (query.termId) {
      const qTerm = query.termId.trim().toLowerCase();
      term = allTermsForYear.find(t => t.id.toLowerCase() === qTerm) || null;

      if (!term) {
        const tMatch = qTerm.match(/t(?:erm)?[_-]?([1-3])\b/i) || qTerm.match(/[-_t]([1-3])$/i) || qTerm.match(/\b([1-3])\b/);
        const termNum = tMatch ? parseInt(tMatch[1], 10) : null;
        if (termNum !== null) {
          term = allTermsForYear.find(t => t.termNumber === termNum) || null;
        }
      }

      if (!term) {
        term = allTermsForYear.find(
          t => t.name.toLowerCase() === qTerm ||
               t.name.toLowerCase().includes(qTerm) ||
               qTerm.includes(t.name.toLowerCase())
        ) || null;
      }

      if (!term) {
        term = await this.academicRepository.findTermById(query.termId);
      }
    }

    if (!term) {
      term = allTermsForYear.find(t => t.isCurrent) || null;
    }
    if (!term) {
      term = await this.academicRepository.findCurrentTerm(year?.id);
    }
    if (!term && allTermsForYear.length > 0) {
      term = allTermsForYear.find(t => t.isCurrent) || allTermsForYear[0];
    }
    const termId = term?.id || `term-${academicYearId}-t1`;
    const termName = term?.name || 'Term 1';

    // 3. Authoritative Learning Areas strictly from the database for this class/grade
    const allLearningAreas = typeof this.academicRepository.findAllLearningAreas === 'function'
      ? await this.academicRepository.findAllLearningAreas()
      : [];

    // Filter by grade level of the classroom if available
    let gradeDbAreas = allLearningAreas.filter(la => {
      const laGrade = (la.gradeLevel || '').toUpperCase().replace(/[\s-]/g, '_');
      const targetGrade = String(gradeLevel).toUpperCase().replace(/[\s-]/g, '_');
      return laGrade === targetGrade;
    });

    const hasSpecificGradeAreas = gradeDbAreas.length > 0;
    if (gradeDbAreas.length === 0) {
      gradeDbAreas = allLearningAreas;
    }

    // Build deduplicated canonical learning areas map
    const canonicalMap = new Map<string, { id: string; name: string; code?: string; aliasIds: string[] }>();
    for (const la of gradeDbAreas) {
      const key = this.getSubjectCanonicalKey(la.code || la.name || la.id);
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, {
          id: la.id,
          name: this.getCanonicalDisplayName(key, la.name),
          code: this.getCanonicalDisplayCode(key, la.code),
          aliasIds: [la.id, la.code, la.name, key].filter(Boolean) as string[]
        });
      } else {
        const item = canonicalMap.get(key)!;
        if (!item.aliasIds.includes(la.id)) item.aliasIds.push(la.id);
        if (la.code && !item.aliasIds.includes(la.code)) item.aliasIds.push(la.code);
        if (la.name && !item.aliasIds.includes(la.name)) item.aliasIds.push(la.name);
        if (key === 'MATH' && la.name.toLowerCase() === 'mathematics') {
          item.name = 'Mathematics';
          item.code = 'MATH';
          item.id = la.id;
        } else if (key === 'SCI' && (la.name.toLowerCase().includes('science and technology') || la.name.toLowerCase() === 'science')) {
          item.name = la.name;
          item.code = 'SCI';
          item.id = la.id;
        }
      }
    }

    // Ensure all examination subjects with saved marks for this cohort are included in canonicalMap
    const altTermId = termId.includes('-t') ? termId.replace('-t', '-') : termId.replace(/-(\d)$/, '-t$1');
    let cohortSummatives = await this.CBCAssessmentRepository.findSummatives({ termId, academicYearId }).catch(() => []);
    if (!cohortSummatives || cohortSummatives.length === 0) {
      cohortSummatives = await this.CBCAssessmentRepository.findSummatives({ termId }).catch(() => []);
    }
    if (!cohortSummatives || cohortSummatives.length === 0) {
      cohortSummatives = await this.CBCAssessmentRepository.findSummatives({ termId: altTermId }).catch(() => []);
    }

    let cohortReportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(termId).catch(() => []);
    if (!cohortReportCards || cohortReportCards.length === 0) {
      cohortReportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(altTermId).catch(() => []);
    }

    // Cohort student IDs to ensure we include subjects assessed for this class/grade
    let cohortStudentIds: Set<string> | null = null;
    if (classRoom?.id) {
      const cohortStudents = await this.studentRepository.findAll({ classroomId: classRoom.id }).catch(() => []);
      if (cohortStudents && cohortStudents.length > 0) {
        cohortStudentIds = new Set(cohortStudents.map(s => s.id));
      } else if (classRoom.gradeLevel) {
        const gradeStudents = await this.studentRepository.findAll({ gradeLevel: classRoom.gradeLevel as any }).catch(() => []);
        if (gradeStudents && gradeStudents.length > 0) {
          cohortStudentIds = new Set(gradeStudents.map(s => s.id));
        }
      }
    }

    const registerAssessedSubject = (rawIdOrCode: string) => {
      if (!rawIdOrCode) return;
      const laMatch = allLearningAreas.find(
        a => a.id === rawIdOrCode ||
             a.id.toLowerCase() === rawIdOrCode.toLowerCase() ||
             (a.code && a.code.toLowerCase() === rawIdOrCode.toLowerCase()) ||
             a.name.toLowerCase() === rawIdOrCode.toLowerCase()
      );
      const key = this.getSubjectCanonicalKey(laMatch?.code || laMatch?.name || rawIdOrCode);
      if (key === 'OTHER' && /^[0-9a-f]{8}-/i.test(rawIdOrCode)) {
        return;
      }
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, {
          id: laMatch?.id || rawIdOrCode,
          name: this.getCanonicalDisplayName(key, laMatch?.name || rawIdOrCode),
          code: this.getCanonicalDisplayCode(key, laMatch?.code || rawIdOrCode),
          aliasIds: [rawIdOrCode, laMatch?.id, laMatch?.code, laMatch?.name, key].filter(Boolean) as string[]
        });
      } else {
        const item = canonicalMap.get(key)!;
        if (!item.aliasIds.includes(rawIdOrCode)) item.aliasIds.push(rawIdOrCode);
        if (laMatch?.id && !item.aliasIds.includes(laMatch.id)) item.aliasIds.push(laMatch.id);
        if (laMatch?.code && !item.aliasIds.includes(laMatch.code)) item.aliasIds.push(laMatch.code);
        if (laMatch?.name && !item.aliasIds.includes(laMatch.name)) item.aliasIds.push(laMatch.name);
      }
    };

    for (const s of (cohortSummatives || [])) {
      if (!cohortStudentIds || cohortStudentIds.has(s.studentId)) {
        registerAssessedSubject(s.learningAreaId);
      }
    }

    for (const rc of (cohortReportCards || [])) {
      if (!cohortStudentIds || cohortStudentIds.has(rc.studentId)) {
        for (const e of (rc.props.learningAreaAssessments || [])) {
          registerAssessedSubject(e.learningAreaId || e.code || e.learningAreaName);
        }
      }
    }

    let learningAreas = Array.from(canonicalMap.values());

    // 4. Streams for selected class
    let streamsToCompare = classRoom ? await this.academicRepository.findStreamsByClass(classRoom.id) : [];
    streamsToCompare = streamsToCompare.filter(s => s.classRoomId === classRoom?.id);

    if (!streamsToCompare || streamsToCompare.length === 0) {
      if (stream && stream.classRoomId === classRoom?.id) {
        streamsToCompare = [stream];
      } else if (classRoom) {
        streamsToCompare = [
          Stream.create({ classRoomId: classRoom.id, name: classRoom.name, capacity: 50 }, classRoom.id)
        ];
      }
    }

    // Evaluate target class streams
    const allStreamResults: StreamSection[] = [];
    for (const s of streamsToCompare) {
      const evaluated = await this.evaluateSingleStream(s, classRoom, termId, academicYearId, learningAreas);
      allStreamResults.push(evaluated);
    }

    const allClassRows: BroadsheetRow[] = [];
    allStreamResults.forEach(sr => {
      allClassRows.push(...sr.rows);
    });

    // Count learners with marks per subject to factor in priority (highest priority for subjects with marks)
    const marksCountMap = new Map<string, number>();
    for (const la of learningAreas) {
      const count = allClassRows.filter(r => {
        const sub = r.subjects[la.id];
        return sub && sub.levelLabel !== '--';
      }).length;
      marksCountMap.set(la.id, count);
    }

    const hasAnyCohortMarks = Array.from(marksCountMap.values()).some(cnt => cnt > 0);
    if (hasAnyCohortMarks) {
      // The master broadsheet must display strictly ONLY the fields/subjects with marks actually uploaded
      learningAreas = learningAreas.filter(la => (marksCountMap.get(la.id) || 0) > 0);
    }

    // Sort learning areas so that subjects with marks have HIGHEST priority in display
    learningAreas.sort((a, b) => {
      const countA = marksCountMap.get(a.id) || 0;
      const countB = marksCountMap.get(b.id) || 0;
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      if (countB !== countA) return countB - countA;
      const idxA = CANONICAL_ORDER.indexOf(this.getSubjectCanonicalKey(a.code || a.name || a.id));
      const idxB = CANONICAL_ORDER.indexOf(this.getSubjectCanonicalKey(b.code || b.name || b.id));
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Re-evaluate subject summaries for streams in prioritized order
    allStreamResults.forEach(sr => {
      sr.subjectSummaries = this.calculateSubjectSummaries(sr.rows, learningAreas);
    });

    allClassRows.sort((a, b) => this.compareBroadsheetRows(a, b));
    this.assignCompetitionRanks(allClassRows, r => r.totalScore, (r, rank) => {
      r.classRank = rank;
      r.rank = rank;
    });

    // Compute subject rank inside the class
    learningAreas.forEach(la => {
      const sortedBySubject = [...allClassRows].sort((a, b) => {
        const scoreA = a.subjects[la.id]?.numericScore || 0;
        const scoreB = b.subjects[la.id]?.numericScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
      });
      let curRank = 1;
      for (let i = 0; i < sortedBySubject.length; i++) {
        if (sortedBySubject[i].subjects[la.id]) {
          if (i > 0 && (sortedBySubject[i].subjects[la.id].numericScore || 0) === (sortedBySubject[i - 1].subjects[la.id]?.numericScore || 0)) {
            sortedBySubject[i].subjects[la.id].subjectRank = curRank;
          } else {
            curRank = i + 1;
            sortedBySubject[i].subjects[la.id].subjectRank = curRank;
          }
        }
      }
    });

    let targetRows: BroadsheetRow[] = [];
    let targetSubjectSummaries: BroadsheetSubjectSummary[] = [];
    let streamIdToReturn = stream ? stream.id : 'all';
    let streamNameToReturn = stream ? stream.name : 'All Streams (Grade Consolidated)';
    let streamMeanScore = 0;
    let streamMeanPoints = 0;

    if (isAllStreams || !stream) {
      targetRows = allClassRows;
      targetRows.forEach((r, idx) => {
        r.rank = r.classRank || idx + 1;
      });

      targetSubjectSummaries = this.calculateSubjectSummaries(targetRows, learningAreas);
      streamMeanScore = targetRows.length > 0
        ? Math.round(targetRows.reduce((sum, r) => sum + r.averageScore, 0) / targetRows.length)
        : 0;
      streamMeanPoints = targetRows.length > 0
        ? Number((targetRows.reduce((sum, r) => sum + r.meanPoints, 0) / targetRows.length).toFixed(2))
        : 0;
    } else {
      const currentStreamEvaluated = allStreamResults.find(sr => sr.streamId === stream.id);
      targetRows = currentStreamEvaluated ? currentStreamEvaluated.rows : [];
      targetSubjectSummaries = currentStreamEvaluated ? currentStreamEvaluated.subjectSummaries : [];
      streamMeanScore = currentStreamEvaluated ? currentStreamEvaluated.streamMeanScore : 0;
      streamMeanPoints = currentStreamEvaluated ? currentStreamEvaluated.streamMeanPoints : 0;
    }

    const genderStats = this.computeGenderStats(targetRows);

    // ==========================================
    // 5. SCHOOL-WIDE ANALYTICS COMPUTATION
    // ==========================================
    const allSchoolLearningAreas = typeof this.academicRepository.findAllLearningAreas === 'function'
      ? await this.academicRepository.findAllLearningAreas()
      : [];
    const schoolAllLearningAreasMap = new Map<string, { id: string; name: string }>();
    allSchoolLearningAreas.forEach(la => {
      schoolAllLearningAreasMap.set(la.id, { id: la.id, name: la.name });
    });

    const schoolSections: StreamSection[] = [];
    const allSchoolStudentsRows: BroadsheetRow[] = [];

    for (const cls of allClasses) {
      let clsStreams = await this.academicRepository.findStreamsByClass(cls.id);
      if (!clsStreams || clsStreams.length === 0) {
        clsStreams = [Stream.create({ classRoomId: cls.id, name: cls.name, capacity: 50 }, cls.id)];
      }

      const clsLearningAreas = allSchoolLearningAreas
        .map(la => ({ id: la.id, name: la.name }));

      for (const stm of clsStreams) {
        const sec = await this.evaluateSingleStream(stm, cls, termId, academicYearId, clsLearningAreas);
        schoolSections.push(sec);
        allSchoolStudentsRows.push(...sec.rows);
      }
    }

    // Assign school-wide rank to all learners in the entire institution
    allSchoolStudentsRows.sort((a, b) => this.compareBroadsheetRows(a, b));
    this.assignCompetitionRanks(allSchoolStudentsRows, r => r.totalScore, (r, rank) => {
      r.schoolRank = rank;
    });

    // A. School-Wide Class Rankings
    const schoolClassRankings: ClassRankingItem[] = allClasses
      .map(cls => {
        const matchingRows = allSchoolStudentsRows.filter(r => r.className === cls.name);
        const meanScore = matchingRows.length > 0
          ? Math.round(matchingRows.reduce((sum, r) => sum + r.averageScore, 0) / matchingRows.length)
          : 0;

        const eeCount = matchingRows.filter(r => r.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS || r.averageScore >= 80).length;
        const meCount = matchingRows.filter(r => r.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS || (r.averageScore >= 65 && r.averageScore < 80)).length;
        const aeCount = matchingRows.filter(r => r.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS || (r.averageScore >= 50 && r.averageScore < 65)).length;
        const beCount = matchingRows.filter(r => r.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS || r.averageScore < 50).length;

        const qualityPassRate = matchingRows.length > 0
          ? Math.round(((eeCount + meCount) / matchingRows.length) * 100)
          : 0;

        const topRow = matchingRows.length > 0 ? [...matchingRows].sort((a, b) => b.totalScore - a.totalScore)[0] : null;

        return {
          rank: 0,
          classId: cls.id,
          className: cls.name,
          streamName: 'Whole Grade',
          totalStudents: matchingRows.length,
          meanScore,
          overallPerformanceLevel: this.shortLevelLabel(this.levelFromScore(meanScore)),
          topStudentName: topRow ? topRow.studentName : 'N/A',
          topStudentScore: topRow ? topRow.averageScore : 0,
          topStudentAdmissionNumber: topRow ? topRow.admissionNumber : 'N/A',
          qualityPassRate,
          counts: { EE: eeCount, ME: meCount, AE: aeCount, BE: beCount }
        };
      })
      .filter(item => item.totalStudents > 0)
      .sort((a, b) => b.meanScore - a.meanScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // B. Stream Rankings within Selected Grade
    const classRankings: ClassRankingItem[] = allStreamResults
      .map(sr => {
        const eeCount = sr.rows.filter(r => r.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS || r.averageScore >= 80).length;
        const meCount = sr.rows.filter(r => r.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS || (r.averageScore >= 65 && r.averageScore < 80)).length;
        const aeCount = sr.rows.filter(r => r.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS || (r.averageScore >= 50 && r.averageScore < 65)).length;
        const beCount = sr.rows.filter(r => r.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS || r.averageScore < 50).length;
        const topRow = sr.rows[0];

        const qualityPassRate = sr.rows.length > 0
          ? Math.round(((eeCount + meCount) / sr.rows.length) * 100)
          : 0;

        return {
          rank: 0,
          classId: classRoom?.id || 'class-default',
          className: sr.className,
          streamId: sr.streamId,
          streamName: sr.streamName,
          totalStudents: sr.totalStudents,
          meanScore: sr.streamMeanScore,
          overallPerformanceLevel: this.shortLevelLabel(this.levelFromScore(sr.streamMeanScore)),
          topStudentName: topRow ? topRow.studentName : 'N/A',
          topStudentScore: topRow ? topRow.averageScore : 0,
          topStudentAdmissionNumber: topRow ? topRow.admissionNumber : 'N/A',
          qualityPassRate,
          counts: { EE: eeCount, ME: meCount, AE: aeCount, BE: beCount }
        };
      })
      .sort((a, b) => b.meanScore - a.meanScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // C. Best Performing Stream Per Subject
    const bestClassesPerSubject: BestClassPerSubjectItem[] = learningAreas.map(la => {
      const sortedBySubject = [...allStreamResults].sort((a, b) => {
        const aScore = a.subjectSummaries.find(s => s.learningAreaId === la.id)?.averageScore || 0;
        const bScore = b.subjectSummaries.find(s => s.learningAreaId === la.id)?.averageScore || 0;
        return bScore - aScore;
      });

      const bestStream = sortedBySubject[0];
      const bestScore = bestStream?.subjectSummaries.find(s => s.learningAreaId === la.id)?.averageScore || 0;
      const runnerUp = sortedBySubject.length > 1 ? sortedBySubject[1] : undefined;
      const runnerUpScore = runnerUp?.subjectSummaries.find(s => s.learningAreaId === la.id)?.averageScore;

      return {
        learningAreaId: la.id,
        learningAreaName: la.name,
        bestStreamId: bestStream?.streamId || streamIdToReturn,
        bestStreamName: bestStream?.streamName || streamNameToReturn,
        bestClassName: bestStream?.className || classRoom?.name || 'Class',
        meanScore: bestScore,
        performanceLevel: this.shortLevelLabel(this.levelFromScore(bestScore)),
        totalStudents: bestStream?.totalStudents || 0,
        runnerUpStreamName: runnerUp?.streamName,
        runnerUpMeanScore: runnerUpScore
      };
    }).filter(b => b.meanScore > 0);

    // D. Best Student Per Subject in Class
    const bestStudentsPerSubject: BestStudentPerSubjectItem[] = learningAreas.map(la => {
      let topStudentRow: BroadsheetRow | null = null;
      let topStreamName = streamNameToReturn;
      let topScore = -1;

      for (const sr of allStreamResults) {
        for (const r of sr.rows) {
          const score = r.subjects[la.id]?.numericScore || 0;
          if (score > topScore) {
            topScore = score;
            topStudentRow = r;
            topStreamName = sr.streamName;
          }
        }
      }

      const score = topScore >= 0 ? topScore : 0;
      const level = topStudentRow?.subjects[la.id]?.levelLabel || this.shortLevelLabel(this.levelFromScore(score));

      return {
        learningAreaId: la.id,
        learningAreaName: la.name,
        studentId: topStudentRow?.studentId || 'std-top',
        studentName: topStudentRow?.studentName || 'Top Learner',
        admissionNumber: topStudentRow?.admissionNumber || '',
        className: classRoom?.name || 'Class',
        streamName: topStreamName,
        gender: topStudentRow?.gender || 'M',
        score,
        performanceLevel: level,
        scope: 'CLASS' as const
      };
    }).filter(s => s.score > 0);

    // E. Best Student Per Subject in the Entire School (School Champions)
    const schoolBestStudentsPerSubject: BestStudentPerSubjectItem[] = Array.from(schoolAllLearningAreasMap.values()).map(la => {
      let topStudentRow: BroadsheetRow | null = null;
      let topScore = -1;

      for (const r of allSchoolStudentsRows) {
        const score = r.subjects[la.id]?.numericScore || 0;
        if (score > topScore) {
          topScore = score;
          topStudentRow = r;
        }
      }

      const score = topScore >= 0 ? topScore : 0;
      const level = topStudentRow?.subjects[la.id]?.levelLabel || this.shortLevelLabel(this.levelFromScore(score));

      return {
        learningAreaId: la.id,
        learningAreaName: la.name,
        studentId: topStudentRow?.studentId || 'std-school-top',
        studentName: topStudentRow?.studentName || 'School Champion',
        admissionNumber: topStudentRow?.admissionNumber || '',
        className: topStudentRow?.className || 'Grade',
        streamName: topStudentRow?.streamName || 'Main',
        gender: topStudentRow?.gender || 'M',
        score,
        performanceLevel: level,
        scope: 'SCHOOL' as const
      };
    }).filter(s => s.score > 0);

    // F. Top Students Across the Whole School
    const schoolTopStudents = [...allSchoolStudentsRows]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    // G. School-Wide Subject Summaries
    const schoolSubjectSummaries = this.calculateSubjectSummaries(
      allSchoolStudentsRows,
      Array.from(schoolAllLearningAreasMap.values())
    );

    return {
      streamId: streamIdToReturn,
      streamName: streamNameToReturn,
      classId: classRoom?.id,
      className: classRoom?.name || 'Class',
      gradeLevel: String(gradeLevel),
      termName,
      yearName,
      examType,
      learningAreas,
      rows: targetRows,
      streamSections: allStreamResults,
      subjectSummaries: targetSubjectSummaries,
      streamMeanScore,
      streamMeanPoints,
      totalStudents: targetRows.length,
      totalClassStudents: allClassRows.length,
      genderStats,
      classRankings,
      bestClassesPerSubject,
      bestStudentsPerSubject,
      schoolClassRankings,
      schoolTopStudents,
      schoolSubjectSummaries,
      schoolBestStudentsPerSubject
    };
  }

  private async evaluateSingleStream(
    stream: any,
    classRoom: any,
    termId: string,
    academicYearId: string,
    learningAreas: Array<{ id: string; name: string }>
  ): Promise<StreamSection> {
    let students: Student[] = [];
    if (stream && stream.id !== classRoom?.id) {
      students = await this.studentRepository.findAll({ streamId: stream.id });
      if (!students || students.length === 0) {
        const allInClass = classRoom?.id ? await this.studentRepository.findAll({ classroomId: classRoom.id }) : [];
        students = allInClass.filter(s => s.streamId === stream.id);
      }
      if (!students || students.length === 0) {
        const allStreamsInClass = classRoom?.id ? await this.academicRepository.findStreamsByClass(classRoom.id) : [];
        if (allStreamsInClass.length <= 1) {
          const unassigned = await this.studentRepository.findAll({ gradeLevel: classRoom?.gradeLevel as any });
          students = unassigned.filter(s => !s.streamId || s.streamId === stream.id);
        }
      }
    } else if (classRoom?.id) {
      students = await this.studentRepository.findAll({ classroomId: classRoom.id });
      if ((!students || students.length === 0) && classRoom.gradeLevel) {
        students = await this.studentRepository.findAll({ gradeLevel: classRoom.gradeLevel as any });
      }
    } else if (classRoom?.gradeLevel) {
      students = await this.studentRepository.findAll({ gradeLevel: classRoom.gradeLevel as any });
    }

    // Strict active student filter: Only ACTIVE students are eligible for academic ranking
    students = (students || []).filter(s => {
      const st = (s as any).status;
      return st === StudentStatus.ACTIVE || st === 'ACTIVE' || st === 'Active' || !st;
    });

    const altTermId = termId.includes('-t') ? termId.replace('-t', '-') : termId.replace(/-(\d)$/, '-t$1');

    let summatives = await this.CBCAssessmentRepository.findSummatives({
      termId,
      academicYearId
    });
    if (!summatives || summatives.length === 0) {
      summatives = await this.CBCAssessmentRepository.findSummatives({ termId });
    }
    if (!summatives || summatives.length === 0) {
      summatives = await this.CBCAssessmentRepository.findSummatives({ termId: altTermId });
    }

    let reportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(termId, stream.id);
    if (!reportCards || reportCards.length === 0) {
      reportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(termId);
    }
    if (!reportCards || reportCards.length === 0) {
      reportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(altTermId, stream.id);
    }
    if (!reportCards || reportCards.length === 0) {
      reportCards = await this.CBCAssessmentRepository.findReportCardsByTerm(altTermId);
    }
    const reportCardsByStudent = new Map(reportCards.map(rc => [rc.studentId, rc]));

    const allLearningAreas = typeof this.academicRepository.findAllLearningAreas === 'function'
      ? await this.academicRepository.findAllLearningAreas()
      : [];

    const summativeMap = new Map<string, any>();
    for (const s of summatives) {
      summativeMap.set(`${s.studentId}_${s.learningAreaId}`, s);
      summativeMap.set(`${s.studentId}_${s.learningAreaId.toLowerCase()}`, s);
      const laMatch = allLearningAreas.find(
        a => a.id === s.learningAreaId ||
             a.id.toLowerCase() === s.learningAreaId.toLowerCase() ||
             (a.code && a.code.toLowerCase() === s.learningAreaId.toLowerCase()) ||
             a.name.toLowerCase() === s.learningAreaId.toLowerCase()
      );
      if (laMatch) {
        if (laMatch.code) {
          summativeMap.set(`${s.studentId}_${laMatch.code}`, s);
          summativeMap.set(`${s.studentId}_${laMatch.code.toLowerCase()}`, s);
        }
        if (laMatch.name) {
          summativeMap.set(`${s.studentId}_${laMatch.name.toLowerCase()}`, s);
        }
        const sKey = this.getSubjectCanonicalKey(laMatch.code || laMatch.name || laMatch.id);
        summativeMap.set(`${s.studentId}_${sKey}`, s);
      }
    }

    const rows: BroadsheetRow[] = [];

    for (const student of students) {
      const subjectScores: Record<string, StudentSubjectScore> = {};
      let totalScore = 0;
      let totalPoints = 0;
      let evaluatedCount = 0;

      const rc = reportCardsByStudent.get(student.id);

      for (const la of learningAreas) {
        const laKey = this.getSubjectCanonicalKey((la as any).code || la.name || la.id);
        const aliases: string[] = (la as any).aliasIds || [la.id];
        let s: any = null;
        for (const aId of aliases) {
          const match = summativeMap.get(`${student.id}_${aId}`) || summativeMap.get(`${student.id}_${String(aId).toLowerCase()}`);
          if (match) {
            s = match;
            break;
          }
        }
        if (!s) {
          for (const summ of summatives) {
            if (summ.studentId === student.id) {
              const summKey = this.getSubjectCanonicalKey(summ.learningAreaId);
              if (summKey === laKey) {
                s = summ;
                break;
              }
            }
          }
        }

        const rcScore = rc?.props.learningAreaAssessments?.find((e: any) => {
          const eKey = this.getSubjectCanonicalKey(e.code || e.learningAreaName || e.learningAreaId || '');
          if (eKey === laKey) return true;
          return (
            aliases.some(aId => 
              e.learningAreaId === aId || 
              e.learningAreaId?.toLowerCase() === aId.toLowerCase()
            ) ||
            e.learningAreaName?.trim().toLowerCase() === la.name.trim().toLowerCase()
          );
        });
        let hasEvaluation = false;
        let level: PerformanceLevel = PerformanceLevel.BELOW_EXPECTATIONS;
        let score = 0;

        if (rcScore) {
          level = rcScore.performanceLevel;
          score = rcScore.rawScore !== undefined && rcScore.rawScore !== null
            ? rcScore.rawScore
            : (rcScore.score !== undefined ? rcScore.score : this.scoreFromLevel(level));
          hasEvaluation = true;
        } else if (s) {
          level = s.overallPerformanceLevel;
          const rawSum = s.strandScores?.reduce((acc: number, cur: any) => acc + (cur.rawScore ?? cur.score ?? 0), 0) || 0;
          const count = s.strandScores?.length || 1;
          score = Math.round(rawSum / count) || this.scoreFromLevel(level);
          hasEvaluation = true;
        }

        const pts = hasEvaluation ? this.pointsFromLevel(level) : 0;

        if (hasEvaluation) {
          totalScore += score;
          totalPoints += pts;
          evaluatedCount++;
        }

        subjectScores[la.id] = {
          learningAreaId: la.id,
          learningAreaName: la.name,
          performanceLevel: level,
          numericScore: score,
          levelLabel: hasEvaluation ? this.shortLevelLabel(level) : '--',
          points: pts,
          subjectRank: 0
        };
      }

      const subjectDivisor = evaluatedCount > 0 ? evaluatedCount : 1;
      const averageScore = evaluatedCount > 0 ? Math.round(totalScore / subjectDivisor) : 0;
      const meanPoints = evaluatedCount > 0 ? Number((totalPoints / subjectDivisor).toFixed(2)) : 0;
      const overallLevel = evaluatedCount > 0 ? this.levelFromScore(averageScore) : PerformanceLevel.BELOW_EXPECTATIONS;
      const remarks = evaluatedCount > 0 ? this.generateRemark(overallLevel, averageScore) : this.generateRemark(overallLevel, 0);

      rows.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.fullName,
        gender: String(student.gender || 'M'),
        streamId: stream.id,
        streamName: stream.name,
        className: classRoom?.name || 'Class',
        subjects: subjectScores,
        totalScore,
        averageScore,
        totalPoints,
        meanPoints,
        overallPerformanceLevel: overallLevel,
        rank: 0,
        streamRank: 0,
        classRank: 0,
        evaluatedCount,
        isPending: evaluatedCount === 0,
        remarks
      });
    }

    rows.sort((a, b) => this.compareBroadsheetRows(a, b));
    this.assignCompetitionRanks(rows, r => r.totalScore, (r, rank) => {
      r.rank = rank;
      r.streamRank = rank;
      r.classRank = rank;
    });

    learningAreas.forEach(la => {
      const sorted = [...rows].sort((a, b) => {
        const scoreA = a.subjects[la.id]?.numericScore || 0;
        const scoreB = b.subjects[la.id]?.numericScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
      });
      let curRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].subjects[la.id]) {
          if (i > 0 && (sorted[i].subjects[la.id].numericScore || 0) === (sorted[i - 1].subjects[la.id]?.numericScore || 0)) {
            sorted[i].subjects[la.id].subjectRank = curRank;
          } else {
            curRank = i + 1;
            sorted[i].subjects[la.id].subjectRank = curRank;
          }
        }
      }
    });

    const subjectSummaries = this.calculateSubjectSummaries(rows, learningAreas);
    const streamMeanScore = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.averageScore, 0) / rows.length)
      : 0;
    const streamMeanPoints = rows.length > 0
      ? Number((rows.reduce((sum, r) => sum + r.meanPoints, 0) / rows.length).toFixed(2))
      : 0;

    return {
      streamId: stream.id,
      streamName: stream.name,
      className: classRoom?.name || 'Class',
      rows,
      subjectSummaries,
      streamMeanScore,
      streamMeanPoints,
      totalStudents: rows.length
    };
  }

  private calculateSubjectSummaries(
    rows: BroadsheetRow[],
    learningAreas: Array<{ id: string; name: string }>
  ): BroadsheetSubjectSummary[] {
    const list: BroadsheetSubjectSummary[] = learningAreas.map(la => {
      let subTotal = 0;
      let subPoints = 0;
      let assessedCount = 0;
      let highestScore = 0;
      let lowestScore = 100;
      let highestScorerName: string | undefined = undefined;
      const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };

      for (const row of rows) {
        const sub = row.subjects[la.id];
        if (sub && sub.levelLabel !== '--') {
          subTotal += sub.numericScore;
          subPoints += sub.points;
          assessedCount++;
          if (sub.numericScore > highestScore) {
            highestScore = sub.numericScore;
            highestScorerName = `${row.studentName} (${highestScore}%)`;
          }
          if (sub.numericScore < lowestScore) {
            lowestScore = sub.numericScore;
          }

          if (sub.levelLabel === 'EE') counts.EE++;
          else if (sub.levelLabel === 'ME') counts.ME++;
          else if (sub.levelLabel === 'AE') counts.AE++;
          else counts.BE++;
        }
      }

      if (assessedCount === 0) {
        lowestScore = 0;
      }

      const averageScore = assessedCount > 0 ? Math.round(subTotal / assessedCount) : 0;
      const meanPoints = assessedCount > 0 ? Number((subPoints / assessedCount).toFixed(2)) : 0;
      const passRate = assessedCount > 0 ? Math.round(((counts.EE + counts.ME) / assessedCount) * 100) : 0;

      return {
        learningAreaId: la.id,
        learningAreaName: la.name,
        averageScore,
        meanPoints,
        highestScore: assessedCount > 0 ? highestScore : 0,
        lowestScore: assessedCount > 0 ? lowestScore : 0,
        highestScorerName,
        passRate,
        counts
      };
    });

    const hasAnyAssessed = list.some(item => (item.counts.EE + item.counts.ME + item.counts.AE + item.counts.BE) > 0);
    return hasAnyAssessed
      ? list.filter(item => (item.counts.EE + item.counts.ME + item.counts.AE + item.counts.BE) > 0)
      : list;
  }

  private computeGenderStats(rows: BroadsheetRow[]): GenderStats {
    const boys = rows.filter(r => (r.gender || 'M').toUpperCase().startsWith('M'));
    const girls = rows.filter(r => (r.gender || '').toUpperCase().startsWith('F'));

    const boysCount = boys.length;
    const girlsCount = girls.length;
    const totalCount = rows.length;

    const boysMeanScore = boysCount > 0 ? Math.round(boys.reduce((acc, b) => acc + b.averageScore, 0) / boysCount) : 0;
    const girlsMeanScore = girlsCount > 0 ? Math.round(girls.reduce((acc, g) => acc + g.averageScore, 0) / girlsCount) : 0;

    const boysMeanPoints = boysCount > 0 ? Number((boys.reduce((acc, b) => acc + b.meanPoints, 0) / boysCount).toFixed(2)) : 0;
    const girlsMeanPoints = girlsCount > 0 ? Number((girls.reduce((acc, g) => acc + g.meanPoints, 0) / girlsCount).toFixed(2)) : 0;

    const boysEE = boys.filter(b => b.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS || b.averageScore >= 80).length;
    const boysME = boys.filter(b => b.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS || (b.averageScore >= 65 && b.averageScore < 80)).length;
    const boysAE = boys.filter(b => b.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS || (b.averageScore >= 50 && b.averageScore < 65)).length;
    const boysBE = boys.filter(b => b.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS || b.averageScore < 50).length;

    const girlsEE = girls.filter(g => g.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS || g.averageScore >= 80).length;
    const girlsME = girls.filter(g => g.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS || (g.averageScore >= 65 && g.averageScore < 80)).length;
    const girlsAE = girls.filter(g => g.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS || (g.averageScore >= 50 && g.averageScore < 65)).length;
    const girlsBE = girls.filter(g => g.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS || g.averageScore < 50).length;

    const sortedBoys = [...boys].sort((a, b) => b.totalScore - a.totalScore);
    const sortedGirls = [...girls].sort((a, b) => b.totalScore - a.totalScore);

    return {
      boysCount,
      girlsCount,
      totalCount,
      boysMeanScore,
      girlsMeanScore,
      boysMeanPoints,
      girlsMeanPoints,
      boysEE,
      boysME,
      boysAE,
      boysBE,
      girlsEE,
      girlsME,
      girlsAE,
      girlsBE,
      topBoyName: sortedBoys[0]?.studentName,
      topBoyScore: sortedBoys[0]?.averageScore,
      topGirlName: sortedGirls[0]?.studentName,
      topGirlScore: sortedGirls[0]?.averageScore
    };
  }

  private pointsFromLevel(level: PerformanceLevel): number {
    switch (level) {
      case PerformanceLevel.EXCEEDING_EXPECTATIONS: return 4;
      case PerformanceLevel.MEETING_EXPECTATIONS: return 3;
      case PerformanceLevel.APPROACHING_EXPECTATIONS: return 2;
      case PerformanceLevel.BELOW_EXPECTATIONS: return 1;
      default: return 1;
    }
  }

  private generateRemark(level: PerformanceLevel, averageScore: number): string {
    switch (level) {
      case PerformanceLevel.EXCEEDING_EXPECTATIONS:
        if (averageScore >= 90) return 'Exemplary distinction! Demonstrates outstanding critical thinking and mastery across all competencies.';
        return 'Exceeding expectations! Superb mastery of core competencies and independent learning skills.';
      case PerformanceLevel.MEETING_EXPECTATIONS:
        if (averageScore >= 72) return 'Very good progress. Meets curriculum learning outcomes consistently and with confidence.';
        return 'Good effort. Meets required grade level competencies. Maintain focus for greater distinction.';
      case PerformanceLevel.APPROACHING_EXPECTATIONS:
        if (averageScore >= 58) return 'Fair performance. Approaching competency; targeted revision in challenging areas recommended.';
        return 'Approaching expectations. Regular guidance and supplementary exercises needed to attain mastery.';
      case PerformanceLevel.BELOW_EXPECTATIONS:
        return 'Requires academic intervention and structured remedial support in core learning areas.';
      default:
        return 'Consistent effort demonstrated. Keep working towards mastery.';
    }
  }

  private scoreFromLevel(level: PerformanceLevel): number {
    switch (level) {
      case PerformanceLevel.EXCEEDING_EXPECTATIONS: return 88;
      case PerformanceLevel.MEETING_EXPECTATIONS: return 72;
      case PerformanceLevel.APPROACHING_EXPECTATIONS: return 54;
      case PerformanceLevel.BELOW_EXPECTATIONS: return 36;
      default: return 70;
    }
  }

  private levelFromScore(score: number): PerformanceLevel {
    if (score >= 80) return PerformanceLevel.EXCEEDING_EXPECTATIONS;
    if (score >= 65) return PerformanceLevel.MEETING_EXPECTATIONS;
    if (score >= 50) return PerformanceLevel.APPROACHING_EXPECTATIONS;
    return PerformanceLevel.BELOW_EXPECTATIONS;
  }

  private shortLevelLabel(level: PerformanceLevel): string {
    switch (level) {
      case PerformanceLevel.EXCEEDING_EXPECTATIONS: return 'EE';
      case PerformanceLevel.MEETING_EXPECTATIONS: return 'ME';
      case PerformanceLevel.APPROACHING_EXPECTATIONS: return 'AE';
      case PerformanceLevel.BELOW_EXPECTATIONS: return 'BE';
      default: return 'BE';
    }
  }

  private compareBroadsheetRows(a: BroadsheetRow, b: BroadsheetRow): number {
    const aHas = (a.evaluatedCount !== undefined ? a.evaluatedCount > 0 : a.totalScore > 0);
    const bHas = (b.evaluatedCount !== undefined ? b.evaluatedCount > 0 : b.totalScore > 0);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;

    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const admComp = (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
    if (admComp !== 0) return admComp;
    return (a.studentId || '').localeCompare(b.studentId || '');
  }

  public getCanonicalDisplayName(key: string, defaultName: string): string {
    switch (key) {
      case 'MATH': return 'Mathematics';
      case 'ENG': return 'English Language';
      case 'KISW': return 'Kiswahili Language';
      case 'SCI': return 'Science and Technology';
      case 'SST': return 'Social Studies';
      case 'CRE': return 'Christian Religious Education';
      case 'SRE': return 'Religious Education Activities';
      case 'AGRI': return 'Agriculture & Nutrition';
      case 'ARTS': return 'Creative Arts & Sports';
      case 'PRETECH': return 'Pre-Technical Studies';
      case 'HLTH': return 'Health Education';
      case 'BUS': return 'Business Studies';
      case 'COMP': return 'Computer Science';
      case 'ENV': return 'Environmental Activities';
      case 'REA': return 'English Reading / Literacy Activities';
      case 'KUSO': return 'Kusoma Activities';
      case 'CREA': return 'Creative Activities';
      case 'IND': return 'Indigenous Language Activities';
      default: return defaultName;
    }
  }

  public getCanonicalDisplayCode(key: string, defaultCode?: string): string {
    switch (key) {
      case 'MATH': return 'MATH';
      case 'ENG': return 'ENG';
      case 'KISW': return 'KIS';
      case 'SCI': return 'SCI';
      case 'SST': return 'SST';
      case 'SOC': return 'SST';
      case 'CRE': return 'CRE';
      case 'SRE': return 'CRE';
      case 'AGRI': return 'AGR';
      case 'ARTS': return 'ARTS';
      case 'PRETECH': return 'PRET';
      case 'HLTH': return 'HLTH';
      case 'BUS': return 'BUS';
      case 'COMP': return 'COMP';
      case 'ENV': return 'ENV';
      case 'REA': return 'REA';
      case 'KUSO': return 'KUSO';
      case 'CREA': return 'CREA';
      case 'IND': return 'IND';
      default: return defaultCode || key;
    }
  }

  public getSubjectCanonicalKey(str: string): string {
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

  private assignCompetitionRanks(
    rows: BroadsheetRow[],
    scoreFn: (r: BroadsheetRow) => number,
    assignFn: (r: BroadsheetRow, rank: number) => void
  ): void {
    const eligibleRows = rows.filter(r => (r.evaluatedCount !== undefined ? r.evaluatedCount > 0 : r.totalScore > 0));
    let currentRank = 1;
    for (let i = 0; i < eligibleRows.length; i++) {
      if (i > 0 && scoreFn(eligibleRows[i]) === scoreFn(eligibleRows[i - 1])) {
        assignFn(eligibleRows[i], currentRank);
      } else {
        currentRank = i + 1;
        assignFn(eligibleRows[i], currentRank);
      }
    }
    for (const r of rows) {
      if ((r.evaluatedCount !== undefined && r.evaluatedCount === 0) && r.totalScore === 0) {
        assignFn(r, 0);
      }
    }
  }
}

export default BroadsheetUseCases;