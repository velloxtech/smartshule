import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WhatsAppService } from '../../services/WhatsAppService';
import { WhatsAppClientManager } from '../../services/WhatsAppClientManager';

export const WhatsAppSimulateSchema = z.object({
  phoneNumber: z.string().min(6),
  message: z.string().min(1),
  useAI: z.boolean().optional(),
});

export const WhatsAppSendSchema = z.object({
  to: z.string().min(8, 'Recipient phone number must have at least 8 digits'),
  message: z.string().min(1, 'Message text is required'),
});

export const WhatsAppSendTemplateSchema = z.object({
  to: z.string().min(8, 'Recipient phone number must have at least 8 digits'),
  templateName: z.string().min(1, 'Template name is required'),
  languageCode: z.string().default('en'),
  components: z.array(z.any()).optional(),
});

export const WhatsAppConfigSchema = z.object({
  accessToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  verifyToken: z.string().optional(),
  appSecret: z.string().optional(),
  apiBaseUrl: z.string().optional(),
});

export const WhatsAppAIDraftSchema = z.object({
  command: z.string().min(1, 'Command instruction is required'),
  studentId: z.string().optional(),
  tone: z.enum(['professional', 'urgent', 'friendly', 'concise']).optional(),
});

export const WhatsAppAIDispatchSchema = z.object({
  command: z.string().optional(),
  studentId: z.string().optional(),
  customMessage: z.string().optional(),
  tone: z.enum(['professional', 'urgent', 'friendly', 'concise']).optional(),
});

export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly whatsAppClientManager: WhatsAppClientManager
  ) {}

  /**
   * Get real-time connection status & Meta Cloud API configuration & Free Tier stats
   * GET /api/v1/whatsapp/status
   */
  public getStatus = async (req: Request, res: Response) => {
    const status = this.whatsAppClientManager.getStatus();
    return res.status(200).json({
      success: true,
      data: status,
    });
  };

  /**
   * Test Meta WhatsApp Cloud API credentials against Meta Graph API
   * POST /api/v1/whatsapp/test-connection
   */
  public testConnection = async (req: Request, res: Response) => {
    const result = await this.whatsAppClientManager.testMetaConnection(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'META_CONNECTION_FAILED',
          message: result.error || 'Failed to verify Meta WhatsApp Cloud API credentials.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meta WhatsApp Cloud API credentials verified successfully! Account is active, ban-safe, and eligible for 1,000 free monthly conversations.',
      data: {
        profile: result.profile,
        status: this.whatsAppClientManager.getStatus(),
      },
    });
  };

  /**
   * Get 1,000 monthly free tier usage breakdown and active 24-hr service conversation windows
   * GET /api/v1/whatsapp/free-tier-usage
   */
  public getFreeTierUsage = async (req: Request, res: Response) => {
    const usage = this.whatsAppClientManager.getFreeTierUsage();
    return res.status(200).json({
      success: true,
      data: usage,
    });
  };

  /**
   * Connect or generate a fresh QR Code to link an actual WhatsApp account (Legacy/Fallback)
   * POST /api/v1/whatsapp/connect
   */
  public connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await this.whatsAppClientManager.connect();
      return res.status(200).json({
        success: true,
        message: status.isOfficialMeta
          ? 'Meta Official Cloud API is already active (Ban-Safe). QR pairing bypassed.'
          : 'WhatsApp connection initiated. Scan QR code using WhatsApp on your phone. Note: Using Meta Cloud API is recommended to avoid number bans.',
        data: status,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Disconnect the currently linked WhatsApp account
   * POST /api/v1/whatsapp/disconnect
   */
  public disconnect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.whatsAppClientManager.disconnect();
      return res.status(200).json({
        success: true,
        message: 'WhatsApp account unlinked successfully.',
        data: this.whatsAppClientManager.getStatus(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Send an actual WhatsApp message to a real phone number
   * POST /api/v1/whatsapp/send
   */
  public sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, message } = req.body;
      const result = await this.whatsAppClientManager.sendRealMessage(to, message);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WHATSAPP_SEND_FAILED',
            message: result.error || 'Failed to dispatch WhatsApp message',
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Actual WhatsApp message transmitted to ${to} (${result.isOfficialMeta ? 'Meta Official Cloud API' : 'Direct Account'})`,
        data: {
          to,
          messageId: result.messageId,
          status: 'SENT',
          sentAt: new Date().toISOString(),
          isOfficialMeta: result.isOfficialMeta,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Send an official Meta WhatsApp Template message (outside 24h window)
   * POST /api/v1/whatsapp/send-template
   */
  public sendTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, templateName, languageCode, components } = req.body;
      const result = await this.whatsAppClientManager.sendTemplateMessage(
        to,
        templateName,
        languageCode || 'en',
        components || []
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WHATSAPP_TEMPLATE_SEND_FAILED',
            message: result.error || 'Failed to dispatch Meta WhatsApp template message.',
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Official Meta WhatsApp template '${templateName}' sent to ${to}`,
        data: {
          to,
          templateName,
          messageId: result.messageId,
          status: 'SENT',
          sentAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get recent actual WhatsApp messages (both inbound from parents & outbound replies)
   * GET /api/v1/whatsapp/messages
   */
  public getRecentMessages = async (req: Request, res: Response) => {
    const messages = this.whatsAppClientManager.getRecentMessages();
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  };

  /**
   * Meta Cloud API Webhook Verification (GET /whatsapp/webhook)
   */
  public webhookVerification = async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'smartshule_wa_verify_token_2026';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification challenge accepted by Meta');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification token mismatch' });
  };

  /**
   * Meta Cloud API Incoming Message & Delivery Status Handler (POST /whatsapp/webhook)
   */
  public webhookInbound = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.whatsAppClientManager.handleWebhookPayload(req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Query Parser Simulator Endpoint for tests or debugging
   * POST /api/v1/whatsapp/simulate
   */
  public simulate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber, message, useAI } = req.body;
      const result = await this.whatsAppService.handleInboundMessage(phoneNumber, message, { useAI: useAI ?? true });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Draft a personalized WhatsApp message with Gemini AI based on command & verified database contact
   * POST /api/v1/whatsapp/ai-draft
   */
  public draftWithGemini = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { command, studentId, tone } = req.body;
      if (!command || typeof command !== 'string' || !command.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMMAND',
            message: 'Please provide a command or instruction for drafting the WhatsApp message.',
          },
        });
      }

      const result = await this.whatsAppService.draftWithGemini({
        command: command.trim(),
        studentId: studentId ? String(studentId).trim() : undefined,
        tone,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DATABASE_PERSON_NOT_FOUND',
          message: err.message || 'Person not found in database or failed to draft message.',
        },
      });
    }
  };

  /**
   * Draft with Gemini and dispatch real WhatsApp message in one go (or dispatch approved draft)
   * POST /api/v1/whatsapp/ai-dispatch
   */
  public dispatchWithGemini = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { command, studentId, customMessage, tone } = req.body;
      if (!command && !customMessage) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT',
            message: 'Either a command or a custom message is required to dispatch.',
          },
        });
      }

      // 1. Draft or resolve message and verified person
      const draftResult = await this.whatsAppService.draftWithGemini({
        command: command || 'Send official notification',
        studentId: studentId ? String(studentId).trim() : undefined,
        tone,
      });

      const messageToSend = customMessage && customMessage.trim() ? customMessage.trim() : draftResult.draftedMessage;
      const recipientPhone = draftResult.matchedPerson.recipientPhone;

      // 2. Dispatch real WhatsApp message via official channels
      const sendResult = await this.whatsAppClientManager.sendRealMessage(
        recipientPhone,
        messageToSend,
        `GEMINI_${draftResult.intent}`
      );

      if (!sendResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WHATSAPP_SEND_FAILED',
            message: sendResult.error || 'Failed to transmit message over WhatsApp. Ensure an account is connected.',
          },
          data: {
            draftedMessage: messageToSend,
            matchedPerson: draftResult.matchedPerson,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Real WhatsApp message delivered to ${draftResult.matchedPerson.recipientName} (${recipientPhone}) via ${sendResult.isOfficialMeta ? 'Meta Official Cloud API' : 'WhatsApp'}`,
        data: {
          messageId: sendResult.messageId,
          to: recipientPhone,
          recipientName: draftResult.matchedPerson.recipientName,
          sentAt: new Date().toISOString(),
          message: messageToSend,
          matchedPerson: draftResult.matchedPerson,
          isOfficialMeta: sendResult.isOfficialMeta,
        },
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DISPATCH_ERROR',
          message: err.message || 'Failed to draft and dispatch WhatsApp message.',
        },
      });
    }
  };

  /**
   * Status & instructions for WhatsApp setup
   * GET /api/v1/whatsapp/config
   */
  public getConfig = async (req: Request, res: Response) => {
    const status = this.whatsAppClientManager.getStatus();
    return res.status(200).json({
      success: true,
      data: {
        botName: 'SmartShule CBC WhatsApp Assistant',
        businessPhone: status.connectedPhone || '',
        connectionStatus: status.status,
        connectedPhone: status.connectedPhone,
        connectedName: status.connectedName,
        webhookUrl: '/api/v1/whatsapp/webhook',
        isOfficialMeta: status.isOfficialMeta,
        banProtection: status.banProtection,
        freeTier: status.freeTier,
        officialTemplates: [
          { name: 'fee_balance_reminder', category: 'UTILITY', description: 'Reminds guardian of outstanding balance with KCB Paybill 522533' },
          { name: 'daily_ediary_notice', category: 'UTILITY', description: 'Alerts parents when daily homework or teacher remark is published' },
          { name: 'attendance_alert', category: 'UTILITY', description: 'Immediate roll-call notification if learner is marked absent' },
          { name: 'general_school_announcement', category: 'UTILITY', description: 'Official circulars, opening dates, and term calendar reminders' },
        ],
        supportedCommands: [
          { command: '1 or BALANCE', description: 'Query student fee balance, statement & last payments (supports multi-child)' },
          { command: '2 or PAY', description: 'Get instant KCB Bank checkout link & M-Pesa paybill instructions' },
          { command: '3 or EDIARY', description: 'View today\'s homework, tasks & teacher remarks' },
          { command: '4 or ATTENDANCE', description: 'Check daily roll-call status and term attendance percentage' },
          { command: '5 or RESULTS', description: 'View CBC competency performance levels, average score & grades' },
          { command: '6 or TIMETABLE', description: 'Check today\'s class schedule, periods & subject routine' },
          { command: '7 or PROFILE', description: 'View learner admission number, NEMIS UPI & enrollment details' },
          { command: '8 or SCHOOL', description: 'View school official contacts, term calendar & center code' },
          { command: '9 or HELP', description: 'Ask teacher a question (e.g. ASK: <question>) or parent support' },
          { command: 'MENU', description: 'Display interactive WhatsApp main menu and commands' },
        ],
      },
    });
  };

  /**
   * Update Meta Cloud API configuration
   * POST /api/v1/whatsapp/config
   */
  public updateConfig = async (req: Request, res: Response) => {
    const updateResult = this.whatsAppClientManager.updateMetaConfig(req.body);

    // If both token and phone number ID are available, attempt background verification
    let testProfile = null;
    if (req.body.accessToken || req.body.phoneNumberId) {
      const testRes = await this.whatsAppClientManager.testMetaConnection();
      if (testRes.success) {
        testProfile = testRes.profile;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Official Meta WhatsApp Cloud API credentials updated successfully.',
      data: {
        config: updateResult.config,
        status: this.whatsAppClientManager.getStatus(),
        verifiedProfile: testProfile,
      },
    });
  };
}
