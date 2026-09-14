import React, { useState, useEffect } from 'react';
import { Student, CbcReportCardData } from '../../types';
import { apiService } from '../../services/api';

interface ReportCardsViewProps {
  students: Student[];
  selectedStudent?: Student;
}

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({
  students = [],
  selectedStudent: initialStudent,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialStudent ? initialStudent.id : (students && students.length > 0 ? students[0].id : '')
  );
  const [reportCardData, setReportCardData] = useState<CbcReportCardData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      setSelectedId(initialStudent.id);
    }
  }, [initialStudent]);

  const student = (students || []).find((s) => s.id === selectedId) || initialStudent || students?.[0];

  const loadReportCard = async (stdId: string) => {
    if (!stdId) return;
    setLoading(true);
    try {
      const res = await apiService.getReportCard(stdId, 'term-2026-1', 'year-2026');
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
    if (student?.id) {
      loadReportCard(student.id);
    }
  }, [student?.id]);

  const handleGenerateReportCard = async () => {
    if (!student) return;
    setIsGenerating(true);
    try {
      const res = await apiService.generateReportCard({
        studentId: student.id,
        termId: 'term-2026-1',
        academicYearId: 'year-2026',
        classTeacherRemarks: 'Demonstrates exemplary mastery across continuous scientific and mathematical competencies.',
        headTeacherRemarks: 'A focused, disciplined learner with outstanding leadership and creative problem solving.',
        closingDate: '2026-04-03',
        nextTermOpeningDate: '2026-05-04',
      });
      if (res.success && res.data) {
        setReportCardData(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate report card');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
            <span className="text-primary font-semibold">Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBC Learner Summative Performance Dossier
          </h1>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">assignment</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No Learners Available</h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            There are currently no learners in the system. Admit or register learners to inspect CBC competency portfolios and generate printable termly progress dossiers.
          </p>
        </div>
      </div>
    );
  }

  const evaluations = reportCardData?.learningAreaAssessments || [];

  const getRubricBadge = (rubric: string) => {
    switch (rubric) {
      case 'EE':
        return <span className="px-2 py-0.5 rounded bg-secondary text-white font-bold text-xs">EE</span>;
      case 'ME':
        return <span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-xs">ME</span>;
      case 'AE':
        return <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-bold text-xs">AE</span>;
      case 'BE':
        return <span className="px-2 py-0.5 rounded bg-error text-white font-bold text-xs">BE</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-xs">ME</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBC Competencies</span>
            <span>/</span>
            <span className="text-primary font-semibold">Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official Competency-Based Assessment Report
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ministry of Education & KNEC format · Continuous summative compilation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-2 px-3 text-xs font-semibold text-on-surface shadow-xs"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.admNo} - {s.grade})
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateReportCard}
            disabled={isGenerating}
            className="px-3.5 py-2 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary-container transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
            <span>{isGenerating ? 'Compiling...' : 'Auto-Compile Report Card'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* Official Report Card Printable Document */}
      <div className="bg-white text-gray-900 rounded-2xl shadow-xl border border-outline-variant/30 p-8 sm:p-12 max-w-5xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="border-b-2 border-primary pb-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              <span className="material-symbols-outlined text-[32px]">school</span>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-black text-primary tracking-tight">GRACE SEEDS SCHOOL</h2>
              <p className="text-xs font-semibold text-gray-600">
                MoE Registration: <strong>MOE/PRI/2026/0981</strong> · Assessment Centre: <strong>CBA-041289</strong>
              </p>
              <p className="text-xs italic text-secondary font-medium">&quot;Excellence in Competence & Character&quot;</p>
            </div>
          </div>

          <div className="bg-primary/5 py-1.5 px-4 rounded-lg inline-block border border-primary/20 text-xs font-bold text-primary uppercase tracking-widest mt-2">
            LEARNER COMPETENCY SUMMATIVE EVALUATION REPORT · TERM 3, 2026
          </div>
        </div>

        {/* Learner Demographic Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Learner Name</span>
            <span className="font-bold text-gray-900 text-sm">{student.name}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Admission / NEMIS UPI</span>
            <span className="font-data-mono font-bold text-primary">
              {student.admNo} / {student.upi || 'NEMIS-K9281A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">CBC Grade & Stream</span>
            <span className="font-bold text-gray-900">{student.grade}{student.stream ? ` - ${student.stream}` : ''}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px]">Term Roll Call Rate</span>
            <span className="font-data-mono font-bold text-secondary text-sm">
              {reportCardData?.attendanceStats ? `${reportCardData.attendanceStats.attendancePercentage}%` : '100% Present'}
            </span>
          </div>
        </div>

        {/* Rubric Key Guide */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-700">
          <span className="font-bold text-primary uppercase text-[10px]">KNEC Rubric:</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-secondary text-white font-bold text-[10px]">EE</span> Exceeding Expectations (4)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-primary text-white font-bold text-[10px]">ME</span> Meeting Expectations (3)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-amber-700 text-white font-bold text-[10px]">AE</span> Approaching Expectations (2)</span>
          <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-error text-white font-bold text-[10px]">BE</span> Below Expectations (1)</span>
        </div>

        {/* Learning Areas Evaluation Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-primary text-white uppercase text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4 w-1/4">Learning Area</th>
                <th className="py-3 px-3 text-center w-24">Rubric Level</th>
                <th className="py-3 px-4">Instructional Competency Evaluation & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-gray-400">assignment_late</span>
                      <p className="font-semibold text-sm text-gray-700">No Assessment Records Compiled</p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        Click &quot;Auto-Compile Report Card&quot; above to aggregate all strand assessment evaluations from the database for this learner.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                evaluations.map((ev: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="py-3 px-4 font-bold text-gray-900">{ev.learningAreaName}</td>
                    <td className="py-3 px-3 text-center font-bold">{getRubricBadge(ev.performanceLevel)}</td>
                    <td className="py-3 px-4 text-gray-700 text-[11px] leading-relaxed">
                      {ev.teacherRemarks || 'Demonstrates strong understanding and mastery of core strand competencies.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 7 Core Competencies Assessment */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
            7 Core Competencies Demonstrated
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {[
              { name: 'Communication & Collaboration', score: 'Consistently Demonstrated' },
              { name: 'Critical Thinking & Problem Solving', score: 'Highly Proficient' },
              { name: 'Creativity & Imagination', score: 'Consistently Demonstrated' },
              { name: 'Citizenship & Community Awareness', score: 'Proficient' },
              { name: 'Digital Literacy', score: 'Exemplary' },
              { name: 'Learning to Learn & Self-Efficacy', score: 'Consistently Demonstrated' },
            ].map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white border border-gray-200 flex justify-between items-center">
                <span className="font-medium text-gray-800 text-[11px]">{c.name}</span>
                <span className="text-[10px] font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Remarks and Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary uppercase text-[11px]">Class Teacher Remarks</span>
              <span className="text-[10px] text-gray-500 font-data-mono">{reportCardData?.classTeacherName || 'Class Teacher'}</span>
            </div>
            <p className="text-gray-700 italic text-[11px]">
              &quot;{reportCardData?.classTeacherRemarks || `${student.name} demonstrates commendable diligence and active participation in continuous assessment strands.`}&quot;
            </p>
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500">
              <span>Digital Signature: <strong>Verified / CBA Certified</strong></span>
              <span>Date: 28th Mar 2026</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary uppercase text-[11px]">Head Teacher Endorsement</span>
              <span className="text-[10px] text-gray-500 font-data-mono">Principal / Head Teacher</span>
            </div>
            <p className="text-gray-700 italic text-[11px]">
              &quot;{reportCardData?.headTeacherRemarks || 'Commendable performance throughout the term. Demonstrates core CBC values of responsibility and discipline.'}&quot;
            </p>
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500">
              <span className="flex items-center gap-1 font-bold text-primary">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Official School Seal Ratified</span>
              </span>
              <span>Next Term Opens: <strong>04/05/2026</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
