import { School } from '../../domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea } from '../../domain/academic/ClassRoom';
import { CbcGradeLevel } from '../../domain/user/Student';

export interface IAcademicRepository {
  // School
  getSchool(id?: string): Promise<School | null>;
  saveSchool(school: School): Promise<void>;
  updateSchool(school: School): Promise<void>;

  // Academic Year
  findYearById(id: string): Promise<AcademicYear | null>;
  findCurrentYear(schoolId?: string): Promise<AcademicYear | null>;
  findAllYears(schoolId?: string): Promise<AcademicYear[]>;
  saveYear(year: AcademicYear): Promise<void>;
  updateYear(year: AcademicYear): Promise<void>;

  // Academic Term
  findTermById(id: string): Promise<AcademicTerm | null>;
  findCurrentTerm(yearId?: string): Promise<AcademicTerm | null>;
  findTermsByYear(yearId: string): Promise<AcademicTerm[]>;
  saveTerm(term: AcademicTerm): Promise<void>;
  updateTerm(term: AcademicTerm): Promise<void>;

  // Classrooms
  findClassById(id: string): Promise<ClassRoom | null>;
  findAllClasses(schoolId?: string): Promise<ClassRoom[]>;
  saveClass(classRoom: ClassRoom): Promise<void>;

  // Streams
  findStreamById(id: string): Promise<Stream | null>;
  findStreamsByClass(classRoomId: string): Promise<Stream[]>;
  findAllStreams(): Promise<Stream[]>;
  saveStream(stream: Stream): Promise<void>;
  updateStream(stream: Stream): Promise<void>;

  // Learning Areas
  findLearningAreaById(id: string): Promise<LearningArea | null>;
  findAllLearningAreas(filters?: { gradeLevel?: CbcGradeLevel; schoolId?: string }): Promise<LearningArea[]>;
  saveLearningArea(area: LearningArea): Promise<void>;
}
