import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {SchoolDocumentHeader,DocumentSchool,drawSchoolDocumentHeader,documentMaroon} from './SchoolDocumentHeader';
import {SchemeOfWork} from '../../types';

export const schemeDocumentHead = ['Week', 'Lesson', 'Strand / Theme', 'Sub-strand', 'Specific learning outcomes', 'Key inquiry questions', 'Learning experiences', 'Learning resources', 'Assessment methods', 'Reflection'];
export function schemeDocumentRows(scheme: SchemeOfWork) {
  return (scheme.entries || []).filter(entry => !entry.archivedAt).map(entry => [
    String(entry.weekNumber ?? ''), String(entry.lessonNumber ?? ''), entry.strandTitle || '', entry.subStrandTitle || '',
    (entry.specificLearningOutcomes || []).join('\n'), (entry.keyInquiryQuestions || []).join('\n'),
    (entry.learningExperiences || []).join('\n'), (entry.learningResources || []).join('\n'),
    (entry.assessmentMethods || []).join('\n'), entry.reflection || '',
  ]);
}
export function SchemeOfWorkDocument({scheme, school, schoolName, className, areaName, termName, yearName}: {
  scheme: SchemeOfWork; school?:DocumentSchool; schoolName?: string; className?: string; areaName?: string; termName?: string; yearName?: string;
}) {
  const rows = schemeDocumentRows(scheme);
  return <div className="overflow-x-auto" aria-label="Scheme of Work document">
    <article className="min-w-[1250px] border border-black bg-white p-4 font-serif text-black">
      <SchoolDocumentHeader school={school || {name:schoolName}} title="Scheme of Work"/><header className="border border-b-0 border-black px-4 py-3 text-center">
        <h3 className="text-xl font-bold">{className || 'Class not recorded'}</h3>
        <h4 className="text-xl font-bold">{areaName || scheme.title} — Scheme of Work</h4>
        <p className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-1 text-base font-bold"><span>Term: {termName || 'Not recorded'}</span><span>Year: {yearName || 'Not recorded'}</span><span>School: {schoolName || 'Not recorded'}</span></p>
        <p className="mt-1 text-xs">{scheme.status} · Weeks and lessons identify scheduled sessions; sub-strands can continue across weeks.</p>
      </header>
      <table className="w-full table-fixed border-collapse text-left text-sm leading-snug">
        <colgroup>{[4,4,10,10,18,12,16,10,10,6].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup>
        <thead><tr>{schemeDocumentHead.map(label=><th key={label} scope="col" className="border border-black bg-[#7a1228] p-2 align-top font-bold text-white">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=><tr key={scheme.entries.filter(e=>!e.archivedAt)[i].id}>{row.map((value,j)=><td key={j} className={`whitespace-pre-wrap break-words border border-black p-2 align-top ${j===2||j===3?'font-bold':''}`}>{value}</td>)}</tr>)}</tbody>
      </table>
      {!rows.length&&<p className="border border-t-0 border-black p-8 text-center">No teaching sessions have been saved in this scheme yet. Use Edit scheme to prepare the sub-strand lessons.</p>}
    </article>
  </div>;
}

export function schemeOfWorkPDF(scheme:SchemeOfWork,school:DocumentSchool|undefined,metadata:{className?:string;areaName?:string;termName?:string;yearName?:string}) {
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const y=drawSchoolDocumentHeader(doc,school,'Scheme of Work');
  autoTable(doc,{startY:y,body:[['Class',metadata.className||''],['Learning area',metadata.areaName||scheme.title],['Term / Year',`${metadata.termName||''} / ${metadata.yearName||''}`],['Status',scheme.status]],theme:'plain',styles:{fontSize:10,cellPadding:1.5},margin:{left:12,right:12}});
  const widths=[10,10,27,27,48,32,43,27,27,22];
  autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+4,head:[schemeDocumentHead],body:schemeDocumentRows(scheme),theme:'grid',styles:{font:'times',fontSize:9,cellPadding:2,overflow:'linebreak',lineColor:[122,18,40],lineWidth:0.15},headStyles:{fillColor:documentMaroon,textColor:[255,255,255],fontStyle:'bold'},columnStyles:Object.fromEntries(widths.map((width,i)=>[i,{cellWidth:width}])),margin:{left:12,right:12,top:12,bottom:12},rowPageBreak:'avoid'});
  return doc;
}
