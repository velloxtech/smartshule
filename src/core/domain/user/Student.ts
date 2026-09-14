import { Entity } from '../shared/Entity';

export enum StudentGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  TRANSFERRED = 'TRANSFERRED',
  GRADUATED = 'GRADUATED',
  SUSPENDED = 'SUSPENDED'
}

export enum CbcGradeLevel {
  PLAYGROUP = 'PLAYGROUP',
  PP1 = 'PP1',
  PP2 = 'PP2',
  GRADE_1 = 'GRADE_1',
  GRADE_2 = 'GRADE_2',
  GRADE_3 = 'GRADE_3',
  GRADE_4 = 'GRADE_4',
  GRADE_5 = 'GRADE_5',
  GRADE_6 = 'GRADE_6',
  GRADE_7 = 'GRADE_7',
  GRADE_8 = 'GRADE_8',
  GRADE_9 = 'GRADE_9',
  SENIOR_1 = 'SENIOR_1',
  SENIOR_2 = 'SENIOR_2',
  SENIOR_3 = 'SENIOR_3'
}

export interface StudentProps {
  admissionNumber: string;
  upiNumber?: string; // NEMIS / CBA identifier
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: StudentGender;
  gradeLevel: CbcGradeLevel;
  classroomId?: string;
  streamId?: string;
  schoolId: string;
  academicYearId: string;
  guardianIds: string[];
  medicalConditions?: string;
  specialNeeds?: string;
  status: StudentStatus;
  profilePhotoUrl?: string;
}

export class Student extends Entity<StudentProps> {
  public static create(props: StudentProps, id: string, createdAt?: Date, updatedAt?: Date): Student {
    return new Student(props, id, createdAt, updatedAt);
  }

  public get admissionNumber(): string {
    return this._props.admissionNumber;
  }

  public get upiNumber(): string | undefined {
    return this._props.upiNumber;
  }

  public get firstName(): string {
    return this._props.firstName;
  }

  public get middleName(): string | undefined {
    return this._props.middleName;
  }

  public get lastName(): string {
    return this._props.lastName;
  }

  public get fullName(): string {
    return [this._props.firstName, this._props.middleName, this._props.lastName]
      .filter(Boolean)
      .join(' ');
  }

  public get dateOfBirth(): string {
    return this._props.dateOfBirth;
  }

  public get gender(): StudentGender {
    return this._props.gender;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get classroomId(): string | undefined {
    return this._props.classroomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get guardianIds(): string[] {
    return this._props.guardianIds;
  }

  public get medicalConditions(): string | undefined {
    return this._props.medicalConditions;
  }

  public get specialNeeds(): string | undefined {
    return this._props.specialNeeds;
  }

  public get status(): StudentStatus {
    return this._props.status;
  }

  public get profilePhotoUrl(): string | undefined {
    return this._props.profilePhotoUrl;
  }

  public updateProfile(
    firstName?: string,
    middleName?: string,
    lastName?: string,
    gender?: StudentGender,
    dob?: string
  ): void {
    if (firstName) this._props.firstName = firstName;
    if (middleName !== undefined) this._props.middleName = middleName;
    if (lastName) this._props.lastName = lastName;
    if (gender) this._props.gender = gender;
    if (dob) this._props.dateOfBirth = dob;
    this.touch();
  }

  public promoteOrTransfer(
    newGradeLevel: CbcGradeLevel,
    newClassroomIdOrStreamId?: string,
    newStreamIdOrAcademicYearId?: string,
    newAcademicYearId?: string
  ): void {
    this._props.gradeLevel = newGradeLevel;
    if (newAcademicYearId !== undefined) {
      if (newClassroomIdOrStreamId) this._props.classroomId = newClassroomIdOrStreamId;
      this._props.streamId = newStreamIdOrAcademicYearId;
      this._props.academicYearId = newAcademicYearId;
    } else {
      if (newClassroomIdOrStreamId) {
        if (newClassroomIdOrStreamId.startsWith('stream-')) {
          this._props.streamId = newClassroomIdOrStreamId;
        } else if (newClassroomIdOrStreamId.startsWith('class-')) {
          this._props.classroomId = newClassroomIdOrStreamId;
        } else {
          this._props.streamId = newClassroomIdOrStreamId;
        }
      }
      if (newStreamIdOrAcademicYearId) {
        if (newStreamIdOrAcademicYearId.startsWith('year-')) {
          this._props.academicYearId = newStreamIdOrAcademicYearId;
        } else if (newStreamIdOrAcademicYearId.startsWith('stream-')) {
          this._props.streamId = newStreamIdOrAcademicYearId;
        } else {
          this._props.academicYearId = newStreamIdOrAcademicYearId;
        }
      }
    }
    this.touch();
  }

  public addGuardian(guardianId: string): void {
    if (!this._props.guardianIds.includes(guardianId)) {
      this._props.guardianIds.push(guardianId);
      this.touch();
    }
  }

  public setStatus(status: StudentStatus): void {
    this._props.status = status;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      admissionNumber: this.admissionNumber,
      upiNumber: this.upiNumber,
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      fullName: this.fullName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      gradeLevel: this.gradeLevel,
      classroomId: this.classroomId,
      streamId: this.streamId,
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      guardianIds: this.guardianIds,
      medicalConditions: this.medicalConditions,
      specialNeeds: this.specialNeeds,
      status: this.status,
      profilePhotoUrl: this.profilePhotoUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
