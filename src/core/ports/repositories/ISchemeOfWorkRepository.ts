import { SchemeOfWork, SchemeStatus } from '../../domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../domain/curriculum-plan/LessonPlan';

export interface SchemeFilterCriteria {
  teacherId?: string;
  learningAreaId?: string;
  classRoomId?: string;
  termId?: string;
  academicYearId?: string;
  status?: SchemeStatus;
}

export interface ISchemeOfWorkRepository {
  findById(id: string): Promise<SchemeOfWork | null>;
  findAll(filters?: SchemeFilterCriteria): Promise<SchemeOfWork[]>;
  save(scheme: SchemeOfWork): Promise<void>;
  update(scheme: SchemeOfWork): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LessonPlanFilterCriteria {
  teacherId?: string;
  learningAreaId?: string;
  classRoomId?: string;
  streamId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ILessonPlanRepository {
  findById(id: string): Promise<LessonPlan | null>;
  findAll(filters?: LessonPlanFilterCriteria): Promise<LessonPlan[]>;
  findBySchemeEntryId(schemeEntryId: string): Promise<LessonPlan[]>;
  save(lessonPlan: LessonPlan): Promise<void>;
  update(lessonPlan: LessonPlan): Promise<void>;
  delete(id: string): Promise<void>;
}
