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

export interface INotificationService {
  sendSms(toPhoneNumber: string, message: string): Promise<{ success: boolean; messageId: string }>;
  sendEmail(toEmail: string, subject: string, body: string, htmlBody?: string): Promise<{ success: boolean }>;
}
