const {Client}=require('pg'),fs=require('fs'),assert=require('assert'),jwt=require('jsonwebtoken'),puppeteer=require('puppeteer-core'),crypto=require('crypto');
const resources={};
const base='http://localhost:3019', secret='local-investigation-only';
const token=u=>jwt.sign({userId:u.id,role:u.role,schoolId:'school-001'},secret,{expiresIn:'1h'});
async function get(path,user){const r=await fetch(base+'/api/v1'+path,{headers:{Authorization:'Bearer '+token(user)}});const json=await r.json();assert(r.ok,`${path}: ${r.status}`);return json.data;}
(async()=>{
 const db=new Client({connectionString:'postgresql://don@localhost:55439/smartshule_investigation'});await db.connect();resources.db=db;
 const d=JSON.parse(fs.readFileSync('/tmp/smartshule-production-evidence.json'));
 const examples=[d.summative_assessments.find(r=>r.strand_scores?.[0]?.rawScore===150&&r.strand_scores[0].maxScore===100),d.summative_assessments.find(r=>r.id==='sum-g3-001-senv-t3')];
 const admin=(await db.query("SELECT id,role FROM users WHERE role='SUPER_ADMIN' LIMIT 1")).rows[0];
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});resources.browser=browser;const report=[];
 for(const example of examples){
   assert(example,'Missing verified sample');
   const parent=(await db.query("SELECT u.id,u.role FROM guardians g JOIN users u ON u.id=g.user_id WHERE g.student_ids @> $1::jsonb LIMIT 1",[JSON.stringify([example.student_id])])).rows[0];assert(parent,'Missing parent link');
   const teacher=(await db.query("SELECT u.id,u.role FROM users u JOIN teachers t ON t.user_id=u.id JOIN students s ON s.id=$1 WHERE u.role='TEACHER' AND (t.assigned_class_stream_ids @> jsonb_build_array(s.stream_id) OR t.assigned_class_stream_ids @> jsonb_build_array(s.classroom_id)) LIMIT 1",[example.student_id])).rows[0];assert(teacher,'Missing assigned test teacher');
   const response={};
   for(const [role,user] of [['Admin',admin],['Teacher',teacher],['Parent',parent]]){
     const records=await get('/CBC/summative?studentId='+encodeURIComponent(example.student_id)+'&termId=term-2026-t3&academicYearId=year-2026',user);
     const r=records.find(r=>r.id===example.id||r.duplicateIds?.includes(example.id));assert(r,'Result absent from '+role);
     response[role]={rawScore:r.rawScore,maxScore:r.maxScore,percentage:r.percentageScore??null,issue:r.scoreIssue??null};
   }
   assert.deepStrictEqual(response.Admin,response.Parent);assert.deepStrictEqual(response.Admin,response.Teacher);
   const page=await browser.newPage();await page.setViewport({width:390,height:900});
   await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))r.continue();else r.abort();});
   await page.evaluateOnNewDocument(t=>{localStorage.setItem('smartshule_token',t);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},token(parent));
   await page.goto(base,{waitUntil:'networkidle2',timeout:60000});
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.innerText.includes('Summative Terminal Exams')),{timeout:20000});
   await page.evaluate(id=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value===id));if(s){s.value=id;s.dispatchEvent(new Event('change',{bubbles:true}));}},example.student_id);
   await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Summative Terminal Exams'))?.click());
   const area=d.learning_areas.find(a=>a.id===example.learning_area_id).name;
   const expected=response.Admin.issue?'Score requires verification':`${response.Admin.percentage}%`;
   await page.waitForFunction((area,expected)=>[...document.querySelectorAll('div.p-3.rounded-xl')].some(e=>e.innerText.includes(area)&&e.innerText.includes(expected)),{timeout:15000},area,expected);
   const staffUI = {};
   const admission = d.students.find(s => s.id === example.student_id).admission_number;
   await page.close();
   for (const [role, user] of [['Admin', admin], ['Teacher', teacher]]) {
     const staff = await browser.newPage(); await staff.setViewport({width:390,height:900});
     await staff.setRequestInterception(true);staff.on('request',r=>{const u=new URL(r.url());if(['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))r.continue();else r.abort();});
     await staff.evaluateOnNewDocument(t=>{localStorage.setItem('smartshule_token',t);localStorage.setItem('smartshule_cookie_consent',JSON.stringify({strictlyNecessary:true,functional:true,performance:false,version:'2026.1'}));},token(user));
     await staff.goto(base,{waitUntil:'networkidle2',timeout:60000});
     await staff.waitForFunction(()=>[...document.querySelectorAll('#main-sidebar button[aria-expanded]')].some(b=>b.title.includes('Competencies')),{timeout:20000});
     await staff.evaluate(()=>{const b=[...document.querySelectorAll('#main-sidebar button[aria-expanded]')].find(b=>b.title.includes('Competencies'));if(b?.getAttribute('aria-expanded')!=='true')b?.click();});
     await staff.waitForSelector('#main-sidebar button[data-path="summative-assessments"]');
     await staff.evaluate(()=>document.querySelector('#main-sidebar button[data-path="summative-assessments"]').click());
     const expectedCell = response.Admin.issue ? 'Review' : `${response.Admin.percentage}%`;
     try {
       await staff.waitForFunction((adm,area,expected)=>{
         const table=[...document.querySelectorAll('table')].find(t=>t.querySelector('thead th[title]'));
         if(!table)return false;
         const heading=[...table.querySelectorAll('thead th')].find(h=>h.title===area);
         if(!heading)return false;
         const index=[...heading.parentElement.children].indexOf(heading);
         const row=[...table.querySelectorAll('tbody tr')].find(r=>r.innerText.includes(adm));
         return row?.children[index]?.innerText.includes(expected);
       },{timeout:25000},admission,area,expectedCell);
     } catch (error) {
       console.error(role, await staff.$$eval('thead th[title]', els=>els.map(e=>e.title)));
       throw error;
     }
     staffUI[role]=response.Admin.issue?'Review':`${response.Admin.percentage}%`;await staff.close();
   }
   report.push({learner:crypto.createHash('sha256').update(example.student_id).digest('hex').slice(0,8),term:example.term_id,subject:area,roles:response,parentUI:expected,staffUI});
 }
 await browser.close();await db.end();fs.writeFileSync('/tmp/smartshule-portal-result-verification.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
})().catch(async e=>{console.error(e.message);await resources.browser?.close();await resources.db?.end();process.exitCode=1});
