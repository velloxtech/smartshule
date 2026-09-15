import type { WASocket } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export interface WhatsAppMessageLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from: string;
  to: string;
  text: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RECEIVED';
  timestamp: string;
  intent?: string;
}

export interface WhatsAppConnectionState {
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastConnectedAt: string | null;
  totalSent: number;
  totalReceived: number;
  mode: 'REAL_WHATSAPP_ACCOUNT' | 'META_CLOUD_API';
}

export type InboundMessageHandler = (fromPhone: string, text: string) => Promise<{ replyText: string; intent?: string }>;

export class WhatsAppClientManager {
  private sock: WASocket | null = null;
  private status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedPhone: string | null = null;
  private connectedName: string | null = null;
  private lastConnectedAt: string | null = null;
  private totalSent = 0;
  private totalReceived = 0;
  private recentMessages: WhatsAppMessageLog[] = [];
  private sessionDir: string;
  private inboundHandler: InboundMessageHandler | null = null;
  private isReconnecting = false;

  constructor(sessionPath?: string) {
    this.sessionDir = sessionPath || process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), 'data', 'whatsapp_session');
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  public setInboundHandler(handler: InboundMessageHandler) {
    this.inboundHandler = handler;
  }

  public getStatus(): WhatsAppConnectionState {
    return {
      status: this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      connectedPhone: this.connectedPhone,
      connectedName: this.connectedName,
      lastConnectedAt: this.lastConnectedAt,
      totalSent: this.totalSent,
      totalReceived: this.totalReceived,
      mode: process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
        ? 'META_CLOUD_API'
        : 'REAL_WHATSAPP_ACCOUNT'
    };
  }

  public getRecentMessages(): WhatsAppMessageLog[] {
    return [...this.recentMessages];
  }

  /**
   * Initializes or re-initializes Baileys WhatsApp Multi-Device connection
   */
  public async connect(): Promise<WhatsAppConnectionState> {
    if (this.sock && this.status === 'CONNECTED') {
      return this.getStatus();
    }

    try {
      this.status = 'CONNECTING';
      this.qrCodeDataUrl = null;

      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = (baileys as any).default || (baileys as any).makeWASocket;
      const { DisconnectReason, useMultiFileAuthState } = baileys as any;
      const pinoModule = await import('pino');
      const pino = (pinoModule as any).default || pinoModule;

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['SmartShule CBC Portal', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      this.sock = socket;

      // Save credentials whenever updated
      socket.ev.on('creds.update', saveCreds);

      // Listen for connection state changes (QR code, connect, disconnect)
      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            this.status = 'SCAN_QR';
            console.log('[WhatsApp Account] New QR Code generated. Scan with WhatsApp > Linked Devices to connect.');
          } catch (err) {
            console.error('[WhatsApp Account] Error generating QR code data URL:', err);
          }
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.lastConnectedAt = new Date().toISOString();
          this.isReconnecting = false;

          const userJid = socket.user?.id || '';
          // Extract real phone number: e.g. 254712345678:1@s.whatsapp.net -> +254712345678
          const phoneClean = userJid.split(':')[0].split('@')[0];
          this.connectedPhone = phoneClean ? (phoneClean.startsWith('+') ? phoneClean : `+${phoneClean}`) : null;
          this.connectedName = socket.user?.name || 'SmartShule Official';

          console.log(`[WhatsApp Account] ✅ Connected to real WhatsApp account: ${this.connectedPhone} (${this.connectedName})`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.warn(`[WhatsApp Account] Connection closed with code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.status = 'DISCONNECTED';
            this.connectedPhone = null;
            this.connectedName = null;
            this.qrCodeDataUrl = null;
            this.clearSessionFiles();
          } else if (shouldReconnect && !this.isReconnecting) {
            this.isReconnecting = true;
            this.status = 'CONNECTING';
            setTimeout(() => {
              this.isReconnecting = false;
              this.connect().catch((e) => console.error('[WhatsApp Account] Reconnect error:', e));
            }, 5000);
          } else {
            this.status = 'DISCONNECTED';
          }
        }
      });

      // Listen for actual inbound messages from parents/users
      socket.ev.on('messages.upsert', async ({ messages: incomingList, type }: any) => {
        if (type !== 'notify') return;

        for (const msg of incomingList) {
          // Ignore own messages or status broadcasts or group chats
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid || '';
          if (remoteJid.includes('@broadcast') || remoteJid.includes('@g.us')) continue;

          // Extract text
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          if (!text.trim()) continue;

          const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
          const senderPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

          this.totalReceived++;

          const inLog: WhatsAppMessageLog = {
            id: msg.key.id || `in-${Date.now()}`,
            direction: 'INBOUND',
            from: senderPhone,
            to: this.connectedPhone || 'SmartShule Account',
            text: text.trim(),
            status: 'RECEIVED',
            timestamp: new Date().toISOString(),
          };
          this.recordMessage(inLog);

          console.log(`[WhatsApp Inbound] Real message from ${senderPhone}: "${text.trim()}"`);

          // Process via registered inbound handler
          if (this.inboundHandler) {
            try {
              const reply = await this.inboundHandler(senderPhone, text.trim());
              if (reply && reply.replyText) {
                // Send real reply back through the actual WhatsApp account!
                await this.sendRealMessage(senderPhone, reply.replyText, reply.intent);
              }
            } catch (err) {
              console.error('[WhatsApp Inbound] Error handling message:', err);
            }
          }
        }
      });

      return this.getStatus();
    } catch (err: any) {
      console.error('[WhatsApp Account] Failed to initialize connection:', err);
      this.status = 'DISCONNECTED';
      throw err;
    }
  }

  /**
   * Sends an actual WhatsApp message to a real phone number
   */
  public async sendRealMessage(
    toPhone: string,
    messageText: string,
    intent?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const text = (messageText || '').trim();
    if (!text) {
      return { success: false, error: 'Message text cannot be empty' };
    }

    // Clean destination phone number
    const cleanPhone = toPhone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.length < 9) {
      return { success: false, error: `Invalid recipient phone number: ${toPhone}` };
    }

    // 1. Try Baileys connected socket (Actual WhatsApp account)
    if (this.sock && this.status === 'CONNECTED') {
      try {
        const jid = `${cleanPhone}@s.whatsapp.net`;
        const result = await this.sock.sendMessage(jid, { text });

        this.totalSent++;
        const outLog: WhatsAppMessageLog = {
          id: result?.key?.id || `out-${Date.now()}`,
          direction: 'OUTBOUND',
          from: this.connectedPhone || 'SmartShule Account',
          to: toPhone.startsWith('+') ? toPhone : `+${toPhone}`,
          text,
          status: 'SENT',
          timestamp: new Date().toISOString(),
          intent,
        };
        this.recordMessage(outLog);

        console.log(`[WhatsApp Outbound] ✅ Real message sent to ${toPhone} | ID: ${outLog.id}`);
        return { success: true, messageId: outLog.id };
      } catch (err: any) {
        console.error(`[WhatsApp Outbound] Error sending to ${toPhone}:`, err);
        return { success: false, error: err.message || 'Failed to send WhatsApp message' };
      }
    }

    // 2. Try Meta WhatsApp Cloud API if credentials are provided in environment
    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (metaToken && phoneId) {
      try {
        const apiBase = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0';
        const url = `${apiBase}/${phoneId}/messages`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { preview_url: false, body: text },
          }),
        });

        const data = (await response.json()) as any;
        if (response.ok && data.messages?.[0]?.id) {
          const msgId = data.messages[0].id;
          this.totalSent++;
          const outLog: WhatsAppMessageLog = {
            id: msgId,
            direction: 'OUTBOUND',
            from: phoneId,
            to: toPhone.startsWith('+') ? toPhone : `+${toPhone}`,
            text,
            status: 'SENT',
            timestamp: new Date().toISOString(),
            intent,
          };
          this.recordMessage(outLog);
          return { success: true, messageId: msgId };
        } else {
          const errMsg = data.error?.message || 'Meta Cloud API error';
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Meta Cloud API request failed' };
      }
    }

    return {
      success: false,
      error: 'No WhatsApp account is currently connected. Please scan the QR code to connect your actual WhatsApp account.',
    };
  }

  /**
   * Disconnects and resets session credentials
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        this.sock.end(new Error('Manual user disconnect'));
        this.sock = null;
      }
    } catch {
      // Ignore
    }

    this.status = 'DISCONNECTED';
    this.connectedPhone = null;
    this.connectedName = null;
    this.qrCodeDataUrl = null;
    this.clearSessionFiles();
    console.log('[WhatsApp Account] Disconnected and cleared session credentials.');
  }

  private recordMessage(msg: WhatsAppMessageLog) {
    this.recentMessages.unshift(msg);
    if (this.recentMessages.length > 100) {
      this.recentMessages = this.recentMessages.slice(0, 100);
    }
  }

  private clearSessionFiles() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
    } catch (e) {
      console.error('[WhatsApp Account] Error clearing session files:', e);
    }
  }
}
