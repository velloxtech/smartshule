import { Entity } from '../shared/Entity';

export interface TeacherEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface TeacherDocument {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface TeacherProps {
  userId: string;
  tscNumber?: string; // Teachers Service Commission ID
  employeeNumber: string;
  specialization: string[]; // List of Learning Areas / Subjects they teach
  assignedClassStreamIds: string[]; // Restricted to a single class/stream assignment
  qualification?: string;
  dateOfBirth?: string;
  gender?: string;
  nationalId?: string;
  residentialAddress?: string;
  profilePhotoUrl?: string;
  employmentDate?: string;
  employmentType?: string; // e.g. FULL_TIME, PART_TIME, CONTRACT, INTERN
  employmentStatus?: string; // e.g. ACTIVE, ON_LEAVE, PROBATION, SUSPENDED
  department?: string; // e.g. Languages, Mathematics, Science
  emergencyContact?: TeacherEmergencyContact;
  documents?: TeacherDocument[];
}

export class Teacher extends Entity<TeacherProps> {
  public static create(props: TeacherProps, id: string, createdAt?: Date, updatedAt?: Date): Teacher {
    // Enforce single-class restriction on creation if multiple were provided
    const singleStream = props.assignedClassStreamIds && props.assignedClassStreamIds.length > 0 
      ? [props.assignedClassStreamIds[0]] 
      : [];
    
    return new Teacher({
      ...props,
      assignedClassStreamIds: singleStream,
      employmentType: props.employmentType || 'FULL_TIME',
      employmentStatus: props.employmentStatus || 'ACTIVE',
      emergencyContact: props.emergencyContact || {},
      documents: props.documents || []
    }, id, createdAt, updatedAt);
  }

  public get userId(): string {
    return this._props.userId;
  }

  public get tscNumber(): string | undefined {
    return this._props.tscNumber;
  }

  public get employeeNumber(): string {
    return this._props.employeeNumber;
  }

  public get specialization(): string[] {
    return this._props.specialization;
  }

  public get assignedClassStreamIds(): string[] {
    return this._props.assignedClassStreamIds;
  }

  public get qualification(): string | undefined {
    return this._props.qualification;
  }

  public get dateOfBirth(): string | undefined {
    return this._props.dateOfBirth;
  }

  public get gender(): string | undefined {
    return this._props.gender;
  }

  public get nationalId(): string | undefined {
    return this._props.nationalId;
  }

  public get residentialAddress(): string | undefined {
    return this._props.residentialAddress;
  }

  public get profilePhotoUrl(): string | undefined {
    return this._props.profilePhotoUrl;
  }

  public get employmentDate(): string | undefined {
    return this._props.employmentDate;
  }

  public get employmentType(): string {
    return this._props.employmentType || 'FULL_TIME';
  }

  public get employmentStatus(): string {
    return this._props.employmentStatus || 'ACTIVE';
  }

  public get department(): string | undefined {
    return this._props.department;
  }

  public get emergencyContact(): TeacherEmergencyContact | undefined {
    return this._props.emergencyContact;
  }

  public get documents(): TeacherDocument[] {
    return this._props.documents || [];
  }

  /**
   * Assigns a single class/stream to the teacher, overwriting any previous assignment
   * to strictly enforce the 1-class-per-teacher rule.
   */
  public assignStream(streamId: string): void {
    if (this._props.assignedClassStreamIds.length !== 1 || this._props.assignedClassStreamIds[0] !== streamId) {
      this._props.assignedClassStreamIds = [streamId];
      this.touch();
    }
  }

  public removeStream(streamId: string): void {
    if (this._props.assignedClassStreamIds.includes(streamId)) {
      this._props.assignedClassStreamIds = [];
      this.touch();
    }
  }

  public updateSpecialization(subjects: string[]): void {
    this._props.specialization = subjects;
    this.touch();
  }

  /**
   * Updates only permitted self-service profile fields.
   */
  public updateSelfServiceProfile(props: {
    residentialAddress?: string;
    profilePhotoUrl?: string;
    emergencyContact?: TeacherEmergencyContact;
  }): void {
    if (props.residentialAddress !== undefined) this._props.residentialAddress = props.residentialAddress;
    if (props.profilePhotoUrl !== undefined) this._props.profilePhotoUrl = props.profilePhotoUrl;
    if (props.emergencyContact !== undefined) this._props.emergencyContact = props.emergencyContact;
    this.touch();
  }

  public updateDetails(props: {
    tscNumber?: string;
    employeeNumber?: string;
    specialization?: string[];
    qualification?: string;
    assignedClassStreamIds?: string[];
    dateOfBirth?: string;
    gender?: string;
    nationalId?: string;
    residentialAddress?: string;
    profilePhotoUrl?: string;
    employmentDate?: string;
    employmentType?: string;
    employmentStatus?: string;
    department?: string;
    emergencyContact?: TeacherEmergencyContact;
    documents?: TeacherDocument[];
  }): void {
    if (props.tscNumber !== undefined) this._props.tscNumber = props.tscNumber;
    if (props.employeeNumber !== undefined) this._props.employeeNumber = props.employeeNumber;
    if (props.specialization !== undefined) this._props.specialization = props.specialization;
    if (props.qualification !== undefined) this._props.qualification = props.qualification;
    if (props.dateOfBirth !== undefined) this._props.dateOfBirth = props.dateOfBirth;
    if (props.gender !== undefined) this._props.gender = props.gender;
    if (props.nationalId !== undefined) this._props.nationalId = props.nationalId;
    if (props.residentialAddress !== undefined) this._props.residentialAddress = props.residentialAddress;
    if (props.profilePhotoUrl !== undefined) this._props.profilePhotoUrl = props.profilePhotoUrl;
    if (props.employmentDate !== undefined) this._props.employmentDate = props.employmentDate;
    if (props.employmentType !== undefined) this._props.employmentType = props.employmentType;
    if (props.employmentStatus !== undefined) this._props.employmentStatus = props.employmentStatus;
    if (props.department !== undefined) this._props.department = props.department;
    if (props.emergencyContact !== undefined) this._props.emergencyContact = props.emergencyContact;
    if (props.documents !== undefined) this._props.documents = props.documents;
    if (props.assignedClassStreamIds !== undefined) {
      this._props.assignedClassStreamIds = props.assignedClassStreamIds.length > 0 
        ? [props.assignedClassStreamIds[0]] 
        : [];
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      tscNumber: this.tscNumber,
      employeeNumber: this.employeeNumber,
      specialization: this.specialization,
      assignedClassStreamIds: this.assignedClassStreamIds,
      qualification: this.qualification,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      nationalId: this.nationalId,
      residentialAddress: this.residentialAddress,
      profilePhotoUrl: this.profilePhotoUrl,
      employmentDate: this.employmentDate,
      employmentType: this.employmentType,
      employmentStatus: this.employmentStatus,
      department: this.department,
      emergencyContact: this.emergencyContact,
      documents: this.documents,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}