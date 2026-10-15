import {
  ICurriculumTrackerRepository,
  CurriculumTrackerFilterCriteria
} from '../../core/ports/repositories/ICurriculumTrackerRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import {
  CurriculumTracker,
  CurriculumTrackerWeekItem,
  WeekCoverageStatus
} from '../../core/domain/curriculum-tracker/CurriculumTracker';
import { IdGenerator, NotFoundError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface CreateCurriculumTrackerDTO {
  schoolId?: string;
  teacherId?: string;
  teacherName?: string;
  learningAreaId: string;
  subjectName: string;
  classRoomId: string;
  className: string;
  streamId?: string;
  streamName?: string;
  academicYear?: string;
  term?: string;
  totalWeeks?: number;
  items?: Partial<CurriculumTrackerWeekItem>[];
}

export interface ConfirmWeekCoveredDTO {
  covered?: boolean;
  coveredAt?: string;
  comment?: string;
  lessonsTaught?: number;
  status?: WeekCoverageStatus;
}

export class CurriculumTrackerUseCases {
  constructor(
    private readonly trackerRepo: ICurriculumTrackerRepository,
    private readonly teacherRepo?: ITeacherRepository
  ) {}

  public async createTracker(
    dto: CreateCurriculumTrackerDTO,
    requestingUser?: { userId?: string; role?: string; schoolId?: string; fullName?: string }
  ) {
    if (!dto.learningAreaId || !dto.subjectName) {
      throw new ValidationError('Subject / Learning Area is required.');
    }
    if (!dto.classRoomId || !dto.className) {
      throw new ValidationError('Class / Grade is required.');
    }

    const schoolId = dto.schoolId || requestingUser?.schoolId || 'school-001';
    let teacherId = dto.teacherId || requestingUser?.userId || 'teacher-001';
    let teacherName = dto.teacherName || requestingUser?.fullName || 'Assigned Teacher';

    if (requestingUser?.role === 'TEACHER' && requestingUser.userId) {
      teacherId = requestingUser.userId;
      if (this.teacherRepo) {
        const teacherProfile = await this.teacherRepo.findByUserId(requestingUser.userId);
        if (teacherProfile) {
          teacherId = teacherProfile.id;
        }
      }
    }

    const totalWeeks = dto.totalWeeks && dto.totalWeeks > 0 ? dto.totalWeeks : 12;
    const academicYear = dto.academicYear || '2026';
    const term = dto.term || 'Term 1';

    // Generate weeks 1 to totalWeeks
    const itemsMap = new Map<number, Partial<CurriculumTrackerWeekItem>>();
    if (dto.items && Array.isArray(dto.items)) {
      for (const item of dto.items) {
        if (item.weekNumber) {
          itemsMap.set(item.weekNumber, item);
        }
      }
    }

    const weekItems: CurriculumTrackerWeekItem[] = [];
    for (let w = 1; w <= totalWeeks; w++) {
      const provided = itemsMap.get(w);
      weekItems.push({
        id: provided?.id || IdGenerator.generate(),
        weekNumber: w,
        strand: provided?.strand || `Week ${w} Curriculum Strand`,
        subStrand: provided?.subStrand || '',
        learningOutcomes: provided?.learningOutcomes || '',
        plannedLessons: provided?.plannedLessons ?? 5,
        targetDate: provided?.targetDate,
        suggestedActivities: provided?.suggestedActivities,
        resources: provided?.resources,
        isCovered: provided?.isCovered ?? false,
        status: provided?.status || 'PENDING',
        coveredAt: provided?.coveredAt,
        lessonsTaught: provided?.lessonsTaught,
        teacherComment: provided?.teacherComment,
        confirmedByTeacherId: provided?.confirmedByTeacherId,
        confirmedByTeacherName: provided?.confirmedByTeacherName,
        hodRemarks: provided?.hodRemarks
      });
    }

    const tracker = CurriculumTracker.create(
      {
        schoolId,
        teacherId,
        teacherName,
        learningAreaId: dto.learningAreaId,
        subjectName: dto.subjectName,
        classRoomId: dto.classRoomId,
        className: dto.className,
        streamId: dto.streamId,
        streamName: dto.streamName,
        academicYear,
        term,
        totalWeeks,
        items: weekItems,
        status: 'ACTIVE'
      },
      IdGenerator.generate()
    );

    await this.trackerRepo.save(tracker);
    return tracker.toJSON();
  }

  public async getTrackerById(
    id: string,
    requestingUser?: { userId?: string; role?: string }
  ) {
    const tracker = await this.trackerRepo.findById(id);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', id);
    }
    return tracker.toJSON();
  }

  public async listTrackers(
    filters: CurriculumTrackerFilterCriteria,
    requestingUser?: { userId?: string; role?: string; schoolId?: string }
  ) {
    const queryFilters: CurriculumTrackerFilterCriteria = { ...filters };
    if (!queryFilters.schoolId && requestingUser?.schoolId) {
      queryFilters.schoolId = requestingUser.schoolId;
    }

    // Role-based visibility
    if (requestingUser?.role === 'TEACHER' && requestingUser.userId) {
      let tId = requestingUser.userId;
      if (this.teacherRepo) {
        const profile = await this.teacherRepo.findByUserId(requestingUser.userId);
        if (profile) tId = profile.id;
      }
      // If teacher has not specified a teacher filter, default to their own
      if (!queryFilters.teacherId) {
        queryFilters.teacherId = tId;
      }
    }

    const trackers = await this.trackerRepo.findTrackers(queryFilters);
    return trackers.map(t => t.toJSON());
  }

  public async updateWeekPlan(
    trackerId: string,
    weekNumber: number,
    data: Partial<CurriculumTrackerWeekItem>,
    requestingUser?: { userId?: string; role?: string }
  ) {
    const tracker = await this.trackerRepo.findById(trackerId);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', trackerId);
    }

    await this.checkPermission(tracker, requestingUser);

    tracker.setWeekPlan(weekNumber, data);
    await this.trackerRepo.update(tracker);
    return tracker.toJSON();
  }

  public async confirmWeekCovered(
    trackerId: string,
    weekNumber: number,
    data: ConfirmWeekCoveredDTO,
    requestingUser?: { userId?: string; role?: string; fullName?: string }
  ) {
    const tracker = await this.trackerRepo.findById(trackerId);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', trackerId);
    }

    await this.checkPermission(tracker, requestingUser);

    const teacherName = requestingUser?.fullName || tracker.teacherName;
    const teacherId = requestingUser?.userId || tracker.teacherId;

    tracker.confirmWeekCovered(weekNumber, {
      ...data,
      confirmedByTeacherId: teacherId,
      confirmedByTeacherName: teacherName
    });

    await this.trackerRepo.update(tracker);
    return tracker.toJSON();
  }

  public async updateWeekComment(
    trackerId: string,
    weekNumber: number,
    comment: string,
    requestingUser?: { userId?: string; role?: string }
  ) {
    const tracker = await this.trackerRepo.findById(trackerId);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', trackerId);
    }

    await this.checkPermission(tracker, requestingUser);

    tracker.updateWeekComment(weekNumber, comment);
    await this.trackerRepo.update(tracker);
    return tracker.toJSON();
  }

  public async batchUpdateWeeks(
    trackerId: string,
    weeks: Partial<CurriculumTrackerWeekItem>[],
    requestingUser?: { userId?: string; role?: string }
  ) {
    const tracker = await this.trackerRepo.findById(trackerId);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', trackerId);
    }

    await this.checkPermission(tracker, requestingUser);

    tracker.batchUpdateWeeks(weeks);
    await this.trackerRepo.update(tracker);
    return tracker.toJSON();
  }

  public async getSummary(schoolId: string, term?: string, academicYear?: string) {
    const trackers = await this.trackerRepo.findTrackers({ schoolId, term, academicYear });

    let totalWeeksAll = 0;
    let coveredWeeksAll = 0;
    let inProgressWeeksAll = 0;
    let pendingWeeksAll = 0;
    let commentsCountAll = 0;

    const subjectsSummary: Record<string, { subjectName: string; totalTrackers: number; completionRate: number; coveredWeeks: number; totalWeeks: number }> = {};

    for (const t of trackers) {
      const stats = t.getStats();
      totalWeeksAll += stats.totalWeeks;
      coveredWeeksAll += stats.coveredWeeks;
      inProgressWeeksAll += stats.inProgressWeeks;
      pendingWeeksAll += stats.pendingWeeks;
      commentsCountAll += stats.commentsCount;

      const subName = t.subjectName;
      if (!subjectsSummary[subName]) {
        subjectsSummary[subName] = {
          subjectName: subName,
          totalTrackers: 0,
          coveredWeeks: 0,
          totalWeeks: 0,
          completionRate: 0
        };
      }
      subjectsSummary[subName].totalTrackers += 1;
      subjectsSummary[subName].coveredWeeks += stats.coveredWeeks;
      subjectsSummary[subName].totalWeeks += stats.totalWeeks;
    }

    for (const key of Object.keys(subjectsSummary)) {
      const item = subjectsSummary[key];
      item.completionRate = item.totalWeeks > 0 ? Math.round((item.coveredWeeks / item.totalWeeks) * 100) : 0;
    }

    const overallPercentage = totalWeeksAll > 0 ? Math.round((coveredWeeksAll / totalWeeksAll) * 100) : 0;

    return {
      totalTrackers: trackers.length,
      totalWeeksAll,
      coveredWeeksAll,
      inProgressWeeksAll,
      pendingWeeksAll,
      commentsCountAll,
      overallPercentage,
      subjects: Object.values(subjectsSummary)
    };
  }

  public async deleteTracker(
    trackerId: string,
    requestingUser?: { userId?: string; role?: string }
  ) {
    const tracker = await this.trackerRepo.findById(trackerId);
    if (!tracker) {
      throw new NotFoundError('Curriculum Tracker', trackerId);
    }

    await this.checkPermission(tracker, requestingUser);

    await this.trackerRepo.delete(trackerId);
  }

  private async checkPermission(
    tracker: CurriculumTracker,
    requestingUser?: { userId?: string; role?: string }
  ): Promise<void> {
    if (!requestingUser) return;
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER'];
    if (allowedRoles.includes(requestingUser.role || '')) {
      return;
    }
    if (requestingUser.role === 'TEACHER') {
      let isOwner = tracker.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepo && requestingUser.userId) {
        const teacherProfile = await this.teacherRepo.findByUserId(requestingUser.userId);
        if (teacherProfile && tracker.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only modify your own curriculum progress tracker.');
      }
    }
  }
}
