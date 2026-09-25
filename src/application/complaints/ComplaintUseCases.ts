import { Complaint } from '../../core/domain/complaint/Complaint';
import {
  IComplaintRepository,
  ComplaintFilterCriteria,
  ComplaintStats
} from '../../core/ports/repositories/IComplaintRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateComplaintDTO {
  schoolId?: string;
  title: string;
  description: string;
  category?: string;
  priority?: string;
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  complainantStudentId?: string;
  assignedToUserId?: string;
}

export interface UpdateComplaintDTO {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  complainantStudentId?: string;
  assignedToUserId?: string;
}

export class ComplaintUseCases {
  constructor(
    private readonly complaintRepo: IComplaintRepository,
    private readonly userRepo?: IUserRepository
  ) {}

  async createComplaint(data: CreateComplaintDTO, creatorUserId?: string): Promise<Complaint> {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Complaint title is required');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError('Complaint description is required');
    }

    if (data.assignedToUserId && this.userRepo) {
      const assignedUser = await this.userRepo.findById(data.assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', data.assignedToUserId);
      }
    }

    const complaint = Complaint.create(
      {
        schoolId: data.schoolId || 'school-001',
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        priority: data.priority,
        status: data.assignedToUserId ? 'IN_REVIEW' : 'OPEN',
        complainantName: data.complainantName?.trim(),
        complainantRole: data.complainantRole,
        complainantPhone: data.complainantPhone?.trim(),
        complainantEmail: data.complainantEmail?.trim().toLowerCase(),
        complainantStudentId: data.complainantStudentId?.trim(),
        assignedToUserId: data.assignedToUserId,
        createdByUserId: creatorUserId
      },
      IdGenerator.generate()
    );

    return await this.complaintRepo.create(complaint);
  }

  async getComplaintById(id: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findById(id);
    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }
    return complaint;
  }

  async listComplaints(criteria?: ComplaintFilterCriteria): Promise<Complaint[]> {
    return await this.complaintRepo.find(criteria);
  }

  async updateComplaint(id: string, data: UpdateComplaintDTO): Promise<Complaint> {
    const complaint = await this.getComplaintById(id);

    if (data.assignedToUserId && this.userRepo) {
      const assignedUser = await this.userRepo.findById(data.assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', data.assignedToUserId);
      }
    }

    complaint.updateDetails(data);
    return await this.complaintRepo.update(complaint);
  }

  async updateStatus(id: string, status: string, notes?: string): Promise<Complaint> {
    const validStatuses = ['OPEN', 'IN_REVIEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
    const normalizedStatus = status.toUpperCase();
    if (!validStatuses.includes(normalizedStatus)) {
      throw new ValidationError(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const complaint = await this.getComplaintById(id);
    complaint.updateStatus(normalizedStatus, notes);
    return await this.complaintRepo.update(complaint);
  }

  async assignComplaint(id: string, assignedToUserId: string): Promise<Complaint> {
    if (!assignedToUserId) {
      throw new ValidationError('assignedToUserId is required');
    }

    if (this.userRepo) {
      const assignedUser = await this.userRepo.findById(assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', assignedToUserId);
      }
    }

    const complaint = await this.getComplaintById(id);
    complaint.assignTo(assignedToUserId);
    return await this.complaintRepo.update(complaint);
  }

  async resolveComplaint(
    id: string,
    resolutionNotes: string,
    resolvedByUserId: string
  ): Promise<Complaint> {
    if (!resolutionNotes || resolutionNotes.trim().length === 0) {
      throw new ValidationError('Resolution notes are required to resolve a complaint');
    }

    const complaint = await this.getComplaintById(id);
    complaint.resolve(resolutionNotes.trim(), resolvedByUserId);
    return await this.complaintRepo.update(complaint);
  }

  async dismissComplaint(
    id: string,
    reason: string,
    dismissedByUserId: string
  ): Promise<Complaint> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Dismissal reason is required to dismiss a complaint');
    }

    const complaint = await this.getComplaintById(id);
    complaint.dismiss(reason.trim(), dismissedByUserId);
    return await this.complaintRepo.update(complaint);
  }

  async deleteComplaint(id: string): Promise<boolean> {
    await this.getComplaintById(id);
    return await this.complaintRepo.delete(id);
  }

  async getStats(schoolId?: string): Promise<ComplaintStats> {
    return await this.complaintRepo.getStats(schoolId);
  }
}
