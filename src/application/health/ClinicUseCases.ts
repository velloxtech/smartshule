import { IClinicRepository } from '../../core/ports/repositories/IClinicRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import { StudentMedicalProfile, ClinicVisit, StudentMedicalProfileProps, ClinicVisitProps } from '../../core/domain/health/ClinicVisit';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface LogClinicVisitDTO {
  schoolId: string;
  studentId: string;
  visitDate?: string;
  visitTime?: string;
  symptoms: string[];
  temperatureCelsius?: number;
  treatmentAdministered: string;
  medicationDispensed?: string;
  nurseRemarks?: string;
  status?: 'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL';
  referredHospitalName?: string;
  notifyParent?: boolean;
}

export class ClinicUseCases {
  constructor(
    private readonly clinicRepository: IClinicRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly notificationService: INotificationService
  ) {}

  public async getMedicalProfile(studentId: string): Promise<any> {
    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    let profile = await this.clinicRepository.findProfileByStudentId(studentId);
    if (!profile) {
      // Create blank default profile
      profile = StudentMedicalProfile.create(
        {
          studentId,
          studentName: student.fullName,
          bloodGroup: 'UNKNOWN',
          allergies: [],
          chronicConditions: [],
          emergencyContactName: undefined,
          emergencyContactPhone: undefined,
          immunizationUpToDate: true,
          notes: ''
        },
        IdGenerator.generate()
      );
      await this.clinicRepository.saveProfile(profile);
    }

    return {
      ...profile.toJSON(),
      studentName: student.fullName,
      admissionNumber: student.admissionNumber
    };
  }

  public async updateMedicalProfile(studentId: string, updates: Partial<StudentMedicalProfileProps>): Promise<any> {
    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    let profile = await this.clinicRepository.findProfileByStudentId(studentId);
    if (!profile) {
      profile = StudentMedicalProfile.create(
        {
          studentId,
          studentName: student.fullName,
          bloodGroup: updates.bloodGroup || 'UNKNOWN',
          allergies: updates.allergies || [],
          chronicConditions: updates.chronicConditions || [],
          emergencyContactName: updates.emergencyContactName,
          emergencyContactPhone: updates.emergencyContactPhone,
          insurancePolicyNumber: updates.insurancePolicyNumber,
          immunizationUpToDate: updates.immunizationUpToDate ?? true,
          notes: updates.notes
        },
        IdGenerator.generate()
      );
      await this.clinicRepository.saveProfile(profile);
    } else {
      profile.updateProfile(updates);
      await this.clinicRepository.updateProfile(profile);
    }

    return profile.toJSON();
  }

  public async logClinicVisit(dto: LogClinicVisitDTO): Promise<any> {
    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    const now = new Date();
    const visitDate = dto.visitDate || now.toISOString().split('T')[0];
    const visitTime = dto.visitTime || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let parentNotified = false;

    // Send emergency alert to parent if notified or referred to hospital
    if (dto.notifyParent || dto.status === 'REFERRED_TO_HOSPITAL') {
      try {
        const guardians = await this.guardianRepository.findByStudentId(dto.studentId);
        const primaryGuardian = guardians[0];
        const phone = primaryGuardian?.emergencyContact;
        if (phone) {
          const alertMessage = dto.status === 'REFERRED_TO_HOSPITAL'
            ? `Dear Parent, your child ${student.fullName} was attended to at the school clinic and has been referred to ${dto.referredHospitalName || 'the hospital'}. Please contact the school infirmary immediately.`
            : `Dear Parent, ${student.fullName} visited the school clinic today at ${visitTime} with: ${dto.symptoms.join(', ')}. Treatment administered: ${dto.treatmentAdministered}. Status: ${dto.status || 'RESOLVED'}.`;
          
          await this.notificationService.sendSms(phone, alertMessage);
          parentNotified = true;
        }
      } catch (err) {
        // Log notification error but continue saving visit
      }
    }

    const visit = ClinicVisit.create(
      {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        studentName: student.fullName,
        gradeLevel: String(student.gradeLevel),
        visitDate,
        visitTime,
        symptoms: dto.symptoms || [],
        temperatureCelsius: dto.temperatureCelsius,
        treatmentAdministered: dto.treatmentAdministered,
        medicationDispensed: dto.medicationDispensed,
        nurseRemarks: dto.nurseRemarks || 'Attended by school health officer.',
        parentNotified,
        status: dto.status || 'RESOLVED',
        referredHospitalName: dto.referredHospitalName
      },
      IdGenerator.generate()
    );

    await this.clinicRepository.saveVisit(visit);
    return visit.toJSON();
  }

  public async listVisits(filters?: { studentId?: string; date?: string; schoolId?: string }): Promise<any[]> {
    const visits = await this.clinicRepository.findVisits(filters);
    return visits.map(v => v.toJSON());
  }

  public async getVisitById(id: string): Promise<any> {
    const visit = await this.clinicRepository.findVisitById(id);
    if (!visit) throw new NotFoundError('Clinic visit record not found.');
    return visit.toJSON();
  }

  public async updateVisitStatus(
    id: string,
    status: 'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL',
    referredHospitalName?: string
  ): Promise<any> {
    const visit = await this.clinicRepository.findVisitById(id);
    if (!visit) throw new NotFoundError('Clinic visit record not found.');

    if (status === 'RESOLVED') {
      visit.resolve();
    } else if (status === 'REFERRED_TO_HOSPITAL') {
      visit.referHospital(referredHospitalName || 'General District Hospital');
    } else {
      (visit.props as any).status = status;
    }

    await this.clinicRepository.updateVisit(visit);
    return visit.toJSON();
  }

  public async getClinicStats(schoolId?: string) {
    const today = new Date().toISOString().split('T')[0];
    const allVisits = await this.clinicRepository.findVisits({ schoolId });
    const todayVisits = allVisits.filter(v => v.visitDate === today);

    const underObservation = allVisits.filter(v => v.status === 'UNDER_OBSERVATION').length;
    const referredHospital = allVisits.filter(v => v.status === 'REFERRED_TO_HOSPITAL').length;
    const resolvedToday = todayVisits.filter(v => v.status === 'RESOLVED').length;

    return {
      todayDate: today,
      todayVisitsCount: todayVisits.length,
      underObservation,
      referredHospital,
      resolvedToday,
      totalVisitsHistory: allVisits.length
    };
  }
}
