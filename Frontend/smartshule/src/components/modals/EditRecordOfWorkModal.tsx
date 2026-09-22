import React, { useState, useEffect } from 'react';
import { RecordOfWork } from '../views/RecordsOfWorkView';

interface EditRecordOfWorkModalProps {
  record: RecordOfWork;
  onClose: () => void;
  onSubmit: (record: RecordOfWork) => void;
}

const EditRecordOfWorkModal: React.FC<EditRecordOfWorkModalProps> = ({ record, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<RecordOfWork>(record);

  useEffect(() => {
    setFormData(record);
  }, [record]);

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
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined">edit_document</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Record of Work</h2>
              <p className="text-xs text-gray-500">Update curriculum coverage details</p>
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
          <form id="edit-record-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Term</label>
                <input required type="text" name="term" value={formData.term} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Week</label>
                <input required type="number" name="week" min="1" value={formData.week} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day</label>
                <select name="day" value={formData.day} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                  <option value="Mon">Monday</option>
                  <option value="Tue">Tuesday</option>
                  <option value="Wed">Wednesday</option>
                  <option value="Thu">Thursday</option>
                  <option value="Fri">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Period</label>
                <input type="text" name="period" value={formData.period} onChange={handleChange} 
                  className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject & Grade</label>
              <input required type="text" name="subjectAndGrade" value={formData.subjectAndGrade} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Strand & Work Covered</label>
              <textarea required name="strandAndWorkCovered" rows={4} value={formData.strandAndWorkCovered} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reference Materials</label>
              <input required type="text" name="reference" value={formData.reference} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comments / Remarks</label>
              <input type="text" name="comments" value={formData.comments || ''} onChange={handleChange} 
                className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
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
            form="edit-record-form"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Update Record
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default EditRecordOfWorkModal;