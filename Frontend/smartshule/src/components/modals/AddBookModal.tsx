import React, { useState, useEffect } from 'react';
import { Book, BookCondition } from '../../types';

interface AddBookModalProps {
  isOpen: boolean;
  bookToEdit?: Book | null;
  onClose: () => void;
  onSubmit: (bookData: Partial<Book>) => Promise<void>;
}

const CATEGORIES = [
  'CBC Textbooks',
  'CBC Exercise & Workbooks',
  'Fiction & Storybooks',
  'Non-Fiction',
  'Science & Technology',
  'Mathematics & Numeracy',
  'Languages (English & Kiswahili)',
  'Indigenous & Foreign Languages',
  'Humanities & Social Studies',
  'Creative Arts & Sports',
  'Religious Education (CRE / IRE)',
  'Reference (Dictionaries & Encyclopedias)',
  'Teacher Guide & Curriculum Manuals',
  'General Reading'
];

const GRADE_LEVELS = [
  'All Grades',
  'Playgroup',
  'PP1',
  'PP2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'JSS 1 (Grade 7)',
  'JSS 2 (Grade 8)',
  'JSS 3 (Grade 9)',
  'Senior School',
  'Staff & Teachers'
];

const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  bookToEdit,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'CBC Textbooks',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    copiesTotal: 1,
    copiesAvailable: 1,
    shelfLocation: '',
    condition: 'GOOD' as BookCondition,
    gradeLevel: 'All Grades',
    description: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookToEdit) {
      setFormData({
        title: bookToEdit.title || '',
        author: bookToEdit.author || '',
        isbn: bookToEdit.isbn || '',
        category: bookToEdit.category || 'CBC Textbooks',
        publisher: bookToEdit.publisher || '',
        publicationYear: bookToEdit.publicationYear || new Date().getFullYear(),
        copiesTotal: bookToEdit.copiesTotal ?? 1,
        copiesAvailable: bookToEdit.copiesAvailable ?? 1,
        shelfLocation: bookToEdit.shelfLocation || '',
        condition: bookToEdit.condition || 'GOOD',
        gradeLevel: bookToEdit.gradeLevel || 'All Grades',
        description: bookToEdit.description || ''
      });
    } else {
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: 'CBC Textbooks',
        publisher: '',
        publicationYear: new Date().getFullYear(),
        copiesTotal: 1,
        copiesAvailable: 1,
        shelfLocation: '',
        condition: 'GOOD',
        gradeLevel: 'All Grades',
        description: ''
      });
    }
    setError(null);
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === 'copiesTotal') {
      const tot = Math.max(0, parseInt(value, 10) || 0);
      setFormData(prev => ({
        ...prev,
        copiesTotal: tot,
        // If adding new, sync available with total
        copiesAvailable: !bookToEdit ? tot : Math.min(prev.copiesAvailable, tot)
      }));
    } else if (name === 'copiesAvailable') {
      const avail = Math.max(0, parseInt(value, 10) || 0);
      setFormData(prev => ({
        ...prev,
        copiesAvailable: Math.min(prev.copiesTotal, avail)
      }));
    } else if (name === 'publicationYear') {
      setFormData(prev => ({
        ...prev,
        publicationYear: parseInt(value, 10) || new Date().getFullYear()
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Book title is required');
      return;
    }
    if (!formData.author.trim()) {
      setError('Author is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-burgundy-50 text-[#800000] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined">{bookToEdit ? 'edit_document' : 'menu_book'}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {bookToEdit ? 'Edit Library Title' : 'Add Book to Catalogue'}
              </h2>
              <p className="text-xs text-gray-500">
                {bookToEdit ? 'Update inventory details and copy counts' : 'Register a new textbook, reader, or library asset'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <form id="add-book-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Book Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Spotlight CBC Mathematics Learner's Book Grade 4"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Author / Editor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="author"
                  required
                  placeholder="e.g. Kenya Literature Bureau / J. Mwangi"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  ISBN / Barcode No.
                </label>
                <input
                  type="text"
                  name="isbn"
                  placeholder="e.g. 978-9966-10-123-4"
                  value={formData.isbn}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Category / Subject Area
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Recommended Grade / Level
                </label>
                <select
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors bg-white"
                >
                  {GRADE_LEVELS.map(gr => (
                    <option key={gr} value={gr}>{gr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Publisher
                </label>
                <input
                  type="text"
                  name="publisher"
                  placeholder="e.g. Longhorn, Oxford, KLB"
                  value={formData.publisher}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Publication Year
                </label>
                <input
                  type="number"
                  name="publicationYear"
                  min="1980"
                  max="2035"
                  value={formData.publicationYear}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              {/* Copies Count */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Total Copies in Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="copiesTotal"
                  required
                  min="1"
                  value={formData.copiesTotal}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Available Copies on Shelf <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="copiesAvailable"
                  required
                  min="0"
                  max={formData.copiesTotal}
                  value={formData.copiesAvailable}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Physical Shelf / Location
                </label>
                <input
                  type="text"
                  name="shelfLocation"
                  placeholder="e.g. Shelf A-3, Cabinet 2"
                  value={formData.shelfLocation}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Physical Condition
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors bg-white"
                >
                  <option value="NEW">New / Mint</option>
                  <option value="GOOD">Good / Intact</option>
                  <option value="FAIR">Fair / Used</option>
                  <option value="POOR">Poor / Worn</option>
                  <option value="DAMAGED">Damaged / Needs Repair</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Description / Synopsis / Notes
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional brief description, volume edition, or notes on syllabus edition..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-book-form"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#800000] hover:bg-[#660000] rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">{bookToEdit ? 'save' : 'add'}</span>
                {bookToEdit ? 'Save Changes' : 'Add to Catalog'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddBookModal;
