import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import {
  IRecordOfWorkRepository,
  RecordOfWorkFilterCriteria
} from '../../../core/ports/repositories/IRecordOfWorkRepository';
import {
  RecordOfWork,
  RecordOfWorkProps
} from '../../../core/domain/curriculum-plan/RecordOfWork';

function mapRow(r: any): RecordOfWork {
  const extraProps: Partial<RecordOfWorkProps> = {
    schoolId: r.school_id || 'school-001',
    teacherName: r.teacher_name,
    academicYear: r.academic_year,
    term: r.term,
    classRoomId: r.classroom_id,
    className: r.class_name,
    streamId: r.stream_id,
    streamName: r.stream_name,
    learningAreaId: r.learning_area_id,
    subjectName: r.subject_name,
    strandId: r.strand_id,
    strand: r.strand,
    subStrandId: r.sub_strand_id,
    subStrand: r.sub_strand,
    weekNumber: r.week_number ? Number(r.week_number) : Number(r.week),
    lessonPeriod: r.lesson_period || r.period,
    lessonDate: r.lesson_date ? (r.lesson_date instanceof Date ? r.lesson_date.toISOString().split('T')[0] : String(r.lesson_date).split('T')[0]) : undefined,
    lessonTopic: r.lesson_topic,
    learningObjectives: r.learning_objectives,
    learningActivities: r.learning_activities,
    resources: r.resources,
    status: r.status || 'DRAFT',
    reflectionData: r.reflection_data ? (typeof r.reflection_data === 'string' ? JSON.parse(r.reflection_data) : r.reflection_data) : undefined,
    submittedAt: r.submitted_at ? new Date(r.submitted_at) : undefined,
    reviewedByUserId: r.reviewed_by_user_id,
    reviewedByName: r.reviewed_by_name,
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : undefined,
    reviewRemarks: r.review_remarks,
    returnReason: r.return_reason,
    trackerId: r.tracker_id,
    isOfficialCoverage: Boolean(r.is_official_coverage)
  };

  return new RecordOfWork(
    r.id,
    r.teacher_id,
    Number(r.week_number || r.week || 1),
    r.day || 'Mon',
    r.subject_and_grade,
    r.strand_and_work_covered,
    r.reference || 'KICD Approved Curriculum',
    r.academic_year_id || undefined,
    r.term_id || undefined,
    r.period || undefined,
    r.comments || undefined,
    r.reflection || undefined,
    r.created_at ? new Date(r.created_at) : undefined,
    r.updated_at ? new Date(r.updated_at) : undefined,
    extraProps
  );
}

export class PostgresRecordOfWorkRepository implements IRecordOfWorkRepository {
  constructor(private pool: Pool) {}

  async create(record: RecordOfWork | Partial<RecordOfWorkProps> | any): Promise<RecordOfWork> {
    const id = record.id || randomUUID();
    const now = new Date();
    const r = typeof record.toJSON === 'function' ? record.toJSON() : record;

    const schoolId = r.schoolId || 'school-001';
    const teacherId = r.teacherId;
    const teacherName = r.teacherName || null;
    const academicYearId = r.academicYearId || null;
    const academicYear = r.academicYear || null;
    const termId = r.termId || r.term || null;
    const term = r.term || null;
    const classRoomId = r.classRoomId || null;
    const className = r.className || null;
    const streamId = r.streamId || null;
    const streamName = r.streamName || null;
    const learningAreaId = r.learningAreaId || null;
    const subjectName = r.subjectName || null;
    const strandId = r.strandId || null;
    const strand = r.strand || null;
    const subStrandId = r.subStrandId || null;
    const subStrand = r.subStrand || null;
    const weekNumber = Number(r.weekNumber || r.week || 1);
    const day = r.day || 'Mon';
    const period = r.period || r.lessonPeriod || null;
    const lessonPeriod = r.lessonPeriod || r.period || null;
    const lessonDate = r.lessonDate ? new Date(r.lessonDate) : null;
    const subjectAndGrade = r.subjectAndGrade || `${className || 'Class'} ${subjectName || 'Subject'}`;
    const strandAndWorkCovered = r.strandAndWorkCovered || (strand && subStrand ? `${strand} > ${subStrand}` : strand || 'Curriculum delivery');
    const lessonTopic = r.lessonTopic || null;
    const learningObjectives = r.learningObjectives || null;
    const learningActivities = r.learningActivities || null;
    const resources = r.resources || null;
    const reference = r.reference || 'KICD Approved Textbooks';
    const status = r.status || 'DRAFT';
    const reflectionData = r.reflectionData ? JSON.stringify(r.reflectionData) : '{}';
    const comments = r.comments || null;
    const reflection = r.reflection || null;
    const submittedAt = r.submittedAt ? new Date(r.submittedAt) : (status === 'SUBMITTED' ? now : null);
    const reviewedByUserId = r.reviewedByUserId || null;
    const reviewedByName = r.reviewedByName || null;
    const reviewedAt = r.reviewedAt ? new Date(r.reviewedAt) : null;
    const reviewRemarks = r.reviewRemarks || null;
    const returnReason = r.returnReason || null;
    const trackerId = r.trackerId || null;
    const isOfficialCoverage = Boolean(r.isOfficialCoverage);

    await this.pool.query(
      `INSERT INTO records_of_work (
         id, school_id, teacher_id, teacher_name, academic_year_id, academic_year,
         term_id, term, classroom_id, class_name, stream_id, stream_name,
         learning_area_id, subject_name, strand_id, strand, sub_strand_id, sub_strand,
         week, week_number, day, period, lesson_period, lesson_date,
         subject_and_grade, strand_and_work_covered, lesson_topic, learning_objectives,
         learning_activities, resources, reference, status, reflection_data,
         comments, reflection, submitted_at, reviewed_by_user_id, reviewed_by_name,
         reviewed_at, review_remarks, return_reason, tracker_id, is_official_coverage,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
         $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
       )`,
      [
        id, schoolId, teacherId, teacherName, academicYearId, academicYear,
        termId, term, classRoomId, className, streamId, streamName,
        learningAreaId, subjectName, strandId, strand, subStrandId, subStrand,
        weekNumber, weekNumber, day, period, lessonPeriod, lessonDate,
        subjectAndGrade, strandAndWorkCovered, lessonTopic, learningObjectives,
        learningActivities, resources, reference, status, reflectionData,
        comments, reflection, submittedAt, reviewedByUserId, reviewedByName,
        reviewedAt, reviewRemarks, returnReason, trackerId, isOfficialCoverage,
        now, now
      ]
    );

    const saved = await this.findById(id);
    return saved!;
  }

  async update(id: string, record: RecordOfWork | Partial<RecordOfWorkProps> | any): Promise<RecordOfWork | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const r = typeof record.toJSON === 'function' ? record.toJSON() : record;
    const now = new Date();

    const teacherName = r.teacherName !== undefined ? r.teacherName : existing.teacherName;
    const academicYearId = r.academicYearId !== undefined ? r.academicYearId : existing.academicYearId;
    const academicYear = r.academicYear !== undefined ? r.academicYear : existing.academicYear;
    const termId = r.termId !== undefined ? r.termId : (r.term !== undefined ? r.term : existing.termId);
    const term = r.term !== undefined ? r.term : existing.term;
    const classRoomId = r.classRoomId !== undefined ? r.classRoomId : existing.classRoomId;
    const className = r.className !== undefined ? r.className : existing.className;
    const streamId = r.streamId !== undefined ? r.streamId : existing.streamId;
    const streamName = r.streamName !== undefined ? r.streamName : existing.streamName;
    const learningAreaId = r.learningAreaId !== undefined ? r.learningAreaId : existing.learningAreaId;
    const subjectName = r.subjectName !== undefined ? r.subjectName : existing.subjectName;
    const strandId = r.strandId !== undefined ? r.strandId : existing.strandId;
    const strand = r.strand !== undefined ? r.strand : existing.strand;
    const subStrandId = r.subStrandId !== undefined ? r.subStrandId : existing.subStrandId;
    const subStrand = r.subStrand !== undefined ? r.subStrand : existing.subStrand;
    const weekNumber = Number(r.weekNumber || r.week || existing.weekNumber || 1);
    const day = r.day !== undefined ? r.day : existing.day;
    const period = r.period !== undefined ? r.period : existing.period;
    const lessonPeriod = r.lessonPeriod !== undefined ? r.lessonPeriod : (r.period !== undefined ? r.period : existing.period);
    const lessonDate = r.lessonDate ? new Date(r.lessonDate) : (existing.lessonDate ? new Date(existing.lessonDate) : null);
    const subjectAndGrade = r.subjectAndGrade !== undefined ? r.subjectAndGrade : existing.subjectAndGrade;
    const strandAndWorkCovered = r.strandAndWorkCovered !== undefined ? r.strandAndWorkCovered : existing.strandAndWorkCovered;
    const lessonTopic = r.lessonTopic !== undefined ? r.lessonTopic : existing.lessonTopic;
    const learningObjectives = r.learningObjectives !== undefined ? r.learningObjectives : existing.learningObjectives;
    const learningActivities = r.learningActivities !== undefined ? r.learningActivities : existing.learningActivities;
    const resources = r.resources !== undefined ? r.resources : existing.resources;
    const reference = r.reference !== undefined ? r.reference : existing.reference;
    const status = r.status !== undefined ? r.status : existing.status;
    const reflectionData = r.reflectionData !== undefined ? JSON.stringify(r.reflectionData) : (existing.reflectionData ? JSON.stringify(existing.reflectionData) : '{}');
    const comments = r.comments !== undefined ? r.comments : existing.comments;
    const reflection = r.reflection !== undefined ? r.reflection : existing.reflection;
    const submittedAt = r.submittedAt !== undefined ? (r.submittedAt ? new Date(r.submittedAt) : null) : (existing.submittedAt || null);
    const reviewedByUserId = r.reviewedByUserId !== undefined ? r.reviewedByUserId : (existing.reviewedByUserId || null);
    const reviewedByName = r.reviewedByName !== undefined ? r.reviewedByName : (existing.reviewedByName || null);
    const reviewedAt = r.reviewedAt !== undefined ? (r.reviewedAt ? new Date(r.reviewedAt) : null) : (existing.reviewedAt || null);
    const reviewRemarks = r.reviewRemarks !== undefined ? r.reviewRemarks : (existing.reviewRemarks || null);
    const returnReason = r.returnReason !== undefined ? r.returnReason : (existing.returnReason || null);
    const trackerId = r.trackerId !== undefined ? r.trackerId : (existing.trackerId || null);
    const isOfficialCoverage = r.isOfficialCoverage !== undefined ? Boolean(r.isOfficialCoverage) : existing.isOfficialCoverage;

    await this.pool.query(
      `UPDATE records_of_work SET
         teacher_name = $2, academic_year_id = $3, academic_year = $4,
         term_id = $5, term = $6, classroom_id = $7, class_name = $8,
         stream_id = $9, stream_name = $10, learning_area_id = $11, subject_name = $12,
         strand_id = $13, strand = $14, sub_strand_id = $15, sub_strand = $16,
         week = $17, week_number = $18, day = $19, period = $20, lesson_period = $21,
         lesson_date = $22, subject_and_grade = $23, strand_and_work_covered = $24,
         lesson_topic = $25, learning_objectives = $26, learning_activities = $27,
         resources = $28, reference = $29, status = $30, reflection_data = $31,
         comments = $32, reflection = $33, submitted_at = $34, reviewed_by_user_id = $35,
         reviewed_by_name = $36, reviewed_at = $37, review_remarks = $38,
         return_reason = $39, tracker_id = $40, is_official_coverage = $41,
         updated_at = $42
       WHERE id = $1`,
      [
        id, teacherName, academicYearId, academicYear,
        termId, term, classRoomId, className,
        streamId, streamName, learningAreaId, subjectName,
        strandId, strand, subStrandId, subStrand,
        weekNumber, weekNumber, day, period, lessonPeriod,
        lessonDate, subjectAndGrade, strandAndWorkCovered,
        lessonTopic, learningObjectives, learningActivities,
        resources, reference, status, reflectionData,
        comments, reflection, submittedAt, reviewedByUserId,
        reviewedByName, reviewedAt, reviewRemarks,
        returnReason, trackerId, isOfficialCoverage,
        now
      ]
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM records_of_work WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async findById(id: string): Promise<RecordOfWork | null> {
    const res = await this.pool.query('SELECT * FROM records_of_work WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return mapRow(res.rows[0]);
  }

  async findByTeacherId(teacherId: string): Promise<RecordOfWork[]> {
    const res = await this.pool.query(
      'SELECT * FROM records_of_work WHERE teacher_id = $1 ORDER BY week_number ASC, lesson_date DESC, created_at DESC',
      [teacherId]
    );
    return res.rows.map(mapRow);
  }

  async findAll(filters?: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]> {
    if (!filters) {
      const res = await this.pool.query(
        'SELECT * FROM records_of_work ORDER BY week_number ASC, lesson_date DESC, created_at DESC'
      );
      return res.rows.map(mapRow);
    }
    return this.find(filters);
  }

  async find(filters: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(filters.schoolId);
    }
    if (filters.teacherId) {
      conditions.push(`teacher_id = $${idx++}`);
      values.push(filters.teacherId);
    }
    if (filters.classRoomId) {
      conditions.push(`classroom_id = $${idx++}`);
      values.push(filters.classRoomId);
    }
    if (filters.learningAreaId) {
      conditions.push(`learning_area_id = $${idx++}`);
      values.push(filters.learningAreaId);
    }
    if (filters.academicYearId) {
      conditions.push(`academic_year_id = $${idx++}`);
      values.push(filters.academicYearId);
    }
    if (filters.academicYear) {
      conditions.push(`academic_year = $${idx++}`);
      values.push(filters.academicYear);
    }
    if (filters.streamId) {
      conditions.push(`stream_id = $${idx++}`);
      values.push(filters.streamId);
    }
    if (filters.termId || filters.term) {
      const termVal = filters.termId || filters.term;
      conditions.push(`(term_id = $${idx} OR term = $${idx})`);
      values.push(termVal);
      idx++;
    }
    if (filters.weekNumber) {
      conditions.push(`(week_number = $${idx} OR week = $${idx})`);
      values.push(filters.weekNumber);
      idx++;
    }
    if (filters.status && filters.status !== 'ALL') {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.startDate) {
      conditions.push(`lesson_date >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`lesson_date <= $${idx++}`);
      values.push(filters.endDate);
    }
    if (filters.search) {
      conditions.push(
        `(subject_and_grade ILIKE $${idx} OR strand_and_work_covered ILIKE $${idx} OR lesson_topic ILIKE $${idx} OR learning_objectives ILIKE $${idx} OR reference ILIKE $${idx} OR reflection ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM records_of_work ${whereClause} ORDER BY week_number ASC, lesson_date DESC, created_at DESC`;

    const res = await this.pool.query(sql, values);
    return res.rows.map(mapRow);
  }

  async findBySession(
    schoolId: string,
    classRoomId: string,
    learningAreaId: string,
    lessonDate: string,
    lessonPeriod: string
  ): Promise<RecordOfWork | null> {
    const res = await this.pool.query(
      `SELECT * FROM records_of_work 
       WHERE school_id = $1 AND classroom_id = $2 AND learning_area_id = $3 AND lesson_date = $4 AND (lesson_period = $5 OR period = $5) AND status != 'RETURNED'`,
      [schoolId, classRoomId, learningAreaId, lessonDate, lessonPeriod]
    );
    if (!res.rows.length) return null;
    return mapRow(res.rows[0]);
  }
}

/** In-memory implementation for unit testing and offline development */
export class InMemoryRecordOfWorkRepository implements IRecordOfWorkRepository {
  private records: Map<string, RecordOfWork> = new Map();

  async create(record: RecordOfWork | Partial<RecordOfWorkProps> | any): Promise<RecordOfWork> {
    const id = record.id || randomUUID();
    const now = new Date();
    const r = typeof record.toJSON === 'function' ? record.toJSON() : record;

    const extraProps: Partial<RecordOfWorkProps> = {
      schoolId: r.schoolId || 'school-001',
      teacherName: r.teacherName,
      academicYearId: r.academicYearId,
      academicYear: r.academicYear,
      termId: r.termId || r.term,
      term: r.term,
      classRoomId: r.classRoomId,
      className: r.className,
      streamId: r.streamId,
      streamName: r.streamName,
      learningAreaId: r.learningAreaId,
      subjectName: r.subjectName,
      strandId: r.strandId,
      strand: r.strand,
      subStrandId: r.subStrandId,
      subStrand: r.subStrand,
      weekNumber: Number(r.weekNumber || r.week || 1),
      lessonPeriod: r.lessonPeriod || r.period,
      lessonDate: r.lessonDate,
      lessonTopic: r.lessonTopic,
      learningObjectives: r.learningObjectives,
      learningActivities: r.learningActivities,
      resources: r.resources,
      status: r.status || 'DRAFT',
      reflectionData: r.reflectionData,
      submittedAt: r.submittedAt ? new Date(r.submittedAt) : (r.status === 'SUBMITTED' ? now : undefined),
      reviewedByUserId: r.reviewedByUserId,
      reviewedByName: r.reviewedByName,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
      reviewRemarks: r.reviewRemarks,
      returnReason: r.returnReason,
      trackerId: r.trackerId,
      isOfficialCoverage: Boolean(r.isOfficialCoverage)
    };

    const entity = new RecordOfWork(
      id,
      r.teacherId,
      Number(r.weekNumber || r.week || 1),
      r.day || 'Mon',
      r.subjectAndGrade || `${r.className || 'Class'} ${r.subjectName || 'Subject'}`,
      r.strandAndWorkCovered || (r.strand && r.subStrand ? `${r.strand} > ${r.subStrand}` : r.strand || 'Work covered'),
      r.reference || 'KICD Approved Textbooks',
      r.academicYearId,
      r.termId || r.term,
      r.period || r.lessonPeriod,
      r.comments,
      r.reflection,
      now,
      now,
      extraProps
    );

    this.records.set(id, entity);
    return entity;
  }

  async update(id: string, record: RecordOfWork | Partial<RecordOfWorkProps> | any): Promise<RecordOfWork | null> {
    const existing = this.records.get(id);
    if (!existing) return null;

    const r = typeof record.toJSON === 'function' ? record.toJSON() : record;
    const now = new Date();

    const updatedProps: RecordOfWorkProps = {
      ...existing.toJSON(),
      ...r,
      weekNumber: Number(r.weekNumber || r.week || existing.weekNumber),
      status: r.status || existing.status,
      isOfficialCoverage: r.isOfficialCoverage !== undefined ? Boolean(r.isOfficialCoverage) : existing.isOfficialCoverage
    };

    const updated = RecordOfWork.create(updatedProps, id, existing.createdAt, now);
    this.records.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async findById(id: string): Promise<RecordOfWork | null> {
    return this.records.get(id) || null;
  }

  async findByTeacherId(teacherId: string): Promise<RecordOfWork[]> {
    return Array.from(this.records.values())
      .filter(r => r.teacherId === teacherId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }

  async findAll(filters?: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]> {
    if (!filters) {
      return Array.from(this.records.values()).sort((a, b) => a.weekNumber - b.weekNumber);
    }
    return this.find(filters);
  }

  async find(filters: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]> {
    return Array.from(this.records.values())
      .filter(r => {
        if (filters.schoolId && r.schoolId !== filters.schoolId) return false;
        if (filters.teacherId && r.teacherId !== filters.teacherId) return false;
        if (filters.classRoomId && r.classRoomId !== filters.classRoomId) return false;
        if (filters.learningAreaId && r.learningAreaId !== filters.learningAreaId) return false;
        if (filters.academicYearId && r.academicYearId !== filters.academicYearId) return false;
        if (filters.academicYear && r.academicYear !== filters.academicYear) return false;
        if (filters.streamId && r.streamId !== filters.streamId) return false;
        if (filters.termId && r.termId !== filters.termId && r.term !== filters.termId) return false;
        if (filters.term && r.term !== filters.term && r.termId !== filters.term) return false;
        if (filters.weekNumber && r.weekNumber !== filters.weekNumber) return false;
        if (filters.status && filters.status !== 'ALL' && r.status !== filters.status) return false;
        if (filters.startDate && r.lessonDate && r.lessonDate < filters.startDate) return false;
        if (filters.endDate && r.lessonDate && r.lessonDate > filters.endDate) return false;
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const match =
            r.subjectAndGrade.toLowerCase().includes(s) ||
            r.strandAndWorkCovered.toLowerCase().includes(s) ||
            (r.lessonTopic && r.lessonTopic.toLowerCase().includes(s)) ||
            (r.learningObjectives && r.learningObjectives.toLowerCase().includes(s)) ||
            (r.reflection && r.reflection.toLowerCase().includes(s));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }

  async findBySession(
    schoolId: string,
    classRoomId: string,
    learningAreaId: string,
    lessonDate: string,
    lessonPeriod: string
  ): Promise<RecordOfWork | null> {
    for (const r of this.records.values()) {
      if (
        r.schoolId === schoolId &&
        r.classRoomId === classRoomId &&
        r.learningAreaId === learningAreaId &&
        r.lessonDate === lessonDate &&
        (r.period === lessonPeriod || (r as any).lessonPeriod === lessonPeriod) &&
        r.status !== 'RETURNED'
      ) {
        return r;
      }
    }
    return null;
  }
}
