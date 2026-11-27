import React from 'react';
import {SchoolDocumentHeader,drawSchoolDocumentHeader,documentMaroon,DocumentSchool} from './SchoolDocumentHeader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {RecordOfWork} from '../../types';

export type RecordDocumentSchool = DocumentSchool;
export const recordDocumentHead = ['Date','Strand / Sub-strand','Brief description of work done','Reflection'];
export function recordDocumentRows(records:RecordOfWork[]) {
  return [...records].sort((a,b)=>(a.lessonDate||'').localeCompare(b.lessonDate||'')||Number(a.lessonPeriod||a.period||0)-Number(b.lessonPeriod||b.period||0)).map(record=>{
    const structured = record.reflectionData;
    const reflection = [record.reflection, ...Object.entries({
      'Learner comprehension':structured?.comprehensionLevel?.replace(/_/g,' '),
      'What went well':structured?.whatWentWell,'Challenges':structured?.challengesFaced,
      'Remedial plan':structured?.remedialPlan,'Next steps':structured?.nextSteps,
      'General remarks':structured?.generalRemarks,'Homework':structured?.homeworkGiven,
      'Absent learners':structured?.absentLearnersCount,'Learners present':structured?.totalLearnersPresent,
    }).filter(([,value])=>value!==undefined&&value!=='').map(([label,value])=>`${label}: ${value}`)].filter(Boolean).join('\n');
    return [record.lessonDate || '',[record.strand,record.subStrand].filter(Boolean).join(' / ') || record.lessonTopic || '',[record.learningActivities || record.strandAndWorkCovered || record.comments || '',`Document serial: ${record.documentSerial||'Not issued'}`].filter(Boolean).join('\n'),reflection];
  });
}
function documentMetadata(record:RecordOfWork) {
  return [ ['Teacher',record.teacherName],['Grade / Class',[record.className,record.streamName].filter(Boolean).join(' · ')],
    ['Learning area',record.subjectName||record.subjectAndGrade],['Year',record.academicYear],['Term',record.term] ];
}
export function RecordOfWorkDocument({records,school}:{records:RecordOfWork[];school?:RecordDocumentSchool}) {
  const record=records[0];if(!record)return <p>No Records of Work selected.</p>;
  const rows=recordDocumentRows(records);
  return <div className="overflow-x-auto" aria-label="Record of Work document"><article className="min-w-[900px] bg-white p-6 font-sans text-black">
    <SchoolDocumentHeader school={school} title="Records of Work Covered"/>
    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 py-3 text-sm">{documentMetadata(record).map(([label,value])=><div key={label} className="flex gap-2"><dt className="font-semibold">{label}:</dt><dd className="min-w-20 flex-1 border-b border-dotted border-black">{value||''}</dd></div>)}<div className="flex gap-2"><dt className="font-semibold">School:</dt><dd className="flex-1 border-b border-dotted border-black">{school?.name||''}</dd></div></dl>
    <table className="w-full table-fixed border-collapse text-left text-sm"><colgroup>{[12,29,33,26].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup><thead><tr>{recordDocumentHead.map(label=><th scope="col" key={label} className="border border-primary bg-primary px-2 py-1 font-semibold text-white">{label}</th>)}</tr></thead><tbody>{[...rows,...Array.from({length:Math.max(0,12-rows.length)},()=>['','','',''])].map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="h-8 whitespace-pre-wrap break-words border border-black px-2 py-1 align-top">{value}</td>)}</tr>)}</tbody></table>
  </article></div>;
}
export function recordsOfWorkPDF(records:RecordOfWork[],school?:RecordDocumentSchool) {
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const groups=new Map<string,RecordOfWork[]>();
  records.forEach(record=>{const key=JSON.stringify([record.schoolId,record.teacherId||record.teacherName,record.classRoomId||record.className,record.streamId||record.streamName,record.learningAreaId||record.subjectName||record.subjectAndGrade,record.academicYearId||record.academicYear,record.termId||record.term]);groups.set(key,[...(groups.get(key)||[]),record]);});
  [...groups.values()].forEach((group,i)=>{
    if(i)doc.addPage();const y=drawSchoolDocumentHeader(doc,school,'Records of Work Covered');
    autoTable(doc,{startY:y,body:documentMetadata(group[0]).map(([label,value])=>[label||'',value||'']),theme:'plain',styles:{fontSize:9,cellPadding:1},margin:{left:12,right:12}});
    const rows=recordDocumentRows(group);
    autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+3,head:[recordDocumentHead],body:[...rows,...Array.from({length:Math.max(0,12-rows.length)},()=>['','','',''])],theme:'grid',styles:{fontSize:10,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:0.2,cellPadding:2,minCellHeight:8,overflow:'linebreak'},headStyles:{fillColor:documentMaroon,textColor:[255,255,255],fontStyle:'bold'},columnStyles:{0:{cellWidth:32},1:{cellWidth:79},2:{cellWidth:90},3:{cellWidth:72}},margin:{left:12,right:12,top:12,bottom:12},rowPageBreak:'avoid'});
  });
  return doc;
}
