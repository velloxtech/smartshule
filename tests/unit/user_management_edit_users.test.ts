import { AuthUseCases } from '../../src/application/auth/AuthUseCases';
import {
  InMemoryUserRepository,
  InMemoryTeacherRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemorySystemLogRepository } from '../../src/infrastructure/database/in-memory/InMemorySystemLogRepository';
import { BcryptPasswordHasher } from '../../src/infrastructure/services/BcryptPasswordHasher';
import { JwtAuthTokenService } from '../../src/infrastructure/services/JwtAuthTokenService';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Teacher } from '../../src/core/domain/user/Teacher';

describe('User Management: Edit Existing Users & Data Integrity Tests', () => {
  let userRepo: InMemoryUserRepository;
  let teacherRepo: InMemoryTeacherRepository;
  let systemLogRepo: InMemorySystemLogRepository;
  let passwordHasher: BcryptPasswordHasher;
  let tokenService: JwtAuthTokenService;
  let authUseCases: AuthUseCases;

  let superAdminUser: User;
  let schoolAdminUser: User;
  let schoolTwoAdminUser: User;
  let teacherUser: User;
  let teacherRecord: Teacher;
  let parentUser: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    teacherRepo = new InMemoryTeacherRepository();
    systemLogRepo = new InMemorySystemLogRepository();
    passwordHasher = new BcryptPasswordHasher();
    tokenService = new JwtAuthTokenService();

    authUseCases = new AuthUseCases(
      userRepo,
      passwordHasher,
      tokenService,
      undefined, // notificationService
      undefined, // guardianRepository
      undefined, // studentRepository
      systemLogRepo,
      teacherRepo
    );

    const hashedPwd = await passwordHasher.hash('SecurePassword123');

    // 1. Super Admin (school-001)
    superAdminUser = User.create(
      {
        email: 'superadmin@school.ac.ke',
        passwordHash: hashedPwd,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        phone: '+254700000001',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-super-admin-01'
    );
    await userRepo.save(superAdminUser);

    // 2. School Admin (school-001)
    schoolAdminUser = User.create(
      {
        email: 'admin@school.ac.ke',
        passwordHash: hashedPwd,
        firstName: 'School',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        phone: '+254700000002',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-school-admin-01'
    );
    await userRepo.save(schoolAdminUser);

    // 3. School Admin from School 002
    schoolTwoAdminUser = User.create(
      {
        email: 'admin2@other.ac.ke',
        passwordHash: hashedPwd,
        firstName: 'Other',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        phone: '+254700000003',
        status: UserStatus.ACTIVE,
        schoolId: 'school-002'
      },
      'usr-school-admin-02'
    );
    await userRepo.save(schoolTwoAdminUser);

    // 4. Teacher User (school-001) with linked Teacher profile
    teacherUser = User.create(
      {
        email: 'teacher@school.ac.ke',
        passwordHash: hashedPwd,
        firstName: 'Grace',
        lastName: 'Wanjiku',
        role: UserRole.TEACHER,
        phone: '+254711223344',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-teacher-01'
    );
    await userRepo.save(teacherUser);

    teacherRecord = Teacher.create(
      {
        userId: teacherUser.id,
        employeeNumber: 'EMP-2023-01',
        tscNumber: 'TSC-987654',
        specialization: ['CBC Grade 1', 'Grade 2 Mathematics'],
        qualification: 'B.Ed Primary Education',
        department: 'Mathematics',
        employmentStatus: 'ACTIVE',
        employmentType: 'FULL_TIME',
        assignedClassStreamIds: []
      },
      'tch-001'
    );
    await teacherRepo.save(teacherRecord);

    // 5. Parent User (school-001)
    parentUser = User.create(
      {
        email: 'parent@school.ac.ke',
        passwordHash: hashedPwd,
        firstName: 'Jane',
        lastName: 'Otieno',
        role: UserRole.PARENT,
        phone: '+254722334455',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-parent-01'
    );
    await userRepo.save(parentUser);
  });

  // TEST 1: Admin edits ordinary user within school
  it('1. Admin edits ordinary user within the same school successfully', async () => {
    const updated = await authUseCases.adminUpdateUser(
      parentUser.id,
      {
        firstName: 'Janet',
        lastName: 'Otieno-Kimani',
        phone: '+254722998877'
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    expect(updated.firstName).toBe('Janet');
    expect(updated.lastName).toBe('Otieno-Kimani');
    expect(updated.phone).toBe('+254722998877');
    expect(updated.fullName).toBe('Janet Otieno-Kimani');

    // Verify persisted in repository
    const fromDb = await userRepo.findById(parentUser.id);
    expect(fromDb?.firstName).toBe('Janet');
    expect(fromDb?.lastName).toBe('Otieno-Kimani');
    expect(fromDb?.phone).toBe('+254722998877');
  });

  // TEST 2: Super Admin edits permitted user across schools and updates schoolId
  it('2. Super Admin can edit users across schools and update school association', async () => {
    const updated = await authUseCases.adminUpdateUser(
      parentUser.id,
      {
        firstName: 'Janet',
        schoolId: 'school-002',
        role: UserRole.BURSAR
      },
      {
        userId: superAdminUser.id,
        role: UserRole.SUPER_ADMIN,
        schoolId: 'school-001'
      }
    );

    expect(updated.schoolId).toBe('school-002');
    expect(updated.role).toBe(UserRole.BURSAR);

    const fromDb = await userRepo.findById(parentUser.id);
    expect(fromDb?.schoolId).toBe('school-002');
    expect(fromDb?.role).toBe(UserRole.BURSAR);
  });

  // TEST 3: Teacher's name corrected & reflected in linked profile
  it('3. Updates teacher name and linked profile atomically without duplicate accounts', async () => {
    const originalTeacherList = await teacherRepo.findAll();
    expect(originalTeacherList.length).toBe(1);

    const updated = await authUseCases.adminUpdateUser(
      teacherUser.id,
      {
        firstName: 'Grace',
        lastName: 'Wanjiku-Mwangi',
        phone: '+254711999888',
        teacherProfile: {
          employeeNumber: 'EMP-2023-01-REV',
          tscNumber: 'TSC-999888',
          department: 'Sciences',
          qualification: 'M.Ed Curriculum Development',
          specialization: ['Integrated Science', 'Agriculture']
        }
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    expect(updated.fullName).toBe('Grace Wanjiku-Mwangi');

    // Verify linked teacher record is updated
    const teacherProfile = await teacherRepo.findByUserId(teacherUser.id);
    expect(teacherProfile).toBeDefined();
    expect(teacherProfile?.id).toBe('tch-001'); // ID is unchanged
    expect(teacherProfile?.userId).toBe(teacherUser.id); // Foreign key unchanged
    expect(teacherProfile?.tscNumber).toBe('TSC-999888');
    expect(teacherProfile?.department).toBe('Sciences');
    expect(teacherProfile?.qualification).toBe('M.Ed Curriculum Development');
    expect(teacherProfile?.employeeNumber).toBe('EMP-2023-01-REV');

    // Ensure no duplicate records were created
    const allTeachers = await teacherRepo.findAll();
    expect(allTeachers.length).toBe(1);
    const allUsers = await userRepo.findAll();
    expect(allUsers.filter((u) => u.id === teacherUser.id).length).toBe(1);
  });

  // TEST 4: Email address changed without creating duplicate account
  it('4. Updates email address on the existing account without creating duplicate accounts', async () => {
    const usersBefore = (await userRepo.findAll()).length;

    const updated = await authUseCases.adminUpdateUser(
      parentUser.id,
      {
        email: 'janet.newemail@school.ac.ke'
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    expect(updated.email).toBe('janet.newemail@school.ac.ke');

    const usersAfter = (await userRepo.findAll()).length;
    expect(usersAfter).toBe(usersBefore);

    // Old email should no longer return this user
    const oldQuery = await userRepo.findByEmail('parent@school.ac.ke');
    expect(oldQuery).toBeNull();

    // New email returns the original user ID
    const newQuery = await userRepo.findByEmail('janet.newemail@school.ac.ke');
    expect(newQuery?.id).toBe(parentUser.id);
  });

  // TEST 5: Duplicate email or phone rejected
  it('5. Rejects duplicate email or phone number in use by another active user', async () => {
    // Attempting to set parent's email to teacher's email
    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        { email: 'teacher@school.ac.ke' },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/already in use/i);

    // Attempting to set parent's phone to teacher's phone
    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        { phone: '+254711223344' },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/already in use/i);

    // Original parent email and phone remain untouched
    const unchanged = await userRepo.findById(parentUser.id);
    expect(unchanged?.email).toBe('parent@school.ac.ke');
    expect(unchanged?.phone).toBe('+254722334455');
  });

  // TEST 6: Unauthorized users cannot edit accounts via direct API
  it('6. Rejects update requests from non-administrative roles (e.g., teachers or parents)', async () => {
    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        { firstName: 'Hacked' },
        {
          userId: teacherUser.id,
          role: UserRole.TEACHER,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/unauthorized|permission/i);

    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        { firstName: 'Hacked' },
        {
          userId: parentUser.id,
          role: UserRole.PARENT,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/unauthorized|permission/i);
  });

  // TEST 7: Admin cannot edit users outside permitted school scope
  it('7. School Admin cannot edit users belonging to a different school', async () => {
    // School Admin 01 (school-001) attempts to edit School Admin 02 (school-002)
    await expect(
      authUseCases.adminUpdateUser(
        schoolTwoAdminUser.id,
        { firstName: 'Intruder' },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/different school/i);

    // School Admin 02 (school-002) attempts to edit Teacher (school-001)
    await expect(
      authUseCases.adminUpdateUser(
        teacherUser.id,
        { firstName: 'Intruder' },
        {
          userId: schoolTwoAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-002'
        }
      )
    ).rejects.toThrow(/different school/i);
  });

  // TEST 8: Unauthorized role escalation rejected
  it('8. Rejects privilege escalation: School Admin cannot promote users to Super Admin', async () => {
    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        { role: UserRole.SUPER_ADMIN },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/super admin/i);
  });

  // TEST 9: Protected account rules enforced (self-lockout & last Super Admin protection)
  it('9. Enforces self-lockout rules and protects the last remaining active Super Admin', async () => {
    // A) Administrator cannot modify their own role
    await expect(
      authUseCases.adminUpdateUser(
        schoolAdminUser.id,
        { role: UserRole.TEACHER },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/cannot modify their own system role/i);

    // B) Administrator cannot deactivate or suspend their own account
    await expect(
      authUseCases.adminUpdateUser(
        schoolAdminUser.id,
        { status: UserStatus.SUSPENDED },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/deactivate or suspend your own active administrator account/i);

    // C) Cannot demote or deactivate the last active Super Admin
    await expect(
      authUseCases.adminUpdateUser(
        superAdminUser.id,
        { status: UserStatus.INACTIVE },
        {
          userId: superAdminUser.id,
          role: UserRole.SUPER_ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/deactivate or suspend your own active administrator account/i);

    // Create an auxiliary super admin so actor != target
    const secondSuperAdmin = User.create(
      {
        email: 'second.super@school.ac.ke',
        passwordHash: await passwordHasher.hash('Secure123'),
        firstName: 'Second',
        lastName: 'Super',
        role: UserRole.SUPER_ADMIN,
        phone: '+254700000099',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-super-admin-02'
    );
    await userRepo.save(secondSuperAdmin);

    // Now superAdminUser can be edited by secondSuperAdmin, demoting superAdminUser
    const demoted = await authUseCases.adminUpdateUser(
      superAdminUser.id,
      { role: UserRole.ADMIN },
      {
        userId: secondSuperAdmin.id,
        role: UserRole.SUPER_ADMIN,
        schoolId: 'school-001'
      }
    );
    expect(demoted.role).toBe(UserRole.ADMIN);

    // Now secondSuperAdmin is the ONLY active Super Admin. Trying to demote themselves should fail
    await expect(
      authUseCases.adminUpdateUser(
        secondSuperAdmin.id,
        { role: UserRole.ADMIN },
        {
          userId: secondSuperAdmin.id,
          role: UserRole.SUPER_ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/cannot modify their own system role/i);

    // Trying to demote the sole remaining Super Admin from an external/system Super Admin actor fails
    await expect(
      authUseCases.adminUpdateUser(
        secondSuperAdmin.id,
        { role: UserRole.ADMIN },
        {
          userId: 'system-maintenance',
          role: UserRole.SUPER_ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow(/last remaining active Super Administrator/i);
  });

  // TEST 10: Changes persist after page refresh and new login
  it('10. Updated credentials allow subsequent login with newly updated details', async () => {
    // Update teacher email and phone
    await authUseCases.adminUpdateUser(
      teacherUser.id,
      {
        email: 'teacher.updated@school.ac.ke',
        phone: '+254711009988'
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    // Login with the new email
    const loginRes = await authUseCases.login({
      identifier: 'teacher.updated@school.ac.ke',
      password: 'SecurePassword123'
    });

    expect(loginRes.user.email).toBe('teacher.updated@school.ac.ke');
    expect(loginRes.user.phone).toBe('+254711009988');
    expect(loginRes.accessToken).toBeDefined();

    // Query user via getUserById to simulate page refresh / profile fetch
    const fetched = await authUseCases.getUserById(
      teacherUser.id,
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );
    expect(fetched.email).toBe('teacher.updated@school.ac.ke');
    expect(fetched.teacherProfile?.tscNumber).toBe('TSC-987654');
  });

  // TEST 11: Linked records and original IDs remain intact
  it('11. Preserves original primary keys and linked associations across all related records', async () => {
    const originalTeacherId = teacherRecord.id;
    const originalUserId = teacherUser.id;

    await authUseCases.adminUpdateUser(
      teacherUser.id,
      {
        firstName: 'UpdatedGrace',
        lastName: 'UpdatedWanjiku',
        teacherProfile: {
          department: 'Humanities'
        }
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    const teacherDb = await teacherRepo.findByUserId(originalUserId);
    expect(teacherDb).toBeDefined();
    expect(teacherDb?.id).toBe(originalTeacherId);
    expect(teacherDb?.userId).toBe(originalUserId);
    expect(teacherDb?.department).toBe('Humanities');
  });

  // TEST 12: Audit events recorded in SystemLog
  it('12. Records comprehensive audit log entries without logging credentials or passwords', async () => {
    await authUseCases.adminUpdateUser(
      parentUser.id,
      {
        firstName: 'Jane-Audited',
        lastName: 'Otieno-Audited',
        phone: '+254722111222'
      },
      {
        userId: schoolAdminUser.id,
        role: UserRole.ADMIN,
        schoolId: 'school-001'
      }
    );

    const logs = await systemLogRepo.find({
      actorUserId: schoolAdminUser.id,
      category: 'STAFF'
    });

    expect(logs.length).toBeGreaterThan(0);
    const updateLog = logs.find((l) => l.action === 'USER_PROFILE_UPDATED_BY_ADMIN');
    expect(updateLog).toBeDefined();
    expect(updateLog?.metadata?.userId).toBe(parentUser.id);
    expect(updateLog?.schoolId).toBe('school-001');
    expect(updateLog?.details).toContain('firstName');
    expect(updateLog?.details).toContain('lastName');
    expect(updateLog?.details).toContain('phone');

    // Ensure NO passwords or password hashes appear anywhere in the audit log
    const logStr = JSON.stringify(updateLog);
    expect(logStr).not.toContain('passwordHash');
    expect(logStr).not.toContain('SecurePassword123');
    expect(logStr).not.toContain('$2b$');
  });

  // TEST 13: Failed updates do not leave partial records
  it('13. Failed updates abort cleanly without leaving partial mutations', async () => {
    const parentBefore = await userRepo.findById(parentUser.id);
    const originalFirstName = parentBefore?.firstName;
    const originalPhone = parentBefore?.phone;

    // Fails due to duplicate phone
    await expect(
      authUseCases.adminUpdateUser(
        parentUser.id,
        {
          firstName: 'PartiallyChanged',
          phone: teacherUser.phone // conflict with teacherUser
        },
        {
          userId: schoolAdminUser.id,
          role: UserRole.ADMIN,
          schoolId: 'school-001'
        }
      )
    ).rejects.toThrow();

    const parentAfter = await userRepo.findById(parentUser.id);
    expect(parentAfter?.firstName).toBe(originalFirstName);
    expect(parentAfter?.phone).toBe(originalPhone);
  });

  // TEST 14: Existing onboarding & login flows continue to work
  it('14. Preserves backward compatibility: existing setup status and user listing work seamlessly', async () => {
    const status = await authUseCases.getSetupStatus();
    expect(status.hasAdmin).toBe(true);
    expect(status.totalUsers).toBeGreaterThanOrEqual(4);

    // List users for school-001
    const users = await authUseCases.listUsers({ schoolId: 'school-001' });
    expect(users.length).toBeGreaterThanOrEqual(4);

    // Verify teacher profile enrichment in list
    const teacherInList = users.find((u) => u.id === teacherUser.id);
    expect(teacherInList?.teacherProfile).toBeDefined();
    expect(teacherInList?.teacherProfile?.employeeNumber).toBe('EMP-2023-01');
  });
});
