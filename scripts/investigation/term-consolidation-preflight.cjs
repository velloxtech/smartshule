// Read-only discovery. Private snapshots stay outside the repository.
const fs=require('fs'),crypto=require('crypto'),{Client}=require('pg');require('dotenv').config({quiet:true});
const q=s=>'"'+s.replace(/"/g,'""')+'"';
(async()=>{const url=process.env.ONLINE_DATABASE_URL;if(!url)throw Error('ONLINE_DATABASE_URL required');
const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,options:'-c statement_timeout=60000 -c application_name=smartshule_term_consolidation_preflight'});
try{await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
const out={at:new Date().toISOString(),targetFingerprint:crypto.createHash('sha256').update(url).digest('hex')};
out.terms=(await c.query('SELECT t.*,y.name year_name,y.school_id,y.is_current year_current FROM public.academic_terms t JOIN public.academic_years y ON y.id=t.academic_year_id ORDER BY y.school_id,t.academic_year_id,t.term_number,t.id')).rows;
const groups=Object.values(Object.groupBy(out.terms,t=>t.academic_year_id+':'+t.term_number)).filter(g=>g.length>1);out.groups=groups;
out.constraints=(await c.query("SELECT conrelid::regclass::text relation,conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid,conname")).rows;
out.columns=(await c.query("SELECT c.table_name,c.column_name,c.data_type,c.udt_name FROM information_schema.columns c JOIN information_schema.tables t USING(table_catalog,table_schema,table_name) WHERE c.table_schema='public' AND t.table_type='BASE TABLE' ORDER BY c.table_name,c.ordinal_position")).rows;
out.references=[];out.embedded=[];const ids=groups.flat().map(t=>t.id);
for(const col of out.columns.filter(r=>['text','character varying','json','jsonb','ARRAY'].includes(r.data_type))){const table='public.'+q(col.table_name),column=q(col.column_name);const scalar=['text','character varying'].includes(col.data_type);
const exact=scalar?(await c.query(`SELECT ${column} value,count(*)::int count FROM ${table} WHERE ${column}=ANY($1::text[]) GROUP BY ${column}`,[ids])).rows:[];
if(exact.length)out.references.push({...col,counts:exact});
// Find embedded IDs in configuration keys, JSON documents, array values and text.
const hits=(await c.query(`SELECT count(*)::int count FROM ${table} WHERE EXISTS(SELECT 1 FROM unnest($1::text[]) i WHERE strpos(${column}::text,i)>0)${scalar?` AND NOT (${column}=ANY($1::text[]))`:''}`,[ids])).rows[0].count;
if(hits)out.embedded.push({...col,count:hits});}
await c.query('ROLLBACK');fs.mkdirSync('/tmp/smartshule-term-consolidation-20261116',{recursive:true,mode:0o700});fs.writeFileSync('/tmp/smartshule-term-consolidation-20261116/preflight.json',JSON.stringify(out,null,2),{mode:0o600});console.log(JSON.stringify({at:out.at,groups:out.groups,references:out.references,embedded:out.embedded,constraints:out.constraints.filter(r=>/term|planning|timetable/i.test(r.relation+' '+r.definition))},null,2));
}finally{await c.end();}})().catch(e=>{console.error('Read-only preflight failed:',e.code||e.message);process.exitCode=1});
