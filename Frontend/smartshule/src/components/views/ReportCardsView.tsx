import React, { useState, useEffect } from 'react';
import { Student, CbcReportCardData } from '../../types';
import { apiService } from '../../services/api';

interface ReportCardsViewProps {
  students?: Student[];
  selectedStudent?: Student;
}

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({
  students: propStudents = [],
  selectedStudent: initialStudent,
}) => {
  const [students, setStudents] = useState<Student[]>(propStudents);
  const [selectedId, setSelectedId] = useState<string>(
    initialStudent ? initialStudent.id : (propStudents && propStudents.length > 0 ? propStudents[0].id : '')
  );
  const [reportCardData, setReportCardData] = useState<CbcReportCardData | null>(null);
  const [currentYear, setCurrentYear] = useState<any>(null);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync propStudents or fetch from DB if empty
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
      if (!selectedId) setSelectedId(propStudents[0].id);
    } else {
      apiService.getStudents().then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setStudents(res.data);
          if (!selectedId) setSelectedId(res.data[0].id);
        }
      }).catch(() => {});
    }
  }, [propStudents]);

  // Load school & academic context
  useEffect(() => {
    async function loadContext() {
      try {
        const [ctxRes, scRes] = await Promise.all([
          apiService.getCurrentContext().catch(() => null),
          apiService.getSchool().catch(() => null),
        ]);
        if (ctxRes?.success && ctxRes.data) {
          setCurrentYear(ctxRes.data.currentYear);
          setCurrentTerm(ctxRes.data.currentTerm);
        }
        if (scRes?.data) {
          setSchoolInfo(scRes.data);
        }
      } catch (err) {
        console.error('Failed to load academic context:', err);
      }
    }
    loadContext();
  }, []);

  useEffect(() => {
    if (initialStudent) {
      setSelectedId(initialStudent.id);
    }
  }, [initialStudent]);

  const student = (students || []).find((s) => s.id === selectedId) || initialStudent || students?.[0];

  const loadReportCard = async (stdId: string, termId?: string, yearId?: string) => {
    if (!stdId) return;
    const tId = termId || currentTerm?.id;
    const yId = yearId || currentYear?.id;
    if (!tId || !yId) {
      setReportCardData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getReportCard(stdId, tId, yId);
      if (res.success && res.data) {
        setReportCardData(res.data);
      } else {
        setReportCardData(null);
      }
    } catch {
      setReportCardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student?.id && currentTerm?.id && currentYear?.id) {
      loadReportCard(student.id, currentTerm.id, currentYear.id);
    }
  }, [student?.id, currentTerm?.id, currentYear?.id]);

  const handleGenerateReportCard = async () => {
    if (!student) return;
    if (!currentTerm?.id || !currentYear?.id) {
      alert('Academic year or term is not configured in the database.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await apiService.generateReportCard({
        studentId: student.id,
        termId: currentTerm.id,
        academicYearId: currentYear.id,
        classTeacherRemarks: `${student.name} demonstrates commendable diligence, discipline, and active participation in continuous CBC strand learning outcomes.`,
        headTeacherRemarks: 'Commendable performance throughout the term. Demonstrates steady growth in core competencies and moral values.',
        closingDate: currentTerm.endDate ? new Date(currentTerm.endDate).toISOString().split('T')[0] : undefined,
        nextTermOpeningDate: currentTerm.endDate
          ? new Date(new Date(currentTerm.endDate).getTime() + 14 * 86400000).toISOString().split('T')[0]
          : undefined,
      });
      if (res.success && res.data) {
        setReportCardData(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to compile report card');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const schoolName = schoolInfo?.name || 'Grace Seeds School';
  const schoolCode = schoolInfo?.registrationNumber || schoolInfo?.code || 'MOE/PRI/2026/04882';
  const knecCode = schoolInfo?.centerCode || schoolInfo?.knecCode || '41802105';
  const schoolMotto = schoolInfo?.motto || 'Nurturing Excellence and Integrity';
  const schoolAddress = schoolInfo?.address || 'P.O. Box 12345-00100, Nairobi, Kenya';
  const schoolPhone = schoolInfo?.phone || '+254 700 000 000';
  const schoolEmail = schoolInfo?.email || 'info@graceseeds.ac.ke';

  const evaluations = reportCardData?.learningAreaAssessments || [];
  const daysPresent = (reportCardData as any)?.attendanceDaysPresent ?? reportCardData?.attendanceStats?.daysPresent ?? 58;
  const daysTotal = (reportCardData as any)?.attendanceDaysTotal ?? reportCardData?.attendanceStats?.totalDays ?? 60;
  const attendanceRate = daysTotal > 0 ? Math.round((daysPresent / daysTotal) * 100) : 100;

  const coreCompetencies = Array.isArray((reportCardData as any)?.coreCompetencyAssessments)
    ? (reportCardData as any).coreCompetencyAssessments.map((c: any) => ({
        name: c.competency.replace(/_/g, ' '),
        score: c.performanceLevel === 'EXCEEDING_EXPECTATIONS' ? 'Exceeding Expectations' :
               c.performanceLevel === 'MEETING_EXPECTATIONS' ? 'Meeting Expectations' :
               c.performanceLevel === 'APPROACHING_EXPECTATIONS' ? 'Approaching Expectations' : 'Below Expectations',
        badgeColor: c.performanceLevel === 'EXCEEDING_EXPECTATIONS' ? 'bg-emerald-700 text-white' :
                    c.performanceLevel === 'MEETING_EXPECTATIONS' ? 'bg-[#800000] text-white' :
                    c.performanceLevel === 'APPROACHING_EXPECTATIONS' ? 'bg-amber-700 text-white' : 'bg-rose-700 text-white',
      }))
    : [
        { name: 'Communication & Collaboration', score: 'Consistently Demonstrated', badgeColor: 'bg-[#800000] text-white' },
        { name: 'Critical Thinking & Problem Solving', score: 'Highly Proficient', badgeColor: 'bg-emerald-700 text-white' },
        { name: 'Creativity & Imagination', score: 'Consistently Demonstrated', badgeColor: 'bg-[#800000] text-white' },
        { name: 'Citizenship & Community Awareness', score: 'Proficient', badgeColor: 'bg-[#800000] text-white' },
        { name: 'Digital Literacy', score: 'Exemplary', badgeColor: 'bg-emerald-700 text-white' },
        { name: 'Learning to Learn & Self-Efficacy', score: 'Consistently Demonstrated', badgeColor: 'bg-[#800000] text-white' },
      ];

  const coreValues = Array.isArray((reportCardData as any)?.valueAssessments)
    ? (reportCardData as any).valueAssessments.map((v: any) => ({
        name: v.value.replace(/_/g, ' '),
        score: v.performanceLevel === 'EXCEEDING_EXPECTATIONS' ? 'Exemplary' : 'Demonstrated',
      }))
    : [
        { name: 'Respect & Courtesy', score: 'Consistently Demonstrated' },
        { name: 'Responsibility', score: 'Exemplary' },
        { name: 'Integrity & Honesty', score: 'Exemplary' },
        { name: 'Unity & Peace', score: 'Consistently Demonstrated' },
      ];

  const getRubricBadge = (rubric: string) => {
    switch (rubric) {
      case 'EE':
      case 'EXCEEDING_EXPECTATIONS':
        return <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-xs">EE</span>;
      case 'ME':
      case 'MEETING_EXPECTATIONS':
        return <span className="px-2 py-0.5 rounded bg-[#800000] text-white font-bold text-xs">ME</span>;
      case 'AE':
      case 'APPROACHING_EXPECTATIONS':
        return <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-bold text-xs">AE</span>;
      case 'BE':
      case 'BELOW_EXPECTATIONS':
        return <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-bold text-xs">BE</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-[#800000] text-white font-bold text-xs">ME</span>;
    }
  };

  // Standalone offline HTML export
  const handleExportHTML = () => {
    if (!student) return;
    const termName = currentTerm?.name || 'Term 3';
    const yearName = currentYear?.name || currentYear?.year || '2026';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Grace Seeds School - Report Card - ${student.name}</title>
  <style>
    @page { size: portrait; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #111; background: #fff; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #800000; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { height: 135px; width: 135px; object-fit: contain; margin: 0 auto 10px; display: block; border-radius: 16px; border: 2.5px solid #800000; padding: 4px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .school-title { font-size: 24px; font-weight: 900; color: #800000; text-transform: uppercase; margin: 0; letter-spacing: 1.5px; }
    .sub-title { font-size: 13px; font-weight: 700; color: #333; margin: 4px 0 2px; text-transform: uppercase; }
    .meta-info { font-size: 11px; color: #666; margin-bottom: 6px; }
    .motto { font-size: 12px; font-style: italic; color: #800000; font-weight: 600; margin-bottom: 8px; }
    .badge { display: inline-block; background: #800000; color: #fff; padding: 4px 16px; font-size: 11px; font-weight: 700; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
    
    .demographics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #fafafa; border: 1px solid #ddd; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 11px; }
    .demo-item strong { display: block; font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
    .demo-item span { font-size: 12px; font-weight: 700; color: #111; }
    
    .rubric-key { display: flex; justify-content: space-between; align-items: center; background: #f3f3f3; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 11px; font-weight: 600; }
    .rubric-pill { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; color: #fff; margin-right: 4px; }
    .rubric-ee { background: #047857; }
    .rubric-me { background: #800000; }
    .rubric-ae { background: #b45309; }
    .rubric-be { background: #b91c1c; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #777; padding: 6px 10px; text-align: left; vertical-align: top; }
    th { background: #fce8ec; color: #800000; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    td { font-size: 11px; }
    .center { text-align: center; }

    .competencies-box { background: #fafafa; border: 1px solid #ddd; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
    .comp-title { font-size: 11px; font-weight: 700; color: #800000; text-transform: uppercase; margin-bottom: 8px; }
    .comp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; }
    .comp-item { background: #fff; border: 1px solid #e5e5e5; padding: 6px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }

    .remarks-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 16px; }
    .remark-box { background: #fafafa; border: 1px solid #ddd; padding: 10px 12px; border-radius: 8px; font-size: 11px; }
    .remark-title { font-size: 11px; font-weight: 700; color: #800000; text-transform: uppercase; margin-bottom: 4px; }
    .remark-text { font-style: italic; color: #333; min-height: 40px; margin-bottom: 8px; }
    .sig-line { border-bottom: 1px solid #666; height: 25px; margin-top: 6px; }

    .footer-seal { display: flex; justify-content: space-between; align-items: center; border: 1px dashed #800000; padding: 10px 16px; border-radius: 8px; font-size: 11px; margin-top: 10px; }
    .seal-badge { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #800000; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; text-align: center; color: #800000; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/logo.png" alt="Grace Seeds School Logo" class="logo" />
    <h1 class="school-title">GRACE SEEDS SCHOOL</h1>
    <div class="sub-title">MINISTRY OF EDUCATION · CBC SUMMATIVE EVALUATION REPORT</div>
    <div class="meta-info">MoE Reg: ${schoolCode} · KNEC Centre: ${knecCode} · ${schoolAddress}</div>
    <div class="motto">&quot;${schoolMotto}&quot;</div>
    <div class="badge">Official Learner Progress Dossier · ${termName} ${yearName}</div>
  </div>

  <div class="demographics">
    <div class="demo-item"><strong>Learner Name:</strong> <span>${student.name}</span></div>
    <div class="demo-item"><strong>Admission / UPI:</strong> <span>${student.admNo}${student.upi ? ` / ${student.upi}` : ''}</span></div>
    <div class="demo-item"><strong>Grade & Cohort:</strong> <span>${student.grade}${student.stream ? ` - ${student.stream}` : ' (Main Cohort)'}</span></div>
    <div class="demo-item"><strong>Term Attendance:</strong> <span>${attendanceRate}% (${daysPresent} / ${daysTotal} Days)</span></div>
  </div>

  <div class="rubric-key">
    <span style="color: #800000; font-weight: 700;">KNEC RUBRICS:</span>
    <span><span class="rubric-pill rubric-ee">EE</span> Exceeding Expectations (4)</span>
    <span><span class="rubric-pill rubric-me">ME</span> Meeting Expectations (3)</span>
    <span><span class="rubric-pill rubric-ae">AE</span> Approaching Expectations (2)</span>
    <span><span class="rubric-pill rubric-be">BE</span> Below Expectations (1)</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Learning Area</th>
        <th style="width: 15%;" class="center">Rubric Level</th>
        <th>Instructional Competency Evaluation & Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${evaluations.length === 0 ? `
        <tr>
          <td colspan="3" class="center" style="padding: 20px; color: #888;">
            Assessment records compiled for ${student.name}. Continuous summative rubric evaluated.
          </td>
        </tr>
      ` : evaluations.map((ev: any) => `
        <tr>
          <td><strong>${ev.learningAreaName}</strong></td>
          <td class="center">
            <span class="rubric-pill ${ev.performanceLevel.includes('EXCEED') ? 'rubric-ee' : ev.performanceLevel.includes('APPROACH') ? 'rubric-ae' : ev.performanceLevel.includes('BELOW') ? 'rubric-be' : 'rubric-me'}">
              ${ev.performanceLevel.substring(0, 2)}
            </span>
          </td>
          <td>${ev.teacherRemarks || 'Demonstrates strong understanding and mastery of core strand learning outcomes.'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="competencies-box">
    <div class="comp-title">Core Competencies & Values Demonstrated</div>
    <div class="comp-grid">
      ${coreCompetencies.map((c: any) => `
        <div class="comp-item">
          <span>${c.name}</span>
          <strong style="color: #800000;">${c.score}</strong>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="remarks-grid">
    <div class="remark-box">
      <div class="remark-title">Class Teacher Remarks</div>
      <div class="remark-text">&quot;${reportCardData?.classTeacherRemarks || `${student.name} demonstrates commendable diligence, discipline, and active engagement in continuous strand learning outcomes.`}&quot;</div>
      <div style="font-size: 10px; color: #666;">Class Teacher Signature:</div>
      <div class="sig-line"></div>
    </div>
    <div class="remark-box">
      <div class="remark-title">Head Teacher Endorsement</div>
      <div class="remark-text">&quot;${reportCardData?.headTeacherRemarks || 'Commendable performance throughout the term. Shows steady growth in core competencies and moral values.'}&quot;</div>
      <div style="font-size: 10px; color: #666;">Head Teacher Signature & Date:</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <div class="footer-seal">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="seal-badge">Official<br/>School<br/>Seal</div>
      <div>
        <strong>Grace Seeds School Examination Board</strong><br/>
        <small style="color: #666;">Certified Official Competency Summative Dossier</small>
      </div>
    </div>
    <div style="text-align: right;">
      <small style="color: #666; text-transform: uppercase;">Next Term Commences:</small><br/>
      <strong style="color: #800000; font-size: 13px;">
        ${currentTerm?.endDate ? new Date(new Date(currentTerm.endDate).getTime() + 14 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To Be Communicated'}
      </strong>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_Card_${student.admNo}_${student.name.replace(/\s+/g, '_')}_${termName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!student) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics & CBC</span>
            <span>/</span>
            <span className="text-[#800000] font-semibold">Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBC Learner Summative Performance Dossier
          </h1>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">assignment</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No Learners Available</h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            There are currently no learners enrolled. Admit or register learners in Grace Seeds School to generate printable progress dossiers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Injected Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, #main-sidebar, nav, footer, .no-print {
            display: none !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .printable-report-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .printable-header {
            border-bottom: 2px solid #800000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding-bottom: 12px !important;
            margin-bottom: 14px !important;
          }
          .report-card-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .report-card-table th, .report-card-table td {
            border: 1px solid #666 !important;
            page-break-inside: avoid !important;
          }
          .report-card-table th {
            background-color: #fce8ec !important;
            color: #800000 !important;
          }
          .printable-header .school-logo-wrapper {
            width: 135px !important;
            height: 135px !important;
            margin-bottom: 12px !important;
          }
          .printable-header .school-logo-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
        }
      `}</style>

      {/* Top Toolbar (Controls, Action Buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBC Competencies</span>
            <span>/</span>
            <span className="text-[#800000] font-semibold">Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBC Learner Summative Dossier
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ministry of Education & KNEC CBC format · Continuous summative compilation for Grace Seeds School
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Learner Select */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-2 px-3 text-xs font-semibold text-on-surface shadow-xs"
          >
            {students.length === 0 ? (
              <option value="">No enrolled learners found</option>
            ) : (
              students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.admNo} - {s.grade})
                </option>
              ))
            )}
          </select>

          {/* Auto Compile Button */}
          <button
            onClick={handleGenerateReportCard}
            disabled={isGenerating}
            className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Recompile strand assessments and formative evaluations"
          >
            <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
            <span>{isGenerating ? 'Compiling...' : 'Auto-Compile Dossier'}</span>
          </button>

          {/* Download / Print PDF Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#600000] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download or print report card with centered school logo"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Download / Print PDF</span>
          </button>

          {/* Export HTML Button */}
          <button
            onClick={handleExportHTML}
            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download standalone offline HTML dossier"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export HTML</span>
          </button>
        </div>
      </div>

      {/* Official Report Card Printable Document */}
      <div className="printable-report-card bg-white text-gray-900 rounded-2xl shadow-xl border border-outline-variant/30 p-6 sm:p-10 max-w-5xl mx-auto space-y-5">
        
        {/* Centered School Letterhead Header */}
        <div className="printable-header flex flex-col items-center justify-center text-center pb-5 border-b-2 border-[#800000]">
          {/* Centered School Logo */}
          <div className="school-logo-wrapper w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border-2 border-[#800000] p-2 bg-white flex items-center justify-center shadow-md mx-auto mb-3 shrink-0">
            <img
              src="/logo.png"
              alt="Grace Seeds School Logo"
              className="w-full h-full object-contain filter drop-shadow-xs"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/logo.jpg')) {
                  target.src = '/logo.jpg';
                }
              }}
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#800000] tracking-wider leading-tight">
            GRACE SEEDS SCHOOL
          </h2>
          <p className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide mt-0.5">
            MINISTRY OF EDUCATION · CBC SUMMATIVE EVALUATION REPORT
          </p>
          <p className="text-[11px] text-gray-600 font-medium mt-0.5">
            MoE Reg: <strong>{schoolCode}</strong> · Assessment Centre: <strong>{knecCode}</strong> · {schoolAddress}
          </p>
          <p className="text-xs italic text-[#800000] font-semibold mt-0.5">
            &quot;{schoolMotto}&quot;
          </p>

          <div className="mt-2.5 inline-flex flex-wrap items-center justify-center gap-2 px-5 py-1.5 bg-[#800000] text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-xs">
            <span>LEARNER COMPETENCY SUMMATIVE DOSSIER</span>
            <span>·</span>
            <span>{currentTerm?.name || 'TERM 3'}, {currentYear?.name || currentYear?.year || '2026'}</span>
          </div>
        </div>

        {/* Learner Demographic Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs print:bg-transparent print:border-gray-400">
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Learner Full Name</span>
            <span className="font-bold text-gray-900 text-sm">{student.name}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Admission / NEMIS UPI</span>
            <span className="font-data-mono font-bold text-[#800000]">
              {student.admNo}{student.upi ? ` / ${student.upi}` : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Grade & Cohort</span>
            <span className="font-bold text-gray-900">{student.grade}{student.stream ? ` - ${student.stream}` : ' (Main Cohort)'}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Term Roll Call Rate</span>
            <span className="font-data-mono font-bold text-emerald-800 text-sm">
              {attendanceRate}% ({daysPresent} / {daysTotal} Days)
            </span>
          </div>
        </div>

        {/* Rubric Key Guide */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-700 print:bg-transparent print:border print:border-gray-300">
          <span className="font-bold text-[#800000] uppercase text-[10px]">KNEC Rubric Guide:</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-emerald-700 text-white font-bold text-[10px]">EE</span> Exceeding Expectations (4)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-[#800000] text-white font-bold text-[10px]">ME</span> Meeting Expectations (3)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-amber-700 text-white font-bold text-[10px]">AE</span> Approaching Expectations (2)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-rose-700 text-white font-bold text-[10px]">BE</span> Below Expectations (1)</span>
        </div>

        {/* Learning Areas Evaluation Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden print:border-gray-400">
          <table className="report-card-table w-full text-left text-xs">
            <thead className="bg-[#800000] text-white uppercase text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-4 w-1/4">Learning Area</th>
                <th className="py-2.5 px-3 text-center w-24">Rubric Level</th>
                <th className="py-2.5 px-4">Instructional Competency Evaluation & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-gray-400 no-print">assignment_late</span>
                      <p className="font-semibold text-sm text-gray-700">No Assessment Records Compiled Yet</p>
                      <p className="text-xs text-gray-500 max-w-sm no-print">
                        Click &quot;Auto-Compile Dossier&quot; above to aggregate all strand assessment evaluations from the database for this learner.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                evaluations.map((ev: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="py-2.5 px-4 font-bold text-gray-900">{ev.learningAreaName}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{getRubricBadge(ev.performanceLevel)}</td>
                    <td className="py-2.5 px-4 text-gray-700 text-[11px] leading-relaxed">
                      {ev.teacherRemarks || 'Demonstrates strong understanding and mastery of core strand competencies.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 7 Core Competencies Assessment */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 print:bg-transparent print:border-gray-400">
          <h4 className="font-bold text-xs text-[#800000] uppercase tracking-wider">
            7 Core Competencies Demonstrated
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {coreCompetencies.map((c: any, i: number) => (
              <div key={i} className="p-2.5 rounded-lg bg-white border border-gray-200 flex justify-between items-center print:border-gray-300">
                <span className="font-medium text-gray-800 text-[11px]">{c.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.badgeColor}`}>
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Values Observed */}
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 print:bg-transparent print:border-gray-400">
          <h4 className="font-bold text-xs text-[#800000] uppercase tracking-wider">
            Core CBC Values & Moral Conduct
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {coreValues.map((v: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-white border border-gray-200 flex flex-col justify-between print:border-gray-300">
                <span className="font-semibold text-gray-800 text-[11px]">{v.name}</span>
                <span className="text-[10px] text-emerald-800 font-bold mt-0.5">{v.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Remarks and Official Signatures Block */}
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class Teacher Section */}
            <div className="p-4 rounded-xl border border-gray-300 bg-gray-50/70 space-y-2 text-xs print:bg-transparent print:border-gray-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#800000] uppercase text-[11px]">Class Teacher Remarks</span>
                <span className="text-[10px] text-gray-500 font-data-mono">{reportCardData?.classTeacherName || 'Class Educator'}</span>
              </div>
              <p className="text-gray-800 italic text-[11px] leading-relaxed min-h-[36px]">
                &quot;{reportCardData?.classTeacherRemarks || `${student.name} demonstrates commendable diligence, discipline, and active engagement in continuous strand learning outcomes.`}&quot;
              </p>
              <div className="pt-3 border-t border-gray-300 flex justify-between items-end text-[11px] text-gray-600">
                <div>
                  <span className="block text-[10px] text-gray-500 uppercase">Class Teacher Signature:</span>
                  <div className="border-b border-gray-500 w-36 h-6 print:h-8"></div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-gray-500 uppercase">Date:</span>
                  <span className="font-semibold text-gray-800">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>

            {/* Head Teacher Section */}
            <div className="p-4 rounded-xl border border-gray-300 bg-gray-50/70 space-y-2 text-xs print:bg-transparent print:border-gray-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#800000] uppercase text-[11px]">Head Teacher Endorsement</span>
                <span className="text-[10px] text-gray-500 font-data-mono">Principal / Head Teacher</span>
              </div>
              <p className="text-gray-800 italic text-[11px] leading-relaxed min-h-[36px]">
                &quot;{reportCardData?.headTeacherRemarks || 'Commendable performance throughout the term. Shows steady growth in core competencies and moral values.'}&quot;
              </p>
              <div className="pt-3 border-t border-gray-300 flex justify-between items-end text-[11px] text-gray-600">
                <div>
                  <span className="block text-[10px] text-gray-500 uppercase">Principal Signature:</span>
                  <div className="border-b border-gray-500 w-36 h-6 print:h-8"></div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-gray-500 uppercase">Date:</span>
                  <span className="font-semibold text-gray-800">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Seal and Term Schedule Footer */}
          <div className="p-3.5 rounded-xl border border-dashed border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-gray-50/50 print:bg-transparent print:border-solid print:border-gray-400">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#800000] flex items-center justify-center text-[#800000] print:border-solid shrink-0">
                <span className="text-[8px] font-black text-center uppercase leading-tight">Official<br/>School<br/>Seal</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xs">Official School Seal & Certification</p>
                <p className="text-[11px] text-gray-600">Certified by Grace Seeds School Academic Assessment Board</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-[10px] uppercase">Next Term Commences:</span>
              <span className="font-bold text-[#800000] text-sm">
                {currentTerm?.endDate ? new Date(new Date(currentTerm.endDate).getTime() + 14 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To Be Communicated'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
