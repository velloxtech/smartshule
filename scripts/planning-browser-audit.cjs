const fs=require('fs'),assert=require('assert'),jwt=require('jsonwebtoken'),puppeteer=require('puppeteer-core');
const base='http://127.0.0.1:3021';
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const report=[];
 try{for(const [id,role]of [['planning-teacher','TEACHER'],['planning-subject','TEACHER'],['planning-admin','SUPER_ADMIN']]){
  if(process.env.ADMIN_ONLY&&id!=='planning-admin')continue;
  const page=await browser.newPage(),errors=[],failures=[];await page.setRequestInterception(true);
  page.on('request',r=>{const u=new URL(r.url());if(['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))r.continue();else r.abort();});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)failures.push({path:new URL(r.url()).pathname,status:r.status()});});
  const token=jwt.sign({userId:id,role,schoolId:'school-001'},'planning-preview-only',{expiresIn:'1h'});
  await page.evaluateOnNewDocument(t=>{localStorage.setItem('smartshule_token',t);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},token);
  await page.setViewport({width:1440,height:1000});await page.goto(base,{waitUntil:'networkidle2'});
  const modules=await page.$$eval('#main-sidebar button[aria-expanded]',els=>els.map(e=>e.title));const paths=[];
  for(const title of modules){await page.evaluate(t=>document.querySelector(`#main-sidebar button[title="${t}"]`)?.click(),title);await new Promise(r=>setTimeout(r,30));paths.push(...await page.$$eval('#main-sidebar button[data-path]',es=>es.map(e=>e.dataset.path)));}
  const chosen=[...new Set(paths)].filter(p=>(!process.env.PLANNING_ONLY||p==='curriculum-tracker')&&(role==='TEACHER'||['curriculum-tracker','schemes','lesson-plans','records-of-work','timetables'].includes(p)));
  for(const path of chosen){
   let nav=await page.$(`#main-sidebar button[data-path="${path}"]`);
   if(!nav)for(const title of modules){await page.evaluate(t=>document.querySelector(`#main-sidebar button[title="${t}"]`)?.click(),title);await new Promise(r=>setTimeout(r,30));nav=await page.$(`#main-sidebar button[data-path="${path}"]`);if(nav)break;}
   if(!nav)continue;errors.length=0;failures.length=0;await page.evaluate(e=>e.click(),nav);await new Promise(r=>setTimeout(r,800));
   if(path==='curriculum-tracker'){
    await page.waitForSelector('[aria-label="Planning class"]');await page.waitForFunction(()=>[...document.querySelector('[aria-label="Planning class"]').options].some(o=>o.value==='planning-grade2'));
    await page.select('[aria-label="Planning class"]','planning-grade2');await new Promise(r=>setTimeout(r,300));await page.select('[aria-label="Planning stream"]','planning-g2-a');await new Promise(r=>setTimeout(r,900));
    await page.waitForFunction(()=>document.querySelector('main')?.innerText.includes('47 scheduled lessons'),{timeout:30000}).catch(()=>{});
    if(!(await page.$eval('main',e=>e.innerText)).includes('47 scheduled lessons'))throw new Error(id+' planning state: '+await page.$eval('main',e=>e.innerText));
    if(role==='TEACHER'){const classes=await page.$$eval('[aria-label="Planning class"] option',es=>es.map(e=>e.value));assert.deepStrictEqual(classes,['planning-grade2']);}
    if(id==='planning-subject')assert(!(await page.$eval('main',e=>e.innerText)).includes('planning-g2-eng'));
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='planning-g2-math')?.click());
    await page.waitForSelector('section table',{timeout:20000}).catch(async()=>{throw new Error(id+' table state: '+await page.$eval('main',e=>e.innerText));});
    const weeks=await page.$$eval('section table',es=>es.slice(0,2).map(t=>[...t.querySelectorAll('tbody tr')].map(r=>r.innerText)));
    if(!weeks[0])throw new Error(id+' workspace: '+await page.$eval('main',e=>e.innerText));
    assert(weeks[0].length===2&&weeks[1].length===5);assert(weeks[0][0].includes('Thursday 6 Nov'));assert(weeks[1][4].includes('Lesson 5'));
    if(id==='planning-admin'&&process.env.VERIFY_LESSON_FLOW){
     await page.evaluate(()=>[...document.querySelectorAll('summary')].find(e=>e.textContent.startsWith('Term calendar')).parentElement.open=true);
     await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Publish calendar changes').click());
     await page.waitForFunction(()=>document.querySelector('[role="status"]')?.innerText.startsWith('Calendar published'),{timeout:20000});
     await page.evaluate(()=>[...document.querySelectorAll('summary')].find(e=>e.textContent==='Learning-area sequence').parentElement.open=true);
     await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Save sequence').click());
     await page.waitForFunction(()=>document.querySelector('[role="status"]')?.innerText==='Planning sequence saved.',{timeout:20000});
    }
    if(id==='planning-teacher'){
     const beforePlanned=await page.evaluate(()=>Number([...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='planning-g2-math').innerText.match(/(\d+) planned/)[1]));
     await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Plan slot').click());await page.waitForSelector('form textarea');
     for(const [i,el]of (await page.$$('form textarea')).entries())await el.type(['Numbers','Fractions','Compare fractions','How can we compare?','Compare paper circles','Paper circles','Observe explanations'][i]);
     await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Save lesson slot').click());await page.waitForFunction(()=>!document.querySelector('form textarea'));await page.waitForFunction(n=>document.querySelector('main')?.innerText.includes(`${n} planned`),{timeout:20000},beforePlanned+1);
     if(process.env.VERIFY_LESSON_FLOW){
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Create lesson plan').click());
      await page.waitForSelector('input[placeholder^="Enter strand title"]');
      await page.setViewport({width:390,height:1000});
      assert(await page.$eval('form input[type="date"]',e=>e.readOnly));
      await page.type('input[placeholder^="Enter strand title"]','Numbers');await page.type('input[placeholder="Enter sub-strand title..."]','Fractions');
      await page.type('input[placeholder^="e.g. By the end"]','Compare equal fractions using paper models');await page.type('input[placeholder^="e.g. How do we"]','How can we compare equal parts?');
      await page.type('input[placeholder^="e.g. Textbooks"]','Paper circles and counters');
      for(const el of await page.$$('form textarea[required]'))await el.type('Compare paper models and explain the equal parts.');
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Save Lesson Plan')).click());
      await page.waitForFunction(()=>!document.querySelector('input[placeholder^="Enter strand title"]'),{timeout:20000});
      await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Export lesson plans'),{timeout:20000});
      const downloads='/tmp/smartshule-planning-downloads';fs.mkdirSync(downloads,{recursive:true});
      const session=await page.createCDPSession();await session.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Export lesson plans').click());
      const pdf=downloads+'/Whole_Term_Lesson_Plans.pdf';for(let n=0;n<100&&!fs.existsSync(pdf);n++)await new Promise(r=>setTimeout(r,100));
      assert(fs.existsSync(pdf));assert(fs.readFileSync(pdf).subarray(0,4).toString()==='%PDF');
      page.once('dialog',d=>d.accept('Learners compared paper models and explained equal fractions.'));
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Create teaching record').click());
      await page.waitForFunction(()=>document.querySelector('main')?.innerText.includes('Linked draft record created'),{timeout:20000});
      report.push({actor:id,path:'planning-create-lesson-export-teaching-record',width:390,mainLength:100,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),errors:[...errors],failures:[...failures],pdfBytes:fs.statSync(pdf).size});
     }
    }
   }
   for(const width of [390,768,1440]){await page.setViewport({width,height:1000});await new Promise(r=>setTimeout(r,150));report.push({actor:id,path,width,mainLength:await page.$eval('main',e=>e.innerText.length),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),errors:[...errors],failures:[...failures]});}
  }
  await page.close();
 }}finally{await browser.close();fs.writeFileSync(process.env.BROWSER_OUTPUT||'documentation/planning-access/browser-checks.json',JSON.stringify(report,null,2));}
 console.log(JSON.stringify({checks:report.length,issues:report.filter(r=>r.overflow||r.errors.length||r.failures.length||r.mainLength<30)},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
