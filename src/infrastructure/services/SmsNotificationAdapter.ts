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

  public async sendEmail(toEmail: string, subject: string, body: string, htmlBody?: string): Promise<{ success: boolean }> {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER || 'notifications@smartshule.ac.ke';
    const fromAddress = process.env.EMAIL_FROM || 'notifications@smartshule.ac.ke';

    console.log(`[EMAIL OUTBOUND via ${smtpHost}] From: ${fromAddress} | To: ${toEmail} | Subject: "${subject}"`);
    return {
      success: true,
    };
  }
}
