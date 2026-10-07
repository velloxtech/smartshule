import { calculateDistanceMeters, isWithinGeofence } from '../../src/core/domain/attendance/GeofenceUtils';
import { GeofenceUseCases } from '../../src/application/attendance/GeofenceUseCases';
import { InMemoryAcademicRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryTeacherRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryUserRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryTeacherClockInRepository } from '../../src/infrastructure/database/in-memory/InMemoryTeacherClockInRepository';
import { School } from '../../src/core/domain/academic/School';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';

describe('School Compound Geofencing & Teacher Clock-In Unit Tests', () => {
  // Grace Seeds School center coordinates (Kisian, Kisumu)
  const SCHOOL_LAT = -0.061234;
  const SCHOOL_LON = 34.721234;
  const SCHOOL_RADIUS = 250; // 250 meters

  describe('Geofence Distance Calculation (Haversine Formula)', () => {
    it('should return 0 meters for identical points', () => {
      const dist = calculateDistanceMeters(SCHOOL_LAT, SCHOOL_LON, SCHOOL_LAT, SCHOOL_LON);
      expect(dist).toBe(0);
    });

    it('should correctly verify a point inside the school compound perimeter (50m away)', () => {
      // Small offset in latitude (approx 50m north: 0.00045 deg lat ~ 50m)
      const teacherLat = SCHOOL_LAT + 0.00045;
      const teacherLon = SCHOOL_LON;
      const result = isWithinGeofence(teacherLat, teacherLon, SCHOOL_LAT, SCHOOL_LON, SCHOOL_RADIUS);
      expect(result.isInside).toBe(true);
      expect(result.distanceMeters).toBeLessThanOrEqual(SCHOOL_RADIUS);
    });

    it('should correctly flag a point outside the school compound perimeter (1.5km away)', () => {
      // Offset of 0.015 degrees lat ~ 1.6km
      const teacherLat = SCHOOL_LAT + 0.015;
      const teacherLon = SCHOOL_LON;
      const result = isWithinGeofence(teacherLat, teacherLon, SCHOOL_LAT, SCHOOL_LON, SCHOOL_RADIUS);
      expect(result.isInside).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(SCHOOL_RADIUS);
    });
  });

  describe('GeofenceUseCases RBAC & Coordinates Management', () => {
    let academicRepo: InMemoryAcademicRepository;
    let teacherRepo: InMemoryTeacherRepository;
    let userRepo: InMemoryUserRepository;
    let clockInRepo: InMemoryTeacherClockInRepository;
    let geofenceUseCases: GeofenceUseCases;

    beforeEach(async () => {
      academicRepo = new InMemoryAcademicRepository();
      teacherRepo = new InMemoryTeacherRepository();
      userRepo = new InMemoryUserRepository();
      clockInRepo = new InMemoryTeacherClockInRepository();

      const school = School.create(
        {
          name: 'Grace Seeds School',
          code: 'GSS-001',
          email: 'schoolgraceseeds@gmail.com',
          phone: '0745436312',
          address: 'KEMRI Street, Kisian, Kisumu, Kenya',
          currency: 'KES',
          latitude: SCHOOL_LAT,
          longitude: SCHOOL_LON,
          geofenceRadius: SCHOOL_RADIUS,
          geofenceEnabled: true
        },
        'school-001'
      );
      await academicRepo.saveSchool(school);

      geofenceUseCases = new GeofenceUseCases(academicRepo, teacherRepo, userRepo, clockInRepo);
    });

    it('should allow Super Admin to configure geofence coordinates', async () => {
      const updated = await geofenceUseCases.updateGeofenceConfig(
        {
          latitude: -0.062,
          longitude: 34.722,
          geofenceRadius: 300,
          geofenceEnabled: true
        },
        UserRole.SUPER_ADMIN
      );

      expect(updated.latitude).toBe(-0.062);
      expect(updated.longitude).toBe(34.722);
      expect(updated.geofenceRadius).toBe(300);
    });

    it('should allow School Director (ADMIN) to configure geofence coordinates', async () => {
      const updated = await geofenceUseCases.updateGeofenceConfig(
        {
          latitude: -0.065,
          longitude: 34.725,
          geofenceRadius: 400,
          geofenceEnabled: true
        },
        UserRole.ADMIN
      );

      expect(updated.latitude).toBe(-0.065);
      expect(updated.longitude).toBe(34.725);
      expect(updated.geofenceRadius).toBe(400);
    });

    it('should reject general Teacher from configuring geofence coordinates with ForbiddenError', async () => {
      await expect(
        geofenceUseCases.updateGeofenceConfig(
          {
            latitude: -0.065,
            longitude: 34.725,
            geofenceRadius: 500
          },
          UserRole.TEACHER
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject Head Teacher from configuring geofence coordinates with ForbiddenError', async () => {
      await expect(
        geofenceUseCases.updateGeofenceConfig(
          {
            latitude: -0.065,
            longitude: 34.725
          },
          UserRole.HEAD_TEACHER
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject invalid coordinates with ValidationError', async () => {
      await expect(
        geofenceUseCases.updateGeofenceConfig(
          {
            latitude: 105, // invalid latitude > 90
            longitude: 34.725
          },
          UserRole.SUPER_ADMIN
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Teacher Clock-In Geofence Enforcement', () => {
    let academicRepo: InMemoryAcademicRepository;
    let teacherRepo: InMemoryTeacherRepository;
    let userRepo: InMemoryUserRepository;
    let clockInRepo: InMemoryTeacherClockInRepository;
    let geofenceUseCases: GeofenceUseCases;
    let teacherUser: User;
    let teacherProfile: Teacher;

    beforeEach(async () => {
      academicRepo = new InMemoryAcademicRepository();
      teacherRepo = new InMemoryTeacherRepository();
      userRepo = new InMemoryUserRepository();
      clockInRepo = new InMemoryTeacherClockInRepository();

      const school = School.create(
        {
          name: 'Grace Seeds School',
          code: 'GSS-001',
          email: 'schoolgraceseeds@gmail.com',
          phone: '0745436312',
          address: 'KEMRI Street, Kisian, Kisumu, Kenya',
          currency: 'KES',
          latitude: SCHOOL_LAT,
          longitude: SCHOOL_LON,
          geofenceRadius: SCHOOL_RADIUS,
          geofenceEnabled: true
        },
        'school-001'
      );
      await academicRepo.saveSchool(school);

      teacherUser = User.create(
        {
          firstName: 'Sarah',
          lastName: 'Otieno',
          email: 'sarah.otieno@smartshule.ac.ke',
          phone: '0711223344',
          passwordHash: 'hashed',
          role: UserRole.TEACHER,
          status: UserStatus.ACTIVE,
          schoolId: 'school-001'
        },
        'user-teacher-01'
      );
      await userRepo.save(teacherUser);

      teacherProfile = Teacher.create(
        {
          userId: teacherUser.id,
          employeeNumber: 'EMP-001',
          tscNumber: 'TSC-45678',
          specialization: ['Mathematics', 'Science'],
          assignedClassStreamIds: ['stream-001']
        },
        'teacher-001'
      );
      await teacherRepo.save(teacherProfile);

      geofenceUseCases = new GeofenceUseCases(academicRepo, teacherRepo, userRepo, clockInRepo);
    });

    it('should succeed when teacher clocks in within the school compound (30m away)', async () => {
      // 30m away from school center
      const teacherLat = SCHOOL_LAT + 0.0002;
      const teacherLon = SCHOOL_LON;

      const record = await geofenceUseCases.clockInTeacher({
        userId: teacherUser.id,
        action: 'CLOCK_IN',
        latitude: teacherLat,
        longitude: teacherLon,
        accuracy: 5
      });

      expect(record.status).toBe('CLOCKED_IN');
      expect(record.inCompound).toBe(true);
      expect(record.clockInTime).toBeDefined();
      expect(record.distanceMeters).toBeLessThanOrEqual(SCHOOL_RADIUS);
      expect(record.teacherName).toBe('Sarah Otieno');
    });

    it('should strictly block clock-in when teacher is outside the school compound (1.2km away)', async () => {
      // 1.2km away
      const teacherLat = SCHOOL_LAT + 0.011;
      const teacherLon = SCHOOL_LON;

      await expect(
        geofenceUseCases.clockInTeacher({
          userId: teacherUser.id,
          action: 'CLOCK_IN',
          latitude: teacherLat,
          longitude: teacherLon,
          accuracy: 10
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject clock-in if GPS coordinates are missing when geofence is enabled', async () => {
      await expect(
        geofenceUseCases.clockInTeacher({
          userId: teacherUser.id,
          action: 'CLOCK_IN'
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should allow teacher to clock out successfully', async () => {
      // First clock in
      await geofenceUseCases.clockInTeacher({
        userId: teacherUser.id,
        action: 'CLOCK_IN',
        latitude: SCHOOL_LAT,
        longitude: SCHOOL_LON
      });

      // Clock out
      const clockOutRecord = await geofenceUseCases.clockInTeacher({
        userId: teacherUser.id,
        action: 'CLOCK_OUT',
        latitude: SCHOOL_LAT,
        longitude: SCHOOL_LON
      });

      expect(clockOutRecord.status).toBe('CLOCKED_OUT');
      expect(clockOutRecord.clockOutTime).toBeDefined();
    });

    it('should retrieve today clock-in status for the teacher', async () => {
      await geofenceUseCases.clockInTeacher({
        userId: teacherUser.id,
        action: 'CLOCK_IN',
        latitude: SCHOOL_LAT,
        longitude: SCHOOL_LON
      });

      const today = await geofenceUseCases.getTodayTeacherClockIn(teacherUser.id);
      expect(today).not.toBeNull();
      expect(today?.status).toBe('CLOCKED_IN');
    });
  });
});
