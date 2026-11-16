// Explicitly authorized additive production repair. No app startup, DML or seed imports.
// Guarded by a reviewed read-only preflight; no credentials or row contents are logged.
const fs=require('fs');const path=require('path');const crypto=require('crypto');const {Client}=require('pg');require('dotenv').config({quiet:true});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');const quote=s=>'"'+s.replace(/"/g,'""')+'"';
(async()=>{
 if(process.argv[2]!=='--apply-authorized-additions')throw Error('Explicit apply flag required');
 const pre=JSON.parse(fs.readFileSync('/tmp/smartshule-review-20261116/production-schema-preflight.json','utf8'));
 const url=process.env.ONLINE_DATABASE_URL;if(!url||sha(url)!==pre.targetFingerprint)throw Error('Production target differs from reviewed preflight');
 if(Date.now()-Date.parse(pre.completedAt)>3600000)throw Error('Preflight is stale; rerun and review');
 const migration='database/migrations/20261116_add_missing_payroll_complaint_and_reversal_schema.sql';
 const sql=fs.readFileSync(migration,'utf8');
 // Never silently execute destructive SQL or business DML through this runner.
 if(/\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\s+(TABLE|FROM|INTO|public\.|payroll_records|complaints)/i.test(sql.replace(/--[^\n]*/g,'')))throw Error('Unexpected destructive or data-writing statement');
 const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c statement_timeout=15000 -c lock_timeout=2000 -c application_name=smartshule_authorized_additive_repair'});
 const out={startedAt:new Date().toISOString(),migration,migrationSha256:sha(sql),sourcePreflightAt:pre.completedAt,committed:false,checks:{}};let began=false;
 const columns=async()=> (await c.query("SELECT table_name,column_name,data_type,udt_name,character_maximum_length,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('payroll_records','complaints','transaction_reversal_requests','payroll_teacher_link_reviews') ORDER BY table_name,ordinal_position")).rows;
 const fingerprint=async(table,cols)=> (await c.query(`SELECT count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY t.id),'')) original_values_digest FROM (SELECT ${cols.map(quote).join(',')} FROM public.${quote(table)}) t`)).rows[0];
 try{
 await c.connect();await c.query('BEGIN');began=true;await c.query('SET LOCAL search_path=public,pg_catalog');
 const lock=(await c.query('SELECT pg_try_advisory_xact_lock(64020261116::bigint) acquired')).rows[0];if(!lock.acquired)throw Error('Another repair is in progress');
 await c.query('LOCK TABLE public.payroll_records, public.complaints IN ACCESS EXCLUSIVE MODE NOWAIT');
 const oldCols=await columns();if(JSON.stringify(oldCols)!==JSON.stringify(pre.checks.columns))throw Error('Schema changed since preflight; review again');
 if(oldCols.some(r=>r.table_name==='transaction_reversal_requests'))throw Error('Unexpected existing reversal table; review before proceeding');
 out.checks.before={};const oldNames={};
 for(const table of ['payroll_records','complaints']){oldNames[table]=oldCols.filter(r=>r.table_name===table).map(r=>r.column_name);out.checks.before[table]=await fingerprint(table,oldNames[table]);}
 const tablesBefore=(await c.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname")).rows.map(r=>r.relname);
 await c.query(sql.replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,''));
 const afterCols=await columns();out.checks.after={};
 for(const table of Object.keys(oldNames)){
  out.checks.after[table]=await fingerprint(table,oldNames[table]);
  if(JSON.stringify(out.checks.before[table])!==JSON.stringify(out.checks.after[table]))throw Error('Original values changed; aborting');
  for(const col of oldCols.filter(r=>r.table_name===table)){if(!afterCols.some(r=>JSON.stringify(r)===JSON.stringify(col)))throw Error('Original column definition changed; aborting');}
 }
 out.checks.columnsAdded=afterCols.filter(a=>!oldCols.some(b=>a.table_name===b.table_name&&a.column_name===b.column_name)).map(r=>({table:r.table_name,column:r.column_name,type:r.data_type}));
 if(out.checks.columnsAdded.filter(r=>r.table==='payroll_records').length!==7||out.checks.columnsAdded.filter(r=>r.table==='complaints').length!==38||out.checks.columnsAdded.filter(r=>r.table==='transaction_reversal_requests').length!==33)throw Error('Unexpected column delta');
 const tablesAfter=(await c.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname")).rows.map(r=>r.relname);
 if(tablesBefore.some(t=>!tablesAfter.includes(t)))throw Error('Original table missing');
 out.checks.tableDelta=tablesAfter.filter(t=>!tablesBefore.includes(t));if(JSON.stringify(out.checks.tableDelta)!==JSON.stringify(['transaction_reversal_requests']))throw Error('Unexpected table changes');
 out.checks.browserRoles=(await c.query("SELECT rolname,has_table_privilege(rolname,'public.transaction_reversal_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') table_access,has_any_column_privilege(rolname,'public.transaction_reversal_requests','SELECT,INSERT,UPDATE') column_access FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname")).rows;
 if(out.checks.browserRoles.length!==2||out.checks.browserRoles.some(r=>r.table_access||r.column_access))throw Error('New table exposed to browser roles');
 out.checks.reversal=(await c.query("SELECT relrowsecurity,(SELECT count(*)::int FROM public.transaction_reversal_requests) rows,has_table_privilege(current_user,'public.transaction_reversal_requests','SELECT,INSERT,UPDATE,DELETE') backend_access FROM pg_class WHERE oid='public.transaction_reversal_requests'::regclass")).rows[0];
 if(!out.checks.reversal.relrowsecurity||!out.checks.reversal.backend_access||out.checks.reversal.rows!==0)throw Error('Unexpected reversal access or data');
 for(const table of ['payroll_records','complaints','transaction_reversal_requests'])await c.query(`SELECT * FROM public.${quote(table)} LIMIT 0`);
 await c.query('COMMIT');began=false;out.committed=true;out.completedAt=new Date().toISOString();
 }catch(e){if(began)await c.query('ROLLBACK').catch(()=>{});out.errorCode=e.code||'CHECK_FAILED';out.completedAt=new Date().toISOString();throw e;}
 finally{await c.end();fs.writeFileSync(path.join(__dirname,'application-result.json'),JSON.stringify(out,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(out));}
})().catch(e=>{console.error('Additive repair failed:',e.code||e.message);process.exitCode=1});
