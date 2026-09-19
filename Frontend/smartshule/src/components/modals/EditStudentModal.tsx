import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { apiService } from '../../services/api';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onStudentUpdated: (updated: Student) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
}) => {
  const [gradeLevel, setGradeLevel] = useState('GRADE_7');
  const [streamId, setStreamId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false);
  const [guardianSuccess, setGuardianSuccess] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<{ id: string; name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      // Map grade
      const normalizedGrade = student.grade.toUpperCase().replace(' ', '_');
      setGradeLevel(normalizedGrade.includes('GRADE') || normalizedGrade.includes('PP') ? normalizedGrade : 'GRADE_7');
      setStreamName(student.stream || '');
      setStatus(student.status?.toUpperCase() || 'ACTIVE');
      setStreamId('');
      setGuardianId('');
      setSuccess(null);
      setGuardianSuccess(null);

      apiService.getClasses().then(async (cRes) => {
        if (cRes.success && cRes.data) {
          const targetClass = cRes.data.find(c => c.name.toLowerCase().includes(student.grade?.toLowerCase() || ''));
          if (targetClass) {
            const sRes = await apiService.getStreamsByClass(targetClass.id);
            if (sRes.success && sRes.data) {
              setAvailableStreams(sRes.data.map(st => ({ id: st.id, name: st.name })));
              const currentSt = sRes.data.find(st => st.name.toLowerCase() === student.stream?.toLowerCase());
              if (currentSt) setStreamId(currentSt.id);
            }
          }
        }
      }).catch(() => {});
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        gradeLevel,
        streamId,
        status,
        medicalConditions: medicalConditions || undefined,
        specialNeeds: specialNeeds || undefined,
      };

      await apiService.updateStudent(student.id, updateData);

      const updatedStudent: Student = {
        ...student,
        grade: gradeLevel.replace('_', ' '),
        stream: streamName,
        status: status === 'ACTIVE' ? 'Active' : status,
      };

      onStudentUpdated(updatedStudent);
      setSuccess('Learner record updated successfully in CBC database!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGuardian = async () => {
    if (!guardianId.trim()) return;
    setIsLinkingGuardian(true);
    setGuardianSuccess(null);
    try {
      await apiService.linkGuardian(student.id, guardianId.trim());
      setGuardianSuccess(`Guardian ${guardianId} linked successfully!`);
      setTimeout(() => setGuardianSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to link guardian');
    } finally {
      setIsLinkingGuardian(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Edit Learner & Guardian Link</h3>
              <p className="text-xs text-rose-100">
                {student.name} · Adm #{student.admNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleUpdate} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          {error && (
            <div className="p-3 bg-error-container/20 border border-error/30 rounded-lg text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-secondary-container/20 border border-secondary/30 rounded-lg text-secondary text-xs flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 bg-surface-container-low p-3 rounded-xl text-xs">
            <div>
              <span className="text-on-surface-variant font-medium block">NEMIS / UPI</span>
              <span className="font-bold text-primary font-data-mono">{student.upi}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-medium block">Current Fee Balance</span>
              <span className="font-bold text-on-surface font-data-mono">
                KES {student.feeBalance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                CBC Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs focus:outline-primary"
              >
                <option value="PP1">PP1 (Pre-Primary 1)</option>
                <option value="PP2">PP2 (Pre-Primary 2)</option>
                <option value="GRADE_1">Grade 1</option>
                <option value="GRADE_2">Grade 2</option>
                <option value="GRADE_3">Grade 3</option>
                <option value="GRADE_4">Grade 4</option>
                <option value="GRADE_5">Grade 5</option>
                <option value="GRADE_6">Grade 6</option>
                <option value="GRADE_7">Grade 7 (Junior Sec)</option>
                <option value="GRADE_8">Grade 8 (Junior Sec)</option>
                <option value="GRADE_9">Grade 9 (Junior Sec)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Stream (Optional)
                </label>
                <span className="text-[10px] text-outline">Optional</span>
              </div>
              <select
                value={streamId}
                onChange={(e) => {
                  setStreamId(e.target.value);
                  const selectedSt = availableStreams.find(s => s.id === e.target.value);
                  setStreamName(selectedSt ? selectedSt.name : '');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs focus:outline-primary"
              >
                <option value="">-- No Stream (Single Class) --</option>
                {availableStreams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} Stream
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Enrollment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs focus:outline-primary"
              >
                <option value="ACTIVE">ACTIVE (Enrolled)</option>
                <option value="INACTIVE">INACTIVE (Dormant)</option>
                <option value="TRANSFERRED">TRANSFERRED (Nemis Released)</option>
                <option value="GRADUATED">GRADUATED (Alumni)</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Special Needs / CBC Adaptations
              </label>
              <input
                type="text"
                placeholder="e.g. Visual adaptation, None"
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Medical Conditions / Allergies
            </label>
            <input
              type="text"
              placeholder="e.g. Asthma, Peanuts allergy, None"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs focus:outline-primary"
            />
          </div>

          {/* Link Guardian Box */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">diversity_3</span>
                <span>Guardian Relationship & Nemis Link</span>
              </div>
              <span className="text-[10px] text-secondary font-bold">MoE Verified</span>
            </div>

            <div className="text-xs text-on-surface-variant">
              Currently linked: <strong className="text-on-surface">{student.guardianName}</strong> ({student.guardianPhone})
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={guardianId}
                onChange={(e) => setGuardianId(e.target.value)}
                placeholder="Enter Guardian User ID"
                className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs focus:outline-primary font-data-mono"
              />
              <button
                type="button"
                onClick={handleLinkGuardian}
                disabled={isLinkingGuardian || !guardianId.trim()}
                className="px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-secondary-container disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                {isLinkingGuardian ? 'Linking...' : 'Link Guardian'}
              </button>
            </div>

            {guardianSuccess && (
              <p className="text-[11px] text-secondary font-medium mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                {guardianSuccess}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
