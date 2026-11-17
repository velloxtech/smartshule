const fs=require('fs'),{Client}=require('pg'),jwt=require('jsonwebtoken'),puppeteer=require('puppeteer-core');
(async()=>{
 const client=new Client({connectionString:'postgresql://don@localhost:55439/smartshule_investigation'});await client.connect();
 const users=(await client.query("SELECT id,role,school_id FROM users WHERE role IN ('SUPER_ADMIN','ADMIN','TEACHER','PARENT','GUARDIAN') AND status='ACTIVE' ORDER BY created_at")).rows;
 const roles=[['Admin',users.find(u=>u.role==='SUPER_ADMIN'||u.role==='ADMIN')],['Teacher',users.find(u=>u.role==='TEACHER')],['Parent',users.find(u=>u.role==='PARENT'||u.role==='GUARDIAN')]];
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report=[];
 for(const [label,user] of roles){
  if(!user){report.push({role:label,error:'No local test account'});continue;}
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{const u=new URL(req.url());if(['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))req.continue();else req.abort();});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const failures=[];page.on('response',r=>{if(r.status()>=400&&r.url().includes('/api/'))failures.push({path:new URL(r.url()).pathname,status:r.status()});});
  const token=jwt.sign({userId:user.id,role:user.role,schoolId:user.school_id},'local-investigation-only',{expiresIn:'1h'});
  await page.evaluateOnNewDocument(token=>{localStorage.setItem('smartshule_token',token);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},token);
  await page.setViewport({width:1440,height:900});
  await page.goto('http://localhost:3019',{waitUntil:'networkidle2',timeout:60000});
  await new Promise(r=>setTimeout(r,1000));
  const modules=await page.$$eval('#main-sidebar button[aria-expanded]', els=>els.map(e=>e.title));
  const paths=['dashboard'];
  for(const module of modules){
    await page.evaluate(title=>document.querySelector(`#main-sidebar button[title="${title}"]`)?.click(),module);
    await new Promise(r=>setTimeout(r,60));
    paths.push(...await page.$$eval('#main-sidebar button[data-path]',els=>els.map(e=>e.dataset.path)));
  }
  for(const route of [...new Set(paths)].filter(p => !process.env.AUDIT_ROUTES || process.env.AUDIT_ROUTES.split(',').includes(p))){
    if(route==='archived-records')continue;
    // Expand its containing module before using the real navigation handler.
    let found=await page.$(`#main-sidebar button[data-path="${route}"]`);
    if(!found && route!=='dashboard')for(const module of modules){
      await page.evaluate(title=>document.querySelector(`#main-sidebar button[title="${title}"]`)?.click(),module);
      await new Promise(r=>setTimeout(r,30));
      found=await page.$(`#main-sidebar button[data-path="${route}"]`);if(found)break;
    }
    if(route==='dashboard')await page.evaluate(()=>document.querySelector('#main-sidebar button[title="Dashboard Overview"]')?.click());
    else if(found)await page.evaluate(el=>el.click(),found);
    else {report.push({role:label,route,error:'Navigation button unavailable'});continue;}
    await new Promise(r=>setTimeout(r,650));
    for(const width of [390,768,1440]){
      await page.setViewport({width,height:900});await new Promise(r=>setTimeout(r,350));
      report.push({role:label,route,width,errors:[...errors],failures:[...failures],
       mainLength:await page.$eval('main',e=>e.innerText.length).catch(()=>0),
       overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1), docWidth:await page.evaluate(()=>document.documentElement.scrollWidth),
       offenders:await page.evaluate(()=>[...document.querySelectorAll('header *, main *')].map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width)})).filter(e=>e.right>innerWidth+2&&e.width>100).slice(0,8))});
    }
    errors.length=0;failures.length=0;
  }
  await page.close();
 }
 await browser.close();await client.end();
 fs.writeFileSync(process.env.AUDIT_OUTPUT || '/tmp/smartshule-browser-audit.json',JSON.stringify(report,null,2),{mode:0o600});
 console.log(JSON.stringify({checks:report.length,errorRoutes:report.filter(r=>r.error||r.errors?.length||r.failures?.length).map(r=>({role:r.role,route:r.route,width:r.width,errors:r.errors,failures:r.failures})),overflowRoutes:report.filter(r=>r.overflow).map(r=>({role:r.role,route:r.route,width:r.width}))},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
