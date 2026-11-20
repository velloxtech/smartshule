import mongoose from 'mongoose';
import { PostgresFeeRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { MongoFeeRepository } from '../../src/infrastructure/database/mongodb/MongooseRepositories';
import { InMemoryFeeRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Payment, PaymentMethod, PaymentStatus } from '../../src/core/domain/finance/Fee';

describe('Payment queries scoped to linked children', () => {
  it.each([{ ids: ['child-a', 'child-b'] }, { ids: [] }])('PostgreSQL applies the child list $ids', async ({ ids }) => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresFeeRepository({ query } as any);
    await repository.findPayments({ schoolId: 'school', studentIds: ids });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('AND student_id = ANY($2::text[])'),
      ['school', ids]
    );
  });

  it('MongoDB intersects the child list with an explicitly requested child', async () => {
    const find = jest.spyOn(mongoose.model('Payment'), 'find')
      .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) } as any);
    await new MongoFeeRepository().findPayments({ studentIds: ['child-a', 'child-b'], studentId: 'unrelated' });
    expect(find).toHaveBeenCalledWith({ studentId: { $in: [] } });
  });

  it.each([{ ids: ['child-a', 'child-b'] }, { ids: [] }])('MongoDB applies the child list $ids', async ({ ids }) => {
    const find = jest.spyOn(mongoose.model('Payment'), 'find')
      .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) } as any);
    await new MongoFeeRepository().findPayments({ studentIds: ids });
    expect(find).toHaveBeenCalledWith({ studentId: { $in: ids } });
  });

  it('returns both linked siblings and excludes unrelated receipts, including an empty scope', async () => {
    const repository = new InMemoryFeeRepository();
    for (const studentId of ['child-a', 'child-b', 'unrelated']) {
      await repository.savePayment(Payment.create({
        schoolId: 'school', invoiceId: '', studentId, receiptNumber: studentId,
        amount: 100, paymentMethod: PaymentMethod.BANK_DEPOSIT,
        transactionReference: studentId, paymentDate: '2026-11-20',
        recordedByUserId: 'bursar', status: PaymentStatus.COMPLETED
      }, `payment-${studentId}`));
    }
    const payments = await repository.findPayments({ studentIds: ['child-a', 'child-b'] });
    expect(payments.map(payment => payment.studentId)).toEqual(['child-a', 'child-b']);
    expect(await repository.findPayments({ studentIds: [] })).toEqual([]);
    expect(await repository.findPayments({})).toHaveLength(3);
  });
});
