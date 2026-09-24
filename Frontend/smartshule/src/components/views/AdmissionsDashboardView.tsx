import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student, Teacher } from '../../types';

interface AdmissionsDashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  onOpenAdmitModal: () => void;
  onOpenOnboardTeacher: () => void;
  onNavigateTab: (tabId: any) => void;
}

export const AdmissionsDashboardView: React.FC<AdmissionsDashboardViewProps> = ({
  students,
  teachers,
  onOpenAdmitModal,
  onOpenOnboardTeacher,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const totalLearners = students.length;
  const boysCount = students.filter((s) => s.gender === 'MALE').length;
  const girlsCount = students.filter((s) => s.gender === 'FEMALE').length;
  const verifiedGuardians = students.filter((s) => s.guardianPhone && s.guardianPhone.length >= 9).length;

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.guardianName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Admissions Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-sky-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Registrar & Admissions Desk
              </span>
              <span className="flex items-center gap-1 text-xs text-sky-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                Intake Portal Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Learner Admissions & Staff Onboarding Command
            </h1>
            <p className="mt-1 text-sm text-sky-100 max-w-xl">
              Processing student enrollments, guardian records verification, classroom stream allocations, and teacher onboarding.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenAdmitModal}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Admit New Learner</span>
            </button>
            <button
              onClick={onOpenOnboardTeacher}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Onboard Teacher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Intake & Demographics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enrolled Learners</span>
            <span className="material-symbols-outlined text-blue-700 text-[20px]">school</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{totalLearners}</div>
            <div className="text-[11px] text-blue-700 font-semibold mt-1">
              Active across Playgroup through Grade 9
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Gender Ratio</span>
            <span className="material-symbols-outlined text-purple-700 text-[20px]">wc</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">
              {boysCount}B : {girlsCount}G
            </div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              {totalLearners > 0 ? `${Math.round((boysCount / totalLearners) * 100)}% Boys · ${Math.round((girlsCount / totalLearners) * 100)}% Girls` : 'No learners yet'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Guardian Verification</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">contact_phone</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{verifiedGuardians}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              With verified phone numbers for SMS/notices
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Teaching Staff Roster</span>
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">badge</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{teachers.length}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              National ID credentialed
            </div>
          </div>
        </div>
      </div>

      {/* Recent Admissions Directory */}
      <div className="p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">Recent Student Admissions</h2>
            <p className="text-xs text-on-surface-variant">
              Complete records of newly registered CBC learners and guardian contact points.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or guardian..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant/50 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[36px]">group_off</span>
            <span className="font-semibold text-sm text-on-surface">No Students Found</span>
            <span>Click &ldquo;Admit New Learner&rdquo; to process your first student intake.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Adm #</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Grade & Stream</th>
                  <th className="py-3 px-4">Guardian Contact</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredStudents.slice(0, 8).map((student) => (
                  <tr key={student.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">
                      {student.admissionNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-on-surface">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        student.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-on-surface font-medium">
                      {student.gradeLevel || 'Grade 1'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-on-surface font-semibold">{student.guardianName || 'Guardian'}</div>
                      <div className="text-on-surface-variant text-[11px]">{student.guardianPhone || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {student.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admissions Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">badge</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Learners & Guardians</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Full student demographic and guardian directory
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">person_pin</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Teachers & Staff Roster</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Manage teacher assignments & employee credentials
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('classes-streams')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">meeting_room</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Classes & Streams</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Stream capacity and classroom allocations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
