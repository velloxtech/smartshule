// Deliberately bypasses application startup, migrations, seeds and repositories.
const {Client}=require('pg');
const fs=require('fs');
require('dotenv').config({quiet:true});
(async()=>{
 const url=process.env.ONLINE_DATABASE_URL || process.env.DATABASE_URL;
 const client=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on -c statement_timeout=30000'});
 try {
 await client.connect();
 await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const snapshot={capturedAt:new Date().toISOString()};
 for(const table of ['summative_assessments','cbc_report_cards','learning_areas','global_subjects','students','academic_terms','schools','lesson_plans','schemes_of_work']){
   snapshot[table]=(await client.query(`SELECT * FROM ${table}`)).rows;
 }
 snapshot.schema_columns=(await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('lunch_payments','parent_consent_requests','lesson_plans','summative_assessments')")).rows;
 await client.query('ROLLBACK');
 fs.writeFileSync('/tmp/smartshule-production-evidence.json',JSON.stringify(snapshot),{mode:0o600});
 console.log(JSON.stringify(Object.fromEntries(Object.entries(snapshot).map(([k,v])=>[k,Array.isArray(v)?v.length:v]))));
 } finally {await client.end();}
})().catch(e=>{console.error(e.code || e.message);process.exitCode=1});
