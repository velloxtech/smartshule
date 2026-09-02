import dotenv from 'dotenv';
dotenv.config();

import { AppContainer } from './infrastructure/container';
import { createExpressApp } from './infrastructure/http/app';

async function bootstrap() {
  const container = await AppContainer.create();

  // Initialize demo data for instant testing
  await container.initSeed();

  const app = createExpressApp(container);
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 SmartShule School Management API running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log(`📚 API Root: http://localhost:${PORT}/api/v1`);
    console.log('====================================================');
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
