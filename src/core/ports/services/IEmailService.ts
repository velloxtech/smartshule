/**
 * SmartShule CBC Management System - Grace Seeds School
 * Centralized Email Infrastructure & Delivery Port
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailPayload {
  to: string | string[] | EmailRecipient | EmailRecipient[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface PasswordResetEmailOptions {
  to: string;
  recipientName: string;
  resetUrl: string;
  resetCode: string;
  expiryMinutes: number;
}

export interface PasswordChangedEmailOptions {
  to: string;
  recipientName: string;
  changeTime?: Date;
  ipAddress?: string;
}

export interface WelcomeAccountEmailOptions {
  to: string;
  recipientName: string;
  role: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export interface PaymentReceiptEmailOptions {
  to: string;
  recipientName: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference: string;
  studentName: string;
  admissionNumber: string;
  gradeLevel: string;
  remainingBalance: number;
  viewReceiptUrl?: string;
}

export interface FeeInvoiceEmailOptions {
  to: string;
  recipientName: string;
  invoiceNumber: string;
  termName: string;
  totalBilled: number;
  priorArrears: number;
  totalDue: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
  studentName: string;
  admissionNumber: string;
  viewInvoiceUrl?: string;
}

export interface DocumentApprovalRequestEmailOptions {
  to: string;
  recipientName: string;
  documentType: string;
  documentTitle: string;
  documentReference: string;
  requesterName: string;
  reviewUrl: string;
  deadline?: string;
  notes?: string;
}

export interface DocumentDecisionEmailOptions {
  to: string;
  recipientName: string;
  documentType: string;
  documentTitle: string;
  documentReference: string;
  decision: 'APPROVED' | 'REJECTED' | 'SIGNED';
  decidedBy: string;
  decisionDate: string;
  comments?: string;
  documentUrl?: string;
}

export interface AnnouncementEmailOptions {
  to: string | string[];
  recipientName?: string;
  title: string;
  content: string;
  authorName: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface SigningOtpEmailOptions {
  to: string;
  recipientName: string;
  documentTitle: string;
  documentReference: string;
  documentVersion: string;
  otpCode: string;
  expiryMinutes: number;
}

export interface FinancialApprovalOtpEmailOptions {
  to: string;
  approverName: string;
  actionType: string;
  targetRecordType: string;
  targetRecordId: string;
  reason: string;
  requesterName: string;
  otpCode: string;
  expiryMinutes: number;
}

export interface SalaryPayslipEmailOptions {
  to: string;
  teacherName: string;
  payrollPeriod: string;
  netSalary: number;
  grossSalary: number;
  deductions: number;
  paymentMethod: string;
  referenceNumber: string;
  paymentDate: string;
  portalUrl?: string;
}

export interface IEmailService {
  /** Low-level generic message dispatch */
  send(payload: EmailPayload): Promise<EmailSendResult>;

  /** Transactional domain email dispatchers */
  sendPasswordReset(options: PasswordResetEmailOptions): Promise<EmailSendResult>;
  sendPasswordChanged(options: PasswordChangedEmailOptions): Promise<EmailSendResult>;
  sendWelcomeAccount(options: WelcomeAccountEmailOptions): Promise<EmailSendResult>;
  sendPaymentReceipt(options: PaymentReceiptEmailOptions): Promise<EmailSendResult>;
  sendFeeInvoice(options: FeeInvoiceEmailOptions): Promise<EmailSendResult>;
  sendDocumentApprovalRequest(options: DocumentApprovalRequestEmailOptions): Promise<EmailSendResult>;
  sendDocumentDecision(options: DocumentDecisionEmailOptions): Promise<EmailSendResult>;
  sendAnnouncement(options: AnnouncementEmailOptions): Promise<EmailSendResult>;
  sendSigningOtp(options: SigningOtpEmailOptions): Promise<EmailSendResult>;
  sendFinancialApprovalOtp(options: FinancialApprovalOtpEmailOptions): Promise<EmailSendResult>;
  sendSalaryPayslip(options: SalaryPayslipEmailOptions): Promise<EmailSendResult>;
}
