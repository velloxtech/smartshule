import fs from 'fs';
import path from 'path';
import {Pool,PoolClient} from 'pg';
import request from 'supertest';
import {AppContainer} from '../../../src/infrastructure/container';
import {createExpressApp} from '../../../src/infrastructure/http/app';
import {PostgresAcademicRepository,PostgresUserRepository,PostgresStudentRepository,PostgresTeacherRepository,PostgresGuardianRepository,PostgresFeeRepository} from '../../../src/infrastructure/database/postgres/PostgresRepositories';
import {PostgresPayrollRepository} from '../../../src/infrastructure/database/postgres/PostgresPayrollRepository';
import {PostgresComplaintRepository} from '../../../src/infrastructure/database/postgres/PostgresComplaintRepository';
import {UserRole} from '../../../src/core/domain/user/User';
import {PayrollRecord} from '../../../src/core/domain/payroll/PayrollRecord';
import {Complaint} from '../../../src/core/domain/complaint/Complaint';
import {TransactionReversalRequest,ReversibleTransactionType,TransactionReversalStatus} from '../../../src/core/domain/finance/TransactionReversalRequest';

const url=process.env.SMARTSHULE_REVIEW_DATABASE_URL;
if(!url)throw new Error('Explicit disposable review DB is required; no DATABASE_URL fallback.');
const parsed=new URL(url);
if(parsed.hostname!=='127.0.0.1'||parsed.port!=='55471'||parsed.pathname!=='/smartshule_audit_review_20261116')throw new Error('Refusing any non-isolated database.');
const base=path.resolve(__dirname,'..');
const proposal=(name:string)=>fs.readFileSync(path.join(base,'proposals',name),'utf8');
let owner:Pool,backend:Pool;
const asRole=async(role:string,sql:string)=>{const c=await owner.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE '+role);return await c.query(sql);}finally{await c.query('ROLLBACK');c.release();}};
const salary=()=>PayrollRecord.create({schoolId:'review-school',teacherId:'EMP-REVIEW-A',teacherName:'Synthetic staff A',month:'2026-11',basicSalary:1000,houseAllowance:0,commuterAllowance:0,responsibilityAllowance:0,grossSalary:1000,nssf:0,shif:0,housingLevy:0,paye:0,otherDeductions:0,totalDeductions:0,netSalary:1000,status:'PAID',amountPaid:1000,balance:0},'review-salary');

beforeAll(async()=>{
 owner=new Pool({connectionString:url});
 const directory=(await owner.query('SHOW data_directory')).rows[0].data_directory;
 if(directory!=='/tmp/smartshule-review-20261116/pgdata')throw new Error('Refusing schema reset outside the disposable cluster.');
 await owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 for(const role of ['anon','authenticated','service_role','supabase_admin','review_backend']){
  const exists=(await owner.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount;
  if(!exists)await owner.query(`CREATE ROLE ${role} ${role==='review_backend'?'LOGIN BYPASSRLS':role==='service_role'?'NOLOGIN BYPASSRLS':'NOLOGIN'}`);
 }
 await owner.query(fs.readFileSync(path.join(__dirname,'observed_schema.sql'),'utf8'));
 await owner.query(`GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role,review_backend;
 GRANT CREATE,USAGE ON SCHEMA public TO supabase_admin;
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role,review_backend;
 GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role,review_backend;
 GRANT SELECT ON payments TO PUBLIC;
 CREATE FUNCTION public.review_private_rpc() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT count(*)::int FROM public.payments';
 GRANT EXECUTE ON FUNCTION public.review_private_rpc() TO review_backend,PUBLIC;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
 ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated;
 ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;
 ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT SELECT ON TABLES TO anon;
 ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin GRANT SELECT ON TABLES TO authenticated;`);
 await owner.query(`INSERT INTO schools(id,name,code,email,phone,address,currency)VALUES('review-school','Synthetic review school','REVIEW','review@example.test','000','Synthetic','KES');
 INSERT INTO users(id,email,password_hash,first_name,last_name,role,status,school_id)VALUES
 ('review-admin','admin@example.test','test-only','Review','Admin','ADMIN','ACTIVE','review-school'),
 ('review-staff-a','staff-a@example.test','test-only','Staff','A','TEACHER','ACTIVE','review-school'),
 ('review-staff-b','staff-b@example.test','test-only','Staff','B','TEACHER','ACTIVE','review-school');
 INSERT INTO teachers(id,user_id,employee_number,assigned_class_stream_ids)VALUES('review-profile-a','review-staff-a','EMP-REVIEW-A','[]'),('review-profile-b','review-staff-b','EMP-REVIEW-B','[]');
 INSERT INTO students(id,admission_number,first_name,last_name,date_of_birth,gender,grade_level,school_id,academic_year_id,guardian_ids)VALUES('review-learner','REVIEW-1','Synthetic','Learner','2016-01-01','FEMALE','GRADE_4','review-school','review-year','[]');
 INSERT INTO payments(id,school_id,student_id,receipt_number,amount,payment_method,transaction_reference,payment_date,recorded_by_user_id,status)VALUES('review-receipt','review-school','review-learner','REVIEW-RECEIPT',100,'CASH','REVIEW-TXN','2026-11-16','review-admin','COMPLETED');
`);
 const backupColumns=(await owner.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='students_backup_20261028_104417' ORDER BY ordinal_position")).rows.map(row=>'"'+row.column_name+'"').join(',');
 await owner.query(`INSERT INTO students_backup_20261028_104417(${backupColumns})SELECT ${backupColumns} FROM students`);
 backend=new Pool({connectionString:url!.replace('postgres@','review_backend@')});
});
afterAll(async()=>{await backend?.end();await owner?.end();});

test('F01/F13: synthetic observed grants reproduce anonymous private-table/backup access',async()=>{
 expect((await asRole('anon','SELECT count(*)::int n FROM payments')).rows[0].n).toBe(1);
 expect((await asRole('authenticated','SELECT count(*)::int n FROM students_backup_20261028_104417')).rows[0].n).toBe(1);
});
test('F02/F03: current repositories fail on the observed schema before additive proposals',async()=>{
 await expect(new PostgresPayrollRepository(backend).savePayroll(salary())).rejects.toMatchObject({code:'42703'});
 await expect(new PostgresComplaintRepository(backend).create(Complaint.create({schoolId:'review-school',title:'Synthetic concern',description:'Review only'},'review-concern'))).rejects.toMatchObject({code:'42703'});
 expect((await owner.query("SELECT to_regclass('public.transaction_reversal_requests') present")).rows[0].present).toBeNull();
});
test('F01/F13: apply the permission proposal twice without changing private rows/backend grants',async()=>{
 for(let i=0;i<2;i++)await owner.query(proposal('001_private_browser_permissions.sql'));
 for(const role of ['anon','authenticated'])for(const sql of ['SELECT count(*) FROM payments','SELECT count(*) FROM students_backup_20261028_104417','UPDATE payments SET amount=0 WHERE false','DELETE FROM payments WHERE false','TRUNCATE payments','SELECT review_private_rpc()'])await expect(asRole(role,sql)).rejects.toMatchObject({code:'42501'});
 expect((await backend.query('SELECT amount FROM payments WHERE id=$1',['review-receipt'])).rows[0].amount).toBe('100');
 await backend.query("UPDATE payments SET notes='Synthetic backend update' WHERE id='review-receipt'");
 expect((await backend.query('SELECT review_private_rpc() n')).rows[0].n).toBe(1);
 expect((await asRole('service_role','SELECT count(*)::int n FROM payments')).rows[0].n).toBe(1);
});
test('F01: inherited backend membership fails verification instead of silently claiming containment',async()=>{
 await owner.query('GRANT review_backend TO anon');
 try{await expect(owner.query(proposal('001_private_browser_permissions.sql'))).rejects.toMatchObject({code:'P0001'});}
 finally{await owner.query('ROLLBACK');await owner.query('REVOKE review_backend FROM anon');}
 await owner.query(proposal('001_private_browser_permissions.sql'));
});
test('F01: creator-specific defaults deny future tables, sequences and functions, including PUBLIC fallback',async()=>{
 for(const creator of ['postgres','supabase_admin']){
  const c=await owner.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE '+creator);await c.query(`CREATE TABLE future_${creator}(id integer);CREATE SEQUENCE future_seq_${creator};CREATE FUNCTION future_rpc_${creator}() RETURNS integer LANGUAGE sql AS 'SELECT 1'`);await c.query('COMMIT');}finally{c.release();}
  for(const role of ['anon','authenticated']){
   await expect(asRole(role,`SELECT * FROM future_${creator}`)).rejects.toMatchObject({code:'42501'});
   await expect(asRole(role,`SELECT nextval('future_seq_${creator}')`)).rejects.toMatchObject({code:'42501'});
   await expect(asRole(role,`SELECT future_rpc_${creator}()`)).rejects.toMatchObject({code:'42501'});
  }
 }
});
test('F02/F03/F10: additive proposals are repeatable; historical paid salary remains unacknowledged',async()=>{
 // Model an existing paid row before acknowledgement fields are added.
 await owner.query("INSERT INTO payroll_records(id,school_id,teacher_id,teacher_name,month,basic_salary,gross_salary,total_deductions,net_salary,status,amount_paid,balance)VALUES('legacy-paid','review-school','EMP-REVIEW-A','Synthetic A','2026-10',1000,1000,0,1000,'PAID',1000,0)");
 for(let i=0;i<2;i++){await owner.query(fs.readFileSync(path.join(process.cwd(),'database/migrations/20261116_add_missing_payroll_complaint_and_reversal_schema.sql'),'utf8'));await owner.query(proposal('004_reviewed_salary_identity_bridge.sql'));}
 // New tables require explicit backend grants; the permission proposal does not invent credentials.
 await owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON transaction_reversal_requests,payroll_teacher_link_reviews TO review_backend');
 const existing=await new PostgresPayrollRepository(backend).findPayrollById('legacy-paid');
 expect(existing!.toJSON().acknowledgementStatus).toBe('AWAITING_ACKNOWLEDGEMENT');
 expect(existing!.toJSON().acknowledgedAt).toBeUndefined();
 expect(existing!.toJSON().amountPaid).toBe(1000);
});
test('F02: actual payroll and complaint adapters persist/reload after the proposal',async()=>{
 const payroll=new PostgresPayrollRepository(backend);await payroll.savePayroll(salary());expect((await payroll.findPayrollById('review-salary'))!.netSalary).toBe(1000);
 const concerns=new PostgresComplaintRepository(backend);await concerns.create(Complaint.create({schoolId:'review-school',referenceNumber:'REVIEW-CONCERN',title:'Synthetic concern',description:'Review only',parentUserId:'review-staff-a',messages:[],attachments:[]},'review-concern'));
 const restored=await concerns.findById('review-concern');expect(restored!.toJSON().referenceNumber).toBe('REVIEW-CONCERN');expect(restored!.toJSON().parentUserId).toBe('review-staff-a');
});
test('F03: actual reversal request adapter persists; concurrent active requests are rejected',async()=>{
 const repository=new PostgresFeeRepository(backend);
 const props={schoolId:'review-school',transactionType:ReversibleTransactionType.PAYMENT,transactionId:'review-receipt',transactionReference:'REVIEW-TXN',studentId:'review-learner',studentName:'Synthetic Learner',admissionNumber:'REVIEW-1',originalAmount:100,requestedReversalAmount:100,transactionDate:'2026-11-16',reason:'Isolated review',status:TransactionReversalStatus.PENDING_ADMIN_APPROVAL,requestedByUserId:'review-admin',requestedByName:'Review Admin',requestedByRole:'ADMIN'};
 await repository.saveReversalRequest(TransactionReversalRequest.create({...props,requestReference:'REVIEW-REV-1'},'review-reversal'));
 expect((await repository.findReversalRequestById('review-reversal'))!.transactionId).toBe('review-receipt');
 await expect(repository.saveReversalRequest(TransactionReversalRequest.create({...props,requestReference:'REVIEW-REV-2'},'review-reversal-2'))).rejects.toMatchObject({code:'23505'});
 expect((await backend.query('SELECT amount FROM payments WHERE id=$1',['review-receipt'])).rows[0].amount).toBe('100');
});
test('F10: proposed reviewed bridge reveals existing salaries only to the linked account without regeneration',async()=>{
 const repository=new PostgresPayrollRepository(backend);expect(await repository.findPayrollsByTeacher('review-profile-a')).toEqual([]);
 const before=(await backend.query('SELECT id,teacher_id,net_salary,amount_paid,status FROM payroll_records ORDER BY id')).rows;
 await backend.query("INSERT INTO payroll_teacher_link_reviews(payroll_record_id,school_id,teacher_profile_id,original_teacher_reference,reviewed_by_user_id,review_reason)VALUES('legacy-paid','review-school','review-profile-a','EMP-REVIEW-A','review-admin','Synthetic verified review')");
 const query=`SELECT p.id FROM payroll_records p JOIN teachers t ON t.user_id=$1 JOIN users u ON u.id=t.user_id AND u.school_id=$2 LEFT JOIN payroll_teacher_link_reviews m ON m.payroll_record_id=p.id WHERE p.school_id=$2 AND(p.teacher_id=t.id OR(m.teacher_profile_id=t.id AND m.school_id=p.school_id AND m.original_teacher_reference=p.teacher_id)) ORDER BY p.id`;
 expect((await backend.query(query,['review-staff-a','review-school'])).rows).toEqual([{id:'legacy-paid'}]);
 expect((await backend.query(query,['review-staff-b','review-school'])).rows).toEqual([]);
 expect((await backend.query(query,['review-staff-a','other-school'])).rows).toEqual([]);
 expect((await backend.query('SELECT id,teacher_id,net_salary,amount_paid,status FROM payroll_records ORDER BY id')).rows).toEqual(before);
});
test('F01: authorised backend API still lists school/learners while browser roles cannot read the same tables',async()=>{
 const c=new AppContainer({academicRepository:new PostgresAcademicRepository(backend),userRepository:new PostgresUserRepository(backend),studentRepository:new PostgresStudentRepository(backend),teacherRepository:new PostgresTeacherRepository(backend),guardianRepository:new PostgresGuardianRepository(backend),feeRepository:new PostgresFeeRepository(backend),payrollRepository:new PostgresPayrollRepository(backend)});
 const app=createExpressApp(c);const token=c.tokenService.generateAccessToken({userId:'review-admin',email:'admin@example.test',role:UserRole.ADMIN,schoolId:'review-school'});
 const result=await request(app).get('/api/v1/students').set('Authorization','Bearer '+token);
 expect(result.status).toBe(200);expect(result.body.data.map((row:any)=>row.id)).toEqual(['review-learner']);
 await expect(asRole('anon','SELECT * FROM students')).rejects.toMatchObject({code:'42501'});
});
test('F01: authorised admin payroll list survives grants changes without permitting staff impersonation',async()=>{
 const c=new AppContainer({academicRepository:new PostgresAcademicRepository(backend),userRepository:new PostgresUserRepository(backend),studentRepository:new PostgresStudentRepository(backend),teacherRepository:new PostgresTeacherRepository(backend),guardianRepository:new PostgresGuardianRepository(backend),feeRepository:new PostgresFeeRepository(backend),payrollRepository:new PostgresPayrollRepository(backend)});
 const app=createExpressApp(c);const token=(userId:string,role:UserRole)=>'Bearer '+c.tokenService.generateAccessToken({userId,email:userId+'@example.test',role,schoolId:'review-school'});
 const list=await request(app).get('/api/v1/payroll').set('Authorization',token('review-admin',UserRole.ADMIN));expect(list.status).toBe(200);expect(list.body.data.map((row:any)=>row.id)).toEqual(['review-salary']);
 const denied=await request(app).get('/api/v1/payroll').set('Authorization',token('review-staff-b',UserRole.TEACHER));expect(denied.status).toBe(403);
});
test('F01: actual linked-parent portal still works through backend while an unrelated parent is denied',async()=>{
 await backend.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role,status,school_id)VALUES('review-parent','parent@example.test','test-only','Synthetic','Parent','PARENT','ACTIVE','review-school'),('review-unrelated','unrelated@example.test','test-only','Unrelated','Parent','PARENT','ACTIVE','review-school');
 INSERT INTO guardians(id,user_id,relationship,emergency_contact,student_ids)VALUES('review-guardian','review-parent','PARENT','000','["review-learner"]');
 UPDATE students SET guardian_ids='["review-guardian"]' WHERE id='review-learner';
 INSERT INTO student_parent_links(id,school_id,parent_user_id,guardian_id,student_id,relationship_type,is_primary,can_view_academics,can_view_finances)VALUES('review-parent-link','review-school','review-parent','review-guardian','review-learner','PARENT',true,true,true)`);
 const c=new AppContainer({academicRepository:new PostgresAcademicRepository(backend),userRepository:new PostgresUserRepository(backend),studentRepository:new PostgresStudentRepository(backend),teacherRepository:new PostgresTeacherRepository(backend),guardianRepository:new PostgresGuardianRepository(backend),feeRepository:new PostgresFeeRepository(backend)});
 const app=createExpressApp(c);const token=(id:string)=>'Bearer '+c.tokenService.generateAccessToken({userId:id,email:id+'@example.test',role:UserRole.PARENT,schoolId:'review-school'});
 const portal=await request(app).get('/api/v1/students/guardian/me').set('Authorization',token('review-parent'));expect(portal.status).toBe(200);expect(portal.body.data.children.map((row:any)=>row.id)).toEqual(['review-learner']);
 const other=await request(app).get('/api/v1/students/review-learner').set('Authorization',token('review-unrelated'));expect(other.status).toBe(403);
});
test('F01/F13: every existing public table, including new proposal tables, denies browser SELECT and DML',async()=>{
 const result=await owner.query(`SELECT r.role_name,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN(VALUES('anon'),('authenticated'))r(role_name) WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f') AND(has_table_privilege(r.role_name,c.oid,'SELECT')OR has_table_privilege(r.role_name,c.oid,'INSERT')OR has_table_privilege(r.role_name,c.oid,'UPDATE')OR has_table_privilege(r.role_name,c.oid,'DELETE')OR has_table_privilege(r.role_name,c.oid,'TRUNCATE'))`);
 expect(result.rows).toEqual([]);
});
