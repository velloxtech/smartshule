import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppContainer } from '../container';
import { createApiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createExpressApp(container: AppContainer): Express {
  const app = express();

  // Standard Middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

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

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
