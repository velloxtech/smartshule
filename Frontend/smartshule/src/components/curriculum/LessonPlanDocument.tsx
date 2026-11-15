import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LessonPlan, SchemeOfWork } from '../../types';
import {SchoolDocumentHeader,drawSchoolDocumentHeader,documentMaroon,DocumentSchool} from './SchoolDocumentHeader';

type Context = { school?: DocumentSchool; classes?: any[]; areas?: any[]; schemes?: SchemeOfWork[]; teacher?: {id?:string;userId?:string;name?:string;registrationNumber?:string} };
const text = (value: unknown): string => Array.isArray(value) ? value.map(text).join('\n') : value == null || value === '' ? 'Not recorded' : String(value).replace(/_/g, ' ');
export function lessonPlanSections(plan: LessonPlan, context: Context) {
  const entry = context.schemes?.flatMap(s => s.entries || []).find(e => e.id === plan.schemeOfWorkEntryId);
  const roll = (plan as any).roll;
  const boys = plan.rollBoys ?? roll?.boys;
  const girls = plan.rollGirls ?? roll?.girls;
  return {
    metadata: [context.school?.name, context.classes?.find(c => c.id === plan.classRoomId)?.name,
      context.areas?.find(a => a.id === plan.learningAreaId)?.name, plan.lessonDate,
      plan.lessonTime ? `${plan.lessonTime} (${plan.durationMinutes} minutes)` : `${plan.durationMinutes} minutes`, boys == null || girls == null ? undefined : `${boys} boys, ${girls} girls; Total ${boys + girls}`].map(text),
    opening: [
      ['Week and Lesson Number', plan.weekNumber || entry ? `Week ${plan.weekNumber ?? entry?.weekNumber ?? 'Not recorded'}, Lesson ${plan.lessonNumber ?? entry?.lessonNumber ?? 'Not recorded'}` : undefined],
      ['Strand', plan.strand], ['Sub Strand', plan.subStrand],
      ['Specific Learning Outcomes', plan.specificLearningOutcomes], ['Key Inquiry Question(s)', plan.keyInquiryQuestions],
      ['Learning Experiences', plan.learningExperiences ?? entry?.learningExperiences],
      ['Assessment Methods', plan.assessmentMethods ?? entry?.assessmentMethods],
    ].map(([label, value]) => [text(label), text(value)]),
    competencies: [plan.coreCompetenciesAddressed, plan.valuesAddressed, (plan as any).pcis].map(text),
    resources: text(plan.learningResources),
    steps: (plan.steps || []).map(s => [s.stepTitle, `${s.durationMinutes} minutes`, `Teacher: ${s.teacherActivities}\nLearners: ${s.learnerActivities}${s.assessmentCriterion ? `\nAssessment: ${s.assessmentCriterion}` : ''}`]),
    extended: text(plan.extendedActivity), reflection: plan.teacherSelfReflection || 'No after-class comment recorded.',
  };
}

const flowHead=['Stage and time','Learning experiences','Learning points','Resources'];
const rubricHead=['Performance indicators / Criteria','Level 4: Exceeds expectation','Level 3: Meets expectation','Level 2: Approaching expectation','Level 1: Below expectation'];
export function templateLessonSections(plan:LessonPlan,context:Context) {
  const s=lessonPlanSections(plan,context);
  const teacher=context.teacher && [context.teacher.id,context.teacher.userId].includes(plan.teacherId) ? context.teacher : undefined;
  return {...s,
    identity:[['Name',teacher?.name||''],['Reg. No.',teacher?.registrationNumber||''],['Grade',s.metadata[1]],['Learning area',s.metadata[2]],['Strand',plan.strand],['Sub-strand',plan.subStrand],['Date',plan.lessonDate],['Time',s.metadata[4]],['Roll',s.metadata[5]]],
    focus:[['Learning outcomes',text(plan.specificLearningOutcomes)],['Resources',s.resources],['Core competencies to be developed',text(plan.coreCompetenciesAddressed)],['Link to pertinent and contemporary issues (PCIs)',text(plan.pcis)],['Values to be developed',text(plan.valuesAddressed)],['Link to other learning areas',text(plan.otherLearningAreas)],['Key inquiry question',text(plan.keyInquiryQuestions)],['Learning experiences',s.opening.find(row=>row[0]==='Learning Experiences')?.[1]||''],['Assessment methods',s.opening.find(row=>row[0]==='Assessment Methods')?.[1]||'']],
    flow:(plan.steps||[]).map(step=>[`${step.stepTitle}\n${step.durationMinutes} minutes`,`Teacher: ${step.teacherActivities}\nLearners: ${step.learnerActivities}`,`${step.learningPoints||''}${step.assessmentCriterion?`\nAssessment: ${step.assessmentCriterion}`:''}`,step.resources||'']),
    application:[['Suggested community service learning activities',plan.communityServiceActivities||''],['Suggested non-formal activity to support learning through application',plan.nonFormalActivity||''],['Extended activities',plan.extendedActivity||''],['Remarks / After-class reflection',plan.teacherSelfReflection||'']],
    rubric:plan.assessmentRubric?.length?plan.assessmentRubric.map(row=>[row.criterion,row.exceeds,row.meets,row.approaching,row.below]):Array.from({length:3},()=>['','','','','']),
  };
}
export function LessonPlanDocument({plan,context}:{plan:LessonPlan;context:Context}) {
  const s=templateLessonSections(plan,context);
  const table=(head:string[],rows:string[][])=><div className="overflow-x-auto"><table className="w-full min-w-[650px] table-fixed border-collapse text-left text-sm"><thead><tr>{head.map(label=><th key={label} className="border border-[#7a1228] bg-[#7a1228] p-2 align-top font-bold text-white">{label}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="min-h-10 whitespace-pre-wrap break-words border border-[#7a1228]/50 p-2 align-top">{value}</td>)}</tr>)}</tbody></table></div>;
  return <article className="space-y-4 bg-white p-4 font-sans text-gray-950 sm:p-6" aria-label="CBC Lesson Plan document">
    <SchoolDocumentHeader school={context.school} title="CBC Lesson Plan"/>
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{s.identity.map(([label,value])=><div key={label} className="flex gap-2 text-sm"><dt className="font-bold">{label}:</dt><dd className="min-w-16 flex-1 whitespace-pre-wrap border-b border-dotted border-[#7a1228]/50">{value}</dd></div>)}</dl>
    {s.focus.map(([label,value])=><section key={label}><h4 className="font-bold text-[#7a1228]">{label}:</h4><p className="mt-1 min-h-7 whitespace-pre-wrap border-b border-dotted border-[#7a1228]/40 pb-2 text-sm">{value}</p></section>)}
    <section><h4 className="mb-2 font-bold text-[#7a1228]">Lesson flow</h4>{table(flowHead,s.flow)}</section>
    {s.application.map(([label,value])=><section key={label}><h4 className="font-bold text-[#7a1228]">{label}:</h4><p className="mt-1 min-h-9 whitespace-pre-wrap border-b border-dotted border-[#7a1228]/40 text-sm">{value}</p></section>)}
    <section><h4 className="mb-2 font-bold text-[#7a1228]">Assessment rubric</h4>{table(rubricHead,s.rubric)}<p className="mt-2 text-xs">At least three assessment criteria. Blank cells have not been recorded.</p></section>
  </article>;
}
export function lessonPlansPDF(plans:LessonPlan[],context:Context) {
  const doc=new jsPDF({unit:'mm',format:'a4'});
  plans.forEach((plan,index)=>{
    if(index)doc.addPage();let y=drawSchoolDocumentHeader(doc,context.school,'CBC Lesson Plan');const s=templateLessonSections(plan,context);
    const table=(head:string[]|undefined,body:string[][])=>{autoTable(doc,{startY:y,head:head?[head]:undefined,body,theme:'grid',margin:{top:14,bottom:14,left:14,right:14},styles:{font:'helvetica',fontSize:9,cellPadding:2,overflow:'linebreak',lineColor:[122,18,40],lineWidth:0.15},headStyles:{fillColor:documentMaroon,textColor:[255,255,255],fontStyle:'bold'},rowPageBreak:'avoid'});y=(doc as any).lastAutoTable.finalY+4;};
    table(undefined,s.identity);for(const row of s.focus)table([row[0]],[[row[1]]]);
    table(flowHead,s.flow);for(const row of s.application)table([row[0]],[[row[1]]]);table(rubricHead,s.rubric);
  });return doc;
}
