import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { AppContainer } from '../container';
import { createApiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { createAccountabilityMiddleware } from './middlewares/accountabilityMiddleware';
import { generalApiLimiter } from './middlewares/rateLimiter';

export function createExpressApp(container: AppContainer): Express {
  const app = express();

  // Enable trust proxy for accurate client IP behind reverse proxies/load balancers
  app.set('trust proxy', true);

  // Correlation ID tracking
  app.use((req: Request, res: Response, next) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Correlation-ID', correlationId);
    (req as any).correlationId = correlationId;
    next();
  });

  // Response Compression (threshold: 1KB)
  app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Production Security Headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
  const rawCors = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
  const corsOrigin = rawCors === '*' ? '*' : rawCors.trim().replace(/\/+$/, '');
  const allowedOrigins = [
    'https://smartshule-vg15.onrender.com',
    'https://smartshule-1.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  if (corsOrigin !== '*' && !allowedOrigins.includes(corsOrigin)) {
    allowedOrigins.push(corsOrigin);
  }
  app.use(cors({
    origin: corsOrigin === '*' ? true : (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow configured requests
      }
    },
    credentials: true
  }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(createAccountabilityMiddleware(container.systemLogUseCases));

  // Serve uploads directory statically for photo storage
  const uploadDir = path.resolve(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {
      // ignore
    }
  }
  app.use('/uploads', express.static(uploadDir));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Helper to locate Frontend production distribution
  const resolveFrontendDist = (): string | null => {
    const candidatePaths = [
      process.env.FRONTEND_DIST_PATH,
      path.resolve(process.cwd(), 'Frontend/smartshule/dist'),
      path.resolve(__dirname, '../../../Frontend/smartshule/dist'),
      path.resolve(__dirname, '../../../../Frontend/smartshule/dist')
    ].filter(Boolean) as string[];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(path.join(candidate, 'index.html'))) {
        return candidate;
      }
    }
    return null;
  };

  const frontendDist = resolveFrontendDist();

  // Root Service Overview Endpoint
  app.get('/', (req: Request, res: Response, next) => {
    if (frontendDist) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    return res.status(200).json({
      service: 'SmartShule CBC School Management Backend API',
      status: 'UP',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        documentation: '/api',
        apiRoot: '/api/v1'
      },
      frontendUrl: process.env.FRONTEND_URL || 'https://smartshule-vg15.onrender.com'
    });
  });

  // Liveness Check Endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'SmartShule CBC School Management Backend',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // Readiness Check Endpoint (Verifies active database connectivity)
  app.get('/health/ready', async (req: Request, res: Response) => {
    try {
      if ((container.academicRepository as any)?.pool?.query) {
        await (container.academicRepository as any).pool.query('SELECT 1');
      }
      res.status(200).json({
        status: 'READY',
        service: 'SmartShule CBC School Management Backend',
        database: 'CONNECTED',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      });
    } catch {
      res.status(503).json({
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API Documentation Overview / Root
  app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Welcome to SmartShule Hexagonal API',
      documentation: {
        postmanCollection: '/api/v1/docs/postman',
        modules: [
          'Auth & RBAC (/api/v1/auth)',
          'Academic Structure & Levels (/api/v1/academics)',
          'Students & Guardians (/api/v1/students)',
          'Teachers & Streams (/api/v1/teachers)',
          'CBC Assessments & Report Cards (/api/v1/CBC)',
          'Schemes of Work & Lesson Plans (/api/v1/curriculum)',
          'Timetables & Conflict Checks (/api/v1/timetables)',
          'Class Registers & Attendance (/api/v1/attendance)',
          'Fee Payments & KCB Buni STK Push (/api/v1/finance)',
          'School Analytics & Dashboard (/api/v1/analytics)'
        ]
      }
    });
  });

  // Register API Routes with General API Rate Limiter
  app.use('/api/v1', generalApiLimiter, createApiRouter(container));

  // Serve Frontend production build if dist exists
  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/uploads')) {
        return res.sendFile(path.join(frontendDist, 'index.html'));
      }
      next();
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
