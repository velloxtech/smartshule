import { LunchExpense, LunchExpenseCategory } from '../../src/core/domain/finance/LunchExpense';
import { LunchFeeUseCases } from '../../src/application/finance/LunchFeeUseCases';
import { InMemoryLunchFeeRepository } from '../../src/infrastructure/database/in-memory/InMemoryLunchFeeRepository';
import {
  InMemoryStudentRepository,
  InMemoryUserRepository,
  InMemoryGuardianRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { ForbiddenError, ValidationError, NotFoundError } from '../../src/core/domain/shared/Errors';
import { LunchEnrollment, LunchEnrollmentStatus } from '../../src/core/domain/finance/LunchEnrollment';

describe('Lunch Expense & Catering Fund Accountability Tests', () => {
  let lunchFeeRepo: InMemoryLunchFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let userRepo: InMemoryUserRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let lunchUseCases: LunchFeeUseCases;

  const adminContext = { userId: 'admin-001', role: UserRole.ADMIN, schoolId: 'school-001' };
  const headTeacherContext = { userId: 'ht-001', role: UserRole.HEAD_TEACHER, schoolId: 'school-001' };
  const teacherContext = { userId: 'teacher-001', role: UserRole.TEACHER, schoolId: 'school-001' };
  const parentContext = { userId: 'parent-001', role: UserRole.PARENT, schoolId: 'school-001' };

  beforeEach(async () => {
    lunchFeeRepo = new InMemoryLunchFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    userRepo = new InMemoryUserRepository();
    guardianRepo = new InMemoryGuardianRepository();

    // Seed test users
    await userRepo.save(
      User.create({
        email: 'admin@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        schoolId: 'school-001',
        status: UserStatus.ACTIVE,
        phone: '+254700000001'
      }, 'admin-001')
    );

    await userRepo.save(
      User.create({
        email: 'headteacher@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Jane',
        lastName: 'Mumo',
        role: UserRole.HEAD_TEACHER,
        schoolId: 'school-001',
        status: UserStatus.ACTIVE,
        phone: '+254700000002'
      }, 'ht-001')
    );

    lunchUseCases = new LunchFeeUseCases(lunchFeeRepo, studentRepo, userRepo, guardianRepo);
  });

  describe('1. Domain Entity: LunchExpense', () => {
    it('creates a LunchExpense entity correctly with positive amount and category', () => {
      const expense = LunchExpense.create(
        {
          schoolId: 'school-001',
          title: '3 Bags Maize and 2 Bags Beans',
          category: LunchExpenseCategory.FOOD_CEREALS,
          amount: 24500,
          expenseDate: '2026-09-28',
          paymentMethod: 'MPESA',
          paymentReference: 'RG49K201',
          vendorPayee: 'Kiprono Cereals Wholesalers',
          receiptVoucherNumber: 'VCH-0012',
          termId: 'TERM_1',
          academicYearId: '2026',
          recordedByUserId: 'admin-001',
          notes: 'Dry cereals delivery for dining hall'
        },
        'exp-001'
      );

      expect(expense.id).toBe('exp-001');
      expect(expense.title).toBe('3 Bags Maize and 2 Bags Beans');
      expect(expense.category).toBe(LunchExpenseCategory.FOOD_CEREALS);
      expect(expense.amount).toBe(24500);
      expect(expense.vendorPayee).toBe('Kiprono Cereals Wholesalers');
      expect(expense.receiptVoucherNumber).toBe('VCH-0012');
    });

    it('updates expense details and modifies timestamp', () => {
      const expense = LunchExpense.create(
        {
          schoolId: 'school-001',
          title: 'Cooking Gas Refill 50kg',
          category: LunchExpenseCategory.COOKING_FUEL,
          amount: 9500,
          expenseDate: '2026-09-28',
          paymentMethod: 'CASH',
          vendorPayee: 'Total Gas Station'
        },
        'exp-002'
      );

      expense.updateDetails({
        amount: 9800,
        notes: 'Price adjustment from supplier'
      });

      expect(expense.amount).toBe(9800);
      expect(expense.notes).toBe('Price adjustment from supplier');
    });
  });

  describe('2. Access Control (RBAC): Recording & Managing Lunch Expenses', () => {
    it('allows Admin to record lunch expenses', async () => {
      const result = await lunchUseCases.recordExpense(
        {
          title: 'Fresh Sukuma Wiki and Cabbage for week 4',
          category: LunchExpenseCategory.FRESH_PRODUCE,
          amount: 6200,
          vendorPayee: 'Wakame Fresh Market',
          paymentMethod: 'MPESA',
          termId: 'TERM_1',
          academicYearId: '2026'
        },
        adminContext
      );

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Fresh Sukuma Wiki and Cabbage for week 4');
      expect(result.amount).toBe(6200);
      expect(result.recordedByUserName).toBe('System Admin');
    });

    it('allows Head Teacher to record lunch expenses', async () => {
      const result = await lunchUseCases.recordExpense(
        {
          title: 'Firewood - 2 Truckloads for Kitchen Boilers',
          category: LunchExpenseCategory.COOKING_FUEL,
          amount: 14000,
          vendorPayee: 'Mau Timber Supplies',
          paymentMethod: 'BANK_TRANSFER'
        },
        headTeacherContext
      );

      expect(result.id).toBeDefined();
      expect(result.category).toBe(LunchExpenseCategory.COOKING_FUEL);
      expect(result.recordedByUserName).toBe('Jane Mumo');
    });

    it('rejects general Teacher from recording lunch expenses with ForbiddenError (403)', async () => {
      await expect(
        lunchUseCases.recordExpense(
          {
            title: 'Unauthorized groceries',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: 5000,
            vendorPayee: 'Any Shop'
          },
          teacherContext
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects Parent from recording lunch expenses with ForbiddenError (403)', async () => {
      await expect(
        lunchUseCases.recordExpense(
          {
            title: 'Parent attempt',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: 5000,
            vendorPayee: 'Any Shop'
          },
          parentContext
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('3. Validation Rules', () => {
    it('rejects empty title or whitespace-only title', async () => {
      await expect(
        lunchUseCases.recordExpense(
          {
            title: '   ',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: 5000,
            vendorPayee: 'Supplier'
          },
          adminContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects negative or zero amount', async () => {
      await expect(
        lunchUseCases.recordExpense(
          {
            title: 'Flour',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: 0,
            vendorPayee: 'Supplier'
          },
          adminContext
        )
      ).rejects.toThrow(ValidationError);

      await expect(
        lunchUseCases.recordExpense(
          {
            title: 'Flour',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: -500,
            vendorPayee: 'Supplier'
          },
          adminContext
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects empty vendorPayee', async () => {
      await expect(
        lunchUseCases.recordExpense(
          {
            title: 'Rice 50kg',
            category: LunchExpenseCategory.FOOD_CEREALS,
            amount: 7000,
            vendorPayee: '   '
          },
          adminContext
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('4. Expense Ledger Querying, Updating & Deleting', () => {
    let savedId: string;

    beforeEach(async () => {
      const exp1 = await lunchUseCases.recordExpense(
        {
          title: 'Beef 30kg for Friday Meal',
          category: LunchExpenseCategory.MEAT_DAIRY,
          amount: 18000,
          vendorPayee: 'Kenya Meat Commission Butchery',
          termId: 'TERM_1',
          academicYearId: '2026'
        },
        adminContext
      );
      savedId = exp1.id;

      await lunchUseCases.recordExpense(
        {
          title: 'Cook Wages - 2 Kitchen Assistants Fortnight',
          category: LunchExpenseCategory.KITCHEN_STAFF_WAGES,
          amount: 16000,
          vendorPayee: 'Mary & John (Cooks)',
          termId: 'TERM_1',
          academicYearId: '2026'
        },
        adminContext
      );
    });

    it('lists all recorded expenses and filters by category', async () => {
      const all = await lunchUseCases.listExpenses({}, adminContext);
      expect(all.length).toBe(2);

      const meatOnly = await lunchUseCases.listExpenses(
        { category: LunchExpenseCategory.MEAT_DAIRY },
        adminContext
      );
      expect(meatOnly.length).toBe(1);
      expect(meatOnly[0].title).toContain('Beef');
    });

    it('updates expense details', async () => {
      const updated = await lunchUseCases.updateExpense(
        savedId,
        {
          amount: 19500,
          notes: 'Added 2.5kg extra soup bones'
        },
        headTeacherContext
      );

      expect(updated.amount).toBe(19500);
      expect(updated.notes).toBe('Added 2.5kg extra soup bones');
    });

    it('deletes an expense record', async () => {
      const deleteResult = await lunchUseCases.deleteExpense(savedId, adminContext);
      expect(deleteResult.success).toBe(true);

      await expect(lunchUseCases.getExpenseById(savedId, adminContext)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('5. Comprehensive Financial Accounting: Revenue vs Expenses & Net Balance', () => {
    it('calculates total collected, total expenses, net balance, and category breakdown accurately', async () => {
      // 1. Seed two enrollments with payments (Total collected: 6000 + 4000 = 10000)
      const enr1 = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-1',
          planName: 'Standard Lunch',
          amount: 6000,
          amountPaid: 6000,
          balance: 0,
          status: LunchEnrollmentStatus.ACTIVE,
          termId: 'TERM_1',
          academicYearId: '2026',
          enrolledAt: new Date()
        },
        'enr-1'
      );
      const enr2 = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-2',
          planName: 'Standard Lunch',
          amount: 6000,
          amountPaid: 4000,
          balance: 2000,
          status: LunchEnrollmentStatus.ACTIVE,
          termId: 'TERM_1',
          academicYearId: '2026',
          enrolledAt: new Date()
        },
        'enr-2'
      );
      await lunchFeeRepo.save(enr1);
      await lunchFeeRepo.save(enr2);

      // 2. Seed catering expenses:
      // - Food: KES 4,500
      // - Fuel: KES 2,500
      // Total expenses = KES 7,000
      await lunchUseCases.recordExpense(
        {
          title: 'Rice and Cooking Oil',
          category: LunchExpenseCategory.FOOD_CEREALS,
          amount: 4500,
          vendorPayee: 'Wholesaler',
          termId: 'TERM_1',
          academicYearId: '2026'
        },
        adminContext
      );

      await lunchUseCases.recordExpense(
        {
          title: 'Cooking Gas Refill',
          category: LunchExpenseCategory.COOKING_FUEL,
          amount: 2500,
          vendorPayee: 'Gas Dealer',
          termId: 'TERM_1',
          academicYearId: '2026'
        },
        headTeacherContext
      );

      // 3. Query financial accounting summary
      const summary = await lunchUseCases.getLunchFinancialSummary(
        { termId: 'TERM_1', academicYearId: '2026' },
        adminContext
      );

      expect(summary.totalBilled).toBe(12000);
      expect(summary.totalCollected).toBe(10000);
      expect(summary.totalOutstanding).toBe(2000);
      expect(summary.totalExpenses).toBe(7000);
      expect(summary.netBalance).toBe(3000); // 10,000 - 7,000 = 3,000 Surplus!
      expect(summary.utilizationRate).toBe(70); // 7,000 / 10,000 = 70%

      // Verify category breakdown
      const foodCategory = summary.categoryBreakdown.find(
        (c) => c.category === LunchExpenseCategory.FOOD_CEREALS
      );
      expect(foodCategory?.amount).toBe(4500);

      const fuelCategory = summary.categoryBreakdown.find(
        (c) => c.category === LunchExpenseCategory.COOKING_FUEL
      );
      expect(fuelCategory?.amount).toBe(2500);
    });
  });
});
