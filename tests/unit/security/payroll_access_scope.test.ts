import {AppContainer} from '../../../src/infrastructure/container';
import {PayrollRecord,StaffLeave} from '../../../src/core/domain/payroll/PayrollRecord';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {Teacher} from '../../../src/core/domain/user/Teacher';
import {ForbiddenError,ValidationError} from '../../../src/core/domain/shared/Errors';
import {PayrollController} from '../../../src/infrastructure/http/controllers/PayrollController';

const admin={userId:'admin',schoolId:'school',role:UserRole.ADMIN};
const teacher={userId:'teacher',schoolId:'school',role:UserRole.TEACHER};
const colleague={userId:'colleague',schoolId:'school',role:UserRole.TEACHER};
const foreign={userId:'foreign',schoolId:'other-school',role:UserRole.TEACHER};
const parent={userId:'parent',schoolId:'school',role:UserRole.PARENT};
describe('Salary and leave record access',()=>{
 let c:AppContainer;
 beforeEach(async()=>{
  c=new AppContainer();
  for(const actor of [admin,teacher,colleague,foreign,parent]){
   await c.userRepository.save(User.create({schoolId:actor.schoolId,firstName:actor.userId,lastName:'Synthetic',role:actor.role,status:UserStatus.ACTIVE,passwordHash:'synthetic'},actor.userId));
   if(actor.role===UserRole.TEACHER)await c.teacherRepository.save(Teacher.create({userId:actor.userId,employeeNumber:`EMP-${actor.userId}`,specialization:[],assignedClassStreamIds:[]},`profile-${actor.userId}`));
  }
  for(const actor of [teacher,colleague,foreign]){
   await c.payrollRepository.savePayroll(PayrollRecord.create({schoolId:actor.schoolId,teacherId:`profile-${actor.userId}`,teacherName:actor.userId,month:'2026-11',basicSalary:1000,houseAllowance:0,commuterAllowance:0,responsibilityAllowance:0,grossSalary:1000,nssf:0,shif:0,housingLevy:0,paye:0,otherDeductions:0,totalDeductions:0,netSalary:1000,status:'DRAFT'},`payroll-${actor.userId}`));
   await c.payrollRepository.saveLeave(StaffLeave.create({schoolId:actor.schoolId,teacherId:`profile-${actor.userId}`,teacherName:actor.userId,leaveType:'ANNUAL',startDate:'2026-11-23',endDate:'2026-11-24',daysCount:2,reason:'Personal',status:'PENDING'},`leave-${actor.userId}`));
  }
 });
 it('lets teachers read their own history while blocking other staff salary histories and parent access',async()=>{
  expect((await c.payrollUseCases.getTeacherPayrolls('profile-teacher',teacher)).map(record=>record.id)).toEqual(['payroll-teacher']);
  await expect(c.payrollUseCases.getTeacherPayrolls('profile-colleague',teacher)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.getTeacherPayrolls('profile-teacher',parent)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.getPayrollById('payroll-colleague',teacher)).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('prevents administrators reading, approving or deleting another school’s payroll',async()=>{
  for(const operation of [()=>c.payrollUseCases.getPayrollById('payroll-foreign',admin),()=>c.payrollUseCases.approvePayroll('payroll-foreign',admin),()=>c.payrollUseCases.deletePayroll('payroll-foreign',admin)])await expect(operation()).rejects.toBeInstanceOf(ForbiddenError);
  expect(await c.payrollUseCases.getTeacherPayrolls('profile-foreign',admin)).toEqual([]);
  expect((await c.payrollRepository.findPayrollById('payroll-foreign'))!.status).toBe('DRAFT');
 });
 it('does not delete payroll with disbursed money',async()=>{
  const record=(await c.payrollRepository.findPayrollById('payroll-teacher'))!;record.recordPayment(500,'CASH','CASH-TEST');
  await c.payrollRepository.updatePayroll(record);
  await expect(c.payrollUseCases.deletePayroll(record.id,admin)).rejects.toBeInstanceOf(ValidationError);
  expect(await c.payrollRepository.findPayrollById(record.id)).not.toBeNull();
 });
 it('shows teachers only their own leave requests and keeps finance staff within their school',async()=>{
  expect((await c.payrollUseCases.listLeaves('school',undefined,teacher)).map(row=>row.id)).toEqual(['leave-teacher']);
  await expect(c.payrollUseCases.listLeaves('school','profile-colleague',teacher)).rejects.toBeInstanceOf(ForbiddenError);
  expect(await c.payrollUseCases.listLeaves('school','profile-foreign',admin)).toEqual([]);
  await expect(c.payrollUseCases.reviewLeave('leave-foreign','APPROVE','Admin','Reviewed',admin)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.reviewLeave('leave-colleague','APPROVE','Teacher','Reviewed',teacher)).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('blocks teacher leave applications on behalf of another staff member or school',async()=>{
  const input={schoolId:'school',teacherId:'profile-colleague',teacherName:'Colleague',leaveType:'ANNUAL' as const,startDate:'2026-11-23',endDate:'2026-11-24',reason:'Forged leave'};
  await expect(c.payrollUseCases.applyLeave(input,teacher)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.applyLeave({...input,teacherId:'profile-foreign'},admin)).rejects.toBeInstanceOf(ForbiddenError);
  expect(await c.payrollUseCases.applyLeave({...input,teacherId:'profile-teacher'},teacher)).toMatchObject({teacherId:'profile-teacher',schoolId:'school'});
 });
 it('lets accounts finish a dispute review without acknowledging payment for the employee',async()=>{
  const record=(await c.payrollRepository.findPayrollById('payroll-teacher'))!;
  record.recordPayment(1000,'CASH','CASH-SALARY');await c.payrollRepository.updatePayroll(record);
  await c.payrollUseCases.disputeSalaryPayment(record.id,teacher,{reason:'The stated cash payment needs checking.'});
  const result=await c.payrollUseCases.resolveSalaryDispute(record.id,admin,'Checked the signed cash voucher with the employee.');
  expect(result.data).toMatchObject({acknowledgementStatus:'AWAITING_ACKNOWLEDGEMENT',amountPaid:1000});
  expect(record.acknowledgedAt).toBeUndefined();expect(record.disputeReason).toContain('needs checking');
  expect((await c.systemLogRepository.find()).some(log=>log.action==='SALARY_DISPUTE_RESOLVED')).toBe(true);
  await expect(c.payrollUseCases.acknowledgeSalaryReceipt(record.id,teacher,{})).resolves.toMatchObject({success:true});
 });
 it('rejects unauthorized, foreign-school and unexplained dispute resolutions',async()=>{
  const record=(await c.payrollRepository.findPayrollById('payroll-teacher'))!;
  record.recordPayment(1000,'CASH','CASH-SALARY');await c.payrollRepository.updatePayroll(record);
  await c.payrollUseCases.disputeSalaryPayment(record.id,teacher,{reason:'Please verify receipt details.'});
  await expect(c.payrollUseCases.resolveSalaryDispute(record.id,teacher,'Approve my own dispute')).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.resolveSalaryDispute(record.id,{...admin,schoolId:'other-school'},'Foreign school reviewer')).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.payrollUseCases.resolveSalaryDispute(record.id,admin,'')).rejects.toBeInstanceOf(ValidationError);
  expect(record.acknowledgementStatus).toBe('UNDER_REVIEW');
 });
 it('passes the authenticated actor from salary and leave HTTP handlers to the access checks',async()=>{
  const controller=new PayrollController(c.payrollUseCases),next=jest.fn(),res:any={status:jest.fn().mockReturnThis(),json:jest.fn()};
  await controller.getTeacherPayrolls({params:{teacherId:'profile-colleague'},user:teacher} as any,res,next);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);expect(res.json).not.toHaveBeenCalled();
  next.mockClear();await controller.applyLeave({body:{teacherId:'profile-colleague',teacherName:'Colleague',leaveType:'ANNUAL',startDate:'2026-11-23',endDate:'2026-11-24',reason:'Forged leave'},user:teacher} as any,res,next);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);expect(res.json).not.toHaveBeenCalled();
 });
});
