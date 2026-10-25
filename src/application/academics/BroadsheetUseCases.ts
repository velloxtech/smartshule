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
  numericScore: number; // 0 - 100
  levelLabel: string; // "EE", "ME", "AE", "BE"
  points: number; // 4, 3, 2, 1
  subjectRank: number; // Rank in this subject
}

export interface BroadsheetRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gender: string;
  streamId?: string;
  streamName?: string;
  subjects: Record<string, StudentSubjectScore>; // keyed by learningAreaId
  totalScore: number;
  averageScore: number;
  totalPoints: number;
  meanPoints: number;
  overallPerformanceLevel: PerformanceLevel;
  rank: number;
  streamRank: number;
  classRank: number;
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
  passRate: number; // percentage of students with EE or ME
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
  streamId: string;
  streamName: string;
  totalStudents: number;
  meanScore: number;
  overallPerformanceLevel: string;
  topStudentName: string;
  topStudentScore: number;
  topStudentAdmissionNumber?: string;
  qualityPassRate: number; // percentage of students with EE or ME
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
  classRankings: ClassRankingItem[];
  bestClassesPerSubject: BestClassPerSubjectItem[];
  bestStudentsPerSubject: BestStudentPerSubjectItem[];
}

export class BroadsheetUseCases {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly CBCAssessmentRepository: ICBCAssessmentRepository
  ) {}

  public async getStreamBroadsheet(query: BroadsheetQueryDTO): Promise<BroadsheetResult> {
    if (!query.streamId) {
      throw new ValidationError('Stream ID is required to generate broadsheet.');
    }

    const isAllStreams =
      query.streamId.toLowerCase() === 'all' ||
      query.streamId.toLowerCase().startsWith('all_') ||
      query.streamId.toLowerCase().startsWith('all-');

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
          const allClasses = typeof this.academicRepository.findAllClasses === 'function'
            ? await this.academicRepository.findAllClasses()
            : [];
          classRoom = allClasses.find(
            c => c.name.toLowerCase() === targetClassId!.toLowerCase() ||
                 c.gradeLevel.toLowerCase() === targetClassId!.toLowerCase()
          ) || null;
        }
      }
      if (!classRoom) {
        const allClasses = typeof this.academicRepository.findAllClasses === 'function'
          ? await this.academicRepository.findAllClasses()
          : [];
        // Prefer a class that has configured streams (like Grade 4)
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
        // Maybe a classId was passed directly as streamId
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

    if (!classRoom) {
      const allClasses = typeof this.academicRepository.findAllClasses === 'function'
        ? await this.academicRepository.findAllClasses()
        : [];
      if (allClasses.length > 0) {
        classRoom = allClasses[0];
      }
    }

    const gradeLevel = classRoom?.gradeLevel || CBCGradeLevel.GRADE_4;
    const examType = query.examType || 'End of Term';

    // 1. Robust Academic Year Resolution (by ID, by name e.g. '2026', or current)
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

    // 2. Robust Academic Term Resolution (by ID, by name e.g. 'Term 3', by termNumber e.g. 3, or current)
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
      // Match by exact ID in terms for this year
      term = allTermsForYear.find(t => t.id.toLowerCase() === qTerm) || null;

      // Match by term number (e.g. 'Term 3', '3', 'term-3', 'term-2026-t3')
      if (!term) {
        const tMatch = qTerm.match(/t(?:erm)?[_-]?([1-3])\b/i) || qTerm.match(/[-_t]([1-3])$/i) || qTerm.match(/\b([1-3])\b/);
        const termNum = tMatch ? parseInt(tMatch[1], 10) : null;
        if (termNum !== null) {
          term = allTermsForYear.find(t => t.termNumber === termNum) || null;
        }
      }

      // Match by term name
      if (!term) {
        term = allTermsForYear.find(
          t => t.name.toLowerCase() === qTerm ||
               t.name.toLowerCase().includes(qTerm) ||
               qTerm.includes(t.name.toLowerCase())
        ) || null;
      }

      // Try global findTermById
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

    // Fetch learning areas strictly from database for this specific gradeLevel
    const allLearningAreas = await this.academicRepository.findAllLearningAreas({ gradeLevel });
    const learningAreas = allLearningAreas.map(la => ({ id: la.id, name: la.name }));

    // Fetch ONLY streams belonging strictly to this classRoom - NEVER bleed across different classes!
    let streamsToCompare = classRoom ? await this.academicRepository.findStreamsByClass(classRoom.id) : [];
    streamsToCompare = streamsToCompare.filter(s => s.classRoomId === classRoom?.id);

    if (!streamsToCompare || streamsToCompare.length === 0) {
      if (stream && stream.classRoomId === classRoom?.id) {
        streamsToCompare = [stream];
      } else if (classRoom) {
        // Class has no discrete streams; treat the class itself as the sole cohort
        streamsToCompare = [
          Stream.create({ classRoomId: classRoom.id, name: classRoom.name, capacity: 50 }, classRoom.id)
        ];
      }
    }

    // Evaluate each stream
    const allStreamResults: Array<{
      streamId: string;
      streamName: string;
      className: string;
      rows: BroadsheetRow[];
      subjectSummaries: BroadsheetSubjectSummary[];
      streamMeanScore: number;
      streamMeanPoints: number;
      totalStudents: number;
    }> = [];

    for (const s of streamsToCompare) {
      const evaluated = await this.evaluateSingleStream(s, classRoom, termId, academicYearId, learningAreas);
      allStreamResults.push(evaluated);
    }

    // Pool all class rows together to calculate overall Class/Grade ranks
    const allClassRows: BroadsheetRow[] = [];
    allStreamResults.forEach(sr => {
      allClassRows.push(...sr.rows);
    });

    // Sort all class rows by totalScore descending (with tie-breakers)
    allClassRows.sort((a, b) => b.totalScore - a.totalScore || b.averageScore - a.averageScore || b.totalPoints - a.totalPoints);
    allClassRows.forEach((r, idx) => {
      r.classRank = idx + 1;
    });

    // Compute subject rank across the entire class for each subject
    learningAreas.forEach(la => {
      const sortedBySubject = [...allClassRows].sort(
        (a, b) => (b.subjects[la.id]?.numericScore || 0) - (a.subjects[la.id]?.numericScore || 0)
      );
      sortedBySubject.forEach((row, idx) => {
        if (row.subjects[la.id]) {
          row.subjects[la.id].subjectRank = idx + 1;
        }
      });
    });

    // Determine target rows and subject summaries
    let targetRows: BroadsheetRow[] = [];
    let targetSubjectSummaries: BroadsheetSubjectSummary[] = [];
    let streamIdToReturn = stream ? stream.id : 'all';
    let streamNameToReturn = stream ? stream.name : 'All Streams (Grade Consolidated)';
    let streamMeanScore = 0;
    let streamMeanPoints = 0;

    if (isAllStreams || !stream) {
      targetRows = allClassRows;
      targetRows.forEach((r, idx) => {
        r.rank = idx + 1; // In All Streams view, rank is the grade rank
      });

      // Recalculate subject summaries across the whole class
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

    // Gender disaggregated statistics
    const genderStats = this.computeGenderStats(targetRows);

    // 1. Compute Class / Stream Rankings
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
          counts: {
            EE: eeCount,
            ME: meCount,
            AE: aeCount,
            BE: beCount
          }
        };
      })
      .sort((a, b) => b.meanScore - a.meanScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // 2. Compute Best Performing Class Per Subject
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

    // 3. Compute Best Student Per Subject (Subject Champions)
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

      const score = topScore >= 0 ? topScore : 75;
      const level = topStudentRow?.subjects[la.id]?.levelLabel || this.shortLevelLabel(this.levelFromScore(score));

      return {
        learningAreaId: la.id,
        learningAreaName: la.name,
        studentId: topStudentRow?.studentId || 'std-top',
        studentName: topStudentRow?.studentName || 'Top Learner',
        admissionNumber: topStudentRow?.admissionNumber || 'ADM-001',
        className: classRoom?.name || 'Class',
        streamName: topStreamName,
        gender: topStudentRow?.gender || 'M',
        score,
        performanceLevel: level
      };
    });

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
      bestStudentsPerSubject
    };
  }

  public async getClassAnalytics(classId: string, termId?: string, academicYearId?: string): Promise<{
    classId: string;
    className: string;
    classRankings: ClassRankingItem[];
    bestClassesPerSubject: BestClassPerSubjectItem[];
    bestStudentsPerSubject: BestStudentPerSubjectItem[];
  }> {
    const classRoom = await this.academicRepository.findClassById(classId);
    let streams = await this.academicRepository.findStreamsByClass(classId);
    if (!streams || streams.length === 0) {
      const allStreams = await this.academicRepository.findAllStreams();
      streams = allStreams;
    }
    const firstStreamId = streams[0]?.id || classId;
    const broadsheet = await this.getStreamBroadsheet({
      streamId: firstStreamId,
      termId,
      academicYearId
    });
    return {
      classId: classRoom?.id || classId,
      className: classRoom?.name || broadsheet.className,
      classRankings: broadsheet.classRankings,
      bestClassesPerSubject: broadsheet.bestClassesPerSubject,
      bestStudentsPerSubject: broadsheet.bestStudentsPerSubject
    };
  }

  private async evaluateSingleStream(
    stream: any,
    classRoom: any,
    termId: string,
    academicYearId: string,
    learningAreas: Array<{ id: string; name: string }>
  ): Promise<{
    streamId: string;
    streamName: string;
    className: string;
    rows: BroadsheetRow[];
    subjectSummaries: BroadsheetSubjectSummary[];
    streamMeanScore: number;
    streamMeanPoints: number;
    totalStudents: number;
  }> {
    let students = await this.studentRepository.findAll({ streamId: stream.id });
    if (!students || students.length === 0) {
      students = await this.studentRepository.findAll({ classroomId: classRoom?.id, streamId: stream.id });
    }
    if ((!students || students.length === 0) && classRoom?.id) {
      students = await this.studentRepository.findAll({ classroomId: classRoom.id });
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
          score = rcScore.rawScore || rcScore.score || this.scoreFromLevel(level);
          hasEvaluation = true;
        } else if (s) {
          level = s.overallPerformanceLevel;
          const rawSum = s.strandScores?.reduce((acc: number, cur: any) => acc + (cur.rawScore || 0), 0) || 0;
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

      const averageScore = evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 0;
      const meanPoints = evaluatedCount > 0 ? Number((totalPoints / evaluatedCount).toFixed(2)) : 0;
      const overallLevel = evaluatedCount > 0 ? this.levelFromScore(averageScore) : PerformanceLevel.BELOW_EXPECTATIONS;
      const remarks = this.generateRemark(overallLevel, averageScore);

      rows.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.fullName,
        gender: String(student.gender || 'M'),
        streamId: stream.id,
        streamName: stream.name,
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

    rows.sort((a, b) => b.totalScore - a.totalScore || b.averageScore - a.averageScore);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
      r.streamRank = idx + 1;
      r.classRank = idx + 1;
    });

    // Compute subject rank inside the stream
    learningAreas.forEach(la => {
      const sorted = [...rows].sort(
        (a, b) => (b.subjects[la.id]?.numericScore || 0) - (a.subjects[la.id]?.numericScore || 0)
      );
      sorted.forEach((row, idx) => {
        if (row.subjects[la.id]) {
          row.subjects[la.id].subjectRank = idx + 1;
        }
      });
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
      default: return 3;
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
      default: return 'ME';
    }
  }
}
