import { IRecordOfWorkRepository } from '../../core/ports/repositories/IRecordOfWorkRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';

export class RecordOfWorkUseCases {
  constructor(private recordOfWorkRepo: IRecordOfWorkRepository) {}

  async createRecord(data: any, teacherId: string) {
    if (!data.subjectAndGrade || !data.strandAndWorkCovered) {
      throw new ValidationError('Subject, Grade, and Work Covered are required.');
    }
    return await this.recordOfWorkRepo.create({ ...data, teacherId });
  }

  async getRecords(userRole: string, teacherId?: string) {
    // Teachers only see their own records; Admins and Head Teachers see all
    if (userRole === 'TEACHER' && teacherId) {
      return await this.recordOfWorkRepo.findByTeacherId(teacherId);
    }
    return await this.recordOfWorkRepo.findAll();
  }

  async updateRecord(id: string, data: any, userRole?: string, teacherId?: string) {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work', id);
    }

    if (userRole === 'TEACHER' && teacherId && existing.teacherId !== teacherId) {
      throw new ForbiddenError('You can only update your own records of work.');
    }

    return await this.recordOfWorkRepo.update(id, data);
  }

  async deleteRecord(id: string, userRole?: string, teacherId?: string) {
    const existing = await this.recordOfWorkRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Record of Work', id);
    }

    if (userRole === 'TEACHER' && teacherId && existing.teacherId !== teacherId) {
      throw new ForbiddenError('You can only delete your own records of work.');
    }

    return await this.recordOfWorkRepo.delete(id);
  }
}