import React, { useState, useEffect } from 'react';
import { Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface LearnerProfileModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onGradeStudent?: (student: Student) => void;
}

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  student,
  onClose,
  onGradeStudent,
}) => {
  const { user } = useAuth();
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isTeacher = user?.role === UserRole.TEACHER;

  useEffect(() => {
    if (!isOpen || !student?.id) return;

    async function loadFullDetails() {
      setLoading(true);
      try {
        const res = await apiService.getStudentById(student!.id);
        if (res?.data) {
          setStudentDetails(res.data);
        }
      } catch (err) {
        console.error('Failed to load learner details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFullDetails();
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const raw = studentDetails || {};
  const guardians = raw.guardians || [];
  const primaryGuardian = guardians[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Maroon Academic Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border border-white/20">
              {(studentDetails?.profilePhotoUrl || (student as any).profilePhotoUrl) ? (
                <img
                  src={studentDetails?.profilePhotoUrl || (student as any).profilePhotoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                student.name.split(' ').map((n) => n[0]).join('')
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{student.name}</h3>
              <p className="text-xs text-rose-100">
                Adm #{student.admNo} · {student.grade} {student.stream}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
          {/* Role Access Notice */}
          {isTeacher && (
            <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface-variant flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Pedagogical & Emergency Profile</span>
              </span>
              <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold">
                Financial Data Hidden
              </span>
            </div>
          )}

          {/* Academic Placement */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="font-bold uppercase text-[11px] text-[#7a1228] tracking-wider block">
              Academic & Enrollment Details
            </span>
            <div className="grid grid-cols-2 gap-2 text-on-surface">
              <div>
                <span className="text-on-surface-variant block text-[10px]">Admission Number:</span>
                <span className="font-bold font-data-mono">{student.admNo}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">MoE UPI / NEMIS:</span>
                <span className="font-bold font-data-mono text-secondary">{student.upi}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Class & Stream:</span>
                <span className="font-semibold">{student.grade} - {student.stream}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Gender:</span>
                <span className="font-semibold">{student.gender}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Date of Birth:</span>
                <span className="font-data-mono font-semibold">{raw.dateOfBirth || '2013-05-14'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Enrollment Status:</span>
                <span className="font-bold text-secondary">{student.status}</span>
              </div>
            </div>
          </div>

          {/* Emergency & Guardian Contact */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="font-bold uppercase text-[11px] text-[#7a1228] tracking-wider block">
              Parent / Guardian Emergency Contact
            </span>
            <div className="grid grid-cols-2 gap-2 text-on-surface">
              <div>
                <span className="text-on-surface-variant block text-[10px]">Primary Guardian:</span>
                <span className="font-semibold">
                  {primaryGuardian?.user ? `${primaryGuardian.user.firstName} ${primaryGuardian.user.lastName}` : student.guardianName}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Relationship:</span>
                <span className="font-semibold">{primaryGuardian?.relationship || 'Parent'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Emergency Contact Phone:</span>
                <a
                  href={`tel:${primaryGuardian?.emergencyContact || student.guardianPhone}`}
                  className="font-bold font-data-mono text-primary hover:underline"
                >
                  {primaryGuardian?.emergencyContact || student.guardianPhone}
                </a>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px]">Email Address:</span>
                <span className="font-data-mono">{primaryGuardian?.user?.email || 'guardian@smartshule.ac.ke'}</span>
              </div>
            </div>
          </div>

          {/* Health & Special Needs */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="font-bold uppercase text-[11px] text-[#7a1228] tracking-wider block">
              Medical & Learning Support
            </span>
            <div className="space-y-1.5 text-on-surface">
              <div>
                <span className="text-on-surface-variant text-[10px] block">Medical Conditions / Allergies:</span>
                <span className="font-medium text-xs">
                  {raw.medicalConditions || 'No chronic medical conditions or severe allergies recorded.'}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant text-[10px] block">Special Educational Needs:</span>
                <span className="font-medium text-xs">
                  {raw.specialNeeds || 'None reported. Learner follows mainstream standard CBC curriculum.'}
                </span>
              </div>
            </div>
          </div>

          {/* CBC Competency & Attendance Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-center">
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">
                Overall CBC Rubric
              </span>
              <span className="text-lg font-bold text-primary block mt-0.5">
                {student.cbcRating} · Meeting
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-center">
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">
                Term Attendance Rate
              </span>
              <span className="text-lg font-bold font-data-mono text-secondary block mt-0.5">
                {student.attendanceRate}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onGradeStudent?.(student);
              }}
              className="flex-1 py-2.5 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">grade</span>
              <span>Upload Marks for this Learner</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-surface-container text-on-surface font-semibold rounded-lg hover:bg-surface-container-high text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
