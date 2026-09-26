import dotenv from 'dotenv';
dotenv.config();

import { AppContainer } from './infrastructure/container';
import { createExpressApp } from './infrastructure/http/app';

async function bootstrap() {
  const container = await AppContainer.create();

  // Ensure root super admin and admin accounts exist for system access
  await container.ensureAdminAccounts();

  const app = createExpressApp(container);
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 SmartShule School Management API running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log(`📚 API Root: http://localhost:${PORT}/api/v1`);
    console.log('----------------------------------------------------');
    const dbType = process.env.DB_TYPE || 'in-memory';
    const dbTarget = process.env.ACTIVE_DB_TARGET ? ` (${process.env.ACTIVE_DB_TARGET.toUpperCase()})` : '';
    console.log(`🗄️  Database:      ${dbType}${dbTarget}`);
    console.log(`🏦 KCB Buni API:   PAYBILL ${process.env.KCB_BUNI_SHORTCODE || '522123'} (M-Pesa Express STK Push Rails Active)`);
    console.log(`💬 WhatsApp API:   ${process.env.WHATSAPP_ACCESS_TOKEN ? 'META CLOUD API' : 'REAL WHATSAPP QR MULTI-DEVICE'}`);
    console.log(`📨 SMS Gateway:    ${process.env.SMS_PROVIDER || 'africastalking'} (${process.env.AFRICASTALKING_SENDER_ID || 'SMARTSHULE'})`);
    console.log(`🤖 Gemini AI API:  ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'OPTIONAL'}`);
    console.log('====================================================');
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
