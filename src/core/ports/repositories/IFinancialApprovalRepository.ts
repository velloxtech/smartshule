import { FinancialApprovalRequest } from '../../domain/finance/FinancialApprovalRequest';

export interface IFinancialApprovalRepository {
  save(request: FinancialApprovalRequest): Promise<void>;
  findById(id: string): Promise<FinancialApprovalRequest | null>;
  update(request: FinancialApprovalRequest): Promise<void>;
  findPending(schoolId?: string): Promise<FinancialApprovalRequest[]>;
  findByTargetRecord(targetRecordId: string): Promise<FinancialApprovalRequest[]>;
}
