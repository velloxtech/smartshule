import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WhatsAppService } from '../../services/WhatsAppService';

export const WhatsAppSimulateSchema = z.object({
  phoneNumber: z.string().min(6),
  message: z.string().min(1)
});

export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

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

        const reply = await this.whatsAppService.handleInboundMessage(fromPhone, messageText);
        console.log(`[WhatsApp Inbound] From: ${fromPhone} | Body: "${messageText}" | Reply: "${reply.intent}"`);

        // Return 200 immediately to acknowledge Meta webhook
        return res.status(200).json({ status: 'PROCESSED', data: reply });
      }

      // Generic webhook / simplified payload format: { from, message }
      if (body.from && body.message) {
        const reply = await this.whatsAppService.handleInboundMessage(body.from, body.message);
        return res.status(200).json({ status: 'PROCESSED', data: reply });
      }

      return res.status(200).json({ status: 'IGNORED_NON_MESSAGE_EVENT' });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Interactive Simulator Endpoint for frontend testing / parent query simulation
   */
  public simulate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber, message } = req.body;
      const result = await this.whatsAppService.handleInboundMessage(phoneNumber, message);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Status & instructions for WhatsApp setup
   */
  public getConfig = async (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      data: {
        botName: 'Grace Seed Academy CBC WhatsApp Assistant',
        businessPhone: '+254 712 345 678',
        webhookUrl: '/api/v1/whatsapp/webhook',
        supportedCommands: [
          { command: '1 or FEES', description: 'Query student fee balance and statement' },
          { command: '2 or PAY', description: 'Get Paystack bank checkout & virtual account details' },
          { command: '3 or EDIARY', description: 'View today\'s homework & teacher remarks' },
          { command: '4 or ATTENDANCE', description: 'Check student attendance & roll-call status' },
          { command: '5 or PROGRESS', description: 'CBC competency grades & teacher feedback' },
          { command: '6 or HELP', description: 'Ask teacher a question / help desk' }
        ]
      }
    });
  };
}
