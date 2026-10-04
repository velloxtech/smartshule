import { Entity } from '../shared/Entity';

export type BookCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface BookProps {
  schoolId: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  publisher?: string;
  publicationYear?: number;
  copiesTotal: number;
  copiesAvailable: number;
  shelfLocation?: string;
  condition: BookCondition;
  gradeLevel?: string;
  coverImageUrl?: string;
  description?: string;
}

export class Book extends Entity<BookProps> {
  public static create(
    props: {
      schoolId: string;
      title: string;
      author: string;
      isbn?: string;
      category?: string;
      publisher?: string;
      publicationYear?: number;
      copiesTotal?: number;
      copiesAvailable?: number;
      shelfLocation?: string;
      condition?: BookCondition;
      gradeLevel?: string;
      coverImageUrl?: string;
      description?: string;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Book {
    const copiesTotal = props.copiesTotal !== undefined ? Math.max(0, props.copiesTotal) : 1;
    const copiesAvailable = props.copiesAvailable !== undefined 
      ? Math.min(copiesTotal, Math.max(0, props.copiesAvailable)) 
      : copiesTotal;

    return new Book(
      {
        schoolId: props.schoolId,
        title: props.title,
        author: props.author,
        isbn: props.isbn,
        category: props.category || 'CBC Textbooks',
        publisher: props.publisher,
        publicationYear: props.publicationYear,
        copiesTotal,
        copiesAvailable,
        shelfLocation: props.shelfLocation,
        condition: props.condition || 'GOOD',
        gradeLevel: props.gradeLevel || 'All Grades',
        coverImageUrl: props.coverImageUrl,
        description: props.description
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get title(): string {
    return this._props.title;
  }

  public get author(): string {
    return this._props.author;
  }

  public get isbn(): string | undefined {
    return this._props.isbn;
  }

  public get category(): string {
    return this._props.category;
  }

  public get publisher(): string | undefined {
    return this._props.publisher;
  }

  public get publicationYear(): number | undefined {
    return this._props.publicationYear;
  }

  public get copiesTotal(): number {
    return this._props.copiesTotal;
  }

  public get copiesAvailable(): number {
    return this._props.copiesAvailable;
  }

  public get shelfLocation(): string | undefined {
    return this._props.shelfLocation;
  }

  public get condition(): BookCondition {
    return this._props.condition;
  }

  public get gradeLevel(): string | undefined {
    return this._props.gradeLevel;
  }

  public get coverImageUrl(): string | undefined {
    return this._props.coverImageUrl;
  }

  public get description(): string | undefined {
    return this._props.description;
  }

  public borrowOne(): void {
    if (this._props.copiesAvailable <= 0) {
      throw new Error(`No available copies of "${this._props.title}" to borrow.`);
    }
    this._props.copiesAvailable -= 1;
    this.touch();
  }

  public returnOne(): void {
    if (this._props.copiesAvailable < this._props.copiesTotal) {
      this._props.copiesAvailable += 1;
      this.touch();
    }
  }

  public updateCopies(total: number, available?: number): void {
    this._props.copiesTotal = Math.max(0, total);
    if (available !== undefined) {
      this._props.copiesAvailable = Math.min(this._props.copiesTotal, Math.max(0, available));
    } else if (this._props.copiesAvailable > this._props.copiesTotal) {
      this._props.copiesAvailable = this._props.copiesTotal;
    }
    this.touch();
  }

  public updateDetails(updates: Partial<Omit<BookProps, 'schoolId'>>): void {
    if (updates.title !== undefined) this._props.title = updates.title;
    if (updates.author !== undefined) this._props.author = updates.author;
    if (updates.isbn !== undefined) this._props.isbn = updates.isbn;
    if (updates.category !== undefined) this._props.category = updates.category;
    if (updates.publisher !== undefined) this._props.publisher = updates.publisher;
    if (updates.publicationYear !== undefined) this._props.publicationYear = updates.publicationYear;
    if (updates.shelfLocation !== undefined) this._props.shelfLocation = updates.shelfLocation;
    if (updates.condition !== undefined) this._props.condition = updates.condition;
    if (updates.gradeLevel !== undefined) this._props.gradeLevel = updates.gradeLevel;
    if (updates.coverImageUrl !== undefined) this._props.coverImageUrl = updates.coverImageUrl;
    if (updates.description !== undefined) this._props.description = updates.description;
    if (updates.copiesTotal !== undefined) {
      this.updateCopies(updates.copiesTotal, updates.copiesAvailable);
    } else if (updates.copiesAvailable !== undefined) {
      this._props.copiesAvailable = Math.min(this._props.copiesTotal, Math.max(0, updates.copiesAvailable));
    }
    this.touch();
  }

  public toJSON(): BookProps & { id: string; createdAt: Date; updatedAt: Date } {
    return {
      id: this.id,
      schoolId: this.schoolId,
      title: this.title,
      author: this.author,
      isbn: this.isbn,
      category: this.category,
      publisher: this.publisher,
      publicationYear: this.publicationYear,
      copiesTotal: this.copiesTotal,
      copiesAvailable: this.copiesAvailable,
      shelfLocation: this.shelfLocation,
      condition: this.condition,
      gradeLevel: this.gradeLevel,
      coverImageUrl: this.coverImageUrl,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
