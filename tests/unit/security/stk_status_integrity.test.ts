import {AppContainer} from '../../../src/infrastructure/container';
import {FeeUseCases} from '../../../src/application/finance/FeeUseCases';
import {KcbBuniPaymentAdapter} from '../../../src/infrastructure/services/KcbBuniPaymentAdapter';
import {Payment,PaymentMethod,PaymentStatus,StudentInvoice,InvoiceStatus} from '../../../src/core/domain/finance/Fee';
import {Student,StudentGender,StudentStatus,CBCGradeLevel} from '../../../src/core/domain/user/Student';
import {UserRole} from '../../../src/core/domain/user/User';

const actor={userId:'finance',role:UserRole.ADMIN,schoolId:'school'};
describe('Payment polling never fabricates bank confirmations',()=>{
  let c:AppContainer,service:FeeUseCases,gateway:any;
  beforeEach(async()=>{
    c=new AppContainer();
    gateway={initiateKcbBuniStk:jest.fn().mockResolvedValue({checkoutRequestId:'checkout-123',merchantRequestId:'merchant',responseCode:'0'}),queryTransactionStatus:jest.fn().mockResolvedValue({success:true,receiptNumber:'UNVERIFIED-RECEIPT',message:'Unverified gateway success'})};
    service=new FeeUseCases(c.feeRepository,c.studentRepository,c.guardianRepository,c.userRepository,gateway,{} as any,c.academicRepository,gateway);
    await c.studentRepository.save(Student.create({schoolId:'school',firstName:'Synthetic',lastName:'Learner',admissionNumber:'STK-TEST',dateOfBirth:'2015-01-01',gender:StudentGender.MALE,gradeLevel:CBCGradeLevel.GRADE_4,classroomId:'class',academicYearId:'year',guardianIds:[],status:StudentStatus.ACTIVE},'learner'));
    await c.feeRepository.saveInvoice(StudentInvoice.create({schoolId:'school',studentId:'learner',feeStructureId:'structure',academicYearId:'year',termId:'term',invoiceNumber:'INV-STK',items:[],amountBilled:1000,discountAmount:0,amountPayable:1000,amountPaid:0,balance:1000,status:InvoiceStatus.UNPAID,dueDate:'2026-11-30'},'invoice'));
    await service.initiateKcbBuniStkPush({invoiceId:'invoice',phoneNumber:'0712345678',amount:1000});
  });
  const receipt=(status:PaymentStatus,checkout='checkout-123')=>Payment.create({schoolId:'school',studentId:'learner',invoiceId:'invoice',receiptNumber:'REC-VERIFIED',amount:1000,paymentMethod:PaymentMethod.KCB_BUNI,transactionReference:'BANK-REFERENCE',paymentDate:'2026-11-23',recordedByUserId:'bank-callback',status,notes:`KCB Buni M-Pesa Express. CheckoutReq: ${checkout}`},'payment');
  it('leaves unpaid invoices unchanged even when the gateway returns a success-shaped status',async()=>{
    for(let i=0;i<3;i++)expect(await service.queryKcbBuniStatus('checkout-123',actor)).toMatchObject({success:false,status:'PENDING'});
    expect(gateway.queryTransactionStatus).not.toHaveBeenCalled();
    expect((await c.feeRepository.findInvoiceById('invoice'))!.balance).toBe(1000);
    expect(await c.feeRepository.findPayments({schoolId:'school'})).toEqual([]);
  });
  it('returns the existing completed receipt without creating a second payment or changing the balance',async()=>{
    const invoice=(await c.feeRepository.findInvoiceById('invoice'))!;invoice.recordPayment(1000);await c.feeRepository.updateInvoice(invoice);
    await c.feeRepository.savePayment(receipt(PaymentStatus.COMPLETED));
    for(let i=0;i<2;i++)expect(await service.queryKcbBuniStatus('checkout-123',actor)).toMatchObject({success:true,status:'COMPLETED',receiptNumber:'BANK-REFERENCE',schoolReceiptNumber:'REC-VERIFIED'});
    expect((await c.feeRepository.findPayments({schoolId:'school'}))).toHaveLength(1);
    expect((await c.feeRepository.findInvoiceById('invoice'))!.balance).toBe(0);
  });
  it('does not confirm reversed payments or a checkout ID that merely shares a prefix',async()=>{
    await c.feeRepository.savePayment(receipt(PaymentStatus.REVERSED));
    expect(await service.queryKcbBuniStatus('checkout-123',actor)).toMatchObject({success:false,status:'REVERSED'});
    await c.feeRepository.savePayment(receipt(PaymentStatus.COMPLETED,'checkout-123-extra'));
    expect(await service.queryKcbBuniStatus('checkout-123',actor)).toMatchObject({success:false,status:'PENDING'});
  });
  it('does not claim that an unsupported provider query has verified a payment',async()=>{
    const adapter=new KcbBuniPaymentAdapter('mock-key');
    const status=await adapter.queryTransactionStatus('checkout-123');
    expect(status.success).toBe(false);expect(status.receiptNumber).toBeUndefined();
  });
});
