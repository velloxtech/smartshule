/**
 * SmartShule CBC Management System - Grace Seeds School
 * Centralized Email Delivery Service
 */

import nodemailer, { Transporter } from 'nodemailer';
import {
  IEmailService,
  EmailPayload,
  EmailSendResult,
  PasswordResetEmailOptions,
  PasswordChangedEmailOptions,
  WelcomeAccountEmailOptions,
  PaymentReceiptEmailOptions,
  FeeInvoiceEmailOptions,
  DocumentApprovalRequestEmailOptions,
  DocumentDecisionEmailOptions,
  AnnouncementEmailOptions,
  SigningOtpEmailOptions
} from '../../../core/ports/services/IEmailService';
import { EmailTemplateEngine } from './EmailTemplateEngine';
import { env } from '../../config/env';

export interface RecordedEmail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  sentAt: Date;
  messageId?: string;
}

export class EmailService implements IEmailService {
  private transporter: Transporter | null = null;
  private sentEmails: RecordedEmail[] = [];
  private readonly defaultFrom: string;
  private readonly defaultReplyTo: string;
  private readonly isTestMode: boolean;

  constructor(options?: {
    transporter?: Transporter;
    isTestMode?: boolean;
    defaultFrom?: string;
    defaultReplyTo?: string;
  }) {
    this.isTestMode = options?.isTestMode ?? (
      process.env.NODE_ENV === 'test' ||
      process.env.EMAIL_TEST_MODE === 'true'
    );

    this.defaultFrom = options?.defaultFrom || env.email.from;
    this.defaultReplyTo = options?.defaultReplyTo || (process.env.EMAIL_REPLY_TO || 'schoolgraceseeds@gmail.com');

    if (options?.transporter) {
      this.transporter = options.transporter;
    } else if (!this.isTestMode && env.email.user && env.email.pass) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.secure,
        auth: {
          user: env.email.user,
          pass: env.email.pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    } catch (err: any) {
      console.warn(`[EmailService] Failed to initialize SMTP transporter: ${err.message}`);
      this.transporter = null;
    }
  }

  public getSentEmails(): RecordedEmail[] {
    return [...this.sentEmails];
  }

  public getLastSentEmail(): RecordedEmail | null {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  public clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Basic email format validation
   */
  public static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }

  /**
   * Low-level send implementation with error handling and retry logic
   */
  public async send(payload: EmailPayload): Promise<EmailSendResult> {
    const rawTo = Array.isArray(payload.to) ? payload.to : [payload.to];
    const recipients: string[] = rawTo.map(item => {
      if (typeof item === 'string') return item.trim();
      return item.email.trim();
    }).filter(e => e.length > 0);

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipient email address provided',
        timestamp: new Date()
      };
    }

    const invalidRecipients = recipients.filter(r => !EmailService.isValidEmail(r));
    if (invalidRecipients.length > 0) {
      return {
        success: false,
        error: `Invalid email address format: ${invalidRecipients.join(', ')}`,
        timestamp: new Date()
      };
    }

    const fromAddress = payload.from || this.defaultFrom;
    const replyToAddress = payload.replyTo || this.defaultReplyTo;

    // Record email in test / audit ledger
    const recorded: RecordedEmail = {
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      from: fromAddress,
      replyTo: replyToAddress,
      sentAt: new Date()
    };
    this.sentEmails.push(recorded);

    // If running in test mode or unconfigured credentials, treat test ledger as source of truth
    if (this.isTestMode || !this.transporter) {
      const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      recorded.messageId = mockId;
      console.log(`[EmailService Test/Simulated] To: ${recipients.join(', ')} | Subject: "${payload.subject}" | ID: ${mockId}`);
      return {
        success: true,
        messageId: mockId,
        timestamp: recorded.sentAt
      };
    }

    // SMTP Dispatch with exponential backoff retry for transient network drops
    let attempt = 0;
    const maxRetries = 2;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: recipients.join(', '),
          subject: payload.subject,
          text: payload.text,
          html: payload.html || payload.text.replace(/\n/g, '<br/>'),
          replyTo: replyToAddress,
          cc: payload.cc,
          bcc: payload.bcc,
          attachments: payload.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            path: att.path,
            contentType: att.contentType
          }))
        });

        recorded.messageId = info.messageId;
        console.log(`[EmailService SMTP Success] To: ${recipients.join(', ')} | Subject: "${payload.subject}" | MessageId: ${info.messageId}`);
        return {
          success: true,
          messageId: info.messageId,
          timestamp: new Date()
        };
      } catch (err: any) {
        lastError = err;
        const isTransient = err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ESOCKET' ||
          err.code === 'EAI_AGAIN' ||
          err.message?.includes('socket') ||
          err.message?.includes('timeout');

        if (isTransient && attempt <= maxRetries) {
          const delay = attempt * 300;
          console.warn(`[EmailService] Transient dispatch error on attempt ${attempt} (${err.code || err.message}). Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }

    console.error(`[EmailService SMTP Failed] To: ${recipients.join(', ')} | Error: ${lastError?.message}`);
    return {
      success: false,
      error: lastError?.message || 'Failed to dispatch email via SMTP',
      timestamp: new Date()
    };
  }

  // ===========================================================================
  // Domain Transactional Mail Dispatchers
  // ===========================================================================

  public async sendPasswordReset(options: PasswordResetEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderPasswordResetEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendPasswordChanged(options: PasswordChangedEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderPasswordChangedEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendWelcomeAccount(options: WelcomeAccountEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderWelcomeAccountEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendPaymentReceipt(options: PaymentReceiptEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderFeeReceiptEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendFeeInvoice(options: FeeInvoiceEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderFeeInvoiceEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendDocumentApprovalRequest(options: DocumentApprovalRequestEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderDocumentApprovalRequestEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendDocumentDecision(options: DocumentDecisionEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderDocumentDecisionEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendAnnouncement(options: AnnouncementEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderAnnouncementEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  public async sendSigningOtp(options: SigningOtpEmailOptions): Promise<EmailSendResult> {
    const rendered = EmailTemplateEngine.renderSigningOtpEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }
}
