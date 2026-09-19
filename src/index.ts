import dotenv from 'dotenv';
dotenv.config();

import { AppContainer } from './infrastructure/container';
import { createExpressApp } from './infrastructure/http/app';

async function bootstrap() {
  const container = await AppContainer.create();

  // Ensure all 8 default role accounts exist for system access
  await container.ensureRoleAccounts();

  const app = createExpressApp(container);
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 SmartShule School Management API running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log(`📚 API Root: http://localhost:${PORT}/api/v1`);
    console.log('----------------------------------------------------');
    console.log(`🗄️  Database:      ${process.env.DB_TYPE || 'in-memory'}`);
    console.log(`💳 Paystack API:   ${process.env.PAYSTACK_PUBLIC_KEY ? 'CONFIGURED (' + process.env.PAYSTACK_PUBLIC_KEY.substring(0, 10) + '...)' : 'SANDBOX'}`);
    console.log(`💬 WhatsApp API:   ${process.env.WHATSAPP_ACCESS_TOKEN ? 'META CLOUD API' : 'REAL WHATSAPP QR MULTI-DEVICE'}`);
    console.log(`📱 M-Pesa Daraja:  SHORTCODE ${process.env.MPESA_SHORTCODE || '174379'} (${process.env.MPESA_ENV || 'sandbox'})`);
    console.log(`📨 SMS Gateway:    ${process.env.SMS_PROVIDER || 'africastalking'} (${process.env.AFRICASTALKING_SENDER_ID || 'SMARTSHULE'})`);
    console.log(`🤖 Gemini AI API:  ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'OPTIONAL'}`);
    console.log('====================================================');
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
