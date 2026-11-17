import { Complaint } from '../../domain/complaint/Complaint';

export interface ComplaintFilterCriteria {
  schoolId?: string;
  status?: string;
  category?: string;
  priority?: string;
  assignedToUserId?: string;
  complainantRole?: string;
  complainantStudentId?: string;
  studentId?: string;
  parentUserId?: string;
  studentGrade?: string;
  isOverdue?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ComplaintStats {
  total: number;
  open: number;
  inReview: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  // Extended concern metrics
  active?: number;
  acknowledged?: number;
  underReview?: number;
  awaitingParent?: number;
  escalated?: number;
  closed?: number;
  reopened?: number;
  overdueCount?: number;
  avgResponseTimeHours?: number;
  avgResolutionTimeHours?: number;
  resolutionRate?: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus?: Record<string, number>;
  byGrade?: Record<string, number>;
  byAssignee?: Record<string, number>;
}

export interface IComplaintRepository {
  create(complaint: Complaint): Promise<Complaint>;
  findById(id: string): Promise<Complaint | null>;
  findByReferenceNumber?(referenceNumber: string): Promise<Complaint | null>;
  find(criteria?: ComplaintFilterCriteria): Promise<Complaint[]>;
  update(complaint: Complaint): Promise<Complaint>;
  delete(id: string): Promise<boolean>;
  getStats(schoolId?: string): Promise<ComplaintStats>;
}
