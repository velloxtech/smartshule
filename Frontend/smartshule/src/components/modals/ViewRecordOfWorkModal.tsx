import React from 'react';
import { RecordOfWork } from '../../types';

interface ViewRecordOfWorkModalProps {
  record: RecordOfWork | null;
  onClose: () => void;
  onEdit?: (record: RecordOfWork) => void;
  canEdit?: boolean;
}

export const ViewRecordOfWorkModal: React.FC<ViewRecordOfWorkModalProps> = ({
  record,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  if (!record) return null;

  const reflection = record.reflectionData;
  const isApproved = record.status === 'APPROVED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="bg-[#7a1228] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Record of Work Dossier
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isApproved
                      ? 'bg-emerald-400 text-emerald-950 font-bold'
                      : record.status === 'SUBMITTED'
                      ? 'bg-amber-300 text-amber-950 font-bold'
                      : record.status === 'RETURNED'
                      ? 'bg-rose-400 text-rose-950 font-bold'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {record.status}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Week {record.weekNumber || record.week} · {record.subjectAndGrade}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Metadata Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Timeline</span>
            <span className="font-black text-slate-900">
              {record.day} {record.lessonPeriod ? `· Period ${record.lessonPeriod}` : ''}
            </span>
            <div className="text-[10px] text-slate-500">{record.lessonDate || 'Date logged'}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Class / Room</span>
            <span className="font-black text-slate-900">{record.className || record.subjectAndGrade}</span>
            <div className="text-[10px] text-slate-500">{record.academicYear || '2026'} {record.term || 'Term 1'}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Educator</span>
            <span className="font-black text-slate-900">{record.teacherName || 'Class Educator'}</span>
            <div className="text-[10px] text-slate-500">Subject Specialist</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Coverage</span>
            <span className={`font-black ${record.isOfficialCoverage ? 'text-emerald-700' : 'text-slate-600'}`}>
              {record.isOfficialCoverage ? '✓ Counted in Syllabus %' : 'Unratified / Draft'}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Work Covered Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="material-symbols-outlined text-sm text-[#7a1228]">checklist</span>
              <span>Curriculum Content & Work Covered</span>
            </h3>

            {record.lessonTopic && (
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Lesson Topic</span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{record.lessonTopic}</p>
              </div>
            )}

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Strand & Sub-Strand Details</span>
              <p className="text-slate-800 leading-relaxed text-xs mt-0.5 whitespace-pre-wrap">
                {record.strandAndWorkCovered}
              </p>
            </div>

            {record.reference && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Reference Material</span>
                <p className="text-slate-600 italic text-xs mt-0.5">{record.reference}</p>
              </div>
            )}
          </div>

          {/* Teacher Reflection Card */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-3">
            <h3 className="font-black text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
              <span className="material-symbols-outlined text-sm text-amber-700">psychology</span>
              <span>Teacher Professional Reflection & Learner Comprehension</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reflection?.comprehensionLevel && (
                <div>
                  <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Comprehension Rating</span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                    {reflection.comprehensionLevel}
                  </span>
                </div>
              )}
              {reflection?.totalLearnersPresent !== undefined && (
                <div>
                  <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Roll Present</span>
                  <span className="font-black text-slate-900 text-xs mt-1 block">
                    {reflection.totalLearnersPresent} Learners
                  </span>
                </div>
              )}
              {reflection?.absentLearnersCount !== undefined && (
                <div>
                  <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Absent</span>
                  <span className="font-black text-rose-700 text-xs mt-1 block">
                    {reflection.absentLearnersCount} Learners
                  </span>
                </div>
              )}
            </div>

            {(record.reflection || reflection?.whatWentWell) && (
              <div>
                <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Delivery Successes / What Went Well</span>
                <p className="text-slate-800 leading-relaxed text-xs mt-0.5">
                  {record.reflection || reflection?.whatWentWell}
                </p>
              </div>
            )}

            {reflection?.challengesFaced && (
              <div>
                <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Challenges Encountered</span>
                <p className="text-slate-800 leading-relaxed text-xs mt-0.5">
                  {reflection.challengesFaced}
                </p>
              </div>
            )}

            {reflection?.remedialPlan && (
              <div>
                <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Remedial Intervention Plan</span>
                <p className="text-slate-800 leading-relaxed text-xs mt-0.5">
                  {reflection.remedialPlan}
                </p>
              </div>
            )}

            {reflection?.homeworkGiven && (
              <div>
                <span className="text-[10px] text-amber-800/80 font-bold uppercase block">Daily Homefun / Extended Learning</span>
                <p className="text-slate-800 leading-relaxed text-xs mt-0.5">
                  {reflection.homeworkGiven}
                </p>
              </div>
            )}
          </div>

          {/* Supervisor Endorsement / Return Feedback */}
          {record.status === 'APPROVED' && record.reviewRemarks && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-900">
                <span className="material-symbols-outlined text-base text-emerald-700">verified</span>
                <span>Official Supervisor Endorsement</span>
              </div>
              <p className="text-xs text-emerald-900 italic mt-1">"{record.reviewRemarks}"</p>
              <div className="text-[10px] text-emerald-700 mt-2 font-medium">
                Endorsed by: {record.reviewedByName || 'Administration'} {record.reviewedAt ? `on ${new Date(record.reviewedAt).toLocaleDateString('en-GB')}` : ''}
              </div>
            </div>
          )}

          {record.status === 'RETURNED' && record.returnReason && (
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-xs text-rose-900">
                <span className="material-symbols-outlined text-base text-rose-700">undo</span>
                <span>Supervisor Revision Instructions</span>
              </div>
              <p className="text-xs text-rose-900 mt-1">{record.returnReason}</p>
            </div>
          )}
        </div>

        {/* Modal Bottom Toolbar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Official CBC Record of Work Dossier · Grace Seeds School
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Edit Record</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
