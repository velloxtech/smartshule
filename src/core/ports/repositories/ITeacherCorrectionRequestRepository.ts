import { TeacherCorrectionRequest, CorrectionRequestStatus } from '../../domain/user/TeacherCorrectionRequest';

export interface ITeacherCorrectionRequestRepository {
  findById(id: string): Promise<TeacherCorrectionRequest | null>;
  findByTeacherId(teacherId: string): Promise<TeacherCorrectionRequest[]>;
  findBySchoolId(schoolId: string, status?: CorrectionRequestStatus): Promise<TeacherCorrectionRequest[]>;
  findPendingByTeacherAndField(teacherId: string, fieldName: string): Promise<TeacherCorrectionRequest | null>;
  save(request: TeacherCorrectionRequest): Promise<void>;
  update(request: TeacherCorrectionRequest): Promise<void>;
  delete(id: string): Promise<void>;
}
