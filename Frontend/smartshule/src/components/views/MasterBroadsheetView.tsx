import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import {
  BroadsheetResult,
  ClassRoom,
  StreamItem,
  ClassRankingItem,
  BestClassPerSubjectItem,
  BestStudentPerSubjectItem,
  AcademicYear,
  AcademicTerm,
} from '../../types';

const GRADE_ORDER: Record<string, number> = {
  PLAYGROUP: 0,
  PP1: 1,
  PP2: 2,
  GRADE_1: 3,
  GRADE_2: 4,
  GRADE_3: 5,
  GRADE_4: 6,
  GRADE_5: 7,
  GRADE_6: 8,
  GRADE_7: 9,
  GRADE_8: 10,
  GRADE_9: 11,
};

const getSubjectInitials = (nameOrCode: string): string => {
  if (!nameOrCode) return 'SUB';
  const clean = nameOrCode.trim().toUpperCase();

  if (clean.includes('CREATIVE') || clean.includes('CREA') || clean.includes('PSYCHOMOTOR') || clean.includes('MUSIC')) {
    return 'CREA';
  }
  if (clean.includes('RELIGIOUS') || clean.includes('CHRISTIAN') || clean.includes('CRE') || clean.includes('SRE') || clean.includes('IRE')) {
    return 'CRE';
  }
  if (clean.includes('MATH') || clean === 'MAT') return 'MAT';
  if (clean.includes('ENG') || clean.includes('ENGLISH')) return 'ENG';
  if (clean.includes('KISW') || clean.includes('SWAHILI') || clean === 'KIS') return 'KIS';
  if (clean.includes('INTEGRATED SCIENCE') || clean.includes('SCIENCE') || clean.includes('SCI')) return 'SCI';
  if (clean.includes('SOCIAL') || clean === 'SST' || clean === 'SOC') return 'SOC';
  if (clean.includes('AGRI') || clean.includes('NUTRITION') || clean === 'AGR') return 'AGR';
  if (clean.includes('ENV')) return 'ENV';
  if (clean.includes('LIT') || clean.includes('READING') || clean.includes('KUSOMA')) return 'LIT';
  if (clean.includes('PRE-TECH') || clean.includes('TECHNICAL')) return 'PTECH';
  if (clean.includes('FRENCH') || clean === 'FRE') return 'FRE';
  if (clean.includes('GERMAN') || clean === 'GER') return 'GER';
  if (clean.includes('ARABIC') || clean === 'ARA') return 'ARA';
  if (clean.includes('INDIGENOUS') || clean === 'IND') return 'IND';

  const firstWord = clean.replace(/[^A-Z0-9]/g, ' ').trim().split(/\s+/)[0];
  return firstWord.slice(0, 4) || 'SUB';
};

export const MasterBroadsheetView: React.FC = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('term-2026-t3');
  const [selectedYear, setSelectedYear] = useState<string>('year-2026');
  const [selectedExamType, setSelectedExamType] = useState<string>('End of Term Examination');

  const [broadsheet, setBroadsheet] = useState<BroadsheetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'marksheet' | 'classRanking' | 'bestClassPerSubject' | 'bestStudentPerSubject' | 'all'
  >('marksheet');
  const [scopeFilter, setScopeFilter] = useState<'CLASS' | 'SCHOOL'>('CLASS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const initData = async () => {
      try {
        try {
          const yRes = await apiService.getAcademicYears();
          if (yRes?.success && yRes.data && yRes.data.length > 0) {
            setAcademicYears(yRes.data);
            const activeYear =
              yRes.data.find((y) => y.name.includes('2026')) ||
              yRes.data.find((y) => y.isCurrent) ||
              yRes.data[0];
            setSelectedYear(activeYear.id);

            const tRes = await apiService.getTerms(activeYear.id);
            if (tRes?.success && tRes.data && tRes.data.length > 0) {
              setAcademicTerms(tRes.data);
              const activeTerm =
                tRes.data.find((t) => t.isCurrent && ((t as any).status === 'ACTIVE' || t.name.toLowerCase().includes('term 3'))) ||
                tRes.data.find((t) => t.name.toLowerCase().includes('term 3') || t.termNumber === 3) ||
                tRes.data.find((t) => t.isCurrent) ||
                tRes.data[tRes.data.length - 1];
              setSelectedTerm(activeTerm.id);
            }
          }
        } catch (yErr) {
          console.warn('Could not load academic years dynamically:', yErr);
        }

        const res = await apiService.getClasses();
        if (res?.success && res.data && res.data.length > 0) {
          const sorted = [...res.data].sort((a, b) => {
            const orderA = GRADE_ORDER[a.gradeLevel?.toUpperCase()] ?? 99;
            const orderB = GRADE_ORDER[b.gradeLevel?.toUpperCase()] ?? 99;
            return orderA - orderB;
          });
          setClasses(sorted);

          const defaultClass =
            sorted.find((c) => c.name.toLowerCase().includes('grade 4')) || sorted[0];
          setSelectedClassId(defaultClass.id);

          const sRes = await apiService.getStreamsByClass(defaultClass.id);
          if (sRes?.success && sRes.data && sRes.data.length > 0) {
            setStreams(sRes.data);
          } else {
            setStreams([]);
          }
          setSelectedStreamId('all');
        } else {
          setClasses([]);
          setStreams([]);
          setSelectedStreamId('all');
        }
      } catch (err: any) {
        console.error('Error fetching classes and terms:', err);
        setError(err?.message || 'Failed to load classes from database.');
      }
    };
    initData();
  }, []);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const sRes = await apiService.getStreamsByClass(classId);
      if (sRes?.success && sRes.data && sRes.data.length > 0) {
        setStreams(sRes.data);
      } else {
        setStreams([]);
      }
      setSelectedStreamId('all');
    } catch {
      setStreams([]);
      setSelectedStreamId('all');
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedYear(yearId);
    try {
      const tRes = await apiService.getTerms(yearId);
      if (tRes?.success && tRes.data && tRes.data.length > 0) {
        setAcademicTerms(tRes.data);
        const activeTerm =
          tRes.data.find((t) => t.isCurrent && ((t as any).status === 'ACTIVE' || t.name.toLowerCase().includes('term 3'))) ||
          tRes.data.find((t) => t.name.toLowerCase().includes('term 3') || t.termNumber === 3) ||
          tRes.data.find((t) => t.isCurrent) ||
          tRes.data[0];
        setSelectedTerm(activeTerm.id);
      }
    } catch (err) {
      console.warn('Error loading terms for year:', err);
    }
  };

  const fetchBroadsheetData = async (streamIdToFetch: string) => {
    if (!streamIdToFetch && !selectedClassId) {
      setBroadsheet(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getStreamBroadsheet(
        streamIdToFetch || 'all',
        selectedTerm,
        selectedYear,
        selectedClassId,
        selectedExamType
      );
      if (res?.success && res.data) {
        setBroadsheet(res.data);
      } else {
        setError(res?.message || 'Failed to generate broadsheet from database records.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with broadsheet database service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchBroadsheetData(selectedStreamId);
    } else {
      setBroadsheet(null);
    }
  }, [selectedStreamId, selectedClassId, selectedTerm, selectedYear, selectedExamType]);

  const overallStats = useMemo(() => {
    if (!broadsheet || !broadsheet.rows) return { EE: 0, ME: 0, AE: 0, BE: 0 };
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    broadsheet.rows.forEach((r) => {
      const lvl = r.overallPerformanceLevel?.toUpperCase();
      if (lvl?.includes('EXCEED') || lvl === 'EE') counts.EE++;
      else if (lvl?.includes('MEET') || lvl === 'ME') counts.ME++;
      else if (lvl?.includes('APPROACH') || lvl === 'AE') counts.AE++;
      else if (lvl?.includes('BELOW') || lvl === 'BE') counts.BE++;
      else counts.BE++;
    });
    return counts;
  }, [broadsheet]);

  const displayedClassRankings = useMemo<ClassRankingItem[]>(() => {
    if (scopeFilter === 'SCHOOL' && broadsheet?.schoolClassRankings && broadsheet.schoolClassRankings.length > 0) {
      return broadsheet.schoolClassRankings;
    }
    return broadsheet?.classRankings || [];
  }, [broadsheet, scopeFilter]);

  const displayedStudentsPerSubject = useMemo<BestStudentPerSubjectItem[]>(() => {
    if (scopeFilter === 'SCHOOL' && broadsheet?.schoolBestStudentsPerSubject && broadsheet.schoolBestStudentsPerSubject.length > 0) {
      return broadsheet.schoolBestStudentsPerSubject;
    }
    return broadsheet?.bestStudentsPerSubject || [];
  }, [broadsheet, scopeFilter]);

  const filteredRows = useMemo(() => {
    if (!broadsheet || !broadsheet.rows) return [];
    if (!searchTerm.trim()) return broadsheet.rows;
    const term = searchTerm.toLowerCase();
    return broadsheet.rows.filter((r) => r.studentName.toLowerCase().includes(term));
  }, [broadsheet, searchTerm]);

  const streamCounts = useMemo(() => {
    if (!broadsheet || !broadsheet.rows) return {};
    const counts: Record<string, number> = {};
    broadsheet.rows.forEach((r) => {
      const sName = r.streamName || 'Default Stream';
      counts[sName] = (counts[sName] || 0) + 1;
      if (r.streamId) counts[r.streamId] = (counts[r.streamId] || 0) + 1;
    });
    return counts;
  }, [broadsheet]);

  const handlePrint = () => {
    window.print();
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
      } catch {}
    }
    return null;
  };

  // Comprehensive Master PDF Export with All Data (Marksheet + Rankings + Best Class + Champions)
  const handleExportBroadsheetPDF = async () => {
    if (!broadsheet || !broadsheet.rows.length) {
      alert('No broadsheet data available to generate PDF.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logoBase64 = await getSchoolLogoBase64();
    const schoolName = 'GRACE SEEDS SCHOOL';
    const motto = 'The Future Begins Here';
    const termDisplay = broadsheet.termName || 'Term 3';
    const yearDisplay = broadsheet.yearName || '2026';

    const getShortRubricLevel = (level?: string, score?: number, meanPts?: number): string => {
      const lvl = (level || '').toUpperCase();
      if (lvl.includes('EXCEED') || lvl === 'EE' || (meanPts !== undefined && meanPts >= 3.5) || (score !== undefined && score >= 80)) return 'EE';
      if (lvl.includes('MEET') || lvl === 'ME' || (meanPts !== undefined && meanPts >= 2.5) || (score !== undefined && score >= 65)) return 'ME';
      if (lvl.includes('APPROACH') || lvl === 'AE' || (meanPts !== undefined && meanPts >= 1.5) || (score !== undefined && score >= 50)) return 'AE';
      return 'BE';
    };

    // Helper to render formal header on pages
    const renderHeader = (title: string, subtitle: string, startY: number) => {
      doc.setFillColor(122, 18, 40);
      doc.rect(0, 0, 297, 6, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 15, 15);
        } catch {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(122, 18, 40);
      doc.text(schoolName, 32, 15);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`"${motto}" · P.O. Box 12-20123 / 12-40123 Kisumu · Tel: 0745436312`, 32, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 32, 25);

      // Meta Banner Card
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 28, 269, 11, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 28, 269, 11, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Class: ${broadsheet.className || 'All Grades'}`, 18, 33);
      doc.text(`Stream: ${broadsheet.streamName || 'All Streams'}`, 80, 33);
      doc.text(`Term: ${termDisplay} · ${yearDisplay}`, 145, 33);
      doc.text(`Total Candidates: ${broadsheet.rows.length}`, 215, 33);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(122, 18, 40);
      doc.text(subtitle, 18, 37.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 215, 37.5);

      return 43;
    };

    // ==============================================================
    // 1. SECTION 1: MASTER EVALUATION MARKSHEET (Adm No & Sex Removed)
    // ==============================================================
    let curY = renderHeader(
      'OFFICIAL CBC MASTER BROADSHEET & SUMMATIVE ASSESSMENT MARKSHEET',
      `Class Mean Score: ${broadsheet.streamMeanScore}% · Mean Rubric: ${broadsheet.streamMeanPoints} pts`,
      12
    );

    const laHeaders = broadsheet.learningAreas.map((la) => getSubjectInitials(la.name || la.code));
    const tableHead = [
      'Pos',
      'Student Name',
      'Stream',
      ...laHeaders,
      'Total',
      'Mean %',
      'Pts',
      'GPA',
      'Level',
    ];

    const tableRows = broadsheet.rows.map((r, index) => {
      const subScores = broadsheet.learningAreas.map((la) => {
        const sub = r.subjects[la.id];
        return sub && sub.levelLabel !== '--' ? `${sub.numericScore}%` : '--';
      });

      const displayPos = selectedStreamId === 'all'
        ? String(index + 1)
        : String(r.streamRank || index + 1);

      return [
        displayPos,
        r.studentName || '--',
        r.streamName || '--',
        ...subScores,
        String(r.totalScore),
        `${r.averageScore}%`,
        String(r.totalPoints || 0),
        r.meanPoints.toFixed(2),
        getShortRubricLevel(r.overallPerformanceLevel, r.averageScore, r.meanPoints),
      ];
    });

    autoTable(doc, {
      startY: curY,
      head: [tableHead],
      body: tableRows,
      theme: 'grid',
      rowPageBreak: 'avoid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [31, 41, 55],
        cellPadding: 1.8,
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 12, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 26, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // ==============================================================
    // 2. SECTION 2: CLASS & STREAM PERFORMANCE RANKINGS
    // ==============================================================
    const rankingsToPrint = (broadsheet.schoolClassRankings && broadsheet.schoolClassRankings.length > 0)
      ? broadsheet.schoolClassRankings
      : broadsheet.classRankings;

    if (rankingsToPrint && rankingsToPrint.length > 0) {
      doc.addPage('a4', 'landscape');
      curY = renderHeader(
        'CLASS & STREAM PERFORMANCE RANKING REPORT',
        'Academic Evaluation & Quality Pass Rate (EE + ME) Comparison',
        12
      );

      const rankRows = rankingsToPrint.map((r) => [
        String(r.rank),
        r.className,
        r.streamName || 'Whole Grade',
        String(r.totalStudents),
        `${r.meanScore}%`,
        r.overallPerformanceLevel,
        `${r.qualityPassRate || 0}%`,
        r.topStudentName || '--',
        `${r.topStudentScore || 0}%`,
        String(r.counts?.EE || 0),
        String(r.counts?.ME || 0),
        String(r.counts?.AE || 0),
        String(r.counts?.BE || 0),
      ]);

      autoTable(doc, {
        startY: curY,
        head: [['Rank', 'Class', 'Stream', 'Learners', 'Mean %', 'Level', 'Quality Pass %', 'Top Learner', 'Top Score', 'EE', 'ME', 'AE', 'BE']],
        body: rankRows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        headStyles: {
          fillColor: [122, 18, 40],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [31, 41, 55],
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ==============================================================
    // 3. SECTION 3: BEST PERFORMING CLASS PER SUBJECT
    // ==============================================================
    if (broadsheet.bestClassesPerSubject && broadsheet.bestClassesPerSubject.length > 0) {
      doc.addPage('a4', 'landscape');
      curY = renderHeader(
        'BEST PERFORMING CLASS PER SUBJECT REPORT',
        'Subject Lead Stream Comparison with Runner-Up Margins',
        12
      );

      const bestClassRows = broadsheet.bestClassesPerSubject.map((b) => [
        b.learningAreaName,
        `${b.bestClassName} (${b.bestStreamName})`,
        `${b.meanScore}%`,
        b.performanceLevel,
        String(b.totalStudents),
        b.runnerUpStreamName ? `${b.runnerUpStreamName} (${b.runnerUpMeanScore}%)` : '--',
        b.runnerUpMeanScore ? `+${(b.meanScore - b.runnerUpMeanScore).toFixed(1)}%` : '--',
      ]);

      autoTable(doc, {
        startY: curY,
        head: [['Subject / Learning Area', 'Leading Stream', 'Mean Score %', 'Level', 'Candidates', 'Runner-Up Stream', 'Lead Margin']],
        body: bestClassRows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        headStyles: {
          fillColor: [122, 18, 40],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [31, 41, 55],
          cellPadding: 2.2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ==============================================================
    // 4. SECTION 4: BEST STUDENT PER SUBJECT (CHAMPIONS)
    // ==============================================================
    const studentChampions = (broadsheet.schoolBestStudentsPerSubject && broadsheet.schoolBestStudentsPerSubject.length > 0)
      ? broadsheet.schoolBestStudentsPerSubject
      : broadsheet.bestStudentsPerSubject;

    if (studentChampions && studentChampions.length > 0) {
      doc.addPage('a4', 'landscape');
      curY = renderHeader(
        'SUBJECT MERIT ROLL & TOP PERFORMING LEARNERS REPORT',
        'Subject Champions Across All Evaluated Competency Areas',
        12
      );

      const champRows = studentChampions.map((s, idx) => [
        String(idx + 1),
        s.learningAreaName,
        s.studentName,
        `${s.className} (${s.streamName})`,
        `${s.score}%`,
        s.performanceLevel,
        s.scope === 'SCHOOL' ? 'School-Wide Champion' : 'Class Champion',
      ]);

      autoTable(doc, {
        startY: curY,
        head: [['#', 'Subject / Learning Area', 'Champion Learner Full Name', 'Class & Stream', 'Highest Mark', 'Level', 'Distinction']],
        body: champRows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        headStyles: {
          fillColor: [122, 18, 40],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [31, 41, 55],
          cellPadding: 2.2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      // Three-Party Certification Signatures
      const lastTable = (doc as any).lastAutoTable;
      let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 160) + 8;
      if (finalY + 25 > 195) {
        doc.addPage('a4', 'landscape');
        finalY = 20;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, finalY, 283, finalY);
      finalY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      doc.text('Class Educator Certification:', 14, finalY);
      doc.line(14, finalY + 6, 85, finalY + 6);
      doc.text('Signature & Date', 14, finalY + 10);

      doc.text('Academic Dean Verification:', 105, finalY);
      doc.line(105, finalY + 6, 185, finalY + 6);
      doc.text('Endorsement & Date', 105, finalY + 10);

      doc.text('Headteacher Endorsement:', 205, finalY);
      doc.line(205, finalY + 6, 283, finalY + 6);
      doc.text('Official Seal / Stamp & Date', 205, finalY + 10);

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Grace Seeds School · Complete Consolidated CBC Broadsheet & Institutional Dossier', 148, 204, { align: 'center' });
    }

    const filenameClass = (broadsheet.className || 'Class').replace(/\s+/g, '_');
    const filenameStream = (broadsheet.streamName || 'All_Streams').replace(/\s+/g, '_');
    doc.save(`Grace_Seeds_Complete_Broadsheet_${filenameClass}_${filenameStream}_Term3_2026.pdf`);
  };

  const getLevelBadge = (level: string) => {
    const l = level?.toUpperCase() || '';
    if (l.includes('EXCEED') || l === 'EE') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          EE
        </span>
      );
    }
    if (l.includes('MEET') || l === 'ME') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
          ME
        </span>
      );
    }
    if (l.includes('APPROACH') || l === 'AE') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
          AE
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
        BE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="print:hidden bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-base">analytics</span>
            Kenyan CBC Academic Registry &amp; Assessment Database
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Master Broadsheets &amp; Performance Rankings
          </h1>
          <p className="text-rose-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
            Consolidated evaluation marksheet, whole-school class rankings, best subjects, and learner champions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBroadsheetPDF}
            disabled={!broadsheet || !broadsheet.rows.length}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white border border-white/30 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title="Download complete broadsheet package with all analytical tables as PDF"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Download Complete Broadsheet (PDF)
          </button>
          <button
            onClick={handlePrint}
            disabled={!broadsheet || !broadsheet.rows.length}
            className="bg-white hover:bg-slate-100 disabled:opacity-50 text-[#500b1b] px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Print Broadsheet
          </button>
        </div>
      </div>

      {/* Control Selector Bar */}
      <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-base text-rose-800">school</span>
            Grade:
          </span>
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => handleClassChange(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                c.id === selectedClassId
                  ? 'bg-[#500b1b] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Class / Grade</label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Stream</label>
              <select
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                <option value="all">
                  ⭐ All Streams ({classes.find((c) => c.id === selectedClassId)?.name || 'Grade Consolidated'})
                </option>
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    Stream {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Assessment Type</label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                <option value="End of Term Examination">End of Term Examination</option>
                <option value="Mid-Term Assessment">Mid-Term Assessment</option>
                <option value="Opener Examination">Opener Examination</option>
                <option value="Continuous Assessment Tests (CATs)">Continuous Assessment Tests (CATs)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {academicTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => fetchBroadsheetData(selectedStreamId)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Recalculate Broadsheet
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      {broadsheet && (
        <div className="space-y-4 print:hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {selectedStreamId === 'all' ? 'Grade Mean Score' : 'Stream Mean Score'}
                </span>
                <span className="material-symbols-outlined text-indigo-500 text-lg">trending_up</span>
              </div>
              <p className="text-2xl font-black text-indigo-600 mt-1">{broadsheet.streamMeanScore}%</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {broadsheet.streamMeanPoints ? `${broadsheet.streamMeanPoints} Mean GPA` : ''} • {broadsheet.totalStudents} ranked
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Exceeding (EE)</span>
                <span className="material-symbols-outlined text-emerald-500 text-lg">verified</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-1">{overallStats.EE}</p>
              <p className="text-xs text-slate-400 mt-1">
                {broadsheet.totalStudents
                  ? Math.round((overallStats.EE / broadsheet.totalStudents) * 100)
                  : 0}% of cohort
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Meeting (ME)</span>
                <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-1">{overallStats.ME}</p>
              <p className="text-xs text-slate-400 mt-1">
                {broadsheet.totalStudents
                  ? Math.round((overallStats.ME / broadsheet.totalStudents) * 100)
                  : 0}% of cohort
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Quality Pass Rate (EE+ME)</span>
                <span className="material-symbols-outlined text-amber-500 text-lg">award_star</span>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {broadsheet.totalStudents
                  ? Math.round(((overallStats.EE + overallStats.ME) / broadsheet.totalStudents) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                AE: {overallStats.AE} | BE: {overallStats.BE}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Bar with School vs Class Toggle */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('marksheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'marksheet'
                ? 'bg-[#500b1b] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">table_rows</span>
            Stream Marksheet
          </button>

          <button
            onClick={() => setActiveTab('classRanking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'classRanking'
                ? 'bg-[#500b1b] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">military_tech</span>
            Best Performing Classes
          </button>

          <button
            onClick={() => setActiveTab('bestClassPerSubject')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bestClassPerSubject'
                ? 'bg-[#500b1b] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">award_star</span>
            Best Class Per Subject
          </button>

          <button
            onClick={() => setActiveTab('bestStudentPerSubject')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bestStudentPerSubject'
                ? 'bg-[#500b1b] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">stars</span>
            Best Student Per Subject
          </button>
        </div>

        {activeTab !== 'marksheet' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setScopeFilter('CLASS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === 'CLASS'
                  ? 'bg-[#500b1b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Class Level
            </button>
            <button
              onClick={() => setScopeFilter('SCHOOL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === 'SCHOOL'
                  ? 'bg-[#500b1b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Whole School
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 print:border-none print:shadow-none print:p-0">
        <div className="text-center border-b pb-4 mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider">
            GRACE SEEDS SCHOOL
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            KEMRI Street, Kisian, Kisumu, Kenya · Tel: 0745436312 · Email: schoolgraceseeds@gmail.com
          </p>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-4xl mb-3 text-indigo-600">
              progress_activity
            </span>
            <p className="font-semibold">Aggregating marks from database records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500">
            <span className="material-symbols-outlined text-4xl mb-2">error</span>
            <p className="font-semibold">{error}</p>
          </div>
        ) : !broadsheet || !broadsheet.rows.length ? (
          <div className="p-16 text-center text-slate-500">
            No marksheet records available in database for this selection.
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. MARKSHEET TABLE */}
            {activeTab === 'marksheet' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                        <th className="p-2 border whitespace-nowrap text-center">Pos</th>
                        <th className="p-2 border whitespace-nowrap text-left">Learner Full Name</th>
                        <th className="p-2 border whitespace-nowrap text-center">Stream</th>

                        {broadsheet.learningAreas.map((la) => (
                          <th
                            key={la.id}
                            className="p-2 border text-center font-black text-xs font-mono text-[#7a1228] bg-rose-50/40 whitespace-nowrap"
                            title={la.name}
                          >
                            {getSubjectInitials(la.code || la.name)}
                          </th>
                        ))}

                        <th className="p-2 border text-center whitespace-nowrap bg-slate-100">Total Marks</th>
                        <th className="p-2 border text-center whitespace-nowrap bg-slate-100">Mean %</th>
                        <th className="p-2 border text-center whitespace-nowrap bg-indigo-50/60 text-indigo-950">Pts</th>
                        <th className="p-2 border text-center whitespace-nowrap bg-indigo-50/60 text-indigo-950">GPA</th>
                        <th className="p-2 border text-center whitespace-nowrap bg-indigo-50/60 text-indigo-950">Level</th>
                        <th className="p-2 border text-left whitespace-nowrap">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRows.map((row, index) => {
                        const displayPos = selectedStreamId === 'all'
                          ? (index + 1)
                          : (row.streamRank || index + 1);

                        return (
                          <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 border text-center font-bold font-mono whitespace-nowrap">
                              {displayPos}
                            </td>
                            <td className="p-2 border font-bold text-slate-900 whitespace-nowrap text-left">
                              {row.studentName}
                            </td>
                            <td className="p-2 border text-center whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {row.streamName || broadsheet.streamName}
                              </span>
                            </td>

                            {broadsheet.learningAreas.map((la) => {
                              const scoreObj = row.subjects[la.id];
                              return (
                                <td key={la.id} className="p-1.5 border text-center whitespace-nowrap">
                                  {scoreObj && scoreObj.levelLabel !== '--' ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="font-mono font-bold text-slate-900 text-xs">
                                        {scoreObj.numericScore}%
                                      </span>
                                      {getLevelBadge(scoreObj.performanceLevel)}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-xs">--</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 border text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                              {row.totalScore}
                            </td>
                            <td className="p-2 border text-center font-mono font-black text-indigo-700 whitespace-nowrap">
                              {row.averageScore}%
                            </td>
                            <td className="p-2 border text-center font-mono font-bold text-indigo-950 bg-indigo-50/20 whitespace-nowrap">
                              {row.totalPoints || 0}
                            </td>
                            <td className="p-2 border text-center font-mono font-extrabold text-indigo-800 bg-indigo-50/20 text-xs whitespace-nowrap">
                              {row.meanPoints || 0}
                            </td>
                            <td className="p-2 border text-center bg-indigo-50/20 whitespace-nowrap">
                              {getLevelBadge(row.overallPerformanceLevel)}
                            </td>
                            <td className="p-2 border text-xs text-slate-700 whitespace-nowrap text-left">
                              {row.remarks || 'Satisfactory academic progress.'}
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td colSpan={3} className="p-2 border text-right uppercase tracking-wider text-[11px] text-slate-700 whitespace-nowrap">
                          Subject Mean (%)
                        </td>
                        {broadsheet.learningAreas.map((la) => {
                          const sumObj = broadsheet.subjectSummaries.find((s) => s.learningAreaId === la.id);
                          return (
                            <td key={la.id} className="p-2 border text-center font-mono font-black text-indigo-700 text-xs whitespace-nowrap">
                              {sumObj?.averageScore ? `${sumObj.averageScore}%` : '--'}
                            </td>
                          );
                        })}
                        <td colSpan={6} className="p-2 border text-center font-mono font-black text-indigo-900 text-xs whitespace-nowrap">
                          {broadsheet.streamMeanScore}% Overall Mean
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. BEST PERFORMING CLASSES */}
            {activeTab === 'classRanking' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {scopeFilter === 'SCHOOL' ? 'Best Performing Classes in the Entire School' : 'Class & Stream Ranking (Current Grade)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {scopeFilter === 'SCHOOL' ? 'Every grade ranked against the entire school' : 'Streams ranked within current grade cohort'}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5 border text-center w-16">Rank</th>
                        <th className="p-2.5 border">Class / Stream</th>
                        <th className="p-2.5 border text-center w-24">Learners</th>
                        <th className="p-2.5 border text-center w-24">Mean Score</th>
                        <th className="p-2.5 border text-center w-20">Level</th>
                        <th className="p-2.5 border text-center">Quality Pass Rate</th>
                        <th className="p-2.5 border">Top Student</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedClassRankings.map((cr) => (
                        <tr key={cr.classId + (cr.streamId || cr.streamName)} className="hover:bg-slate-50">
                          <td className="p-2.5 border text-center font-bold font-mono">
                            {cr.rank === 1 ? '1st' : cr.rank === 2 ? '2nd' : cr.rank === 3 ? '3rd' : `#${cr.rank}`}
                          </td>
                          <td className="p-2.5 border font-bold text-slate-900">
                            {cr.className} {cr.streamName !== 'Whole Grade' ? `(${cr.streamName})` : ''}
                          </td>
                          <td className="p-2.5 border text-center font-mono">{cr.totalStudents}</td>
                          <td className="p-2.5 border text-center font-mono font-black text-indigo-700">
                            {cr.meanScore}%
                          </td>
                          <td className="p-2.5 border text-center">{getLevelBadge(cr.overallPerformanceLevel)}</td>
                          <td className="p-2.5 border text-center font-mono font-bold text-emerald-800">
                            {cr.qualityPassRate}%
                          </td>
                          <td className="p-2.5 border font-medium text-slate-800">
                            {cr.topStudentName} ({cr.topStudentScore}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. BEST CLASS PER SUBJECT */}
            {activeTab === 'bestClassPerSubject' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-base font-extrabold text-slate-900">Best Performing Class Per Subject</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Top performing streams for each learning area</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5 border text-center w-12">#</th>
                        <th className="p-2.5 border">Subject / Learning Area</th>
                        <th className="p-2.5 border">Leading Stream</th>
                        <th className="p-2.5 border text-center w-28">Mean Score</th>
                        <th className="p-2.5 border text-center w-20">Level</th>
                        <th className="p-2.5 border text-center w-24">Candidates</th>
                        <th className="p-2.5 border">Runner-Up Stream</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {broadsheet.bestClassesPerSubject.map((sub, idx) => (
                        <tr key={sub.learningAreaId} className="hover:bg-slate-50">
                          <td className="p-2.5 border text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 border font-extrabold text-slate-900">{sub.learningAreaName}</td>
                          <td className="p-2.5 border font-bold text-indigo-950">{sub.bestClassName} - {sub.bestStreamName}</td>
                          <td className="p-2.5 border text-center font-mono font-black text-indigo-700">{sub.meanScore}%</td>
                          <td className="p-2.5 border text-center">{getLevelBadge(sub.performanceLevel)}</td>
                          <td className="p-2.5 border text-center font-mono">{sub.totalStudents}</td>
                          <td className="p-2.5 border text-slate-700">
                            {sub.runnerUpStreamName ? `${sub.runnerUpStreamName} (${sub.runnerUpMeanScore}%)` : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. BEST STUDENT PER SUBJECT */}
            {activeTab === 'bestStudentPerSubject' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {scopeFilter === 'SCHOOL' ? 'Best Students Per Subject in the Whole School' : 'Best Students Per Subject in Class'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {scopeFilter === 'SCHOOL' ? 'Highest scoring learners across all classes in the school' : 'Subject champions within this grade cohort'}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5 border text-center w-12">#</th>
                        <th className="p-2.5 border">Subject / Learning Area</th>
                        <th className="p-2.5 border">Top Learner Full Name</th>
                        <th className="p-2.5 border">Class &amp; Stream</th>
                        <th className="p-2.5 border text-center w-28">Score</th>
                        <th className="p-2.5 border text-center w-20">Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedStudentsPerSubject.map((champ, idx) => (
                        <tr key={champ.learningAreaId} className="hover:bg-slate-50">
                          <td className="p-2.5 border text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 border font-extrabold text-slate-900">{champ.learningAreaName}</td>
                          <td className="p-2.5 border font-extrabold text-slate-950">{champ.studentName}</td>
                          <td className="p-2.5 border font-medium text-slate-700">{champ.className} - {champ.streamName}</td>
                          <td className="p-2.5 border text-center font-mono font-black text-emerald-800">{champ.score}%</td>
                          <td className="p-2.5 border text-center">{getLevelBadge(champ.performanceLevel)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};