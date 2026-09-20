import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ICbcAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { PerformanceLevel } from '../../core/domain/cbc/CbcAssessment';
import { StudentStatus } from '../../core/domain/user/Student';
import { UserRole } from '../../core/domain/user/User';

export class AnalyticsUseCases {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly academicRepository: IAcademicRepository,
    private readonly cbcRepository: ICbcAssessmentRepository,
    private readonly attendanceRepository: IAttendanceRepository,
    private readonly feeRepository: IFeeRepository,
    private readonly userRepository?: IUserRepository
  ) {}

  public async getSchoolDashboardSummary(schoolId?: string) {
    const students = await this.studentRepository.findAll({ schoolId });
    const teachers = await this.teacherRepository.findAll();
    const currentYear = await this.academicRepository.findCurrentYear(schoolId);
    const currentTerm = currentYear ? await this.academicRepository.findCurrentTerm(currentYear.id) : null;

    const activeStudents = students.filter(s => s.status === StudentStatus.ACTIVE);

    // Non-teaching staff count (bursars, accountants, admissions, school admins/directors, head teachers)
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

    // Finance totals
    const invoices = await this.feeRepository.findInvoices({ schoolId });
    const payments = await this.feeRepository.findPayments({ schoolId });

    const totalInvoiced = invoices.reduce((sum, i) => sum + i.amountPayable, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalArrears = invoices.reduce((sum, i) => sum + i.balance, 0);

    // CBC Assessment Stats
    let cbcProficiencySummary = {
      exceeding: 0,
      meeting: 0,
      approaching: 0,
      below: 0,
      totalAssessments: 0
    };

    if (currentTerm && currentYear) {
      const summatives = await this.cbcRepository.findSummatives({
        termId: currentTerm.id,
        academicYearId: currentYear.id
      });

      cbcProficiencySummary = {
        exceeding: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.EXCEEDING_EXPECTATIONS).length,
        meeting: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.MEETING_EXPECTATIONS).length,
        approaching: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.APPROACHING_EXPECTATIONS).length,
        below: summatives.filter(s => s.overallPerformanceLevel === PerformanceLevel.BELOW_EXPECTATIONS).length,
        totalAssessments: summatives.length
      };
    }

    return {
      academicPeriod: {
        year: currentYear ? currentYear.name : 'N/A',
        term: currentTerm ? currentTerm.name : 'N/A'
      },
      counts: {
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        totalTeachers: teachers.length,
        totalNonTeachingStaff
      },
      finance: {
        totalInvoiced,
        totalCollected,
        totalArrears,
        collectionRatePercentage: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0
      },
      cbcProficiency: cbcProficiencySummary
    };
  }
}
