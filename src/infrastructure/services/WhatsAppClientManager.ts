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
  private lidToPhoneMap = new Map<string, string>();
  private phoneToLidMap = new Map<string, string>();

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

          const { senderPhone, replyJid } = await this.resolveSenderPhone(msg, remoteJid);

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

          console.log(`[WhatsApp Inbound] Real message from ${senderPhone} (Chat JID: ${remoteJid}): "${text.trim()}"`);

          // Process via registered inbound handler
          if (this.inboundHandler) {
            try {
              const reply = await this.inboundHandler(senderPhone, text.trim());
              if (reply && reply.replyText) {
                // Send real reply back through the actual WhatsApp account!
                // Prioritize replyJid (the exact chat where the message originated) to guarantee delivery
                await this.sendRealMessage(senderPhone, reply.replyText, reply.intent, replyJid);
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
   * Resolves the actual phone number and reply JID from incoming Baileys message
   * Handles both standard phone JIDs (@s.whatsapp.net) and multi-device LIDs (@lid)
   */
  public async resolveSenderPhone(msg: any, remoteJid: string): Promise<{ senderPhone: string; replyJid: string }> {
    const replyJid = remoteJid;

    // Case 1: Standard WhatsApp user JID: e.g. "254759496975@s.whatsapp.net" or "254759496975:1@s.whatsapp.net"
    if (remoteJid.endsWith('@s.whatsapp.net')) {
      const rawUser = remoteJid.replace('@s.whatsapp.net', '').split(':')[0].replace(/[^0-9]/g, '');
      const senderPhone = rawUser.startsWith('+') ? rawUser : `+${rawUser}`;
      return { senderPhone, replyJid };
    }

    // Case 2: Multi-device / privacy LID: e.g. "148438935179455@lid"
    if (remoteJid.endsWith('@lid')) {
      const lidUser = remoteJid.replace('@lid', '').split(':')[0].replace(/[^0-9]/g, '');

      // 2a. Check in-memory cache
      if (this.lidToPhoneMap.has(lidUser)) {
        const phone = this.lidToPhoneMap.get(lidUser)!;
        return { senderPhone: phone, replyJid };
      }

      // 2b. Check msg.key.remoteJidAlt or participantAlt in Baileys message key
      const altJid = msg?.key?.remoteJidAlt || msg?.key?.participantAlt || msg?.participant;
      if (altJid && typeof altJid === 'string' && altJid.endsWith('@s.whatsapp.net')) {
        const rawPn = altJid.replace('@s.whatsapp.net', '').split(':')[0].replace(/[^0-9]/g, '');
        if (rawPn.length >= 9) {
          const phone = `+${rawPn}`;
          this.lidToPhoneMap.set(lidUser, phone);
          this.phoneToLidMap.set(rawPn, remoteJid);
          return { senderPhone: phone, replyJid };
        }
      }

      // 2c. Check Baileys internal signalRepository.lidMapping
      if (this.sock && (this.sock as any).signalRepository?.lidMapping?.getPNForLID) {
        try {
          const pnResult = await (this.sock as any).signalRepository.lidMapping.getPNForLID(remoteJid);
          if (pnResult) {
            const pnStr = typeof pnResult === 'string' ? pnResult : (pnResult.pn || '');
            const rawPn = pnStr.replace(/@.+/, '').split(':')[0].replace(/[^0-9]/g, '');
            if (rawPn.length >= 9) {
              const phone = `+${rawPn}`;
              this.lidToPhoneMap.set(lidUser, phone);
              this.phoneToLidMap.set(rawPn, remoteJid);
              return { senderPhone: phone, replyJid };
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // 2d. Check saved session files for lid-mapping-<lidUser>_reverse.json
      try {
        const reverseFile = path.join(this.sessionDir, `lid-mapping-${lidUser}_reverse.json`);
        if (fs.existsSync(reverseFile)) {
          const raw = fs.readFileSync(reverseFile, 'utf8');
          const parsed = JSON.parse(raw);
          const rawPn = (parsed || '').toString().replace(/[^0-9]/g, '');
          if (rawPn.length >= 9) {
            const phone = `+${rawPn}`;
            this.lidToPhoneMap.set(lidUser, phone);
            this.phoneToLidMap.set(rawPn, remoteJid);
            return { senderPhone: phone, replyJid };
          }
        }
      } catch (e) {
        // ignore
      }

      // 2e. Check if any file in sessionDir is lid-mapping-* matching this LID
      try {
        const files = fs.readdirSync(this.sessionDir);
        for (const file of files) {
          if (file.startsWith('lid-mapping-') && file.endsWith('.json') && !file.includes('_reverse')) {
            const content = fs.readFileSync(path.join(this.sessionDir, file), 'utf8');
            if (content.includes(lidUser)) {
              const pnFromFileName = file.replace('lid-mapping-', '').replace('.json', '').replace(/[^0-9]/g, '');
              if (pnFromFileName.length >= 9) {
                const phone = `+${pnFromFileName}`;
                this.lidToPhoneMap.set(lidUser, phone);
                this.phoneToLidMap.set(pnFromFileName, remoteJid);
                return { senderPhone: phone, replyJid };
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // Fallback if completely unresolved
      console.warn(`[WhatsApp Inbound] Could not resolve real phone number for LID: ${remoteJid}`);
      return { senderPhone: `+${lidUser}`, replyJid };
    }

    // Default fallback
    const raw = remoteJid.replace(/@.+/, '').split(':')[0].replace(/[^0-9]/g, '');
    return { senderPhone: raw ? `+${raw}` : remoteJid, replyJid };
  }

  /**
   * Sends an actual WhatsApp message to a real phone number or JID
   */
  public async sendRealMessage(
    toPhoneOrJid: string,
    messageText: string,
    intent?: string,
    preferredJid?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const text = (messageText || '').trim();
    if (!text) {
      return { success: false, error: 'Message text cannot be empty' };
    }

    // Determine target JID for Baileys socket
    let targetJid = (preferredJid || '').trim();
    if (!targetJid) {
      if (toPhoneOrJid.includes('@s.whatsapp.net') || toPhoneOrJid.includes('@lid')) {
        targetJid = toPhoneOrJid.trim();
      } else {
        const cleanDigits = toPhoneOrJid.replace(/[^0-9]/g, '');
        if (cleanDigits.length < 9) {
          return { success: false, error: `Invalid recipient phone number: ${toPhoneOrJid}` };
        }
        // Check if we already have a mapped LID for this phone number
        const mappedLid = this.phoneToLidMap.get(cleanDigits);
        if (mappedLid) {
          targetJid = mappedLid;
        } else {
          targetJid = `${cleanDigits}@s.whatsapp.net`;
        }
      }
    }

    // Clean human-readable phone number for logging and Meta API fallback
    const rawDigits = toPhoneOrJid.replace(/@.+/, '').replace(/[^0-9]/g, '');
    const displayPhone = rawDigits.length >= 9
      ? (rawDigits.startsWith('254') ? `+${rawDigits}` : `+254${rawDigits.replace(/^0/, '')}`)
      : (toPhoneOrJid.startsWith('+') ? toPhoneOrJid : `+${toPhoneOrJid}`);

    // 1. Try Baileys connected socket (Actual WhatsApp account)
    if (this.sock && this.status === 'CONNECTED') {
      try {
        console.log(`[WhatsApp Outbound] Sending via Baileys to JID: ${targetJid} (Recipient: ${displayPhone})`);
        const result = await this.sock.sendMessage(targetJid, { text });

        this.totalSent++;
        const outLog: WhatsAppMessageLog = {
          id: result?.key?.id || `out-${Date.now()}`,
          direction: 'OUTBOUND',
          from: this.connectedPhone || 'SmartShule Account',
          to: displayPhone,
          text,
          status: 'SENT',
          timestamp: new Date().toISOString(),
          intent,
        };
        this.recordMessage(outLog);

        console.log(`[WhatsApp Outbound] ✅ Real message sent to ${displayPhone} | ID: ${outLog.id}`);
        return { success: true, messageId: outLog.id };
      } catch (err: any) {
        console.error(`[WhatsApp Outbound] Error sending to ${displayPhone} (JID: ${targetJid}):`, err);
        return { success: false, error: err.message || 'Failed to send WhatsApp message' };
      }
    }

    // 2. Try Meta WhatsApp Cloud API if credentials are provided in environment
    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (metaToken && phoneId) {
      try {
        const cleanPhone = rawDigits;
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
            to: displayPhone,
            text,
            status: 'SENT',
            timestamp: new Date().toISOString(),
            intent,
          };
          this.recordMessage(outLog);

          console.log(`[WhatsApp Outbound (Meta Cloud)] ✅ Sent to ${displayPhone} | ID: ${msgId}`);
          return { success: true, messageId: msgId };
        } else {
          const errMsg = data.error?.message || 'Meta Cloud API rejected the message';
          console.error(`[WhatsApp Outbound (Meta Cloud)] Error sending to ${displayPhone}:`, errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        console.error(`[WhatsApp Outbound (Meta Cloud)] Exception sending to ${displayPhone}:`, err);
        return { success: false, error: err.message };
      }
    }

    return {
      success: false,
      error: 'No active WhatsApp connection or Meta Cloud credentials available',
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
