import { ParentConsentRequest } from '../../domain/consent/ParentConsentRequest';
import { ParentConsentResponse } from '../../domain/consent/ParentConsentResponse';

export interface IParentConsentRepository {
  // Requests
  saveRequest(request: ParentConsentRequest): Promise<void>;
  findRequestById(id: string): Promise<ParentConsentRequest | null>;
  findRequestsBySchool(
    schoolId: string,
    options?: { status?: string; category?: string }
  ): Promise<ParentConsentRequest[]>;

  // Responses
  saveResponse(response: ParentConsentResponse): Promise<void>;
  findResponseById(id: string): Promise<ParentConsentResponse | null>;
  findLatestResponse(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse | null>;
  findResponsesByRequest(consentRequestId: string): Promise<ParentConsentResponse[]>;
  findResponsesByParent(parentUserId: string): Promise<ParentConsentResponse[]>;
  findResponsesByStudent(studentId: string): Promise<ParentConsentResponse[]>;
  findResponseHistory(
    consentRequestId: string,
    studentId: string
  ): Promise<ParentConsentResponse[]>;
}
