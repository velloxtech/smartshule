import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LibraryUseCases } from '../../../application/library/LibraryUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';
import { UserRole } from '../../../core/domain/user/User';

export const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  isbn: z.string().optional(),
  category: z.string().optional(),
  publisher: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
  copiesTotal: z.coerce.number().min(0).default(1),
  copiesAvailable: z.coerce.number().min(0).optional(),
  shelfLocation: z.string().optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  gradeLevel: z.string().optional(),
  coverImageUrl: z.string().optional(),
  description: z.string().optional(),
  schoolId: z.string().optional()
});

export const UpdateBookSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  author: z.string().min(1).max(255).optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  publisher: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
  copiesTotal: z.coerce.number().min(0).optional(),
  copiesAvailable: z.coerce.number().min(0).optional(),
  shelfLocation: z.string().optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  gradeLevel: z.string().optional(),
  coverImageUrl: z.string().optional(),
  description: z.string().optional()
});

export const IssueBookSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  borrowerType: z.enum(['STUDENT', 'TEACHER', 'STAFF']),
  borrowerId: z.string().min(1, 'Borrower ID is required'),
  borrowerName: z.string().min(1, 'Borrower Name is required'),
  borrowerAdmissionOrNumber: z.string().optional(),
  borrowerGradeOrClass: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  remarks: z.string().optional(),
  schoolId: z.string().optional()
});

export const ReturnBookSchema = z.object({
  returnDate: z.string().optional(),
  fineAmount: z.coerce.number().min(0).optional(),
  finePaid: z.boolean().optional(),
  remarks: z.string().optional()
});

export const UpdateLoanStatusSchema = z.object({
  status: z.enum(['ISSUED', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED']),
  fineAmount: z.coerce.number().min(0).optional(),
  finePaid: z.boolean().optional(),
  remarks: z.string().optional()
});

export class LibraryController {
  constructor(
    private readonly useCases: LibraryUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  // ==========================================
  // BOOKS
  // ==========================================

  public createBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }
      const book = await this.useCases.addBook({
        ...req.body,
        schoolId
      });

      this.systemLogUseCases?.log({
        schoolId,
        level: 'INFO',
        category: 'SYSTEM',
        action: 'LIBRARY_BOOK_CREATED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Added new library book: "${book.title}" by ${book.author} (${book.copiesTotal} copies)`,
        metadata: { bookId: book.id, title: book.title, copiesTotal: book.copiesTotal }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Book added to library successfully',
        data: book.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public listBooks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        schoolId,
        category,
        gradeLevel,
        condition,
        availableOnly,
        search,
        limit,
        offset
      } = req.query;

      const effectiveSchoolId = (schoolId as string) || req.user?.schoolId || undefined;

      const books = await this.useCases.getBooks({
        schoolId: effectiveSchoolId,
        category: category as string,
        gradeLevel: gradeLevel as string,
        condition: condition as string,
        availableOnly: availableOnly === 'true' || availableOnly === '1',
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined
      });

      return res.status(200).json({
        success: true,
        count: books.length,
        data: books.map(b => b.toJSON())
      });
    } catch (err) {
      next(err);
    }
  };

  public getBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const book = await this.useCases.getBookById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: book.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public updateBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const book = await this.useCases.updateBook(req.params.id as string, req.body);

      this.systemLogUseCases?.log({
        schoolId: book.schoolId,
        level: 'INFO',
        category: 'SYSTEM',
        action: 'LIBRARY_BOOK_UPDATED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Updated library book: "${book.title}"`,
        metadata: { bookId: book.id, title: book.title }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Book updated successfully',
        data: book.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const success = await this.useCases.deleteBook(req.params.id as string);
      return res.status(200).json({
        success,
        message: 'Book removed from catalogue successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // CIRCULATION / LOANS
  // ==========================================

  public issueBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId;
      const issuerUserId = req.user?.userId;

      const loan = await this.useCases.issueBook(
        {
          ...req.body,
          schoolId
        },
        issuerUserId
      );

      this.systemLogUseCases?.log({
        schoolId: loan.schoolId,
        level: 'INFO',
        category: 'SYSTEM',
        action: 'LIBRARY_BOOK_ISSUED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Book "${loan.bookTitle}" issued to ${loan.borrowerType} ${loan.borrowerName} (Due: ${loan.dueDate})`,
        metadata: { loanId: loan.id, bookId: loan.bookId, borrowerId: loan.borrowerId, dueDate: loan.dueDate }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Book issued successfully',
        data: loan.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public listLoans = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        schoolId,
        bookId,
        borrowerId,
        borrowerType,
        status,
        search,
        isOverdue,
        limit,
        offset
      } = req.query;

      const effectiveSchoolId = (schoolId as string) || req.user?.schoolId || undefined;

      const loans = await this.useCases.getLoans(
        {
          schoolId: effectiveSchoolId,
          bookId: bookId as string,
          borrowerId: borrowerId as string,
          borrowerType: borrowerType as string,
          status: status as string,
          search: search as string,
          isOverdue: isOverdue === 'true' || isOverdue === '1',
          limit: limit ? parseInt(limit as string, 10) : undefined,
          offset: offset ? parseInt(offset as string, 10) : undefined
        },
        req.user
      );

      return res.status(200).json({
        success: true,
        count: loans.length,
        data: loans.map(l => l.toJSON())
      });
    } catch (err) {
      next(err);
    }
  };

  public getLoan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const loan = await this.useCases.getLoanById(req.params.id as string, req.user);
      return res.status(200).json({
        success: true,
        data: loan.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public returnBook = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const receivedByUserId = req.user?.userId;
      const loan = await this.useCases.returnBook(req.params.id as string, req.body, receivedByUserId);

      this.systemLogUseCases?.log({
        schoolId: loan.schoolId,
        level: 'INFO',
        category: 'SYSTEM',
        action: 'LIBRARY_BOOK_RETURNED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Book "${loan.bookTitle}" returned by ${loan.borrowerName}`,
        metadata: { loanId: loan.id, bookId: loan.bookId, borrowerId: loan.borrowerId }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        data: loan.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public updateLoanStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const loan = await this.useCases.updateLoanStatus(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'Loan status updated successfully',
        data: loan.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteLoan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const success = await this.useCases.deleteLoan(req.params.id as string);
      return res.status(200).json({
        success,
        message: 'Loan record deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Library inventory and loan statistics are restricted to staff.'
        });
      }

      const schoolId = (req.query.schoolId as string) || req.user?.schoolId || undefined;
      const stats = await this.useCases.getStats(schoolId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
