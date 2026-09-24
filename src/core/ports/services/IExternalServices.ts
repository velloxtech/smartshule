import { UserRole } from '../../domain/user/User';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}

export interface IAuthTokenService {
  generateAccessToken(payload: TokenPayload): string;
  generateRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): TokenPayload | null;
}

export interface IPasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}

export interface StkPushRequest {
  phoneNumber: string; // 2547XXXXXXXX
  amount: number;
  invoiceId: string;
  studentAdmission: string;
  description: string;
}

export interface StkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface MpesaCallbackData {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

export interface IPaymentGateway {
  initiateStkPush(request: StkPushRequest): Promise<StkPushResponse>;
  queryTransactionStatus(checkoutRequestId: string): Promise<{ success: boolean; receiptNumber?: string; message: string }>;
  processCallback(callbackPayload: unknown): Promise<MpesaCallbackData>;
}

// ==========================================
// KCB BUNI DEVELOPER API PLATFORM INTERFACES
// ==========================================
export interface KcbBuniStkPushRequest {
  phoneNumber: string; // 2547XXXXXXXX or 07XXXXXXXX
  amount: number;
  invoiceNumber: string;
  studentAdmission: string;
  description?: string;
  callbackUrl?: string;
  orgShortCode?: string;
}

export interface KcbBuniStkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface KcbBuniCallbackData {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

export interface KcbBuniBillValidationRequest {
  transactionType?: string;
  billReferenceNumber: string; // Student admission number
  amount: number;
  phoneNumber?: string;
}

export interface KcbBuniBillValidationResponse {
  resultCode: string;
  resultDesc: string;
  studentName?: string;
  currentBalance?: number;
}

export interface KcbBuniBillConfirmationRequest {
  transactionId: string;
  transactionTime: string;
  billReferenceNumber: string; // Student admission number
  transactionAmount: number;
  phoneNumber?: string;
  senderName?: string;
  channel?: 'MPESA' | 'KCB_APP' | 'VOOMA' | 'BANK_BRANCH' | 'AGENT';
}

export interface IKcbBuniPaymentGateway extends IPaymentGateway {
  getAccessToken(): Promise<string>;
  initiateKcbBuniStk(request: KcbBuniStkPushRequest): Promise<KcbBuniStkPushResponse>;
  queryTransactionStatus(checkoutRequestId: string): Promise<{ success: boolean; receiptNumber?: string; message: string }>;
  processCallback(callbackPayload: unknown): Promise<KcbBuniCallbackData>;
  validateBillAccount(request: KcbBuniBillValidationRequest): Promise<KcbBuniBillValidationResponse>;
  getShortCode(): string;
  getBaseUrl(): string;
}

export interface INotificationService {
  sendSms(toPhoneNumber: string, message: string): Promise<{ success: boolean; messageId: string }>;
  sendEmail(toEmail: string, subject: string, body: string, htmlBody?: string): Promise<{ success: boolean }>;
}

