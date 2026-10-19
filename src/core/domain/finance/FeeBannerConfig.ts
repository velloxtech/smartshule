import { Entity } from '../shared/Entity';

export interface FeeBannerConfigProps {
  schoolId: string;
  deadlineDate: string; // e.g. "2026-11-15"
  bannerTitle: string; // e.g. "School Fee Payment Notice"
  customMessage?: string;
  paybillNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  isEnabled: boolean;
  showOnlyToDefaulters: boolean;
  academicTermId?: string;
  academicYearId?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export class FeeBannerConfig extends Entity<FeeBannerConfigProps> {
  public static create(
    props: Partial<FeeBannerConfigProps> & { schoolId: string; deadlineDate: string },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): FeeBannerConfig {
    return new FeeBannerConfig(
      {
        schoolId: props.schoolId,
        deadlineDate: props.deadlineDate,
        bannerTitle: props.bannerTitle || 'School Fee Payment Notice',
        customMessage: props.customMessage || '',
        paybillNumber: props.paybillNumber || '522533',
        bankAccountNumber: props.bankAccountNumber || '1234567890',
        bankName: props.bankName || 'KCB Bank',
        isEnabled: props.isEnabled !== false,
        showOnlyToDefaulters: props.showOnlyToDefaulters !== false,
        academicTermId: props.academicTermId,
        academicYearId: props.academicYearId,
        updatedByUserId: props.updatedByUserId,
        updatedByUserName: props.updatedByUserName,
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get deadlineDate(): string {
    return this._props.deadlineDate;
  }

  public get bannerTitle(): string {
    return this._props.bannerTitle;
  }

  public get customMessage(): string | undefined {
    return this._props.customMessage;
  }

  public get paybillNumber(): string | undefined {
    return this._props.paybillNumber;
  }

  public get bankAccountNumber(): string | undefined {
    return this._props.bankAccountNumber;
  }

  public get bankName(): string | undefined {
    return this._props.bankName;
  }

  public get isEnabled(): boolean {
    return this._props.isEnabled;
  }

  public get showOnlyToDefaulters(): boolean {
    return this._props.showOnlyToDefaulters;
  }

  public get academicTermId(): string | undefined {
    return this._props.academicTermId;
  }

  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }

  public get updatedByUserId(): string | undefined {
    return this._props.updatedByUserId;
  }

  public get updatedByUserName(): string | undefined {
    return this._props.updatedByUserName;
  }

  public update(updates: Partial<FeeBannerConfigProps>): void {
    Object.assign(this._props, updates);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      deadlineDate: this.deadlineDate,
      bannerTitle: this.bannerTitle,
      customMessage: this.customMessage,
      paybillNumber: this.paybillNumber,
      bankAccountNumber: this.bankAccountNumber,
      bankName: this.bankName,
      isEnabled: this.isEnabled,
      showOnlyToDefaulters: this.showOnlyToDefaulters,
      academicTermId: this.academicTermId,
      academicYearId: this.academicYearId,
      updatedByUserId: this.updatedByUserId,
      updatedByUserName: this.updatedByUserName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
