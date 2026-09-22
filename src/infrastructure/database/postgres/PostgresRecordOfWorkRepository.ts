import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { IRecordOfWorkRepository } from '../../../core/ports/repositories/IRecordOfWorkRepository';
import { RecordOfWork } from '../../../core/domain/curriculum-plan/RecordOfWork';

type RecordInput = Partial<RecordOfWork> & { term?: string };

function mapRow(r: any): RecordOfWork {
  return new RecordOfWork(
    r.id,
    r.teacher_id,
    Number(r.week),
    r.day,
    r.subject_and_grade,
    r.strand_and_work_covered,
    r.reference,
    r.academic_year_id || undefined,
    r.term_id || undefined,
    r.period || undefined,
    r.comments || undefined,
    r.created_at,
    r.updated_at
  );
}

export class PostgresRecordOfWorkRepository implements IRecordOfWorkRepository {
  constructor(private pool: Pool) {}

  async create(record: RecordInput): Promise<RecordOfWork> {
    const id = randomUUID();
    const now = new Date();
    const termId = record.termId || record.term || null;
    await this.pool.query(
      `INSERT INTO records_of_work (
         id, teacher_id, academic_year_id, term_id, week, day, period,
         subject_and_grade, strand_and_work_covered, reference, comments,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id,
        record.teacherId!,
        record.academicYearId || null,
        termId,
        record.week!,
        record.day!,
        record.period || null,
        record.subjectAndGrade!,
        record.strandAndWorkCovered!,
        record.reference!,
        record.comments || null,
        now,
        now,
      ]
    );
    return mapRow({
      id,
      teacher_id: record.teacherId,
      week: record.week,
      day: record.day,
      subject_and_grade: record.subjectAndGrade,
      strand_and_work_covered: record.strandAndWorkCovered,
      reference: record.reference,
      academic_year_id: record.academicYearId,
      term_id: termId,
      period: record.period,
      comments: record.comments,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, record: RecordInput): Promise<RecordOfWork | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const termId = record.termId ?? record.term ?? existing.termId ?? null;
    const week = record.week ?? existing.week;
    const day = record.day ?? existing.day;
    const subjectAndGrade = record.subjectAndGrade ?? existing.subjectAndGrade;
    const strandAndWorkCovered = record.strandAndWorkCovered ?? existing.strandAndWorkCovered;
    const reference = record.reference ?? existing.reference;
    const academicYearId = record.academicYearId ?? existing.academicYearId ?? null;
    const period = record.period ?? existing.period ?? null;
    const comments = record.comments ?? existing.comments ?? null;
    await this.pool.query(
      `UPDATE records_of_work SET
         academic_year_id = $2, term_id = $3, week = $4, day = $5, period = $6,
         subject_and_grade = $7, strand_and_work_covered = $8, reference = $9,
         comments = $10, updated_at = NOW()
       WHERE id = $1`,
      [id, academicYearId, termId, week, day, period, subjectAndGrade, strandAndWorkCovered, reference, comments]
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
      'SELECT * FROM records_of_work WHERE teacher_id = $1 ORDER BY week ASC, created_at DESC',
      [teacherId]
    );
    return res.rows.map(mapRow);
  }

  async findAll(): Promise<RecordOfWork[]> {
    const res = await this.pool.query(
      'SELECT * FROM records_of_work ORDER BY week ASC, created_at DESC'
    );
    return res.rows.map(mapRow);
  }
}

/** Fallback when postgres bundle is unavailable (in-memory / mongo). */
export class InMemoryRecordOfWorkRepository implements IRecordOfWorkRepository {
  private records: RecordOfWork[] = [];

  async create(record: RecordInput): Promise<RecordOfWork> {
    const now = new Date();
    const created = new RecordOfWork(
      randomUUID(),
      record.teacherId!,
      record.week!,
      record.day!,
      record.subjectAndGrade!,
      record.strandAndWorkCovered!,
      record.reference!,
      record.academicYearId,
      record.termId || record.term,
      record.period,
      record.comments,
      now,
      now
    );
    this.records.push(created);
    return created;
  }

  async update(id: string, record: RecordInput): Promise<RecordOfWork | null> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const prev = this.records[idx];
    const updated = new RecordOfWork(
      prev.id,
      prev.teacherId,
      record.week ?? prev.week,
      record.day ?? prev.day,
      record.subjectAndGrade ?? prev.subjectAndGrade,
      record.strandAndWorkCovered ?? prev.strandAndWorkCovered,
      record.reference ?? prev.reference,
      record.academicYearId ?? prev.academicYearId,
      record.termId ?? record.term ?? prev.termId,
      record.period ?? prev.period,
      record.comments ?? prev.comments,
      prev.createdAt,
      new Date()
    );
    this.records[idx] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.id !== id);
    return this.records.length < before;
  }

  async findById(id: string): Promise<RecordOfWork | null> {
    return this.records.find((r) => r.id === id) || null;
  }

  async findByTeacherId(teacherId: string): Promise<RecordOfWork[]> {
    return this.records.filter((r) => r.teacherId === teacherId);
  }

  async findAll(): Promise<RecordOfWork[]> {
    return [...this.records];
  }
}
