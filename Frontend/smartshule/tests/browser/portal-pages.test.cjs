// Local browser checks use synthetic accounts and never contact production.
const os=require('os');
process.chdir(require('path').resolve(__dirname,'../../../..'));
const {spawn}=require('child_process'),fs=require('fs'),http=require('http'),path=require('path');
const WebSocket=require(process.cwd()+'/Frontend/smartshule/node_modules/ws');
const dist=path.join(process.cwd(),'Frontend/smartshule/dist');let active={},chunks=0,documents=0;const apiPaths=new Set();
const user=role=>({id:'fixture-user',userId:'fixture-user',schoolId:'fixture-school',role,fullName:'Fixture User',name:'Fixture User',firstName:'Fixture',lastName:'User',email:'fixture@example.test',hasEnrolledChildren:false});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');
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
  res.setHeader('Content-Type','application/json');if(active.apiFailure&&!/auth\/|academics\/(context|school)$/.test(url.pathname)){res.statusCode=503;res.end(JSON.stringify({success:false,message:'Fixture: temporary data outage'}));return;}res.end(JSON.stringify({success:true,data}));return;
 }
 if(url.pathname.includes('TeacherDashboardView')&&(active.fail==='always'||(active.fail==='once'&&chunks++===0))){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Old chunk missing');return;}
 const file=url.pathname==='/'?path.join(dist,'index.html'):path.join(dist,url.pathname.replace(/^\//,''));
 if(url.pathname==='/')documents++;
 if(!file.startsWith(dist)||!fs.existsSync(file)){res.writeHead(404);res.end('missing');return;}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png');let content=fs.readFileSync(file);if(active.slowFonts&&file.endsWith('.html'))content=Buffer.from(content.toString().replace(/https:\/\/fonts.googleapis.com\/css2[^" ]+/g,'/slow-font.css'));res.end(content);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const chrome=spawn(process.env.CHROME_BINARY||'/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'smartshule-page-browser-'))]);let ws;
 try{
  const address=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),15000);chrome.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
  ws=new WebSocket(address);await new Promise((resolve,reject)=>{ws.on('open',resolve);ws.on('error',reject);});let sequence=0;const pending=new Map();let errors=[];let caught=[];
  ws.on('message',raw=>{const message=JSON.parse(raw);if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error'){const args=message.params.args||[];if(args.some(a=>String(a.value).includes('Portal view failed')))caught.push(args.map(a=>a.description||a.value).join(' '));}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let failed=false;
  for(const scenario of [{role:'SUPER_ADMIN'},{role:'TEACHER'},{role:'PARENT'},{role:'SUPER_ADMIN',storageBlocked:true,mobile:true},{role:'SUPER_ADMIN',apiFailure:true},{role:'HEAD_TEACHER',dashboardOnly:true},{role:'DEPUTY_HEAD_TEACHER',dashboardOnly:true},{role:'ADMISSIONS',dashboardOnly:true},{role:'BURSAR',dashboardOnly:true},{role:'ACCOUNTANT',dashboardOnly:true},{role:'STUDENT',dashboardOnly:true}]){
   active=scenario;chunks=0;documents=0;apiPaths.clear();errors=[];
   const {browserContextId}=await send('Target.createBrowserContext');const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
   await send('Page.enable',{},sessionId);await send('Runtime.enable',{},sessionId);await send('Network.enable',{},sessionId);await send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:scenario.mobile?375:1440,height:1000,deviceScaleFactor:1,mobile:!!scenario.mobile},sessionId);await send('Emulation.setCPUThrottlingRate',{rate:1},sessionId);
   const setup=scenario.storageBlocked?`Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError')}});`:`localStorage.setItem('smartshule_token','fixture-token');`;
   await send('Page.addScriptToEvaluateOnNewDocument',{source:setup},sessionId);await send('Page.navigate',{url:`http://localhost:${port}/`},sessionId);
   const evaluate=async expression=>{try{return (await send('Runtime.evaluate',{expression,returnByValue:true},sessionId)).result.value;}catch(error){if(/context|navigated|closed/i.test(error.message))return undefined;throw error;}};
   if(scenario.storageBlocked){
    for(let i=0;i<80;i++){await delay(150);const clicked=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Portal Login|School Portal|Log in|Sign in/i.test(b.innerText)&&b.getBoundingClientRect().width);if(b){b.click();return true;}return false;})()`);if(clicked)break;}
    for(let i=0;i<60;i++){await delay(100);if(await evaluate(`Boolean(document.querySelector('input[type=password]'))`))break;}
    const filled=await evaluate(`(()=>{const email=document.querySelector('input[type=text],input[type=email]'),password=document.querySelector('input[type=password]');if(!email||!password)return false;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(email,'fixture@example.test');email.dispatchEvent(new Event('input',{bubbles:true}));email.dispatchEvent(new Event('change',{bubbles:true}));setter.call(password,'fixture-password');password.dispatchEvent(new Event('input',{bubbles:true}));password.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
    if(filled){await delay(150);await evaluate(`document.querySelector('input[type=password]').closest('form').requestSubmit()`);}
   }
   let state;
   for(let i=0;i<100;i++){await delay(150);state=await evaluate(`({text:document.getElementById('root')?.innerText||'',error:document.body.innerText.includes('This page could not load'),portal:document.body.innerText.includes('System Online'),pending:Boolean(document.querySelector('main > .animate-pulse')),url:location.href})`);if(!state)continue;if(state.error||(state.portal&&state.text.length>500&&!state.pending))break;}
   await delay(600);state=await evaluate(`({text:document.getElementById('root')?.innerText||'',error:document.body.innerText.includes('This page could not load'),portal:document.body.innerText.includes('System Online'),pending:Boolean(document.querySelector('main > .animate-pulse')),url:location.href})`);
   const expectedError=scenario.fail==='always';const ok=state.text.length>100&&(expectedError?state.error:!state.error&&state.portal&&!state.pending)&&(!scenario.fail||documents<=2)&&errors.length===0;
   console.log(JSON.stringify({scenario,ok,bodyCharacters:state.text.length,errorScreen:state.error,documents,apiRequests:apiPaths.size,paths:[...apiPaths],errors:errors.slice(0,2),text:ok?undefined:state.text.slice(0,300)}));if(!ok)failed=true;
   const modules=scenario.dashboardOnly?[]:await evaluate(`Array.from(document.querySelectorAll('aside button[aria-expanded]')).map(b=>b.title)`);
   for(const moduleTitle of modules){
    await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('aside button[aria-expanded]')).find(b=>b.title===${JSON.stringify(moduleTitle)});if(b&&b.getAttribute('aria-expanded')!=='true')b.click();})()`);await delay(100);
    const paths=await evaluate(`Array.from(document.querySelectorAll('aside button[data-path]')).map(b=>b.getAttribute('data-path'))`);
    for(const tab of paths.filter(tab=>tab!=='archived-records')){
     caught=[];errors=[];apiPaths.clear();
     const clicked=await evaluate(`(()=>{const b=document.querySelector('aside button[data-path="'+${JSON.stringify(tab)}+'"]');if(b){b.click();return true;}return false;})()`);
     await delay(550);
     let page;
     for(let attempt=0;attempt<40;attempt++){
      page=await evaluate(`({text:document.querySelector('main')?.innerText||'',error:document.body.innerText.includes('This page could not load'),loading:!!document.querySelector('main [role=status].animate-pulse'),root:document.getElementById('root')?.innerText?.length||0})`);
      if(page&&(page.error||(!page.loading&&page.text.trim().length>30)))break;await delay(100);
     }
     const pass=!!clicked&&!!page&&!page.error&&page.text.trim().length>30&&errors.length===0;
     console.log(JSON.stringify({role:scenario.role,mobile:!!scenario.mobile,storageBlocked:!!scenario.storageBlocked,apiFailure:!!scenario.apiFailure,tab,pass,characters:page?.text?.length,caught,errors,requests:[...apiPaths],preview:page?.text?.slice(0,100)}));
     if(!pass)failed=true;
     // Separate route failures must not prevent visiting the next page.
    }
   }
   if(scenario.role==='SUPER_ADMIN'){
    await evaluate(`(()=>{const b=document.querySelector('aside button[title="Administration & System"]');if(b&&b.getAttribute('aria-expanded')!=='true')b.click();})()`);await delay(100);
    const opened=await evaluate(`(()=>{const b=document.querySelector('aside button[data-path="archived-records"]');if(b){b.click();return true;}return false;})()`);
    await delay(300);
    for(let attempt=0;attempt<40;attempt++){if(await evaluate(`!!document.querySelector('button[title="Return to Main Portal Dashboard"]')`))break;await delay(100);}
    let archive=await evaluate(`({error:document.body.innerText.includes('This page could not load'),text:document.querySelector('main')?.innerText||'',back:!!document.querySelector('button[title="Return to Main Portal Dashboard"]')})`);
    const pass=opened&&archive.back&&!archive.error&&archive.text.length>100;
    console.log(JSON.stringify({role:scenario.role,mobile:!!scenario.mobile,storageBlocked:!!scenario.storageBlocked,apiFailure:!!scenario.apiFailure,tab:'archived-records',pass}));if(!pass)failed=true;
    await evaluate(`document.querySelector('button[title="Return to Main Portal Dashboard"]')?.click()`);await delay(250);
    const returned=await evaluate(`!!document.querySelector('aside')&&!document.body.innerText.includes('This page could not load')`);
    console.log(JSON.stringify({role:scenario.role,mobile:!!scenario.mobile,storageBlocked:!!scenario.storageBlocked,apiFailure:!!scenario.apiFailure,tab:'archive-return',pass:returned}));if(!returned)failed=true;
   }
   await send('Target.disposeBrowserContext',{browserContextId});
  }
  if(failed)process.exitCode=1;
 }finally{if(ws)ws.close();chrome.kill('SIGTERM');server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error.stack);server.close();process.exitCode=1});
