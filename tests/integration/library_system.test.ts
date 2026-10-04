import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Library & Textbook System Integration Tests', () => {
  let app: any;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // Admin login
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Teacher login
    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // Parent login
    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123'
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  describe('Book Inventory & Catalogue Operations', () => {
    let createdBookId: string;

    it('should allow an admin to add a new book to the catalogue', async () => {
      const res = await request(app)
        .post('/api/v1/library/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Top Scholar Agriculture & Nutrition Grade 7',
          author: 'KLB Publishing Team',
          isbn: '978-9966-55-432-1',
          category: 'CBC Textbooks',
          publisher: 'Kenya Literature Bureau',
          publicationYear: 2024,
          copiesTotal: 5,
          copiesAvailable: 5,
          shelfLocation: 'Shelf A-4 (Junior School)',
          condition: 'NEW',
          gradeLevel: 'JSS 1 (Grade 7)',
          description: 'CBC agricultural practices and nutrition guide'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Top Scholar Agriculture & Nutrition Grade 7');
      expect(res.body.data.copiesTotal).toBe(5);
      expect(res.body.data.copiesAvailable).toBe(5);
      createdBookId = res.body.data.id;
    });

    it('should reject adding a book without a title or author', async () => {
      const res = await request(app)
        .post('/api/v1/library/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          author: 'Test Author'
        });

      expect(res.status).toBe(400);
    });

    it('should list all books and support search filters', async () => {
      // 1. General list
      const listRes = await request(app)
        .get('/api/v1/library/books')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data.some((b: any) => b.id === createdBookId)).toBe(true);

      // 2. Search query filter
      const searchRes = await request(app)
        .get('/api/v1/library/books?search=Agriculture')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(searchRes.body.data[0].title).toContain('Agriculture');

      // 3. Category filter
      const catRes = await request(app)
        .get('/api/v1/library/books?category=CBC Textbooks')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(catRes.status).toBe(200);
      expect(catRes.body.data.every((b: any) => b.category === 'CBC Textbooks')).toBe(true);
    });

    it('should update book details (shelf location, total copies)', async () => {
      const res = await request(app)
        .put(`/api/v1/library/books/${createdBookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shelfLocation: 'Shelf A-5 (Reassigned)',
          copiesTotal: 8
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shelfLocation).toBe('Shelf A-5 (Reassigned)');
      expect(res.body.data.copiesTotal).toBe(8);
    });

    it('should fetch a single book by id', async () => {
      const res = await request(app)
        .get(`/api/v1/library/books/${createdBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdBookId);
    });
  });

  describe('Circulation & Book Loans Flow', () => {
    let singleCopyBookId: string;
    let loanId: string;

    beforeAll(async () => {
      // Create a book with exactly 1 copy to test availability limits
      const res = await request(app)
        .post('/api/v1/library/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Reference Encyclopedia of African History',
          author: 'Prof. B. Ogot',
          category: 'Reference (Dictionaries & Encyclopedias)',
          copiesTotal: 1,
          copiesAvailable: 1,
          condition: 'GOOD'
        });
      expect(res.status).toBe(201);
      singleCopyBookId = res.body.data.id;
    });

    it('should issue a book to a learner and decrement available copies', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const issueRes = await request(app)
        .post('/api/v1/library/loans/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookId: singleCopyBookId,
          borrowerType: 'STUDENT',
          borrowerId: 'stud-test-001',
          borrowerName: 'John Kamau',
          borrowerAdmissionOrNumber: 'ADM-2024-001',
          borrowerGradeOrClass: 'Grade 7 East',
          dueDate: dueDate.toISOString().split('T')[0],
          remarks: 'Issued for term paper research'
        });

      expect(issueRes.status).toBe(201);
      expect(issueRes.body.success).toBe(true);
      expect(issueRes.body.data.status).toBe('ISSUED');
      expect(issueRes.body.data.borrowerName).toBe('John Kamau');
      loanId = issueRes.body.data.id;

      // Verify available copies is now 0
      const bookRes = await request(app)
        .get(`/api/v1/library/books/${singleCopyBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(bookRes.body.data.copiesAvailable).toBe(0);
    });

    it('should fail to issue a book when available copies is 0', async () => {
      const res = await request(app)
        .post('/api/v1/library/loans/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookId: singleCopyBookId,
          borrowerType: 'STUDENT',
          borrowerId: 'stud-test-002',
          borrowerName: 'Sarah Mwangi',
          dueDate: '2026-10-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('0');
    });

    it('should prevent deleting a book that has active borrowed copies', async () => {
      const res = await request(app)
        .delete(`/api/v1/library/books/${singleCopyBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('active borrowed copies');
    });

    it('should list active loans and verify loan details', async () => {
      const loansRes = await request(app)
        .get('/api/v1/library/loans?status=ISSUED')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(loansRes.status).toBe(200);
      expect(loansRes.body.data.some((l: any) => l.id === loanId)).toBe(true);
    });

    it('should check in (return) the book and restore available copy count', async () => {
      const returnRes = await request(app)
        .post(`/api/v1/library/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          returnDate: new Date().toISOString().split('T')[0],
          fineAmount: 0,
          finePaid: false,
          remarks: 'Returned in good condition'
        });

      expect(returnRes.status).toBe(200);
      expect(returnRes.body.success).toBe(true);
      expect(returnRes.body.data.status).toBe('RETURNED');

      // Verify book available copy incremented back to 1
      const bookRes = await request(app)
        .get(`/api/v1/library/books/${singleCopyBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(bookRes.body.data.copiesAvailable).toBe(1);
    });

    it('should reject duplicate return on an already returned loan', async () => {
      const res = await request(app)
        .post(`/api/v1/library/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been marked as returned');
    });

    it('should now allow deleting the book once all copies are returned', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/library/books/${singleCopyBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/v1/library/books/${singleCopyBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkRes.status).toBe(404);
    });
  });

  describe('Statistics & Dashboard Summary', () => {
    it('should calculate library analytics and overview counts', async () => {
      const res = await request(app)
        .get('/api/v1/library/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTitles).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalCopies).toBeGreaterThanOrEqual(1);
      expect(res.body.data.availableCopies).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.data.categoriesCount).toBe('object');
    });
  });
});
