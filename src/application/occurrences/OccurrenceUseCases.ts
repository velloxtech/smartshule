import { IOccurrenceRepository, OccurrenceFilterCriteria } from '../../core/ports/repositories/IOccurrenceRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import {
  OccurrenceRecord,
  OccurrenceCategory,
  OccurrenceSeverity,
  OccurrenceStatus,
  OccurrenceRecordProps
} from '../../core/domain/occurrence/OccurrenceRecord';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateOccurrenceDTO {
  schoolId: string;
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  date?: string; // YYYY-MM-DD
  time?: string; // e.g. "10:30 AM"
  location: string;
  reportedByTeacherId: string;
  reportedByTeacherName: string;
  reportedByRole?: string;
  studentIds?: string[];
  studentNames?: string[];
  witnesses?: string;
  immediateActionTaken?: string;
  parentNotified?: boolean;
  parentNotificationMethod?: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' | 'NONE';
  notifyParentViaSms?: boolean;
}

export interface UpdateOccurrenceDTO {
  title?: string;
  description?: string;
  category?: OccurrenceCategory;
  severity?: OccurrenceSeverity;
  date?: string;
  time?: string;
  location?: string;
  studentIds?: string[];
  studentNames?: string[];
  witnesses?: string;
  immediateActionTaken?: string;
  parentNotified?: boolean;
  parentNotificationMethod?: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' | 'NONE';
}

export interface DailyOccurrenceSummary {
  date: string;
  totalIncidents: number;
  openCount: number;
  investigatingCount: number;
  resolvedCount: number;
  escalatedCount: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byCategory: Record<string, number>;
  incidents: any[];
}

function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export class OccurrenceUseCases {
  constructor(
    private readonly occurrenceRepository: IOccurrenceRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly notificationService: INotificationService
  ) {}

  public async createOccurrence(dto: CreateOccurrenceDTO): Promise<any> {
    if (!dto.title || !dto.title.trim()) {
      throw new ValidationError('Incident title is required.');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new ValidationError('Incident description is required.');
    }
    if (!dto.location || !dto.location.trim()) {
      throw new ValidationError('Incident location is required.');
    }
    if (!dto.category) {
      throw new ValidationError('Incident category is required.');
    }
    if (!dto.severity) {
      throw new ValidationError('Incident severity is required.');
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const incidentDate = dto.date && dto.date.trim() ? dto.date.trim() : todayDate;
    const incidentTime = dto.time && dto.time.trim() ? dto.time.trim() : formatCurrentTime();

    // Auto-generate occurrence number (e.g. OB-20261013-001)
    const existingCount = await this.occurrenceRepository.countBySchoolAndDate(dto.schoolId, incidentDate);
    const dateCode = incidentDate.replace(/-/g, '');
    const seq = String(existingCount + 1).padStart(3, '0');
    const occurrenceNumber = `OB-${dateCode}-${seq}`;

    // Resolve involved student names if IDs are provided
    let studentNames: string[] = dto.studentNames ? [...dto.studentNames] : [];
    const studentIds = dto.studentIds ? [...dto.studentIds] : [];

    if (studentIds.length > 0 && studentNames.length === 0) {
      try {
        const students = await this.studentRepository.findByIds(studentIds);
        studentNames = students.map(s => s.fullName);
      } catch {
        // Fall back to provided names or empty
      }
    }

    let parentNotified = dto.parentNotified ?? false;
    let parentNotificationMethod = dto.parentNotificationMethod || (parentNotified ? 'SMS' : 'NONE');

    // Notify parents via SMS if requested
    if (dto.notifyParentViaSms && studentIds.length > 0) {
      try {
        for (const sId of studentIds) {
          const guardians = await this.guardianRepository.findByStudentId(sId);
          const student = await this.studentRepository.findById(sId);
          const sName = student ? student.fullName : 'your child';
          const primaryPhone = guardians[0]?.emergencyContact;

          if (primaryPhone) {
            const smsText = `SmartShule Occurrence Notice: An incident (${dto.title}) involving ${sName} was recorded on ${incidentDate} at ${incidentTime}. Immediate action: ${dto.immediateActionTaken || 'Being addressed by duty staff'}.`;
            await this.notificationService.sendSms(primaryPhone, smsText);
            parentNotified = true;
            parentNotificationMethod = 'SMS';
          }
        }
      } catch {
        // Continue saving record even if notification gateway fails
      }
    }

    const record = OccurrenceRecord.create(
      {
        schoolId: dto.schoolId,
        occurrenceNumber,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category,
        severity: dto.severity,
        date: incidentDate,
        time: incidentTime,
        location: dto.location.trim(),
        reportedByTeacherId: dto.reportedByTeacherId,
        reportedByTeacherName: dto.reportedByTeacherName,
        reportedByRole: dto.reportedByRole || 'Teacher',
        studentIds,
        studentNames,
        witnesses: dto.witnesses?.trim(),
        immediateActionTaken: dto.immediateActionTaken?.trim(),
        status: 'OPEN',
        parentNotified,
        parentNotificationMethod
      },
      IdGenerator.generate()
    );

    await this.occurrenceRepository.save(record);
    return record.toJSON();
  }

  public async listOccurrences(filters: OccurrenceFilterCriteria): Promise<any[]> {
    const list = await this.occurrenceRepository.findOccurrences(filters);
    return list.map(item => item.toJSON());
  }

  public async getOccurrenceById(id: string): Promise<any> {
    const record = await this.occurrenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Occurrence record with ID '${id}' not found.`);
    }
    return record.toJSON();
  }

  public async updateOccurrenceStatus(
    id: string,
    status: OccurrenceStatus,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<any> {
    const record = await this.occurrenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Occurrence record with ID '${id}' not found.`);
    }

    record.updateStatus(status, resolutionNotes, resolvedBy);
    await this.occurrenceRepository.update(record);
    return record.toJSON();
  }

  public async updateOccurrence(id: string, dto: UpdateOccurrenceDTO): Promise<any> {
    const record = await this.occurrenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Occurrence record with ID '${id}' not found.`);
    }

    record.updateDetails({
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.description !== undefined && { description: dto.description.trim() }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.severity !== undefined && { severity: dto.severity }),
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.time !== undefined && { time: dto.time }),
      ...(dto.location !== undefined && { location: dto.location.trim() }),
      ...(dto.studentIds !== undefined && { studentIds: dto.studentIds }),
      ...(dto.studentNames !== undefined && { studentNames: dto.studentNames }),
      ...(dto.witnesses !== undefined && { witnesses: dto.witnesses?.trim() }),
      ...(dto.immediateActionTaken !== undefined && { immediateActionTaken: dto.immediateActionTaken?.trim() }),
      ...(dto.parentNotified !== undefined && { parentNotified: dto.parentNotified }),
      ...(dto.parentNotificationMethod !== undefined && { parentNotificationMethod: dto.parentNotificationMethod })
    });

    await this.occurrenceRepository.update(record);
    return record.toJSON();
  }

  public async deleteOccurrence(id: string): Promise<void> {
    const record = await this.occurrenceRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Occurrence record with ID '${id}' not found.`);
    }
    await this.occurrenceRepository.delete(id);
  }

  public async getDailyOccurrenceSummary(date: string, schoolId?: string): Promise<DailyOccurrenceSummary> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const incidents = await this.occurrenceRepository.findOccurrences({
      date: targetDate,
      schoolId
    });

    const openCount = incidents.filter(i => i.status === 'OPEN').length;
    const investigatingCount = incidents.filter(i => i.status === 'INVESTIGATING').length;
    const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;
    const escalatedCount = incidents.filter(i => i.status === 'ESCALATED').length;

    const bySeverity = {
      low: incidents.filter(i => i.severity === 'LOW').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length
    };

    const byCategory: Record<string, number> = {};
    for (const inc of incidents) {
      byCategory[inc.category] = (byCategory[inc.category] || 0) + 1;
    }

    return {
      date: targetDate,
      totalIncidents: incidents.length,
      openCount,
      investigatingCount,
      resolvedCount,
      escalatedCount,
      bySeverity,
      byCategory,
      incidents: incidents.map(i => i.toJSON())
    };
  }
}
