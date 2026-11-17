import { Entity } from '../shared/Entity';

export type ConsentCategory =
  | 'TRIP'
  | 'MEDICAL'
  | 'MEDIA'
  | 'SPORTS'
  | 'TRANSPORT'
  | 'GENERAL'
  | string;

export type ConsentTargetType = 'WHOLE_SCHOOL' | 'GRADE' | 'STREAM' | 'INDIVIDUAL';
export type ConsentStatus = 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';

export interface ParentConsentRequestProps {
  schoolId: string;
  title: string;
  category: ConsentCategory;
  description?: string;
  termsAndConditions: string;
  version: number;
  targetType: ConsentTargetType;
  targetClassIds: string[];
  targetStudentIds: string[];
  isMandatory: boolean;
  deadline?: Date;
  status: ConsentStatus;
  createdByUserId?: string;
  createdByName?: string;
}

export class ParentConsentRequest extends Entity<ParentConsentRequestProps> {
  public static create(
    props: Partial<ParentConsentRequestProps> & {
      schoolId: string;
      title: string;
      termsAndConditions: string;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): ParentConsentRequest {
    return new ParentConsentRequest(
      {
        schoolId: props.schoolId,
        title: props.title,
        category: props.category || 'GENERAL',
        description: props.description || '',
        termsAndConditions: props.termsAndConditions,
        version: props.version || 1,
        targetType: props.targetType || 'WHOLE_SCHOOL',
        targetClassIds: props.targetClassIds || [],
        targetStudentIds: props.targetStudentIds || [],
        isMandatory: props.isMandatory !== undefined ? props.isMandatory : true,
        deadline: props.deadline,
        status: props.status || 'PUBLISHED',
        createdByUserId: props.createdByUserId,
        createdByName: props.createdByName,
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get title(): string { return this._props.title; }
  public get category(): ConsentCategory { return this._props.category; }
  public get description(): string | undefined { return this._props.description; }
  public get termsAndConditions(): string { return this._props.termsAndConditions; }
  public get version(): number { return this._props.version; }
  public get targetType(): ConsentTargetType { return this._props.targetType; }
  public get targetClassIds(): string[] { return this._props.targetClassIds; }
  public get targetStudentIds(): string[] { return this._props.targetStudentIds; }
  public get isMandatory(): boolean { return this._props.isMandatory; }
  public get deadline(): Date | undefined { return this._props.deadline; }
  public get status(): ConsentStatus { return this._props.status; }
  public get createdByUserId(): string | undefined { return this._props.createdByUserId; }
  public get createdByName(): string | undefined { return this._props.createdByName; }

  public publish(): void {
    this._props.status = 'PUBLISHED';
    this.touch();
  }

  public archive(): void {
    this._props.status = 'ARCHIVED';
    this.touch();
  }

  public updateWording(
    title: string,
    termsAndConditions: string,
    description?: string,
    bumpVersion: boolean = true
  ): void {
    this._props.title = title;
    this._props.termsAndConditions = termsAndConditions;
    if (description !== undefined) {
      this._props.description = description;
    }
    if (bumpVersion) {
      this._props.version = (this._props.version || 1) + 1;
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      title: this.title,
      category: this.category,
      description: this.description,
      termsAndConditions: this.termsAndConditions,
      version: this.version,
      targetType: this.targetType,
      targetClassIds: this.targetClassIds,
      targetStudentIds: this.targetStudentIds,
      isMandatory: this.isMandatory,
      deadline: this.deadline?.toISOString(),
      status: this.status,
      createdByUserId: this.createdByUserId,
      createdByName: this.createdByName,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
