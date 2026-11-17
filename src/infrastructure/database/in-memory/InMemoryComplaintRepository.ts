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

  async findByReferenceNumber(referenceNumber: string): Promise<Complaint | null> {
    const all = Array.from(this.complaints.values());
    return all.find((c) => c.referenceNumber === referenceNumber) || null;
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
        result = result.filter(
          (c) =>
            c.complainantStudentId === criteria.complainantStudentId ||
            c.studentId === criteria.complainantStudentId
        );
      }
      if (criteria.studentId) {
        result = result.filter(
          (c) =>
            c.studentId === criteria.studentId ||
            c.complainantStudentId === criteria.studentId
        );
      }
      if (criteria.parentUserId) {
        result = result.filter(
          (c) =>
            c.parentUserId === criteria.parentUserId ||
            c.createdByUserId === criteria.parentUserId
        );
      }
      if (criteria.studentGrade) {
        result = result.filter((c) => c.gradeLevel === criteria.studentGrade);
      }
      if (criteria.isOverdue !== undefined) {
        result = result.filter((c) => c.isOverdue === criteria.isOverdue);
      }
      if (criteria.search) {
        const q = criteria.search.toLowerCase().trim();
        result = result.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.referenceNumber && c.referenceNumber.toLowerCase().includes(q)) ||
            (c.studentName && c.studentName.toLowerCase().includes(q)) ||
            (c.admissionNumber && c.admissionNumber.toLowerCase().includes(q)) ||
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
      active: 0,
      acknowledged: 0,
      underReview: 0,
      awaitingParent: 0,
      escalated: 0,
      closed: 0,
      reopened: 0,
      overdueCount: 0,
      avgResponseTimeHours: 0,
      avgResolutionTimeHours: 0,
      resolutionRate: 0,
      byPriority: {},
      byCategory: {},
      byStatus: {},
      byGrade: {},
      byAssignee: {}
    };

    let totalResponseTimeMs = 0;
    let responseTimeCount = 0;
    let totalResolutionTimeMs = 0;
    let resolutionTimeCount = 0;
    let resolvedCount = 0;

    for (const item of items) {
      const status = item.status.toUpperCase();
      stats.byStatus![status] = (stats.byStatus![status] || 0) + 1;

      // Legacy & standard bucket mapping
      if (status === 'OPEN' || status === 'SUBMITTED') {
        stats.open++;
        stats.active!++;
      } else if (status === 'ACKNOWLEDGED') {
        stats.acknowledged!++;
        stats.active!++;
      } else if (status === 'IN_REVIEW' || status === 'UNDER_REVIEW' || status === 'INVESTIGATING') {
        stats.inReview++;
        stats.underReview!++;
        stats.active!++;
      } else if (status === 'AWAITING_PARENT_RESPONSE') {
        stats.awaitingParent!++;
        stats.active!++;
      } else if (status === 'ESCALATED') {
        stats.escalated!++;
        stats.active!++;
      } else if (status === 'RESOLVED') {
        stats.resolved++;
        resolvedCount++;
      } else if (status === 'CLOSED' || status === 'DISMISSED') {
        stats.dismissed++;
        stats.closed!++;
      } else if (status === 'REOPENED') {
        stats.reopened!++;
        stats.active!++;
      }

      if (item.isOverdue) {
        stats.overdueCount!++;
      }

      // Response time (time to acknowledge or first staff response)
      if (item.acknowledgedAt) {
        const diffMs = item.acknowledgedAt.getTime() - item.createdAt.getTime();
        if (diffMs >= 0) {
          totalResponseTimeMs += diffMs;
          responseTimeCount++;
        }
      }

      // Resolution time
      if (item.resolvedAt) {
        const diffMs = item.resolvedAt.getTime() - item.createdAt.getTime();
        if (diffMs >= 0) {
          totalResolutionTimeMs += diffMs;
          resolutionTimeCount++;
        }
      }

      const priority = item.priority.toUpperCase();
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      const category = item.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      if (item.gradeLevel) {
        stats.byGrade![item.gradeLevel] = (stats.byGrade![item.gradeLevel] || 0) + 1;
      }

      const assignee = item.assignedToName || 'Unassigned';
      stats.byAssignee![assignee] = (stats.byAssignee![assignee] || 0) + 1;
    }

    if (responseTimeCount > 0) {
      stats.avgResponseTimeHours = Number(
        (totalResponseTimeMs / (responseTimeCount * 3600000)).toFixed(1)
      );
    }
    if (resolutionTimeCount > 0) {
      stats.avgResolutionTimeHours = Number(
        (totalResolutionTimeMs / (resolutionTimeCount * 3600000)).toFixed(1)
      );
    }
    if (items.length > 0) {
      stats.resolutionRate = Number(
        ((resolvedCount / items.length) * 100).toFixed(1)
      );
    }

    return stats;
  }
}
