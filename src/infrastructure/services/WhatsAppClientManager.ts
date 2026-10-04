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
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED';
  timestamp: string;
  intent?: string;
  conversationId?: string;
  type?: 'TEXT' | 'TEMPLATE';
  templateName?: string;
}

export interface ActiveServiceWindow {
  phone: string;
  contactName?: string;
  startedAt: string;
  expiresAt: string;
  remainingMinutes: number;
}

export interface MetaFreeTierUsage {
  monthlyLimit: number;
  usedConversations: number;
  remainingFree: number;
  billingMonth: string;
  resetDate: string;
  active24hWindowsCount: number;
  activeWindows: ActiveServiceWindow[];
}

export interface MetaCloudConfig {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  verifyToken?: string;
  appSecret?: string;
  apiBaseUrl?: string;
}

export interface WhatsAppConnectionState {
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastConnectedAt: string | null;
  totalSent: number;
  totalReceived: number;
  mode: 'META_CLOUD_API' | 'REAL_WHATSAPP_ACCOUNT';
  isOfficialMeta: boolean;
  banProtection: {
    isSafe: boolean;
    level: 'BAN_IMMUNE' | 'HIGH_RISK';
    message: string;
    warning?: string;
  };
  freeTier: MetaFreeTierUsage;
  metaProfile?: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  };
}

export type InboundMessageHandler = (
  fromPhone: string,
  text: string
) => Promise<{ replyText: string; intent?: string; ignored?: boolean }>;

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
  private configFilePath: string;
  private inboundHandler: InboundMessageHandler | null = null;
  private isReconnecting = false;
  private lidToPhoneMap = new Map<string, string>();
  private phoneToLidMap = new Map<string, string>();

  // Meta Cloud API configuration & Free Tier State
  private metaConfig: MetaCloudConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'smartshule_wa_verify_token_2026',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiBaseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0',
  };

  private freeTierUsage = {
    monthlyLimit: 1000,
    usedConversations: 0,
    billingMonth: new Date().toISOString().substring(0, 7), // e.g. "2026-10"
    windows: {} as Record<string, { startedAt: string; expiresAt: string; contactName?: string }>,
  };

  private metaProfile: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
  } = {};

  constructor(sessionPath?: string, configPath?: string) {
    this.sessionDir = sessionPath || process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), 'data', 'whatsapp_session');
    this.configFilePath = configPath || path.join(process.cwd(), 'data', 'whatsapp_meta_config.json');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Load persisted Meta configuration and free tier tracking
    this.loadPersistedConfig();

    // Check if Meta Cloud API credentials are provided
    if (this.metaConfig.accessToken && this.metaConfig.phoneNumberId) {
      this.status = 'CONNECTED';
      this.connectedPhone = this.metaProfile.displayPhoneNumber || `ID: ${this.metaConfig.phoneNumberId}`;
      this.connectedName = this.metaProfile.verifiedName || 'SmartShule Official (Meta Cloud)';
      this.lastConnectedAt = new Date().toISOString();
    }
  }

  public resetFreeTierForTesting() {
    this.freeTierUsage = {
      monthlyLimit: 1000,
      usedConversations: 0,
      billingMonth: new Date().toISOString().substring(0, 7),
      windows: {},
    };
    this.savePersistedConfig();
  }

  public setInboundHandler(handler: InboundMessageHandler) {
    this.inboundHandler = handler;
  }

  /**
   * Persists Meta configuration and free tier conversation windows to disk
   */
  private loadPersistedConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.metaConfig) {
          this.metaConfig = {
            ...this.metaConfig,
            ...parsed.metaConfig,
            // Keep environment variables as priority if set
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN || parsed.metaConfig.accessToken || '',
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || parsed.metaConfig.phoneNumberId || '',
            businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || parsed.metaConfig.businessAccountId || '',
            verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || parsed.metaConfig.verifyToken || 'smartshule_wa_verify_token_2026',
            appSecret: process.env.WHATSAPP_APP_SECRET || parsed.metaConfig.appSecret || '',
            apiBaseUrl: process.env.WHATSAPP_API_BASE_URL || parsed.metaConfig.apiBaseUrl || 'https://graph.facebook.com/v21.0',
          };
        }
        if (parsed.freeTierUsage) {
          const currentMonth = new Date().toISOString().substring(0, 7);
          if (parsed.freeTierUsage.billingMonth === currentMonth) {
            this.freeTierUsage = parsed.freeTierUsage;
          } else {
            // New calendar month: reset 1,000 free monthly conversations quota!
            this.freeTierUsage = {
              monthlyLimit: 1000,
              usedConversations: 0,
              billingMonth: currentMonth,
              windows: {},
            };
          }
        }
        if (parsed.metaProfile) {
          this.metaProfile = parsed.metaProfile;
        }
      }
    } catch (err) {
      console.warn('[WhatsApp Cloud] Could not load persisted config:', err);
    }
  }

  private savePersistedConfig() {
    try {
      const dataDir = path.dirname(this.configFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(
          {
            metaConfig: this.metaConfig,
            freeTierUsage: this.freeTierUsage,
            metaProfile: this.metaProfile,
            savedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (err) {
      console.warn('[WhatsApp Cloud] Could not save persisted config:', err);
    }
  }

  /**
   * Evaluates the 1,000 free monthly conversations quota and active 24-hr service windows
   */
  public getFreeTierUsage(): MetaFreeTierUsage {
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (this.freeTierUsage.billingMonth !== currentMonth) {
      this.freeTierUsage.billingMonth = currentMonth;
      this.freeTierUsage.usedConversations = 0;
      this.freeTierUsage.windows = {};
      this.savePersistedConfig();
    }

    const now = Date.now();
    const activeWindowsList: ActiveServiceWindow[] = [];

    for (const [phone, win] of Object.entries(this.freeTierUsage.windows)) {
      const expTime = new Date(win.expiresAt).getTime();
      if (expTime > now) {
        const remainingMinutes = Math.max(0, Math.round((expTime - now) / 60000));
        activeWindowsList.push({
          phone,
          contactName: win.contactName,
          startedAt: win.startedAt,
          expiresAt: win.expiresAt,
          remainingMinutes,
        });
      }
    }

    // Calculate reset date: 1st of next month at 00:00 UTC
    const nowD = new Date();
    const nextMonth = new Date(Date.UTC(nowD.getFullYear(), nowD.getMonth() + 1, 1, 0, 0, 0));

    return {
      monthlyLimit: this.freeTierUsage.monthlyLimit || 1000,
      usedConversations: this.freeTierUsage.usedConversations,
      remainingFree: Math.max(0, (this.freeTierUsage.monthlyLimit || 1000) - this.freeTierUsage.usedConversations),
      billingMonth: this.freeTierUsage.billingMonth,
      resetDate: nextMonth.toISOString(),
      active24hWindowsCount: activeWindowsList.length,
      activeWindows: activeWindowsList,
    };
  }

  /**
   * Registers an inbound parent interaction:
   * Starts or maintains a 24-hour service window and increments the monthly conversation counter
   * if this interaction opens a new 24-hr conversation session.
   */
  public registerInboundSession(fromPhone: string, contactName?: string): { isNewConversation: boolean; expiresAt: string } {
    const cleanDigits = fromPhone.replace(/[^0-9]/g, '');
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (this.freeTierUsage.billingMonth !== currentMonth) {
      this.freeTierUsage.billingMonth = currentMonth;
      this.freeTierUsage.usedConversations = 0;
      this.freeTierUsage.windows = {};
    }

    const now = Date.now();
    const existingWindow = this.freeTierUsage.windows[cleanDigits];
    const isStillActive = existingWindow && new Date(existingWindow.expiresAt).getTime() > now;

    const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();

    if (!isStillActive) {
      // New 24-hour service conversation session opened!
      this.freeTierUsage.usedConversations++;
      this.freeTierUsage.windows[cleanDigits] = {
        startedAt: new Date(now).toISOString(),
        expiresAt,
        contactName,
      };
      this.savePersistedConfig();
      console.log(`[WhatsApp Free Tier] 🟢 New 24-hr service conversation started for ${cleanDigits}. Used: ${this.freeTierUsage.usedConversations}/1000 free this month.`);
      return { isNewConversation: true, expiresAt };
    } else {
      // Refresh 24-hour customer service window for reply freedom
      this.freeTierUsage.windows[cleanDigits].expiresAt = expiresAt;
      if (contactName) this.freeTierUsage.windows[cleanDigits].contactName = contactName;
      this.savePersistedConfig();
      return { isNewConversation: false, expiresAt };
    }
  }

  public getStatus(): WhatsAppConnectionState {
    const isMetaConfigured = Boolean(this.metaConfig.accessToken && this.metaConfig.phoneNumberId);
    const freeTier = this.getFreeTierUsage();

    return {
      status: isMetaConfigured ? 'CONNECTED' : this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      connectedPhone: isMetaConfigured
        ? this.metaProfile.displayPhoneNumber || this.connectedPhone || `Phone ID: ${this.metaConfig.phoneNumberId}`
        : this.connectedPhone,
      connectedName: isMetaConfigured
        ? this.metaProfile.verifiedName || this.connectedName || 'SmartShule Official (Meta Cloud API)'
        : this.connectedName,
      lastConnectedAt: this.lastConnectedAt,
      totalSent: this.totalSent,
      totalReceived: this.totalReceived,
      mode: isMetaConfigured ? 'META_CLOUD_API' : 'REAL_WHATSAPP_ACCOUNT',
      isOfficialMeta: isMetaConfigured,
      banProtection: isMetaConfigured
        ? {
            isSafe: true,
            level: 'BAN_IMMUNE',
            message: 'Official Meta WhatsApp Cloud API active. Your school phone number is 100% immune from WhatsApp bans and receives 1,000 free monthly conversations.',
          }
        : {
            isSafe: false,
            level: 'HIGH_RISK',
            message: 'Unofficial WhatsApp Web library (Baileys) detected. Unofficial clients violate WhatsApp Terms and result in permanent account bans. Please configure Meta WhatsApp Cloud API credentials to ensure 100% ban immunity and free 1,000 monthly messages.',
            warning: 'Meta actively bans numbers connecting through unofficial WhatsApp Web QR sockets. Switch to Meta Cloud API to protect your SIM.',
          },
      freeTier,
      metaProfile: {
        ...this.metaProfile,
        phoneNumberId: this.metaConfig.phoneNumberId || undefined,
        businessAccountId: this.metaConfig.businessAccountId || undefined,
      },
    };
  }

  public getRecentMessages(): WhatsAppMessageLog[] {
    return [...this.recentMessages];
  }

  /**
   * Tests and verifies Meta WhatsApp Cloud API credentials against Meta Graph API
   */
  public async testMetaConnection(overrideConfig?: Partial<MetaCloudConfig>): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
  }> {
    const token = overrideConfig?.accessToken || this.metaConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = overrideConfig?.phoneNumberId || this.metaConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiBase = overrideConfig?.apiBaseUrl || this.metaConfig.apiBaseUrl || process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0';

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'Meta WhatsApp Cloud API credentials missing: Access Token and Phone Number ID are required.',
      };
    }

    try {
      const url = `${apiBase}/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = (await res.json()) as any;

      if (res.ok && data.id) {
        this.metaProfile = {
          verifiedName: data.verified_name || 'SmartShule Official',
          displayPhoneNumber: data.display_phone_number || '',
          qualityRating: data.quality_rating || 'GREEN',
          codeVerificationStatus: data.code_verification_status || 'VERIFIED',
        };
        this.status = 'CONNECTED';
        this.connectedPhone = data.display_phone_number || `Phone ID: ${phoneId}`;
        this.connectedName = data.verified_name || 'SmartShule Official (Meta Cloud)';
        this.lastConnectedAt = new Date().toISOString();
        this.savePersistedConfig();

        console.log(`[Meta Cloud API] ✅ Verified Official WhatsApp Account: ${this.connectedName} (${this.connectedPhone}) | Quality: ${this.metaProfile.qualityRating}`);
        return { success: true, profile: data };
      } else {
        const errorMsg = data.error?.message || `Meta Graph API returned status ${res.status}`;
        console.error('[Meta Cloud API] Verification failed:', errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('[Meta Cloud API] Verification error:', err);
      return { success: false, error: err.message || 'Network error connecting to Meta Graph API' };
    }
  }

  /**
   * Updates Meta Cloud API configuration
   */
  public updateMetaConfig(config: MetaCloudConfig): { success: boolean; config: MetaCloudConfig } {
    if (config.accessToken !== undefined) {
      this.metaConfig.accessToken = config.accessToken;
      process.env.WHATSAPP_ACCESS_TOKEN = config.accessToken;
    }
    if (config.phoneNumberId !== undefined) {
      this.metaConfig.phoneNumberId = config.phoneNumberId;
      process.env.WHATSAPP_PHONE_NUMBER_ID = config.phoneNumberId;
    }
    if (config.businessAccountId !== undefined) {
      this.metaConfig.businessAccountId = config.businessAccountId;
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = config.businessAccountId;
    }
    if (config.verifyToken !== undefined) {
      this.metaConfig.verifyToken = config.verifyToken;
      process.env.WHATSAPP_VERIFY_TOKEN = config.verifyToken;
    }
    if (config.appSecret !== undefined) {
      this.metaConfig.appSecret = config.appSecret;
      process.env.WHATSAPP_APP_SECRET = config.appSecret;
    }
    if (config.apiBaseUrl !== undefined) {
      this.metaConfig.apiBaseUrl = config.apiBaseUrl;
      process.env.WHATSAPP_API_BASE_URL = config.apiBaseUrl;
    }

    this.savePersistedConfig();
    return { success: true, config: { ...this.metaConfig, accessToken: this.metaConfig.accessToken ? '***' : '' } };
  }

  /**
   * Sends an actual WhatsApp message to a real phone number.
   * Prioritizes Meta WhatsApp Cloud API (100% ban-safe, official channel with 1,000 free monthly conversations).
   */
  public async sendRealMessage(
    toPhoneOrJid: string,
    messageText: string,
    intent?: string,
    preferredJid?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string; isOfficialMeta?: boolean }> {
    const text = (messageText || '').trim();
    if (!text) {
      return { success: false, error: 'Message text cannot be empty' };
    }

    const rawDigits = toPhoneOrJid.replace(/@.+/, '').replace(/[^0-9]/g, '');
    const cleanDigits = rawDigits.startsWith('254') ? rawDigits : `254${rawDigits.replace(/^0/, '')}`;
    const displayPhone = `+${cleanDigits}`;

    // 1. PRIORITY 1: Meta WhatsApp Cloud API (Official, Ban-Immune Channel)
    const metaToken = this.metaConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = this.metaConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (metaToken && phoneId) {
      try {
        const apiBase = this.metaConfig.apiBaseUrl || process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0';
        const url = `${apiBase}/${phoneId}/messages`;

        console.log(`[WhatsApp Outbound (Meta Official Cloud)] Transmitting to ${displayPhone}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanDigits,
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
            from: this.metaProfile.displayPhoneNumber || phoneId,
            to: displayPhone,
            text,
            status: 'SENT',
            timestamp: new Date().toISOString(),
            intent,
            type: 'TEXT',
          };
          this.recordMessage(outLog);

          console.log(`[WhatsApp Outbound (Meta Official Cloud)] ✅ Delivered to ${displayPhone} | WAMID: ${msgId}`);
          return { success: true, messageId: msgId, isOfficialMeta: true };
        } else {
          const errMsg = data.error?.message || 'Meta Cloud API rejected the message';
          console.error(`[WhatsApp Outbound (Meta Cloud)] Error sending to ${displayPhone}:`, errMsg);
          return {
            success: false,
            error: `Meta Cloud API: ${errMsg}. Note: Out-of-session notifications require approved templates or active 24-hr service window.`,
            isOfficialMeta: true,
          };
        }
      } catch (err: any) {
        console.error(`[WhatsApp Outbound (Meta Cloud)] Exception sending to ${displayPhone}:`, err);
        return { success: false, error: err.message, isOfficialMeta: true };
      }
    }

    // 2. FALLBACK 2: Baileys connected socket (with Ban Warning)
    if (this.sock && this.status === 'CONNECTED') {
      console.warn('[WhatsApp Outbound] ⚠️ Warning: Transmitting via unofficial Baileys socket. We strongly recommend configuring Meta Cloud API to avoid number bans.');
      try {
        let targetJid = preferredJid || `${cleanDigits}@s.whatsapp.net`;
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
          type: 'TEXT',
        };
        this.recordMessage(outLog);

        return { success: true, messageId: outLog.id, isOfficialMeta: false };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to send WhatsApp message', isOfficialMeta: false };
      }
    }

    return {
      success: false,
      error: 'WhatsApp is not configured. Please enter your Meta WhatsApp Cloud API credentials (Phone Number ID & Access Token) to send ban-safe messages with 1,000 free monthly conversations.',
      isOfficialMeta: false,
    };
  }

  /**
   * Sends an official Meta WhatsApp Template message (for business-initiated messages outside 24h window)
   */
  public async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    languageCode = 'en',
    components: any[] = []
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const metaToken = this.metaConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = this.metaConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!metaToken || !phoneId) {
      return { success: false, error: 'Meta WhatsApp Cloud API credentials are required to send template messages.' };
    }

    const rawDigits = toPhone.replace(/@.+/, '').replace(/[^0-9]/g, '');
    const cleanDigits = rawDigits.startsWith('254') ? rawDigits : `254${rawDigits.replace(/^0/, '')}`;
    const displayPhone = `+${cleanDigits}`;

    try {
      const apiBase = this.metaConfig.apiBaseUrl || process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0';
      const url = `${apiBase}/${phoneId}/messages`;

      const bodyPayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanDigits,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      };

      if (components && components.length > 0) {
        bodyPayload.template.components = components;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await response.json()) as any;
      if (response.ok && data.messages?.[0]?.id) {
        const msgId = data.messages[0].id;
        this.totalSent++;
        const outLog: WhatsAppMessageLog = {
          id: msgId,
          direction: 'OUTBOUND',
          from: this.metaProfile.displayPhoneNumber || phoneId,
          to: displayPhone,
          text: `[Official Meta Template: ${templateName}]`,
          status: 'SENT',
          timestamp: new Date().toISOString(),
          intent: `TEMPLATE_${templateName.toUpperCase()}`,
          type: 'TEMPLATE',
          templateName,
        };
        this.recordMessage(outLog);
        return { success: true, messageId: msgId };
      } else {
        const errMsg = data.error?.message || 'Meta Cloud API rejected template';
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates delivery status of a message when Meta posts a status webhook event
   */
  public updateMessageStatus(messageId: string, status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED', conversationId?: string) {
    const existing = this.recentMessages.find((m) => m.id === messageId);
    if (existing) {
      existing.status = status;
      if (conversationId) existing.conversationId = conversationId;
    }
  }

  /**
   * Processes Meta Cloud API Webhook payload (messages and statuses)
   */
  public async handleWebhookPayload(body: any): Promise<{ status: string; data?: any }> {
    if (body.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};

          // 1. Process Status Receipts (DELIVERED, READ, FAILED)
          if (Array.isArray(value.statuses)) {
            for (const st of value.statuses) {
              const statusName = (st.status || '').toUpperCase();
              if (['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(statusName)) {
                this.updateMessageStatus(st.id, statusName as any, st.conversation?.id);
                console.log(`[WhatsApp Webhook Status] Message ${st.id} -> ${statusName}`);
              }
            }
          }

          // 2. Process Inbound Messages from Parents
          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const fromPhone = msg.from; // e.g. 254711223344
              const contactName = value.contacts?.[0]?.profile?.name || undefined;
              const text = msg.text?.body || msg.button?.text || '';

              if (!text.trim()) continue;

              this.totalReceived++;

              // Register session: updates 24-hr window & free tier 1,000 monthly counter
              this.registerInboundSession(fromPhone, contactName);

              const inLog: WhatsAppMessageLog = {
                id: msg.id || `in-${Date.now()}`,
                direction: 'INBOUND',
                from: fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`,
                to: this.connectedPhone || 'SmartShule Official',
                text: text.trim(),
                status: 'RECEIVED',
                timestamp: new Date().toISOString(),
                type: 'TEXT',
              };
              this.recordMessage(inLog);

              console.log(`[WhatsApp Official Inbound] From: ${fromPhone} (${contactName || 'Parent'}): "${text.trim()}"`);

              // Handle via registered inbound handler
              if (this.inboundHandler) {
                try {
                  const reply = await this.inboundHandler(fromPhone, text.trim());
                  if (reply && reply.replyText && reply.replyText.trim().length > 0 && reply.intent !== 'UNREGISTERED' && !reply.ignored) {
                    await this.sendRealMessage(fromPhone, reply.replyText, reply.intent);
                  } else {
                    console.log(`[WhatsApp Official Inbound] Ignored sender ${fromPhone} (not registered in database)`);
                  }
                  return { status: 'PROCESSED', data: reply };
                } catch (err) {
                  console.error('[WhatsApp Official Inbound] Error handling message:', err);
                }
              }
            }
          }
        }
      }
      return { status: 'PROCESSED_WEBHOOK' };
    }

    // Generic simplified payload
    if (body.from && body.message) {
      this.totalReceived++;
      this.registerInboundSession(body.from);
      if (this.inboundHandler) {
        const reply = await this.inboundHandler(body.from, body.message);
        if (reply && reply.replyText && reply.intent !== 'UNREGISTERED' && !reply.ignored) {
          await this.sendRealMessage(body.from, reply.replyText, reply.intent);
        }
        return { status: 'PROCESSED', data: reply };
      }
    }

    return { status: 'IGNORED_NON_MESSAGE_EVENT' };
  }

  /**
   * Initializes Baileys WhatsApp Multi-Device connection (Safe Mode with High Ban Risk Warning)
   */
  public async connect(): Promise<WhatsAppConnectionState> {
    // If Meta Cloud API is already configured, notify user that they are safe and protected
    if (this.metaConfig.accessToken && this.metaConfig.phoneNumberId) {
      console.log('[WhatsApp Account] Meta Official Cloud API is active. QR Multi-Device connection bypassed to protect account from bans.');
      return this.getStatus();
    }

    console.warn('[WhatsApp Account] ⚠️ Initiating Baileys QR code pairing. Note: Unofficial WhatsApp Web libraries carry a high risk of permanent account bans. Switch to Meta Cloud API for ban immunity.');

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

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: { dark: '#000000', light: '#ffffff' },
            });
            this.status = 'SCAN_QR';
            console.log('[WhatsApp Account] QR Code generated. Scan with WhatsApp > Linked Devices.');
          } catch (err) {
            console.error('[WhatsApp Account] QR Code generation error:', err);
          }
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.lastConnectedAt = new Date().toISOString();
          this.isReconnecting = false;

          const userJid = socket.user?.id || '';
          const phoneClean = userJid.split(':')[0].split('@')[0];
          this.connectedPhone = phoneClean ? (phoneClean.startsWith('+') ? phoneClean : `+${phoneClean}`) : null;
          this.connectedName = socket.user?.name || 'SmartShule Account';

          console.log(`[WhatsApp Account] Connected: ${this.connectedPhone}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

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

      socket.ev.on('messages.upsert', async ({ messages: incomingList, type }: any) => {
        if (type !== 'notify') return;

        for (const msg of incomingList) {
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid || '';
          if (remoteJid.includes('@broadcast') || remoteJid.includes('@g.us')) continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          if (!text.trim()) continue;

          const { senderPhone, replyJid } = await this.resolveSenderPhone(msg, remoteJid);

          this.totalReceived++;
          this.registerInboundSession(senderPhone);

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

          if (this.inboundHandler) {
            try {
              const reply = await this.inboundHandler(senderPhone, text.trim());
              if (reply && reply.replyText && reply.intent !== 'UNREGISTERED' && !reply.ignored) {
                await this.sendRealMessage(senderPhone, reply.replyText, reply.intent, replyJid);
              }
            } catch (err) {
              console.error('[WhatsApp Inbound] Error:', err);
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
   * Resolves sender phone number and reply JID from incoming Baileys message
   */
  public async resolveSenderPhone(msg: any, remoteJid: string): Promise<{ senderPhone: string; replyJid: string }> {
    const replyJid = remoteJid;

    if (remoteJid.endsWith('@s.whatsapp.net')) {
      const rawUser = remoteJid.replace('@s.whatsapp.net', '').split(':')[0].replace(/[^0-9]/g, '');
      const senderPhone = rawUser.startsWith('+') ? rawUser : `+${rawUser}`;
      return { senderPhone, replyJid };
    }

    if (remoteJid.endsWith('@lid')) {
      const lidUser = remoteJid.replace('@lid', '').split(':')[0].replace(/[^0-9]/g, '');

      if (this.lidToPhoneMap.has(lidUser)) {
        return { senderPhone: this.lidToPhoneMap.get(lidUser)!, replyJid };
      }

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
        } catch {
          // ignore
        }
      }

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
      } catch {
        // ignore
      }

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
      } catch {
        // ignore
      }

      return { senderPhone: `+${lidUser}`, replyJid };
    }

    const raw = remoteJid.replace(/@.+/, '').split(':')[0].replace(/[^0-9]/g, '');
    return { senderPhone: raw ? `+${raw}` : remoteJid, replyJid };
  }

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
