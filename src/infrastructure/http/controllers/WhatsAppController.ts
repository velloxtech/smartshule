import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WhatsAppService } from '../../services/WhatsAppService';
import { WhatsAppClientManager } from '../../services/WhatsAppClientManager';

export const WhatsAppSimulateSchema = z.object({
  phoneNumber: z.string().min(6),
  message: z.string().min(1),
});

export const WhatsAppSendSchema = z.object({
  to: z.string().min(8, 'Recipient phone number must have at least 8 digits'),
  message: z.string().min(1, 'Message text is required'),
});

export const WhatsAppConfigSchema = z.object({
  accessToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  verifyToken: z.string().optional(),
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
   * Get real-time connection status & QR code for linking an actual WhatsApp account
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
   * Connect or generate a fresh QR Code to link an actual WhatsApp account
   * POST /api/v1/whatsapp/connect
   */
  public connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await this.whatsAppClientManager.connect();
      return res.status(200).json({
        success: true,
        message: 'WhatsApp connection initiated. Scan QR code using WhatsApp on your phone.',
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
        message: `Actual WhatsApp message transmitted to ${to}`,
        data: {
          to,
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
      console.log('[WhatsApp Webhook] Verification challenge accepted');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification token mismatch' });
  };

  /**
   * Meta Cloud API Incoming Message Handler (POST /whatsapp/webhook)
   */
  public webhookInbound = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      // Check Meta payload format
      if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const message = body.entry[0].changes[0].value.messages[0];
        const fromPhone = message.from; // e.g. 254799888777
        const messageText = message.text?.body || '';

        const reply = await this.whatsAppService.handleInboundMessage(fromPhone, messageText, { useAI: true });
        console.log(`[WhatsApp Inbound] From: ${fromPhone} | Body: "${messageText}" | Reply: "${reply.intent}"`);

        // Send real reply back through WhatsApp
        if (reply.replyText) {
          await this.whatsAppClientManager.sendRealMessage(fromPhone, reply.replyText, reply.intent);
        }

        return res.status(200).json({ status: 'PROCESSED', data: reply });
      }

      // Generic webhook / simplified payload format: { from, message }
      if (body.from && body.message) {
        const reply = await this.whatsAppService.handleInboundMessage(body.from, body.message, { useAI: true });
        if (reply.replyText) {
          await this.whatsAppClientManager.sendRealMessage(body.from, reply.replyText, reply.intent);
        }
        return res.status(200).json({ status: 'PROCESSED', data: reply });
      }

      return res.status(200).json({ status: 'IGNORED_NON_MESSAGE_EVENT' });
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

      // 2. Dispatch real WhatsApp message
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
        message: `Real WhatsApp message delivered to ${draftResult.matchedPerson.recipientName} (${recipientPhone})`,
        data: {
          messageId: sendResult.messageId,
          to: recipientPhone,
          recipientName: draftResult.matchedPerson.recipientName,
          sentAt: new Date().toISOString(),
          message: messageToSend,
          matchedPerson: draftResult.matchedPerson,
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
        supportedCommands: [
          { command: '1 or BALANCE', description: 'Query student fee balance, statement & last payments (supports multi-child)' },
          { command: '2 or PAY', description: 'Get instant Paystack bank checkout link & M-Pesa paybill instructions' },
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
    const { accessToken, phoneNumberId, verifyToken } = req.body;
    if (accessToken) process.env.WHATSAPP_ACCESS_TOKEN = accessToken;
    if (phoneNumberId) process.env.WHATSAPP_PHONE_NUMBER_ID = phoneNumberId;
    if (verifyToken) process.env.WHATSAPP_VERIFY_TOKEN = verifyToken;

    return res.status(200).json({
      success: true,
      message: 'WhatsApp Cloud API configuration updated.',
      data: {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
        hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'smartshule_wa_verify_token_2026',
      },
    });
  };
}
