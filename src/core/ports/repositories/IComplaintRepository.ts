import { Complaint } from '../../domain/complaint/Complaint';

export interface ComplaintFilterCriteria {
  schoolId?: string;
  status?: string;
  category?: string;
  priority?: string;
  assignedToUserId?: string;
  complainantRole?: string;
  complainantStudentId?: string;
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
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface IComplaintRepository {
  create(complaint: Complaint): Promise<Complaint>;
  findById(id: string): Promise<Complaint | null>;
  find(criteria?: ComplaintFilterCriteria): Promise<Complaint[]>;
  update(complaint: Complaint): Promise<Complaint>;
  delete(id: string): Promise<boolean>;
  getStats(schoolId?: string): Promise<ComplaintStats>;
}
