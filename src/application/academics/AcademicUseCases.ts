import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { School, SchoolProps } from '../../core/domain/academic/School';
import { AcademicYear, AcademicTerm } from '../../core/domain/academic/AcademicYear';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../core/domain/academic/ClassRoom';
import { CbcGradeLevel } from '../../core/domain/user/Student';
import { IdGenerator, NotFoundError } from '../../core/domain/shared/Errors';

export class AcademicUseCases {
  constructor(private readonly academicRepository: IAcademicRepository) {}

  // School
  public async setupSchool(props: SchoolProps, schoolId?: string) {
    const id = schoolId || IdGenerator.generate();
    const school = School.create(props, id);
    await this.academicRepository.saveSchool(school);
    return school.toJSON();
  }

  public async getSchool(id?: string) {
    let school = await this.academicRepository.getSchool(id);
    if (!school) {
      school = School.create(
        {
          name: 'SmartShule CBC Academy',
          code: 'SCH-001',
          centerCode: 'KNEC-08291',
          motto: 'Excellence in CBC Learning',
          email: 'admin@smartshule.ac.ke',
          phone: '+254700112233',
          address: 'Waiyaki Way, Westlands, Nairobi',
          logoUrl: '/logo.png',
          currency: 'KES'
        },
        id || 'school-001'
      );
      await this.academicRepository.saveSchool(school);
    }
    return school.toJSON();
  }

  // Academic Year
  public async createAcademicYear(dto: { name: string; startDate: string; endDate: string; isCurrent: boolean; schoolId: string }) {
    if (dto.isCurrent) {
      const existingYears = await this.academicRepository.findAllYears(dto.schoolId);
      for (const y of existingYears) {
        if (y.isCurrent) {
          y.setCurrent(false);
          await this.academicRepository.updateYear(y);
        }
      }
    }

    const year = AcademicYear.create(dto, IdGenerator.generate());
    await this.academicRepository.saveYear(year);
    return year.toJSON();
  }

  public async listAcademicYears(schoolId?: string) {
    const years = await this.academicRepository.findAllYears(schoolId);
    return years.map(y => y.toJSON());
  }

  // Academic Term
  public async createAcademicTerm(dto: { academicYearId: string; termNumber: number; name: string; startDate: string; endDate: string; isCurrent: boolean }) {
    if (dto.isCurrent) {
      const existingTerms = await this.academicRepository.findTermsByYear(dto.academicYearId);
      for (const t of existingTerms) {
        if (t.isCurrent) {
          t.setCurrent(false);
          await this.academicRepository.updateTerm(t);
        }
      }
    }

    const term = AcademicTerm.create(dto, IdGenerator.generate());
    await this.academicRepository.saveTerm(term);
    return term.toJSON();
  }

  public async listTermsByYear(yearId: string) {
    const terms = await this.academicRepository.findTermsByYear(yearId);
    return terms.map(t => t.toJSON());
  }

  public async getCurrentAcademicContext(schoolId?: string) {
    const currentYear = await this.academicRepository.findCurrentYear(schoolId);
    const currentTerm = currentYear ? await this.academicRepository.findCurrentTerm(currentYear.id) : null;
    return {
      currentYear: currentYear ? currentYear.toJSON() : null,
      currentTerm: currentTerm ? currentTerm.toJSON() : null
    };
  }

  // Classrooms & Streams
  public async createClassRoom(dto: { name: string; gradeLevel: CbcGradeLevel; educationLevel: EducationLevel; schoolId: string }) {
    const classRoom = ClassRoom.create(dto, IdGenerator.generate());
    await this.academicRepository.saveClass(classRoom);
    return classRoom.toJSON();
  }

  public async listClassRooms(schoolId?: string) {
    const classes = await this.academicRepository.findAllClasses(schoolId);
    return classes.map(c => c.toJSON());
  }

  public async createStream(dto: { classRoomId: string; name: string; capacity: number; classTeacherId?: string }) {
    const stream = Stream.create(dto, IdGenerator.generate());
    await this.academicRepository.saveStream(stream);
    return stream.toJSON();
  }

  public async listStreamsByClass(classRoomId: string) {
    const streams = await this.academicRepository.findStreamsByClass(classRoomId);
    return streams.map(s => s.toJSON());
  }

  // Learning Areas (Subjects)
  public async createLearningArea(dto: { name: string; code: string; gradeLevel: CbcGradeLevel; educationLevel: EducationLevel; isElective: boolean; schoolId: string }) {
    const learningArea = LearningArea.create(dto, IdGenerator.generate());
    await this.academicRepository.saveLearningArea(learningArea);
    return learningArea.toJSON();
  }

  public async listLearningAreas(filters?: { gradeLevel?: CbcGradeLevel; schoolId?: string }) {
    const areas = await this.academicRepository.findAllLearningAreas(filters);
    return areas.map(a => a.toJSON());
  }

  public async deleteClass(id: string): Promise<void> {
    await this.academicRepository.deleteClass(id);
  }

  public async deleteStream(id: string): Promise<void> {
    await this.academicRepository.deleteStream(id);
  }

  public async deleteLearningArea(id: string): Promise<void> {
    await this.academicRepository.deleteLearningArea(id);
  }
}
