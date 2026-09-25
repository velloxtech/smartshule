import { Complaint } from '../../../core/domain/complaint/Complaint';
import {
  IComplaintRepository,
  ComplaintFilterCriteria,
  ComplaintStats
} from '../../../core/ports/repositories/IComplaintRepository';

export class InMemoryComplaintRepository implements IComplaintRepository {
  private complaints: Map<string, Complaint> = new Map();

  async create(complaint: Complaint): Promise<Complaint> {
    this.complaints.set(complaint.id, complaint);
    return complaint;
  }

  async findById(id: string): Promise<Complaint | null> {
    return this.complaints.get(id) || null;
  }

  async find(criteria?: ComplaintFilterCriteria): Promise<Complaint[]> {
    let result = Array.from(this.complaints.values());

    if (criteria) {
      if (criteria.schoolId) {
        result = result.filter((c) => c.schoolId === criteria.schoolId);
      }
      if (criteria.status) {
        const targetStatus = criteria.status.toUpperCase();
        result = result.filter((c) => c.status.toUpperCase() === targetStatus);
      }
      if (criteria.category) {
        const targetCategory = criteria.category.toUpperCase();
        result = result.filter((c) => c.category.toUpperCase() === targetCategory);
      }
      if (criteria.priority) {
        const targetPriority = criteria.priority.toUpperCase();
        result = result.filter((c) => c.priority.toUpperCase() === targetPriority);
      }
      if (criteria.assignedToUserId) {
        result = result.filter((c) => c.assignedToUserId === criteria.assignedToUserId);
      }
      if (criteria.complainantRole) {
        const targetRole = criteria.complainantRole.toUpperCase();
        result = result.filter((c) => c.complainantRole?.toUpperCase() === targetRole);
      }
      if (criteria.complainantStudentId) {
        result = result.filter((c) => c.complainantStudentId === criteria.complainantStudentId);
      }
      if (criteria.search) {
        const q = criteria.search.toLowerCase().trim();
        result = result.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.complainantName && c.complainantName.toLowerCase().includes(q))
        );
      }
      if (criteria.startDate) {
        const start = new Date(criteria.startDate).getTime();
        result = result.filter((c) => c.createdAt.getTime() >= start);
      }
      if (criteria.endDate) {
        const end = new Date(criteria.endDate).getTime();
        result = result.filter((c) => c.createdAt.getTime() <= end);
      }
    }

    // Sort newest first
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (criteria?.offset !== undefined && criteria.offset > 0) {
      result = result.slice(criteria.offset);
    }
    if (criteria?.limit !== undefined && criteria.limit > 0) {
      result = result.slice(0, criteria.limit);
    }

    return result;
  }

  async update(complaint: Complaint): Promise<Complaint> {
    this.complaints.set(complaint.id, complaint);
    return complaint;
  }

  async delete(id: string): Promise<boolean> {
    return this.complaints.delete(id);
  }

  async getStats(schoolId?: string): Promise<ComplaintStats> {
    let items = Array.from(this.complaints.values());
    if (schoolId) {
      items = items.filter((c) => c.schoolId === schoolId);
    }

    const stats: ComplaintStats = {
      total: items.length,
      open: 0,
      inReview: 0,
      investigating: 0,
      resolved: 0,
      dismissed: 0,
      byPriority: {},
      byCategory: {}
    };

    for (const item of items) {
      const status = item.status.toUpperCase();
      if (status === 'OPEN') stats.open++;
      else if (status === 'IN_REVIEW') stats.inReview++;
      else if (status === 'INVESTIGATING') stats.investigating++;
      else if (status === 'RESOLVED') stats.resolved++;
      else if (status === 'DISMISSED') stats.dismissed++;

      const priority = item.priority.toUpperCase();
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      const category = item.category.toUpperCase();
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    return stats;
  }
}
