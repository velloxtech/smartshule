import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IAuthTokenService, IPasswordHasher, INotificationService } from '../../core/ports/services/IExternalServices';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
  mustChangePassword?: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    schoolId?: string;
    schoolName?: string;
    mustChangePassword?: boolean;
  };
}

export class AuthUseCases {
  private readonly resetCodeAttempts: Map<string, number> = new Map();

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: IAuthTokenService,
    private readonly notificationService?: INotificationService,
    private readonly guardianRepository?: IGuardianRepository
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
      throw new ForbiddenError('Self-registration is not allowed for privileged administrative roles.');
    }

    const existing = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictError(`User with email '${dto.email}' already exists.`);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const userId = IdGenerator.generate();

    const user = User.create(
      {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId
      },
      userId
    );

    await this.userRepository.save(user);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
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
    let lookupEmail = dto.email.toLowerCase().trim();
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

    let user = await this.userRepository.findByEmail(lookupEmail);
    if (!user && (lookupEmail === 'teacher' || lookupEmail === 'teacher@smartshule.ac.ke')) {
      user = await this.userRepository.findByEmail('sarah.mwangi@smartshule.ac.ke');
    }
    if (!user && (lookupEmail === 'parent' || lookupEmail === 'parent@smartshule.ac.ke')) {
      user = await this.userRepository.findByEmail('mary.kariuki@gmail.com');
    }
    if (!user) {
      user = await this.userRepository.findByPhone(dto.email.trim());
    }

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is inactive or suspended.');
    }

    let isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    const isParentRole = user.role === UserRole.PARENT || user.role === UserRole.GUARDIAN;
    let isDefaultIdPassword = false;

    // For parent accounts, check if default National ID was supplied
    if (!isMatch && isParentRole && this.guardianRepository) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g && g.nationalId && g.nationalId.trim() === dto.password.trim()) {
        isMatch = true;
        isDefaultIdPassword = true;
      }
    }

    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Check if guardian authenticated with their National ID
    if (this.guardianRepository && isParentRole && !isDefaultIdPassword) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g && g.nationalId && g.nationalId.trim() === dto.password.trim()) {
        isDefaultIdPassword = true;
      }
    }

    let mustChangePassword = user.mustChangePassword;
    if (isParentRole && isDefaultIdPassword) {
      mustChangePassword = true;
      user.setMustChangePassword(true);
      await this.userRepository.update(user);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
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
        schoolName: 'Grace Seeds School',
        mustChangePassword: Boolean(mustChangePassword)
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
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(newPayload);
    return { accessToken };
  }

  public async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user.toJSON();
  }

  public async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    let isMatch = await this.passwordHasher.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch && this.guardianRepository && (user.role === UserRole.PARENT || user.role === UserRole.GUARDIAN)) {
      const g = await this.guardianRepository.findByUserId(user.id);
      if (g && g.nationalId && g.nationalId.trim() === dto.currentPassword.trim()) {
        isMatch = true;
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

  public async requestPasswordReset(emailOrPhone: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
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

    if (!user) {
      // Safe response to prevent account enumeration
      return {
        success: true,
        message: 'If an account is associated with this email, a 6-digit password reset code has been sent.'
      };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.setResetPasswordToken(resetCode, expires);
    this.resetCodeAttempts.delete(user.id);
    await this.userRepository.update(user);

    if (this.notificationService) {
      const subject = `SmartShule Password Reset Code: ${resetCode}`;
      const body = `Dear ${user.fullName},\n\nYour 6-digit SmartShule CBC Portal password reset verification code is:\n\n    ${resetCode}\n\nThis code expires in 15 minutes.\n\nGrace Seeds School · Kisumu County\n"The future Begins Here"\nTel: 0745436312 | schoolgraceseeds@gmail.com`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
          <div style="background: #7a1228; padding: 20px; border-radius: 12px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 22px; font-weight: bold;">SmartShule CBC Portal</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #fecdd3;">Grace Seeds School · Kisumu County</p>
          </div>
          <div style="padding: 24px 8px; color: #1f2937;">
            <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${user.fullName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">You requested to reset your password for your account (<strong>${user.email}</strong>). Use the verification code below to set a new password:</p>
            <div style="background-color: #fff1f2; border: 2px dashed #7a1228; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #9f1239; font-weight: bold;">Your 6-Digit Verification Code</div>
              <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #7a1228; margin-top: 6px; font-family: monospace;">${resetCode}</div>
            </div>
            <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px;">Grace Seeds School · "The future Begins Here"</p>
            <p style="margin: 0;">Tel: 0745436312 · Email: schoolgraceseeds@gmail.com</p>
          </div>
        </div>
      `;

      await this.notificationService.sendEmail(user.email, subject, body, html).catch((err) => {
        console.warn(`[Auth] Email dispatch error: ${err.message}`);
      });

      if (user.phone) {
        await this.notificationService.sendSms(
          user.phone,
          `SmartShule reset code: ${resetCode}. Valid for 15 mins. Do not share.`
        ).catch(() => null);
      }
    }

    return {
      success: true,
      message: 'A 6-digit password reset verification code has been sent to your email.',
      debugCode: process.env.NODE_ENV === 'test' ? resetCode : undefined
    };
  }

  public async resetPasswordWithCode(dto: { email: string; resetCode: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
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

    const user = await this.userRepository.findByEmail(lookupEmail);
    if (!user) {
      throw new UnauthorizedError('Invalid email or reset code.');
    }

    const currentAttempts = (this.resetCodeAttempts.get(user.id) || 0) + 1;

    if (!user.resetPasswordToken || user.resetPasswordToken !== dto.resetCode.trim()) {
      this.resetCodeAttempts.set(user.id, currentAttempts);
      if (currentAttempts >= 5) {
        user.setResetPasswordToken(undefined, undefined);
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
    user.setResetPasswordToken(undefined, undefined);
    await this.userRepository.update(user);

    if (this.notificationService) {
      this.notificationService.sendEmail(
        user.email,
        'SmartShule Password Successfully Reset',
        `Dear ${user.fullName},\n\nYour SmartShule CBC Portal password has been successfully updated.\n\nGrace Seeds School · "The future Begins Here"`
      ).catch(() => null);
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
        u.email.toLowerCase().includes(q) ||
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

    const existing = await this.userRepository.findByEmail(dto.email.toLowerCase().trim());
    if (existing) {
      throw new ConflictError(`User with email '${dto.email}' already exists.`);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const userId = IdGenerator.generate();

    const user = User.create(
      {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        phone: dto.phone?.trim(),
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
    requestingUser?: { userId: string; role: UserRole }
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

    if (dto.email && dto.email.toLowerCase().trim() !== user.email.toLowerCase()) {
      const existing = await this.userRepository.findByEmail(dto.email.toLowerCase().trim());
      if (existing && existing.id !== userId) {
        throw new ConflictError(`Email '${dto.email}' is already in use by another user.`);
      }
      user.updateEmail(dto.email.trim());
    }

    user.updateProfile(dto.firstName?.trim(), dto.lastName?.trim(), dto.phone?.trim());

    if (dto.role) {
      user.updateRole(dto.role);
    }

    await this.userRepository.update(user);
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
}
