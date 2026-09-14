import { ParentHelpRequest, HelpRequestStatus } from '../../domain/media/ParentHelpRequest';
import { StudentProgressPhoto } from '../../domain/media/StudentProgressPhoto';

export interface HelpRequestFilterCriteria {
  schoolId?: string;
  guardianId?: string;
  studentId?: string;
  studentIds?: string[];
  teacherId?: string;
  status?: HelpRequestStatus;
}

export interface ProgressPhotoFilterCriteria {
  schoolId?: string;
  studentId?: string;
  studentIds?: string[];
  teacherId?: string;
  learningAreaId?: string;
  competencyTag?: string;
}

export interface IMediaRepository {
  // Parent Help Requests
  saveHelpRequest(request: ParentHelpRequest): Promise<void>;
  updateHelpRequest(request: ParentHelpRequest): Promise<void>;
  findHelpRequestById(id: string): Promise<ParentHelpRequest | null>;
  findHelpRequests(filters: HelpRequestFilterCriteria): Promise<ParentHelpRequest[]>;

  // Student Progress Photos
  saveProgressPhoto(photo: StudentProgressPhoto): Promise<void>;
  findProgressPhotoById(id: string): Promise<StudentProgressPhoto | null>;
  findProgressPhotos(filters: ProgressPhotoFilterCriteria): Promise<StudentProgressPhoto[]>;
  deleteProgressPhoto(id: string): Promise<void>;
}
