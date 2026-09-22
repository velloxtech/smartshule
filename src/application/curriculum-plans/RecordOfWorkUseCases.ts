import { IRecordOfWorkRepository } from '../../core/ports/repositories/IRecordOfWorkRepository';

export class RecordOfWorkUseCases {
  constructor(private recordOfWorkRepo: IRecordOfWorkRepository) {}

  async createRecord(data: any, teacherId: string) {
    if (!data.subjectAndGrade || !data.strandAndWorkCovered) {
      throw new Error('Subject, Grade, and Work Covered are required.');
    }
    return await this.recordOfWorkRepo.create({ ...data, teacherId });
  }

  async getRecords(userRole: string, teacherId?: string) {
    // Teachers only see their own records; Admins see all
    if (userRole === 'TEACHER' && teacherId) {
      return await this.recordOfWorkRepo.findByTeacherId(teacherId);
    }
    return await this.recordOfWorkRepo.findAll();
  }

  async updateRecord(id: string, data: any) {
    return await this.recordOfWorkRepo.update(id, data);
  }

  async deleteRecord(id: string) {
    return await this.recordOfWorkRepo.delete(id);
  }
}