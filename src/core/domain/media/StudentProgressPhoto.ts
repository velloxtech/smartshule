import { Entity } from '../shared/Entity';

export interface ProgressPhotoProps {
  schoolId: string;
  teacherId: string;
  studentId: string;
  learningAreaId?: string;
  competencyTag?: string; // e.g. "Critical Thinking", "Creativity & Imagination", "Communication"
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageMetadata?: {
    format?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    processedAt?: string;
  };
  tags: string[];
  rating?: string;
}

export class StudentProgressPhoto extends Entity<ProgressPhotoProps> {
  public static create(
    props: ProgressPhotoProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): StudentProgressPhoto {
    return new StudentProgressPhoto(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get learningAreaId(): string | undefined {
    return this._props.learningAreaId;
  }

  public get competencyTag(): string | undefined {
    return this._props.competencyTag;
  }

  public get title(): string {
    return this._props.title;
  }

  public get description(): string {
    return this._props.description;
  }

  public get imageUrl(): string {
    return this._props.imageUrl;
  }

  public get thumbnailUrl(): string | undefined {
    return this._props.thumbnailUrl;
  }

  public get imageMetadata(): ProgressPhotoProps['imageMetadata'] {
    return this._props.imageMetadata;
  }

  public get tags(): string[] {
    return this._props.tags;
  }

  public get rating(): string | undefined {
    return this._props.rating;
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      teacherId: this.teacherId,
      teacherUserId: this.teacherId,
      studentId: this.studentId,
      learningAreaId: this.learningAreaId,
      competencyTag: this.competencyTag,
      competencyDomain: this.competencyTag,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      photoUrl: this.imageUrl,
      thumbnailUrl: this.thumbnailUrl || this.imageUrl,
      imageMetadata: this.imageMetadata,
      photoMetadata: this.imageMetadata ? {
        fileSize: this.imageMetadata.sizeBytes || 0,
        mimeType: `image/${this.imageMetadata.format || 'jpeg'}`,
        width: this.imageMetadata.width || 800,
        height: this.imageMetadata.height || 600
      } : undefined,
      tags: this.tags,
      rating: this.rating,
      recordedDate: this.createdAt.toISOString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
