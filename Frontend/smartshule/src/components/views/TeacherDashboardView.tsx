import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Student, TimetableSlot, SchemeOfWork, LessonPlan } from '../../types';
import { EditTeacherProfileModal } from '../modals/EditTeacherProfileModal';
import { resolveGradeName, resolveStreamName } from '../../utils/formatters';
import { TeacherGeofenceClockInCard } from './TeacherGeofenceClockInCard';

interface TeacherDashboardViewProps {
  onNavigateTab: (tabId: any) => void;
  onOpenUploadMarks: (student?: Student) => void;
  onOpenNewLessonPlan: () => void;
  onOpenNewScheme: () => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  onNavigateTab,
  onOpenUploadMarks,
  onOpenNewLessonPlan,
  onOpenNewScheme,
}) => {
  const { user } = useAuth();

  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [todayRegister, setTodayRegister] = useState<any>(null);
  const [mySlots, setMySlots] = useState<TimetableSlot[]>([]);
  const [mySchemes, setMySchemes] = useState<SchemeOfWork[]>([]);
  const [myLessonPlans, setMyLessonPlans] = useState<LessonPlan[]>([]);
  const [myAssessmentsCount, setMyAssessmentsCount] = useState<number>(0);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [resolvedAssignedClass, setResolvedAssignedClass] = useState<string>('Assigned Subject Teacher');
  const [loading, setLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];

  const getSchoolLogoBase64 = async (customUrl?: string): Promise<string | null> => {
    const urlsToTry = [customUrl, '/logo.png', '/logo.jpg'].filter(Boolean) as string[];
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
        // try next fallback
      }
    }
    return null;
  };

  useEffect(() => {
    async function loadTeacherData() {
      setLoading(true);
      try {
        // 1. Teacher Profile, Academic Context, Classes and School Info
        const [profileRes, ctxRes, classesRes, schoolRes] = await Promise.all([
          apiService.getMyTeacherProfile().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getClasses().catch(() => null),
          apiService.getSchool().catch(() => null),
        ]);
        const profile = profileRes?.data || null;
        setTeacherProfile(profile);
        const ctx = ctxRes?.data || null;
        setCurrentContext(ctx);
        if (schoolRes?.data) setSchoolInfo(schoolRes.data);

        // Fetch streams from database to build exact class and stream maps
        const classList = classesRes?.data || [];
        const classMap = new Map<string, string>();
        const streamMap = new Map<string, string>();
        const allStreams: any[] = [];

        for (const c of classList) {
          const cName = c.name || resolveGradeName(c.gradeLevel);
          classMap.set(c.id, cName);
          try {
            const strRes = await apiService.getStreamsByClass(c.id);
            if (strRes?.success && Array.isArray(strRes.data)) {
              for (const s of strRes.data) {
                const sName = resolveStreamName(s.id, s.name);
                const fullStreamName = `${cName} - ${sName}`;
                streamMap.set(s.id, fullStreamName);
                allStreams.push({ ...s, classRoom: c, fullStreamName });
              }
            }
          } catch {
            // continue
          }
        }

        // Determine assigned stream IDs from DB profile or classTeacherId assignment
        let assignedStreamIds: string[] = Array.isArray(profile?.assignedClassStreamIds)
          ? profile.assignedClassStreamIds
          : [];

        if (assignedStreamIds.length === 0 && profile?.id) {
          const matchingStream = allStreams.find((s) => s.classTeacherId === profile.id);
          if (matchingStream) {
            assignedStreamIds = [matchingStream.id];
          }
        }

        let resolvedClassName = 'Assigned Subject Teacher';
        if (assignedStreamIds.length > 0) {
          const names = assignedStreamIds.map((id) => streamMap.get(id) || classMap.get(id) || resolveStreamName(id));
          const uniqueNames = Array.from(new Set(names)).filter(Boolean);
          if (uniqueNames.length > 0) {
            resolvedClassName = uniqueNames.join(', ');
          }
        }
        setResolvedAssignedClass(resolvedClassName);

        const assignedStreamId = assignedStreamIds[0];
        const teacherId = profile?.id;
        const termId = ctx?.currentTerm?.id;

        // 2. Parallel data fetching
        const [stRes, regRes, ttRes, schRes, lpRes, formRes, sumRes] = await Promise.all([
          apiService.getStudents({ streamId: assignedStreamId || undefined }).catch(() => null),
          assignedStreamId ? apiService.getDailyRegister(assignedStreamId, todayDate).catch(() => null) : Promise.resolve(null),
          teacherId ? apiService.getTeacherTimetable(teacherId, termId).catch(() => null) : Promise.resolve(null),
          teacherId ? apiService.getSchemes({ teacherId }).catch(() => null) : Promise.resolve(null),
          teacherId ? apiService.getLessonPlans({ teacherId }).catch(() => null) : Promise.resolve(null),
          apiService.listFormatives().catch(() => null),
          apiService.listSummatives().catch(() => null),
        ]);

        if (stRes?.data && Array.isArray(stRes.data)) {
          const mapped: Student[] = stRes.data.map((s: any) => ({
            id: s.id,
            admNo: s.admissionNumber || s.admNo || '--',
            upi: s.upiNumber || s.upi || '--',
            nemis: s.upiNumber || s.nemis || '--',
            name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Learner',
            gender: s.gender === 'FEMALE' || s.gender === 'Girl' ? 'Girl' : 'Boy',
            grade: resolveGradeName(s.gradeLevel || s.grade),
            stream: streamMap.get(s.streamId) || resolveStreamName(s.streamId, s.stream?.name || s.streamName) || '--',
            guardianName: s.guardian ? `${s.guardian.firstName || ''} ${s.guardian.lastName || ''}`.trim() : (s.guardianName || '--'),
            guardianPhone: s.guardian?.phone || s.guardianPhone || '--',
            feeBalance: s.feeBalance || 0,
            totalFee: s.totalFee || 0,
            attendanceRate: s.attendanceRate ?? 0,
            CBCRating: s.CBCRating || '--',
            status: s.status === 'ACTIVE' || s.status === 'Active' ? 'Active' : (s.status || 'Active'),
          }));
          setMyStudents(mapped);
        } else {
          setMyStudents([]);
        }

        if (regRes?.data) {
          setTodayRegister(regRes.data);
        } else {
          setTodayRegister(null);
        }

        if (ttRes?.data && Array.isArray(ttRes.data)) {
          setMySlots(ttRes.data);
        } else {
          setMySlots([]);
        }

        if (schRes?.data && Array.isArray(schRes.data)) {
          setMySchemes(schRes.data);
        } else {
          setMySchemes([]);
        }

        if (lpRes?.data && Array.isArray(lpRes.data)) {
          setMyLessonPlans(lpRes.data);
        } else {
          setMyLessonPlans([]);
        }

        const totalAssessments = (formRes?.data?.length || 0) + (sumRes?.data?.length || 0);
        setMyAssessmentsCount(totalAssessments);
      } catch (err) {
        console.error('Error loading teacher dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, [todayDate]);

  const currentTeacherUser = teacherProfile?.user || user;
  const teacherName = currentTeacherUser ? `${currentTeacherUser.firstName} ${currentTeacherUser.lastName}` : 'Teacher';
  const tscNumber = teacherProfile?.tscNumber || 'TSC Pending / Optional';
  const qualification = teacherProfile?.qualification;
  const specialization = teacherProfile?.specialization?.length
    ? teacherProfile.specialization.join(', ')
    : 'CBC Educator';
  const assignedClass = resolvedAssignedClass;

  // Calculate Roll Call status
  const totalInClass = myStudents.length;
  const registerEntries = todayRegister?.entries || [];
  const hasRegisterToday = registerEntries.length > 0;
  const presentCount = registerEntries.filter((e: any) => e.status === 'PRESENT' || e.status === 'LATE').length;
  const attendancePct = hasRegisterToday && totalInClass > 0
    ? Math.round((presentCount / totalInClass) * 100)
    : 0;

  const boysCount = myStudents.filter((s) => s.gender === 'Boy').length;
  const girlsCount = myStudents.filter((s) => s.gender === 'Girl').length;

  const downloadRosterPDF = async () => {
    if (myStudents.length === 0) {
      alert('No learners available in this roster to download.');
      return;
    }
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || 'Grace Seeds School';
    const motto = schoolInfo?.motto || 'The Future Begins Here';

    // Top burgundy accent bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 14;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 18, 18);
      } catch {
        // fallback
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 36, curY + 6);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}"`, 36, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Ministry of Education CBC Official Class Register & Emergency Roster', 36, curY + 16);

    curY += 24;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, curY, 196, curY);

    curY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`CLASS LEARNER ROSTER · ${assignedClass.toUpperCase()}`, 14, curY);

    curY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const termLabel = currentContext?.currentTerm?.name ? `${currentContext.currentTerm.name}` : 'Term 1';
    const yearLabel = currentContext?.currentYear?.year ? `${currentContext.currentYear.year}` : new Date().getFullYear().toString();
    doc.text(`Educator: Tr. ${teacherName} (${tscNumber}) · Academic Period: ${termLabel}, ${yearLabel}`, 14, curY);

    curY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 18, 40);
    doc.text(
      `Total Enrolled: ${totalInClass} Learners (${boysCount} Boys · ${girlsCount} Girls) · Roll Call: ${
        hasRegisterToday ? `${attendancePct}% Present (${presentCount}/${totalInClass})` : 'Not Marked Today'
      }`,
      14,
      curY
    );

    curY += 4;

    const tableRows = myStudents.map((st, idx) => [
      (idx + 1).toString(),
      st.name,
      st.admNo,
      st.upi,
      st.gender,
      st.guardianName,
      st.guardianPhone,
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Learner Name', 'Adm #', 'UPI / NEMIS', 'Gender', 'Guardian / Contact', 'Emergency Phone']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 46 },
        6: { cellWidth: 24, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 200) + 10;
    if (finalY + 30 > 285) {
      doc.addPage('a4', 'portrait');
      finalY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Certified by Class Teacher: Tr. ${teacherName} ___________________________   Date: ${new Date().toLocaleDateString()}`, 14, finalY);
    doc.text('Approved by Principal / Head Teacher: ___________________________   Official Rubber Stamp: [                ]', 14, finalY + 8);

    doc.setFontSize(7.5);
    doc.text(`Grace Seeds School · Generated on ${new Date().toLocaleString()} · Confidential Pedagogical Document`, 105, 290, { align: 'center' });

    doc.save(`Grace_Seeds_School_Roster_${assignedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Teacher Welcome & Profile Banner */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#7a1228] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {currentTeacherUser?.firstName?.[0] || 'T'}{currentTeacherUser?.lastName?.[0] || 'R'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
                Welcome, Tr. {teacherName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7a1228]/10 text-[#7a1228]">
                CBC Educator
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-data-mono font-semibold bg-surface-container text-on-surface-variant">
                {tscNumber}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <span className="material-symbols-outlined text-[15px]">meeting_room</span>
                {assignedClass}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                {specialization}
              </span>
              {qualification && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-[15px]">school</span>
                    {qualification}
                  </span>
                </>
              )}
              {currentContext?.currentTerm?.name && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-data-mono text-secondary font-semibold">
                    {currentContext.currentTerm.name}{currentContext.currentYear?.year ? `, ${currentContext.currentYear.year}` : ''}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons Header */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold shadow-xs border border-outline-variant/30 transition-all cursor-pointer"
            title="Edit your teacher profile, contact information, or learning areas"
          >
            <span className="material-symbols-outlined text-[16px] text-[#7a1228]">edit_note</span>
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => onNavigateTab('attendance-register')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Take Roll Call</span>
          </button>
          <button
            onClick={() => onNavigateTab('occurrence-records')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold shadow-xs border border-outline-variant/30 transition-all cursor-pointer"
            title="Log or view today's incidents in the Daily Occurrence Book"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-700">event_note</span>
            <span>Occurrence Book</span>
          </button>
          <button
            onClick={() => onNavigateTab('curriculum-tracker')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Track weekly syllabus progress & confirm coverage"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-700">fact_check</span>
            <span>Curriculum Tracker</span>
          </button>
          <button
            onClick={() => onOpenUploadMarks()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-secondary text-white hover:bg-secondary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">grade</span>
            <span>Upload Marks</span>
          </button>
        </div>
      </div>

      {/* Real-Time School Compound Geofence Clock-In Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-rose-800">share_location</span>
            School Compound Clock-In Station
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab('geofencing')}
            className="text-xs font-semibold text-primary hover:text-primary-container inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Standalone Geofencing Page</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
        <TeacherGeofenceClockInCard teacherName={teacherName} />
      </div>

      {/* 4 Core Teacher KPI Cards (Pure Database Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. My Class Enrollment */}
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="rounded-xl bg-surface-container-lowest p-5 flex flex-col justify-between shadow-xs border border-outline-variant/30 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                My Class Learners
              </span>
              <span className="w-8 h-8 rounded-lg bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-bold font-data-mono text-on-surface">
                {totalInClass}
              </span>
              <span className="text-xs text-on-surface-variant">learners ({assignedClass})</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">{boysCount} Boys</span>
            <span className="text-outline">·</span>
            <span className="font-semibold text-secondary">{girlsCount} Girls</span>
          </div>
        </div>

        {/* 2. Today's Roll Call Status */}
        <div
          onClick={() => onNavigateTab('attendance-register')}
          className="rounded-xl bg-surface-container-lowest p-5 flex flex-col justify-between shadow-xs border border-outline-variant/30 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Today's Roll Call
              </span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasRegisterToday ? 'bg-secondary-container text-on-secondary-container' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {hasRegisterToday ? 'checklist_rtl' : 'pending_actions'}
                </span>
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold font-data-mono text-on-surface">
                {hasRegisterToday ? `${attendancePct}% Present` : 'Not Marked'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className={`font-semibold ${hasRegisterToday ? 'text-secondary' : 'text-amber-700'}`}>
              {hasRegisterToday ? `${presentCount}/${totalInClass} Recorded` : 'Click to Take Roll Call →'}
            </span>
          </div>
        </div>

        {/* 3. CBC Assessment Entries */}
        <div
          onClick={() => onOpenUploadMarks()}
          className="rounded-xl bg-surface-container-lowest p-5 flex flex-col justify-between shadow-xs border border-outline-variant/30 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                CBC Marks Recorded
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-bold font-data-mono text-primary">
                {myAssessmentsCount}
              </span>
              <span className="text-xs text-on-surface-variant">evaluations logged</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-primary font-semibold hover:underline">
              Upload Marks & Evaluate Remarks →
            </span>
          </div>
        </div>

        {/* 4. Schemes & Lesson Plans */}
        <div
          onClick={() => onNavigateTab('schemes-lesson-plans')}
          className="rounded-xl bg-surface-container-lowest p-5 flex flex-col justify-between shadow-xs border border-outline-variant/30 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Curriculum Work Plans
              </span>
              <span className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-bold font-data-mono text-on-surface">
                {mySchemes.length + myLessonPlans.length}
              </span>
              <span className="text-xs text-on-surface-variant">active plans</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">
              {mySchemes.length} Schemes · {myLessonPlans.length} Lesson Plans
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          onClick={() => onNavigateTab('attendance-register')}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center group-hover:bg-[#7a1228] group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Class Roll Call</div>
            <div className="text-[11px] text-on-surface-variant">Mark today's attendance</div>
          </div>
        </button>

        <button
          onClick={() => onOpenUploadMarks()}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-secondary hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">add_chart</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Upload Marks</div>
            <div className="text-[11px] text-on-surface-variant">Auto-evaluate CBC remarks</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('curriculum-tracker')}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-emerald-600 hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Curriculum Tracker</div>
            <div className="text-[11px] text-on-surface-variant">Weekly syllabus progress</div>
          </div>
        </button>

        <button
          onClick={() => onOpenNewLessonPlan()}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">post_add</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Work Plan / Lesson</div>
            <div className="text-[11px] text-on-surface-variant">40-min CBC lesson guide</div>
          </div>
        </button>

        <button
          onClick={() => onOpenNewScheme()}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-surface-container text-on-surface flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Scheme of Work</div>
            <div className="text-[11px] text-on-surface-variant">Weekly syllabus entry</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('timetable')}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-surface-container text-on-surface flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">calendar_view_week</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Edit Timetable</div>
            <div className="text-[11px] text-on-surface-variant">Manage periods & rooms</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('occurrence-records')}
          className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-[#7a1228] hover:shadow-sm transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center group-hover:bg-[#7a1228] group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">event_note</span>
          </div>
          <div>
            <div className="font-bold text-xs text-on-surface">Occurrence Book</div>
            <div className="text-[11px] text-on-surface-variant">Log daily incident</div>
          </div>
        </button>
      </div>

      {/* Grid: Teaching Schedule & Active Work Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teaching Schedule Widget */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7a1228] text-[20px]">schedule</span>
                <h3 className="font-bold text-sm text-on-surface">My Teaching Schedule</h3>
              </div>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Timetable</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {mySlots.length > 0 ? (
                mySlots.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center font-data-mono font-bold">
                        P{s.periodNumber}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface">
                          {s.learningAreaName || s.label || 'Subject'}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {s.dayOfWeek} · {s.roomName || 'Classroom'}
                        </div>
                      </div>
                    </div>
                    <div className="font-data-mono font-bold text-primary">
                      {s.startTime} - {s.endTime}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-on-surface-variant text-xs space-y-1">
                  <span className="material-symbols-outlined text-3xl text-outline">event_busy</span>
                  <p className="font-semibold text-on-surface">No timetable periods scheduled</p>
                  <p className="text-[11px]">Click "Edit Timetable" to assign learning area slots.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
            <span>KICD Curriculum Compliant</span>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="font-bold text-primary hover:underline cursor-pointer"
            >
              + Add / Edit Slot
            </button>
          </div>
        </div>

        {/* My Schemes of Work & Lesson Plans Widget */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7a1228] text-[20px]">assignment</span>
                <h3 className="font-bold text-sm text-on-surface">My Curriculum Work Plans</h3>
              </div>
              <button
                onClick={() => onNavigateTab('schemes-lesson-plans')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {mySchemes.length > 0 || myLessonPlans.length > 0 ? (
                <>
                  {mySchemes.slice(0, 2).map((scheme) => (
                    <div
                      key={scheme.id}
                      className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface truncate pr-2">{scheme.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          scheme.status === 'APPROVED'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : scheme.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container text-outline'
                        }`}>
                          {scheme.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant flex items-center justify-between">
                        <span>{scheme.entries?.length || 0} Week Entries</span>
                        <span className="font-data-mono">{scheme.id}</span>
                      </div>
                    </div>
                  ))}

                  {myLessonPlans.slice(0, 2).map((plan) => (
                    <div
                      key={plan.id}
                      className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface truncate pr-2">
                          Lesson: {plan.strand}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-fixed text-on-primary-fixed">
                          {plan.durationMinutes} Mins
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant flex items-center justify-between">
                        <span>Sub-strand: {plan.subStrand}</span>
                        <span className="font-data-mono">{plan.lessonDate}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-8 text-center text-on-surface-variant text-xs space-y-1">
                  <span className="material-symbols-outlined text-3xl text-outline">note_add</span>
                  <p className="font-semibold text-on-surface">No schemes or lesson plans prepared yet</p>
                  <p className="text-[11px]">Click below to create your first CBC syllabus scheme.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <button
              onClick={() => onOpenNewScheme()}
              className="font-bold text-primary hover:underline cursor-pointer"
            >
              + New Scheme
            </button>
            <button
              onClick={() => onOpenNewLessonPlan()}
              className="font-bold text-secondary hover:underline cursor-pointer"
            >
              + New Lesson Plan
            </button>
          </div>
        </div>
      </div>

      {/* Class Learners Table (Partial Details Only: No Fees, No Financial Invoices) */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container pb-3">
          <div>
            <h3 className="font-bold text-base text-on-surface">
              My Class Learner Roster · {assignedClass}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Pedagogical and emergency profile view for instructional staff (Financial data restricted)
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={downloadRosterPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] hover:bg-[#5e0d1e] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Download official Class Learner Roster as PDF"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Roster (PDF)</span>
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-[#7a1228]/10 text-[#7a1228] text-xs font-bold">
              {myStudents.length} Active Learners
            </span>
          </div>
        </div>

        {myStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Adm #</th>
                  <th className="py-3 px-4">UPI / NEMIS</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Guardian / Emergency</th>
                  <th className="py-3 px-4">Emergency Phone</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {myStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3.5 px-4 font-bold text-on-surface flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#7a1228] text-white flex items-center justify-center font-bold text-[10px]">
                        {st.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span>{st.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-data-mono text-outline">{st.admNo}</td>
                    <td className="py-3.5 px-4 font-data-mono text-secondary font-semibold">{st.upi}</td>
                    <td className="py-3.5 px-4 font-semibold text-on-surface">{st.gender}</td>
                    <td className="py-3.5 px-4 text-on-surface">{st.guardianName}</td>
                    <td className="py-3.5 px-4 font-data-mono text-outline">{st.guardianPhone}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenUploadMarks(st)}
                        className="px-2.5 py-1 rounded bg-[#7a1228] text-white font-bold text-xs hover:bg-[#5e0d1e] transition-colors cursor-pointer mr-1.5"
                      >
                        Grade
                      </button>
                      <button
                        onClick={() => onNavigateTab('students-guardians')}
                        className="px-2.5 py-1 rounded bg-surface-container text-primary font-semibold text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-on-surface-variant text-xs space-y-2">
            <span className="material-symbols-outlined text-4xl text-outline">group_off</span>
            <p className="font-bold text-sm text-on-surface">No learners found in this stream</p>
            <p className="text-xs text-outline">All learners must be registered under your assigned stream.</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditTeacherProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        teacherProfile={teacherProfile}
        onProfileUpdated={(updated) => {
          setTeacherProfile(updated);
        }}
      />
    </div>
  );
};
