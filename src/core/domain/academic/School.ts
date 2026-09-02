import { Entity } from '../shared/Entity';

export interface SchoolProps {
  name: string;
  code: string;
  centerCode?: string; // KNEC / CBC assessment center number
  motto?: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  currency: string;
}

export class School extends Entity<SchoolProps> {
  public static create(props: SchoolProps, id: string, createdAt?: Date, updatedAt?: Date): School {
    return new School(props, id, createdAt, updatedAt);
  }

  public get name(): string {
    return this._props.name;
  }

  public get code(): string {
    return this._props.code;
  }

  public get centerCode(): string | undefined {
    return this._props.centerCode;
  }

  public get motto(): string | undefined {
    return this._props.motto;
  }

  public get email(): string {
    return this._props.email;
  }

  public get phone(): string {
    return this._props.phone;
  }

  public get address(): string {
    return this._props.address;
  }

  public get logoUrl(): string | undefined {
    return this._props.logoUrl;
  }

  public get currency(): string {
    return this._props.currency;
  }

  public updateDetails(updates: Partial<SchoolProps>): void {
    Object.assign(this._props, updates);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      centerCode: this.centerCode,
      motto: this.motto,
      email: this.email,
      phone: this.phone,
      address: this.address,
      logoUrl: this.logoUrl,
      currency: this.currency,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
