// Read-only production schema preflight. No application container/startup is imported.
const fs=require('fs');const crypto=require('crypto');const {Client}=require('pg');require('dotenv').config({quiet:true});
(async()=>{
 const url=process.env.ONLINE_DATABASE_URL;if(!url)throw Error('ONLINE_DATABASE_URL is required');
 const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c statement_timeout=15000 -c application_name=smartshule_additive_preflight'});
 const out={capturedAt:new Date().toISOString(),targetFingerprint:crypto.createHash('sha256').update(url).digest('hex'),checks:{}};
 try{await c.connect();await c.query('BEGIN READ ONLY');
 const queries={
 identity:`SELECT current_user,version(),(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) bypass_rls`,
 columns:`SELECT table_name,column_name,data_type,udt_name,character_maximum_length,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('payroll_records','complaints','transaction_reversal_requests','payroll_teacher_link_reviews') ORDER BY table_name,ordinal_position`,
 owners:`SELECT c.relname,pg_get_userbyid(c.relowner) owner,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('payroll_records','complaints','transaction_reversal_requests')`,
 counts:`SELECT 'payroll_records' table_name,count(*)::int rows FROM public.payroll_records UNION ALL SELECT 'complaints',count(*)::int FROM public.complaints`,
 indexes:`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('payroll_records','complaints','transaction_reversal_requests')`,
 roles:`SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN (current_user,'anon','authenticated','service_role')`,
 constraints:`SELECT conrelid::regclass::text relation,conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid IN ('public.payroll_records'::regclass,'public.complaints'::regclass)`};
 for(const [name,sql]of Object.entries(queries))out.checks[name]=(await c.query(sql)).rows;
 await c.query('ROLLBACK');
 }finally{await c.end();}
 out.completedAt=new Date().toISOString();fs.writeFileSync('/tmp/smartshule-review-20261116/production-schema-preflight.json',JSON.stringify(out,null,2),{mode:0o600});
 console.log(JSON.stringify(out));
})().catch(e=>{console.error('Preflight failed:',e.code||e.message);process.exitCode=1});
