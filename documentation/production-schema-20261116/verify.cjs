// Independent read-only, post-commit verification. PREPARE parses adapters; never EXECUTE.
const fs=require('fs');const path=require('path');const{Client}=require('pg');require('dotenv').config({quiet:true});
(async()=>{const out={startedAt:new Date().toISOString(),readOnly:true,adapterStatements:[]};const c=new Client({connectionString:process.env.ONLINE_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c statement_timeout=15000 -c application_name=smartshule_additive_postverify'});
try{await c.connect();await c.query('BEGIN READ ONLY');
 out.counts=(await c.query("SELECT 'payroll_records' table_name,count(*)::int rows FROM public.payroll_records UNION ALL SELECT 'complaints',count(*)::int FROM public.complaints UNION ALL SELECT 'transaction_reversal_requests',count(*)::int FROM public.transaction_reversal_requests")).rows;
 out.columnCounts=(await c.query("SELECT table_name,count(*)::int columns FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('payroll_records','complaints','transaction_reversal_requests') GROUP BY table_name ORDER BY table_name")).rows;
 out.indexes=(await c.query("SELECT tablename,indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'review_%' AND tablename IN ('complaints','transaction_reversal_requests') ORDER BY tablename,indexname")).rows;
 for(const[table,file]of [['payroll_records','src/infrastructure/database/postgres/PostgresPayrollRepository.ts'],['complaints','src/infrastructure/database/postgres/PostgresComplaintRepository.ts'],['transaction_reversal_requests','src/infrastructure/database/postgres/PostgresRepositories.ts']]){
 const source=fs.readFileSync(file,'utf8');const match=source.match(new RegExp('`\\s*(INSERT INTO '+table+'[\\s\\S]*?)`'));if(!match||match[1].includes('${'))throw Error('Adapter SQL extraction failed');
 await c.query('PREPARE audit_'+table+' AS '+match[1]);await c.query('DEALLOCATE audit_'+table);out.adapterStatements.push({table,prepared:true,executed:false});
 }
 out.historicalAcknowledgements=(await c.query('SELECT count(*)::int rows,count(*) FILTER(WHERE acknowledged_at IS NOT NULL OR acknowledgement_signature IS NOT NULL OR acknowledgement_status IS NOT NULL)::int populated FROM public.payroll_records')).rows[0];
 out.newTableSecurity=(await c.query("SELECT rolname,has_table_privilege(rolname,'public.transaction_reversal_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') accessible FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname")).rows;
 if(out.newTableSecurity.some(r=>r.accessible))throw Error('Unexpected browser access');
 out.preExistingUnsafeTables=(await c.query("SELECT count(*)::int tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity AND has_table_privilege('anon',c.oid,'SELECT')")).rows[0].tables;
 await c.query('ROLLBACK');out.success=true;
}finally{await c.end();}out.completedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'post-verification.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));})().catch(e=>{console.error('Post-verification failed:',e.code||e.message);process.exitCode=1});
