import { TeacherCorrectionRequest, CorrectionRequestStatus } from '../../../core/domain/user/TeacherCorrectionRequest';
import { ITeacherCorrectionRequestRepository } from '../../../core/ports/repositories/ITeacherCorrectionRequestRepository';

export class InMemoryTeacherCorrectionRequestRepository implements ITeacherCorrectionRequestRepository {
  private requests: Map<string, TeacherCorrectionRequest> = new Map();

  public async findById(id: string): Promise<TeacherCorrectionRequest | null> {
    return this.requests.get(id) || null;
  }

  public async findByTeacherId(teacherId: string): Promise<TeacherCorrectionRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.teacherId === teacherId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findBySchoolId(schoolId: string, status?: CorrectionRequestStatus): Promise<TeacherCorrectionRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.schoolId === schoolId && (!status || r.status === status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findPendingByTeacherAndField(teacherId: string, fieldName: string): Promise<TeacherCorrectionRequest | null> {
    for (const r of this.requests.values()) {
      if (r.teacherId === teacherId && r.fieldName === fieldName && r.status === 'PENDING') {
        return r;
      }
    }
    return null;
  }

  public async save(request: TeacherCorrectionRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  public async update(request: TeacherCorrectionRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  public async delete(id: string): Promise<void> {
    this.requests.delete(id);
  }
}
