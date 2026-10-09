import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { ITeacherClockInRepository } from '../../core/ports/repositories/ITeacherClockInRepository';
import { TeacherClockIn } from '../../core/domain/attendance/TeacherClockIn';
import { isWithinGeofence } from '../../core/domain/attendance/GeofenceUtils';
import { UserRole } from '../../core/domain/user/User';
import { IdGenerator, NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';

export interface ClockInActionDTO {
  userId: string;
  userRole?: UserRole;
  action: 'CLOCK_IN' | 'CLOCK_OUT';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface UpdateGeofenceDTO {
  latitude: number;
  longitude: number;
  geofenceRadius?: number;
  geofenceEnabled?: boolean;
  address?: string;
}

export class GeofenceUseCases {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly userRepository: IUserRepository,
    private readonly teacherClockInRepository: ITeacherClockInRepository
  ) {}

  public async getGeofenceConfig(schoolId?: string) {
    const school = await this.academicRepository.getSchool(schoolId);
    return {
      latitude: school?.latitude ?? -0.061234,
      longitude: school?.longitude ?? 34.721234,
      geofenceRadius: school?.geofenceRadius ?? 250,
      geofenceEnabled: school?.geofenceEnabled ?? true,
      schoolName: school?.name || 'Grace Seeds School',
      address: school?.address || 'KEMRI Street, Kisian, Kisumu, Kenya',
      updatedAt: school?.updatedAt
    };
  }

  public async updateGeofenceConfig(
    dto: UpdateGeofenceDTO,
    userRole?: UserRole,
    schoolId?: string
  ) {
    // Only Super Admin and School Director can enter coordinates!
    const isAuthorized =
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SCHOOL_ADMIN;

    if (!isAuthorized) {
      throw new ForbiddenError(
        'School compound geofence coordinates can only be configured by the Super Administrator and School Director.'
      );
    }

    if (dto.latitude == null || isNaN(dto.latitude) || dto.latitude < -90 || dto.latitude > 90) {
      throw new ValidationError('Invalid latitude. Must be between -90 and 90.');
    }
    if (dto.longitude == null || isNaN(dto.longitude) || dto.longitude < -180 || dto.longitude > 180) {
      throw new ValidationError('Invalid longitude. Must be between -180 and 180.');
    }

    let school = await this.academicRepository.getSchool(schoolId);
    if (!school) {
      throw new NotFoundError('School record not found.');
    }

    school.updateDetails({
      latitude: dto.latitude,
      longitude: dto.longitude,
      geofenceRadius: dto.geofenceRadius ?? school.geofenceRadius ?? 250,
      geofenceEnabled: dto.geofenceEnabled !== undefined ? dto.geofenceEnabled : school.geofenceEnabled,
      address: dto.address || school.address
    });

    await this.academicRepository.updateSchool(school);
    return this.getGeofenceConfig(school.id);
  }

  public async clockInTeacher(dto: ClockInActionDTO) {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const teacher = await this.teacherRepository.findByUserId(dto.userId);
    const teacherId = teacher ? teacher.id : user.id;
    const teacherName = `${user.firstName} ${user.lastName}`;

    const school = await this.academicRepository.getSchool();
    const schoolLat = school?.latitude ?? -0.061234;
    const schoolLon = school?.longitude ?? 34.721234;
    const schoolRadius = school?.geofenceRadius ?? 250;
    const geofenceEnabled = school?.geofenceEnabled ?? true;

    let distanceMeters: number | null = null;
    let inCompound = true;

    // Enforce geofencing boundary if enabled
    if (geofenceEnabled) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new ValidationError(
          'Device GPS location is required to verify you are within the school compound. Please enable location permissions.'
        );
      }

      const check = isWithinGeofence(dto.latitude, dto.longitude, schoolLat, schoolLon, schoolRadius);
      distanceMeters = check.distanceMeters;
      inCompound = check.isInside;

      if (!check.isInside) {
        throw new ForbiddenError(
          `Access Denied: You are outside the school compound (${check.distanceMeters}m away from center, allowed perimeter is ${check.radiusMeters}m). Teacher clock-in cannot be accessed outside the compound.`
        );
      }
    } else if (dto.latitude != null && dto.longitude != null) {
      const check = isWithinGeofence(dto.latitude, dto.longitude, schoolLat, schoolLon, schoolRadius);
      distanceMeters = check.distanceMeters;
      inCompound = check.isInside;
    }

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    let existingRecord = await this.teacherClockInRepository.findTodayRecord(teacherId, todayDate);

    if (dto.action === 'CLOCK_OUT') {
      if (existingRecord) {
        existingRecord.clockOut(timeStr);
        await this.teacherClockInRepository.update(existingRecord);
        return existingRecord.toJSON();
      } else {
        const record = TeacherClockIn.create(
          {
            schoolId: school?.id || 'school-001',
            teacherId,
            teacherName,
            date: todayDate,
            clockInTime: undefined,
            clockOutTime: timeStr,
            status: 'CLOCKED_OUT',
            latitude: dto.latitude,
            longitude: dto.longitude,
            distanceMeters,
            inCompound,
            accuracyMeters: dto.accuracy,
            verifiedBy: 'GPS_GEOFENCE'
          },
          IdGenerator.generate()
        );
        await this.teacherClockInRepository.save(record);
        return record.toJSON();
      }
    }

    // CLOCK_IN action
    if (existingRecord) {
      const record = TeacherClockIn.create(
        {
          schoolId: school?.id || 'school-001',
          teacherId,
          teacherName,
          date: todayDate,
          clockInTime: timeStr,
          clockOutTime: undefined,
          status: 'CLOCKED_IN',
          latitude: dto.latitude,
          longitude: dto.longitude,
          distanceMeters,
          inCompound: true,
          accuracyMeters: dto.accuracy,
          verifiedBy: 'GPS_GEOFENCE'
        },
        existingRecord.id,
        existingRecord.createdAt,
        new Date()
      );
      await this.teacherClockInRepository.update(record);
      return record.toJSON();
    }

    const newRecord = TeacherClockIn.create(
      {
        schoolId: school?.id || 'school-001',
        teacherId,
        teacherName,
        date: todayDate,
        clockInTime: timeStr,
        status: 'CLOCKED_IN',
        latitude: dto.latitude,
        longitude: dto.longitude,
        distanceMeters,
        inCompound: true,
        accuracyMeters: dto.accuracy,
        verifiedBy: 'GPS_GEOFENCE'
      },
      IdGenerator.generate()
    );

    await this.teacherClockInRepository.save(newRecord);
    return newRecord.toJSON();
  }

  public async getTodayTeacherClockIn(userId: string) {
    const teacher = await this.teacherRepository.findByUserId(userId);
    const teacherId = teacher ? teacher.id : userId;
    const todayDate = new Date().toISOString().split('T')[0];
    const record = await this.teacherClockInRepository.findTodayRecord(teacherId, todayDate);
    return record ? record.toJSON() : null;
  }

  public async listClockInRecords(filters?: { date?: string; teacherId?: string; schoolId?: string }) {
    const todayDate = filters?.date || new Date().toISOString().split('T')[0];
    const records = await this.teacherClockInRepository.findRecords({
      date: todayDate,
      teacherId: filters?.teacherId,
      schoolId: filters?.schoolId
    });
    return records.map(r => r.toJSON());
  }

  public async getFacultyDailyRoster(date?: string, schoolId?: string) {
    const todayDate = date || new Date().toISOString().split('T')[0];
    const teachers = await this.teacherRepository.findAll();
    const clockInRecords = await this.teacherClockInRepository.findRecords({
      date: todayDate,
      schoolId
    });

    const recordsByTeacherId = new Map<string, any>();
    for (const r of clockInRecords) {
      recordsByTeacherId.set(r.teacherId, r.toJSON());
    }

    const roster = await Promise.all(
      teachers.map(async t => {
        const u = await this.userRepository.findById(t.userId);
        const record = recordsByTeacherId.get(t.id) || recordsByTeacherId.get(t.userId) || null;

        let status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NOT_CLOCKED_IN' = 'NOT_CLOCKED_IN';
        if (record) {
          status = record.status === 'CLOCKED_IN' ? 'CLOCKED_IN' : 'CLOCKED_OUT';
        }

        return {
          teacherId: t.id,
          userId: t.userId,
          name: u ? u.fullName : 'Faculty Educator',
          email: u?.email || '',
          phoneNumber: u?.phone || '',
          tscNumber: t.tscNumber || '',
          employeeNumber: t.employeeNumber || '',
          specialization: t.specialization || [],
          assignedClassStreamIds: t.assignedClassStreamIds || [],
          qualification: t.qualification || '',
          date: todayDate,
          status,
          clockInTime: record?.clockInTime || null,
          clockOutTime: record?.clockOutTime || null,
          distanceMeters: record?.distanceMeters ?? null,
          inCompound: record?.inCompound ?? false,
          accuracyMeters: record?.accuracyMeters ?? null,
          latitude: record?.latitude ?? null,
          longitude: record?.longitude ?? null,
          verifiedBy: record?.verifiedBy || (record ? 'GPS_GEOFENCE' : null)
        };
      })
    );

    const totalTeachers = roster.length;
    const clockedIn = roster.filter(r => r.status === 'CLOCKED_IN').length;
    const clockedOut = roster.filter(r => r.status === 'CLOCKED_OUT').length;
    const notClockedIn = roster.filter(r => r.status === 'NOT_CLOCKED_IN').length;
    const attendancePercentage =
      totalTeachers > 0 ? Math.round(((clockedIn + clockedOut) / totalTeachers) * 100) : 0;

    return {
      date: todayDate,
      summary: {
        totalTeachers,
        clockedIn,
        clockedOut,
        notClockedIn,
        attendancePercentage
      },
      roster
    };
  }
}
