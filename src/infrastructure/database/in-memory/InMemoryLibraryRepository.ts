import { Book } from '../../../core/domain/library/Book';
import { BookLoan } from '../../../core/domain/library/BookLoan';
import {
  ILibraryRepository,
  BookFilterCriteria,
  BookLoanFilterCriteria,
  LibraryStats
} from '../../../core/ports/repositories/ILibraryRepository';

export class InMemoryLibraryRepository implements ILibraryRepository {
  private books: Map<string, Book> = new Map();
  private loans: Map<string, BookLoan> = new Map();

  // --- Books ---

  async createBook(book: Book): Promise<Book> {
    this.books.set(book.id, book);
    return book;
  }

  async findBookById(id: string): Promise<Book | null> {
    return this.books.get(id) || null;
  }

  async findBooks(criteria?: BookFilterCriteria): Promise<Book[]> {
    let result = Array.from(this.books.values());

    if (criteria?.schoolId) {
      result = result.filter(b => b.schoolId === criteria.schoolId);
    }
    if (criteria?.category) {
      result = result.filter(b => b.category.toUpperCase() === criteria.category!.toUpperCase());
    }
    if (criteria?.gradeLevel) {
      result = result.filter(b => b.gradeLevel?.toUpperCase() === criteria.gradeLevel!.toUpperCase());
    }
    if (criteria?.condition) {
      result = result.filter(b => b.condition.toUpperCase() === criteria.condition!.toUpperCase());
    }
    if (criteria?.availableOnly) {
      result = result.filter(b => b.copiesAvailable > 0);
    }
    if (criteria?.search) {
      const q = criteria.search.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        b.category.toLowerCase().includes(q) ||
        (b.shelfLocation && b.shelfLocation.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => a.title.localeCompare(b.title));

    if (criteria?.offset) {
      result = result.slice(criteria.offset);
    }
    if (criteria?.limit) {
      result = result.slice(0, criteria.limit);
    }

    return result;
  }

  async updateBook(book: Book): Promise<Book> {
    if (!this.books.has(book.id)) {
      throw new Error(`Book ${book.id} not found for update`);
    }
    this.books.set(book.id, book);
    return book;
  }

  async deleteBook(id: string): Promise<boolean> {
    return this.books.delete(id);
  }

  // --- Loans ---

  async createLoan(loan: BookLoan): Promise<BookLoan> {
    this.loans.set(loan.id, loan);
    return loan;
  }

  async findLoanById(id: string): Promise<BookLoan | null> {
    return this.loans.get(id) || null;
  }

  async findLoans(criteria?: BookLoanFilterCriteria): Promise<BookLoan[]> {
    let result = Array.from(this.loans.values());

    if (criteria?.schoolId) {
      result = result.filter(l => l.schoolId === criteria.schoolId);
    }
    if (criteria?.bookId) {
      result = result.filter(l => l.bookId === criteria.bookId);
    }
    if (criteria?.borrowerId) {
      result = result.filter(l => l.borrowerId === criteria.borrowerId);
    }
    if (criteria?.borrowerType) {
      result = result.filter(l => l.borrowerType.toUpperCase() === criteria.borrowerType!.toUpperCase());
    }
    if (criteria?.status) {
      result = result.filter(l => l.status.toUpperCase() === criteria.status!.toUpperCase());
    }
    if (criteria?.isOverdue) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(l => l.status === 'OVERDUE' || (l.status === 'ISSUED' && l.dueDate < today));
    }
    if (criteria?.search) {
      const q = criteria.search.toLowerCase();
      result = result.filter(l =>
        l.bookTitle.toLowerCase().includes(q) ||
        l.borrowerName.toLowerCase().includes(q) ||
        (l.borrowerAdmissionOrNumber && l.borrowerAdmissionOrNumber.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (criteria?.offset) {
      result = result.slice(criteria.offset);
    }
    if (criteria?.limit) {
      result = result.slice(0, criteria.limit);
    }

    return result;
  }

  async updateLoan(loan: BookLoan): Promise<BookLoan> {
    if (!this.loans.has(loan.id)) {
      throw new Error(`BookLoan ${loan.id} not found for update`);
    }
    this.loans.set(loan.id, loan);
    return loan;
  }

  async deleteLoan(id: string): Promise<boolean> {
    return this.loans.delete(id);
  }

  // --- Statistics ---

  async getStats(schoolId?: string): Promise<LibraryStats> {
    let books = Array.from(this.books.values());
    if (schoolId) {
      books = books.filter(b => b.schoolId === schoolId);
    }

    let loans = Array.from(this.loans.values());
    if (schoolId) {
      loans = loans.filter(l => l.schoolId === schoolId);
    }

    let totalCopies = 0;
    let availableCopies = 0;
    const categoriesCount: Record<string, number> = {};

    for (const b of books) {
      totalCopies += b.copiesTotal;
      availableCopies += b.copiesAvailable;
      categoriesCount[b.category] = (categoriesCount[b.category] || 0) + 1;
    }

    let issuedCopies = 0;
    let overdueCount = 0;
    let lostDamagedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const l of loans) {
      if (l.status === 'ISSUED') {
        issuedCopies++;
        if (l.dueDate < today) {
          overdueCount++;
        }
      } else if (l.status === 'OVERDUE') {
        issuedCopies++;
        overdueCount++;
      } else if (l.status === 'LOST' || l.status === 'DAMAGED') {
        lostDamagedCount++;
      }
    }

    return {
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueCount,
      lostDamagedCount,
      categoriesCount
    };
  }
}
