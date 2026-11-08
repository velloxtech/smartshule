import crypto from 'crypto';
import { IParentConsentRepository } from '../../core/ports/repositories/IParentConsentRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { ParentConsentRequest, ConsentCategory, ConsentTargetType, ConsentStatus } from '../../core/domain/consent/ParentConsentRequest';
import { ParentConsentResponse, ConsentDecision, ConsentSignatureType } from '../../core/domain/consent/ParentConsentResponse';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';
import { ForbiddenError, NotFoundError, ValidationError, IdGenerator } from '../../core/domain/shared/Errors';
import { SystemLog } from '../../core/domain/system-log/SystemLog';

export interface UserContext {
  userId: string;
  email?: string;
  role?: string;
  schoolId?: string;
}

export interface SubmitConsentDTO {
  consentRequestId: string;
  studentId: string;
  decision: ConsentDecision;
  notes?: string;
  parentName: string;
  parentRelationship?: string;
  parentNationalId?: string;
  parentPhone?: string;
  signatureType?: ConsentSignatureType;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateConsentRequestDTO {
  title: string;
  category: ConsentCategory;
  description?: string;
  termsAndConditions: string;
  targetType?: ConsentTargetType;
  targetClassIds?: string[];
  targetStudentIds?: string[];
  isMandatory?: boolean;
  deadline?: string;
  status?: ConsentStatus;
}

export class ParentConsentUseCases {
  constructor(
    private readonly parentConsentRepository: IParentConsentRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly userRepository: IUserRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  /**
   * Authoritatively retrieves consent requests and current status for all children of a parent
   */
  public async getConsentsForParent(parentUserId: string, schoolId?: string) {
    if (!parentUserId) {
      throw new ForbiddenError('Authentication required to access parent consents.');
    }

    // 1. Authoritative resolution of linked learners
    const resolved = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
      userId: parentUserId,
      guardianRepository: this.guardianRepository,
      studentRepository: this.studentRepository,
      userRepository: this.userRepository
    });

    const linkedStudents = resolved.students;
    if (!linkedStudents || linkedStudents.length === 0) {
      return {
        hasLinkedChildren: false,
        children: [],
        consents: []
      };
    }

    const effectiveSchoolId = schoolId || linkedStudents[0].schoolId;
    const allRequests = await this.parentConsentRepository.findRequestsBySchool(
      effectiveSchoolId,
      { status: 'PUBLISHED' }
    );

    const consentItems: any[] = [];

    for (const student of linkedStudents) {
      for (const request of allRequests) {
        // Evaluate eligibility based on targetType
        let isEligible = false;
        if (request.targetType === 'WHOLE_SCHOOL') {
          isEligible = true;
        } else if (request.targetType === 'GRADE' || request.targetType === 'STREAM') {
          const targets = request.targetClassIds || [];
          const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');
          isEligible =
            targets.length === 0 ||
            targets.some(
              t =>
                normalize(t) === normalize(student.gradeLevel || '') ||
                normalize(t) === normalize(student.streamId || '') ||
                (student.streamId && targets.includes(student.streamId))
            );
        } else if (request.targetType === 'INDIVIDUAL') {
          isEligible = (request.targetStudentIds || []).includes(student.id);
        }

        if (!isEligible) continue;

        // Fetch latest response for this student and request
        const latestResponse = await this.parentConsentRepository.findLatestResponse(
          request.id,
          student.id
        );

        let responseStatus: 'PENDING' | 'CONSENTED' | 'DECLINED' | 'OUTDATED_VERSION' = 'PENDING';
        let requiresResubmission = false;

        if (latestResponse) {
          if (latestResponse.consentVersion < request.version) {
            responseStatus = 'OUTDATED_VERSION';
            requiresResubmission = true;
          } else {
            responseStatus = latestResponse.decision;
          }
        }

        consentItems.push({
          consentRequestId: request.id,
          title: request.title,
          category: request.category,
          description: request.description,
          termsAndConditions: request.termsAndConditions,
          version: request.version,
          targetType: request.targetType,
          isMandatory: request.isMandatory,
          deadline: request.deadline ? request.deadline.toISOString() : undefined,
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            gradeLevel: student.gradeLevel,
            streamId: student.streamId
          },
          responseStatus,
          requiresResubmission,
          latestResponse: latestResponse ? latestResponse.toJSON() : null
        });
      }
    }

    // Sort: pending first, then by deadline
    consentItems.sort((a, b) => {
      if (a.responseStatus === 'PENDING' && b.responseStatus !== 'PENDING') return -1;
      if (a.responseStatus !== 'PENDING' && b.responseStatus === 'PENDING') return 1;
      return 0;
    });

    return {
      hasLinkedChildren: true,
      children: linkedStudents.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.trim(),
        admissionNumber: s.admissionNumber,
        gradeLevel: s.gradeLevel
      })),
      consents: consentItems
    };
  }

  /**
   * Submit or update electronic consent for a specific linked child
   */
  public async submitConsentResponse(parentUserId: string, dto: SubmitConsentDTO) {
    if (!parentUserId) {
      throw new ForbiddenError('Authentication required to submit consent.');
    }
    if (!dto.consentRequestId) {
      throw new ValidationError('Consent request identifier is required.');
    }
    if (!dto.studentId) {
      throw new ValidationError('Target learner identifier is required.');
    }
    if (!dto.decision || (dto.decision !== 'CONSENTED' && dto.decision !== 'DECLINED')) {
      throw new ValidationError('A valid consent decision (CONSENTED or DECLINED) is required.');
    }

    // 1. Authoritative security check: verify that this student is linked to this parent
    const resolved = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
      userId: parentUserId,
      guardianRepository: this.guardianRepository,
      studentRepository: this.studentRepository,
      userRepository: this.userRepository
    });

    const isAuthorized = resolved.studentIds.includes(dto.studentId);
    if (!isAuthorized) {
      throw new ForbiddenError(
        'Access denied: You are not authorized to submit consent for this learner.'
      );
    }

    const student = resolved.students.find(s => s.id === dto.studentId) || (await this.studentRepository.findById(dto.studentId));
    if (!student) {
      throw new NotFoundError('Student', dto.studentId);
    }

    // 2. Verify consent request
    const request = await this.parentConsentRepository.findRequestById(dto.consentRequestId);
    if (!request) {
      throw new NotFoundError('Consent Request', dto.consentRequestId);
    }
    if (request.status !== 'PUBLISHED') {
      throw new ValidationError(
        `Cannot respond to consent request: Status is ${request.status}. Only published requests accept responses.`
      );
    }

    // Check deadline if present
    if (request.deadline && new Date() > new Date(request.deadline)) {
      throw new ValidationError(
        `The deadline for this consent request (${new Date(request.deadline).toLocaleDateString()}) has passed.`
      );
    }

    // 3. Cryptographic Signature Hash Generation
    const timestamp = new Date();
    const hashData = `${request.id}|v${request.version}|${student.id}|${parentUserId}|${dto.decision}|${dto.signatureData || ''}|${timestamp.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // 4. Handle audit history: archive previous latest response if one exists
    const previousLatest = await this.parentConsentRepository.findLatestResponse(
      request.id,
      student.id
    );

    if (previousLatest) {
      previousLatest.markSuperseded();
      await this.parentConsentRepository.saveResponse(previousLatest);
    }

    // 5. Create new immutable response record
    const responseId = IdGenerator.generate();
    const newResponse = ParentConsentResponse.create(
      {
        schoolId: request.schoolId,
        consentRequestId: request.id,
        consentVersion: request.version,
        studentId: student.id,
        parentUserId,
        parentGuardianId: resolved.guardian?.id,
        parentName: dto.parentName || 'Parent / Guardian',
        parentRelationship: dto.parentRelationship || 'PARENT',
        parentNationalId: dto.parentNationalId || resolved.guardian?.nationalId,
        parentPhone: dto.parentPhone || resolved.guardian?.emergencyContact,
        decision: dto.decision,
        notes: dto.notes,
        signatureType: dto.signatureType || 'DRAWN',
        signatureData: dto.signatureData,
        signatureHash,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        submittedAt: timestamp,
        previousResponseId: previousLatest ? previousLatest.id : undefined,
        isLatest: true
      },
      responseId,
      timestamp,
      timestamp
    );

    await this.parentConsentRepository.saveResponse(newResponse);

    // 6. Log system audit
    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId: request.schoolId,
              level: 'INFO',
              category: 'STUDENTS',
              action: 'PARENT_CONSENT_SUBMITTED',
              actorUserId: parentUserId,
              actorRole: 'PARENT',
              status: 'SUCCESS',
              details: `Parent ${dto.parentName} submitted ${dto.decision} for learner ${student.firstName} ${student.lastName} (Request: ${request.title}, v${request.version}).`,
              metadata: {
                consentRequestId: request.id,
                consentVersion: request.version,
                studentId: student.id,
                decision: dto.decision,
                signatureHash,
                ipAddress: dto.ipAddress
              }
            },
            IdGenerator.generate()
          )
        );
      } catch (err: any) {
        console.error('[ParentConsentUseCases] Failed to log audit:', err.message);
      }
    }

    return {
      success: true,
      message: `Consent decision (${dto.decision}) recorded successfully for ${student.firstName} ${student.lastName}.`,
      response: newResponse.toJSON()
    };
  }

  /**
   * School Administrator creates a new consent request
   */
  public async createConsentRequest(actor: UserContext, dto: CreateConsentRequestDTO) {
    if (!actor || !actor.userId) {
      throw new ForbiddenError('Authentication required to create consent request.');
    }
    if (!dto.title || dto.title.trim().length === 0) {
      throw new ValidationError('Consent title is required.');
    }
    if (!dto.termsAndConditions || dto.termsAndConditions.trim().length === 0) {
      throw new ValidationError('Consent terms and legal conditions are required.');
    }

    const schoolId = actor.schoolId || 'school-001';
    const requestId = `consent-req-${Date.now()}`;

    const request = ParentConsentRequest.create(
      {
        schoolId,
        title: dto.title.trim(),
        category: dto.category || 'GENERAL',
        description: dto.description?.trim(),
        termsAndConditions: dto.termsAndConditions.trim(),
        version: 1,
        targetType: dto.targetType || 'WHOLE_SCHOOL',
        targetClassIds: dto.targetClassIds || [],
        targetStudentIds: dto.targetStudentIds || [],
        isMandatory: dto.isMandatory !== false,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        status: dto.status || 'PUBLISHED',
        createdByUserId: actor.userId,
        createdByName: actor.email || 'School Administrator'
      },
      requestId
    );

    await this.parentConsentRepository.saveRequest(request);

    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create(
            {
              schoolId,
              level: 'INFO',
              category: 'STUDENTS',
              action: 'PARENT_CONSENT_REQUEST_CREATED',
              actorUserId: actor.userId,
              actorRole: actor.role || 'ADMIN',
              status: 'SUCCESS',
              details: `Administrator created consent request: ${dto.title} (${dto.category}).`,
              metadata: {
                requestId: request.id,
                category: request.category,
                targetType: request.targetType
              }
            },
            IdGenerator.generate()
          )
        );
      } catch {}
    }

    return request.toJSON();
  }

  /**
   * Update consent request (bumps version if terms change)
   */
  public async updateConsentRequest(
    requestId: string,
    actor: UserContext,
    dto: Partial<CreateConsentRequestDTO>
  ) {
    const request = await this.parentConsentRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError('Consent Request', requestId);
    }

    const wordingChanged =
      (dto.title && dto.title.trim() !== request.title) ||
      (dto.termsAndConditions && dto.termsAndConditions.trim() !== request.termsAndConditions);

    if (wordingChanged) {
      request.updateWording(
        dto.title ? dto.title.trim() : request.title,
        dto.termsAndConditions ? dto.termsAndConditions.trim() : request.termsAndConditions,
        dto.description !== undefined ? dto.description.trim() : request.description,
        true // bumps version!
      );
    }

    if (dto.status) {
      if (dto.status === 'ARCHIVED') request.archive();
      else if (dto.status === 'PUBLISHED') request.publish();
    }

    await this.parentConsentRepository.saveRequest(request);
    return request.toJSON();
  }

  /**
   * Administrative Overview of all consent requests and metrics
   */
  public async getAdminConsentOverview(schoolId: string) {
    const requests = await this.parentConsentRepository.findRequestsBySchool(schoolId);
    const allStudents = await this.studentRepository.findAll();

    const overview = await Promise.all(
      requests.map(async r => {
        const responses = await this.parentConsentRepository.findResponsesByRequest(r.id);

        let eligibleCount = 0;
        if (r.targetType === 'WHOLE_SCHOOL') {
          eligibleCount = allStudents.length;
        } else if (r.targetType === 'GRADE' || r.targetType === 'STREAM') {
          eligibleCount = allStudents.filter(s =>
            (r.targetClassIds || []).some(
              t =>
                t.toLowerCase() === (s.gradeLevel || '').toLowerCase() ||
                t.toLowerCase() === (s.streamId || '').toLowerCase()
            )
          ).length;
        } else {
          eligibleCount = (r.targetStudentIds || []).length;
        }

        const consentedCount = responses.filter(resp => resp.decision === 'CONSENTED').length;
        const declinedCount = responses.filter(resp => resp.decision === 'DECLINED').length;
        const pendingCount = Math.max(0, eligibleCount - responses.length);

        return {
          ...r.toJSON(),
          metrics: {
            totalEligible: eligibleCount,
            totalResponded: responses.length,
            consentedCount,
            declinedCount,
            pendingCount,
            responseRatePercentage:
              eligibleCount > 0 ? Math.round((responses.length / eligibleCount) * 100) : 0
          }
        };
      })
    );

    return overview;
  }

  /**
   * Administrative Roster of all student responses for a specific consent request
   */
  public async getConsentDetailedResponses(requestId: string, schoolId: string) {
    const request = await this.parentConsentRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError('Consent Request', requestId);
    }

    const allStudents = await this.studentRepository.findAll();
    const responses = await this.parentConsentRepository.findResponsesByRequest(requestId);
    const responseMap = new Map(responses.map(resp => [resp.studentId, resp]));

    // Filter students by eligibility
    let eligibleStudents = allStudents;
    if (request.targetType === 'GRADE' || request.targetType === 'STREAM') {
      eligibleStudents = allStudents.filter(s =>
        (request.targetClassIds || []).some(
          t =>
            t.toLowerCase() === (s.gradeLevel || '').toLowerCase() ||
            t.toLowerCase() === (s.streamId || '').toLowerCase()
        )
      );
    } else if (request.targetType === 'INDIVIDUAL') {
      eligibleStudents = allStudents.filter(s =>
        (request.targetStudentIds || []).includes(s.id)
      );
    }

    const roster = eligibleStudents.map(student => {
      const resp = responseMap.get(student.id);
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        gradeLevel: student.gradeLevel,
        streamId: student.streamId,
        status: resp ? resp.decision : 'PENDING',
        consentVersion: resp?.consentVersion,
        parentName: resp?.parentName,
        parentPhone: resp?.parentPhone,
        parentNationalId: resp?.parentNationalId,
        parentRelationship: resp?.parentRelationship,
        notes: resp?.notes,
        submittedAt: resp?.submittedAt ? resp.submittedAt.toISOString() : undefined,
        signatureType: resp?.signatureType,
        signatureData: resp?.signatureData,
        signatureHash: resp?.signatureHash,
        responseId: resp?.id
      };
    });

    return {
      request: request.toJSON(),
      roster,
      summary: {
        totalEligible: roster.length,
        consented: roster.filter(r => r.status === 'CONSENTED').length,
        declined: roster.filter(r => r.status === 'DECLINED').length,
        pending: roster.filter(r => r.status === 'PENDING').length
      }
    };
  }
}
