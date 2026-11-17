import { Entity } from '../shared/Entity';
import { UserRole } from '../user/User';

export enum TransactionReversalStatus {
  PENDING_ADMIN_APPROVAL = 'PENDING_ADMIN_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum ReversibleTransactionType {
  PAYMENT = 'PAYMENT',
  CREDIT_UTILIZATION = 'CREDIT_UTILIZATION',
  FEE_ALLOCATION = 'FEE_ALLOCATION',
  MANUAL_ARREAR = 'MANUAL_ARREAR',
  OTHER = 'OTHER'
}

export interface TransactionReversalAuditEntry {
  action: 'REQUESTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRIED';
  performedByUserId: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface DependentFinancialTransaction {
  type: string;
  reference: string;
  description: string;
  amount: number;
  date?: string;
  invoiceId?: string;
  creditId?: string;
  status: string;
  impactOnReversal: string;
}

export interface FinancialImpactPreview {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gradeLevel?: string;
  transactionType: ReversibleTransactionType | string;
  transactionReference: string;
  originalReceiptNumber?: string;
  originalAmount: number;
  transactionDate: string;
  currentOutstandingBalance: number;
  currentArrears: number;
  currentFeesThisTerm: number;
  currentAvailableCredit: number;
  currentCreditUtilized: number;
  dependentTransactions: DependentFinancialTransaction[];
  hasBlockingDependencies: boolean;
  blockingReason?: string;
  projectedOutstandingBalance: number;
  projectedCreditBalance: number;
  projectedArrears: number;
  impactSummary: string;
}

export interface ReversalReceiptPayload {
  reversalReceiptNumber: string;
  requestReference: string;
  originalTransactionReference: string;
  originalReceiptNumber?: string;
  transactionType: string;
  schoolId: string;
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
  schoolLogoUrl?: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gradeLevel?: string;
  parentName?: string;
  originalAmount: number;
  amountReversed: number;
  requestedByName: string;
  requestedByRole: string;
  requestDate: string;
  bursarReason: string;
  additionalExplanation?: string;
  approvedByName: string;
  approvedByRole: string;
  approvalDate: string;
  approvalComment?: string;
  executionDate: string;
  status: 'COMPLETED';
  resultingBalances: {
    outstandingBalance: number;
    availableCredit: number;
    arrears: number;
  };
  relatedAllocations?: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amountReversed: number;
    resultingBalance: number;
  }>;
  mandatoryNoticeStatement: string;
}

export interface TransactionReversalRequestProps {
  schoolId: string;
  requestReference: string; // e.g. REV-REQ-YYYY-XXXXX
  transactionType: ReversibleTransactionType;
  transactionId: string;
  transactionReference: string;
  originalReceiptNumber?: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  originalAmount: number;
  requestedReversalAmount: number;
  transactionDate: string;
  reason: string;
  explanation?: string;
  supportingAttachmentUrl?: string;
  status: TransactionReversalStatus;
  requestedByUserId: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: Date;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  approvalComment?: string;
  rejectionReason?: string;
  reversalReceiptNumber?: string;
  reversalReceiptPayload?: ReversalReceiptPayload;
  financialImpactPreview?: FinancialImpactPreview;
  errorMessage?: string;
  auditTrail: TransactionReversalAuditEntry[];
}

export class TransactionReversalRequest extends Entity<TransactionReversalRequestProps> {
  public static create(
    props: Omit<TransactionReversalRequestProps, 'auditTrail' | 'requestedAt'> & {
      requestedAt?: Date;
      auditTrail?: TransactionReversalAuditEntry[];
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): TransactionReversalRequest {
    const requestedAt = props.requestedAt || new Date();
    const initialAudit: TransactionReversalAuditEntry[] = props.auditTrail || [
      {
        action: 'REQUESTED',
        performedByUserId: props.requestedByUserId,
        performedByName: props.requestedByName,
        performedByRole: props.requestedByRole,
        timestamp: requestedAt.toISOString(),
        notes: `Reversal requested. Reason: ${props.reason}`
      }
    ];

    const fullProps: TransactionReversalRequestProps = {
      ...props,
      requestedAt,
      auditTrail: initialAudit
    };

    return new TransactionReversalRequest(fullProps, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get requestReference(): string {
    return this._props.requestReference;
  }

  public get transactionType(): ReversibleTransactionType {
    return this._props.transactionType;
  }

  public get transactionId(): string {
    return this._props.transactionId;
  }

  public get transactionReference(): string {
    return this._props.transactionReference;
  }

  public get originalReceiptNumber(): string | undefined {
    return this._props.originalReceiptNumber;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get studentName(): string {
    return this._props.studentName;
  }

  public get admissionNumber(): string {
    return this._props.admissionNumber;
  }

  public get originalAmount(): number {
    return this._props.originalAmount;
  }

  public get requestedReversalAmount(): number {
    return this._props.requestedReversalAmount;
  }

  public get transactionDate(): string {
    return this._props.transactionDate;
  }

  public get reason(): string {
    return this._props.reason;
  }

  public get explanation(): string | undefined {
    return this._props.explanation;
  }

  public get supportingAttachmentUrl(): string | undefined {
    return this._props.supportingAttachmentUrl;
  }

  public get status(): TransactionReversalStatus {
    return this._props.status;
  }

  public get requestedByUserId(): string {
    return this._props.requestedByUserId;
  }

  public get requestedByName(): string {
    return this._props.requestedByName;
  }

  public get requestedByRole(): string {
    return this._props.requestedByRole;
  }

  public get requestedAt(): Date {
    return this._props.requestedAt;
  }

  public get reviewedByUserId(): string | undefined {
    return this._props.reviewedByUserId;
  }

  public get reviewedByName(): string | undefined {
    return this._props.reviewedByName;
  }

  public get reviewedAt(): Date | undefined {
    return this._props.reviewedAt;
  }

  public get approvalComment(): string | undefined {
    return this._props.approvalComment;
  }

  public get rejectionReason(): string | undefined {
    return this._props.rejectionReason;
  }

  public get reversalReceiptNumber(): string | undefined {
    return this._props.reversalReceiptNumber;
  }

  public get reversalReceiptPayload(): ReversalReceiptPayload | undefined {
    return this._props.reversalReceiptPayload;
  }

  public get financialImpactPreview(): FinancialImpactPreview | undefined {
    return this._props.financialImpactPreview;
  }

  public get errorMessage(): string | undefined {
    return this._props.errorMessage;
  }

  public get auditTrail(): TransactionReversalAuditEntry[] {
    return this._props.auditTrail || [];
  }

  public setFinancialImpactPreview(preview: FinancialImpactPreview): void {
    this._props.financialImpactPreview = preview;
    this.touch();
  }

  public approve(adminUserId: string, adminName: string, comment?: string): void {
    this._props.status = TransactionReversalStatus.APPROVED;
    this._props.reviewedByUserId = adminUserId;
    this._props.reviewedByName = adminName;
    this._props.reviewedAt = new Date();
    this._props.approvalComment = comment?.trim();
    this.addAuditEntry('APPROVED', adminUserId, adminName, 'ADMIN', comment ? `Approved with comment: ${comment}` : 'Approved reversal request');
    this.touch();
  }

  public reject(adminUserId: string, adminName: string, reason: string): void {
    this._props.status = TransactionReversalStatus.REJECTED;
    this._props.reviewedByUserId = adminUserId;
    this._props.reviewedByName = adminName;
    this._props.reviewedAt = new Date();
    this._props.rejectionReason = reason.trim();
    this.addAuditEntry('REJECTED', adminUserId, adminName, 'ADMIN', `Rejected reversal request. Reason: ${reason}`);
    this.touch();
  }

  public markProcessing(adminUserId: string, adminName: string): void {
    this._props.status = TransactionReversalStatus.PROCESSING;
    this.addAuditEntry('PROCESSING', adminUserId, adminName, 'ADMIN', 'Execution started');
    this.touch();
  }

  public markCompleted(reversalReceiptNumber: string, payload: ReversalReceiptPayload, adminUserId: string, adminName: string): void {
    this._props.status = TransactionReversalStatus.COMPLETED;
    this._props.reversalReceiptNumber = reversalReceiptNumber;
    this._props.reversalReceiptPayload = payload;
    this._props.errorMessage = undefined;
    this.addAuditEntry(
      'COMPLETED',
      adminUserId,
      adminName,
      'ADMIN',
      `Reversal successfully executed. Document #${reversalReceiptNumber} generated.`
    );
    this.touch();
  }

  public markFailed(error: string, adminUserId: string, adminName: string): void {
    this._props.status = TransactionReversalStatus.FAILED;
    this._props.errorMessage = error;
    this.addAuditEntry('FAILED', adminUserId, adminName, 'ADMIN', `Reversal execution failed: ${error}`);
    this.touch();
  }

  public retry(adminUserId: string, adminName: string): void {
    this._props.status = TransactionReversalStatus.PENDING_ADMIN_APPROVAL;
    this._props.errorMessage = undefined;
    this.addAuditEntry('RETRIED', adminUserId, adminName, 'ADMIN', 'Reversal execution retried by administrator');
    this.touch();
  }

  private addAuditEntry(
    action: TransactionReversalAuditEntry['action'],
    userId: string,
    userName: string,
    role: string,
    notes?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this._props.auditTrail) {
      this._props.auditTrail = [];
    }
    this._props.auditTrail.push({
      action,
      performedByUserId: userId,
      performedByName: userName,
      performedByRole: role,
      timestamp: new Date().toISOString(),
      notes,
      metadata
    });
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      schoolId: this.schoolId,
      requestReference: this.requestReference,
      transactionType: this.transactionType,
      transactionId: this.transactionId,
      transactionReference: this.transactionReference,
      originalReceiptNumber: this.originalReceiptNumber,
      studentId: this.studentId,
      studentName: this.studentName,
      admissionNumber: this.admissionNumber,
      originalAmount: this.originalAmount,
      requestedReversalAmount: this.requestedReversalAmount,
      transactionDate: this.transactionDate,
      reason: this.reason,
      explanation: this.explanation,
      supportingAttachmentUrl: this.supportingAttachmentUrl,
      status: this.status,
      requestedByUserId: this.requestedByUserId,
      requestedByName: this.requestedByName,
      requestedByRole: this.requestedByRole,
      requestedAt: this.requestedAt.toISOString(),
      reviewedByUserId: this.reviewedByUserId,
      reviewedByName: this.reviewedByName,
      reviewedAt: this.reviewedAt ? this.reviewedAt.toISOString() : undefined,
      approvalComment: this.approvalComment,
      rejectionReason: this.rejectionReason,
      reversalReceiptNumber: this.reversalReceiptNumber,
      reversalReceiptPayload: this.reversalReceiptPayload,
      financialImpactPreview: this.financialImpactPreview,
      errorMessage: this.errorMessage,
      auditTrail: this.auditTrail,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
