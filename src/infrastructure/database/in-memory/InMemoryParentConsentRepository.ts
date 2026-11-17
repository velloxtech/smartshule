import { IParentConsentRepository } from '../../../core/ports/repositories/IParentConsentRepository';
import { ParentConsentRequest } from '../../../core/domain/consent/ParentConsentRequest';
import { ParentConsentResponse } from '../../../core/domain/consent/ParentConsentResponse';

export class InMemoryParentConsentRepository implements IParentConsentRepository {
  private requests: Map<string, ParentConsentRequest> = new Map();
  private responses: Map<string, ParentConsentResponse> = new Map();

  constructor() {
    this.seedDefaultRequests();
  }

  private seedDefaultRequests(): void {
    const r1 = ParentConsentRequest.create(
      {
        schoolId: 'school-001',
        title: 'Annual Academic Field Trips & Educational Excursions Consent (2026)',
        category: 'TRIP',
        description: 'Parental permission for learner participation in curriculum-aligned educational excursions, museum visits, and geographic field studies.',
        termsAndConditions: 'I, being the lawful parent/guardian of the specified learner, hereby grant permission for the child to participate in supervised academic and cultural field excursions organized by Grace Seeds School during the 2026 academic calendar. I authorize designated school educators and licensed school transport chaperones to supervise my child. In the event of an emergency requiring immediate medical attention, school personnel are authorized to secure reasonable emergency first aid and care. All school policies and the Constitution of Kenya Child Protection safeguards apply.',
        version: 1,
        targetType: 'WHOLE_SCHOOL',
        isMandatory: true,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        createdByName: 'Grace Seeds Administration Office'
      },
      'consent-req-001'
    );
    const r2 = ParentConsentRequest.create(
      {
        schoolId: 'school-001',
        title: 'Emergency Medical Treatment & Healthcare Authorization',
        category: 'MEDICAL',
        description: 'Authorization for school medical team and certified emergency health practitioners to administer first aid, prescribed medication, and hospital referral if needed.',
        termsAndConditions: 'I authorize the Grace Seeds School infirmary nurse, certified staff first aiders, and contracted healthcare emergency partners to administer necessary first aid and emergency clinical support to my child in case of acute illness or sudden injury during school hours or official school activities. I agree to disclose all known chronic ailments, medical allergies, and emergency contact directives to ensure the child is properly cared for in accordance with Article 53 of the Constitution of Kenya.',
        version: 1,
        targetType: 'WHOLE_SCHOOL',
        isMandatory: true,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        createdByName: 'School Health & Welfare Officer'
      },
      'consent-req-002'
    );
    const r3 = ParentConsentRequest.create(
      {
        schoolId: 'school-001',
        title: 'Photography, Video Recording & Media Publication Consent',
        category: 'MEDIA',
        description: 'Permission for the learner to appear in school newsletters, educational e-diaries, academic portfolios, and official school publications.',
        termsAndConditions: 'I consent / decline the capture and ethical use of photographic images and educational video recordings of my child participating in school events, academic exhibitions, music festivals, and sports competitions for official Grace Seeds School newsletters, visual CBC portfolios, and secure school communication channels. No child commercial exploitation or personal contact data shall ever be disclosed, strictly adhering to the Data Protection Act (2019) and Kenyan Child Online Protection Guidelines.',
        version: 1,
        targetType: 'WHOLE_SCHOOL',
        isMandatory: false,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        createdByName: 'Director of Communications'
      },
      'consent-req-003'
    );

    this.requests.set(r1.id, r1);
    this.requests.set(r2.id, r2);
    this.requests.set(r3.id, r3);
  }

  // Requests
  public async saveRequest(request: ParentConsentRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  public async findRequestById(id: string): Promise<ParentConsentRequest | null> {
    return this.requests.get(id) || null;
  }

  public async findRequestsBySchool(
    schoolId: string,
    options?: { status?: string; category?: string }
  ): Promise<ParentConsentRequest[]> {
    let list = Array.from(this.requests.values()).filter(r => r.schoolId === schoolId);
    if (options?.status) {
      list = list.filter(r => r.status === options.status);
    }
    if (options?.category) {
      list = list.filter(r => r.category === options.category);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Responses
  public async saveResponse(response: ParentConsentResponse): Promise<void> {
    this.responses.set(response.id, response);
  }

  public async findResponseById(id: string): Promise<ParentConsentResponse | null> {
    return this.responses.get(id) || null;
  }

  public async findLatestResponse(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse | null> {
    const list = Array.from(this.responses.values()).filter(
      r => r.consentRequestId === consentRequestId && r.studentId === studentId && r.isLatest
    );
    if (list.length === 0) return null;
    return list.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
  }

  public async findResponsesByRequest(consentRequestId: string): Promise<ParentConsentResponse[]> {
    return Array.from(this.responses.values()).filter(
      r => r.consentRequestId === consentRequestId && r.isLatest
    );
  }

  public async findResponsesByParent(parentUserId: string): Promise<ParentConsentResponse[]> {
    return Array.from(this.responses.values()).filter(
      r => r.parentUserId === parentUserId && r.isLatest
    );
  }

  public async findResponsesByStudent(studentId: string): Promise<ParentConsentResponse[]> {
    return Array.from(this.responses.values()).filter(
      r => r.studentId === studentId && r.isLatest
    );
  }

  public async findResponseHistory(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse[]> {
    return Array.from(this.responses.values())
      .filter(r => r.consentRequestId === consentRequestId && r.studentId === studentId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }
}
