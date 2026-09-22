import React, { useState } from 'react';
import { RecordOfWork } from '../views/RecordsOfWorkView';

interface CreateRecordOfWorkModalProps {
  onClose: () => void;
  onSubmit: (record: Omit<RecordOfWork, 'id'>) => void;
}

const CreateRecordOfWorkModal: React.FC<CreateRecordOfWorkModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    term: 'Term 3',
    week: 1,
    day: 'Mon',
    period: '',
    subjectAndGrade: '',
    strandAndWorkCovered: '',
    reference: '',
    comments: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, week: Number(formData.week) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#7a1228] flex items-center justify-center">
              <span className="material-symbols-outlined">add_notes</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Record of Work</h2>
              <p className="text-xs text-gray-500">Log your daily curriculum coverage</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <form id="create-record-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Term</label>
                <input required type="text" name="term" value={formData.term} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Week</label>
                <input required type="number" name="week" min="1" value={formData.week} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day</label>
                <select name="day" value={formData.day} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors">
                  <option value="Mon">Monday</option>
                  <option value="Tue">Tuesday</option>
                  <option value="Wed">Wednesday</option>
                  <option value="Thu">Thursday</option>
                  <option value="Fri">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Period <span className="text-gray-400 font-normal">(Opt)</span></label>
                <input type="text" name="period" value={formData.period} onChange={handleChange} placeholder="e.g. 1"
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject & Grade</label>
              <input required type="text" name="subjectAndGrade" placeholder="e.g., Grade 3 CRE" value={formData.subjectAndGrade} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Strand & Work Covered</label>
              <textarea required name="strandAndWorkCovered" rows={4} placeholder="Describe the topics and sub-topics covered during the lesson..." value={formData.strandAndWorkCovered} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reference Materials</label>
              <input required type="text" name="reference" placeholder="e.g., Oxford Growing in Christ Grade 3; Good News Bible" value={formData.reference} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comments / Remarks <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" name="comments" placeholder="Any teacher remarks on learner reception..." value={formData.comments} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="create-record-form"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#7a1228] rounded-xl hover:bg-[#901530] transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Record
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default CreateRecordOfWorkModal;