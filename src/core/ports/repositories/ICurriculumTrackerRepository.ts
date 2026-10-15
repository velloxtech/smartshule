import { CurriculumTracker } from '../../domain/curriculum-tracker/CurriculumTracker';

export interface CurriculumTrackerFilterCriteria {
  schoolId?: string;
  teacherId?: string;
  classRoomId?: string;
  streamId?: string;
  learningAreaId?: string;
  term?: string;
  academicYear?: string;
  status?: string;
  search?: string;
}

export interface ICurriculumTrackerRepository {
  findById(id: string): Promise<CurriculumTracker | null>;
  findTrackers(filters: CurriculumTrackerFilterCriteria): Promise<CurriculumTracker[]>;
  save(tracker: CurriculumTracker): Promise<void>;
  update(tracker: CurriculumTracker): Promise<void>;
  delete(id: string): Promise<void>;
}
