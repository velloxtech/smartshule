import React, { useState, useEffect } from 'react';
import { RecordOfWork, RecordOfWorkStatus, LearnerComprehension } from '../../types';

interface EditRecordOfWorkModalProps {
  record: RecordOfWork;
  onClose: () => void;
  onSubmit: (record: RecordOfWork) => Promise<void> | void;
}

const EditRecordOfWorkModal: React.FC<EditRecordOfWorkModalProps> = ({ record, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<RecordOfWork>(record);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData(record);
  }, [record]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReflectionChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      reflectionData: {
        ...prev.reflectionData,
        [field]: value
      }
    }));
  };

  const handleSave = async (targetStatus?: RecordOfWorkStatus) => {
    setErrorMessage(null);
    setSubmitting(true);

    const updatedRecord: RecordOfWork = {
      ...formData,
      week: Number(formData.week),
      weekNumber: Number(formData.week),
      status: targetStatus || formData.status
    };

    try {
      await onSubmit(updatedRecord);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to update record.');
    } finally {
      setSubmitting(false);
    }
  };

  const isReturned = record.status === 'RETURNED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReturned ? 'bg-rose-100 text-[#7a1228]' : 'bg-blue-50 text-blue-700'}`}>
              <span className="material-symbols-outlined">{isReturned ? 'assignment_return' : 'edit_document'}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isReturned ? 'Revise & Correct Diary Record' : 'Edit Teacher Diary Record'}
              </h2>
              <p className="text-xs text-gray-500">
                {isReturned ? 'Supervisor returned this entry with feedback for correction' : 'Update curriculum coverage & lesson reflections'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Returned Reason Banner */}
        {isReturned && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-600 text-[22px] shrink-0">info</span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Supervisor Feedback (Revision Required)
              </h4>
              <p className="text-sm font-semibold text-rose-800 mt-0.5">
                {record.returnReason || record.reviewRemarks || 'Please review and correct the lesson coverage and reflections.'}
              </p>
              {record.reviewedByName && (
                <p className="text-[11px] text-rose-600 mt-1">
                  Reviewed by: <span className="font-semibold">{record.reviewedByName}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs">
            <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}
        
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Term</label>
              <input required type="text" name="term" value={formData.term || ''} onChange={handleChange} 
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Week No.</label>
              <input required type="number" name="week" min="1" value={formData.week} onChange={handleChange} 
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Day</label>
              <select name="day" value={formData.day} onChange={handleChange} 
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white">
                <option value="Mon">Monday</option>
                <option value="Tue">Tuesday</option>
                <option value="Wed">Wednesday</option>
                <option value="Thu">Thursday</option>
                <option value="Fri">Friday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Period</label>
              <input type="text" name="period" value={formData.period || ''} onChange={handleChange} 
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Subject & Grade</label>
            <input required type="text" name="subjectAndGrade" value={formData.subjectAndGrade} onChange={handleChange} 
              className="block w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Strand & Work Covered *</label>
            <textarea required name="strandAndWorkCovered" rows={2} value={formData.strandAndWorkCovered} onChange={handleChange} 
              className="block w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Reference & Resources</label>
            <input required type="text" name="reference" value={formData.reference} onChange={handleChange} 
              className="block w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white" />
          </div>

          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">psychology</span>
                Lesson Outcome & Reflection
              </label>
              <select
                value={formData.reflectionData?.comprehensionLevel || 'GOOD'}
                onChange={(e) => handleReflectionChange('comprehensionLevel', e.target.value as LearnerComprehension)}
                className="px-2.5 py-1 text-xs border border-amber-300 rounded-lg bg-white font-semibold text-amber-900"
              >
                <option value="EXCELLENT">Excellent (90%+ Mastery)</option>
                <option value="GOOD">Good (75-89% Mastery)</option>
                <option value="AVERAGE">Average (50-74% Mastery)</option>
                <option value="BELOW_AVERAGE">Below Average (30-49%)</option>
                <option value="POOR">Needs Urgent Remedial (&lt;30%)</option>
              </select>
            </div>
            <textarea
              name="reflection"
              rows={2}
              placeholder="Self-evaluate lesson success and remedial actions taken..."
              value={formData.reflection || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 text-xs bg-white border border-amber-300/80 rounded-xl focus:ring-2 focus:ring-amber-500/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Comments <span className="font-normal">(Optional)</span></label>
            <input type="text" name="comments" value={formData.comments || ''} onChange={handleChange} 
              className="block w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl" />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              type="button"
              disabled={submitting}
              onClick={() => handleSave('DRAFT')}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">draft</span>
              Save Draft
            </button>

            <button 
              type="button"
              disabled={submitting}
              onClick={() => handleSave('SUBMITTED')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#7a1228] rounded-xl hover:bg-[#901530] transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {submitting ? 'Submitting...' : isReturned ? 'Resubmit for Review' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRecordOfWorkModal;
