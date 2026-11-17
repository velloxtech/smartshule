import fs from 'fs';
import assert from 'assert';
import React from '../../Frontend/smartshule/node_modules/react';
import { renderToStaticMarkup } from '../../Frontend/smartshule/node_modules/react-dom/server';
import { lessonPlansPDF, LessonPlanDocument } from '../../Frontend/smartshule/src/components/curriculum/LessonPlanDocument';
import { Client } from 'pg';

async function main() {
  const client=new Client({connectionString:'postgresql://don@localhost:55439/smartshule_investigation'});
  await client.connect();
  const school=(await client.query("SELECT id,name,address FROM schools WHERE id='school-001'")).rows[0];
  const cls=(await client.query("SELECT id,name FROM classrooms WHERE grade_level='GRADE_3' LIMIT 1")).rows[0];
  const area=(await client.query("SELECT id,name FROM learning_areas WHERE id='la-g3-mat'")).rows[0];
  await client.end();
  // No lesson plans exist in the available production snapshot. This is an explicit local formatting fixture.
  const plan:any={id:'local-format-fixture',teacherId:'local',classRoomId:cls.id,learningAreaId:area.id,lessonDate:'2026-11-12',durationMinutes:40,weekNumber:3,lessonNumber:2,lessonTime:'09:00-09:40',rollBoys:12,rollGirls:14,strand:'Numbers',subStrand:'Fractions',specificLearningOutcomes:['Compare halves and quarters using paper models.','Explain the comparison using a diagram.'],keyInquiryQuestions:['How can we compare parts of a whole?'],coreCompetenciesAddressed:['COMMUNICATION_AND_COLLABORATION'],valuesAddressed:['RESPONSIBILITY'],pcis:['Safety when handling scissors'],learningResources:['Paper circles','Learner exercise books'],steps:[{stepNumber:1,stepTitle:'Introduction',durationMinutes:5,teacherActivities:'Review sharing a whole equally.',learnerActivities:'Describe familiar examples of sharing.'},{stepNumber:2,stepTitle:'Lesson Development: Step 1',durationMinutes:15,teacherActivities:'Demonstrate folding equal parts.',learnerActivities:'Fold and label halves and quarters.'},{stepNumber:3,stepTitle:'Lesson Development: Step 2',durationMinutes:15,teacherActivities:'Guide pairs as they compare their models.',learnerActivities:'Compare models and explain the size of the parts.'},{stepNumber:4,stepTitle:'Conclusion',durationMinutes:5,teacherActivities:'Review the key inquiry question.',learnerActivities:'Explain one comparison.'}],extendedActivity:'Draw a shared fruit and label its equal parts.',teacherSelfReflection:''};
  const context={school,classes:[cls],areas:[area]};
  const html=renderToStaticMarkup(<LessonPlanDocument plan={plan} context={context}/>);
  const headings=['School','Level','Learning Area','Date','Time','Roll','Week and Lesson Number','Strand','Sub Strand','Specific Learning Outcomes','Key Inquiry Question(s)','Core Competencies','Values','PCIs','Learning Resources','Organisation of Learning','Extended Activities','Teacher Self-Evaluation'];
  let cursor=-1;for(const heading of headings){const next=html.indexOf('>'+heading+'<',cursor+1);assert(next>cursor,heading);cursor=next;}
  fs.writeFileSync('/tmp/smartshule-lesson-preview.html',html);
  fs.writeFileSync('/tmp/smartshule-single-lesson.pdf',Buffer.from(lessonPlansPDF([plan],context).output('arraybuffer')));
  const longPlan={...plan,id:'local-long-fixture',lessonNumber:3,specificLearningOutcomes:[...plan.specificLearningOutcomes,'Content completeness marker: END OF LONG LESSON'],steps:plan.steps.map((s:any)=>({...s,learnerActivities:('Learners compare their models, describe the equal parts and explain their reasoning. ').repeat(12)}))};
  fs.writeFileSync('/tmp/smartshule-multiple-lessons.pdf',Buffer.from(lessonPlansPDF([plan,longPlan],context).output('arraybuffer')));
  console.log('Preview heading order verified; single and long multi-lesson PDFs generated in /tmp.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
