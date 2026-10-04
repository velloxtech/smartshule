import { Book } from '../../domain/library/Book';
import { BookLoan } from '../../domain/library/BookLoan';

export interface BookFilterCriteria {
  schoolId?: string;
  category?: string;
  gradeLevel?: string;
  condition?: string;
  availableOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BookLoanFilterCriteria {
  schoolId?: string;
  bookId?: string;
  borrowerId?: string;
  borrowerType?: string;
  status?: string;
  search?: string;
  isOverdue?: boolean;
  limit?: number;
  offset?: number;
}

export interface LibraryStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCount: number;
  lostDamagedCount: number;
  categoriesCount: Record<string, number>;
}

export interface ILibraryRepository {
  // Books Catalog
  createBook(book: Book): Promise<Book>;
  findBookById(id: string): Promise<Book | null>;
  findBooks(criteria?: BookFilterCriteria): Promise<Book[]>;
  updateBook(book: Book): Promise<Book>;
  deleteBook(id: string): Promise<boolean>;

  // Circulation / Loans
  createLoan(loan: BookLoan): Promise<BookLoan>;
  findLoanById(id: string): Promise<BookLoan | null>;
  findLoans(criteria?: BookLoanFilterCriteria): Promise<BookLoan[]>;
  updateLoan(loan: BookLoan): Promise<BookLoan>;
  deleteLoan(id: string): Promise<boolean>;

  // Analytics & Stats
  getStats(schoolId?: string): Promise<LibraryStats>;
}
