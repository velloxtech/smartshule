import mongoose from 'mongoose';
import { Pool } from 'pg';

import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryTeacherRepository,
  InMemoryGuardianRepository,
  InMemoryAcademicRepository,
  InMemoryCbcAssessmentRepository,
  InMemorySchemeOfWorkRepository,
  InMemoryLessonPlanRepository,
  InMemoryTimetableRepository,
  InMemoryAttendanceRepository,
  InMemoryFeeRepository,
  InMemoryMediaRepository,
  InMemoryEDiaryRepository
} from './in-memory/InMemoryRepositories';

import {
  MongoUserRepository,
  MongoStudentRepository,
  MongoTeacherRepository,
  MongoGuardianRepository,
  MongoAcademicRepository,
  MongoCbcAssessmentRepository,
  MongoSchemeOfWorkRepository,
  MongoLessonPlanRepository,
  MongoTimetableRepository,
  MongoAttendanceRepository,
  MongoFeeRepository
} from './mongodb/MongooseRepositories';

import {
  PostgresDatabaseInitializer,
  PostgresUserRepository,
  PostgresStudentRepository,
  PostgresTeacherRepository,
  PostgresGuardianRepository,
  PostgresAcademicRepository,
  PostgresCbcAssessmentRepository,
  PostgresSchemeOfWorkRepository,
  PostgresLessonPlanRepository,
  PostgresTimetableRepository,
  PostgresAttendanceRepository,
  PostgresFeeRepository
} from './postgres/PostgresRepositories';

import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ICbcAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { ISchemeOfWorkRepository, ILessonPlanRepository } from '../../core/ports/repositories/ISchemeOfWorkRepository';
import { ITimetableRepository, IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';

import { IMediaRepository } from '../../core/ports/repositories/IMediaRepository';
import { IEDiaryRepository } from '../../core/ports/repositories/IEDiaryRepository';

export interface RepositoryBundle {
  userRepository: IUserRepository;
  studentRepository: IStudentRepository;
  teacherRepository: ITeacherRepository;
  guardianRepository: IGuardianRepository;
  academicRepository: IAcademicRepository;
  cbcAssessmentRepository: ICbcAssessmentRepository;
  schemeOfWorkRepository: ISchemeOfWorkRepository;
  lessonPlanRepository: ILessonPlanRepository;
  timetableRepository: ITimetableRepository;
  attendanceRepository: IAttendanceRepository;
  feeRepository: IFeeRepository;
  mediaRepository?: IMediaRepository;
  ediaryRepository?: IEDiaryRepository;
}

export class DatabaseFactory {
  public static async createRepositories(dbType: string = process.env.DB_TYPE || 'in-memory'): Promise<RepositoryBundle> {
    const normalizedType = dbType.toLowerCase().trim();

    // 1. MONGODB
    if (normalizedType === 'mongodb' || normalizedType === 'mongo') {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartshule';
      console.log(`[Database] Connecting to MongoDB: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log('[Database] MongoDB connected and collections initialized successfully.');

      return {
        userRepository: new MongoUserRepository(),
        studentRepository: new MongoStudentRepository(),
        teacherRepository: new MongoTeacherRepository(),
        guardianRepository: new MongoGuardianRepository(),
        academicRepository: new MongoAcademicRepository(),
        cbcAssessmentRepository: new MongoCbcAssessmentRepository(),
        schemeOfWorkRepository: new MongoSchemeOfWorkRepository(),
        lessonPlanRepository: new MongoLessonPlanRepository(),
        timetableRepository: new MongoTimetableRepository(),
        attendanceRepository: new MongoAttendanceRepository(),
        feeRepository: new MongoFeeRepository()
      };
    }

   // 2. POSTGRESQL
    if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
      const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartshule';
      console.log(`[Database] Connecting to PostgreSQL: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
      
      // Enable SSL for cloud connections (Supabase, Render, neon, or sslmode=require)
      const isSupabase = connectionString.includes('supabase');
      const isRender = connectionString.includes('render.com');
      const hasSslMode = connectionString.includes('sslmode=require');
      const isCloudProd = process.env.NODE_ENV === 'production' &&
        !connectionString.includes('localhost') &&
        !connectionString.includes('127.0.0.1') &&
        !connectionString.includes('@postgres:');

      const requiresSsl = isSupabase || isRender || hasSslMode || isCloudProd;
      const pool = new Pool({ 
        connectionString,
        ssl: requiresSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
      });
      
      // Auto-create all tables on start
      await PostgresDatabaseInitializer.initializeSchema(pool);
      console.log('[Database] PostgreSQL connected and tables initialized successfully.');

      return {
        userRepository: new PostgresUserRepository(pool),
        studentRepository: new PostgresStudentRepository(pool),
        teacherRepository: new PostgresTeacherRepository(pool),
        guardianRepository: new PostgresGuardianRepository(pool),
        academicRepository: new PostgresAcademicRepository(pool),
        cbcAssessmentRepository: new PostgresCbcAssessmentRepository(pool),
        schemeOfWorkRepository: new PostgresSchemeOfWorkRepository(pool),
        lessonPlanRepository: new PostgresLessonPlanRepository(pool),
        timetableRepository: new PostgresTimetableRepository(pool),
        attendanceRepository: new PostgresAttendanceRepository(pool),
        feeRepository: new PostgresFeeRepository(pool)
      };
    }

    // 3. IN-MEMORY (Default)
    console.log('[Database] Initializing In-Memory Database Adapters.');
    return {
      userRepository: new InMemoryUserRepository(),
      studentRepository: new InMemoryStudentRepository(),
      teacherRepository: new InMemoryTeacherRepository(),
      guardianRepository: new InMemoryGuardianRepository(),
      academicRepository: new InMemoryAcademicRepository(),
      cbcAssessmentRepository: new InMemoryCbcAssessmentRepository(),
      schemeOfWorkRepository: new InMemorySchemeOfWorkRepository(),
      lessonPlanRepository: new InMemoryLessonPlanRepository(),
      timetableRepository: new InMemoryTimetableRepository(),
      attendanceRepository: new InMemoryAttendanceRepository(),
      feeRepository: new InMemoryFeeRepository(),
      mediaRepository: new InMemoryMediaRepository(),
      ediaryRepository: new InMemoryEDiaryRepository()
    };
  }
}
