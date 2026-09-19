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

  public updateProfile(firstName?: string, lastName?: string, phone?: string): void {
    if (firstName) this._props.firstName = firstName;
    if (lastName) this._props.lastName = lastName;
    if (phone) this._props.phone = phone;
    this.touch();
  }

  public updatePassword(newPasswordHash: string): void {
    this._props.passwordHash = newPasswordHash;
    this.touch();
  }

  public setStatus(status: UserStatus): void {
    this._props.status = status;
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
      schoolId: this.schoolId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
