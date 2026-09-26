import { Entity } from '../shared/Entity';

export enum GuardianRelationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  SPONSOR = 'SPONSOR',
  OTHER = 'OTHER'
}

export interface GuardianProps {
  userId: string;
  nationalId?: string;
  occupation?: string;
  relationship: GuardianRelationship;
  emergencyContact: string;
  studentIds: string[];
}

export class Guardian extends Entity<GuardianProps> {
  public static create(props: GuardianProps, id: string, createdAt?: Date, updatedAt?: Date): Guardian {
    return new Guardian(props, id, createdAt, updatedAt);
  }

  public get userId(): string {
    return this._props.userId;
  }

  public get nationalId(): string | undefined {
    return this._props.nationalId;
  }

  public get occupation(): string | undefined {
    return this._props.occupation;
  }

  public get relationship(): GuardianRelationship {
    return this._props.relationship;
  }

  public get emergencyContact(): string {
    return this._props.emergencyContact;
  }

  public get studentIds(): string[] {
    return this._props.studentIds;
  }

  public setUserId(userId: string): void {
    this._props.userId = userId;
    this.touch();
  }

  public linkStudent(studentId: string): void {
    if (!this._props.studentIds.includes(studentId)) {
      this._props.studentIds.push(studentId);
      this.touch();
    }
  }

  public updateDetails(details: {
    emergencyContact?: string;
    nationalId?: string;
    occupation?: string;
    relationship?: GuardianRelationship;
  }): void {
    if (details.emergencyContact !== undefined) this._props.emergencyContact = details.emergencyContact;
    if (details.nationalId !== undefined) this._props.nationalId = details.nationalId;
    if (details.occupation !== undefined) this._props.occupation = details.occupation;
    if (details.relationship !== undefined) this._props.relationship = details.relationship;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      nationalId: this.nationalId,
      occupation: this.occupation,
      relationship: this.relationship,
      emergencyContact: this.emergencyContact,
      studentIds: this.studentIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
