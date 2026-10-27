import crypto from 'crypto';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { ISystemLogRepository } from '../../core/ports/repositories/ISystemLogRepository';
import { SystemLog } from '../../core/domain/system-log/SystemLog';
import { StudentStatus } from '../../core/domain/user/Student';
import { IAuthTokenService, IPasswordHasher, INotificationService } from '../../core/ports/services/IExternalServices';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';
import { PhoneUtils } from '../../infrastructure/utils/PhoneUtils';
import { EmailTemplateEngine } from '../../infrastructure/services/email/EmailTemplateEngine';
import { env } from '../../infrastructure/config/env';

export interface RegisterUserDTO {
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
  mustChangePassword?: boolean;
}

export interface LoginDTO {
  email?: string; // Accepts email, phone number, or role alias
  phone?: string;
  identifier?: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    schoolId?: string;
    schoolName?: string;
    mustChangePassword?: boolean;
    hasEnrolledChildren?: boolean;
    enrolledChildIds?: string[];
    guardianId?: string;
  };
}

export class AuthUseCases {
  private readonly resetCodeAttempts: Map<string, number> = new Map();

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: IAuthTokenService,
    private readonly notificationService?: INotificationService,
    private readonly guardianRepository?: IGuardianRepository,
    private readonly studentRepository?: IStudentRepository,
    private readonly systemLogRepository?: ISystemLogRepository
  ) {}

  public async register(dto: RegisterUserDTO): Promise<AuthResponseDTO> {
    const privilegedRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.BURSAR,
      UserRole.ACCOUNTANT,
      UserRole.ADMISSIONS
    ];
    if (dto.role && privilegedRoles.includes(dto.role)) {
      const existingSuperAdmins = await this.userRepository.findAll({ role: UserRole.SUPER_ADMIN });
      const existingAdmins = await this.userRepository.findAll({ role: UserRole.ADMIN });
      const hasExistingAdmin = existingSuperAdmins.length > 0 || existingAdmins.length > 0;
      if (hasExistingAdmin) {
        throw new ForbiddenError('Self-registration is not allowed for privileged administrative roles.');
      }
    }

    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new ValidationError('Either an email address or a phone number is required.');
    }

    let cleanEmail: string | undefined = undefined;
    if (dto.email && dto.email.trim() !== '') {
      cleanEmail = dto.email.toLowerCase().trim();
      const existing = await this.userRepository.findByEmail(cleanEmail);
      if (existing) {
        throw new ConflictError(`User with email '${dto.email}' already exists.`);
      }
    }

    const cleanPhone = dto.phone?.trim();
    if (cleanPhone) {
      const existingPhone = await this.userRepository.findByPhone(cleanPhone);
      if (existingPhone) {
        throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
      }
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const userId = IdGenerator.generate();

    const user = User.create(
      {
        email: cleanEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: cleanPhone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId
      },
      userId
    );

    await this.userRepository.save(user);

    const tokenPayload = {
      userId: user.id,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        schoolId: user.schoolId || 'school-001',
        schoolName: 'Grace Seeds School'
      }
    };
  }

  public async login(dto: LoginDTO): Promise<AuthResponseDTO> {
    const rawIdentifier = (dto.email || dto.identifier || dto.phone || '').trim();
    if (!rawIdentifier) {
      throw new UnauthorizedError('Email, phone number, or username is required.');
    }

    let lookupEmail = rawIdentifier.toLowerCase();
    const aliasMap: Record<string, string> = {
      superadmin: 'superadmin@smartshule.ac.ke',
      super_admin: 'superadmin@smartshule.ac.ke',
      admin: 'admin@smartshule.ac.ke',
      school_admin: 'admin@smartshule.ac.ke',
      headteacher: 'headteacher@smartshule.ac.ke',
      head_teacher: 'headteacher@smartshule.ac.ke',
      deputy: 'deputy@smartshule.ac.ke',
      deputyheadteacher: 'deputy@smartshule.ac.ke',
      deputy_headteacher: 'deputy@smartshule.ac.ke',
      admissions: 'admissions@smartshule.ac.ke',
      bursar: 'bursar@smartshule.ac.ke',
      finance: 'bursar@smartshule.ac.ke',
      accountant: 'bursar@smartshule.ac.ke',
      teacher: 'teacher@smartshule.ac.ke',
      sarah: 'teacher@smartshule.ac.ke',
      parent: 'parent@smartshule.ac.ke',
      parents: 'parent@smartshule.ac.ke',
      guardian: 'parent@smartshule.ac.ke',
      mary: 'parent@smartshule.ac.ke'
    };
    if (aliasMap[lookupEmail]) {
      lookupEmail = aliasMap[lookupEmail];
    }

    let user: User | null = null;

    // Check if input looks like a phone number
    const cleanPhoneDigits = rawIdentifier.replace(/[\s-]/g, '');
    const isPhonePattern = /^(\+?254|0)?[17]\d{8}$/.test(cleanPhoneDigits) ||
                           /^\+?\d{8,15}$/.test(cleanPhoneDigits);

    if (isPhonePattern) {
      user = await this.userRepository.findByPhone(cleanPhoneDigits);
      if (!user && cleanPhoneDigits !== rawIdentifier) {
        user = await this.userRepository.findByPhone(rawIdentifier);
      }
    }

    if (!user) {
      user = await this.userRepository.findByEmail(lookupEmail);
    }

    if (!user) {
      user = await this.userRepository.findByPhone(rawIdentifier);
      if (!user && cleanPhoneDigits !== rawIdentifier) {
        user = await this.userRepository.findByPhone(cleanPhoneDigits);
      }
    }

    if (!user && (lookupEmail === 'teacher' || lookupEmail === 'teacher@smartshule.ac.ke')) {
      user = await this.userRepository.findByEmail('sarah.mwangi@smartshule.ac.ke');
    }
    if (!user && (lookupEmail === 'parent' || lookupEmail === 'parent@smartshule.ac.ke')) {
      user = await this.userRepository.findByEmail('mary.kariuki@gmail.com');
    }

    // Fallback: check guardian emergencyContact if guardianRepository is present
    if (!user && this.guardianRepository) {
      let g = await this.guardianRepository.findByPhone(rawIdentifier);
      if (!g && cleanPhoneDigits !== rawIdentifier) {
        g = await this.guardianRepository.findByPhone(cleanPhoneDigits);
      }
      if (g) {
        user = await this.userRepository.findById(g.userId);
      }
    }

    if (!user) {
      throw new UnauthorizedError('Invalid email, phone number, or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is inactive or suspended.');
    }

    let isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    const isParentRole = user.role === UserRole.PARENT || user.role === UserRole.GUARDIAN;
    let isDefaultPhonePassword = false;
    let isDefaultIdPassword = false;

    // Check if password matches user's phone number
    if (!isMatch && user.phone && PhoneUtils.areMatches(user.phone, dto.password)) {
      isMatch = true;
      isDefaultPhonePassword = true;
    }

    // For parent accounts, check emergency contact or fallback national ID
    if (!isMatch && isParentRole && this.guardianRepository) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g) {
        if (g.emergencyContact && PhoneUtils.areMatches(g.emergencyContact, dto.password)) {
          isMatch = true;
          isDefaultPhonePassword = true;
        } else if (g.nationalId && g.nationalId.trim() === dto.password.trim()) {
          isMatch = true;
          isDefaultIdPassword = true;
        }
      }
    }

    if (!isMatch) {
      throw new UnauthorizedError('Invalid email, phone number, or password.');
    }

    // Check if user authenticated with their default phone or national ID
    if (!isDefaultPhonePassword && user.phone && PhoneUtils.areMatches(user.phone, dto.password)) {
      isDefaultPhonePassword = true;
    }
    if (!isDefaultIdPassword && this.guardianRepository && isParentRole) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g && g.nationalId && g.nationalId.trim() === dto.password.trim()) {
        isDefaultIdPassword = true;
      }
    }

    let mustChangePassword = user.mustChangePassword;
    if (isDefaultPhonePassword || (isParentRole && isDefaultIdPassword)) {
      mustChangePassword = true;
      user.setMustChangePassword(true);
      await this.userRepository.update(user);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    const guardianLink = await this.resolveGuardianLink(user.id, user.phone, user.email);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        schoolId: user.schoolId || 'school-001',
        schoolName: 'Grace Seeds School',
        mustChangePassword: Boolean(mustChangePassword),
        hasEnrolledChildren: guardianLink.hasEnrolledChildren,
        enrolledChildIds: guardianLink.enrolledChildIds,
        guardianId: guardianLink.guardianId
      }
    };
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User account not found or inactive.');
    }

    const newPayload = {
      userId: user.id,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(newPayload);
    return { accessToken };
  }

  private async resolveGuardianLink(userId: string, userPhone?: string, userEmail?: string): Promise<{
    hasEnrolledChildren: boolean;
    enrolledChildIds: string[];
    guardianId?: string;
  }> {
    if (!this.guardianRepository) {
      if (userEmail === 'parent@smartshule.ac.ke' || userId === 'usr-parent-01') {
        return { hasEnrolledChildren: true, enrolledChildIds: ['student-001'], guardianId: 'grd-default-01' };
      }
      return { hasEnrolledChildren: false, enrolledChildIds: [] };
    }
    try {
      let guardian = await this.guardianRepository.findByUserId(userId);
      if (!guardian && userPhone) {
        guardian = await this.guardianRepository.findByPhone(userPhone);
      }
      if (!guardian) {
        const allGuardians = await this.guardianRepository.findAll();
        guardian = allGuardians.find(g => (userPhone && PhoneUtils.areMatches(g.emergencyContact, userPhone)) || g.userId === userId) || null;
      }
      if (guardian) {
        if (guardian.userId !== userId) {
          guardian.setUserId(userId);
          await this.guardianRepository.update(guardian);
        }
        const studentIdsSet = new Set<string>(guardian.studentIds || []);
        if (this.studentRepository) {
          const allStudents = await this.studentRepository.findAll();
          for (const s of allStudents) {
            if (s.guardianIds && s.guardianIds.includes(guardian.id)) {
              if (s.status === StudentStatus.ACTIVE || !s.status) {
                studentIdsSet.add(s.id);
              }
            }
          }
          const validStudentIds: string[] = [];
          for (const sid of Array.from(studentIdsSet)) {
            const st = await this.studentRepository.findById(sid);
            if (st && (st.status === StudentStatus.ACTIVE || !st.status)) {
              validStudentIds.push(sid);
            }
          }
          return {
            hasEnrolledChildren: validStudentIds.length > 0,
            enrolledChildIds: validStudentIds,
            guardianId: guardian.id
          };
        }

        const studentIds = Array.from(studentIdsSet);
        return {
          hasEnrolledChildren: studentIds.length > 0,
          enrolledChildIds: studentIds,
          guardianId: guardian.id
        };
      }

      if (userEmail === 'parent@smartshule.ac.ke' || userId === 'usr-parent-01') {
        return {
          hasEnrolledChildren: true,
          enrolledChildIds: ['student-001'],
          guardianId: 'grd-default-01'
        };
      }
    } catch {
      // Ignore lookup errors
    }
    return { hasEnrolledChildren: false, enrolledChildIds: [] };
  }

  public async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    const profile = user.toJSON();
    const guardianLink = await this.resolveGuardianLink(user.id, user.phone, user.email);
    return {
      ...profile,
      hasEnrolledChildren: guardianLink.hasEnrolledChildren,
      enrolledChildIds: guardianLink.enrolledChildIds,
      guardianId: guardianLink.guardianId
    };
  }

  public async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    let isMatch = await this.passwordHasher.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch && user.phone && PhoneUtils.areMatches(user.phone, dto.currentPassword)) {
      isMatch = true;
    }
    if (!isMatch && this.guardianRepository && (user.role === UserRole.PARENT || user.role === UserRole.GUARDIAN)) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g) {
        if (g.emergencyContact && PhoneUtils.areMatches(g.emergencyContact, dto.currentPassword)) {
          isMatch = true;
        } else if (g.nationalId && g.nationalId.trim() === dto.currentPassword.trim()) {
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect.');
    }

    const newHash = await this.passwordHasher.hash(dto.newPassword);
    user.updatePassword(newHash);
    user.setMustChangePassword(false);
    await this.userRepository.update(user);
    return { success: true, message: 'Password changed successfully.', user: user.toJSON() };
  }

  public async requestPasswordReset(emailOrPhone: string): Promise<{ success: boolean; message: string; debugCode?: string; debugToken?: string }> {
    let lookupEmail = emailOrPhone.toLowerCase().trim();
    const aliasMap: Record<string, string> = {
      superadmin: 'superadmin@smartshule.ac.ke',
      admin: 'admin@smartshule.ac.ke',
      headteacher: 'headteacher@smartshule.ac.ke',
      deputy: 'deputy@smartshule.ac.ke',
      admissions: 'admissions@smartshule.ac.ke',
      bursar: 'bursar@smartshule.ac.ke',
      teacher: 'teacher@smartshule.ac.ke',
      sarah: 'teacher@smartshule.ac.ke',
      parent: 'parent@smartshule.ac.ke',
      guardian: 'parent@smartshule.ac.ke',
      mary: 'parent@smartshule.ac.ke'
    };
    if (aliasMap[lookupEmail]) {
      lookupEmail = aliasMap[lookupEmail];
    }

    let user = await this.userRepository.findByEmail(lookupEmail);
    if (!user) {
      user = await this.userRepository.findByPhone(emailOrPhone.trim());
    }
    if (!user && this.guardianRepository) {
      const g = await this.guardianRepository.findByPhone(emailOrPhone.trim());
      if (g) {
        user = await this.userRepository.findById(g.userId);
      }
    }

    if (!user) {
      // Safe response to prevent account enumeration
      return {
        success: true,
        message: 'If an account is associated with this identifier, password reset instructions and a verification code have been sent.'
      };
    }

    // Generate cryptographically secure token & 6-digit numeric verification code
    const numericCode = crypto.randomInt(100000, 1000000).toString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiryMinutes = env.email.resetExpiryMinutes || 15;
    const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Persist composite token format `${numericCode}:${rawToken}` for dual verification
    user.setResetPasswordToken(`${numericCode}:${rawToken}`, expires);
    this.resetCodeAttempts.delete(user.id);
    await this.userRepository.update(user);

    const baseUrl = (env.server.frontendUrl || env.server.appUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/?view=reset-password&token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email || lookupEmail)}`;

    if (this.notificationService) {
      if (user.email) {
        const rendered = EmailTemplateEngine.renderPasswordResetEmail({
          to: user.email,
          recipientName: user.fullName,
          resetUrl,
          resetCode: numericCode,
          expiryMinutes
        });

        await this.notificationService.sendEmail(user.email, rendered.subject, rendered.text, rendered.html).catch((err) => {
          console.warn(`[Auth] Email dispatch error: ${err.message}`);
        });
      }

      let phoneToSend = user.phone;
      if (!phoneToSend && this.guardianRepository) {
        const g = await this.guardianRepository.findByUserId(user.id);
        phoneToSend = g?.emergencyContact;
      }
      if (phoneToSend) {
        await this.notificationService.sendSms(
          phoneToSend,
          `Grace Seeds School reset code: ${numericCode}. Valid for ${expiryMinutes} mins. Do not share.`
        ).catch(() => null);
      }
    }

    const resetMessage = user.email
      ? `A password reset link and ${expiryMinutes}-minute verification code have been dispatched to your registered address.`
      : 'A 6-digit password reset verification code has been sent to your phone number via SMS.';

    return {
      success: true,
      message: resetMessage,
      debugCode: process.env.NODE_ENV === 'test' ? numericCode : undefined,
      debugToken: process.env.NODE_ENV === 'test' ? rawToken : undefined
    };
  }

  private isTokenMatching(storedToken: string | undefined, providedCodeOrToken: string): boolean {
    if (!storedToken || !providedCodeOrToken) return false;
    const cleanProvided = providedCodeOrToken.trim();
    if (storedToken === cleanProvided) return true;
    if (storedToken.includes(':')) {
      const [storedCode, storedHex] = storedToken.split(':');
      if (storedCode && storedCode === cleanProvided) return true;
      if (storedHex && storedHex === cleanProvided) return true;
    }
    return false;
  }

  public async verifyResetToken(emailOrPhone: string, codeOrToken: string): Promise<{ valid: boolean; email?: string; message?: string }> {
    let lookupEmail = emailOrPhone.toLowerCase().trim();
    const aliasMap: Record<string, string> = {
      superadmin: 'superadmin@smartshule.ac.ke',
      admin: 'admin@smartshule.ac.ke',
      headteacher: 'headteacher@smartshule.ac.ke',
      deputy: 'deputy@smartshule.ac.ke',
      admissions: 'admissions@smartshule.ac.ke',
      bursar: 'bursar@smartshule.ac.ke',
      teacher: 'teacher@smartshule.ac.ke',
      parent: 'parent@smartshule.ac.ke',
      guardian: 'parent@smartshule.ac.ke'
    };
    if (aliasMap[lookupEmail]) lookupEmail = aliasMap[lookupEmail];

    let user = await this.userRepository.findByEmail(lookupEmail);
    if (!user) {
      user = await this.userRepository.findByPhone(emailOrPhone.trim());
    }
    if (!user && this.guardianRepository) {
      const g = await this.guardianRepository.findByPhone(emailOrPhone.trim());
      if (g) {
        user = await this.userRepository.findById(g.userId);
      }
    }
    if (!user || !user.resetPasswordToken) {
      return { valid: false, message: 'Invalid or missing reset token.' };
    }

    if (!this.isTokenMatching(user.resetPasswordToken, codeOrToken)) {
      return { valid: false, message: 'Invalid verification code or token.' };
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return { valid: false, message: 'Password reset link or code has expired. Please request a new one.' };
    }

    return {
      valid: true,
      email: user.email,
      message: 'Token is valid and active.'
    };
  }

  public async resetPasswordWithCode(dto: { email: string; resetCode?: string; token?: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    let lookupEmail = dto.email.toLowerCase().trim();
    const aliasMap: Record<string, string> = {
      superadmin: 'superadmin@smartshule.ac.ke',
      admin: 'admin@smartshule.ac.ke',
      headteacher: 'headteacher@smartshule.ac.ke',
      deputy: 'deputy@smartshule.ac.ke',
      admissions: 'admissions@smartshule.ac.ke',
      bursar: 'bursar@smartshule.ac.ke',
      teacher: 'teacher@smartshule.ac.ke',
      parent: 'parent@smartshule.ac.ke',
      guardian: 'parent@smartshule.ac.ke'
    };
    if (aliasMap[lookupEmail]) lookupEmail = aliasMap[lookupEmail];

    let user = await this.userRepository.findByEmail(lookupEmail);
    if (!user) {
      user = await this.userRepository.findByPhone(dto.email.trim());
    }
    if (!user && this.guardianRepository) {
      const g = await this.guardianRepository.findByPhone(dto.email.trim());
      if (g) {
        user = await this.userRepository.findById(g.userId);
      }
    }
    if (!user) {
      throw new UnauthorizedError('Invalid email, phone number, or reset code.');
    }

    const providedCode = (dto.resetCode || dto.token || '').trim();
    const currentAttempts = (this.resetCodeAttempts.get(user.id) || 0) + 1;

    if (!user.resetPasswordToken || !this.isTokenMatching(user.resetPasswordToken, providedCode)) {
      this.resetCodeAttempts.set(user.id, currentAttempts);
      if (currentAttempts >= 5) {
        user.clearResetPasswordToken();
        this.resetCodeAttempts.delete(user.id);
        await this.userRepository.update(user);
        throw new UnauthorizedError('Too many failed verification attempts. This reset code has been invalidated. Please request a new code.');
      }
      throw new UnauthorizedError('Invalid verification code.');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      this.resetCodeAttempts.delete(user.id);
      throw new UnauthorizedError('Password reset code has expired. Please request a new code.');
    }

    this.resetCodeAttempts.delete(user.id);
    const newHash = await this.passwordHasher.hash(dto.newPassword);
    user.updatePassword(newHash);
    user.setMustChangePassword(false);
    user.clearResetPasswordToken();
    await this.userRepository.update(user);

    if (this.notificationService) {
      if (user.email) {
        const rendered = EmailTemplateEngine.renderPasswordChangedEmail({
          to: user.email,
          recipientName: user.fullName,
          changeTime: new Date()
        });
        this.notificationService.sendEmail(
          user.email,
          rendered.subject,
          rendered.text,
          rendered.html
        ).catch(() => null);
      }
      if (user.phone) {
        this.notificationService.sendSms(
          user.phone,
          `Dear ${user.fullName}, your Grace Seeds School CBE Portal password has been successfully reset.`
        ).catch(() => null);
      }
    }

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.'
    };
  }

  public async listUsers(filters?: { schoolId?: string; role?: string; search?: string }) {
    const users = await this.userRepository.findAll({
      schoolId: filters?.schoolId,
      role: filters?.role
    });

    let result = users.map(u => u.toJSON());
    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(u =>
        u.fullName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        u.role.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public async adminCreateUser(
    dto: RegisterUserDTO & { status?: UserStatus },
    requestingUser?: { userId: string; role: UserRole }
  ) {
    if (dto.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can create accounts with the SUPER_ADMIN role.');
    }

    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new ValidationError('Either an email address or a phone number is required.');
    }

    let cleanEmail: string | undefined = undefined;
    if (dto.email && dto.email.trim() !== '') {
      cleanEmail = dto.email.toLowerCase().trim();
      const existing = await this.userRepository.findByEmail(cleanEmail);
      if (existing) {
        throw new ConflictError(`User with email '${dto.email}' already exists.`);
      }
    }

    const cleanPhone = dto.phone?.trim();
    if (cleanPhone) {
      const existingPhone = await this.userRepository.findByPhone(cleanPhone);
      if (existingPhone) {
        throw new ConflictError(`User with phone number '${cleanPhone}' already exists.`);
      }
    }

    let initialPassword = dto.password?.trim();
    if (!initialPassword) {
      if (cleanPhone) {
        initialPassword = cleanPhone;
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        initialPassword = Array.from({ length: 12 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      }
    }
    const passwordHash = await this.passwordHasher.hash(initialPassword);
    const userId = IdGenerator.generate();

    const user = User.create(
      {
        email: cleanEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        phone: cleanPhone,
        status: dto.status || UserStatus.ACTIVE,
        schoolId: dto.schoolId || 'school-001'
      },
      userId
    );

    await this.userRepository.save(user);
    return user.toJSON();
  }

  public async adminUpdateUser(
    userId: string,
    dto: { firstName?: string; lastName?: string; phone?: string; role?: UserRole; email?: string },
    requestingUser?: { userId: string; role: UserRole; schoolId?: string }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can modify Super Admin accounts.');
    }

    if (dto.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can assign the SUPER_ADMIN role.');
    }

    if (requestingUser?.schoolId && user.schoolId && user.schoolId !== requestingUser.schoolId && requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You are not authorized to modify users from a different school.');
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.toLowerCase().trim();
      if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
        const existing = await this.userRepository.findByEmail(cleanEmail);
        if (existing && existing.id !== userId) {
          throw new ConflictError(`Email '${dto.email}' is already in use by another user.`);
        }
        user.updateEmail(cleanEmail);
      } else if (!cleanEmail) {
        user.updateEmail(undefined);
      }
    }

    const previousUser = user.toJSON();

    if (dto.phone !== undefined) {
      const cleanPhone = dto.phone.trim();
      if (cleanPhone && cleanPhone !== user.phone?.trim()) {
        const existingPhone = await this.userRepository.findByPhone(cleanPhone);
        if (existingPhone && existingPhone.id !== userId) {
          throw new ConflictError(`Phone '${dto.phone}' is already in use by another user.`);
        }
      }
    }

    user.updateProfile(dto.firstName?.trim(), dto.lastName?.trim(), dto.phone?.trim());

    if (dto.role) {
      user.updateRole(dto.role);
    }

    await this.userRepository.update(user);

    if (this.systemLogRepository) {
      await this.systemLogRepository.create(
        SystemLog.create(
          {
            schoolId: user.schoolId || requestingUser?.schoolId || 'school-001',
            category: 'STAFF',
            action: 'USER_PROFILE_UPDATED_BY_ADMIN',
            actorUserId: requestingUser?.userId || 'system',
            actorRole: requestingUser?.role || 'ADMIN',
            status: 'SUCCESS',
            details: `Administrator updated profile for ${user.role} ${user.fullName}.`,
            metadata: {
              userId: user.id,
              previous: previousUser,
              updated: user.toJSON()
            }
          },
          IdGenerator.generate()
        )
      );
    }

    return user.toJSON();
  }

  public async adminSetStatus(
    userId: string,
    status: UserStatus,
    requestingUser?: { userId: string; role: UserRole }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can change the status of Super Admin accounts.');
    }

    user.setStatus(status);
    await this.userRepository.update(user);
    return user.toJSON();
  }

  public async adminResetPassword(
    userId: string,
    newPassword: string,
    requestingUser?: { userId: string; role: UserRole }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can reset Super Admin passwords.');
    }

    const newPasswordHash = await this.passwordHasher.hash(newPassword);
    user.updatePassword(newPasswordHash);
    await this.userRepository.update(user);
    return { id: user.id, email: user.email, message: 'Password reset successfully' };
  }

  public async adminDeleteUser(
    userId: string,
    requestingUser?: { userId: string; role: UserRole }
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.id === 'usr-superadmin-01' || user.email === 'superadmin@smartshule.ac.ke') {
      throw new ForbiddenError('The default root Super Administrator account cannot be deleted.');
    }

    if (user.role === UserRole.SUPER_ADMIN && requestingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only Super Administrators can delete Super Admin accounts.');
    }

    await this.userRepository.delete(userId);
  }

  public async getSetupStatus(): Promise<{ hasAdmin: boolean; totalUsers: number }> {
    const superAdmins = await this.userRepository.findAll({ role: UserRole.SUPER_ADMIN });
    const admins = await this.userRepository.findAll({ role: UserRole.ADMIN });
    const allUsers = await this.userRepository.findAll();
    return {
      hasAdmin: superAdmins.length > 0 || admins.length > 0,
      totalUsers: allUsers.length
    };
  }
}
