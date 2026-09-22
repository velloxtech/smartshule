export class RecordOfWork {
    constructor(
      public id: string,
      public teacherId: string,
      public week: number,
      public day: string,
      public subjectAndGrade: string,
      public strandAndWorkCovered: string,
      public reference: string,
      public academicYearId?: string,
      public termId?: string,
      public period?: string,
      public comments?: string,
      public createdAt?: Date,
      public updatedAt?: Date
    ) {}
  }