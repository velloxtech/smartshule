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

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface UserProps {
  email: string;
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
}

export class User extends Entity<UserProps> {
  public static create(props: UserProps, id: string, createdAt?: Date, updatedAt?: Date): User {
    return new User(props, id, createdAt, updatedAt);
  }

  public get email(): string {
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

  public setMustChangePassword(mustChange: boolean): void {
    this._props.mustChangePassword = mustChange;
    this.touch();
  }

  public setResetPasswordToken(token?: string, expires?: Date): void {
    this._props.resetPasswordToken = token;
    this._props.resetPasswordExpires = expires;
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

  public updateEmail(email: string): void {
    this._props.email = email.toLowerCase();
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
