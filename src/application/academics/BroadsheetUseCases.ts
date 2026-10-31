import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ICBCAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { Stream } from '../../core/domain/academic/ClassRoom';
import { PerformanceLevel } from '../../core/domain/cbc/CbcAssessment';
import { CBCGradeLevel } from '../../core/domain/user/Student';
import { NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface BroadsheetQueryDTO {
  streamId: string;
  classId?: string;
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

export class BroadsheetUseCases {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly CBCAssessmentRepository: ICBCAssessmentRepository
  ) {}

  public async getClassAnalytics(classId: string, termId?: string, academicYearId?: string) {
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

  public async getStreamBroadsheet(query: BroadsheetQueryDTO): Promise<BroadsheetResult> {
    if (!query.streamId) {
      throw new ValidationError('Stream ID is required to generate broadsheet.');
    }

    const isAllStreams =
      query.streamId.toLowerCase() === 'all' ||
      query.streamId.toLowerCase().startsWith('all_') ||
      query.streamId.toLowerCase().startsWith('all-');

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
        } else {
          throw new NotFoundError('Stream not found.');
        }
      } else {
        classRoom = await this.academicRepository.findClassById(stream.classRoomId);
      }
    }

    if (!classRoom && allClasses.length > 0) {
      classRoom = allClasses[0];
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

    // 3. Global Learning areas for the school
    const allLearningAreas = await this.academicRepository.findAllLearningAreas();
    const learningAreas = allLearningAreas.map(la => ({ id: la.id, name: la.name }));

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
    });

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
    });

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
    let students = await this.studentRepository.findAll({ streamId: stream.id });
    if (!students || students.length === 0) {
      students = await this.studentRepository.findAll({ classroomId: classRoom?.id, streamId: stream.id });
    }
    if ((!students || students.length === 0) && classRoom?.id) {
      students = await this.studentRepository.findAll({ classroomId: classRoom.id });
    }
    if ((!students || students.length === 0) && classRoom?.gradeLevel) {
      students = await this.studentRepository.findAll({ gradeLevel: classRoom.gradeLevel as any });
    }

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

    const summativeMap = new Map<string, any>();
    for (const s of summatives) {
      summativeMap.set(`${s.studentId}_${s.learningAreaId}`, s);
      summativeMap.set(`${s.studentId}_${s.learningAreaId.toLowerCase()}`, s);
    }

    const rows: BroadsheetRow[] = [];

    for (const student of students) {
      const subjectScores: Record<string, StudentSubjectScore> = {};
      let totalScore = 0;
      let totalPoints = 0;
      let evaluatedCount = 0;

      const rc = reportCardsByStudent.get(student.id);

      for (const la of learningAreas) {
        const s = summativeMap.get(`${student.id}_${la.id}`) || summativeMap.get(`${student.id}_${la.id.toLowerCase()}`);
        const rcScore = rc?.props.learningAreaAssessments?.find((e: any) => 
          e.learningAreaId === la.id || 
          e.learningAreaId?.toLowerCase() === la.id.toLowerCase() ||
          e.learningAreaName?.trim().toLowerCase() === la.name.trim().toLowerCase()
        );
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

      const subjectDivisor = learningAreas.length > 0 ? learningAreas.length : (evaluatedCount || 1);
      const averageScore = Math.round(totalScore / subjectDivisor);
      const meanPoints = Number((totalPoints / subjectDivisor).toFixed(2));
      const overallLevel = this.levelFromScore(averageScore);
      const remarks = this.generateRemark(overallLevel, averageScore);

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
    return learningAreas.map(la => {
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
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const admComp = (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
    if (admComp !== 0) return admComp;
    return (a.studentId || '').localeCompare(b.studentId || '');
  }

  private assignCompetitionRanks(
    rows: BroadsheetRow[],
    scoreFn: (r: BroadsheetRow) => number,
    assignFn: (r: BroadsheetRow, rank: number) => void
  ): void {
    let currentRank = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && scoreFn(rows[i]) === scoreFn(rows[i - 1])) {
        assignFn(rows[i], currentRank);
      } else {
        currentRank = i + 1;
        assignFn(rows[i], currentRank);
      }
    }
  }
}

export default BroadsheetUseCases;