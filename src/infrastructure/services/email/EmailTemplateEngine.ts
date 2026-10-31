/**
 * SmartShule CBC Management System - Grace Seeds School
 * Premium Global Email Design System & Template Engine
 */

import {
  PasswordResetEmailOptions,
  PasswordChangedEmailOptions,
  WelcomeAccountEmailOptions,
  PaymentReceiptEmailOptions,
  FeeInvoiceEmailOptions,
  DocumentApprovalRequestEmailOptions,
  DocumentDecisionEmailOptions,
  AnnouncementEmailOptions,
  SigningOtpEmailOptions,
  FinancialApprovalOtpEmailOptions,
  SalaryPayslipEmailOptions
} from '../../../core/ports/services/IEmailService';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export class EmailTemplateEngine {
  private static readonly SCHOOL_NAME = 'Grace Seeds School';
  private static readonly SCHOOL_TAGLINE = '"The future Begins Here"';
  private static readonly SCHOOL_LOCATION = 'KEMRI Street, Kisian, Kisumu County, Kenya';
  private static readonly SCHOOL_PHONE = '0745436312';
  private static readonly SCHOOL_EMAIL = 'schoolgraceseeds@gmail.com';

  /**
   * Escapes untrusted input to prevent HTML injection in emails.
   */
  public static escapeHtml(input: any): string {
    if (input === null || input === undefined) return '';
    const str = String(input);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Shared Master Email Layout (Responsive Table-based HTML)
   */
  public static renderMasterLayout(options: {
    title: string;
    categoryBadge?: string;
    contentHtml: string;
    actionButton?: {
      label: string;
      url: string;
    };
    noticeHtml?: string;
  }): string {
    const titleEscaped = this.escapeHtml(options.title);
    const badgeHtml = options.categoryBadge
      ? `<div style="display: inline-block; background-color: rgba(255,255,255,0.18); border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin-top: 10px;">${this.escapeHtml(options.categoryBadge)}</div>`
      : '';

    const actionButtonHtml = options.actionButton
      ? `
        <div style="padding: 24px 0 8px; text-align: center;">
          <a href="${options.actionButton.url}" target="_blank" style="background-color: #7a1228; color: #ffffff; display: inline-block; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(122, 18, 40, 0.25);">
            ${this.escapeHtml(options.actionButton.label)}
          </a>
          <div style="margin-top: 16px; font-size: 12px; color: #6b7280; line-height: 1.4;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${options.actionButton.url}" target="_blank" style="color: #7a1228; word-break: break-all; text-decoration: underline;">
              ${this.escapeHtml(options.actionButton.url)}
            </a>
          </div>
        </div>
      `
      : '';

    const noticeSectionHtml = options.noticeHtml
      ? `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin: 20px 0 0; font-size: 12px; color: #4b5563; line-height: 1.5;">
          ${options.noticeHtml}
        </div>
      `
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleEscaped} - ${this.SCHOOL_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7a1228 0%, #5c0b1b 100%); background-color: #7a1228; padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                ${this.SCHOOL_NAME}
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #fecdd3; font-weight: 500;">
                CBC Performance Portal · ${this.SCHOOL_TAGLINE}
              </p>
              ${badgeHtml}
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px 24px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #111827; border-bottom: 2px solid #fecdd3; padding-bottom: 8px;">
                ${titleEscaped}
              </h2>
              <div style="font-size: 14px; line-height: 1.6; color: #374151;">
                ${options.contentHtml}
              </div>
              ${actionButtonHtml}
              ${noticeSectionHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 24px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.6;">
              <div style="font-weight: 700; color: #374151; font-size: 13px; margin-bottom: 4px;">
                ${this.SCHOOL_NAME}
              </div>
              <div>${this.SCHOOL_LOCATION}</div>
              <div style="margin-top: 4px;">
                Tel: <a href="tel:${this.SCHOOL_PHONE}" style="color: #7a1228; text-decoration: none; font-weight: 600;">${this.SCHOOL_PHONE}</a> · 
                Email: <a href="mailto:${this.SCHOOL_EMAIL}" style="color: #7a1228; text-decoration: none; font-weight: 600;">${this.SCHOOL_EMAIL}</a>
              </div>
              <div style="margin-top: 16px; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                This is an automated system notification from SmartShule CBC Management System. Please do not reply directly to this email unless directed.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ===========================================================================
  // 1. Password Reset Request Email
  // ===========================================================================
  public static renderPasswordResetEmail(options: PasswordResetEmailOptions): RenderedEmail {
    const recipientEscaped = this.escapeHtml(options.recipientName || 'User');
    const codeEscaped = this.escapeHtml(options.resetCode);
    const expiryEscaped = this.escapeHtml(String(options.expiryMinutes || 15));
    const subject = `Password Reset Verification: ${options.resetCode} - ${this.SCHOOL_NAME}`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${recipientEscaped}</strong>,</p>
      <p style="margin: 0 0 16px;">
        We received a request to reset your password for your <strong>${this.SCHOOL_NAME}</strong> CBE Portal account.
      </p>
      <p style="margin: 0 0 20px;">
        Click the button below to set a new password securely, or enter the 6-digit verification code on the reset page:
      </p>

      <!-- Verification Code Highlight Box -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0 24px;">
        <tr>
          <td align="center" style="background-color: #fff1f2; border: 2px dashed #7a1228; border-radius: 12px; padding: 20px 16px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #9f1239;">
              6-Digit Verification Code
            </div>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #7a1228; font-family: monospace; margin: 8px 0 4px;">
              ${codeEscaped}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              Valid for <strong>${expiryEscaped} minutes</strong>
            </div>
          </td>
        </tr>
      </table>
    `;

    const noticeHtml = `
      <strong>Security Notice:</strong> This password reset code and link will expire in ${expiryEscaped} minutes. 
      If you did not request this password reset, please ignore this email; your existing password remains safe and unchanged.
    `;

    const html = this.renderMasterLayout({
      title: 'Password Reset Request',
      categoryBadge: 'Security Verification',
      contentHtml,
      actionButton: {
        label: 'Reset My Password',
        url: options.resetUrl
      },
      noticeHtml
    });

    const text = `
${this.SCHOOL_NAME} - Password Reset Request
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName || 'User'},

We received a request to reset your password for your ${this.SCHOOL_NAME} account.

Your 6-Digit Verification Code:
${options.resetCode}

This code expires in ${options.expiryMinutes || 15} minutes.

Alternatively, you can reset your password directly by visiting:
${options.resetUrl}

If you did not request this password reset, you can safely ignore this message; your account password remains unchanged.

Contact:
${this.SCHOOL_NAME}
${this.SCHOOL_LOCATION}
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 2. Password Changed Security Confirmation Email
  // ===========================================================================
  public static renderPasswordChangedEmail(options: PasswordChangedEmailOptions): RenderedEmail {
    const recipientEscaped = this.escapeHtml(options.recipientName || 'User');
    const timeString = (options.changeTime || new Date()).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
    const subject = `Security Alert: Your Password Has Been Changed - ${this.SCHOOL_NAME}`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${recipientEscaped}</strong>,</p>
      <p style="margin: 0 0 16px;">
        This email confirms that the password for your <strong>${this.SCHOOL_NAME}</strong> account was successfully updated on <strong>${this.escapeHtml(timeString)} (EAT)</strong>.
      </p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
        <span style="color: #166534; font-weight: 700; font-size: 13px;">✔ Account Security Status: Updated</span>
        <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">
          All previous password reset tokens and temporary sessions have been invalidated.
        </p>
      </div>
    `;

    const noticeHtml = `
      <strong style="color: #991b1b;">Did not make this change?</strong> If you did not update your password, your account may be compromised. 
      Please contact the ${this.SCHOOL_NAME} administration immediately at <a href="tel:${this.SCHOOL_PHONE}" style="color: #7a1228;">${this.SCHOOL_PHONE}</a> or <a href="mailto:${this.SCHOOL_EMAIL}" style="color: #7a1228;">${this.SCHOOL_EMAIL}</a>.
    `;

    const html = this.renderMasterLayout({
      title: 'Password Successfully Changed',
      categoryBadge: 'Security Alert',
      contentHtml,
      noticeHtml
    });

    const text = `
${this.SCHOOL_NAME} - Password Successfully Changed
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName || 'User'},

This email confirms that your password for ${this.SCHOOL_NAME} was updated on ${timeString} (EAT).

All previous password reset tokens and temporary sessions have been invalidated.

If you did not perform this change, please contact the school administration immediately at:
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 3. Welcome / Account Activation Email
  // ===========================================================================
  public static renderWelcomeAccountEmail(options: WelcomeAccountEmailOptions): RenderedEmail {
    const recipientEscaped = this.escapeHtml(options.recipientName || 'Member');
    const roleEscaped = this.escapeHtml(options.role.replace(/_/g, ' '));
    const subject = `Welcome to Grace Seeds School - Account Created (${roleEscaped})`;

    const tempPassHtml = options.temporaryPassword
      ? `
        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9f1239;">Your Temporary Password</div>
          <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #7a1228; margin-top: 4px;">
            ${this.escapeHtml(options.temporaryPassword)}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            You will be prompted to set your own permanent password upon your first sign in.
          </div>
        </div>
      `
      : '';

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${recipientEscaped}</strong>,</p>
      <p style="margin: 0 0 16px;">
        Welcome to <strong>${this.SCHOOL_NAME}</strong>. An official user account has been registered for you with the role of <strong>${roleEscaped}</strong> on the SmartShule CBE Management Platform.
      </p>
      ${tempPassHtml}
      <p style="margin: 16px 0;">
        Click the button below to sign in to your dashboard:
      </p>
    `;

    const html = this.renderMasterLayout({
      title: 'Welcome to Grace Seeds School',
      categoryBadge: 'Account Activation',
      contentHtml,
      actionButton: {
        label: 'Sign In to Portal',
        url: options.loginUrl
      }
    });

    const text = `
${this.SCHOOL_NAME} - Welcome to SmartShule CBE Portal
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName || 'Member'},

Welcome to ${this.SCHOOL_NAME}. Your user account (${options.role}) is now active on the SmartShule CBE Portal.

${options.temporaryPassword ? `Temporary Password: ${options.temporaryPassword}\nYou will be asked to change it upon first login.\n` : ''}
Sign In URL:
${options.loginUrl}

Contact:
${this.SCHOOL_NAME} · ${this.SCHOOL_LOCATION}
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 4. Official Fee Payment Receipt Email
  // ===========================================================================
  public static renderFeeReceiptEmail(options: PaymentReceiptEmailOptions): RenderedEmail {
    const formattedAmount = Number(options.amountPaid || 0).toLocaleString();
    const isOverpaid = Number(options.remainingBalance || 0) < 0;
    const formattedBal = isOverpaid
      ? `+KES ${Math.abs(Number(options.remainingBalance || 0)).toLocaleString()} (Credit / Overpayment)`
      : `KES ${Number(options.remainingBalance || 0).toLocaleString()}`;

    const subject = `Fee Payment Receipt: ${options.receiptNumber} - ${options.studentName} (${options.admissionNumber})`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.recipientName || 'Parent / Guardian')}</strong>,</p>
      <p style="margin: 0 0 18px;">
        Thank you for your payment. This email confirms that fee payment of <strong>KES ${formattedAmount}</strong> has been received and credited to the student account for <strong>${this.escapeHtml(options.studentName)}</strong>.
      </p>

      <!-- Payment Summary Box -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fdf2f4; border: 1px solid #fecdd3; border-radius: 10px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">
              Payment Confirmed
            </div>
            <div style="font-size: 26px; font-weight: 800; color: #7a1228; font-family: monospace; margin: 4px 0;">
              KES ${formattedAmount}
            </div>
            <div style="font-size: 12px; color: #4b5563;">
              Receipt #${this.escapeHtml(options.receiptNumber)} · Date: ${this.escapeHtml(options.paymentDate)}
            </div>
          </td>
        </tr>
      </table>

      <!-- Breakdown Table -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 44%;">Learner Name:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">${this.escapeHtml(options.studentName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Admission Number:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">${this.escapeHtml(options.admissionNumber)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Grade Level:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">${this.escapeHtml(options.gradeLevel)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Payment Method:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">${this.escapeHtml(options.paymentMethod)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Transaction Ref:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right; font-family: monospace;">${this.escapeHtml(options.transactionReference)}</td>
        </tr>
        <tr style="background-color: #f9fafb;">
          <td style="padding: 10px 8px; color: #374151; font-weight: 700;">Remaining Balance:</td>
          <td style="padding: 10px 8px; color: ${options.remainingBalance <= 0 ? '#15803d' : '#7a1228'}; font-weight: 800; text-align: right;">${formattedBal}</td>
        </tr>
      </table>
    `;

    const html = this.renderMasterLayout({
      title: 'Official Fee Payment Receipt',
      categoryBadge: 'Receipt Confirmation',
      contentHtml,
      actionButton: options.viewReceiptUrl
        ? {
            label: 'Download / View Receipt',
            url: options.viewReceiptUrl
          }
        : undefined
    });

    const text = `
${this.SCHOOL_NAME} - Official Fee Payment Receipt
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName || 'Parent / Guardian'},

Thank you for your payment. We confirm receipt of:
Amount Paid: KES ${formattedAmount}
Receipt Number: ${options.receiptNumber}
Payment Date: ${options.paymentDate}
Payment Method: ${options.paymentMethod}
Transaction Reference: ${options.transactionReference}

Student Details:
Learner: ${options.studentName} (${options.admissionNumber})
Grade Level: ${options.gradeLevel}
Remaining Balance: ${formattedBal}

${options.viewReceiptUrl ? `View full receipt online: ${options.viewReceiptUrl}\n` : ''}
School Contacts:
${this.SCHOOL_NAME}
${this.SCHOOL_LOCATION}
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 5. Fee Invoice / Statement Email
  // ===========================================================================
  public static renderFeeInvoiceEmail(options: FeeInvoiceEmailOptions): RenderedEmail {
    const formattedTotalDue = Number(options.totalDue || 0).toLocaleString();
    const formattedBilled = Number(options.totalBilled || 0).toLocaleString();
    const formattedArrears = Number(options.priorArrears || 0).toLocaleString();
    const formattedBalance = Number(options.balanceDue || 0).toLocaleString();

    const subject = `Fee Invoice: ${options.invoiceNumber} - ${options.studentName} (${options.termName})`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.recipientName || 'Parent / Guardian')}</strong>,</p>
      <p style="margin: 0 0 16px;">
        Please find fee details for <strong>${this.escapeHtml(options.studentName)}</strong> (${this.escapeHtml(options.admissionNumber)}) for <strong>${this.escapeHtml(options.termName)}</strong>.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9f1239;">Outstanding Balance Due</div>
            <div style="font-size: 26px; font-weight: 800; color: #7a1228; font-family: monospace; margin: 4px 0;">
              KES ${formattedBalance}
            </div>
            <div style="font-size: 12px; color: #4b5563;">
              Due Date: <strong>${this.escapeHtml(options.dueDate || 'Term Start')}</strong>
            </div>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Current Term Billed:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">KES ${formattedBilled}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Prior Arrears:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">KES ${formattedArrears}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Total Due:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700; text-align: right;">KES ${formattedTotalDue}</td>
        </tr>
        <tr style="background-color: #f9fafb;">
          <td style="padding: 10px 8px; color: #374151; font-weight: 700;">Net Balance Due:</td>
          <td style="padding: 10px 8px; color: #7a1228; font-weight: 800; text-align: right;">KES ${formattedBalance}</td>
        </tr>
      </table>
    `;

    const html = this.renderMasterLayout({
      title: 'School Fee Invoice & Statement',
      categoryBadge: 'Fee Statement',
      contentHtml,
      actionButton: options.viewInvoiceUrl
        ? {
            label: 'View / Pay Invoice Online',
            url: options.viewInvoiceUrl
          }
        : undefined
    });

    const text = `
${this.SCHOOL_NAME} - Fee Invoice (${options.invoiceNumber})
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName || 'Parent / Guardian'},

Fee invoice for ${options.studentName} (${options.admissionNumber}) for ${options.termName}:
- Current Term Billed: KES ${formattedBilled}
- Prior Arrears: KES ${formattedArrears}
- Total Due: KES ${formattedTotalDue}
- Outstanding Balance: KES ${formattedBalance}
- Due Date: ${options.dueDate || 'Term Start'}

${options.viewInvoiceUrl ? `View invoice: ${options.viewInvoiceUrl}\n` : ''}
School Contacts:
${this.SCHOOL_NAME} · ${this.SCHOOL_LOCATION}
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 6. Document Approval Request Email (Prepared for Phase B)
  // ===========================================================================
  public static renderDocumentApprovalRequestEmail(options: DocumentApprovalRequestEmailOptions): RenderedEmail {
    const subject = `Action Required: Document Approval Request - ${options.documentTitle} (${options.documentReference})`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.recipientName)}</strong>,</p>
      <p style="margin: 0 0 16px;">
        <strong>${this.escapeHtml(options.requesterName)}</strong> has submitted a document requiring your review and official approval / digital signature:
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">Document Details</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0;">
              ${this.escapeHtml(options.documentTitle)}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              Type: <strong>${this.escapeHtml(options.documentType)}</strong> · Ref: <strong>${this.escapeHtml(options.documentReference)}</strong>
              ${options.deadline ? ` · Deadline: <strong style="color: #b91c1c;">${this.escapeHtml(options.deadline)}</strong>` : ''}
            </div>
            ${options.notes ? `<div style="font-size: 12px; color: #334155; margin-top: 8px; font-style: italic;">Note: "${this.escapeHtml(options.notes)}"</div>` : ''}
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px; font-size: 13px; color: #4b5563;">
        Please sign in to the portal to review the document and record your decision. An email link does not bypass portal authentication.
      </p>
    `;

    const html = this.renderMasterLayout({
      title: 'Document Approval Requested',
      categoryBadge: 'Approval Action',
      contentHtml,
      actionButton: {
        label: 'Review & Sign Document',
        url: options.reviewUrl
      }
    });

    const text = `
${this.SCHOOL_NAME} - Document Approval Request
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName},

${options.requesterName} has submitted a document requiring your review and approval:
- Document: ${options.documentTitle}
- Type: ${options.documentType}
- Reference: ${options.documentReference}
${options.deadline ? `- Deadline: ${options.deadline}\n` : ''}
${options.notes ? `- Notes: ${options.notes}\n` : ''}

Review and approve securely in SmartShule:
${options.reviewUrl}

Note: You must log in with your authorized SmartShule credentials to review and sign.
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 7. Document Decision / Signature Notification Email (Prepared for Phase B)
  // ===========================================================================
  public static renderDocumentDecisionEmail(options: DocumentDecisionEmailOptions): RenderedEmail {
    const isApproved = options.decision === 'APPROVED' || options.decision === 'SIGNED';
    const decisionColor = isApproved ? '#15803d' : '#b91c1c';
    const decisionBg = isApproved ? '#f0fdf4' : '#fef2f2';
    const decisionBorder = isApproved ? '#bbf7d0' : '#fecaca';

    const subject = `Document ${options.decision}: ${options.documentTitle} (${options.documentReference})`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.recipientName)}</strong>,</p>
      <p style="margin: 0 0 16px;">
        Your document <strong>${this.escapeHtml(options.documentTitle)}</strong> (${this.escapeHtml(options.documentReference)}) has been <strong>${options.decision}</strong> by <strong>${this.escapeHtml(options.decidedBy)}</strong> on ${this.escapeHtml(options.decisionDate)}.
      </p>

      <div style="background-color: ${decisionBg}; border: 1px solid ${decisionBorder}; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
        <div style="font-weight: 800; font-size: 14px; color: ${decisionColor};">
          Decision: ${options.decision}
        </div>
        ${options.comments ? `<div style="font-size: 13px; color: #374151; margin-top: 6px;">Comments: "${this.escapeHtml(options.comments)}"</div>` : ''}
      </div>
    `;

    const html = this.renderMasterLayout({
      title: `Document ${options.decision}`,
      categoryBadge: 'Workflow Update',
      contentHtml,
      actionButton: options.documentUrl
        ? {
            label: 'View Document in Portal',
            url: options.documentUrl
          }
        : undefined
    });

    const text = `
${this.SCHOOL_NAME} - Document ${options.decision}
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName},

Your document "${options.documentTitle}" (${options.documentReference}) has been ${options.decision} by ${options.decidedBy} on ${options.decisionDate}.
${options.comments ? `Comments: ${options.comments}\n` : ''}
${options.documentUrl ? `View document: ${options.documentUrl}\n` : ''}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 8. School Announcement Email
  // ===========================================================================
  public static renderAnnouncementEmail(options: AnnouncementEmailOptions): RenderedEmail {
    const subject = `Announcement: ${options.title} - ${this.SCHOOL_NAME}`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear School Community,</p>
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
        <h3 style="margin: 0 0 8px; font-size: 16px; color: #78350f;">${this.escapeHtml(options.title)}</h3>
        <div>${this.escapeHtml(options.content).replace(/\n/g, '<br/>')}</div>
        <div style="margin-top: 12px; font-size: 12px; color: #b45309; font-weight: 600;">
          Posted by: ${this.escapeHtml(options.authorName)}
        </div>
      </div>
    `;

    const html = this.renderMasterLayout({
      title: 'School Announcement',
      categoryBadge: options.priority || 'Announcement',
      contentHtml
    });

    const text = `
${this.SCHOOL_NAME} - Announcement: ${options.title}
${this.SCHOOL_TAGLINE}

${options.title}
Posted by: ${options.authorName}

${options.content}

School Contacts:
${this.SCHOOL_NAME} · ${this.SCHOOL_LOCATION}
Tel: ${this.SCHOOL_PHONE} | Email: ${this.SCHOOL_EMAIL}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 9. Document Signing 6-Digit OTP Email (Phase B)
  // ===========================================================================
  public static renderSigningOtpEmail(options: SigningOtpEmailOptions): RenderedEmail {
    const subject = `Document Signing Authorization Code: ${options.otpCode} - ${this.SCHOOL_NAME}`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.recipientName)}</strong>,</p>
      <p style="margin: 0 0 16px;">
        You have initiated an electronic signature placement on an official Grace Seeds School document. Please enter the single-use 6-digit authorization code below to confirm and apply your signature:
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #475569;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 140px;">Document Title:</td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${this.escapeHtml(options.documentTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Document Ref:</td>
            <td style="padding: 4px 0; color: #0f172a;">${this.escapeHtml(options.documentReference)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Document Version:</td>
            <td style="padding: 4px 0; color: #0f172a;">${this.escapeHtml(options.documentVersion)}</td>
          </tr>
        </table>
      </div>

      <!-- Prominent 6-Digit Verification Code -->
      <div style="background: linear-gradient(135deg, #1e3a8a, #0369a1); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="color: #bfdbfe; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
          Electronic Signature Authorization Code
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 8px; line-height: 1.2;">
          ${this.escapeHtml(options.otpCode)}
        </div>
        <div style="color: #93c5fd; font-size: 12px; margin-top: 8px;">
          Valid for ${options.expiryMinutes} minutes · Single use only
        </div>
      </div>

      <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-radius: 4px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #9a3412;">
        <strong>Security Notice:</strong> Do not share this authorization code with anyone. SmartShule staff will never ask for your code. If you did not initiate this document signing action, please contact school administration immediately.
      </div>
    `;

    const html = this.renderMasterLayout({
      title: 'Digital Signature Authorization',
      categoryBadge: 'Security Verification',
      contentHtml
    });

    const text = `
${this.SCHOOL_NAME} - Digital Signature Authorization
${this.SCHOOL_TAGLINE}

Dear ${options.recipientName},

You have initiated an electronic signature placement on an official Grace Seeds School document.

Document Title: ${options.documentTitle}
Document Reference: ${options.documentReference}
Document Version: ${options.documentVersion}

YOUR 6-DIGIT AUTHORIZATION CODE IS: ${options.otpCode}

This code expires in ${options.expiryMinutes} minutes and can only be used once.

Security Notice: Do not share this authorization code with anyone. If you did not request this signature verification, contact school administration immediately.

Grace Seeds School · ${this.SCHOOL_LOCATION}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 10. Financial Action 6-Digit Approval OTP Email
  // ===========================================================================
  public static renderFinancialApprovalOtpEmail(options: FinancialApprovalOtpEmailOptions): RenderedEmail {
    const actionLabel = options.actionType.replace(/_/g, ' ');
    const subject = `[ACTION REQUIRED] Financial ${actionLabel} Approval Code: ${options.otpCode} - ${this.SCHOOL_NAME}`;

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.approverName)}</strong>,</p>
      <p style="margin: 0 0 16px;">
        A sensitive financial transaction modification has been requested at <strong>Grace Seeds School</strong> and requires your verified authorization code to proceed.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #475569;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 140px;">Requested Action:</td>
            <td style="padding: 4px 0; color: #991b1b; font-weight: 700; text-transform: uppercase;">${this.escapeHtml(actionLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Target Record:</td>
            <td style="padding: 4px 0; color: #0f172a; font-family: monospace; font-weight: 600;">${this.escapeHtml(options.targetRecordType)} #${this.escapeHtml(options.targetRecordId)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Requested By:</td>
            <td style="padding: 4px 0; color: #0f172a;">${this.escapeHtml(options.requesterName)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Reason Provided:</td>
            <td style="padding: 4px 0; color: #334155; font-style: italic;">&ldquo;${this.escapeHtml(options.reason)}&rdquo;</td>
          </tr>
        </table>
      </div>

      <!-- Prominent 6-Digit Approval Code -->
      <div style="background: linear-gradient(135deg, #7a1228, #9f1239); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; box-shadow: 0 4px 12px rgba(122, 18, 40, 0.25);">
        <div style="color: #fecdd3; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
          Financial Authorization Code
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; color: #ffffff; letter-spacing: 10px; line-height: 1.2;">
          ${this.escapeHtml(options.otpCode)}
        </div>
        <div style="color: #ffe4e6; font-size: 12px; margin-top: 8px;">
          Valid for ${options.expiryMinutes} minutes · Maximum 3 attempts · Single use only
        </div>
      </div>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #991b1b;">
        <strong>Strict Security Notice:</strong> Never share this code with anyone, including school staff. If you did not authorize or expect this financial modification, decline the request immediately and report to administration.
      </div>
    `;

    const html = this.renderMasterLayout({
      title: 'Financial Authorization Request',
      categoryBadge: 'Financial Controls & Governance',
      contentHtml
    });

    const text = `
${this.SCHOOL_NAME} - Financial Modification Authorization
${this.SCHOOL_TAGLINE}

Dear ${options.approverName},

A sensitive financial transaction modification has been requested and requires your authorization.

Action Requested: ${actionLabel}
Target Record: ${options.targetRecordType} #${options.targetRecordId}
Requested By: ${options.requesterName}
Reason: ${options.reason}

YOUR 6-DIGIT APPROVAL CODE IS: ${options.otpCode}

This code expires in ${options.expiryMinutes} minutes (maximum 3 attempts) and can only be used once.

Security Notice: Never share this authorization code with anyone. If you did not initiate or approve this action, alert school administration immediately.

Grace Seeds School · ${this.SCHOOL_LOCATION} · Tel: ${this.SCHOOL_PHONE}
    `.trim();

    return { subject, html, text };
  }

  // ===========================================================================
  // 11. Salary Payment Advice & Digital Acknowledgement Notice
  // ===========================================================================
  public static renderSalaryPayslipEmail(options: SalaryPayslipEmailOptions): RenderedEmail {
    const formattedNet = Number(options.netSalary || 0).toLocaleString();
    const formattedGross = Number(options.grossSalary || 0).toLocaleString();
    const formattedDeductions = Number(options.deductions || 0).toLocaleString();
    const subject = `Official Salary Payment Advice: ${options.payrollPeriod} - ${this.SCHOOL_NAME}`;

    const portalUrl = options.portalUrl || 'https://smartshule.ac.ke/?view=teacher-dashboard';

    const contentHtml = `
      <p style="margin: 0 0 16px;">Dear <strong>${this.escapeHtml(options.teacherName)}</strong>,</p>
      <p style="margin: 0 0 16px;">
        We are pleased to inform you that your salary remuneration for <strong>${this.escapeHtml(options.payrollPeriod)}</strong> has been processed and disbursed by Grace Seeds School Accounts Office.
      </p>

      <!-- Amount Banner -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 1px;">
          Net Remuneration Disbursed
        </div>
        <div style="font-size: 32px; font-weight: 800; color: #15803d; font-family: monospace; margin-top: 4px;">
          KES ${formattedNet}
        </div>
        <div style="font-size: 12px; color: #4ade80; color: #15803d; margin-top: 4px;">
          Period: ${this.escapeHtml(options.payrollPeriod)} · Disbursed on: ${this.escapeHtml(options.paymentDate)}
        </div>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #4b5563;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-weight: 500;">Staff Member:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700; text-align: right;">${this.escapeHtml(options.teacherName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-weight: 500;">Gross Remuneration:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">KES ${formattedGross}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-weight: 500;">Total Deductions:</td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: 600; text-align: right;">- KES ${formattedDeductions}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-weight: 700; color: #111827;">Net Amount Paid:</td>
            <td style="padding: 8px 0; color: #15803d; font-weight: 800; font-size: 15px; text-align: right;">KES ${formattedNet}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-weight: 500;">Payment Method:</td>
            <td style="padding: 8px 0; color: #111827; text-align: right;">${this.escapeHtml(options.paymentMethod)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500;">Transaction Reference:</td>
            <td style="padding: 8px 0; color: #111827; font-family: monospace; text-align: right;">${this.escapeHtml(options.referenceNumber)}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #1e40af;">
        <strong>Action Required:</strong> In accordance with school policy, please log into your Teacher Portal to confirm and digitally acknowledge receipt of this salary payment.
      </div>
    `;

    const html = this.renderMasterLayout({
      title: 'Salary Remuneration Advice',
      categoryBadge: 'Payroll & Remuneration',
      contentHtml,
      actionButton: {
        label: 'Acknowledge Salary Receipt in Portal',
        url: portalUrl
      }
    });

    const text = `
${this.SCHOOL_NAME} - Salary Remuneration Advice
${this.SCHOOL_TAGLINE}

Dear ${options.teacherName},

Your salary for ${options.payrollPeriod} has been disbursed.

Gross Salary: KES ${formattedGross}
Total Deductions: KES ${formattedDeductions}
Net Amount Paid: KES ${formattedNet}
Payment Method: ${options.paymentMethod}
Reference: ${options.referenceNumber}
Payment Date: ${options.paymentDate}

Action Required: Please log in to your Teacher Portal at ${portalUrl} to review and digitally acknowledge receipt of your salary.

Grace Seeds School Accounts Office · ${this.SCHOOL_LOCATION} · Tel: ${this.SCHOOL_PHONE}
    `.trim();

    return { subject, html, text };
  }
}
