import React from 'react';
import {RecordOfWork} from '../../types';
import {RecordOfWorkDocument,RecordDocumentSchool,recordsOfWorkPDF} from '../curriculum/RecordOfWorkDocument';
interface ViewRecordOfWorkModalProps {
  record:RecordOfWork|null; school?:RecordDocumentSchool; onClose:()=>void;
  onEdit?:(record:RecordOfWork)=>void;canEdit?:boolean;
}
export const ViewRecordOfWorkModal:React.FC<ViewRecordOfWorkModalProps>=({record,school,onClose,onEdit,canEdit=false})=>{
  if(!record)return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm md:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="record-document-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
      <header className="flex items-center justify-between gap-3 bg-primary px-6 py-4 text-white"><div><h2 id="record-document-title" className="text-lg font-bold">Record of Work</h2><p className="text-xs">{record.status}{record.reviewedByName?` · Reviewed by ${record.reviewedByName}`:''}</p></div><button type="button" aria-label="Close Record of Work" onClick={onClose} className="ui-button text-white">Close</button></header>
      <div className="flex-1 overflow-y-auto p-3 md:p-6"><RecordOfWorkDocument records={[record]} school={school}/><details className="mt-3 rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-semibold">Additional record details</summary><dl className="mt-3 space-y-2">{[['Learning objectives',record.learningObjectives],['Resources / references',record.resources||record.reference],['Comments',record.comments],['Official coverage',record.isOfficialCoverage?'Confirmed':'Not confirmed'],['Review date',record.reviewedAt]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl></details>{(record.reviewRemarks||record.returnReason)&&<p className="mt-3 rounded-lg border p-3 text-sm"><strong>Review comments: </strong>{record.returnReason||record.reviewRemarks}</p>}</div>
      <footer className="flex flex-wrap justify-end gap-2 border-t bg-surface p-4">
        {canEdit&&onEdit&&<button className="ui-button" onClick={()=>onEdit(record)}>Edit Record</button>}
        <button className="ui-button ui-button-primary" onClick={()=>recordsOfWorkPDF([record],school).save(`Record_of_Work_${record.lessonDate||record.id}.pdf`)}>Download PDF</button>
        <button className="ui-button" onClick={onClose}>Close</button>
      </footer>
    </section>
  </div>;
};
