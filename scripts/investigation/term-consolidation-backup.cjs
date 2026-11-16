const fs=require('fs'),crypto=require('crypto'),{spawnSync}=require('child_process');require('dotenv').config({quiet:true});
const dir='/tmp/smartshule-term-consolidation-20261116';fs.mkdirSync(dir,{recursive:true,mode:0o700});
const u=new URL(process.env.ONLINE_DATABASE_URL||'');if(!/supabase/.test(u.hostname))throw Error('Expected reviewed Supabase connection');
const file=dir+'/public-before.dump';if(fs.existsSync(file))throw Error('Refusing to overwrite backup');
const env={PATH:process.env.PATH,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:'require',PGCONNECT_TIMEOUT:'20'};
const r=spawnSync('/usr/lib/postgresql/17/bin/pg_dump',['--format=custom','--schema=public','--no-owner','--no-privileges','--file='+file],{env,encoding:'utf8',timeout:180000});if(r.status!==0){console.error('Backup failed',r.stderr?.replaceAll(env.PGPASSWORD,'[REDACTED]'));process.exit(1);}fs.chmodSync(file,0o600);console.log(JSON.stringify({backup:file,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
