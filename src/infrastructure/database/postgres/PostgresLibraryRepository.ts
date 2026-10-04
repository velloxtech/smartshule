import { Pool } from 'pg';
import { Book, BookCondition } from '../../../core/domain/library/Book';
import { BookLoan, BorrowerType, BookLoanStatus } from '../../../core/domain/library/BookLoan';
import {
  ILibraryRepository,
  BookFilterCriteria,
  BookLoanFilterCriteria,
  LibraryStats
} from '../../../core/ports/repositories/ILibraryRepository';

function mapRowToBook(row: any): Book {
  return Book.create(
    {
      schoolId: row.school_id,
      title: row.title,
      author: row.author,
      isbn: row.isbn || undefined,
      category: row.category,
      publisher: row.publisher || undefined,
      publicationYear: row.publication_year ? parseInt(row.publication_year, 10) : undefined,
      copiesTotal: parseInt(row.copies_total, 10),
      copiesAvailable: parseInt(row.copies_available, 10),
      shelfLocation: row.shelf_location || undefined,
      condition: row.condition as BookCondition,
      gradeLevel: row.grade_level || undefined,
      coverImageUrl: row.cover_image_url || undefined,
      description: row.description || undefined
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

function mapRowToLoan(row: any): BookLoan {
  return BookLoan.create(
    {
      schoolId: row.school_id,
      bookId: row.book_id,
      bookTitle: row.book_title,
      borrowerType: row.borrower_type as BorrowerType,
      borrowerId: row.borrower_id,
      borrowerName: row.borrower_name,
      borrowerAdmissionOrNumber: row.borrower_admission_or_number || undefined,
      borrowerGradeOrClass: row.borrower_grade_or_class || undefined,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      returnDate: row.return_date || undefined,
      status: row.status as BookLoanStatus,
      fineAmount: row.fine_amount ? parseFloat(row.fine_amount) : 0,
      finePaid: Boolean(row.fine_paid),
      remarks: row.remarks || undefined,
      issuedByUserId: row.issued_by_user_id || undefined,
      receivedByUserId: row.received_by_user_id || undefined
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

export class PostgresLibraryRepository implements ILibraryRepository {
  constructor(private readonly pool: Pool) {
    this.ensureTablesExist().catch(err => {
      console.error('[PostgresLibraryRepository] Error ensuring tables exist:', err.message);
    });
  }

  private async ensureTablesExist(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(100),
        category VARCHAR(100) NOT NULL DEFAULT 'CBC Textbooks',
        publisher VARCHAR(255),
        publication_year INT,
        copies_total INT NOT NULL DEFAULT 1,
        copies_available INT NOT NULL DEFAULT 1,
        shelf_location VARCHAR(100),
        condition VARCHAR(50) NOT NULL DEFAULT 'GOOD',
        grade_level VARCHAR(50),
        cover_image_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_books_school ON books(school_id);
      CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
      CREATE INDEX IF NOT EXISTS idx_books_grade ON books(grade_level);

      CREATE TABLE IF NOT EXISTS book_loans (
        id VARCHAR(100) PRIMARY KEY,
        school_id VARCHAR(100) NOT NULL,
        book_id VARCHAR(100) NOT NULL,
        book_title VARCHAR(255) NOT NULL,
        borrower_type VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
        borrower_id VARCHAR(100) NOT NULL,
        borrower_name VARCHAR(255) NOT NULL,
        borrower_admission_or_number VARCHAR(100),
        borrower_grade_or_class VARCHAR(100),
        issue_date VARCHAR(50) NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        return_date VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'ISSUED',
        fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
        remarks TEXT,
        issued_by_user_id VARCHAR(100),
        received_by_user_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_book_loans_school ON book_loans(school_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_book ON book_loans(book_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_borrower ON book_loans(borrower_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_status ON book_loans(status);
    `;
    await this.pool.query(ddl);
  }

  // --- Books ---

  async createBook(book: Book): Promise<Book> {
    const query = `
      INSERT INTO books (
        id, school_id, title, author, isbn, category, publisher, publication_year,
        copies_total, copies_available, shelf_location, condition, grade_level,
        cover_image_url, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17
      ) RETURNING *;
    `;

    const values = [
      book.id,
      book.schoolId,
      book.title,
      book.author,
      book.isbn || null,
      book.category,
      book.publisher || null,
      book.publicationYear || null,
      book.copiesTotal,
      book.copiesAvailable,
      book.shelfLocation || null,
      book.condition,
      book.gradeLevel || null,
      book.coverImageUrl || null,
      book.description || null,
      book.createdAt,
      book.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToBook(res.rows[0]);
  }

  async findBookById(id: string): Promise<Book | null> {
    const res = await this.pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToBook(res.rows[0]);
  }

  async findBooks(criteria?: BookFilterCriteria): Promise<Book[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (criteria?.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(criteria.schoolId);
    }
    if (criteria?.category) {
      conditions.push(`UPPER(category) = UPPER($${idx++})`);
      values.push(criteria.category);
    }
    if (criteria?.gradeLevel) {
      conditions.push(`UPPER(grade_level) = UPPER($${idx++})`);
      values.push(criteria.gradeLevel);
    }
    if (criteria?.condition) {
      conditions.push(`UPPER(condition) = UPPER($${idx++})`);
      values.push(criteria.condition);
    }
    if (criteria?.availableOnly) {
      conditions.push(`copies_available > 0`);
    }
    if (criteria?.search) {
      conditions.push(`(
        title ILIKE $${idx} OR
        author ILIKE $${idx} OR
        isbn ILIKE $${idx} OR
        category ILIKE $${idx} OR
        shelf_location ILIKE $${idx}
      )`);
      values.push(`%${criteria.search}%`);
      idx++;
    }

    let sql = 'SELECT * FROM books';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY title ASC';

    if (criteria?.limit) {
      sql += ` LIMIT $${idx++}`;
      values.push(criteria.limit);
    }
    if (criteria?.offset) {
      sql += ` OFFSET $${idx++}`;
      values.push(criteria.offset);
    }

    const res = await this.pool.query(sql, values);
    return res.rows.map(mapRowToBook);
  }

  async updateBook(book: Book): Promise<Book> {
    const query = `
      UPDATE books SET
        title = $2,
        author = $3,
        isbn = $4,
        category = $5,
        publisher = $6,
        publication_year = $7,
        copies_total = $8,
        copies_available = $9,
        shelf_location = $10,
        condition = $11,
        grade_level = $12,
        cover_image_url = $13,
        description = $14,
        updated_at = $15
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      book.id,
      book.title,
      book.author,
      book.isbn || null,
      book.category,
      book.publisher || null,
      book.publicationYear || null,
      book.copiesTotal,
      book.copiesAvailable,
      book.shelfLocation || null,
      book.condition,
      book.gradeLevel || null,
      book.coverImageUrl || null,
      book.description || null,
      book.updatedAt
    ];

    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) {
      throw new Error(`Book ${book.id} not found for update`);
    }
    return mapRowToBook(res.rows[0]);
  }

  async deleteBook(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM books WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // --- Circulation / Loans ---

  async createLoan(loan: BookLoan): Promise<BookLoan> {
    const query = `
      INSERT INTO book_loans (
        id, school_id, book_id, book_title, borrower_type, borrower_id,
        borrower_name, borrower_admission_or_number, borrower_grade_or_class,
        issue_date, due_date, return_date, status, fine_amount, fine_paid,
        remarks, issued_by_user_id, received_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      ) RETURNING *;
    `;

    const values = [
      loan.id,
      loan.schoolId,
      loan.bookId,
      loan.bookTitle,
      loan.borrowerType,
      loan.borrowerId,
      loan.borrowerName,
      loan.borrowerAdmissionOrNumber || null,
      loan.borrowerGradeOrClass || null,
      loan.issueDate,
      loan.dueDate,
      loan.returnDate || null,
      loan.status,
      loan.fineAmount,
      loan.finePaid,
      loan.remarks || null,
      loan.issuedByUserId || null,
      loan.receivedByUserId || null,
      loan.createdAt,
      loan.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToLoan(res.rows[0]);
  }

  async findLoanById(id: string): Promise<BookLoan | null> {
    const res = await this.pool.query('SELECT * FROM book_loans WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToLoan(res.rows[0]);
  }

  async findLoans(criteria?: BookLoanFilterCriteria): Promise<BookLoan[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (criteria?.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(criteria.schoolId);
    }
    if (criteria?.bookId) {
      conditions.push(`book_id = $${idx++}`);
      values.push(criteria.bookId);
    }
    if (criteria?.borrowerId) {
      conditions.push(`borrower_id = $${idx++}`);
      values.push(criteria.borrowerId);
    }
    if (criteria?.borrowerType) {
      conditions.push(`UPPER(borrower_type) = UPPER($${idx++})`);
      values.push(criteria.borrowerType);
    }
    if (criteria?.status) {
      conditions.push(`UPPER(status) = UPPER($${idx++})`);
      values.push(criteria.status);
    }
    if (criteria?.isOverdue) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push(`(status = 'OVERDUE' OR (status = 'ISSUED' AND due_date < '${today}'))`);
    }
    if (criteria?.search) {
      conditions.push(`(
        book_title ILIKE $${idx} OR
        borrower_name ILIKE $${idx} OR
        borrower_admission_or_number ILIKE $${idx}
      )`);
      values.push(`%${criteria.search}%`);
      idx++;
    }

    let sql = 'SELECT * FROM book_loans';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    if (criteria?.limit) {
      sql += ` LIMIT $${idx++}`;
      values.push(criteria.limit);
    }
    if (criteria?.offset) {
      sql += ` OFFSET $${idx++}`;
      values.push(criteria.offset);
    }

    const res = await this.pool.query(sql, values);
    return res.rows.map(mapRowToLoan);
  }

  async updateLoan(loan: BookLoan): Promise<BookLoan> {
    const query = `
      UPDATE book_loans SET
        return_date = $2,
        status = $3,
        fine_amount = $4,
        fine_paid = $5,
        remarks = $6,
        received_by_user_id = $7,
        updated_at = $8
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      loan.id,
      loan.returnDate || null,
      loan.status,
      loan.fineAmount,
      loan.finePaid,
      loan.remarks || null,
      loan.receivedByUserId || null,
      loan.updatedAt
    ];

    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) {
      throw new Error(`BookLoan ${loan.id} not found for update`);
    }
    return mapRowToLoan(res.rows[0]);
  }

  async deleteLoan(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM book_loans WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // --- Statistics ---

  async getStats(schoolId?: string): Promise<LibraryStats> {
    let bookSql = 'SELECT copies_total, copies_available, category FROM books';
    const bookValues: any[] = [];
    if (schoolId) {
      bookSql += ' WHERE school_id = $1';
      bookValues.push(schoolId);
    }
    const bookRes = await this.pool.query(bookSql, bookValues);

    let totalCopies = 0;
    let availableCopies = 0;
    const categoriesCount: Record<string, number> = {};

    for (const row of bookRes.rows) {
      const tot = parseInt(row.copies_total, 10) || 0;
      const avail = parseInt(row.copies_available, 10) || 0;
      totalCopies += tot;
      availableCopies += avail;
      const cat = row.category || 'General';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    }

    let loanSql = 'SELECT status, due_date FROM book_loans';
    const loanValues: any[] = [];
    if (schoolId) {
      loanSql += ' WHERE school_id = $1';
      loanValues.push(schoolId);
    }
    const loanRes = await this.pool.query(loanSql, loanValues);

    let issuedCopies = 0;
    let overdueCount = 0;
    let lostDamagedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const row of loanRes.rows) {
      const status = (row.status || '').toUpperCase();
      if (status === 'ISSUED') {
        issuedCopies++;
        if (row.due_date && row.due_date < today) {
          overdueCount++;
        }
      } else if (status === 'OVERDUE') {
        issuedCopies++;
        overdueCount++;
      } else if (status === 'LOST' || status === 'DAMAGED') {
        lostDamagedCount++;
      }
    }

    return {
      totalTitles: bookRes.rows.length,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueCount,
      lostDamagedCount,
      categoriesCount
    };
  }
}
