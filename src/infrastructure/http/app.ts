import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppContainer } from '../container';
import { createApiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createExpressApp(container: AppContainer): Express {
  const app = express();

  // Standard Middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  const rawCors = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
  const corsOrigin = rawCors === '*' ? '*' : rawCors.trim().replace(/\/+$/, '');
  const allowedOrigins = [
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

  // Root Service Overview Endpoint
  app.get('/', (req: Request, res: Response, next) => {
    const frontendDist = path.resolve(__dirname, '../../../Frontend/smartshule/dist');
    if (fs.existsSync(frontendDist)) {
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
      frontendUrl: process.env.FRONTEND_URL || 'https://smartshule-1.onrender.com'
    });
  });

  // Health Check Endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'SmartShule CBC School Management Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
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
          'CBC Assessments & Report Cards (/api/v1/cbc)',
          'Schemes of Work & Lesson Plans (/api/v1/curriculum)',
          'Timetables & Conflict Checks (/api/v1/timetables)',
          'Class Registers & Attendance (/api/v1/attendance)',
          'Fee Payments & M-Pesa Daraja STK (/api/v1/finance)',
          'School Analytics & Dashboard (/api/v1/analytics)'
        ]
      }
    });
  });

  // Register API Routes
  app.use('/api/v1', createApiRouter(container));

  // Serve Frontend production build if dist exists
  const frontendDist = path.resolve(__dirname, '../../../Frontend/smartshule/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req: Request, res: Response, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        return res.sendFile(path.join(frontendDist, 'index.html'));
      }
      next();
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
