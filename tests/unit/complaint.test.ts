import { Complaint } from '../../src/core/domain/complaint/Complaint';
import { ComplaintUseCases } from '../../src/application/complaints/ComplaintUseCases';
import { InMemoryComplaintRepository } from '../../src/infrastructure/database/in-memory/InMemoryComplaintRepository';
import { ValidationError, NotFoundError } from '../../src/core/domain/shared/Errors';

describe('Complaint Domain & Use Cases Unit Tests', () => {
  describe('Complaint Entity', () => {
    it('creates a complaint with valid attributes and default values', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Noise in Classroom 4',
          description: 'Loud construction noise disrupting exams.'
        },
        'cmp-1'
      );

      expect(complaint.id).toBe('cmp-1');
      expect(complaint.schoolId).toBe('school-001');
      expect(complaint.title).toBe('Noise in Classroom 4');
      expect(complaint.description).toBe('Loud construction noise disrupting exams.');
      expect(complaint.status).toBe('OPEN');
      expect(complaint.priority).toBe('MEDIUM');
      expect(complaint.category).toBe('GENERAL');
      expect(complaint.createdAt).toBeInstanceOf(Date);
      expect(complaint.updatedAt).toBeInstanceOf(Date);
    });

    it('updates details properly and touches updatedAt', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Initial Title',
          description: 'Initial Description'
        },
        'cmp-2'
      );

      const oldUpdatedAt = complaint.updatedAt;

      complaint.updateDetails({
        title: 'Updated Title',
        priority: 'HIGH',
        category: 'FACILITY'
      });

      expect(complaint.title).toBe('Updated Title');
      expect(complaint.priority).toBe('HIGH');
      expect(complaint.category).toBe('FACILITY');
      expect(complaint.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());
    });

    it('handles assignTo correctly', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Broken desk',
          description: 'Desk in 3B is broken.'
        },
        'cmp-3'
      );

      expect(complaint.status).toBe('OPEN');
      complaint.assignTo('usr-headteacher-01');
      expect(complaint.assignedToUserId).toBe('usr-headteacher-01');
      expect(complaint.status).toBe('IN_REVIEW');
    });

    it('handles resolve correctly', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Water outage',
          description: 'No water in block B'
        },
        'cmp-4'
      );

      complaint.resolve('Plumbing valve fixed and tested.', 'usr-admin-01');
      expect(complaint.status).toBe('RESOLVED');
      expect(complaint.resolutionNotes).toBe('Plumbing valve fixed and tested.');
      expect(complaint.resolvedByUserId).toBe('usr-admin-01');
      expect(complaint.resolvedAt).toBeInstanceOf(Date);
    });

    it('handles dismiss correctly', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Duplicate report',
          description: 'Duplicate of CMP-4'
        },
        'cmp-5'
      );

      complaint.dismiss('Duplicate ticket already handled.', 'usr-headteacher-01');
      expect(complaint.status).toBe('DISMISSED');
      expect(complaint.resolutionNotes).toBe('Duplicate ticket already handled.');
      expect(complaint.resolvedByUserId).toBe('usr-headteacher-01');
      expect(complaint.resolvedAt).toBeInstanceOf(Date);
    });

    it('serializes to JSON accurately', () => {
      const complaint = Complaint.create(
        {
          schoolId: 'school-001',
          title: 'Bullying concern',
          description: 'Reported bullying near playground',
          category: 'DISCIPLINE',
          priority: 'URGENT',
          complainantName: 'Concerned Parent',
          complainantRole: 'PARENT',
          complainantPhone: '+254711223344',
          complainantEmail: 'parent@example.com'
        },
        'cmp-6'
      );

      const json = complaint.toJSON();
      expect(json.id).toBe('cmp-6');
      expect(json.title).toBe('Bullying concern');
      expect(json.category).toBe('DISCIPLINE');
      expect(json.priority).toBe('URGENT');
      expect(json.complainantName).toBe('Concerned Parent');
      expect(json.complainantRole).toBe('PARENT');
      expect(json.complainantPhone).toBe('+254711223344');
      expect(json.complainantEmail).toBe('parent@example.com');
      expect(typeof json.createdAt).toBe('string');
    });
  });

  describe('ComplaintUseCases', () => {
    let repo: InMemoryComplaintRepository;
    let useCases: ComplaintUseCases;

    beforeEach(() => {
      repo = new InMemoryComplaintRepository();
      useCases = new ComplaintUseCases(repo);
    });

    it('validates required fields on creation', async () => {
      await expect(
        useCases.createComplaint({ title: '', description: 'Desc' })
      ).rejects.toThrow(ValidationError);

      await expect(
        useCases.createComplaint({ title: 'Title', description: '' })
      ).rejects.toThrow(ValidationError);
    });

    it('creates, retrieves, and updates complaints', async () => {
      const created = await useCases.createComplaint(
        {
          title: 'Bus delay',
          description: 'Route 4 bus was 40 minutes late.',
          category: 'TRANSPORT',
          priority: 'HIGH'
        },
        'usr-creator-1'
      );

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Bus delay');
      expect(created.createdByUserId).toBe('usr-creator-1');

      const fetched = await useCases.getComplaintById(created.id);
      expect(fetched.id).toBe(created.id);

      const updated = await useCases.updateComplaint(created.id, {
        title: 'Morning Bus Route 4 delay'
      });
      expect(updated.title).toBe('Morning Bus Route 4 delay');
    });

    it('throws NotFoundError for non-existent complaint', async () => {
      await expect(useCases.getComplaintById('non-existent-id')).rejects.toThrow(
        NotFoundError
      );
    });

    it('updates status and validates allowed statuses', async () => {
      const created = await useCases.createComplaint({
        title: 'Library books',
        description: 'Missing Grade 4 textbooks'
      });

      await expect(
        useCases.updateStatus(created.id, 'INVALID_STATUS')
      ).rejects.toThrow(ValidationError);

      const updated = await useCases.updateStatus(created.id, 'INVESTIGATING', 'Contacted librarian');
      expect(updated.status).toBe('INVESTIGATING');
      expect(updated.resolutionNotes).toContain('Contacted librarian');
    });

    it('resolves and dismisses with validation', async () => {
      const created = await useCases.createComplaint({
        title: 'Broken bench',
        description: 'Bench broken outside staff room'
      });

      await expect(
        useCases.resolveComplaint(created.id, '', 'usr-ht-1')
      ).rejects.toThrow(ValidationError);

      const resolved = await useCases.resolveComplaint(
        created.id,
        'Bench repaired by school carpenter',
        'usr-ht-1'
      );
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedByUserId).toBe('usr-ht-1');
    });

    it('calculates summary statistics correctly', async () => {
      await useCases.createComplaint({
        schoolId: 'school-001',
        title: 'C1',
        description: 'Desc 1',
        category: 'ACADEMIC',
        priority: 'LOW'
      });

      const c2 = await useCases.createComplaint({
        schoolId: 'school-001',
        title: 'C2',
        description: 'Desc 2',
        category: 'FACILITY',
        priority: 'HIGH'
      });

      await useCases.resolveComplaint(c2.id, 'Fixed', 'usr-ht-1');

      const stats = await useCases.getStats('school-001');
      expect(stats.total).toBe(2);
      expect(stats.open).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.byCategory['ACADEMIC']).toBe(1);
      expect(stats.byCategory['FACILITY']).toBe(1);
      expect(stats.byPriority['LOW']).toBe(1);
      expect(stats.byPriority['HIGH']).toBe(1);
    });

    it('deletes complaint and verifies subsequent lookup fails', async () => {
      const created = await useCases.createComplaint({
        title: 'To be deleted',
        description: 'Testing deletion'
      });

      const deleted = await useCases.deleteComplaint(created.id);
      expect(deleted).toBe(true);

      await expect(useCases.getComplaintById(created.id)).rejects.toThrow(NotFoundError);
    });
  });
});
