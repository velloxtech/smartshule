import * as crypto from 'crypto';

export type FinancialActionType =
  | 'PAYMENT_REVERSAL'
  | 'PAYMENT_CORRECTION'
  | 'INVOICE_VOID'
  | 'INVOICE_CORRECTION'
  | 'PAYROLL_REVERSAL'
  | 'PAYROLL_CORRECTION';

export type FinancialTargetRecordType = 'PAYMENT' | 'INVOICE' | 'PAYROLL';

export type FinancialApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface FinancialApprovalRequestProps {
  id: string;
  schoolId: string;
  actionType: FinancialActionType;
  targetRecordType: FinancialTargetRecordType;
  targetRecordId: string;
  requestingUserId: string;
  requestingUserName?: string;
  approverUserId?: string;
  approverDestination: string;
  channel: 'SMS' | 'EMAIL';
  codeHash: string;
  originalData: any;
  proposedData: any;
  reason: string;
  status: FinancialApprovalStatus;
  attempts: number;
  expiresAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FinancialApprovalRequest {
  constructor(private props: FinancialApprovalRequestProps) {}

  public static hashCode(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  public static create(
    data: Omit<FinancialApprovalRequestProps, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>,
    id: string
  ): FinancialApprovalRequest {
    return new FinancialApprovalRequest({
      ...data,
      id,
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public get id(): string { return this.props.id; }
  public get schoolId(): string { return this.props.schoolId; }
  public get actionType(): FinancialActionType { return this.props.actionType; }
  public get targetRecordType(): FinancialTargetRecordType { return this.props.targetRecordType; }
  public get targetRecordId(): string { return this.props.targetRecordId; }
  public get requestingUserId(): string { return this.props.requestingUserId; }
  public get requestingUserName(): string | undefined { return this.props.requestingUserName; }
  public get approverUserId(): string | undefined { return this.props.approverUserId; }
  public get approverDestination(): string { return this.props.approverDestination; }
  public get channel(): 'SMS' | 'EMAIL' { return this.props.channel; }
  public get codeHash(): string { return this.props.codeHash; }
  public get originalData(): any { return this.props.originalData; }
  public get proposedData(): any { return this.props.proposedData; }
  public get reason(): string { return this.props.reason; }
  public get status(): FinancialApprovalStatus { return this.props.status; }
  public get attempts(): number { return this.props.attempts; }
  public get expiresAt(): Date { return this.props.expiresAt; }
  public get approvedAt(): Date | undefined { return this.props.approvedAt; }
  public get rejectedAt(): Date | undefined { return this.props.rejectedAt; }
  public get rejectionReason(): string | undefined { return this.props.rejectionReason; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public isExpired(): boolean {
    return Date.now() > this.props.expiresAt.getTime() || this.props.status === 'EXPIRED';
  }

  public verifyCode(inputCode: string): boolean {
    const inputHash = FinancialApprovalRequest.hashCode(inputCode);
    return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(this.props.codeHash));
  }

  public incrementAttempts(): void {
    this.props.attempts += 1;
    this.props.updatedAt = new Date();
    if (this.props.attempts >= 3) {
      this.props.status = 'REJECTED';
      this.props.rejectedAt = new Date();
      this.props.rejectionReason = 'Maximum verification attempts exceeded';
    }
  }

  public approve(approverUserId: string): void {
    this.props.status = 'APPROVED';
    this.props.approverUserId = approverUserId;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public reject(reason: string, approverUserId?: string): void {
    this.props.status = 'REJECTED';
    this.props.approverUserId = approverUserId;
    this.props.rejectionReason = reason;
    this.props.rejectedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markExpired(): void {
    this.props.status = 'EXPIRED';
    this.props.updatedAt = new Date();
  }

  public toJSON(): any {
    return {
      id: this.props.id,
      schoolId: this.props.schoolId,
      actionType: this.props.actionType,
      targetRecordType: this.props.targetRecordType,
      targetRecordId: this.props.targetRecordId,
      requestingUserId: this.props.requestingUserId,
      requestingUserName: this.props.requestingUserName,
      approverUserId: this.props.approverUserId,
      approverDestination: this.props.approverDestination,
      channel: this.props.channel,
      originalData: this.props.originalData,
      proposedData: this.props.proposedData,
      reason: this.props.reason,
      status: this.props.status,
      attempts: this.props.attempts,
      expiresAt: this.props.expiresAt.toISOString(),
      approvedAt: this.props.approvedAt ? this.props.approvedAt.toISOString() : undefined,
      rejectedAt: this.props.rejectedAt ? this.props.rejectedAt.toISOString() : undefined,
      rejectionReason: this.props.rejectionReason,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
