import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ICBCAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ISignatureRepository } from '../../core/ports/repositories/ISignatureRepository';
import { ITeacherCorrectionRequestRepository } from '../../core/ports/repositories/ITeacherCorrectionRequestRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { ICurriculumTrackerRepository } from '../../core/ports/repositories/ICurriculumTrackerRepository';
import { IOccurrenceRepository } from '../../core/ports/repositories/IOccurrenceRepository';
import { PerformanceLevel, SummativeAssessment } from '../../core/domain/cbc/CbcAssessment';
import { StudentStatus, StudentGender } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';
import { PaymentMethod, PaymentStatus, ExpenseStatus } from '../../core/domain/finance/Fee';
import { AttendanceStatus } from '../../core/domain/attendance/Attendance';
import { UserContext } from '../students/StudentUseCases';

export interface DashboardFilterOptions {
  schoolId?: string;
  academicYearId?: string;
  termId?: string;
  date?: string;
  gradeLevel?: string;
  classRoomId?: string;
  streamId?: string;
  teacherId?: string;
}

export class AnalyticsUseCases {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly academicRepository: IAcademicRepository,
    private readonly CBCRepository: ICBCAssessmentRepository,
    private readonly attendanceRepository: IAttendanceRepository,
    private readonly feeRepository: IFeeRepository,
    private readonly userRepository?: IUserRepository,
    private readonly signatureRepository?: ISignatureRepository,
    private readonly teacherCorrectionRequestRepository?: ITeacherCorrectionRequestRepository,
    private readonly systemLogRepository?: ISystemLogRepository,
    private readonly curriculumTrackerRepository?: ICurriculumTrackerRepository,
    private readonly occurrenceRepository?: IOccurrenceRepository
  ) {}

  private dashboardCache = new Map<string, { timestamp: number; data: any }>();
  private inFlightDashboardRequests = new Map<string, Promise<any>>();

  public clearDashboardCache(): void {
    this.dashboardCache.clear();
  }

  public async getSchoolDashboardSummary(
    schoolIdOrOptions?: string | DashboardFilterOptions,
    academicYearIdArg?: string,
    termIdArg?: string
  ) {
    let schoolId: string | undefined;
    let academicYearId: string | undefined;
    let termId: string | undefined;
    let filterDate: string | undefined;
    let filterGrade: string | undefined;
    let filterClassId: string | undefined;
    let filterStreamId: string | undefined;
    let filterTeacherId: string | undefined;

    if (typeof schoolIdOrOptions === 'object' && schoolIdOrOptions !== null) {
      schoolId = schoolIdOrOptions.schoolId;
      academicYearId = schoolIdOrOptions.academicYearId;
      termId = schoolIdOrOptions.termId;
      filterDate = schoolIdOrOptions.date;
      filterGrade = schoolIdOrOptions.gradeLevel;
      filterClassId = schoolIdOrOptions.classRoomId;
      filterStreamId = schoolIdOrOptions.streamId;
      filterTeacherId = schoolIdOrOptions.teacherId;
    } else {
      schoolId = schoolIdOrOptions;
      academicYearId = academicYearIdArg;
      termId = termIdArg;
    }

    const cacheKey = JSON.stringify({
      schoolId: schoolId || 'school-001',
      academicYearId: academicYearId || '',
      termId: termId || '',
      filterDate: filterDate || '',
      filterGrade: filterGrade || '',
      filterClassId: filterClassId || '',
      filterStreamId: filterStreamId || '',
      filterTeacherId: filterTeacherId || ''
    });

    // 1. Return cached summary if fresh (15 second TTL)
    const cached = this.dashboardCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 15000) {
      return cached.data;
    }

    // 2. Coalesce duplicate concurrent in-flight requests to eliminate connection pool stampedes
    const inFlight = this.inFlightDashboardRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const task = this.computeSchoolDashboardSummary(
      schoolId,
      academicYearId,
      termId,
      filterDate,
      filterGrade,
      filterClassId,
      filterStreamId,
      filterTeacherId
    )
      .then(result => {
        this.dashboardCache.set(cacheKey, { timestamp: Date.now(), data: result });
        this.inFlightDashboardRequests.delete(cacheKey);
        return result;
      })
      .catch(err => {
        this.inFlightDashboardRequests.delete(cacheKey);
        throw err;
      });

    this.inFlightDashboardRequests.set(cacheKey, task);
    return task;
  }

  private async computeSchoolDashboardSummary(
    schoolId: string | undefined,
    academicYearId: string | undefined,
    termId: string | undefined,
    filterDate: string | undefined,
    filterGrade: string | undefined,
    filterClassId: string | undefined,
    filterStreamId: string | undefined,
    filterTeacherId: string | undefined
  ) {

    // 1. Foundational data retrieval executed in parallel for maximum dashboard throughput
    const todayIso = new Date().toISOString().split('T')[0];
    const targetDate = filterDate || todayIso;

    const [
      allYears,
      students,
      allTeachers,
      allUsers,
      invoices,
      payments,
      expenses,
      allClasses,
      allStreams,
      registers
    ] = await Promise.all([
      this.academicRepository.findAllYears(schoolId),
      this.studentRepository.findAll({ schoolId }),
      this.teacherRepository.findAll(),
      this.userRepository ? this.userRepository.findAll().catch(() => []) : Promise.resolve([]),
      this.feeRepository.findInvoices({ schoolId }),
      this.feeRepository.findPayments({ schoolId }),
      this.feeRepository.findExpenses({ schoolId }),
      this.academicRepository.findAllClasses(schoolId),
      this.academicRepository.findAllStreams(),
      this.attendanceRepository.findRegisters({
        schoolId,
        date: targetDate,
        classRoomId: filterClassId,
        streamId: filterStreamId
      })
    ]);

    // Available Periods & Selected Period
    let selectedYear = academicYearId
      ? allYears.find(y => y.id === academicYearId) || (await this.academicRepository.findYearById(academicYearId))
      : await this.academicRepository.findCurrentYear(schoolId);

    if (!selectedYear && allYears.length > 0) {
      selectedYear = allYears.find(y => y.isCurrent) || allYears[0];
    }

    const availableTerms = selectedYear ? await this.academicRepository.findTermsByYear(selectedYear.id) : [];
    let selectedTerm = termId
      ? availableTerms.find(t => t.id === termId) || (await this.academicRepository.findTermById(termId))
      : selectedYear
      ? await this.academicRepository.findCurrentTerm(selectedYear.id)
      : null;

    if (!selectedTerm && availableTerms.length > 0) {
      selectedTerm = availableTerms.find(t => t.isCurrent) || availableTerms[0];
    }

    // 2. Pupils & Staff Demographics
    const activeStudents = students.filter(s => s.status === StudentStatus.ACTIVE);
    const inactiveStudents = students.length - activeStudents.length;

    const boysCount = students.filter(s => {
      const g = (s.gender || '').toLowerCase();
      return g === 'boy' || g === 'male';
    }).length;

    const girlsCount = students.filter(s => {
      const g = (s.gender || '').toLowerCase();
      return g === 'girl' || g === 'female';
    }).length;

    const teachers = allTeachers;
    const activeTeachers = teachers.filter(t => (t as any).employmentStatus !== 'INACTIVE');

    let totalNonTeachingStaff = 0;
    if (this.userRepository) {
      totalNonTeachingStaff = allUsers.filter(u => {
        if (schoolId && u.schoolId && u.schoolId !== schoolId) {
          return false;
        }
        return (
          u.role !== UserRole.TEACHER &&
          u.role !== UserRole.STUDENT &&
          u.role !== UserRole.PARENT &&
          u.role !== UserRole.GUARDIAN
        );
      }).length;
    }

    // 3. Finance Ledger Calculations
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.amountPayable) || 0), 0);
    const totalArrears = invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);
    const defaultersCount = invoices.filter(i => (Number(i.balance) || 0) > 0).length;

    // Verified payments (completed collections)
    const verifiedPayments = payments.filter(
      p => p.status === PaymentStatus.COMPLETED || (!p.status && (p.amount || 0) > 0)
    );
    const totalCollected = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Payment channel breakdown
    let mpesaCollections = 0;
    let bankCollections = 0;
    let cashCollections = 0;
    let otherCollections = 0;

    verifiedPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.paymentMethod === PaymentMethod.MPESA) {
        mpesaCollections += amt;
      } else if (
        p.paymentMethod === PaymentMethod.BANK_TRANSFER ||
        p.paymentMethod === PaymentMethod.BANK_DEPOSIT ||
        p.paymentMethod === PaymentMethod.KCB_BUNI
      ) {
        bankCollections += amt;
      } else if (p.paymentMethod === PaymentMethod.CASH) {
        cashCollections += amt;
      } else {
        otherCollections += amt;
      }
    });

    // Unverified / Forwarded payments pending verification
    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING);
    const unverifiedPaymentsCount = pendingPayments.length;
    const unverifiedPaymentsAmount = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Expenditures (Outflows)
    const approvedExpenses = expenses.filter(
      e => e.status === ExpenseStatus.PAID || e.status === ExpenseStatus.APPROVED
    );
    const totalExpenses = approvedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const pendingExpensesCount = expenses.filter(e => e.status === ExpenseStatus.PENDING).length;
    const netOperatingCash = totalCollected - totalExpenses;

    const collectionRatePercentage =
      totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) : 0;

    // 4. Real Attendance Register Metrics & Daily Executive Figures
    const classNameMap = new Map<string, string>();
    const classGradeMap = new Map<string, string>();
    allClasses.forEach(c => {
      classNameMap.set(c.id, c.name);
      if (c.gradeLevel) classGradeMap.set(c.id, c.gradeLevel);
    });

    const streamNameMap = new Map<string, string>();
    allStreams.forEach(s => streamNameMap.set(s.id, s.name));

    // Determine expected register units (by stream if class has streams, else by class)
    interface RegisterUnit {
      classRoomId: string;
      streamId?: string;
      name: string;
      gradeLevel?: string;
    }
    const expectedRegisterUnits: RegisterUnit[] = [];
    allClasses.forEach(c => {
      const classStreams = allStreams.filter(s => s.classRoomId === c.id);
      if (classStreams.length > 0) {
        classStreams.forEach(st => {
          expectedRegisterUnits.push({
            classRoomId: c.id,
            streamId: st.id,
            name: `${c.name} - ${st.name}`,
            gradeLevel: c.gradeLevel
          });
        });
      } else {
        expectedRegisterUnits.push({
          classRoomId: c.id,
          name: c.name,
          gradeLevel: c.gradeLevel
        });
      }
    });

    // Apply filters to expected register units
    let scopedRegisterUnits = expectedRegisterUnits;
    if (filterClassId) {
      scopedRegisterUnits = scopedRegisterUnits.filter(u => u.classRoomId === filterClassId);
    }
    if (filterStreamId) {
      scopedRegisterUnits = scopedRegisterUnits.filter(u => u.streamId === filterStreamId);
    }
    if (filterGrade) {
      scopedRegisterUnits = scopedRegisterUnits.filter(u => u.gradeLevel === filterGrade);
    }

    // Filter active learners according to filters
    let scopedStudents = activeStudents;
    if (filterClassId) {
      scopedStudents = scopedStudents.filter(s => s.classroomId === filterClassId);
    }
    if (filterStreamId) {
      scopedStudents = scopedStudents.filter(s => s.streamId === filterStreamId);
    }
    if (filterGrade) {
      scopedStudents = scopedStudents.filter(s => s.gradeLevel === filterGrade);
    }
    const expectedLearners = scopedStudents.length;

    // Calculate completed vs unmarked registers (using pre-fetched registers)
    let completedRegisters = 0;
    const completedUnitKeys = new Set<string>();
    registers.forEach(reg => {
      const key = reg.streamId ? `${reg.classRoomId}-${reg.streamId}` : reg.classRoomId;
      completedUnitKeys.add(key);
    });
    scopedRegisterUnits.forEach(u => {
      const key = u.streamId ? `${u.classRoomId}-${u.streamId}` : u.classRoomId;
      if (completedUnitKeys.has(key)) {
        completedRegisters += 1;
      }
    });
    const unmarkedRegisters = Math.max(0, scopedRegisterUnits.length - completedRegisters);

    // Tally entries without double counting
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    const absentLearnersList: any[] = [];
    const studentMap = new Map(scopedStudents.map(s => [s.id, s]));
    const processedStudentIds = new Set<string>();

    registers.forEach(reg => {
      const entries = reg.entries || [];
      entries.forEach(entry => {
        if (!entry.studentId) return;

        // When specific classroom/stream filter is provided, keep to that classroom's active students
        if ((filterClassId || filterStreamId || filterGrade) && scopedStudents.length > 0 && !studentMap.has(entry.studentId)) {
          return;
        }

        if (processedStudentIds.has(entry.studentId)) {
          return; // Prevent duplicate counts if duplicate register exists
        }
        processedStudentIds.add(entry.studentId);

        const s = studentMap.get(entry.studentId);
        const studentName = s?.fullName || entry.studentName || 'Learner';
        const admissionNumber = s?.admissionNumber || entry.admissionNumber || '';

        if (entry.status === AttendanceStatus.PRESENT) {
          presentCount += 1;
        } else if (entry.status === AttendanceStatus.LATE) {
          lateCount += 1;
        } else if (entry.status === AttendanceStatus.ABSENT) {
          absentCount += 1;
          absentLearnersList.push({
            registerId: reg.id,
            studentId: entry.studentId,
            studentName,
            admissionNumber,
            className: classNameMap.get(reg.classRoomId) || 'Class',
            streamName: streamNameMap.get(reg.streamId) || '',
            date: reg.date,
            status: AttendanceStatus.ABSENT,
            remarks: entry.remarks || 'Unexcused Absence',
            followUp: (entry as any).followUp || null
          });
        } else if (entry.status === AttendanceStatus.EXCUSED || entry.status === AttendanceStatus.SICK) {
          excusedCount += 1;
          absentLearnersList.push({
            registerId: reg.id,
            studentId: entry.studentId,
            studentName,
            admissionNumber,
            className: classNameMap.get(reg.classRoomId) || 'Class',
            streamName: streamNameMap.get(reg.streamId) || '',
            date: reg.date,
            status: entry.status,
            remarks: entry.remarks || 'Excused / Medical Absence',
            followUp: (entry as any).followUp || null
          });
        }
      });
    });

    const totalMarked = processedStudentIds.size;
    const unmarkedLearners = Math.max(0, expectedLearners - totalMarked);
    const presentPercentage = registers.length === 0
      ? null
      : (totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0);

    const attendanceSummary = {
      hasData: registers.length > 0,
      isToday: targetDate === todayIso,
      date: targetDate,
      expectedLearners,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      excused: excusedCount,
      totalMarked,
      unmarkedLearners,
      completedRegisters,
      unmarkedRegisters,
      totalExpectedRegisters: scopedRegisterUnits.length,
      presentPercentage,
      absentLearnersList
    };

    // Helper for score percentage
    const getScorePercentage = (s: SummativeAssessment): number => {
      switch (s.overallPerformanceLevel) {
        case PerformanceLevel.EXCEEDING_EXPECTATIONS:
          return 90;
        case PerformanceLevel.MEETING_EXPECTATIONS:
          return 75;
        case PerformanceLevel.APPROACHING_EXPECTATIONS:
          return 55;
        case PerformanceLevel.BELOW_EXPECTATIONS:
        default:
          return 35;
      }
    };

    // 5. Genuine CBC Academic Assessments & Term Comparisons
    let CBCProficiencySummary = {
      exceeding: 0,
      meeting: 0,
      approaching: 0,
      below: 0,
      totalAssessments: 0,
      proficiencyRate: 0
    };

    let academicOverview = {
      formativeCount: 0,
      summativeCount: 0,
      reportCardsCount: 0,
      gradeAverages: [] as Array<{ gradeLevel: string; averagePercentage: number; totalAssessments: number }>,
      learningAreaPerformance: [] as Array<{
        learningAreaId: string;
        name: string;
        averagePercentage: number;
        totalAssessments: number;
      }>,
      termComparison: {
        comparisonAvailable: false,
        currentTermMean: null as number | null,
        previousTermName: undefined as string | undefined,
        previousTermMean: null as number | null,
        growthDelta: null as number | null
      },
      attentionAreas: [] as Array<{ name: string; type: 'GRADE' | 'LEARNING_AREA'; belowPercentage: number; reason: string }>
    };

    if (selectedTerm && selectedYear) {
      const [summatives, formatives, learningAreas, reportCards] = await Promise.all([
        this.CBCRepository.findSummatives({
          termId: selectedTerm.id,
          academicYearId: selectedYear.id
        }),
        this.CBCRepository.findFormatives({
          termId: selectedTerm.id,
          academicYearId: selectedYear.id
        }),
        this.academicRepository.findAllLearningAreas({ schoolId }),
        this.CBCRepository.findReportCardsByTerm(selectedTerm.id).catch(() => [])
      ]);

      const eeCount = summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS).length;
      const meCount = summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS).length;
      const aeCount = summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS).length;
      const beCount = summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS).length;
      const totalAssessments = summatives.length;

      CBCProficiencySummary = {
        exceeding: eeCount,
        meeting: meCount,
        approaching: aeCount,
        below: beCount,
        totalAssessments,
        proficiencyRate: totalAssessments > 0 ? Math.round(((eeCount + meCount) / totalAssessments) * 100) : 0
      };

      // Learning area breakdown
      const areaMap = new Map<string, string>();
      learningAreas.forEach(a => areaMap.set(a.id, a.name));

      const areaScoresMap = new Map<string, { totalScore: number; count: number; belowCount: number }>();
      summatives.forEach(s => {
        const areaId = s.learningAreaId || 'UNKNOWN';
        const existing = areaScoresMap.get(areaId) || { totalScore: 0, count: 0, belowCount: 0 };
        const scorePct = getScorePercentage(s);
        existing.totalScore += scorePct;
        existing.count += 1;
        if (s.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS) {
          existing.belowCount += 1;
        }
        areaScoresMap.set(areaId, existing);
      });

      const learningAreaPerformance = Array.from(areaScoresMap.entries()).map(([id, d]) => ({
        learningAreaId: id,
        name: areaMap.get(id) || id,
        averagePercentage: d.count > 0 ? Math.round(d.totalScore / d.count) : 0,
        totalAssessments: d.count
      }));

      // Identify attention areas (where below expectations > 30% or average < 50%)
      const attentionAreas: Array<{
        name: string;
        type: 'GRADE' | 'LEARNING_AREA';
        belowPercentage: number;
        reason: string;
      }> = [];

      areaScoresMap.forEach((d, id) => {
        const belowPct = d.count > 0 ? Math.round((d.belowCount / d.count) * 100) : 0;
        const avg = d.count > 0 ? Math.round(d.totalScore / d.count) : 0;
        if (belowPct >= 30 || avg < 50) {
          attentionAreas.push({
            name: areaMap.get(id) || id,
            type: 'LEARNING_AREA',
            belowPercentage: belowPct,
            reason: `${belowPct}% of learners below expectations (Mean: ${avg}%)`
          });
        }
      });

      // Genuine Term-to-Term Comparison (ONLY when previous term has real assessments)
      let termComparison = {
        comparisonAvailable: false,
        currentTermMean: totalAssessments > 0
          ? Math.round(summatives.reduce((sum, s) => sum + getScorePercentage(s), 0) / totalAssessments)
          : null,
        previousTermName: undefined as string | undefined,
        previousTermMean: null as number | null,
        growthDelta: null as number | null
      };

      // Look for a preceding term in the same academic year
      const sortedTerms = [...availableTerms].sort((a, b) => (a.termNumber || 0) - (b.termNumber || 0));
      const currentIdx = sortedTerms.findIndex(t => t.id === selectedTerm!.id);
      if (currentIdx > 0) {
        const prevTerm = sortedTerms[currentIdx - 1];
        const prevSummatives = await this.CBCRepository.findSummatives({
          termId: prevTerm.id,
          academicYearId: selectedYear.id
        });

        if (prevSummatives.length > 0 && totalAssessments > 0) {
          const prevMean = Math.round(
            prevSummatives.reduce((sum, s) => sum + getScorePercentage(s), 0) / prevSummatives.length
          );
          const currMean = termComparison.currentTermMean!;
          const delta = currMean - prevMean;

          termComparison = {
            comparisonAvailable: true,
            currentTermMean: currMean,
            previousTermName: prevTerm.name,
            previousTermMean: prevMean,
            growthDelta: delta
          };
        } else {
          termComparison.previousTermName = prevTerm.name;
        }
      }

      const reportCardsCount = Array.isArray(reportCards) ? reportCards.length : 0;

      academicOverview = {
        formativeCount: formatives.length,
        summativeCount: summatives.length,
        reportCardsCount,
        gradeAverages: [],
        learningAreaPerformance,
        termComparison,
        attentionAreas
      };
    }

    // 6. Real Enrolment & Class Breakdown (using pre-fetched allClasses)
    const classDistribution = allClasses.map(c => {
      const enrolled = students.filter(
        s => s.classroomId === c.id || (s.gradeLevel && s.gradeLevel === c.gradeLevel)
      );
      const boys = enrolled.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return g === 'boy' || g === 'male';
      }).length;
      const girls = enrolled.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return g === 'girl' || g === 'female';
      }).length;

      return {
        id: c.id,
        name: c.name,
        streamCount: 1,
        boys,
        girls,
        total: enrolled.length,
        teacherName: undefined
      };
    });

    // 7. Pending Approvals & Operational Queue for Director
    let pendingSignaturesCount = 0;
    if (this.signatureRepository && typeof this.signatureRepository.listAllBatches === 'function') {
      try {
        const batches = await this.signatureRepository.listAllBatches();
        pendingSignaturesCount = batches.filter(
          b => b.status === 'PREPARED' || b.status === 'CHALLENGED' || b.status === 'PROCESSING'
        ).length;
      } catch {
        pendingSignaturesCount = 0;
      }
    }

    let pendingCorrectionRequestsCount = 0;
    let pendingCorrectionRequests: Array<{
      id: string;
      teacherName: string;
      fieldName: string;
      requestedValue: string;
      submittedAt: string;
    }> = [];

    if (this.teacherCorrectionRequestRepository) {
      try {
        const requests = await this.teacherCorrectionRequestRepository.findBySchoolId(
          schoolId || 'school-001',
          'PENDING'
        );
        pendingCorrectionRequestsCount = requests.length;
        pendingCorrectionRequests = requests.slice(0, 5).map(r => ({
          id: r.id,
          teacherName: r.fieldLabel || 'Faculty Member',
          fieldName: r.fieldName,
          requestedValue: r.proposedValue,
          submittedAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
        }));
      } catch {
        pendingCorrectionRequestsCount = 0;
      }
    }

    const recentUnverifiedPayments = pendingPayments.slice(0, 5).map(p => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: students.find(s => s.id === p.studentId)?.fullName || 'Learner',
      amount: p.amount,
      reference: p.transactionReference,
      paymentDate: p.paymentDate
    }));

    const totalActionable =
      pendingSignaturesCount + pendingCorrectionRequestsCount + unverifiedPaymentsCount;

    // 8. Recent System Activity from Real Audit Log
    let recentActivities: Array<{
      id: string;
      timestamp: string;
      level: string;
      category: string;
      action: string;
      actorEmail?: string;
      actorRole?: string;
      status: string;
      details: string;
    }> = [];

    if (this.systemLogRepository) {
      try {
        const logs = await this.systemLogRepository.find({ schoolId, limit: 12 });
        recentActivities = logs.map(l => ({
          id: l.id,
          timestamp: l.timestamp ? l.timestamp.toISOString() : new Date().toISOString(),
          level: l.level,
          category: l.category,
          action: l.action,
          actorEmail: l.actorEmail,
          actorRole: l.actorRole,
          status: l.status,
          details: l.details
        }));
      } catch {
        recentActivities = [];
      }
    }

    return {
      academicPeriod: {
        year: selectedYear ? selectedYear.name : 'N/A',
        term: selectedTerm ? selectedTerm.name : 'N/A',
        academicYearId: selectedYear?.id,
        termId: selectedTerm?.id
      },
      counts: {
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        inactiveStudents,
        boysCount,
        girlsCount,
        totalTeachers: teachers.length,
        activeTeachers: activeTeachers.length,
        totalNonTeachingStaff
      },
      finance: {
        totalInvoiced,
        totalCollected,
        totalArrears,
        collectionRatePercentage,
        totalExpenses,
        netOperatingCash,
        pendingExpensesCount,
        defaultersCount,
        paymentMethods: {
          mpesa: mpesaCollections,
          bank: bankCollections,
          cash: cashCollections,
          other: otherCollections
        },
        unverifiedPaymentsCount,
        unverifiedPaymentsAmount
      },
      CBCProficiency: CBCProficiencySummary,
      academicOverview,
      attendanceSummary,
      enrolmentOverview: {
        totalEnrolled: students.length,
        activeCount: activeStudents.length,
        inactiveCount: inactiveStudents,
        boysCount,
        girlsCount,
        classes: classDistribution
      },
      pendingApprovals: {
        totalActionable,
        pendingSignaturesCount,
        pendingCorrectionRequestsCount,
        unverifiedPaymentsCount,
        correctionRequests: pendingCorrectionRequests,
        unverifiedPayments: recentUnverifiedPayments
      },
      recentActivities,
      availablePeriods: {
        years: allYears.map(y => ({ id: y.id, name: y.name, isCurrent: !!y.isCurrent })),
        terms: availableTerms.map(t => ({
          id: t.id,
          name: t.name,
          isCurrent: !!t.isCurrent,
          academicYearId: t.academicYearId
        }))
      }
    };
  }

  public async getAttendanceTrends(
    options: {
      schoolId?: string;
      academicYearId?: string;
      termId?: string;
      days?: number;
    },
    requestingUser?: UserContext
  ) {
    const days = options.days || 14;
    const now = new Date();
    const dateLimit = new Date();
    dateLimit.setDate(now.getDate() - days);
    const startDateStr = dateLimit.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    const registers = await this.attendanceRepository.findRegisters({
      schoolId: options.schoolId,
      academicYearId: options.academicYearId,
      termId: options.termId,
      startDate: startDateStr,
      endDate: endDateStr
    });

    const students = await this.studentRepository.findAll({ schoolId: options.schoolId });
    const studentMap = new Map<string, any>();
    students.forEach(s => studentMap.set(s.id, s));

    const allClasses = await this.academicRepository.findAllClasses(options.schoolId);
    const classNameMap = new Map<string, string>();
    allClasses.forEach(c => classNameMap.set(c.id, c.name));

    const dailyMap = new Map<string, {
      date: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
      totalMarked: number;
      attendanceRate: number;
    }>();

    const studentAbsenceMap = new Map<string, {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      absenceCount: number;
      dates: string[];
      latestRemarks?: string;
      hasUnresolvedFollowUp: boolean;
      latestFollowUp?: any;
    }>();

    const unresolvedFollowUps: Array<{
      registerId: string;
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      date: string;
      remarks?: string;
      followUp?: any;
    }> = [];

    for (const reg of registers) {
      const d = reg.date;
      if (!dailyMap.has(d)) {
        dailyMap.set(d, {
          date: d,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalMarked: 0,
          attendanceRate: 0
        });
      }
      const dayData = dailyMap.get(d)!;
      const clsName = classNameMap.get(reg.classRoomId) || 'Class';

      for (const entry of reg.entries) {
        dayData.totalMarked += 1;
        if (entry.status === AttendanceStatus.PRESENT) {
          dayData.present += 1;
        } else if (entry.status === AttendanceStatus.LATE) {
          dayData.late += 1;
        } else if (entry.status === AttendanceStatus.EXCUSED || entry.status === AttendanceStatus.SICK) {
          dayData.excused += 1;
        } else if (entry.status === AttendanceStatus.ABSENT) {
          dayData.absent += 1;

          const st = studentMap.get(entry.studentId);
          const stName = entry.studentName || st?.fullName || 'Student';
          const admNo = entry.admissionNumber || st?.admissionNumber || '';

          if (!studentAbsenceMap.has(entry.studentId)) {
            studentAbsenceMap.set(entry.studentId, {
              studentId: entry.studentId,
              studentName: stName,
              admissionNumber: admNo,
              className: clsName,
              absenceCount: 0,
              dates: [],
              latestRemarks: entry.remarks,
              hasUnresolvedFollowUp: false,
              latestFollowUp: entry.followUp
            });
          }
          const rec = studentAbsenceMap.get(entry.studentId)!;
          rec.absenceCount += 1;
          rec.dates.push(d);
          if (entry.remarks) rec.latestRemarks = entry.remarks;
          if (entry.followUp) rec.latestFollowUp = entry.followUp;

          const isUnresolved = !entry.followUp || entry.followUp.resolutionStatus === 'PENDING' || (entry.followUp.resolutionStatus as string) === 'ESCALATED' || entry.followUp.resolutionStatus === 'ESCALATED_TO_HEADTEACHER';
          if (isUnresolved) {
            rec.hasUnresolvedFollowUp = true;
            unresolvedFollowUps.push({
              registerId: reg.id,
              studentId: entry.studentId,
              studentName: stName,
              admissionNumber: admNo,
              className: clsName,
              date: d,
              remarks: entry.remarks,
              followUp: entry.followUp
            });
          }
        }
      }

      dayData.attendanceRate = dayData.totalMarked > 0
        ? Math.round(((dayData.present + dayData.late) / dayData.totalMarked) * 1000) / 10
        : 0;
    }

    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const chronicAbsentees = Array.from(studentAbsenceMap.values())
      .filter(s => s.absenceCount >= 3)
      .sort((a, b) => b.absenceCount - a.absenceCount);

    const totalMarkedSessions = registers.length;
    const avgRate = dailyTrends.length > 0
      ? Math.round(dailyTrends.reduce((sum, d) => sum + d.attendanceRate, 0) / dailyTrends.length * 10) / 10
      : 0;

    return {
      period: {
        days,
        startDate: startDateStr,
        endDate: endDateStr
      },
      summaryMetrics: {
        totalRegistersMarked: totalMarkedSessions,
        averageDailyAttendanceRate: avgRate,
        totalAbsenceIncidents: Array.from(studentAbsenceMap.values()).reduce((sum, s) => sum + s.absenceCount, 0),
        chronicAbsenteeCount: chronicAbsentees.length,
        unresolvedFollowUpsCount: unresolvedFollowUps.length
      },
      dailyTrends,
      chronicAbsentees,
      unresolvedFollowUps
    };
  }

  public async getWholeTermReport(
    options: {
      academicYearId: string;
      termId: string;
      schoolId?: string;
    },
    requestingUser?: UserContext
  ) {
    const schoolId = options.schoolId || 'school-001';

    // 1. Resolve Academic Year and Term metadata
    let yearName = '2026';
    let termName = 'Term 3';
    try {
      const year = await this.academicRepository.findYearById(options.academicYearId);
      if (year) yearName = year.name;
      const terms = await this.academicRepository.findTermsByYear(options.academicYearId);
      const term = terms.find(t => t.id === options.termId);
      if (term) termName = term.name;
    } catch {}

    // 2. Enrolment & Demographics
    const students = await this.studentRepository.findAll({ schoolId });
    const activeStudents = students.filter(s => s.status === StudentStatus.ACTIVE);
    const boysCount = activeStudents.filter(s => s.gender === StudentGender.MALE || (s.gender as any) === 'M').length;
    const girlsCount = activeStudents.filter(s => s.gender === StudentGender.FEMALE || (s.gender as any) === 'F').length;

    const allClasses = await this.academicRepository.findAllClasses(schoolId);
    const gradeEnrolment: Record<string, number> = {};
    activeStudents.forEach(s => {
      const g = s.gradeLevel || 'UNKNOWN';
      gradeEnrolment[g] = (gradeEnrolment[g] || 0) + 1;
    });

    // 3. Attendance Statistics for the term
    const registers = await this.attendanceRepository.findRegisters({
      schoolId,
      academicYearId: options.academicYearId,
      termId: options.termId
    });

    let totalAttendanceEntries = 0;
    let totalPresentEntries = 0;
    let totalAbsentEntries = 0;
    let totalLateEntries = 0;
    let totalExcusedEntries = 0;
    const studentAbsenceCounts = new Map<string, number>();

    registers.forEach(reg => {
      reg.entries.forEach(e => {
        totalAttendanceEntries += 1;
        if (e.status === AttendanceStatus.PRESENT) totalPresentEntries += 1;
        else if (e.status === AttendanceStatus.LATE) totalLateEntries += 1;
        else if (e.status === AttendanceStatus.EXCUSED || e.status === AttendanceStatus.SICK) totalExcusedEntries += 1;
        else if (e.status === AttendanceStatus.ABSENT) {
          totalAbsentEntries += 1;
          studentAbsenceCounts.set(e.studentId, (studentAbsenceCounts.get(e.studentId) || 0) + 1);
        }
      });
    });

    const averageAttendanceRate = totalAttendanceEntries > 0
      ? Math.round(((totalPresentEntries + totalLateEntries) / totalAttendanceEntries) * 1000) / 10
      : 0;

    let chronicAbsenteeCount = 0;
    studentAbsenceCounts.forEach(c => {
      if (c >= 3) chronicAbsenteeCount += 1;
    });

    // 4. CBC Academic Summative Proficiency
    const summatives = await this.CBCRepository.findSummatives({
      academicYearId: options.academicYearId,
      termId: options.termId
    });

    let eeCount = 0;
    let meCount = 0;
    let aeCount = 0;
    let beCount = 0;

    summatives.forEach(s => {
      const level = (s.overallPerformanceLevel || '').toUpperCase();
      if (level === PerformanceLevel.EXCEEDING_EXPECTATIONS || level.startsWith('E')) eeCount += 1;
      else if (level === PerformanceLevel.MEETING_EXPECTATIONS || level.startsWith('M')) meCount += 1;
      else if (level === PerformanceLevel.APPROACHING_EXPECTATIONS || level.startsWith('A')) aeCount += 1;
      else if (level === PerformanceLevel.BELOW_EXPECTATIONS || level.startsWith('B')) beCount += 1;
    });

    const totalEvaluations = summatives.length;
    const proficiencyBreakdown = {
      totalEvaluations,
      EE: { count: eeCount, percentage: totalEvaluations > 0 ? Math.round((eeCount / totalEvaluations) * 1000) / 10 : 0 },
      ME: { count: meCount, percentage: totalEvaluations > 0 ? Math.round((meCount / totalEvaluations) * 1000) / 10 : 0 },
      AE: { count: aeCount, percentage: totalEvaluations > 0 ? Math.round((aeCount / totalEvaluations) * 1000) / 10 : 0 },
      BE: { count: beCount, percentage: totalEvaluations > 0 ? Math.round((beCount / totalEvaluations) * 1000) / 10 : 0 }
    };

    // 5. Curriculum Tracker & Controlled Progression Stats
    let totalPlannedLessons = 0;
    let approvedLessons = 0;
    let submittedPendingLessons = 0;
    let trackersCount = 0;

    if (this.curriculumTrackerRepository) {
      try {
        const trackers = await this.curriculumTrackerRepository.findTrackers({
          schoolId,
          academicYear: yearName,
          term: termName
        });
        trackersCount = trackers.length;
        trackers.forEach((t: any) => {
          t.items?.forEach((item: any) => {
            const planned = item.plannedLessons || 1;
            totalPlannedLessons += planned;
            if (item.coverageStatus === 'APPROVED' || item.isCovered) {
              approvedLessons += planned;
            } else if (item.coverageStatus === 'SUBMITTED') {
              submittedPendingLessons += planned;
            }
          });
        });
      } catch {}
    }

    const approvedCoveragePercentage = totalPlannedLessons > 0
      ? Math.round((approvedLessons / totalPlannedLessons) * 1000) / 10
      : 0;

    // 6. Staffing Summary
    const teachers = await this.teacherRepository.findAll();
    const activeTeachers = teachers.filter(t => (t as any).employmentStatus !== 'SUSPENDED');
    let classTeacherAssignmentsCount = 0;
    let subjectTeacherAssignmentsCount = 0;
    try {
      const ctas = await this.academicRepository.findClassTeacherAssignments({ academicYearId: options.academicYearId, isActive: true });
      classTeacherAssignmentsCount = ctas.length;
      const stas = await this.academicRepository.findSubjectTeacherAssignments({ academicYearId: options.academicYearId, isActive: true });
      subjectTeacherAssignmentsCount = stas.length;
    } catch {}

    // 7. Verified Financial Position (Strictly based on invoices & payments, no fabricated figures)
    const invoices = await this.feeRepository.findInvoices({
      schoolId,
      academicYearId: options.academicYearId,
      termId: options.termId
    });
    const payments = await this.feeRepository.findPayments({ schoolId });
    const verifiedPayments = payments.filter(
      p => p.status === PaymentStatus.COMPLETED || (!p.status && (p.amount || 0) > 0)
    );

    const totalInvoiced = Math.round(invoices.reduce((sum, i) => sum + (Number(i.amountPayable) || 0), 0) * 100) / 100;
    const totalCollected = Math.round(verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100) / 100;
    const totalArrears = Math.round(invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0) * 100) / 100;
    const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 1000) / 10) : 0;
    const defaultersCount = invoices.filter(i => (Number(i.balance) || 0) > 0).length;

    // 8. Operational & Occurrence Incident Summary
    let totalOccurrences = 0;
    let resolvedOccurrences = 0;
    const occurrenceCategoryBreakdown: Record<string, number> = {};
    if (this.occurrenceRepository) {
      try {
        const occurrences = await this.occurrenceRepository.findOccurrences({ schoolId });
        totalOccurrences = occurrences.length;
        occurrences.forEach((o: any) => {
          if (o.status === 'RESOLVED' || o.status === 'CLOSED') resolvedOccurrences += 1;
          const cat = o.category || 'OTHER';
          occurrenceCategoryBreakdown[cat] = (occurrenceCategoryBreakdown[cat] || 0) + 1;
        });
      } catch {}
    }

    // 9. Automated, evidence-based recommendations
    const recommendations: string[] = [];
    if (averageAttendanceRate < 90) {
      recommendations.push(`Daily attendance rate stands at ${averageAttendanceRate}%. Establish immediate morning register verification and enforce parent notifications.`);
    } else {
      recommendations.push(`Strong daily attendance rate maintained at ${averageAttendanceRate}%. Continue consistent roll-call management.`);
    }

    if (chronicAbsenteeCount > 0) {
      recommendations.push(`Identified ${chronicAbsenteeCount} chronic absentee learner(s) requiring academic intervention and formal guardian consultation.`);
    }

    if (approvedCoveragePercentage < 80) {
      recommendations.push(`Approved CBC curriculum coverage is currently ${approvedCoveragePercentage}%. Teachers should accelerate lesson coverage and submit pending units for administrative approval.`);
    }

    if (collectionRate < 75) {
      recommendations.push(`Fee collection stands at ${collectionRate}%. Proactively issue fee reminder statements to clear outstanding arrears of KES ${totalArrears.toLocaleString()}.`);
    }

    return {
      institution: {
        name: 'Grace Seeds School',
        motto: 'Excellence in Christian Values and Academic Diligence',
        address: 'Nairobi, Kenya',
        academicYear: yearName,
        term: termName,
        reportDate: new Date().toISOString().split('T')[0],
        signatories: {
          headTeacher: 'Headteacher / Academic Director',
          executiveDirector: 'Executive Director'
        }
      },
      enrolment: {
        totalEnrolled: activeStudents.length,
        boys: boysCount,
        girls: girlsCount,
        gradeBreakdown: gradeEnrolment
      },
      attendance: {
        totalRegistersMarked: registers.length,
        averageAttendanceRate,
        totalAbsences: totalAbsentEntries,
        chronicAbsenteeCount
      },
      academics: {
        totalEvaluations,
        proficiencyBreakdown
      },
      curriculum: {
        activeTrackers: trackersCount,
        totalPlannedLessons,
        approvedLessons,
        submittedPendingLessons,
        approvedCoveragePercentage
      },
      staffing: {
        totalTeachers: teachers.length,
        activeTeachers: activeTeachers.length,
        classTeacherAssignments: classTeacherAssignmentsCount,
        subjectTeacherAssignments: subjectTeacherAssignmentsCount
      },
      finance: {
        totalInvoiced,
        totalCollected,
        totalArrears,
        collectionRate,
        defaultersCount,
        note: 'Finance metrics derived strictly from verified billing invoices and recorded receipts.'
      },
      operations: {
        totalIncidents: totalOccurrences,
        resolvedCount: resolvedOccurrences,
        pendingCount: totalOccurrences - resolvedOccurrences,
        categories: occurrenceCategoryBreakdown
      },
      recommendations
    };
  }
}
