import dotenv from 'dotenv';
import path from 'path';
import { resolveDatabaseConfig } from './databaseResolver';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resolvedDb = resolveDatabaseConfig();

/**
 * SmartShule Application & External APIs Configuration
 * All external APIs, gateways, databases, and credentials are consolidated here.
 */
export const env = {
  // 1. Core Server
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },

  // 2. Database
  database: {
    type: (process.env.DB_TYPE || 'postgres') as 'in-memory' | 'mongodb' | 'postgres',
    target: resolvedDb.target,
    postgresUrl: resolvedDb.databaseUrl,
    directUrl: resolvedDb.directUrl,
    isCloud: resolvedDb.isCloud,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartshule',
  },

  // 3. Authentication & Security
  jwt: {
    secret: process.env.JWT_SECRET || 'smartshule-secure-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'smartshule-refresh-jwt-key-change-in-production',
    accessExpiry: process.env.JWT_EXPIRY || '1d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // 4. KCB Buni Developer Gateway API
  kcbBuni: {
    consumerKey: process.env.KCB_BUNI_CONSUMER_KEY || '',
    consumerSecret: process.env.KCB_BUNI_CONSUMER_SECRET || '',
    baseUrl: process.env.KCB_BUNI_BASE_URL || 'https://uat.buni.kcbgroup.com',
    shortCode: process.env.KCB_BUNI_SHORTCODE || '522123',
    callbackUrl: process.env.KCB_BUNI_CALLBACK_URL || 'https://api.smartshule.ac.ke/api/v1/finance/kcb-buni/callback',
  },

  // 5. WhatsApp API (Multi-Device Baileys & Meta Cloud API)
  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), 'data', 'whatsapp_session'),
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'smartshule_wa_verify_token_2026',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiBaseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v21.0',
  },

  // 6. Safaricom M-Pesa Daraja Gateway API
  mpesa: {
    shortCode: process.env.MPESA_SHORTCODE || '174379',
    passKey: process.env.MPESA_PASSKEY || '',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    env: (process.env.MPESA_ENV || 'sandbox') as 'sandbox' | 'production',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:3000/api/v1/payments/mpesa/callback',
  },

  // 7. SMS Communication Gateways (Africa's Talking / Twilio)
  sms: {
    provider: (process.env.SMS_PROVIDER || 'africastalking') as 'africastalking' | 'twilio' | 'simulator',
    africasTalking: {
      apiKey: process.env.AFRICASTALKING_API_KEY || '',
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
      senderId: process.env.AFRICASTALKING_SENDER_ID || 'SMARTSHULE',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
  },

  // 8. Email & SMTP API
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'notifications@smartshule.ac.ke',
    pass: process.env.SMTP_PASS || '',
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.EMAIL_FROM || 'SmartShule <notifications@smartshule.ac.ke>',
  },

  // 9. Google Gemini AI & Vision API
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  // 10. File & Cloud Media Storage API (Cloudinary / Local)
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'cloudinary' | 's3',
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads'),
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },
};

export default env;
