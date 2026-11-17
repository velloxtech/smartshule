import { Pool } from 'pg';
import { IParentConsentRepository } from '../../../core/ports/repositories/IParentConsentRepository';
import { ParentConsentRequest } from '../../../core/domain/consent/ParentConsentRequest';
import { ParentConsentResponse } from '../../../core/domain/consent/ParentConsentResponse';

export class PostgresParentConsentRepository implements IParentConsentRepository {
  constructor(private readonly pool: Pool) {}

  private mapRequestRow(r: any): ParentConsentRequest {
    return ParentConsentRequest.create(
      {
        schoolId: r.school_id,
        title: r.title,
        category: r.category,
        description: r.description || undefined,
        termsAndConditions: r.terms_and_conditions,
        version: Number(r.version) || 1,
        targetType: r.target_type,
        targetClassIds: Array.isArray(r.target_class_ids)
          ? r.target_class_ids
          : typeof r.target_class_ids === 'string'
          ? JSON.parse(r.target_class_ids || '[]')
          : [],
        targetStudentIds: Array.isArray(r.target_student_ids)
          ? r.target_student_ids
          : typeof r.target_student_ids === 'string'
          ? JSON.parse(r.target_student_ids || '[]')
          : [],
        isMandatory: r.is_mandatory !== false,
        deadline: r.deadline ? new Date(r.deadline) : undefined,
        status: r.status,
        createdByUserId: r.created_by_user_id || undefined,
        createdByName: r.created_by_name || undefined,
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  private mapResponseRow(r: any): ParentConsentResponse {
    return ParentConsentResponse.create(
      {
        schoolId: r.school_id,
        consentRequestId: r.consent_request_id,
        consentVersion: Number(r.consent_version) || 1,
        studentId: r.student_id,
        parentUserId: r.parent_user_id,
        parentGuardianId: r.parent_guardian_id || undefined,
        parentName: r.parent_name,
        parentRelationship: r.parent_relationship || undefined,
        parentNationalId: r.parent_national_id || undefined,
        parentPhone: r.parent_phone || undefined,
        decision: r.decision,
        notes: r.notes || undefined,
        signatureType: r.signature_type || 'DRAWN',
        signatureData: r.signature_data || undefined,
        signatureHash: r.signature_hash || undefined,
        ipAddress: r.ip_address || undefined,
        userAgent: r.user_agent || undefined,
        submittedAt: r.submitted_at ? new Date(r.submitted_at) : new Date(),
        previousResponseId: r.previous_response_id || undefined,
        isLatest: r.is_latest !== false,
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async saveRequest(request: ParentConsentRequest): Promise<void> {
    const q = `
      INSERT INTO parent_consent_requests (
        id, school_id, title, category, description, terms_and_conditions,
        version, target_type, target_class_ids, target_student_ids,
        is_mandatory, deadline, status, created_by_user_id, created_by_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        terms_and_conditions = EXCLUDED.terms_and_conditions,
        version = EXCLUDED.version,
        target_type = EXCLUDED.target_type,
        target_class_ids = EXCLUDED.target_class_ids,
        target_student_ids = EXCLUDED.target_student_ids,
        is_mandatory = EXCLUDED.is_mandatory,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(q, [
      request.id,
      request.schoolId,
      request.title,
      request.category,
      request.description || null,
      request.termsAndConditions,
      request.version,
      request.targetType,
      JSON.stringify(request.targetClassIds || []),
      JSON.stringify(request.targetStudentIds || []),
      request.isMandatory,
      request.deadline || null,
      request.status,
      request.createdByUserId || null,
      request.createdByName || null,
      request.createdAt,
      request.updatedAt,
    ]);
  }

  public async findRequestById(id: string): Promise<ParentConsentRequest | null> {
    const res = await this.pool.query('SELECT * FROM parent_consent_requests WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRequestRow(res.rows[0]);
  }

  public async findRequestsBySchool(
    schoolId: string,
    options?: { status?: string; category?: string }
  ): Promise<ParentConsentRequest[]> {
    let q = 'SELECT * FROM parent_consent_requests WHERE school_id = $1';
    const params: any[] = [schoolId];
    if (options?.status) {
      params.push(options.status);
      q += ` AND status = $${params.length}`;
    }
    if (options?.category) {
      params.push(options.category);
      q += ` AND category = $${params.length}`;
    }
    q += ' ORDER BY created_at DESC';
    const res = await this.pool.query(q, params);
    return res.rows.map(r => this.mapRequestRow(r));
  }

  public async saveResponse(response: ParentConsentResponse): Promise<void> {
    const q = `
      INSERT INTO parent_consent_responses (
        id, school_id, consent_request_id, consent_version, student_id,
        parent_user_id, parent_guardian_id, parent_name, parent_relationship,
        parent_national_id, parent_phone, decision, notes, signature_type,
        signature_data, signature_hash, ip_address, user_agent,
        submitted_at, previous_response_id, is_latest, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23
      )
      ON CONFLICT (id) DO UPDATE SET
        decision = EXCLUDED.decision,
        notes = EXCLUDED.notes,
        signature_type = EXCLUDED.signature_type,
        signature_data = EXCLUDED.signature_data,
        signature_hash = EXCLUDED.signature_hash,
        is_latest = EXCLUDED.is_latest,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(q, [
      response.id,
      response.schoolId,
      response.consentRequestId,
      response.consentVersion,
      response.studentId,
      response.parentUserId,
      response.parentGuardianId || null,
      response.parentName,
      response.parentRelationship || 'PARENT',
      response.parentNationalId || null,
      response.parentPhone || null,
      response.decision,
      response.notes || null,
      response.signatureType,
      response.signatureData || null,
      response.signatureHash || null,
      response.ipAddress || null,
      response.userAgent || null,
      response.submittedAt,
      response.previousResponseId || null,
      response.isLatest,
      response.createdAt,
      response.updatedAt,
    ]);
  }

  public async findResponseById(id: string): Promise<ParentConsentResponse | null> {
    const res = await this.pool.query('SELECT * FROM parent_consent_responses WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapResponseRow(res.rows[0]);
  }

  public async findLatestResponse(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse | null> {
    const res = await this.pool.query(
      'SELECT * FROM parent_consent_responses WHERE consent_request_id = $1 AND student_id = $2 AND is_latest = true ORDER BY submitted_at DESC LIMIT 1',
      [consentRequestId, studentId]
    );
    if (res.rows.length === 0) return null;
    return this.mapResponseRow(res.rows[0]);
  }

  public async findResponsesByRequest(consentRequestId: string): Promise<ParentConsentResponse[]> {
    const res = await this.pool.query(
      'SELECT * FROM parent_consent_responses WHERE consent_request_id = $1 AND is_latest = true ORDER BY submitted_at DESC',
      [consentRequestId]
    );
    return res.rows.map(r => this.mapResponseRow(r));
  }

  public async findResponsesByParent(parentUserId: string): Promise<ParentConsentResponse[]> {
    const res = await this.pool.query(
      'SELECT * FROM parent_consent_responses WHERE parent_user_id = $1 AND is_latest = true ORDER BY submitted_at DESC',
      [parentUserId]
    );
    return res.rows.map(r => this.mapResponseRow(r));
  }

  public async findResponsesByStudent(studentId: string): Promise<ParentConsentResponse[]> {
    const res = await this.pool.query(
      'SELECT * FROM parent_consent_responses WHERE student_id = $1 AND is_latest = true ORDER BY submitted_at DESC',
      [studentId]
    );
    return res.rows.map(r => this.mapResponseRow(r));
  }

  public async findResponseHistory(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse[]> {
    const res = await this.pool.query(
      'SELECT * FROM parent_consent_responses WHERE consent_request_id = $1 AND student_id = $2 ORDER BY submitted_at DESC',
      [consentRequestId, studentId]
    );
    return res.rows.map(r => this.mapResponseRow(r));
  }
}
