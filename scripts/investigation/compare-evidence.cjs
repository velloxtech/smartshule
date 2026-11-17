const fs=require('fs'),crypto=require('crypto');
const current=JSON.parse(fs.readFileSync('/tmp/smartshule-production-evidence.json'));
const old=JSON.parse(fs.readFileSync('backups/subject_catalogue_migration_20261104/summative_assessments.json'));
const rows=current.summative_assessments, byId=new Map(rows.map(r=>[r.id,r]));
const areas=new Set(current.learning_areas.map(r=>r.id)), students=new Set(current.students.map(r=>r.id));
const stats={periods:{},missingIds:0,changedScores:0,changedArea:0,orphanArea:0,orphanStudent:0,overMaximum:0,duplicates:0,examples:[]};
const keys=new Set();
for(const r of rows){const p=stats.periods[r.term_id] ||= {rows:0,overMaximum:0};p.rows++;
 const parsed=typeof r.strand_scores==='string'?JSON.parse(r.strand_scores):r.strand_scores; const scores=Array.isArray(parsed)?parsed:[];
 const raw=scores.reduce((a,s)=>a+(s.rawScore??0),0),max=scores.reduce((a,s)=>a+(s.maxScore??0),0);
 if(raw>max){stats.overMaximum++;p.overMaximum++;}
 if(!areas.has(r.learning_area_id))stats.orphanArea++;
 if(!students.has(r.student_id))stats.orphanStudent++;
 const k=[r.student_id,r.learning_area_id,r.term_id.replace('-t','-'),r.academic_year_id].join('|');if(keys.has(k))stats.duplicates++;keys.add(k);
 if(raw>100 && stats.examples.length<8)stats.examples.push({learner:crypto.createHash('sha256').update(r.student_id).digest('hex').slice(0,8),area:r.learning_area_id,term:r.term_id,raw,max,percent:raw/max*100});
}
for(const r of old){const n=byId.get(r.id);if(!n){stats.missingIds++;continue;}if(JSON.stringify(r.strand_scores)!==JSON.stringify(n.strand_scores))stats.changedScores++;if(r.learning_area_id!==n.learning_area_id)stats.changedArea++;}
console.log(JSON.stringify(stats,null,2));
console.log('school',current.schools.map(r=>({id:r.id,address:r.address})));
console.log('terms',current.academic_terms.map(r=>({id:r.id,year:r.academic_year_id,number:r.term_number})));
// Original PP1 upload has explicit raw marks. Grade 3 import intentionally repeated
// each logical result under two term-ID spellings; compare logical keys as well as IDs.
const pp1sql=fs.readFileSync('scripts/imports/pp1_term3_2026_marks.sql','utf8');
const pp1rows=[...pp1sql.matchAll(/\('PP1-(\d{3})', (\d+), (\d+), (\d+), (\d+), (\d+), (\d+)\)/g)];
let pp1Matching=0;for(const r of pp1rows)['lit','mat','env','cre','crea','lang'].forEach((subject,i)=>{const record=byId.get(`sum-pp1-${r[1]}-${subject}-t3`);if(record?.strand_scores?.[0]?.rawScore===Number(r[i+2])&&record.strand_scores[0].maxScore===100)pp1Matching++;});
const grade3sql=fs.readFileSync('supabase_grade3_assessment_2026.sql','utf8');
const imported=[...grade3sql.matchAll(/\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '(\[.*?\])'::jsonb,/g)].filter(m=>m[1].startsWith('sum-'));
const logical=new Map(imported.map(m=>[[m[2],m[4],m[6]].join('|'),m]));let retained=0,conflicting=0;
const pairs=s=>JSON.stringify(Array.isArray(s)?s.map(x=>[x.rawScore,x.maxScore]):s);
for(const [key,m] of logical){const candidates=rows.filter(r=>[r.student_id,r.learning_area_id,r.academic_year_id].join('|')===key);if(candidates.some(r=>pairs(r.strand_scores)===pairs(JSON.parse(m[7]))))retained++;if(new Set(candidates.map(r=>pairs(r.strand_scores))).size>1)conflicting++;}
console.log('originalUploads',JSON.stringify({pp1:{sourceResults:pp1rows.length*6,matching:pp1Matching},grade3:{sourceRows:imported.length,logicalResults:logical.size,sourceScoresRetained:retained,conflictingResults:conflicting}}));
