import { IMediaRepository, HelpRequestFilterCriteria, ProgressPhotoFilterCriteria } from '../../core/ports/repositories/IMediaRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { ImageProcessingService } from '../../infrastructure/services/ImageProcessingService';
import { ParentHelpRequest, HelpRequestStatus } from '../../core/domain/media/ParentHelpRequest';
import { StudentProgressPhoto } from '../../core/domain/media/StudentProgressPhoto';
import { UserRole } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateHelpRequestDTO {
  schoolId: string;
  guardianUserId: string;
  studentId: string;
  teacherId?: string;
  subject: string;
  title: string;
  description: string;
  imageDataOrUrl?: string;
  imageFileName?: string;
}

export interface RespondHelpRequestDTO {
  requestId: string;
  teacherId: string;
  response: string;
  status?: HelpRequestStatus;
}

export interface UploadProgressPhotoDTO {
  schoolId: string;
  teacherId: string;
  studentId: string;
  learningAreaId?: string;
  competencyTag?: string;
  title: string;
  description: string;
  imageDataOrUrl: string;
  imageFileName?: string;
  tags?: string[];
}

export interface UserContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
}

export class VisualMediaUseCases {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  // ==========================================
  // 1. PARENT HELP REQUESTS (Image Question Upload)
  // ==========================================
  public async createHelpRequest(dto: CreateHelpRequestDTO) {
    const guardian = await this.guardianRepository.findByUserId(dto.guardianUserId);
    if (!guardian) {
      throw new NotFoundError('Guardian profile for User', dto.guardianUserId);
    }

    if (!guardian.studentIds.includes(dto.studentId)) {
      throw new ForbiddenError('Access denied: You can only submit help requests for your linked children.');
    }

    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    let imageUrl: string | undefined = undefined;
    let thumbnailUrl: string | undefined = undefined;
    let imageMetadata: any = undefined;

    if (dto.imageDataOrUrl) {
      const processed = await this.imageProcessingService.processImage(
        dto.imageDataOrUrl,
        dto.imageFileName || 'homework_help.jpg'
      );
      imageUrl = processed.imageUrl;
      thumbnailUrl = processed.thumbnailUrl;
      imageMetadata = processed.metadata;
    }

    const helpRequest = ParentHelpRequest.create(
      {
        schoolId: dto.schoolId,
        guardianId: guardian.id,
        studentId: student.id,
        teacherId: dto.teacherId,
        subject: dto.subject,
        title: dto.title,
        description: dto.description,
        imageUrl,
        thumbnailUrl,
        imageMetadata,
        status: 'OPEN'
      },
      IdGenerator.generate()
    );

    await this.mediaRepository.saveHelpRequest(helpRequest);

    return {
      ...helpRequest.toJSON(),
      studentName: student.fullName,
      admissionNumber: student.admissionNumber
    };
  }

  public async listHelpRequests(filters: {
    schoolId?: string;
    studentId?: string;
    status?: HelpRequestStatus;
    requestingUser?: UserContext;
  }) {
    let studentIdsToQuery: string[] | undefined = undefined;
    let guardianIdFilter: string | undefined = undefined;

    if (filters.requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(filters.requestingUser.userId);
      if (!guardian || !guardian.studentIds.length) {
        return [];
      }
      guardianIdFilter = guardian.id;
      if (filters.studentId) {
        if (!guardian.studentIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You cannot view help requests for other learners.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = guardian.studentIds;
      }
    } else if (filters.studentId) {
      studentIdsToQuery = [filters.studentId];
    }

    const requests = await this.mediaRepository.findHelpRequests({
      schoolId: filters.schoolId,
      guardianId: guardianIdFilter,
      studentId: studentIdsToQuery?.length === 1 ? studentIdsToQuery[0] : undefined,
      studentIds: studentIdsToQuery && studentIdsToQuery.length > 1 ? studentIdsToQuery : undefined,
      status: filters.status
    });

    const result = [];
    for (const req of requests) {
      const student = await this.studentRepository.findById(req.studentId);
      result.push({
        ...req.toJSON(),
        studentName: student ? student.fullName : 'Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A',
        gradeLevel: student ? student.gradeLevel : 'N/A'
      });
    }

    return result;
  }

  public async respondToHelpRequest(dto: RespondHelpRequestDTO) {
    const request = await this.mediaRepository.findHelpRequestById(dto.requestId);
    if (!request) {
      throw new NotFoundError('Help Request', dto.requestId);
    }

    request.respond(dto.response, dto.teacherId);
    if (dto.status) {
      request.updateStatus(dto.status);
    }

    await this.mediaRepository.updateHelpRequest(request);

    const student = await this.studentRepository.findById(request.studentId);
    return {
      ...request.toJSON(),
      studentName: student ? student.fullName : 'Learner',
      admissionNumber: student ? student.admissionNumber : 'N/A'
    };
  }

  // ==========================================
  // 2. STUDENT PROGRESS PHOTOS (Teacher Uploads)
  // ==========================================
  public async uploadProgressPhoto(dto: UploadProgressPhotoDTO) {
    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    const processed = await this.imageProcessingService.processImage(
      dto.imageDataOrUrl,
      dto.imageFileName || 'student_progress.jpg'
    );

    const progressPhoto = StudentProgressPhoto.create(
      {
        schoolId: dto.schoolId,
        teacherId: dto.teacherId,
        studentId: student.id,
        learningAreaId: dto.learningAreaId,
        competencyTag: dto.competencyTag || 'General CBC Progress',
        title: dto.title,
        description: dto.description,
        imageUrl: processed.imageUrl,
        thumbnailUrl: processed.thumbnailUrl,
        imageMetadata: processed.metadata,
        tags: dto.tags || ['CBC_PRACTICAL', 'CLASSROOM_PROGRESS']
      },
      IdGenerator.generate()
    );

    await this.mediaRepository.saveProgressPhoto(progressPhoto);

    return {
      ...progressPhoto.toJSON(),
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      gradeLevel: student.gradeLevel
    };
  }

  public async listProgressPhotos(filters: {
    schoolId?: string;
    studentId?: string;
    learningAreaId?: string;
    competencyTag?: string;
    requestingUser?: UserContext;
  }) {
    let studentIdsToQuery: string[] | undefined = undefined;

    if (filters.requestingUser?.role === UserRole.GUARDIAN) {
      const guardian = await this.guardianRepository.findByUserId(filters.requestingUser.userId);
      if (!guardian || !guardian.studentIds.length) {
        return [];
      }

      if (filters.studentId) {
        if (!guardian.studentIds.includes(filters.studentId)) {
          throw new ForbiddenError('Access denied: You can only view progress photos for your registered children.');
        }
        studentIdsToQuery = [filters.studentId];
      } else {
        studentIdsToQuery = guardian.studentIds;
      }
    } else if (filters.studentId) {
      studentIdsToQuery = [filters.studentId];
    }

    const photos = await this.mediaRepository.findProgressPhotos({
      schoolId: filters.schoolId,
      studentId: studentIdsToQuery?.length === 1 ? studentIdsToQuery[0] : undefined,
      studentIds: studentIdsToQuery && studentIdsToQuery.length > 1 ? studentIdsToQuery : undefined,
      learningAreaId: filters.learningAreaId,
      competencyTag: filters.competencyTag
    });

    const result = [];
    for (const p of photos) {
      const student = await this.studentRepository.findById(p.studentId);
      result.push({
        ...p.toJSON(),
        studentName: student ? student.fullName : 'Learner',
        admissionNumber: student ? student.admissionNumber : 'N/A',
        gradeLevel: student ? student.gradeLevel : 'N/A'
      });
    }

    return result;
  }
}
