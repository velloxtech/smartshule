const fs=require('fs'),crypto=require('crypto');
const d=JSON.parse(fs.readFileSync('/tmp/smartshule-production-evidence.json'));
const areas=new Set(d.learning_areas.map(a=>a.id)),students=new Set(d.students.map(s=>s.id));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const groups=new Map();
for(const r of d.summative_assessments){const key=[r.student_id,r.learning_area_id,r.term_id.replace(/-t([1-3])$/,'-$1'),r.academic_year_id].join('|');const g=groups.get(key)||[];g.push(r);groups.set(key,g);}
const score=r=>Array.isArray(r.strand_scores)?r.strand_scores.map(s=>({raw:s.rawScore,max:s.maxScore})):r.strand_scores;
const invalid=d.summative_assessments.filter(r=>Array.isArray(r.strand_scores)&&r.strand_scores.some(s=>s.rawScore>s.maxScore));
const conflicting=[...groups.values()].filter(g=>new Set(g.map(r=>JSON.stringify([r.overall_performance_level,score(r)]))).size>1);
const manifest={capturedAt:d.capturedAt,schoolId:'school-001',productionWritesApplied:false,
 evidenceFiles:['backups/subject_catalogue_migration_20261104/summative_assessments.json','backups/smartshule_supabase_backup_20261104_201329.dump','supabase_grade3_assessment_2026.sql','scripts/imports/pp1_term3_2026_marks.sql'].map(path=>({path,sha256:hash(fs.readFileSync(path))})),
 overMaximum:{physicalRows:invalid.length,logicalResults:new Set(invalid.map(r=>r.student_id+'|'+r.learning_area_id)).size,records:invalid.map(r=>({assessmentId:r.id,learner:'learner-'+hash(r.student_id).slice(0,8),subjectId:r.learning_area_id,scores:score(r),proposedCorrection:null,reason:'Correct score/maximum not established by available source evidence'}))},
 orphanedLegacyRecords:d.summative_assessments.filter(r=>!areas.has(r.learning_area_id)||!students.has(r.student_id)).map(r=>({assessmentId:r.id,scores:score(r),proposedCorrection:null,reason:'Learner and subject mapping require verified identity reconciliation; do not infer from sequence alone'})),
 conflictingResults:conflicting.map(g=>({learner:'learner-'+hash(g[0].student_id).slice(0,8),subjectId:g[0].learning_area_id,records:g.map(r=>({assessmentId:r.id,scores:score(r),performanceLevel:r.overall_performance_level})),proposedCorrection:null,reason:'Original Grade 3 upload and later copies disagree, or performance levels differ; do not select the highest score'})),
 duplicateSummary:{physicalRows:d.summative_assessments.length,logicalResults:groups.size,duplicateGroups:[...groups.values()].filter(g=>g.length>1).length,extraRows:d.summative_assessments.length-groups.size},
 restorationPolicy:'No blind restore. Original PP1 228/228 marks and Grade 3 168/168 logical source scores remain present. November snapshot lost no assessment IDs. October backup has a different cohort.'};
fs.mkdirSync('documentation/investigation',{recursive:true});fs.writeFileSync('documentation/investigation/assessment-review-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({overMaximumRows:invalid.length,orphanedRows:manifest.orphanedLegacyRecords.length,conflictingGroups:conflicting.length,...manifest.duplicateSummary}));
