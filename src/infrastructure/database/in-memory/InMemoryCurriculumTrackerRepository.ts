import {
  ICurriculumTrackerRepository,
  CurriculumTrackerFilterCriteria
} from '../../../core/ports/repositories/ICurriculumTrackerRepository';
import { CurriculumTracker } from '../../../core/domain/curriculum-tracker/CurriculumTracker';

export class InMemoryCurriculumTrackerRepository implements ICurriculumTrackerRepository {
  private trackers: Map<string, CurriculumTracker> = new Map();

  public async findById(id: string): Promise<CurriculumTracker | null> {
    return this.trackers.get(id) || null;
  }

  public async findTrackers(filters: CurriculumTrackerFilterCriteria): Promise<CurriculumTracker[]> {
    let result = Array.from(this.trackers.values());

    if (filters.schoolId) {
      result = result.filter(t => t.schoolId === filters.schoolId);
    }
    if (filters.teacherId) {
      result = result.filter(t => t.teacherId === filters.teacherId);
    }
    if (filters.classRoomId) {
      result = result.filter(t => t.classRoomId === filters.classRoomId);
    }
    if (filters.streamId) {
      result = result.filter(t => t.streamId === filters.streamId);
    }
    if (filters.learningAreaId) {
      result = result.filter(t => t.learningAreaId === filters.learningAreaId);
    }
    if (filters.term) {
      result = result.filter(t => t.term.toLowerCase() === filters.term?.toLowerCase());
    }
    if (filters.academicYear) {
      result = result.filter(t => t.academicYear === filters.academicYear);
    }
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        t =>
          t.subjectName.toLowerCase().includes(q) ||
          t.className.toLowerCase().includes(q) ||
          t.teacherName.toLowerCase().includes(q) ||
          t.items.some(i => i.strand.toLowerCase().includes(q) || i.subStrand.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async save(tracker: CurriculumTracker): Promise<void> {
    this.trackers.set(tracker.id, tracker);
  }

  public async update(tracker: CurriculumTracker): Promise<void> {
    this.trackers.set(tracker.id, tracker);
  }

  public async delete(id: string): Promise<void> {
    this.trackers.delete(id);
  }
}
