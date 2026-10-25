/**
 * SmartShule CBC Management System - Grace Seeds School
 * Unit Tests for Email Service, Template Engine, Dynamic HTML Escaping, and Retry Logic
 */

import { EmailTemplateEngine } from '../../src/infrastructure/services/email/EmailTemplateEngine';
import { EmailService } from '../../src/infrastructure/services/email/EmailService';

describe('Phase A: Email Infrastructure & Design System Unit Tests', () => {
  describe('EmailTemplateEngine - Dynamic Escaping & Visual Hierarchy', () => {
    it('escapes dangerous HTML characters to prevent XSS / HTML injection', () => {
      const maliciousName = '<script>alert("hacked")</script> & "John" \'Doe\'';
      const escaped = EmailTemplateEngine.escapeHtml(maliciousName);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt; &amp; &quot;John&quot; &#39;Doe&#39;');
      expect(escaped).not.toContain('<script>');
    });

    it('renders Password Reset Email with both HTML and plain-text alternatives', () => {
      const rendered = EmailTemplateEngine.renderPasswordResetEmail({
        to: 'teacher@smartshule.ac.ke',
        recipientName: 'Mr. Omondi',
        resetUrl: 'https://smartshule.ac.ke/?view=reset-password&token=test-hex-token-123',
        resetCode: '748291',
        expiryMinutes: 15,
      });

      expect(rendered.subject).toContain('Password Reset Verification');
      expect(rendered.subject).toContain('748291');
      expect(rendered.subject).toContain('Grace Seeds School');

      // HTML Verification
      expect(rendered.html).toContain('Grace Seeds School');
      expect(rendered.html).toContain('748291');
      expect(rendered.html).toContain('Mr. Omondi');
      expect(rendered.html).toContain('https://smartshule.ac.ke/?view=reset-password&amp;token=test-hex-token-123');
      expect(rendered.html).toContain('15 minutes');
      expect(rendered.html).toContain('0745436312');
      expect(rendered.html).toContain('schoolgraceseeds@gmail.com');

      // Plain Text Verification
      expect(rendered.text).toContain('748291');
      expect(rendered.text).toContain('https://smartshule.ac.ke/?view=reset-password&token=test-hex-token-123');
      expect(rendered.text).toContain('Grace Seeds School');
    });

    it('renders Password Changed Security Notification with timestamps and emergency alert contacts', () => {
      const rendered = EmailTemplateEngine.renderPasswordChangedEmail({
        to: 'parent@smartshule.ac.ke',
        recipientName: 'Mama Wanjiku',
        changeTime: new Date('2026-10-25T14:30:00Z'),
      });

      expect(rendered.subject).toContain('Security Alert: Your Password Has Been Changed');
      expect(rendered.html).toContain('Mama Wanjiku');
      expect(rendered.html).toContain('Account Security Status: Updated');
      expect(rendered.html).toContain('Did not make this change?');
      expect(rendered.html).toContain('0745436312');
      expect(rendered.text).toContain('Mama Wanjiku');
    });

    it('renders Fee Payment Receipt Confirmation with currency calculations and breakdown', () => {
      const rendered = EmailTemplateEngine.renderFeeReceiptEmail({
        to: 'parent@smartshule.ac.ke',
        recipientName: 'David Otieno',
        receiptNumber: 'REC-2026-089',
        amountPaid: 14500,
        paymentDate: '2026-10-25',
        paymentMethod: 'MPESA',
        transactionReference: 'QWE8912KLM',
        studentName: 'Faith Otieno',
        admissionNumber: 'GSS-2026-004',
        gradeLevel: 'Grade 3',
        remainingBalance: 0,
        viewReceiptUrl: 'https://smartshule.ac.ke/?view=receipt&id=REC-2026-089',
      });

      expect(rendered.subject).toContain('REC-2026-089');
      expect(rendered.subject).toContain('Faith Otieno');
      expect(rendered.html).toContain('KES 14,500');
      expect(rendered.html).toContain('QWE8912KLM');
      expect(rendered.html).toContain('Grade 3');
      expect(rendered.text).toContain('KES 14,500');
    });

    it('renders Document Approval Request with action links and requester metadata', () => {
      const rendered = EmailTemplateEngine.renderDocumentApprovalRequestEmail({
        to: 'headteacher@smartshule.ac.ke',
        recipientName: 'Head Teacher',
        documentType: 'Term 3 Broadsheet & Report Cards',
        documentTitle: 'Grade 3 Rationalized Assessment Report',
        documentReference: 'DOC-CBC-2026-T3-001',
        requesterName: 'Mr. J. Ochieng (Class Teacher)',
        reviewUrl: 'https://smartshule.ac.ke/?view=approval&id=DOC-CBC-2026-T3-001',
        deadline: '2026-10-30',
        notes: 'Final summative and formative scores reconciled.',
      });

      expect(rendered.subject).toContain('Action Required: Document Approval Request');
      expect(rendered.html).toContain('Grade 3 Rationalized Assessment Report');
      expect(rendered.html).toContain('DOC-CBC-2026-T3-001');
      expect(rendered.html).toContain('Mr. J. Ochieng');
      expect(rendered.html).toContain('2026-10-30');
      expect(rendered.html).toContain('Review &amp; Sign Document');
      expect(rendered.text).toContain('DOC-CBC-2026-T3-001');
    });

    it('renders Document Decision Notification with approved or rejected styling', () => {
      const approvedRender = EmailTemplateEngine.renderDocumentDecisionEmail({
        to: 'teacher@smartshule.ac.ke',
        recipientName: 'Mr. J. Ochieng',
        documentType: 'Broadsheet',
        documentTitle: 'Grade 3 Term 3 Broadsheet',
        documentReference: 'DOC-001',
        decision: 'APPROVED',
        decidedBy: 'Dr. Jane Onyango (Head Teacher)',
        decisionDate: '2026-10-25',
        comments: 'Excellent documentation and rubric calculations.',
      });

      expect(approvedRender.subject).toContain('Document APPROVED');
      expect(approvedRender.html).toContain('Decision: APPROVED');
      expect(approvedRender.html).toContain('Excellent documentation and rubric calculations.');

      const rejectedRender = EmailTemplateEngine.renderDocumentDecisionEmail({
        to: 'teacher@smartshule.ac.ke',
        recipientName: 'Mr. J. Ochieng',
        documentType: 'Broadsheet',
        documentTitle: 'Grade 3 Term 3 Broadsheet',
        documentReference: 'DOC-001',
        decision: 'REJECTED',
        decidedBy: 'Dr. Jane Onyango (Head Teacher)',
        decisionDate: '2026-10-25',
        comments: 'Please verify the physical education rubrics for learner GSS-002.',
      });

      expect(rejectedRender.subject).toContain('Document REJECTED');
      expect(rejectedRender.html).toContain('Decision: REJECTED');
    });
  });

  describe('EmailService - Recipient Validation & Delivery Ledger', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService({ isTestMode: true });
    });

    it('rejects sending to missing or invalid recipient email addresses', async () => {
      const resMissing = await emailService.send({
        to: '',
        subject: 'Test',
        text: 'Body',
      });
      expect(resMissing.success).toBe(false);
      expect(resMissing.error).toContain('No valid recipient');

      const resInvalid = await emailService.send({
        to: 'not-an-email-address',
        subject: 'Test',
        text: 'Body',
      });
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.error).toContain('Invalid email address format');
    });

    it('records successfully dispatched emails in test ledger with full metadata', async () => {
      const res = await emailService.send({
        to: 'test@example.com',
        subject: 'Test Message',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBeDefined();

      const sent = emailService.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe('test@example.com');
      expect(sent[0].subject).toBe('Test Message');
      expect(sent[0].text).toBe('Plain text content');
      expect(sent[0].html).toBe('<p>HTML content</p>');

      const last = emailService.getLastSentEmail();
      expect(last?.subject).toBe('Test Message');

      emailService.clearSentEmails();
      expect(emailService.getSentEmails().length).toBe(0);
    });

    it('correctly validates email formats using isValidEmail helper', () => {
      expect(EmailService.isValidEmail('valid@example.com')).toBe(true);
      expect(EmailService.isValidEmail('admin.user+tag@domain.co.ke')).toBe(true);
      expect(EmailService.isValidEmail('plainaddress')).toBe(false);
      expect(EmailService.isValidEmail('@missinguser.com')).toBe(false);
      expect(EmailService.isValidEmail('user@.com')).toBe(false);
    });
  });
});
