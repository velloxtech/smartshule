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
import { PerformanceLevel, SummativeAssessment } from '../../core/domain/cbc/CbcAssessment';
import { StudentStatus } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';
import { PaymentMethod, PaymentStatus, ExpenseStatus } from '../../core/domain/finance/Fee';
import { AttendanceStatus } from '../../core/domain/attendance/Attendance';

export interface DashboardFilterOptions {
  schoolId?: string;
  academicYearId?: string;
  termId?: string;
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
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  public async getSchoolDashboardSummary(
    schoolIdOrOptions?: string | DashboardFilterOptions,
    academicYearIdArg?: string,
    termIdArg?: string
  ) {
    let schoolId: string | undefined;
    let academicYearId: string | undefined;
    let termId: string | undefined;

    if (typeof schoolIdOrOptions === 'object' && schoolIdOrOptions !== null) {
      schoolId = schoolIdOrOptions.schoolId;
      academicYearId = schoolIdOrOptions.academicYearId;
      termId = schoolIdOrOptions.termId;
    } else {
      schoolId = schoolIdOrOptions;
      academicYearId = academicYearIdArg;
      termId = termIdArg;
    }

    // 1. Available Periods & Selected Period
    const allYears = await this.academicRepository.findAllYears(schoolId);
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
    const students = await this.studentRepository.findAll({ schoolId });
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

    const allTeachers = await this.teacherRepository.findAll();
    const teachers = allTeachers;
    const activeTeachers = teachers.filter(t => (t as any).employmentStatus !== 'INACTIVE');

    let totalNonTeachingStaff = 0;
    if (this.userRepository) {
      const allUsers = await this.userRepository.findAll();
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
    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const payments = await this.feeRepository.findPayments({ schoolId });
    const expenses = await this.feeRepository.findExpenses({ schoolId });

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

    // 4. Real Attendance Register Metrics
    const todayIso = new Date().toISOString().split('T')[0];
    let registers = await this.attendanceRepository.findRegisters({
      schoolId,
      startDate: todayIso,
      endDate: todayIso
    });

    // If today hasn't been marked yet, check recent registers for active term
    let isTodayData = true;
    if (registers.length === 0 && selectedTerm) {
      registers = await this.attendanceRepository.findRegisters({
        schoolId,
        termId: selectedTerm.id
      });
      isTodayData = false;
    }

    let attendanceSummary = {
      hasData: false,
      isToday: isTodayData,
      date: todayIso,
      totalMarked: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      presentPercentage: null as number | null
    };

    if (registers.length > 0) {
      let totalEntries = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      registers.forEach(reg => {
        (reg.entries || []).forEach(entry => {
          totalEntries += 1;
          if (entry.status === AttendanceStatus.PRESENT) {
            presentCount += 1;
          } else if (entry.status === AttendanceStatus.LATE) {
            presentCount += 1;
            lateCount += 1;
          } else if (entry.status === AttendanceStatus.ABSENT) {
            absentCount += 1;
          } else if (entry.status === AttendanceStatus.EXCUSED || entry.status === AttendanceStatus.SICK) {
            excusedCount += 1;
          }
        });
      });

      if (totalEntries > 0) {
        attendanceSummary = {
          hasData: true,
          isToday: isTodayData,
          date: registers[0].date || todayIso,
          totalMarked: totalEntries,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
          presentPercentage: Math.round((presentCount / totalEntries) * 100)
        };
      }
    }

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
      const [summatives, formatives] = await Promise.all([
        this.CBCRepository.findSummatives({
          termId: selectedTerm.id,
          academicYearId: selectedYear.id
        }),
        this.CBCRepository.findFormatives({
          termId: selectedTerm.id,
          academicYearId: selectedYear.id
        })
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
      const learningAreas = await this.academicRepository.findAllLearningAreas({ schoolId });
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

      let reportCardsCount = 0;
      try {
        const reportCards = await this.CBCRepository.findReportCardsByTerm(selectedTerm.id);
        reportCardsCount = reportCards.length;
      } catch {
        // Safe fallback
      }

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

    // 6. Real Enrolment & Class Breakdown
    const classes = await this.academicRepository.findAllClasses(schoolId);
    const classDistribution = classes.map(c => {
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
}
