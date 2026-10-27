import { Entity } from '../shared/Entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  HEAD_TEACHER = 'HEAD_TEACHER',
  DEPUTY_HEAD_TEACHER = 'DEPUTY_HEAD_TEACHER',
  ADMISSIONS = 'ADMISSIONS',
  BURSAR = 'BURSAR',
  ACCOUNTANT = 'ACCOUNTANT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  GUARDIAN = 'GUARDIAN',
  STUDENT = 'STUDENT'
}

export const BILLING_AUTHORIZED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.BURSAR,
  UserRole.ACCOUNTANT
];

export function isBillingAuthorizedRole(role?: string | UserRole): boolean {
  if (!role) return false;
  return BILLING_AUTHORIZED_ROLES.includes(role as UserRole);
}

export const TERM_INITIALIZATION_AUTHORIZED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.HEAD_TEACHER
];

export function isTermInitializationAuthorizedRole(role?: string | UserRole): boolean {
  if (!role) return false;
  const normalized = String(role).toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'HEADTEACHER' || normalized === 'HEAD_TEACHER') return true;
  if (normalized === 'ADMIN' || normalized === 'SCHOOL_ADMIN' || normalized === 'SUPER_ADMIN') return true;
  return TERM_INITIALIZATION_AUTHORIZED_ROLES.includes(role as UserRole);
}

export const TEACHER_PROFILE_ROLES: UserRole[] = [
  UserRole.TEACHER,
  UserRole.HEAD_TEACHER,
  UserRole.DEPUTY_HEAD_TEACHER
];

export function roleRequiresTeacherProfile(role?: string | UserRole): boolean {
  if (!role) return false;
  const normalized = String(role).toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'HEADTEACHER') return true;
  if (normalized === 'DEPUTYHEADTEACHER') return true;
  return TEACHER_PROFILE_ROLES.includes(normalized as UserRole);
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface UserProps {
  email?: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  schoolId?: string;
  mustChangePassword?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordAttempts?: number;
}

export class User extends Entity<UserProps> {
  public static create(props: UserProps, id: string, createdAt?: Date, updatedAt?: Date): User {
    return new User(props, id, createdAt, updatedAt);
  }

  public get email(): string | undefined {
    return this._props.email;
  }

  public get passwordHash(): string {
    return this._props.passwordHash;
  }

  public get firstName(): string {
    return this._props.firstName;
  }

  public get lastName(): string {
    return this._props.lastName;
  }

  public get fullName(): string {
    return `${this._props.firstName} ${this._props.lastName}`;
  }

  public get role(): UserRole {
    return this._props.role;
  }

  public get phone(): string | undefined {
    return this._props.phone;
  }

  public get status(): UserStatus {
    return this._props.status;
  }

  public get schoolId(): string | undefined {
    return this._props.schoolId;
  }

  public get mustChangePassword(): boolean {
    return this._props.mustChangePassword ?? false;
  }

  public get resetPasswordToken(): string | undefined {
    return this._props.resetPasswordToken;
  }

  public get resetPasswordExpires(): Date | undefined {
    return this._props.resetPasswordExpires;
  }

  public get resetPasswordAttempts(): number {
    return this._props.resetPasswordAttempts ?? 0;
  }

  public setSchoolId(schoolId?: string): void {
    this._props.schoolId = schoolId;
    this.touch();
  }

  public setMustChangePassword(mustChange: boolean): void {
    this._props.mustChangePassword = mustChange;
    this.touch();
  }

  public setResetPasswordToken(token?: string, expires?: Date): void {
    this._props.resetPasswordToken = token;
    this._props.resetPasswordExpires = expires;
    this._props.resetPasswordAttempts = 0;
    this.touch();
  }

  public incrementResetAttempts(): number {
    const current = (this._props.resetPasswordAttempts ?? 0) + 1;
    this._props.resetPasswordAttempts = current;
    this.touch();
    return current;
  }

  public clearResetPasswordToken(): void {
    this._props.resetPasswordToken = undefined;
    this._props.resetPasswordExpires = undefined;
    this._props.resetPasswordAttempts = 0;
    this.touch();
  }

  public updateProfile(firstName?: string, lastName?: string, phone?: string): void {
    if (firstName) this._props.firstName = firstName;
    if (lastName) this._props.lastName = lastName;
    if (phone) this._props.phone = phone;
    this.touch();
  }

  public updatePassword(newPasswordHash: string): void {
    this._props.passwordHash = newPasswordHash;
    this._props.mustChangePassword = false;
    this._props.resetPasswordToken = undefined;
    this._props.resetPasswordExpires = undefined;
    this._props.resetPasswordAttempts = 0;
    this.touch();
  }

  public setStatus(status: UserStatus): void {
    this._props.status = status;
    this.touch();
  }

  public updateRole(role: UserRole): void {
    this._props.role = role;
    this.touch();
  }

  public updateEmail(email?: string): void {
    this._props.email = email ? email.toLowerCase().trim() : undefined;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
      phone: this.phone,
      status: this.status,
      schoolId: this.schoolId || 'school-001',
      schoolName: 'Grace Seeds School',
      mustChangePassword: this.mustChangePassword,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
