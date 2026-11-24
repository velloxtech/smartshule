// Local browser checks use synthetic accounts and never contact production.
const os=require('os');
process.chdir(require('path').resolve(__dirname,'../../../..'));
const {spawn}=require('child_process'),fs=require('fs'),http=require('http'),path=require('path');
const WebSocket=require(process.cwd()+'/Frontend/smartshule/node_modules/ws');
require(process.cwd()+'/Frontend/smartshule/node_modules/esbuild').buildSync({entryPoints:['Frontend/smartshule/tests/browser/modal-transitions.fixture.tsx'],bundle:true,format:'esm',platform:'browser',outfile:'/tmp/smartshule-modal-transitions-fixture.js',define:{'process.env.NODE_ENV':'\"production\"','import.meta.env':'{}'},logLevel:'warning'});
const dist=path.join(process.cwd(),'Frontend/smartshule/dist');let active={},chunks=0,documents=0;const apiPaths=new Set();
const user=role=>({id:'fixture-user',userId:'fixture-user',schoolId:'fixture-school',role,fullName:'Fixture User',name:'Fixture User',firstName:'Fixture',lastName:'User',email:'fixture@example.test',hasEnrolledChildren:false});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<div id="root"></div><script type="module" src="/modal-fixture.js"></script>');}
 if(url.pathname==='/modal-fixture.js'){res.setHeader('Content-Type','application/javascript');return res.end(fs.readFileSync('/tmp/smartshule-modal-transitions-fixture.js'));}
 if(url.pathname==='/slow-font.css'){res.setHeader('Content-Type','text/css');const timer=setTimeout(()=>res.end(''),20000);res.on('close',()=>clearTimeout(timer));return;}
 if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');res.end('{"status":"UP"}');return;}
 if(url.pathname.startsWith('/api/')){
  apiPaths.add(url.pathname);let data=[];const role=active.role||'TEACHER';
  if(url.pathname.endsWith('/auth/setup-status'))data={hasAdmin:true,totalUsers:1};
  else if(url.pathname.endsWith('/auth/login'))data={user:user(role),accessToken:'fixture-token',refreshToken:'fixture-refresh'};
  else if(url.pathname.endsWith('/auth/profile'))data=user(role);
  else if(url.pathname.endsWith('/academics/context'))data={currentYear:{id:'year',name:'2026'},currentTerm:{id:'term',name:'Term 3',startDate:'2026-09-01',endDate:'2026-12-01'}};
  else if(url.pathname.endsWith('/academics/school'))data={id:'fixture-school',name:'Fixture School',logoUrl:'/logo.png'};
  else if(url.pathname.endsWith('/teachers/me/profile'))data={id:'fixture-teacher',user:user(role),assignedClassStreamIds:[],specialization:[]};
  else if(url.pathname.endsWith('/academics/teacher/authorized-context'))data={assignedClasses:[],subjectAssignments:[],teacher:{id:'fixture-teacher'}};
  else if(url.pathname.endsWith('/students/guardian/me'))data={children:[],guardian:{user:user(role)}};
  else if(url.pathname.includes('/analytics/'))data={finance:{},enrolmentOverview:{classes:[]},attendanceSummary:{},recentActivities:[]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,data}));return;
 }
 if(url.pathname.includes('TeacherDashboardView')&&(active.fail==='always'||(active.fail==='once'&&chunks++===0))){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Old chunk missing');return;}
 const file=url.pathname==='/'?path.join(dist,'index.html'):path.join(dist,url.pathname.replace(/^\//,''));
 if(url.pathname==='/')documents++;
 if(!file.startsWith(dist)||!fs.existsSync(file)){res.writeHead(404);res.end('missing');return;}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png');let content=fs.readFileSync(file);if(active.slowFonts&&file.endsWith('.html'))content=Buffer.from(content.toString().replace(/https:\/\/fonts.googleapis.com\/css2[^" ]+/g,'/slow-font.css'));res.end(content);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const chrome=spawn(process.env.CHROME_BINARY||'/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'smartshule-modal-browser-'))]);let ws;
 try{
  const address=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),15000);chrome.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
  ws=new WebSocket(address);await new Promise((resolve,reject)=>{ws.on('open',resolve);ws.on('error',reject);});let sequence=0;const pending=new Map();let errors=[];let caught=[];
  ws.on('message',raw=>{const message=JSON.parse(raw);if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error'){const args=message.params.args||[];if(args.some(a=>String(a.value).includes('Portal view failed')))caught.push(args.map(a=>a.description||a.value).join(' '));}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let failed=false;
  for(const scenario of [{role:'ADMIN'},{role:'ADMIN',storageBlocked:true}]){
   active=scenario;chunks=0;documents=0;apiPaths.clear();errors=[];
   const {browserContextId}=await send('Target.createBrowserContext');const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
   await send('Page.enable',{},sessionId);await send('Runtime.enable',{},sessionId);await send('Network.enable',{},sessionId);await send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);await send('Emulation.setCPUThrottlingRate',{rate:1},sessionId);
   const setup=scenario.storageBlocked?`Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError')}});`:`localStorage.setItem('smartshule_token','fixture-token');`;
   await send('Page.addScriptToEvaluateOnNewDocument',{source:setup},sessionId);await send('Page.navigate',{url:`http://localhost:${port}/`},sessionId);
   const evaluate=async expression=>{try{return (await send('Runtime.evaluate',{expression,returnByValue:true},sessionId)).result.value;}catch(error){if(/context|navigated|closed/i.test(error.message))return undefined;throw error;}};
   await delay(500);
   for(let cycle=0;cycle<4;cycle++){
    for(const target of ['payment','tracker']){
     await evaluate(`document.querySelector('[data-test="${target}"]').click()`);await delay(150);
     let state=await evaluate(`({length:document.getElementById('root').innerText.length,error:document.body.innerText.includes('This page could not load')})`);
     for(let attempt=0;attempt<50&&state.length<=300&&!state.error;attempt++){await delay(100);state=await evaluate(`({length:document.getElementById('root').innerText.length,error:document.body.innerText.includes('This page could not load')})`);}
     const opened=state.length>300&&!state.error;
     await evaluate(`document.querySelector('[data-test="${target}"]').click()`);await delay(100);
     state=await evaluate(`({length:document.getElementById('root').innerText.length,error:document.body.innerText.includes('This page could not load')})`);
     for(let attempt=0;attempt<50&&state.length>=100&&!state.error;attempt++){await delay(100);state=await evaluate(`({length:document.getElementById('root').innerText.length,error:document.body.innerText.includes('This page could not load')})`);}
     const closed=state.length<100&&!state.error;
     const pass=opened&&closed&&errors.length===0&&caught.length===0;
     console.log(JSON.stringify({scenario,cycle,target,pass,opened,closed,errors,caught,details:pass?undefined:await evaluate(`document.body.innerText.slice(0,200)`)}));if(!pass)failed=true;
    }
   }
   await send('Target.disposeBrowserContext',{browserContextId});
  }
  if(failed)process.exitCode=1;
 }finally{if(ws)ws.close();chrome.kill('SIGTERM');server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error.stack);server.close();process.exitCode=1});
