import {
  ISchemeOfWorkRepository,
  ILessonPlanRepository,
  SchemeFilterCriteria,
  LessonPlanFilterCriteria
} from '../../core/ports/repositories/ISchemeOfWorkRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { SchemeOfWork, SchemeOfWorkEntry, SchemeStatus } from '../../core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan, LessonDevelopmentStep } from '../../core/domain/curriculum-plan/LessonPlan';
import { CoreCompetency, CoreValue } from '../../core/domain/cbc/CbcAssessment';
import { IdGenerator, NotFoundError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface CreateSchemeDTO {
  teacherId: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  academicYearId: string;
  termId: string;
  title: string;
  entries?: Omit<SchemeOfWorkEntry, 'id'>[];
}

export interface CreateLessonPlanDTO {
  teacherId: string;
  schemeOfWorkEntryId?: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  lessonDate: string;
  durationMinutes?: number;
  rollBoys?: number;
  rollGirls?: number;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetenciesAddressed: CoreCompetency[];
  valuesAddressed: CoreValue[];
  learningResources: string[];
  steps: LessonDevelopmentStep[];
  extendedActivity?: string;
  teacherSelfReflection?: string;
}

export class CurriculumPlanUseCases {
  constructor(
    private readonly schemeRepository: ISchemeOfWorkRepository,
    private readonly lessonPlanRepository: ILessonPlanRepository,
    private readonly teacherRepository?: ITeacherRepository
  ) {}

  // 1. Schemes of Work
  public async createSchemeOfWork(dto: CreateSchemeDTO) {
    const formattedEntries: SchemeOfWorkEntry[] = (dto.entries || []).map(entry => ({
      ...entry,
      id: IdGenerator.generate()
    }));

    const scheme = SchemeOfWork.create(
      {
        teacherId: dto.teacherId,
        learningAreaId: dto.learningAreaId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        title: dto.title,
        entries: formattedEntries,
        status: SchemeStatus.DRAFT
      },
      IdGenerator.generate()
    );

    await this.schemeRepository.save(scheme);
    return scheme.toJSON();
  }

  public async addEntryToScheme(schemeId: string, entry: Omit<SchemeOfWorkEntry, 'id'>) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);

    const fullEntry: SchemeOfWorkEntry = {
      ...entry,
      id: IdGenerator.generate()
    };

    scheme.addEntry(fullEntry);
    await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async submitSchemeForReview(schemeId: string) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);

    if (scheme.entries.length === 0) {
      throw new ValidationError('Cannot submit an empty scheme of work. Add lesson entries first.');
    }

    scheme.submit();
    await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async reviewScheme(schemeId: string, reviewerUserId: string, approved: boolean, remarks: string) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);

    if (approved) {
      scheme.approve(reviewerUserId, remarks);
    } else {
      scheme.reject(reviewerUserId, remarks);
    }

    await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async getSchemeById(schemeId: string) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);
    return scheme.toJSON();
  }

  public async listSchemes(filters?: SchemeFilterCriteria) {
    const schemes = await this.schemeRepository.findAll(filters);
    return schemes.map(s => s.toJSON());
  }

  // 2. Lesson Plans
  public async createLessonPlan(dto: CreateLessonPlanDTO) {
    const lessonPlan = LessonPlan.create(
      {
        teacherId: dto.teacherId,
        schemeOfWorkEntryId: dto.schemeOfWorkEntryId,
        learningAreaId: dto.learningAreaId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        lessonDate: dto.lessonDate,
        durationMinutes: dto.durationMinutes || 40,
        rollBoys: dto.rollBoys,
        rollGirls: dto.rollGirls,
        strand: dto.strand,
        subStrand: dto.subStrand,
        specificLearningOutcomes: dto.specificLearningOutcomes,
        keyInquiryQuestions: dto.keyInquiryQuestions,
        coreCompetenciesAddressed: dto.coreCompetenciesAddressed,
        valuesAddressed: dto.valuesAddressed,
        learningResources: dto.learningResources,
        steps: dto.steps,
        extendedActivity: dto.extendedActivity,
        teacherSelfReflection: dto.teacherSelfReflection
      },
      IdGenerator.generate()
    );

    await this.lessonPlanRepository.save(lessonPlan);
    return lessonPlan.toJSON();
  }

  public async updateLessonPlanReflection(lessonPlanId: string, reflection: string) {
    const lessonPlan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!lessonPlan) throw new NotFoundError('Lesson Plan', lessonPlanId);

    lessonPlan.setReflection(reflection);
    await this.lessonPlanRepository.update(lessonPlan);
    return lessonPlan.toJSON();
  }

  public async getLessonPlanById(lessonPlanId: string) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);
    return plan.toJSON();
  }

  public async submitLessonPlanForReview(lessonPlanId: string) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);

    plan.submit();
    await this.lessonPlanRepository.update(plan);
    return plan.toJSON();
  }

  public async reviewLessonPlan(lessonPlanId: string, reviewerUserId: string, approved: boolean, remarks: string) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);

    if (approved) {
      plan.approve(reviewerUserId, remarks);
    } else {
      plan.reject(reviewerUserId, remarks);
    }

    await this.lessonPlanRepository.update(plan);
    return plan.toJSON();
  }

  public async listLessonPlans(filters?: LessonPlanFilterCriteria) {
    const plans = await this.lessonPlanRepository.findAll(filters);
    return plans.map(p => p.toJSON());
  }

  public async deleteScheme(id: string, requestingUser?: { userId: string; role: string }): Promise<void> {
    const scheme = await this.schemeRepository.findById(id);
    if (!scheme) throw new NotFoundError('Scheme of Work', id);
    if (requestingUser?.role === 'TEACHER') {
      let isOwner = scheme.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && scheme.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own schemes of work.');
      }
    }
    await this.schemeRepository.delete(id);
  }

  public async deleteLessonPlan(id: string, requestingUser?: { userId: string; role: string }): Promise<void> {
    const plan = await this.lessonPlanRepository.findById(id);
    if (!plan) throw new NotFoundError('Lesson Plan', id);
    if (requestingUser?.role === 'TEACHER') {
      let isOwner = plan.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && plan.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own lesson plans.');
      }
    }
    await this.lessonPlanRepository.delete(id);
  }
}
