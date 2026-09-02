export abstract class Entity<T> {
  protected readonly _id: string;
  protected readonly _props: T;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(props: T, id: string, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._props = props;
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = updatedAt ?? new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    return this._id === object._id;
  }
}

export abstract class AggregateRoot<T> extends Entity<T> {}

export class Result<T, E = string> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: E;
  private readonly _value?: T;

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Can't get the value of an error result: ${JSON.stringify(this.error)}`);
    }
    return this._value as T;
  }

  public static ok<U, E = string>(value?: U): Result<U, E> {
    return new Result<U, E>(true, undefined, value);
  }

  public static fail<U, E = string>(error: E): Result<U, E> {
    return new Result<U, E>(false, error);
  }
}
