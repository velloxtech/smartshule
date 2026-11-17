const fs=require('fs'),assert=require('assert'),jwt=require('jsonwebtoken'),puppeteer=require('puppeteer-core');
const base='http://127.0.0.1:3021',schoolId='school-001';
const scope={academicYearId:'planning-year-2025',termId:'planning-term-2025-t3',classRoomId:'planning-grade2',streamId:'planning-g2-a',learningAreaId:'planning-g2-math'};
const token=id=>jwt.sign({userId:id,role:id==='planning-admin'?'SUPER_ADMIN':'TEACHER',schoolId},'planning-preview-only',{expiresIn:'1h'});
const q=new URLSearchParams(scope).toString();
async function api(path,id='planning-teacher',method='GET',body){const r=await fetch(base+'/api/v1'+path,{method,headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};}
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const report={checks:[],errors:[],failures:[],exports:[]};let page;
 try{
  page=await browser.newPage();await page.setViewport({width:390,height:844});await page.setRequestInterception(true);
  page.on('request',r=>{const u=new URL(r.url());if(['localhost','127.0.0.1'].includes(u.hostname)||['blob:','data:'].includes(u.protocol))r.continue();else r.abort();});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)report.failures.push({url:new URL(r.url()).pathname,status:r.status()});});
  await page.evaluateOnNewDocument(t=>{localStorage.setItem('smartshule_token',t);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},token('planning-teacher'));
  const click=async text=>{const h=await page.evaluateHandle(t=>[...document.querySelectorAll('button,summary')].find(e=>e.textContent.trim()===t&&e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden'),text);const el=h.asElement();assert(el,'Missing control: '+text);await page.waitForFunction(e=>!e.disabled,{timeout:30000},el);await el.click();await h.dispose();};
  const openOptions=async()=>{const opened=await page.evaluate(()=>[...document.querySelectorAll('summary')].find(s=>s.textContent==='Options')?.parentElement.open);if(!opened)await click('Options');};
  const fill=async(selector,text)=>{await page.waitForSelector(selector,{visible:true});const e=await page.$(selector);await e.click();await page.keyboard.down('Control');await e.press('a');await page.keyboard.up('Control');await e.press('Backspace');if(text)await e.type(String(text));assert.strictEqual(await e.evaluate(el=>el.value),String(text));};
  const wait=async text=>page.waitForFunction(t=>document.querySelector('main')?.innerText.includes(t),{timeout:30000},text);
  const check=async(name)=>{assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Page overflow: '+name);report.checks.push({name,width:(await page.viewport()).width});};
  await page.goto(base,{waitUntil:'networkidle2',timeout:60000});await page.waitForFunction(()=>document.querySelector('main')?.innerText.includes('My Teaching Schedule'),{timeout:30000});report.errors.length=0;report.failures.length=0;await page.click('[aria-label="Open sidebar"]');
  const modules=await page.$$eval('#main-sidebar button[aria-expanded]',es=>es.map(e=>e.title));
  for(const title of modules){const h=await page.$(`#main-sidebar button[title="${title}"]`);await h.click();if(await page.$('#main-sidebar button[data-path="curriculum-tracker"]'))break;}
  await page.click('#main-sidebar button[data-path="curriculum-tracker"]');
  await page.waitForSelector('[aria-label="Planning class"]');await page.waitForFunction(()=>[...(document.querySelector('[aria-label="Planning class"]')?.options||[])].some(o=>o.value==='planning-grade2'));
  assert.deepStrictEqual(await page.$$eval('[aria-label="Planning class"] option',es=>es.map(e=>e.value)),['planning-grade2']);
  await page.select('[aria-label="Planning class"]','planning-grade2');await page.select('[aria-label="Planning stream"]','planning-g2-a');await wait('47 scheduled lessons');
  const math=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='planning-g2-math'));await math.asElement().click();await page.waitForSelector('[aria-label="Lessons for Fractions"]');
  await check('Phone sidebar → assigned class/stream → learning area');
  if(process.env.LAYOUT_ONLY){
   for(const width of [390,768,1440]){
    await page.setViewport({width,height:900});
    await page.$eval('section[aria-label="Term coverage planner"]',e=>[...e.querySelectorAll('article')].at(-1).scrollIntoView({block:'center'}));
    await new Promise(r=>setTimeout(r,200));
    const bounds=await page.$eval('section[aria-label="Term coverage planner"] > div:first-child',e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,headerBottom:document.querySelector('header').getBoundingClientRect().bottom,text:e.innerText}));
    assert(bounds.top>=bounds.headerBottom-1,'Selected context hidden by app header');assert(bounds.bottom<=900,'Selected context extends outside screen');assert(bounds.text.includes('PLANNING-GRADE2')&&bounds.text.includes('PLANNING-G2-A')&&bounds.text.includes('Term 3'));
    await check('Selected class, stream, learning area and term remain visible beneath app header at '+width);
   }
   assert.deepStrictEqual(report.errors,[]);assert.deepStrictEqual(report.failures,[]);console.log(JSON.stringify(report,null,2));return;
  }

  await fill('[aria-label="Lessons for Fractions"]','46');
  const summary=await page.evaluateHandle(()=>document.querySelector('[aria-label="Lessons for Fractions"]').closest('article').querySelector('summary'));await summary.asElement().click();
  await fill('[aria-label="Learning Experiences for Fractions"]','Compare paper models');await fill('[aria-label="Assessment Methods for Fractions"]','Observe explanations');await fill('[aria-label="Learning Resources for Fractions"]','Paper circles');
  await click('Save Draft');await wait('Draft saved. 1 slot remains.');await check('46/47 draft saved, one slot remaining');
  await fill('[aria-label="Lessons for Fractions"]','48');await click('Save Draft');await wait('Above-capacity draft saved.');assert.strictEqual(await page.$eval('[aria-label="Lessons for Fractions"]',e=>e.value),'48');await wait('1 lesson exceeds');await check('48/47 draft saved, one lesson excess');
  await fill('[aria-label="Lessons for Fractions"]','24');await fill('[aria-label="Lessons for Whole Numbers"]','24');
  const combineButton=await page.evaluateHandle(()=>[...document.querySelector('[aria-label="Lessons for Fractions"]').closest('article').querySelectorAll('button')].find(b=>b.textContent==='Combine allocations'));await combineButton.asElement().click();await fill('[aria-label="Shared lesson count"]','47');await click('Combine Lessons');await wait('2 / 4');await check('Combine two sub-strands into 47 shared slots without double-counting');
  await click('Lock & Finalize Plan');await wait('Plan Locked & Saved');
  assert(await page.$eval('[aria-label="Lessons for Whole Numbers"]',e=>e.disabled));await check('47/47 exact subset plan finalized and allocations frozen');
  const own=(await api('/curriculum/schemes?'+q)).data.data.find(s=>s.planningState?.locked);assert(own);const schemeId=own.id;
  await page.waitForFunction(()=>{const b=document.querySelector('nav[aria-label="Learning area planning"] button:nth-child(2)');return b&&!b.disabled;});const weeklyButton=await page.$('nav[aria-label="Learning area planning"] button:nth-child(2)');await weeklyButton.click();await page.waitForSelector('[aria-label="Scheme week"]');
  assert.strictEqual((await page.$$('button[aria-label^="Open lesson"]')).length,2);await check('Shortened Week 1: Thursday 6 and Friday 7 only');
  await click('Next');await page.waitForFunction(()=>document.querySelector('[aria-label="Scheme week"]').value==='1');assert.strictEqual((await page.$$('button[aria-label^="Open lesson"]')).length,5);await check('Next: full Week 2 has Lessons 1–5');
  await click('Previous');await page.waitForFunction(()=>document.querySelector('[aria-label="Scheme week"]').value==='0');await page.click('button[aria-label="Open lesson 1 on 2025-11-06, period 1"]');
  await click('Complete Lesson Plan');await page.waitForSelector('[aria-label="Schemed strand"]');assert.strictEqual(await page.$eval('[aria-label="Schemed strand"]',e=>e.value),'Numbers');
  assert(await page.$eval('form input[type="date"]',e=>e.readOnly));await fill('input[placeholder^="e.g. How do we"]','How can we compare equal parts?');
  for(const el of await page.$$('form textarea[required]'))await el.type('Use paper models and explain equal fractions.');
  const savePlan=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Save Lesson Plan')));await savePlan.asElement().click();
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Schemed strand"]'),{timeout:30000});await wait('Planned: Complete');await wait('Taught: Pending');await wait('Reflection: Pending');await check('Lesson saved while term plan locked; planned only');
  await fill('[aria-label="Post-lesson reflection"]','Learners explained equivalent fractions.');await click('Save Reflection');await wait('Reflection: Complete');await wait('Taught: Pending');await check('Reflection complete independently of taught');
  await fill('[aria-label="Work actually taught"]','Compared paper circles and explained equal fractions.');await click('Record Taught Lesson');await wait('Taught: Complete');await check('Linked taught record updates taught status independently');
  await click('Lesson Plan Preview');await page.waitForFunction(()=>[...document.querySelectorAll('th')].some(e=>e.textContent==='Roll'));await check('Lesson preview uses six-column metadata and shared print layout');
  await click('Close');
  const downloads='/tmp/smartshule-weekly-downloads-'+Date.now();fs.mkdirSync(downloads,{recursive:true});const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  for(const format of ['PDF','Doc']){await click(format);const file=downloads+'/Schemes_of_Work.'+(format==='PDF'?'pdf':'docx');for(let i=0;i<150&&!fs.existsSync(file);i++)await new Promise(r=>setTimeout(r,100));assert(fs.existsSync(file),'Missing '+format+' download');const bytes=fs.readFileSync(file);assert(bytes.subarray(0,format==='PDF'?4:2).toString()===(format==='PDF'?'%PDF':'PK'));report.exports.push({format,path:file,bytes:bytes.length});await check(format+' export from phone controls');}
  await openOptions();await click('View Changes History');await wait('FINALIZED');await click('Close');await openOptions();
  // Close the menu if it remained open after opening history, then reopen once.
  const optionOpen=await page.evaluate(()=>[...document.querySelectorAll('summary')].find(s=>s.textContent==='Options').parentElement.open);
  if(!optionOpen)await openOptions();await click('Edit Plan — Reopen');await fill('[aria-label="Reason for reopening"]','Rebalance allocations for teacher review');await click('Reopen Plan');await wait('Plan reopened.');
  const navAllocation=await page.$('nav[aria-label="Learning area planning"] button:first-child');await navAllocation.click();assert(!await page.$eval('[aria-label="Lessons for Whole Numbers"]',e=>e.disabled));await check('Explicit owner reopen requires reason and restores allocation editing');
  await click('Lock & Finalize Plan');await wait('Plan Locked & Saved');
  const cal=(await api('/curriculum/planning/calendar?'+q,'planning-admin')).data.data;
  const changed=await api('/curriculum/planning/calendar?'+q,'planning-admin','PUT',{revision:cal.revision,calendar:{...cal.data,exceptions:[...cal.data.exceptions,{date:'2025-11-07',kind:'ACTIVITY',reason:'Local fixture morning activity',periodNumbers:[1]}]}});assert.strictEqual(changed.status,200);
  await openOptions();await click('Refresh schedule');await wait('Schedule changed');await wait('47 / 46');await page.waitForFunction(()=>document.querySelector('[aria-label="Lessons for Whole Numbers"]')?.disabled===true);assert(await page.$eval('[aria-label="Lessons for Whole Numbers"]',e=>e.disabled));await check('Calendar change recalculates capacity while keeping saved plan locked');
  const after=(await api('/curriculum/schemes/'+schemeId+'/weekly?'+q)).data.data;assert.strictEqual(after.weeks[0].lessons.length,1);assert.deepStrictEqual(after.weeks[0].lessons[0].statuses,{planned:true,taught:true,reflection:true});await check('Completed lesson and taught/reflection links survive a calendar cancellation');
  for(const format of ['pdf','doc']){const denied=await api('/curriculum/schemes/planning-g3-owned/weekly/export?'+q+'&format='+format);assert.strictEqual(denied.status,403);}await check('Grade 2 teacher denied Grade 3 PDF and Doc exports');
  const reopenEvents=(await api('/curriculum/schemes/'+schemeId+'/history?'+q)).data.data.filter(h=>h.action==='REOPENED');assert(reopenEvents.some(h=>h.reason==='Rebalance allocations for teacher review'));await check('Reopen reason and actor recorded in history');
  for(const width of [390,768,1440]){await page.setViewport({width,height:900});await check('Allocation layout at '+width);}
  await page.screenshot({path:'/tmp/smartshule-weekly-planning-local.png',fullPage:false});
  assert.deepStrictEqual(report.errors,[]);assert.deepStrictEqual(report.failures,[]);
 }catch(e){if(page){fs.writeFileSync('/tmp/smartshule-weekly-debug.txt',await page.$eval('main',e=>e.innerText).catch(()=>''));await page.screenshot({path:'/tmp/smartshule-weekly-debug.png',fullPage:false}).catch(()=>{});}throw e;}finally{await browser.close();fs.writeFileSync(process.env.WEEKLY_BROWSER_REPORT||'documentation/weekly-planning/browser-verification.json',JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
