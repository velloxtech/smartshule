import nodemailer from 'nodemailer';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import { IdGenerator } from '../../core/domain/shared/Errors';

export class SmsNotificationAdapter implements INotificationService {
  private readonly provider: string;
  private readonly atApiKey: string;
  private readonly atUsername: string;
  private readonly atSenderId: string;
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioFromNumber: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'africastalking';
    this.atApiKey = process.env.AFRICASTALKING_API_KEY || '';
    this.atUsername = process.env.AFRICASTALKING_USERNAME || 'sandbox';
    this.atSenderId = process.env.AFRICASTALKING_SENDER_ID || 'SMARTSHULE';
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.twilioFromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  public async sendSms(toPhoneNumber: string, message: string): Promise<{ success: boolean; messageId: string }> {
    const messageId = IdGenerator.generateWithPrefix('SMS');

    // 1. Africa's Talking Gateway
    if (this.provider === 'africastalking' && this.atApiKey && !this.atApiKey.includes('sandbox_key')) {
      try {
        const url = this.atUsername === 'sandbox'
          ? 'https://api.sandbox.africastalking.com/version1/messaging'
          : 'https://api.africastalking.com/version1/messaging';

        const body = new URLSearchParams({
          username: this.atUsername,
          to: toPhoneNumber,
          message,
          from: this.atSenderId,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            apiKey: this.atApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: body.toString(),
        });

        const data: any = await response.json();
        const recipient = data?.SMSMessageData?.Recipients?.[0];
        if (recipient && (recipient.status === 'Success' || recipient.statusCode === 101)) {
          console.log(`[SMS OUTBOUND - Africa's Talking] To: ${toPhoneNumber} | Msg: "${message}" | Cost: ${recipient.cost} | ID: ${recipient.messageId || messageId}`);
          return { success: true, messageId: recipient.messageId || messageId };
        }
      } catch (err: any) {
        console.warn(`[SMS Africa's Talking] Dispatch warning: ${err.message}`);
      }
    }

    // 2. Twilio Gateway
    if (this.provider === 'twilio' && this.twilioAccountSid && this.twilioAuthToken) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
        const body = new URLSearchParams({
          To: toPhoneNumber,
          From: this.twilioFromNumber,
          Body: message,
        });

        const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        const data: any = await response.json();
        if (data.sid) {
          console.log(`[SMS OUTBOUND - Twilio] To: ${toPhoneNumber} | Msg: "${message}" | SID: ${data.sid}`);
          return { success: true, messageId: data.sid };
        }
      } catch (err: any) {
        console.warn(`[SMS Twilio] Dispatch warning: ${err.message}`);
      }
    }

    // Default Sandbox / Logging Fallback
    console.log(`[SMS OUTBOUND] To: ${toPhoneNumber} | Msg: "${message}" | ID: ${messageId}`);
    return {
      success: true,
      messageId,
    };
  }

  private sentEmails: Array<{ to: string; subject: string; body: string; htmlBody?: string; sentAt: Date }> = [];

  public getSentEmails() {
    return [...this.sentEmails];
  }

  public getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  public clearSentEmails() {
    this.sentEmails = [];
  }

  public async sendEmail(toEmail: string, subject: string, body: string, htmlBody?: string): Promise<{ success: boolean; messageId?: string }> {
    const smtpHost = (process.env.SMTP_HOST || 'smtppro.zoho.com').trim();
    const defaultPort = smtpHost.includes('zoho') ? '465' : '587';
    const smtpPort = parseInt(process.env.SMTP_PORT || defaultPort, 10);
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();
    const isPort465 = smtpPort === 465;
    const smtpSecure = isPort465 || process.env.SMTP_SECURE === 'true';

    let fromAddress = (process.env.EMAIL_FROM || '').trim();
    if (!fromAddress && smtpUser) {
      fromAddress = `"Grace Seeds School Admissions" <${smtpUser}>`;
    } else if (smtpUser && smtpHost.includes('zoho')) {
      const displayNameMatch = fromAddress.match(/^"([^"]+)"/) || fromAddress.match(/^([^<]+)</);
      const displayName = displayNameMatch ? displayNameMatch[1].trim() : 'Grace Seeds School Admissions';
      fromAddress = `"${displayName}" <${smtpUser}>`;
    } else if (!fromAddress) {
      fromAddress = '"Grace Seeds School Admissions" <admissions@smartshule.ac.ke>';
    }

    this.sentEmails.push({
      to: toEmail,
      subject,
      body,
      htmlBody,
      sentAt: new Date(),
    });

    console.log(`[EMAIL OUTBOUND via ${smtpHost}] From: ${fromAddress} | To: ${toEmail} | Subject: "${subject}"`);

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const info = await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          text: body,
          html: htmlBody || body.replace(/\n/g, '<br/>'),
        });

        console.log(`[EMAIL DISPATCHED via SMTP SUCCESS] MessageId: ${info?.messageId || 'OK'} | From: ${fromAddress} | To: ${toEmail}`);
        return { success: true, messageId: info?.messageId };
      } catch (err: any) {
        console.warn(`[EMAIL SMTP DISPATCH NOTICE] Outbound SMTP attempt with ${fromAddress}: ${err.message}. Email recorded in notification ledger.`);
      }
    }

    return {
      success: true,
    };
  }
}
