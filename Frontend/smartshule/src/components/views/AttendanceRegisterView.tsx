import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { AttendanceEntry, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AttendanceRegisterViewProps {
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const AttendanceRegisterView: React.FC<AttendanceRegisterViewProps> = ({
  onOpenSmsModal,
}) => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [streamId, setStreamId] = useState('stream-g7-east');
  const [registerDate, setRegisterDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});
  const [notifyGuardians, setNotifyGuardians] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const isTeacher = user?.role === UserRole.TEACHER;
  const teacherDisplayName = user?.name || (teacherProfile ? `${teacherProfile.user?.firstName || ''} ${teacherProfile.user?.lastName || ''}`.trim() : 'Class Teacher') || 'Class Teacher';

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await apiService.getClasses();
        if (res.success && res.data) {
          setAvailableClasses(res.data);
        }
      } catch {}
    }
    loadClasses();
  }, []);

  // Load teacher profile if educator
  useEffect(() => {
    async function loadTeacherProfile() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
            if (res.data.assignedClassStreamIds?.length) {
              setStreamId(res.data.assignedClassStreamIds[0]);
            }
          }
        } catch {
          // Keep defaults
        }
      }
    }
    loadTeacherProfile();
  }, [isTeacher]);

  // Load students & daily register strictly from database
  useEffect(() => {
    async function loadStudentsAndRegister() {
      try {
        const [stRes, regRes] = await Promise.all([
          apiService.getStudents({ streamId }).catch(() => null),
          apiService.getDailyRegister(streamId, registerDate).catch(() => null),
        ]);

        const studentList = (stRes?.data && Array.isArray(stRes.data)) ? stRes.data : [];
        setStudents(studentList);

        // Pre-populate entries
        const initialStatusMap: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
        if (regRes?.success && regRes.data?.entries?.length) {
          regRes.data.entries.forEach((e: AttendanceEntry) => {
            initialStatusMap[e.studentId] = e.status;
          });
        } else {
          studentList.forEach((s: any) => {
            initialStatusMap[s.id] = 'PRESENT';
          });
        }
        setAttendanceEntries(initialStatusMap);
      } catch (err) {
        console.error('Error loading attendance register:', err);
        setStudents([]);
        setAttendanceEntries({});
      }
    }
    loadStudentsAndRegister();
  }, [streamId, registerDate]);

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setAttendanceEntries((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveRegister = async () => {
    if (students.length === 0) return;
    setIsSaving(true);
    setSaveMessage(null);

    const entries = students.map((s) => ({
      studentId: s.id,
      status: attendanceEntries[s.id] || 'PRESENT',
      remarks: 'Daily morning roll-call record',
    }));

    try {
      const targetClassId = streamId.startsWith('class-') ? streamId : 'class-grade-7';
      const targetStreamId = streamId.startsWith('stream-') ? streamId : undefined;

      const res = await apiService.markAttendance({
        schoolId: 'school-001',
        classRoomId: targetClassId,
        streamId: targetStreamId,
        academicYearId: 'year-2026',
        termId: 'term-2026-1',
        date: registerDate,
        markedByTeacherId: teacherProfile?.id || 'teacher-001',
        notifyGuardiansForAbsence: notifyGuardians,
        entries,
      });

      if (res.success) {
        setSaveMessage('Daily register successfully saved and synced to database!');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance register');
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceEntries).filter((st) => st === 'PRESENT').length;
  const absentCount = Object.values(attendanceEntries).filter((st) => st === 'ABSENT').length;
  const lateCount = Object.values(attendanceEntries).filter((st) => st === 'LATE').length;

  const getAssignedDisplayName = () => {
    if (streamId === 'class-pp1') return 'PP1 Class';
    if (streamId === 'class-pp2') return 'PP2 Class';
    if (streamId === 'class-grade-1') return 'Grade 1';
    if (streamId === 'class-grade-7' || streamId === 'stream-g7-east') return 'Grade 7 East';
    if (streamId === 'stream-g7-west') return 'Grade 7 West';
    const foundClass = availableClasses.find(c => c.id === streamId);
    if (foundClass) return foundClass.name;
    return streamId.replace('class-', '').replace('stream-', '');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Attendance & Daily Roll</span>
            <span>/</span>
            <span className="text-primary font-semibold">Daily Register</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Biometric & Teacher Roll-Call Register
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Grace Seeds School · Morning roll call records, absence reasons, and parent SMS alerts
          </p>
        </div>

        <button
          onClick={() => onOpenSmsModal('absentee')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7a1228] text-white rounded-lg hover:bg-[#5e0d1e] text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">sms</span>
          <span>Trigger Absentee SMS Alerts</span>
        </button>
      </div>

      {/* Date & Stream Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">
              {isTeacher ? 'Assigned Register:' : 'Class / Stream:'}
            </span>
            {isTeacher ? (
              <span className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 shadow-xs">
                <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
                {getAssignedDisplayName()} (Class Teacher)
              </span>
            ) : (
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface cursor-pointer"
              >
                <optgroup label="Single Classes (No Streams)">
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Configured Streams">
                  <option value="stream-g7-east">Grade 7 - East</option>
                  <option value="stream-g7-west">Grade 7 - West</option>
                </optgroup>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">Date:</span>
            <input
              type="date"
              value={registerDate}
              onChange={(e) => setRegisterDate(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="notifyGuardians"
              checked={notifyGuardians}
              onChange={(e) => setNotifyGuardians(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="notifyGuardians" className="text-xs font-semibold text-on-surface">
              Auto-SMS absent guardians
            </label>
          </div>
          <button
            onClick={handleSaveRegister}
            disabled={isSaving || students.length === 0}
            className="px-4 py-2 bg-secondary text-white font-bold rounded-lg hover:bg-secondary-container text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Saving...' : 'Save Register'}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Enrolled</span>
            <div className="text-xl font-bold font-data-mono text-on-surface">{students.length}</div>
          </div>
          <span className="material-symbols-outlined text-[#7a1228] text-[24px]">groups</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-secondary uppercase">Present</span>
            <div className="text-xl font-bold font-data-mono text-secondary">{presentCount}</div>
          </div>
          <span className="material-symbols-outlined text-secondary text-[24px]">how_to_reg</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-error uppercase">Absent</span>
            <div className="text-xl font-bold font-data-mono text-error">{absentCount}</div>
          </div>
          <span className="material-symbols-outlined text-error text-[24px]">person_off</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase">Late Arrivals</span>
            <div className="text-xl font-bold font-data-mono text-amber-700">{lateCount}</div>
          </div>
          <span className="material-symbols-outlined text-amber-700 text-[24px]">schedule</span>
        </div>
      </div>

      {/* Active Class Register Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <h3 className="font-bold text-base text-[#7a1228]">Daily Morning Roll-Call Register</h3>
            <p className="text-xs text-on-surface-variant">{teacherDisplayName} · Grade 7 East</p>
          </div>
          <span className="px-3 py-1 rounded bg-secondary-container text-on-secondary-container text-xs font-bold">
            Live Register Active
          </span>
        </div>

        {students.length > 0 ? (
          <div className="space-y-2">
            {students.map((st) => {
              const currentStatus = attendanceEntries[st.id] || 'PRESENT';
              const displayName = st.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || st.name || 'Learner';
              return (
                <div
                  key={st.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface-container-low text-xs gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7a1228] text-white flex items-center justify-center font-bold text-xs">
                      {displayName.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-on-surface">{displayName}</div>
                      <div className="text-[11px] text-outline font-data-mono">{st.admissionNumber || st.admNo}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => {
                      const isSelected = currentStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(st.id, status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? status === 'PRESENT'
                                ? 'bg-secondary text-white shadow-xs'
                                : status === 'ABSENT'
                                ? 'bg-error text-white shadow-xs'
                                : status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-[#7a1228] text-white shadow-xs'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-on-surface-variant text-xs space-y-2">
            <span className="material-symbols-outlined text-4xl text-outline">group_off</span>
            <p className="font-bold text-sm text-on-surface">No learners enrolled in this stream</p>
            <p className="text-xs text-outline">Learners must be registered in this stream in the database.</p>
          </div>
        )}
      </div>
    </div>
  );
};
