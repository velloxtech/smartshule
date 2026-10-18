import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan, UserRole } from '../../types';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { useAuth } from '../../context/AuthContext';

export const SchemesView: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isApprover = Boolean(
    user?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ].includes(user.role)
  );

  const [activeTab, setActiveTab] = useState<'schemes' | 'lesson-plans'>('schemes');
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

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

  const downloadSchemePDF = async (scheme: SchemeOfWork) => {
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || 'Grace Seeds School';
    const motto = schoolInfo?.motto || 'The Future Begins Here';

    // Top burgundy bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 297, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 16, 16);
      } catch {
        // continue
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 34, curY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}"`, 34, curY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Ministry of Education · KICD Competency-Based Curriculum Scheme of Work', 34, curY + 15);

    curY += 20;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, curY, 283, curY);

    curY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`SCHEME OF WORK: ${scheme.title.toUpperCase()}`, 14, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const teacherName = teacherProfile?.user ? `${teacherProfile.user.firstName} ${teacherProfile.user.lastName}` : (user?.fullName || 'Educator');
    doc.text(`Educator: Tr. ${teacherName} (${teacherProfile?.tscNumber || 'TSC Verified'}) · Status: ${scheme.status} · Entries: ${scheme.entries?.length || 0} Lessons`, 14, curY);

    if (scheme.reviewRemarks) {
      curY += 4.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(122, 18, 40);
      doc.text(`HOD / Head Teacher Endorsement: "${scheme.reviewRemarks}"`, 14, curY);
    }

    curY += 4;

    const tableRows = (scheme.entries || []).map((e) => [
      e.weekNumber?.toString() || '1',
      e.lessonNumber?.toString() || '1',
      e.strandTitle || '--',
      e.subStrandTitle || '--',
      (e.specificLearningOutcomes || []).join('; ') || '--',
      (e.keyInquiryQuestions || []).join('; ') || '--',
      (e.learningExperiences || []).join('; ') || '--',
      (e.learningResources || []).join('; ') || '--',
      (e.assessmentMethods || []).join(', ') || '--',
      e.reflection || 'Delivered effectively',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Wk', 'Lsn', 'Strand', 'Sub-Strand', 'Specific Learning Outcomes', 'Key Inquiry Questions', 'Learning Experiences', 'Resources', 'Assessment', 'Reflection']],
      body: tableRows.length > 0 ? tableRows : [['1', '1', 'CBC Strand', 'Sub-strand', 'Competency outcome', 'Inquiry question', 'Learner activities', 'Textbook & aids', 'Observation', 'Completed']],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 44 },
        5: { cellWidth: 36 },
        6: { cellWidth: 42 },
        7: { cellWidth: 28 },
        8: { cellWidth: 22 },
        9: { cellWidth: 25 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 170) + 8;
    if (finalY + 22 > 195) {
      doc.addPage('a4', 'landscape');
      finalY = 15;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Subject Teacher: _________________________   Date: ${new Date().toLocaleDateString()}`, 14, finalY);
    doc.text('HOD / Curriculum Coordinator: _________________________   Date: ____________', 105, finalY);
    doc.text('Principal / Head Teacher Stamp: [                           ]', 210, finalY);

    doc.setFontSize(7);
    doc.text(`Grace Seeds School · Generated on ${new Date().toLocaleString()} · Official Academic Record`, 148, 202, { align: 'center' });

    doc.save(`Grace_Seeds_School_Scheme_${scheme.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const downloadLessonPlanPDF = async (plan: LessonPlan) => {
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || 'Grace Seeds School';
    const motto = schoolInfo?.motto || 'The Future Begins Here';

    // Top burgundy bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 13;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 16, 16);
      } catch {
        // continue
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 34, curY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}"`, 34, curY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Ministry of Education · KICD 40-Minute CBC Lesson Plan Dossier', 34, curY + 15);

    curY += 21;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, curY, 196, curY);

    curY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`40-MINUTE LESSON PLAN: ${plan.strand.toUpperCase()}`, 14, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const teacherName = teacherProfile?.user ? `${teacherProfile.user.firstName} ${teacherProfile.user.lastName}` : (user?.fullName || 'Educator');
    const rollText = `${plan.rollBoys ?? 0} Boys · ${plan.rollGirls ?? 0} Girls (Total: ${(plan.rollBoys ?? 0) + (plan.rollGirls ?? 0)})`;
    doc.text(`Date: ${plan.lessonDate} · Duration: ${plan.durationMinutes} Mins · Class Roll: ${rollText}`, 14, curY);

    curY += 4.5;
    doc.text(`Sub-Strand: ${plan.subStrand} · Educator: Tr. ${teacherName} · Status: ${plan.status || 'DRAFT'}`, 14, curY);

    curY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 18, 40);
    doc.text('SPECIFIC LEARNING OUTCOMES:', 14, curY);
    curY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    (plan.specificLearningOutcomes || ['Outcome defined']).forEach((o) => {
      doc.text(`• ${o}`, 18, curY);
      curY += 4;
    });

    curY += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 18, 40);
    doc.text('KEY INQUIRY QUESTION(S):', 14, curY);
    curY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    (plan.keyInquiryQuestions || ['Inquiry question defined']).forEach((q) => {
      doc.text(`• ${q}`, 18, curY);
      curY += 4;
    });

    curY += 2;

    // Steps table
    const stepRows = (plan.steps || []).map((s) => [
      `Step ${s.stepNumber}`,
      `${s.durationMinutes} mins`,
      s.teacherActivities || '--',
      s.learnerActivities || '--',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Lesson Phase', 'Time', 'Teacher Activities (Facilitation)', 'Learner Activities (Experience)']],
      body: stepRows.length > 0 ? stepRows : [
        ['Step 1', '5 mins', 'Introduction & context setting', 'Respond to inquiry questions'],
        ['Step 2', '15 mins', 'Demonstration & concept exploration', 'Observe & collaborate in pairs'],
        ['Step 3', '15 mins', 'Guided activity & assessment check', 'Complete activity in exercise books'],
        ['Step 4', '5 mins', 'Conclusion & review summary', 'Self-evaluate & ask questions'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 72 },
        3: { cellWidth: 66 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 210) + 7;
    if (finalY + 45 > 280) {
      doc.addPage('a4', 'portrait');
      finalY = 18;
    }

    if (plan.teacherSelfReflection) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(122, 18, 40);
      doc.text('TEACHER SELF-REFLECTION & REMEDIAL:', 14, finalY);
      finalY += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text(`"${plan.teacherSelfReflection}"`, 18, finalY);
      finalY += 6;
    }

    if (plan.reviewRemarks) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text('HEAD TEACHER / DEPUTY APPROVAL REMARKS:', 14, finalY);
      finalY += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text(`"${plan.reviewRemarks}"`, 18, finalY);
      finalY += 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Teacher: Tr. ${teacherName} _______________________   Date: ${new Date().toLocaleDateString()}`, 14, finalY);
    doc.text('Head Teacher Approval Stamp: [                               ]', 120, finalY);

    doc.setFontSize(7);
    doc.text(`Grace Seeds School · Generated on ${new Date().toLocaleString()} · Confidential Lesson Dossier`, 105, 290, { align: 'center' });

    doc.save(`Grace_Seeds_School_Lesson_Plan_${plan.strand.replace(/[^a-zA-Z0-9]/g, '_')}_${plan.lessonDate}.pdf`);
  };

  useEffect(() => {
    async function initTeacher() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
          }
        } catch {
          // Continue
        }
      }
    }
    initTeacher();
  }, [isTeacher]);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const teacherFilter = isTeacher && teacherProfile?.id ? { teacherId: teacherProfile.id } : undefined;
      const [sRes, lpRes] = await Promise.all([
        apiService.getSchemes(teacherFilter).catch(() => null),
        apiService.getLessonPlans(teacherFilter).catch(() => null),
      ]);
      setSchemes(sRes?.data || []);
      setLessonPlans(lpRes?.data || []);
    } catch {
      setSchemes([]);
      setLessonPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, [teacherProfile]);

  const handleApproveScheme = async (schemeId: string) => {
    try {
      const roleName = user?.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Deputy Head Teacher' : 'Principal / Administration';
      const res = await apiService.reviewScheme(schemeId, {
        approved: true,
        remarks: `Approved by ${roleName}. Well-aligned with CBC learning outcomes.`,
      });
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error approving scheme');
    }
  };

  const handleSubmitLessonPlan = async (planId: string) => {
    try {
      const res = await apiService.submitLessonPlan(planId);
      if (res.success) {
        loadCurriculum();
        if (selectedPlan && selectedPlan.id === planId) {
          setSelectedPlan(res.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting lesson plan');
    }
  };

  const handleReviewLessonPlan = async (planId: string, approved: boolean, customRemarks?: string) => {
    const roleName = user?.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Deputy Head Teacher' : 'Principal / Administration';
    const defaultRemarks = approved
      ? `Approved by ${roleName}. Comprehensive CBC instructional design.`
      : `Revision requested by ${roleName}. Please enrich learner activities.`;
    const finalRemarks = customRemarks || (approved ? defaultRemarks : window.prompt('Enter revision feedback remarks:', defaultRemarks));
    if (!approved && finalRemarks === null) return; // User canceled prompt

    try {
      const res = await apiService.reviewLessonPlan(planId, {
        approved,
        remarks: finalRemarks || defaultRemarks,
      });
      if (res.success) {
        loadCurriculum();
        if (selectedPlan && selectedPlan.id === planId) {
          setSelectedPlan(res.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error reviewing lesson plan');
    }
  };

  const handleSubmitScheme = async (schemeId: string) => {
    try {
      const res = await apiService.submitScheme(schemeId);
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting scheme');
    }
  };

  const handleDeleteScheme = async (schemeId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete scheme "${title}"?`)) {
      try {
        const res = await apiService.deleteScheme(schemeId);
        if (res.success) {
          setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting scheme');
      }
    }
  };

  const handleDeleteLessonPlan = async (planId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete lesson plan "${title}"?`)) {
      try {
        const res = await apiService.deleteLessonPlan(planId);
        if (res.success) {
          setLessonPlans((prev) => prev.filter((lp) => lp.id !== planId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting lesson plan');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Schemes & Lesson Plans</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Teacher Schemes of Work & 40-Min CBC Lesson Plans
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isTeacher
              ? 'Your personalized curriculum work plans, weekly syllabus progression, and instructional designs'
              : 'Weekly syllabus progression, learning experiences, inquiry questions, and digital approvals'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'schemes' ? (
            <button
              onClick={() => setIsCreateSchemeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7a1228] text-white rounded-lg hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Scheme of Work</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreatePlanOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              <span>New Lesson Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('schemes')}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'schemes'
              ? 'text-[#7a1228] border-b-2 border-[#7a1228]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>Schemes of Work ({schemes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('lesson-plans')}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'lesson-plans'
              ? 'text-[#7a1228] border-b-2 border-[#7a1228]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          <span>40-Min Lesson Plans ({lessonPlans.length})</span>
        </button>
      </div>

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {schemes.length > 0 ? (
            schemes.map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-secondary font-data-mono bg-secondary-container px-2 py-0.5 rounded">
                      Term 1 · 2026
                    </span>
                    <span className="font-bold text-sm text-primary">{s.title}</span>
                  </div>

                  {s.entries && s.entries[0] && (
                    <div className="space-y-1 pt-1">
                      <div className="text-xs text-on-surface font-semibold">
                        Week {s.entries[0].weekNumber}, Lesson {s.entries[0].lessonNumber}: {s.entries[0].strandTitle} ({s.entries[0].subStrandTitle})
                      </div>
                      <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                        "{s.entries[0].specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-outline pt-0.5">
                        <span>Inquiry: {s.entries[0].keyInquiryQuestions?.[0]}</span>
                        <span>·</span>
                        <span>Assessment: {s.entries[0].assessmentMethods?.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {s.reviewRemarks && (
                    <div className="text-[11px] text-secondary font-semibold bg-secondary/10 p-1.5 rounded">
                      HOD / Head Teacher Remarks: {s.reviewRemarks}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex md:flex-col items-end justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      s.status === 'APPROVED'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : s.status === 'SUBMITTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {s.status}
                  </span>

                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => downloadSchemePDF(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Download official Scheme of Work as PDF"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Download PDF</span>
                    </button>
                    {s.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Submit for Review
                      </button>
                    )}
                    {isApprover && s.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApproveScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-white hover:bg-secondary-container transition-colors cursor-pointer"
                      >
                        Approve & Endorse
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteScheme(s.id, s.title)}
                      title="Delete Scheme"
                      className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">edit_calendar</span>
              <p className="font-bold text-sm text-on-surface">No schemes of work recorded</p>
              <p className="text-xs text-outline">Click "New Scheme of Work" to create a CBC syllabus progression plan.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plans View */}
      {activeTab === 'lesson-plans' && (
        <div>
          {lessonPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-surface-container pb-2 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                          {lp.durationMinutes} Mins · {lp.lessonDate}
                        </span>
                        {lp.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                            <span>Approved</span>
                          </span>
                        )}
                        {lp.status === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="material-symbols-outlined text-[13px]">pending</span>
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {lp.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="material-symbols-outlined text-[13px]">cancel</span>
                            <span>Revision Needed</span>
                          </span>
                        )}
                        {(!lp.status || lp.status === 'DRAFT') && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            <span className="material-symbols-outlined text-[13px]">edit_note</span>
                            <span>Draft</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-outline font-data-mono">
                        Roll: {lp.rollBoys ?? 0}B / {lp.rollGirls ?? 0}G
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-sm text-on-surface">{lp.strand}</h3>
                      <p className="text-xs text-primary font-medium">Sub-strand: {lp.subStrand}</p>
                    </div>

                    <div className="mt-3 p-3 rounded-lg bg-surface-container-low text-xs space-y-1.5">
                      <div className="font-semibold text-on-surface">Specific Learning Outcome:</div>
                      <p className="text-on-surface-variant italic">
                        "{lp.specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                    </div>

                    <div className="mt-2 text-[11px] text-on-surface-variant flex flex-wrap gap-2">
                      <span>Inquiry: {lp.keyInquiryQuestions?.[0]}</span>
                    </div>

                    {lp.reviewRemarks && (
                      <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900">Review: </span>
                        <span>{lp.reviewRemarks}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadLessonPlanPDF(lp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Download official 40-Minute Lesson Plan as PDF"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleDeleteLessonPlan(lp.id, lp.strand)}
                        title="Delete Lesson Plan"
                        className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>

                      {/* Teacher Submit Action */}
                      {isTeacher && (!lp.status || lp.status === 'DRAFT' || lp.status === 'REJECTED') && (
                        <button
                          onClick={() => handleSubmitLessonPlan(lp.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container text-xs font-semibold cursor-pointer transition-colors"
                          title="Submit Lesson Plan for Review"
                        >
                          <span className="material-symbols-outlined text-[13px]">send</span>
                          <span>Submit Plan</span>
                        </button>
                      )}

                      {/* Approver Actions (Deputy, Head Teacher, Admin, Super Admin) */}
                      {isApprover && (
                        <div className="flex items-center gap-1.5">
                          {lp.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleReviewLessonPlan(lp.id, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold cursor-pointer transition-colors"
                              title="Approve Lesson Plan"
                            >
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              <span>Approve</span>
                            </button>
                          )}
                          {lp.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleReviewLessonPlan(lp.id, false)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                              title="Request Revision"
                            >
                              <span className="material-symbols-outlined text-[13px]">cancel</span>
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedPlan(lp)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View 40-Min Plan</span>
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">post_add</span>
              <p className="font-bold text-sm text-on-surface">No lesson plans prepared yet</p>
              <p className="text-xs text-outline">Click "New Lesson Plan" to prepare a 40-minute CBC instructional guide.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">CBC 40-Minute Lesson Plan</h3>
                <p className="text-xs text-rose-100">{selectedPlan.strand} · {selectedPlan.subStrand}</p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-rose-100 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1 overscroll-contain">
              {/* Approval status banner */}
              <div className="p-3 rounded-xl border flex items-center justify-between gap-2 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Status:</span>
                  {selectedPlan.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>Approved</span>
                    </span>
                  ) : selectedPlan.status === 'SUBMITTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">pending</span>
                      <span>Pending Approval</span>
                    </span>
                  ) : selectedPlan.status === 'REJECTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">cancel</span>
                      <span>Revision Requested</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold text-[11px]">
                      Draft
                    </span>
                  )}
                </div>
                {selectedPlan.reviewRemarks && (
                  <span className="text-[10px] text-slate-500 italic truncate max-w-[200px]">
                    "{selectedPlan.reviewRemarks}"
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low font-data-mono">
                <div>Duration: <strong>{selectedPlan.durationMinutes} Minutes</strong></div>
                <div>Date: <strong>{selectedPlan.lessonDate}</strong></div>
              </div>

              <div>
                <div className="font-bold text-primary mb-0.5 uppercase">Learning Outcomes:</div>
                <ul className="list-disc list-inside space-y-1 text-on-surface">
                  {selectedPlan.specificLearningOutcomes?.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-bold text-primary mb-0.5 uppercase">Instructional Steps:</div>
                <div className="space-y-1.5">
                  {selectedPlan.steps?.map((step) => (
                    <div key={step.stepNumber} className="p-2 rounded bg-surface-container-low">
                      <div className="font-semibold text-secondary">{step.stepTitle}</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Teacher: {step.teacherActivities}
                      </div>
                      <div className="text-[11px] text-on-surface mt-0.5">
                        Learner: {step.learnerActivities}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPlan.teacherSelfReflection && (
                <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="font-bold text-secondary text-[11px]">Teacher Self-Reflection:</div>
                  <div className="text-xs text-on-surface italic mt-0.5">{selectedPlan.teacherSelfReflection}</div>
                </div>
              )}
            </div>

            {/* Modal Review Actions Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-3 py-1.5 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadLessonPlanPDF(selectedPlan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs cursor-pointer"
                  title="Download 40-Minute Lesson Plan as PDF"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Download PDF</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isTeacher && (!selectedPlan.status || selectedPlan.status === 'DRAFT' || selectedPlan.status === 'REJECTED') && (
                  <button
                    onClick={() => handleSubmitLessonPlan(selectedPlan.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    <span>Submit for Approval</span>
                  </button>
                )}
                {isApprover && (
                  <>
                    {selectedPlan.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReviewLessonPlan(selectedPlan.id, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        <span>Reject</span>
                      </button>
                    )}
                    {selectedPlan.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleReviewLessonPlan(selectedPlan.id, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Approve Plan</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSchemeModal
        isOpen={isCreateSchemeOpen}
        onClose={() => setIsCreateSchemeOpen(false)}
        onSchemeCreated={() => loadCurriculum()}
      />

      <CreateLessonPlanModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        onPlanCreated={() => loadCurriculum()}
      />
    </div>
  );
};
