const fs=require('fs'),assert=require('assert'),jwt=require('jsonwebtoken'),puppeteer=require('puppeteer-core');
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={checks:[],errors:[],failures:[]};
 try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
  await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());(['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))?r.continue():r.abort();});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)report.failures.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.evaluateOnNewDocument(token=>{localStorage.setItem('smartshule_token',token);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},jwt.sign({userId:'planning-g4-teacher',role:'TEACHER',schoolId:'school-001'},'planning-preview-only',{expiresIn:'1h'}));
  await page.goto('http://127.0.0.1:3021',{waitUntil:'networkidle2'});
  await page.waitForFunction(()=>document.querySelector('[aria-label="My assigned class"]')?.innerText.includes('planning-g4-math')&&!document.querySelector('[aria-label="My class and stream"]').disabled,{timeout:30000});
  const options=await page.$$eval('[aria-label="My class and stream"] option',es=>es.map(e=>e.value));assert.deepStrictEqual(options,['planning-grade4','planning-grade4::planning-g4-a','planning-grade4::planning-g4-b']);report.checks.push('Grade 4-only teacher sees whole class and its streams, with no other grades');
  const panel=await page.$eval('[aria-label="My assigned class"]',e=>e.innerText);assert(panel.includes('1 learners'));assert(panel.includes('planning-g4-math'));assert(panel.includes('planning-g4-eng'));report.checks.push('Class overview shows learners and all Grade 4 learning areas without a legacy profile assignment');
  await page.select('[aria-label="My class and stream"]','planning-grade4::planning-g4-b');await page.waitForFunction(()=>!document.querySelector('[aria-label="My class and stream"]').disabled&&document.querySelector('[aria-label="My assigned class"]').innerText.includes('0 learners'));report.checks.push('Switching to an empty assigned stream clears the previous learner roster');
  await page.select('[aria-label="My class and stream"]','planning-grade4::planning-g4-a');await page.waitForFunction(()=>!document.querySelector('[aria-label="My class and stream"]').disabled&&document.querySelector('[aria-label="My assigned class"]').innerText.includes('1 learners'));
  const row=await page.evaluateHandle(()=>[...document.querySelectorAll('tr')].find(e=>e.innerText.includes('planning-g4-learner')));assert(row.asElement());await row.evaluate(e=>[...e.querySelectorAll('button')].find(b=>b.textContent.trim()==='Profile').click());
  await page.waitForFunction(()=>document.body.innerText.includes('Pedagogical & Emergency Profile'),{timeout:10000});report.checks.push('Roster Profile opens the selected learner directly');
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/smartshule-grade4-class-web.png',fullPage:false});
  assert.deepStrictEqual(report.errors,[]);assert.deepStrictEqual(report.failures,[]);
 }finally{await browser.close();fs.writeFileSync('documentation/weekly-planning/teacher-class-web-review.json',JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
