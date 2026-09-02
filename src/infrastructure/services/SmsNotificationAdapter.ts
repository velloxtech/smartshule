import { INotificationService } from '../../core/ports/services/IExternalServices';
import { IdGenerator } from '../../core/domain/shared/Errors';

export class SmsNotificationAdapter implements INotificationService {
  public async sendSms(toPhoneNumber: string, message: string): Promise<{ success: boolean; messageId: string }> {
    const messageId = IdGenerator.generateWithPrefix('SMS');
    // In production, this integrates with SMS Gateways such as Africa's Talking / Twilio / Advanta SMS
    // Logs notification dispatch for monitoring & audit
    console.log(`[SMS OUTBOUND] To: ${toPhoneNumber} | Msg: "${message}" | ID: ${messageId}`);
    return {
      success: true,
      messageId
    };
  }

  public async sendEmail(toEmail: string, subject: string, body: string, htmlBody?: string): Promise<{ success: boolean }> {
    console.log(`[EMAIL OUTBOUND] To: ${toEmail} | Subject: "${subject}"`);
    return {
      success: true
    };
  }
}
