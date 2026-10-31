import * as crypto from 'crypto';
import {
  FinancialApprovalRequest,
  FinancialActionType,
  FinancialTargetRecordType
} from '../../core/domain/finance/FinancialApprovalRequest';
import { IFinancialApprovalRepository } from '../../core/ports/repositories/IFinancialApprovalRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';
import { IPayrollRepository } from '../../core/ports/repositories/IPayrollRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import { UserRole, UserStatus, isBillingAuthorizedRole } from '../../core/domain/user/User';
import { PaymentStatus, InvoiceStatus } from '../../core/domain/finance/Fee';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import { EmailTemplateEngine } from '../../infrastructure/services/email/EmailTemplateEngine';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  IdGenerator
} from '../../core/domain/shared/Errors';

export interface RequestFinancialApprovalDTO {
  schoolId: string;
  actionType: FinancialActionType;
  targetRecordType: FinancialTargetRecordType;
  targetRecordId: string;
  proposedData?: any;
  reason: string;
  preferredChannel?: 'SMS' | 'EMAIL';
  approverUserId?: string;
}

export interface VerifyAndExecuteApprovalDTO {
  requestId: string;
  code: string;
}

export interface RejectApprovalDTO {
  requestId: string;
  reason: string;
}

export interface UserContext {
  userId: string;
  role: string;
  email?: string;
  name?: string;
  schoolId?: string;
}

export class FinancialApprovalUseCases {
  constructor(
    private readonly approvalRepository: IFinancialApprovalRepository,
    private readonly userRepository: IUserRepository,
    private readonly feeRepository: IFeeRepository,
    private readonly notificationService: INotificationService,
    private readonly payrollRepository?: IPayrollRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  /**
   * Masks sensitive contact details for secure user-facing responses
   * (e.g., "d***@school.org" or "+254***789")
   */
  private maskContact(contact: string): string {
    if (!contact) return '';
    if (contact.includes('@')) {
      const [user, domain] = contact.split('@');
      const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user[user.length - 1];
      return `${maskedUser}@${domain}`;
    }
    const clean = contact.trim();
    if (clean.length <= 4) return '***' + clean;
    return clean.slice(0, 4) + '***' + clean.slice(-3);
  }

  /**
   * 1. Request an approval code for a sensitive financial change
   */
  public async requestApproval(dto: RequestFinancialApprovalDTO, requestingUser: UserContext) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new ValidationError('A detailed reason (at least 5 characters) is required for financial modification approval.');
    }

    if (!isBillingAuthorizedRole(requestingUser.role) && requestingUser.role !== 'SUPER_ADMIN' && requestingUser.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to request financial modifications.');
    }

    // 1. Snapshot original data from target record
    let originalData: any = {};
    if (dto.targetRecordType === 'PAYMENT') {
      const payment = await this.feeRepository.findPaymentById(dto.targetRecordId);
      if (!payment) throw new NotFoundError('Payment Record', dto.targetRecordId);
      if (payment.status === PaymentStatus.FAILED || (payment.status as any) === 'REVERSED' || (payment.status as any) === 'VOIDED') {
        throw new ConflictError(`Payment ${dto.targetRecordId} is already marked as ${payment.status} and cannot be modified.`);
      }
      originalData = payment.toJSON();
    } else if (dto.targetRecordType === 'INVOICE') {
      const invoice = await this.feeRepository.findInvoiceById(dto.targetRecordId);
      if (!invoice) throw new NotFoundError('Invoice Record', dto.targetRecordId);
      originalData = invoice.toJSON();
    } else if (dto.targetRecordType === 'PAYROLL') {
      if (!this.payrollRepository) throw new NotFoundError('Payroll Repository not configured', dto.targetRecordId);
      const payroll = await this.payrollRepository.findPayrollById(dto.targetRecordId);
      if (!payroll) throw new NotFoundError('Payroll Record', dto.targetRecordId);
      originalData = payroll.toJSON ? payroll.toJSON() : payroll;
    } else {
      throw new ValidationError(`Unsupported target record type: ${dto.targetRecordType}`);
    }

    // 2. Identify the designated verified administrator
    const allUsers = await this.userRepository.findAll();
    const authorizedAdmins = allUsers.filter(u =>
      (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) &&
      u.status === UserStatus.ACTIVE
    );

    if (authorizedAdmins.length === 0) {
      throw new ValidationError(
        'No active administrator account found in the system to issue approval codes. Please contact system support.'
      );
    }

    let designatedAdmin = dto.approverUserId
      ? authorizedAdmins.find(u => u.id === dto.approverUserId)
      : authorizedAdmins.find(u => u.id !== requestingUser.userId) || authorizedAdmins[0];

    if (!designatedAdmin) {
      designatedAdmin = authorizedAdmins[0];
    }

    // Prevent a user from being their own approver if there is another administrator available
    if (designatedAdmin.id === requestingUser.userId && authorizedAdmins.length > 1) {
      const altAdmin = authorizedAdmins.find(u => u.id !== requestingUser.userId);
      if (altAdmin) designatedAdmin = altAdmin;
    }

    const channel = dto.preferredChannel === 'SMS' && designatedAdmin.phone ? 'SMS' : (designatedAdmin.email ? 'EMAIL' : (designatedAdmin.phone ? 'SMS' : null));
    if (!channel) {
      throw new ValidationError(
        `Configured administrator ${designatedAdmin.firstName} ${designatedAdmin.lastName} does not have a registered email or phone number configured for approval codes. Please update their profile contact details.`
      );
    }

    const destination = channel === 'SMS' ? designatedAdmin.phone! : designatedAdmin.email!;

    // 3. Generate secure, cryptographically random 6-digit code
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = FinancialApprovalRequest.hashCode(rawCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const request = FinancialApprovalRequest.create(
      {
        schoolId: dto.schoolId || designatedAdmin.schoolId || 'school-001',
        actionType: dto.actionType,
        targetRecordType: dto.targetRecordType,
        targetRecordId: dto.targetRecordId,
        requestingUserId: requestingUser.userId,
        requestingUserName: requestingUser.name || requestingUser.email || requestingUser.userId,
        approverUserId: designatedAdmin.id,
        approverDestination: destination,
        channel,
        codeHash,
        originalData,
        proposedData: dto.proposedData || {},
        reason: dto.reason.trim(),
        expiresAt
      },
      IdGenerator.generate()
    );

    await this.approvalRepository.save(request);

    // 4. Dispatch code directly to approver (never log code or expose in response)
    const actionDesc = dto.actionType.replace(/_/g, ' ').toLowerCase();
    if (channel === 'SMS') {
      const smsMessage = `SmartShule: Approval code for ${actionDesc} on ${dto.targetRecordType} #${dto.targetRecordId} requested by ${requestingUser.name || requestingUser.userId} is ${rawCode}. Valid for 5 mins. Do not share.`;
      try {
        await this.notificationService.sendSms(destination, smsMessage);
      } catch (err: any) {
        console.error('[FinancialApproval] Failed to dispatch SMS code:', err.message);
      }
    } else {
      const rendered = EmailTemplateEngine.renderFinancialApprovalOtpEmail({
        to: destination,
        approverName: `${designatedAdmin.firstName} ${designatedAdmin.lastName}`.trim(),
        actionType: dto.actionType,
        targetRecordType: dto.targetRecordType,
        targetRecordId: dto.targetRecordId,
        reason: dto.reason,
        requesterName: requestingUser.name || requestingUser.userId,
        otpCode: rawCode,
        expiryMinutes: 5
      });
      try {
        await this.notificationService.sendEmail(destination, rendered.subject, rendered.text, rendered.html);
      } catch (err: any) {
        console.error('[FinancialApproval] Failed to dispatch Email code:', err.message);
      }
    }

    return {
      success: true,
      requestId: request.id,
      expiresAt: request.expiresAt.toISOString(),
      channel,
      destinationMasked: this.maskContact(destination),
      approverName: `${designatedAdmin.firstName} ${designatedAdmin.lastName}`,
      message: `Approval code sent to registered ${channel} (${this.maskContact(destination)}). Code expires in 5 minutes.`
    };
  }

  /**
   * 2. Verify code and execute approved financial modification
   */
  public async verifyAndExecute(dto: VerifyAndExecuteApprovalDTO, approverUser: UserContext) {
    if (!dto.code || !dto.code.trim()) {
      throw new ValidationError('Approval code is required.');
    }

    const request = await this.approvalRepository.findById(dto.requestId);
    if (!request) {
      throw new NotFoundError('FinancialApprovalRequest', dto.requestId);
    }

    if (request.status === 'APPROVED') {
      throw new ConflictError('This financial approval request has already been executed.');
    }

    if (request.status === 'REJECTED') {
      throw new ConflictError(`This approval request was rejected (${request.rejectionReason || 'Rejected'}). Please submit a new request.`);
    }

    if (request.isExpired()) {
      request.markExpired();
      await this.approvalRepository.update(request);
      throw new ValidationError('Approval code has expired. Please request a new approval code.');
    }

    // Role-based authorization: approver must have administrative authority
    if (approverUser.role !== UserRole.SUPER_ADMIN && approverUser.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only authorized system administrators can verify and authorize financial changes.');
    }

    // Prevent self-approval
    if (request.requestingUserId === approverUser.userId) {
      throw new ForbiddenError(
        'Users cannot approve their own financial correction or deletion requests. Another authorized administrator must verify and approve.'
      );
    }

    // Verify OTP code
    const isCodeValid = request.verifyCode(dto.code);
    if (!isCodeValid) {
      request.incrementAttempts();
      await this.approvalRepository.update(request);
      if ((request.status as string) === 'REJECTED') {
        throw new ValidationError('Maximum verification attempts (3) exceeded. This approval request has been cancelled.');
      }
      const remaining = 3 - request.attempts;
      throw new ValidationError(`Invalid approval code. ${remaining} attempt(s) remaining.`);
    }

    // Execute the approved action while preserving accounting history
    let executionResult: any = null;

    if (request.actionType === 'PAYMENT_REVERSAL') {
      executionResult = await this.executePaymentReversal(request, approverUser);
    } else if (request.actionType === 'PAYMENT_CORRECTION') {
      executionResult = await this.executePaymentCorrection(request, approverUser);
    } else if (request.actionType === 'INVOICE_VOID') {
      executionResult = await this.executeInvoiceVoid(request, approverUser);
    } else if (request.actionType === 'INVOICE_CORRECTION') {
      executionResult = await this.executeInvoiceCorrection(request, approverUser);
    } else if (request.actionType === 'PAYROLL_REVERSAL') {
      executionResult = await this.executePayrollReversal(request, approverUser);
    } else {
      throw new ValidationError(`Action type '${request.actionType}' is not supported for execution.`);
    }

    // Mark request as APPROVED
    request.approve(approverUser.userId);
    await this.approvalRepository.update(request);

    // Record immutable audit trail
    if (this.systemLogRepository) {
      try {
        await this.systemLogRepository.create(
          SystemLog.create({
            schoolId: request.schoolId,
            level: 'AUDIT',
            category: 'FINANCE',
            action: `FINANCIAL_${request.actionType}_EXECUTED`,
            actorUserId: approverUser.userId,
            actorEmail: approverUser.email,
            actorRole: approverUser.role,
            status: 'SUCCESS',
            details: `Approved ${request.actionType} on ${request.targetRecordType} ${request.targetRecordId}. Reason: ${request.reason}. Requestor: ${request.requestingUserName || request.requestingUserId}`,
            metadata: {
              requestId: request.id,
              actionType: request.actionType,
              targetRecordId: request.targetRecordId,
              originalData: request.originalData,
              proposedData: request.proposedData,
              approverUserId: approverUser.userId
            }
          }, IdGenerator.generate())
        );
      } catch (logErr: any) {
        console.error('[FinancialApproval] Failed to record system log:', logErr.message);
      }
    }

    return {
      success: true,
      message: `Financial modification (${request.actionType}) successfully authorized and applied.`,
      result: executionResult,
      request: request.toJSON()
    };
  }

  /**
   * 3. Reject an approval request
   */
  public async rejectApproval(dto: RejectApprovalDTO, rejectingUser: UserContext) {
    const request = await this.approvalRepository.findById(dto.requestId);
    if (!request) throw new NotFoundError('FinancialApprovalRequest', dto.requestId);

    if (request.status !== 'PENDING') {
      throw new ConflictError(`Request is already in '${request.status}' state and cannot be rejected.`);
    }

    request.reject(dto.reason || 'Rejected by administrator', rejectingUser.userId);
    await this.approvalRepository.update(request);

    return {
      success: true,
      message: 'Financial approval request has been rejected.',
      request: request.toJSON()
    };
  }

  /**
   * 4. List pending approvals
   */
  public async getPendingApprovals(schoolId?: string, user?: UserContext) {
    const requests = await this.approvalRepository.findPending(schoolId);
    return requests.map(r => ({
      ...r.toJSON(),
      approverDestinationMasked: this.maskContact(r.approverDestination)
    }));
  }

  // --- INTERNAL OPERATION EXECUTORS (AUDIT-SAFE REVERSALS & CORRECTIONS) ---

  private async executePaymentReversal(request: FinancialApprovalRequest, approver: UserContext) {
    const payment = await this.feeRepository.findPaymentById(request.targetRecordId);
    if (!payment) throw new NotFoundError('Payment', request.targetRecordId);

    if (payment.status === PaymentStatus.FAILED || (payment.status as any) === 'REVERSED') {
      throw new ConflictError('Payment is already reversed.');
    }

    // 1. Mark payment as REVERSED (preserve record, do NOT delete)
    payment.setStatus(PaymentStatus.FAILED);
    const updatedNotes = `${payment.notes || ''} | REVERSED via Approval #${request.id} by ${approver.userId}. Reason: ${request.reason}`;
    (payment as any)._props.notes = updatedNotes;
    await this.feeRepository.updatePayment(payment);

    // 2. Reverse allocated amount from invoice balance
    if (payment.invoiceId) {
      const invoice = await this.feeRepository.findInvoiceById(payment.invoiceId);
      if (invoice) {
        const reversedAmount = payment.amount;
        invoice.recordPayment(-reversedAmount);
        await this.feeRepository.updateInvoice(invoice);
      }
    }

    return { paymentId: payment.id, reversedAmount: payment.amount, status: 'REVERSED' };
  }

  private async executePaymentCorrection(request: FinancialApprovalRequest, approver: UserContext) {
    const payment = await this.feeRepository.findPaymentById(request.targetRecordId);
    if (!payment) throw new NotFoundError('Payment', request.targetRecordId);

    const newAmount = Number(request.proposedData?.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      throw new ValidationError('A valid corrected payment amount greater than zero is required.');
    }

    const oldAmount = payment.amount;
    const diff = newAmount - oldAmount;

    // 1. Update payment amount
    (payment as any)._props.amount = newAmount;
    (payment as any)._props.notes = `${payment.notes || ''} | Amount corrected from KES ${oldAmount} to KES ${newAmount} via Approval #${request.id} by ${approver.userId}. Reason: ${request.reason}`;
    await this.feeRepository.updatePayment(payment);

    // 2. Adjust invoice balance
    if (payment.invoiceId && diff !== 0) {
      const invoice = await this.feeRepository.findInvoiceById(payment.invoiceId);
      if (invoice) {
        invoice.recordPayment(diff);
        await this.feeRepository.updateInvoice(invoice);
      }
    }

    return { paymentId: payment.id, oldAmount, newAmount, difference: diff };
  }

  private async executeInvoiceVoid(request: FinancialApprovalRequest, approver: UserContext) {
    const invoice = await this.feeRepository.findInvoiceById(request.targetRecordId);
    if (!invoice) throw new NotFoundError('Invoice', request.targetRecordId);

    invoice.cancel(request.reason);
    (invoice as any)._props.description = `${(invoice as any)._props.description || ''} | VOIDED via Approval #${request.id} by ${approver.userId}. Reason: ${request.reason}`;
    await this.feeRepository.updateInvoice(invoice);

    return { invoiceId: invoice.id, status: 'CANCELLED' };
  }

  private async executeInvoiceCorrection(request: FinancialApprovalRequest, approver: UserContext) {
    const invoice = await this.feeRepository.findInvoiceById(request.targetRecordId);
    if (!invoice) throw new NotFoundError('Invoice', request.targetRecordId);

    const newPayable = Number(request.proposedData?.amountPayable);
    if (isNaN(newPayable) || newPayable < 0) {
      throw new ValidationError('A valid corrected invoice amount is required.');
    }

    (invoice as any)._props.amountPayable = newPayable;
    (invoice as any)._props.balance = Math.max(0, newPayable - invoice.amountPaid);
    (invoice as any)._props.description = `${(invoice as any)._props.description || ''} | Corrected via Approval #${request.id}. Reason: ${request.reason}`;
    await this.feeRepository.updateInvoice(invoice);

    return { invoiceId: invoice.id, newPayable, newBalance: invoice.balance };
  }

  private async executePayrollReversal(request: FinancialApprovalRequest, approver: UserContext) {
    if (!this.payrollRepository) throw new NotFoundError('Payroll Repository not configured', request.targetRecordId);
    const payroll = await this.payrollRepository.findPayrollById(request.targetRecordId);
    if (!payroll) throw new NotFoundError('Payroll Record', request.targetRecordId);

    (payroll as any)._props.status = 'REVERSED';
    (payroll as any)._props.notes = `${(payroll as any)._props.notes || ''} | REVERSED via Approval #${request.id} by ${approver.userId}. Reason: ${request.reason}`;
    await this.payrollRepository.updatePayroll(payroll);

    return { payrollId: payroll.id, status: 'REVERSED' };
  }
}
