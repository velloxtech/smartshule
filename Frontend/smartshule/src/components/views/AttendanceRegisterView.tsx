import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { AttendanceEntry, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { resolveStreamName, resolveClassName, resolveAcademicYearName } from '../../utils/formatters';

interface AttendanceRegisterViewProps {
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const AttendanceRegisterView: React.FC<AttendanceRegisterViewProps> = ({
  onOpenSmsModal,
}) => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [streamId, setStreamId] = useState('');
  const [registerDate, setRegisterDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});
  const [notifyGuardians, setNotifyGuardians] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Dynamic context and entities
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableStreams, setAvailableStreams] = useState<Array<{ id: string; name: string; classRoomId: string; className: string }>>([]);

  const isTeacher = user?.role === UserRole.TEACHER;
  const isParent = user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN;
  const teacherDisplayName = user?.fullName || user?.name || (teacherProfile ? `${teacherProfile.user?.firstName || ''} ${teacherProfile.user?.lastName || ''}`.trim() : 'Class Teacher') || 'Class Teacher';

  // Parent view state
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [parentAttendanceSummary, setParentAttendanceSummary] = useState<any>(null);
  const [parentLoading, setParentLoading] = useState(false);

  useEffect(() => {
    if (!isParent) return;
    async function loadParentData() {
      setParentLoading(true);
      try {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.data?.children && Array.isArray(portalRes.data.children)) {
          setParentChildren(portalRes.data.children);
          if (portalRes.data.children.length > 0) {
            setSelectedChildId(portalRes.data.children[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading parent children:', err);
      } finally {
        setParentLoading(false);
      }
    }
    loadParentData();
  }, [isParent]);

  useEffect(() => {
    if (!isParent || !selectedChildId) return;
    async function loadChildAttendance() {
      setParentLoading(true);
      try {
        const tId = currentContext?.currentTerm?.id || 'term-001';
        const yId = currentContext?.currentYear?.id || 'year-001';
        const sumRes = await apiService.getStudentAttendanceSummary(selectedChildId, tId, yId).catch(() => null);
        if (sumRes?.data) {
          setParentAttendanceSummary(sumRes.data);
        } else {
          const child = parentChildren.find((c) => c.id === selectedChildId);
          setParentAttendanceSummary(
            child?.attendance
              ? {
                  student: child,
                  stats: {
                    totalSessions: child.attendance.totalSessions ?? (child.attendance.presentDays ? (child.attendance.presentDays + (child.attendance.absentDays || 0)) : (child.attendance.todayStatus ? 1 : 0)),
                    present: child.attendance.presentDays ?? (child.attendance.todayStatus === 'PRESENT' ? 1 : 0),
                    absent: child.attendance.absentDays ?? (child.attendance.todayStatus === 'ABSENT' ? 1 : 0),
                    late: child.attendance.lateDays ?? (child.attendance.todayStatus === 'LATE' ? 1 : 0),
                    excused: child.attendance.excusedDays ?? 0,
                    overallAttendanceRate: child.attendance.attendanceRate ?? 100,
                  },
                  history: child.attendance.history || [],
                }
              : null
          );
        }
      } catch (err) {
        console.error('Error loading child attendance summary:', err);
      } finally {
        setParentLoading(false);
      }
    }
    loadChildAttendance();
  }, [isParent, selectedChildId, currentContext, parentChildren]);

  // Load initial data and teacher profile to lock down assigned class
  useEffect(() => {
    async function loadInitialData() {
      if (isParent) return;
      try {
        const [scRes, ctxRes, cRes, tchRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getClasses().catch(() => null),
          isTeacher ? apiService.getMyTeacherProfile().catch(() => null) : Promise.resolve(null),
        ]);

        if (scRes?.data) setSchoolInfo(scRes.data);
        if (ctxRes?.data) setCurrentContext(ctxRes.data);

        let teacherAssignedStreamId = '';
        if (tchRes?.data) {
          setTeacherProfile(tchRes.data);
          // Enforce single-class/stream restriction from assignedClassStreamIds
          if (tchRes.data.assignedClassStreamIds && tchRes.data.assignedClassStreamIds.length > 0) {
            teacherAssignedStreamId = tchRes.data.assignedClassStreamIds[0];
          }
        }

        if (cRes?.data && Array.isArray(cRes.data)) {
          setAvailableClasses(cRes.data);
          const allStreams: Array<{ id: string; name: string; classRoomId: string; className: string }> = [];
          for (const c of cRes.data) {
            const sRes = await apiService.getStreamsByClass(c.id).catch(() => null);
            if (sRes?.data && Array.isArray(sRes.data)) {
              sRes.data.forEach((st: any) => {
                allStreams.push({
                  id: st.id,
                  name: st.name,
                  classRoomId: c.id,
                  className: c.name,
                });
              });
            }
          }
          setAvailableStreams(allStreams);

          // Auto-select exact assigned class/stream for teacher
          if (teacherAssignedStreamId) {
            setStreamId(teacherAssignedStreamId);
          } else if (allStreams.length > 0) {
            setStreamId(allStreams[0].id);
          } else if (cRes.data.length > 0) {
            setStreamId(cRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load attendance initial data:', err);
      }
    }
    loadInitialData();
  }, [isParent, isTeacher]);

  // Load students & daily register strictly from database for the assigned stream/class
  useEffect(() => {
    if (isParent) return;
    if (!streamId) {
      setStudents([]);
      setAttendanceEntries({});
      return;
    }

    async function loadStudentsAndRegister() {
      try {
        const matchedStream = availableStreams.find((s) => s.id === streamId);
        const targetClassId = matchedStream ? matchedStream.classRoomId : streamId;
        const targetStreamId = matchedStream ? matchedStream.id : undefined;

        const [stRes, regRes] = await Promise.all([
          apiService.getStudents(targetStreamId ? { streamId: targetStreamId } : { classroomId: targetClassId }).catch(() => null),
          apiService.getDailyRegister(targetStreamId || '', registerDate, 'DAILY_MORNING', targetClassId).catch(() => null),
        ]);

        const studentList = (stRes?.data && Array.isArray(stRes.data)) ? stRes.data : [];
        setStudents(studentList);

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
  }, [streamId, registerDate, availableStreams]);

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

    const activeSchoolId = user?.schoolId || schoolInfo?.id;
    if (!activeSchoolId) {
      alert('School ID not found. Please ensure school is set up.');
      setIsSaving(false);
      return;
    }

    const matchedStream = availableStreams.find((s) => s.id === streamId);
    const targetClassId = matchedStream ? matchedStream.classRoomId : streamId;
    const targetStreamId = matchedStream ? matchedStream.id : undefined;

    const currentYearId = currentContext?.currentYear?.id || '';
    const currentTermId = currentContext?.currentTerm?.id || '';

    const entries = students.map((s) => ({
      studentId: s.id,
      status: attendanceEntries[s.id] || 'PRESENT',
      remarks: 'Daily morning roll-call record',
    }));

    try {
      const res = await apiService.markAttendance({
        schoolId: activeSchoolId,
        classRoomId: targetClassId,
        streamId: targetStreamId,
        academicYearId: currentYearId,
        termId: currentTermId,
        date: registerDate,
        markedByTeacherId: user?.id || teacherProfile?.id || '',
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
    const foundStream = availableStreams.find((s) => s.id === streamId);
    if (foundStream) return `${foundStream.className} - ${foundStream.name}`;
    const foundClass = availableClasses.find((c) => c.id === streamId);
    if (foundClass) return foundClass.name;
    return resolveStreamName(streamId) || resolveClassName(streamId) || 'Assigned Classroom';
  };

  const getSchoolLogoBase64 = async (): Promise<string | null> => {
    const urlsToTry = ['/logo.png', '/logo.jpg'];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (base64 && base64.startsWith('data:image')) {
          return base64;
        }
      } catch {
        // continue
      }
    }
    return null;
  };

  const downloadTeacherRegisterPDF = async () => {
    if (students.length === 0) {
      alert('No learners found for this register date.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64();
    const schoolName = 'Grace Seeds School';
    const motto = 'The Future Begins Here';

    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 15, 15);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 32, curY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}" · P.O. Box 12-20123 / 12-40123 Kisumu · Tel: 0745436312`, 32, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL DAILY ATTENDANCE & ROLL CALL REGISTER', 32, curY + 14);

    curY += 19;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, curY, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, curY, 182, 16, 'S');

    const assignedClassName = getAssignedDisplayName();
    const totalRoll = students.length;
    const rate = totalRoll > 0 ? Math.round(((presentCount + lateCount) / totalRoll) * 100) : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Class/Stream: ${assignedClassName}`, 18, curY + 5);
    doc.text(`Date: ${registerDate}`, 90, curY + 5);
    doc.text(`Educator: ${teacherDisplayName}`, 140, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(122, 18, 40);
    doc.text(`Roll: ${totalRoll} Learners`, 18, curY + 11);
    doc.setTextColor(5, 150, 105);
    doc.text(`Present: ${presentCount}`, 55, curY + 11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Absent: ${absentCount}`, 85, curY + 11);
    doc.setTextColor(217, 119, 6);
    doc.text(`Late: ${lateCount}`, 115, curY + 11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Rate: ${rate}%`, 145, curY + 11);

    curY += 20;

    const rows = students.map((s, idx) => {
      const st = attendanceEntries[s.id] || 'PRESENT';
      const phone = s.guardian?.phone || s.guardianPhone || '--';
      return [
        String(idx + 1),
        s.admissionNumber || s.admNo || '--',
        s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Learner',
        s.gender === 'FEMALE' || s.gender === 'Girl' ? 'F' : 'M',
        st,
        phone,
        st === 'ABSENT' ? 'SMS Notification Sent' : st === 'LATE' ? 'Late Arrival Noted' : 'Normal attendance',
      ];
    });

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Adm No', 'Learner Full Name', 'Sex', 'Status', 'Guardian Contact', 'Attendance Remark']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 8, fontStyle: 'bold' },
        1: { cellWidth: 22 },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 10 },
        4: { cellWidth: 22, fontStyle: 'bold' },
        5: { cellWidth: 32 },
        6: { cellWidth: 38 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 240) + 7;

    if (curY + 28 > 280) {
      doc.addPage('a4', 'portrait');
      curY = 18;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, curY, 196, curY);
    curY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(`Class Educator: ${teacherDisplayName}`, 14, curY);
    doc.line(14, curY + 6, 80, curY + 6);
    doc.text('Signature & Date', 14, curY + 10);

    doc.text('Headteacher Endorsement:', 115, curY);
    doc.line(115, curY + 6, 185, curY + 6);
    doc.text('Official Seal / Stamp & Date', 115, curY + 10);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Grace Seeds School · Official Daily Attendance Roll Register Dossier', 105, 290, { align: 'center' });

    doc.save(`Grace_Seeds_Daily_Attendance_Register_${assignedClassName.replace(/\s+/g, '_')}_${registerDate}.pdf`);
  };

  const downloadParentAttendancePDF = async () => {
    const activeChild = parentChildren.find((c) => c.id === selectedChildId) || parentChildren[0];
    if (!activeChild) return;

    const stats = parentAttendanceSummary?.stats || {
      totalSessions: activeChild?.attendance?.totalSessions ?? 0,
      present: activeChild?.attendance?.presentDays ?? (activeChild?.attendance?.todayStatus === 'PRESENT' ? 1 : 0),
      absent: activeChild?.attendance?.absentDays ?? (activeChild?.attendance?.todayStatus === 'ABSENT' ? 1 : 0),
      late: activeChild?.attendance?.lateDays ?? (activeChild?.attendance?.todayStatus === 'LATE' ? 1 : 0),
      excused: activeChild?.attendance?.excusedDays ?? 0,
      overallAttendanceRate: activeChild?.attendance?.attendanceRate ?? 100,
    };
    const history = parentAttendanceSummary?.history || [];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64();
    const schoolName = 'Grace Seeds School';
    const motto = 'The Future Begins Here';

    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 15, 15);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 32, curY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}" · P.O. Box 12-20123 / 12-40123 Kisumu · Tel: 0745436312`, 32, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL LEARNER ATTENDANCE & PUNCTUALITY CERTIFICATE', 32, curY + 14);

    curY += 19;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, curY, 182, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, curY, 182, 16, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Learner: ${activeChild.firstName} ${activeChild.lastName}`, 18, curY + 5);
    doc.text(`Admission No: ${activeChild.admissionNumber}`, 95, curY + 5);
    doc.text(`Grade/Class: ${activeChild.gradeLevel ? activeChild.gradeLevel.replace('_', ' ') : 'Primary'}`, 140, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(122, 18, 40);
    doc.text(`Attendance Standing: ${stats.overallAttendanceRate}%`, 18, curY + 11);
    doc.setTextColor(5, 150, 105);
    doc.text(`Present: ${stats.present} Days`, 70, curY + 11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Absent: ${stats.absent} Days`, 110, curY + 11);
    doc.setTextColor(217, 119, 6);
    doc.text(`Late: ${stats.late} Days`, 150, curY + 11);

    curY += 21;

    const rows = history.length > 0 ? history.map((h: any, idx: number) => [
      String(idx + 1),
      h.date,
      h.type === 'DAILY_MORNING' ? 'Morning Roll' : (h.type || 'Session'),
      h.status,
      h.remarks || 'Normal attendance logged',
    ]) : [
      ['1', new Date().toISOString().split('T')[0], 'Morning Roll', 'PRESENT', 'Normal check-in logged']
    ];

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Date', 'Session Type', 'Status', 'Teacher Note / Remarks']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, fontStyle: 'bold' },
        4: { cellWidth: 75 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    curY = (lastTable && lastTable.finalY ? lastTable.finalY : 240) + 7;

    if (curY + 28 > 280) {
      doc.addPage('a4', 'portrait');
      curY = 18;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, curY, 196, curY);
    curY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Class Educator Certification:', 14, curY);
    doc.line(14, curY + 6, 80, curY + 6);
    doc.text('Signature & Date', 14, curY + 10);

    doc.text('Headteacher Official Endorsement:', 115, curY);
    doc.line(115, curY + 6, 185, curY + 6);
    doc.text('Official Seal / Stamp & Date', 115, curY + 10);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Grace Seeds School · Official Learner Attendance Dossier', 105, 290, { align: 'center' });

    doc.save(`Grace_Seeds_Attendance_${activeChild.firstName}_${activeChild.lastName}.pdf`);
  };

  if (isParent) {
    const activeChild = parentChildren.find((c) => c.id === selectedChildId) || parentChildren[0];
    const stats = parentAttendanceSummary?.stats || {
      totalSessions: activeChild?.attendance?.totalSessions ?? 0,
      present: activeChild?.attendance?.presentDays ?? (activeChild?.attendance?.todayStatus === 'PRESENT' ? 1 : 0),
      absent: activeChild?.attendance?.absentDays ?? (activeChild?.attendance?.todayStatus === 'ABSENT' ? 1 : 0),
      late: activeChild?.attendance?.lateDays ?? (activeChild?.attendance?.todayStatus === 'LATE' ? 1 : 0),
      excused: activeChild?.attendance?.excusedDays ?? 0,
      overallAttendanceRate: activeChild?.attendance?.attendanceRate ?? 100,
    };
    const history = parentAttendanceSummary?.history || [];

    return (
      <div className="space-y-6 pb-12 font-body">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
              <span>Home</span>
              <span>/</span>
              <span>Parent Portal</span>
              <span>/</span>
              <span className="text-[#800000] font-semibold">Learner Attendance</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
              My Child's Attendance & Punctuality
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {schoolInfo?.name || 'Grace Seeds School'} · Term check-in records, presence rate, and roll history
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {parentChildren.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant">Select Child:</span>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-bold text-on-surface shadow-xs"
                >
                  {parentChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName} ({child.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={downloadParentAttendancePDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-[#7a1228] rounded-xl hover:bg-rose-100 text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Download official learner attendance certificate as PDF"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Record (PDF)</span>
            </button>
          </div>
        </div>

        {activeChild && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {activeChild.firstName?.[0]}{activeChild.lastName?.[0]}
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">
                  {activeChild.firstName} {activeChild.lastName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                  <span className="font-data-mono">Adm: {activeChild.admissionNumber}</span>
                  <span>•</span>
                  <span>{activeChild.gradeLevel ? activeChild.gradeLevel.replace('_', ' ') : 'Primary'}</span>
                  <span>•</span>
                  <span>{resolveStreamName(activeChild.streamId, activeChild.streamName || activeChild.stream?.name) || 'Stream A'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                Status: {activeChild.attendance?.todayStatus || 'PRESENT'} Today
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <div className="text-xs font-bold text-on-surface-variant uppercase">Overall Attendance</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.overallAttendanceRate}%</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">Target: 95%+ required</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <div className="text-xs font-bold text-on-surface-variant uppercase">Days Present</div>
            <div className="text-2xl font-black text-[#800000] mt-1">{stats.present}</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">Out of {stats.totalSessions} sessions</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <div className="text-xs font-bold text-on-surface-variant uppercase">Days Absent</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.absent}</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">SMS notifications triggered</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <div className="text-xs font-bold text-on-surface-variant uppercase">Late / Excused</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.late + (stats.excused || 0)}</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">Documented reasons</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <div>
              <h3 className="font-bold text-base text-[#800000]">Term Roll-Call Check-in History</h3>
              <p className="text-xs text-on-surface-variant">Daily morning roll-call logs recorded by class educator</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container text-xs font-bold">
              {history.length} Entries Recorded
            </span>
          </div>

          {parentLoading ? (
            <div className="py-8 text-center text-xs text-on-surface-variant">Loading attendance logs...</div>
          ) : history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase font-bold border-b border-outline-variant/20">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Teacher Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {history.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-container-low/50">
                      <td className="py-2.5 px-3 font-semibold">{h.date}</td>
                      <td className="py-2.5 px-3 text-on-surface-variant">
                        {h.type === 'DAILY_MORNING' ? 'Morning Roll' : h.type || 'Session'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            h.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.status === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800'
                              : h.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-on-surface-variant italic">{h.remarks || 'Normal attendance logged'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-on-surface-variant text-xs space-y-1">
              <span className="material-symbols-outlined text-3xl text-emerald-600">verified</span>
              <p className="font-bold text-sm text-on-surface">Good Attendance Standing</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                No unexcused absences or disciplinary attendance flags logged for this term.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            {schoolInfo?.name || 'Grace Seeds School'} · Morning roll call records, absence reasons, and parent SMS alerts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={downloadTeacherRegisterPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 border border-rose-200 text-[#7a1228] rounded-xl hover:bg-rose-100 text-sm font-semibold shadow-xs transition-all cursor-pointer"
            title="Download Daily Attendance Register as PDF"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download Register (PDF)</span>
          </button>
          <button
            onClick={() => onOpenSmsModal('absentee')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] text-sm font-semibold shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">sms</span>
            <span>Trigger Absentee SMS Alerts</span>
          </button>
        </div>
      </div>

      {/* Date & Stream Selector (Locked/Disabled for single-class assigned teachers) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">
              {isTeacher ? 'Assigned Class / Stream:' : 'Class / Stream:'}
            </span>
            {isTeacher ? (
              <span className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-bold text-primary flex items-center gap-1.5 shadow-xs">
                <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
                {getAssignedDisplayName()} (Assigned Cohort)
              </span>
            ) : (
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface cursor-pointer"
              >
                {availableStreams.length > 0 && (
                  <optgroup label="Configured Streams">
                    {availableStreams.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.className} - {st.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableClasses.length > 0 && (
                  <optgroup label="Classes">
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
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
            <p className="text-xs text-on-surface-variant">{teacherDisplayName} · {getAssignedDisplayName()}</p>
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