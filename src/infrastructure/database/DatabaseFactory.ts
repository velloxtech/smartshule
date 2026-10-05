import mongoose from 'mongoose';
import { Pool } from 'pg';
import { resolveDatabaseConfig } from '../config/databaseResolver';

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
  InMemoryEDiaryRepository,
  InMemoryDeletedStudentRepository
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
  MongoFeeRepository,
  MongoDeletedStudentRepository
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
  PostgresFeeRepository,
  PostgresDeletedStudentRepository
} from './postgres/PostgresRepositories';

import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IDeletedStudentRepository } from '../../core/ports/repositories/IDeletedStudentRepository';
import { ITeacherRepository, IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ICbcAssessmentRepository } from '../../core/ports/repositories/ICbcAssessmentRepository';
import { ISchemeOfWorkRepository, ILessonPlanRepository } from '../../core/ports/repositories/ISchemeOfWorkRepository';
import { ITimetableRepository, IAttendanceRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../../core/ports/repositories/IFeeRepository';

import { IMediaRepository } from '../../core/ports/repositories/IMediaRepository';
import { IEDiaryRepository } from '../../core/ports/repositories/IEDiaryRepository';
import { IRecordOfWorkRepository } from '../../core/ports/repositories/IRecordOfWorkRepository';
import { IComplaintRepository } from '../../core/ports/repositories/IComplaintRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { ILunchFeeRepository } from '../../core/ports/repositories/ILunchFeeRepository';
import { ILibraryRepository } from '../../core/ports/repositories/ILibraryRepository';
import { IAnnouncementRepository } from '../../core/ports/repositories/IAnnouncementRepository';
import {
  PostgresRecordOfWorkRepository,
  InMemoryRecordOfWorkRepository,
} from './postgres/PostgresRecordOfWorkRepository';
import { InMemoryComplaintRepository } from './in-memory/InMemoryComplaintRepository';
import { PostgresComplaintRepository } from './postgres/PostgresComplaintRepository';
import { InMemorySystemLogRepository } from './in-memory/InMemorySystemLogRepository';
import { PostgresSystemLogRepository } from './postgres/PostgresSystemLogRepository';
import { InMemoryLunchFeeRepository } from './in-memory/InMemoryLunchFeeRepository';
import { PostgresLunchFeeRepository } from './postgres/PostgresLunchFeeRepository';
import { PostgresLibraryRepository } from './postgres/PostgresLibraryRepository';
import { InMemoryLibraryRepository } from './in-memory/InMemoryLibraryRepository';
import { InMemoryAnnouncementRepository } from './in-memory/InMemoryAnnouncementRepository';

export interface RepositoryBundle {
  userRepository: IUserRepository;
  studentRepository: IStudentRepository;
  deletedStudentRepository?: IDeletedStudentRepository;
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
  recordOfWorkRepository?: IRecordOfWorkRepository;
  complaintRepository?: IComplaintRepository;
  systemLogRepository?: ISystemLogRepository;
  lunchFeeRepository?: ILunchFeeRepository;
  libraryRepository?: ILibraryRepository;
  announcementRepository?: IAnnouncementRepository;
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
        deletedStudentRepository: new MongoDeletedStudentRepository(),
        teacherRepository: new MongoTeacherRepository(),
        guardianRepository: new MongoGuardianRepository(),
        academicRepository: new MongoAcademicRepository(),
        cbcAssessmentRepository: new MongoCbcAssessmentRepository(),
        schemeOfWorkRepository: new MongoSchemeOfWorkRepository(),
        lessonPlanRepository: new MongoLessonPlanRepository(),
        timetableRepository: new MongoTimetableRepository(),
        attendanceRepository: new MongoAttendanceRepository(),
        feeRepository: new MongoFeeRepository(),
        systemLogRepository: new InMemorySystemLogRepository(),
        announcementRepository: new InMemoryAnnouncementRepository()
      };
    }

   // 2. POSTGRESQL
    if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
      const dbConfig = resolveDatabaseConfig();
      const connectionString = dbConfig.databaseUrl;

      if (connectionString.includes('[') || connectionString.includes(']') || connectionString.includes('YOUR-PASSWORD')) {
        console.warn('⚠️ [Database Warning] Your DATABASE_URL contains brackets "[" or "]" or "YOUR-PASSWORD". Ensure your real database password is substituted without brackets!');
      }

      console.log(`[Database] Target: ${dbConfig.target.toUpperCase()} | Host: ${dbConfig.host}:${dbConfig.port} | Database: ${dbConfig.databaseName}`);
      console.log(`[Database] Connecting: ${dbConfig.maskedUrl}`);
      
      const requiresSsl = dbConfig.isCloud || connectionString.includes('sslmode=require');
      const pool = new Pool({ 
        connectionString,
        ssl: requiresSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
      });
      
      try {
        // Auto-create all tables on start
        await PostgresDatabaseInitializer.initializeSchema(pool);
        console.log('[Database] PostgreSQL connected and tables initialized successfully.');
      } catch (err: any) {
        if (err?.code === '28P01') {
          console.error('========================================================================');
          console.error('❌ [DATABASE AUTHENTICATION FAILED - Code 28P01]');
          console.error('PostgreSQL rejected the password in DATABASE_URL.');
          console.error('Common causes:');
          console.error('1. Special characters in password: If your password has @, #, $, %, &, :, etc., they must be URL-encoded (e.g. @ -> %40, # -> %23).');
          console.error('2. Wrong password: Reset your password in Supabase Dashboard -> Project Settings -> Database -> Reset Database Password.');
          console.error('3. Make sure no placeholder brackets [ ] remain around the password.');
          console.error('========================================================================');
        }
        throw err;
      }

      return {
        userRepository: new PostgresUserRepository(pool),
        studentRepository: new PostgresStudentRepository(pool),
        deletedStudentRepository: new PostgresDeletedStudentRepository(pool),
        teacherRepository: new PostgresTeacherRepository(pool),
        guardianRepository: new PostgresGuardianRepository(pool),
        academicRepository: new PostgresAcademicRepository(pool),
        cbcAssessmentRepository: new PostgresCbcAssessmentRepository(pool),
        schemeOfWorkRepository: new PostgresSchemeOfWorkRepository(pool),
        lessonPlanRepository: new PostgresLessonPlanRepository(pool),
        timetableRepository: new PostgresTimetableRepository(pool),
        attendanceRepository: new PostgresAttendanceRepository(pool),
        feeRepository: new PostgresFeeRepository(pool),
        recordOfWorkRepository: new PostgresRecordOfWorkRepository(pool),
        complaintRepository: new PostgresComplaintRepository(pool),
        systemLogRepository: new PostgresSystemLogRepository(pool),
        lunchFeeRepository: new PostgresLunchFeeRepository(pool),
        libraryRepository: new PostgresLibraryRepository(pool),
        announcementRepository: new InMemoryAnnouncementRepository(),
      };
    }

    // 3. IN-MEMORY (Default)
    console.log('[Database] Initializing In-Memory Database Adapters.');
    return {
      userRepository: new InMemoryUserRepository(),
      studentRepository: new InMemoryStudentRepository(),
      deletedStudentRepository: new InMemoryDeletedStudentRepository(),
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
      ediaryRepository: new InMemoryEDiaryRepository(),
      recordOfWorkRepository: new InMemoryRecordOfWorkRepository(),
      complaintRepository: new InMemoryComplaintRepository(),
      systemLogRepository: new InMemorySystemLogRepository(),
      lunchFeeRepository: new InMemoryLunchFeeRepository(),
      libraryRepository: new InMemoryLibraryRepository(),
      announcementRepository: new InMemoryAnnouncementRepository(),
    };
  }
}
