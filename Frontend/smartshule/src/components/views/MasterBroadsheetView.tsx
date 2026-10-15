import React, { useState, useEffect, useMemo } from 'react';
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
  const [streamBreakoutMode, setStreamBreakoutMode] = useState<'sectioned' | 'consolidated'>('sectioned');

  const [broadsheet, setBroadsheet] = useState<BroadsheetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    'marksheet' | 'classRanking' | 'bestClassPerSubject' | 'bestStudentPerSubject' | 'all'
  >('marksheet');
  const [searchTerm, setSearchTerm] = useState('');

  // Load Classes, Streams, Academic Years & Terms strictly from database
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Fetch Academic Years
        try {
          const yRes = await apiService.getAcademicYears();
          if (yRes?.success && yRes.data && yRes.data.length > 0) {
            setAcademicYears(yRes.data);
            const activeYear =
              yRes.data.find((y) => y.name.includes('2026')) ||
              yRes.data.find((y) => y.isCurrent) ||
              yRes.data[0];
            setSelectedYear(activeYear.id);

            // Fetch Terms for active year
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

        // 2. Fetch Classes and sort by educational sequence
        const res = await apiService.getClasses();
        if (res?.success && res.data && res.data.length > 0) {
          const sorted = [...res.data].sort((a, b) => {
            const orderA = GRADE_ORDER[a.gradeLevel?.toUpperCase()] ?? 99;
            const orderB = GRADE_ORDER[b.gradeLevel?.toUpperCase()] ?? 99;
            return orderA - orderB;
          });
          setClasses(sorted);

          // Default to Grade 4 (or first class with streams), else sorted[0]
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

  // When class changes, update streams from database
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

  // When academic year changes, load terms for that year
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

  // Overall Performance Level counts strictly from database
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

  // Real Class & Stream Rankings directly from database
  const effectiveClassRankings = useMemo<ClassRankingItem[]>(() => {
    return broadsheet?.classRankings || [];
  }, [broadsheet]);

  // Real Best Performing Class Per Subject directly from database
  const effectiveBestClassesPerSubject = useMemo<BestClassPerSubjectItem[]>(() => {
    return broadsheet?.bestClassesPerSubject || [];
  }, [broadsheet]);

  // Real Best Student Per Subject directly from database
  const effectiveBestStudentsPerSubject = useMemo<BestStudentPerSubjectItem[]>(() => {
    return broadsheet?.bestStudentsPerSubject || [];
  }, [broadsheet]);

  // Filtered rows for stream marksheet search
  const filteredRows = useMemo(() => {
    if (!broadsheet || !broadsheet.rows) return [];
    if (!searchTerm.trim()) return broadsheet.rows;
    const term = searchTerm.toLowerCase();
    return broadsheet.rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(term) ||
        r.admissionNumber.toLowerCase().includes(term)
    );
  }, [broadsheet, searchTerm]);

  // Counts of learners per stream in active broadsheet
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

  // Grouped stream sections for broken-apart presentation
  const groupedStreamSections = useMemo(() => {
    if (!broadsheet || !broadsheet.rows || broadsheet.rows.length === 0) return [];

    const filterRows = (rowsList: any[]) => {
      if (!searchTerm.trim()) return rowsList;
      const term = searchTerm.toLowerCase();
      return rowsList.filter(
        (r) =>
          r.studentName.toLowerCase().includes(term) ||
          r.admissionNumber.toLowerCase().includes(term)
      );
    };

    const buildSection = (streamId: string, streamName: string, rows: any[], existingSummaries?: any[]) => {
      const sorted = [...rows].sort(
        (a, b) => (a.streamRank || 999) - (b.streamRank || 999) || b.totalScore - a.totalScore
      );
      const meanScore =
        sorted.length > 0
          ? Math.round(sorted.reduce((sum, r) => sum + r.averageScore, 0) / sorted.length)
          : 0;
      const meanPoints =
        sorted.length > 0
          ? Number((sorted.reduce((sum, r) => sum + (r.meanPoints || 0), 0) / sorted.length).toFixed(2))
          : 0;

      let eeCount = 0;
      let meCount = 0;
      let aeCount = 0;
      let beCount = 0;
      sorted.forEach((r) => {
        const lvl = r.overallPerformanceLevel?.toUpperCase();
        if (lvl?.includes('EXCEED') || lvl === 'EE' || r.averageScore >= 80) eeCount++;
        else if (lvl?.includes('MEET') || lvl === 'ME' || r.averageScore >= 65) meCount++;
        else if (lvl?.includes('APPROACH') || lvl === 'AE' || r.averageScore >= 50) aeCount++;
        else beCount++;
      });
      const qualityPassRate = sorted.length > 0 ? Math.round(((eeCount + meCount) / sorted.length) * 100) : 0;
      const topStudent = sorted.length > 0 ? sorted[0] : null;

      let subjectSummaries = existingSummaries;
      if (!subjectSummaries || subjectSummaries.length === 0) {
        subjectSummaries = broadsheet.learningAreas.map((la) => {
          let sum = 0;
          let count = 0;
          let pSum = 0;
          let highest = 0;
          let highestName = '';
          let lowest = 100;
          let subEe = 0;
          let subMe = 0;
          let subAe = 0;
          let subBe = 0;

          sorted.forEach((r) => {
            const sub = r.subjects[la.id];
            if (sub && sub.levelLabel !== '--') {
              sum += sub.numericScore;
              pSum += sub.points || 0;
              count++;
              if (sub.numericScore > highest) {
                highest = sub.numericScore;
                highestName = r.studentName;
              }
              if (sub.numericScore < lowest) {
                lowest = sub.numericScore;
              }
              const lvl = sub.performanceLevel?.toUpperCase();
              if (lvl?.includes('EXCEED') || lvl === 'EE' || sub.numericScore >= 80) subEe++;
              else if (lvl?.includes('MEET') || lvl === 'ME' || sub.numericScore >= 65) subMe++;
              else if (lvl?.includes('APPROACH') || lvl === 'AE' || sub.numericScore >= 50) subAe++;
              else subBe++;
            }
          });

          return {
            learningAreaId: la.id,
            learningAreaName: la.name,
            averageScore: count > 0 ? Math.round(sum / count) : 0,
            meanPoints: count > 0 ? Number((pSum / count).toFixed(2)) : 0,
            totalAssessed: count,
            highestScore: count > 0 ? highest : undefined,
            highestScorerName: highestName || undefined,
            lowestScore: count > 0 && lowest <= 100 ? lowest : undefined,
            passRate: count > 0 ? Math.round(((subEe + subMe) / count) * 100) : 0,
            counts: { EE: subEe, ME: subMe, AE: subAe, BE: subBe },
          };
        });
      }

      return {
        streamId,
        streamName,
        className: broadsheet.className,
        rows: filterRows(sorted),
        subjectSummaries,
        streamMeanScore: meanScore,
        streamMeanPoints: meanPoints,
        totalStudents: sorted.length,
        qualityPassRate,
        counts: { EE: eeCount, ME: meCount, AE: aeCount, BE: beCount },
        topStudent,
      };
    };

    // If single stream is selected
    if (selectedStreamId !== 'all') {
      const streamObj = streams.find((s) => s.id === selectedStreamId);
      const streamName = streamObj?.name ? `Stream ${streamObj.name}` : broadsheet.streamName;
      return [buildSection(selectedStreamId, streamName, broadsheet.rows, broadsheet.subjectSummaries)];
    }

    // If backend provided streamSections
    if (broadsheet.streamSections && broadsheet.streamSections.length > 0) {
      return broadsheet.streamSections
        .map((sec) => buildSection(sec.streamId, sec.streamName, sec.rows, sec.subjectSummaries))
        .filter((sec) => sec.rows.length > 0);
    }

    // Otherwise group rows by streamName
    const map = new Map<string, typeof broadsheet.rows>();
    broadsheet.rows.forEach((r) => {
      const sName = r.streamName || 'Default Stream';
      if (!map.has(sName)) {
        map.set(sName, []);
      }
      map.get(sName)!.push(r);
    });

    const sections = [];
    for (const [streamName, sRows] of map.entries()) {
      sections.push(buildSection(sRows[0]?.streamId || streamName, streamName, sRows));
    }
    return sections;
  }, [broadsheet, selectedStreamId, streams, searchTerm]);

  // Helper download function
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV DOWNLOAD 1: Stream Marksheet
  const handleExportCSV = () => {
    if (!broadsheet || !broadsheet.rows.length) return;
    const headers = ['Stream Rank', 'Class Rank', 'Stream', 'Adm No', 'Student Name', 'Sex'];
    broadsheet.learningAreas.forEach((la) => {
      headers.push(`${la.name} (Score %)`, `${la.name} (Level)`, `${la.name} (Points)`, `${la.name} (Subject Rank)`);
    });
    headers.push('Total Marks', 'Mean Score (%)', 'Total Points', 'Mean GPA', 'Overall Level', 'Teacher Remarks');

    const csvRows: string[] = [headers.join(',')];

    broadsheet.rows.forEach((r) => {
      const row: string[] = [
        String(r.streamRank || r.rank),
        String(r.classRank || r.rank),
        `"${r.streamName || broadsheet.streamName}"`,
        `"${r.admissionNumber || ''}"`,
        `"${r.studentName || ''}"`,
        `"${r.gender?.[0] || 'M'}"`,
      ];

      broadsheet.learningAreas.forEach((la) => {
        const sub = r.subjects[la.id];
        row.push(sub ? String(sub.numericScore) : '0');
        row.push(sub ? `"${sub.levelLabel || sub.performanceLevel}"` : '"--"');
        row.push(sub ? String(sub.points || 0) : '0');
        row.push(sub && sub.subjectRank ? String(sub.subjectRank) : '--');
      });

      row.push(
        String(r.totalScore),
        String(r.averageScore),
        String(r.totalPoints || 0),
        String(r.meanPoints || 0),
        `"${r.overallPerformanceLevel}"`,
        `"${r.remarks || ''}"`
      );
      csvRows.push(row.join(','));
    });

    downloadCSV(
      `Broadsheet_Marksheet_${broadsheet.className}_${broadsheet.streamName}_${selectedTerm}_${selectedYear}.csv`,
      csvRows.join('\n')
    );
  };

  // CSV DOWNLOAD 2: Class & Stream Ranking
  const handleExportClassRankingCSV = () => {
    if (!effectiveClassRankings.length) return;
    const headers = [
      'Rank',
      'Class Name',
      'Stream Name',
      'Total Learners',
      'Mean Score (%)',
      'Performance Level',
      'Quality Pass Rate (EE+ME %)',
      'Top Learner Name',
      'Top Learner Score (%)',
      'EE Count',
      'ME Count',
      'AE Count',
      'BE Count',
    ];
    const rows = effectiveClassRankings.map((r) =>
      [
        r.rank,
        `"${r.className}"`,
        `"${r.streamName}"`,
        r.totalStudents,
        r.meanScore,
        `"${r.overallPerformanceLevel}"`,
        `"${r.qualityPassRate || 0}%"`,
        `"${r.topStudentName || ''}"`,
        r.topStudentScore || 0,
        r.counts?.EE || 0,
        r.counts?.ME || 0,
        r.counts?.AE || 0,
        r.counts?.BE || 0,
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(
      `Class_Ranking_${broadsheet?.className || 'Class'}_${selectedTerm}_${selectedYear}.csv`,
      csvContent
    );
  };

  // CSV DOWNLOAD 3: Best Performing Class Per Subject
  const handleExportBestClassPerSubjectCSV = () => {
    if (!effectiveBestClassesPerSubject.length) return;
    const headers = [
      'Subject / Learning Area',
      'Best Performing Class',
      'Best Stream',
      'Subject Mean Score (%)',
      'Performance Level',
      'Total Candidates',
      'Runner-Up Stream',
      'Runner-Up Mean Score (%)',
      'Lead Margin (%)',
    ];
    const rows = effectiveBestClassesPerSubject.map((b) => {
      const margin = b.runnerUpMeanScore
        ? (b.meanScore - b.runnerUpMeanScore).toFixed(1)
        : '0.0';
      return [
        `"${b.learningAreaName}"`,
        `"${b.bestClassName}"`,
        `"${b.bestStreamName}"`,
        b.meanScore,
        `"${b.performanceLevel}"`,
        b.totalStudents,
        `"${b.runnerUpStreamName || 'None'}"`,
        b.runnerUpMeanScore || '--',
        margin,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(
      `Best_Performing_Class_Per_Subject_${broadsheet?.className || 'Class'}_${selectedTerm}_${selectedYear}.csv`,
      csvContent
    );
  };

  // CSV DOWNLOAD 4: Best Student Per Subject
  const handleExportBestStudentPerSubjectCSV = () => {
    if (!effectiveBestStudentsPerSubject.length) return;
    const headers = [
      'Subject / Learning Area',
      'Top Learner Name',
      'Admission Number',
      'Class',
      'Stream',
      'Gender',
      'Highest Score (%)',
      'Performance Level',
    ];
    const rows = effectiveBestStudentsPerSubject.map((s) =>
      [
        `"${s.learningAreaName}"`,
        `"${s.studentName}"`,
        `"${s.admissionNumber}"`,
        `"${s.className}"`,
        `"${s.streamName}"`,
        `"${s.gender}"`,
        s.score,
        `"${s.performanceLevel}"`,
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(
      `Best_Student_Per_Subject_${broadsheet?.className || 'Class'}_${selectedTerm}_${selectedYear}.csv`,
      csvContent
    );
  };

  // CSV DOWNLOAD 5: Master Consolidated Package (All Analytics + Broadsheet)
  const handleExportAllAnalyticsCSV = () => {
    if (!broadsheet) return;

    const lines: string[] = [];
    lines.push('SMARTSHULE ACADEMY - CONSOLIDATED MASTER BROADSHEET & ANALYTICS REPORT');
    lines.push(`Academic Term: ${selectedTerm}, Year: ${selectedYear}, Class: ${broadsheet.className}, Stream: ${broadsheet.streamName}`);
    lines.push(`Generated On: ${new Date().toLocaleDateString('en-KE')}`);
    lines.push('');

    // Section 1: Class Ranking
    lines.push('=== 1. CLASS & STREAM RANKINGS ===');
    lines.push('Rank,Class,Stream,Enrolled Students,Mean Score (%),Level,Pass Rate (%),Top Learner,Top Score,EE,ME,AE,BE');
    effectiveClassRankings.forEach((r) => {
      lines.push(
        `${r.rank},"${r.className}","${r.streamName}",${r.totalStudents},${r.meanScore},"${r.overallPerformanceLevel}","${r.qualityPassRate}%","${r.topStudentName}",${r.topStudentScore},${r.counts?.EE || 0},${r.counts?.ME || 0},${r.counts?.AE || 0},${r.counts?.BE || 0}`
      );
    });
    lines.push('');

    // Section 2: Best Class Per Subject
    lines.push('=== 2. BEST PERFORMING CLASS PER SUBJECT ===');
    lines.push('Subject / Learning Area,Best Class,Best Stream,Mean Score (%),Level,Candidates,Runner-Up Stream,Runner-Up Mean (%)');
    effectiveBestClassesPerSubject.forEach((b) => {
      lines.push(
        `"${b.learningAreaName}","${b.bestClassName}","${b.bestStreamName}",${b.meanScore},"${b.performanceLevel}",${b.totalStudents},"${b.runnerUpStreamName || 'None'}",${b.runnerUpMeanScore || '--'}`
      );
    });
    lines.push('');

    // Section 3: Best Student Per Subject
    lines.push('=== 3. BEST STUDENT PER SUBJECT (SUBJECT CHAMPIONS) ===');
    lines.push('Subject / Learning Area,Top Learner Name,Adm No,Class,Stream,Gender,Score (%),Level');
    effectiveBestStudentsPerSubject.forEach((s) => {
      lines.push(
        `"${s.learningAreaName}","${s.studentName}","${s.admissionNumber}","${s.className}","${s.streamName}","${s.gender}",${s.score},"${s.performanceLevel}"`
      );
    });
    lines.push('');

    // Section 4: Stream Broadsheet Marksheet
    lines.push('=== 4. STREAM & GRADE LEARNER MARKSHEET ===');
    const marksheetHeaders = ['Stream Rank', 'Class Rank', 'Stream', 'Adm No', 'Student Name', 'Sex'];
    broadsheet.learningAreas.forEach((la) => {
      marksheetHeaders.push(`${la.name} (Score %)`, `${la.name} (Level)`, `${la.name} (Points)`, `${la.name} (Pos)`);
    });
    marksheetHeaders.push('Total Marks', 'Mean Score (%)', 'Total Points', 'Mean GPA', 'Overall Level', 'Teacher Remarks');
    lines.push(marksheetHeaders.join(','));

    broadsheet.rows.forEach((r) => {
      const row: string[] = [
        String(r.streamRank || r.rank),
        String(r.classRank || r.rank),
        `"${r.streamName || broadsheet.streamName}"`,
        `"${r.admissionNumber || ''}"`,
        `"${r.studentName || ''}"`,
        `"${r.gender?.[0] || 'M'}"`,
      ];
      broadsheet.learningAreas.forEach((la) => {
        const sub = r.subjects[la.id];
        row.push(sub ? String(sub.numericScore) : '0');
        row.push(sub ? `"${sub.levelLabel || sub.performanceLevel}"` : '"--"');
        row.push(sub ? String(sub.points || 0) : '0');
        row.push(sub && sub.subjectRank ? String(sub.subjectRank) : '--');
      });
      row.push(
        String(r.totalScore),
        String(r.averageScore),
        String(r.totalPoints || 0),
        String(r.meanPoints || 0),
        `"${r.overallPerformanceLevel}"`,
        `"${r.remarks || ''}"`
      );
      lines.push(row.join(','));
    });

    downloadCSV(
      `Master_Broadsheet_Complete_Analytics_${broadsheet.className}_${broadsheet.streamName}_${selectedTerm}_${selectedYear}.csv`,
      lines.join('\n')
    );
  };

  const getLevelBadge = (level: string) => {
    const l = level?.toUpperCase() || '';
    if (l.includes('EXCEED') || l === 'EE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          EE
        </span>
      );
    }
    if (l.includes('MEET') || l === 'ME') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
          ME
        </span>
      );
    }
    if (l.includes('APPROACH') || l === 'AE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
          AE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
        BE
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 font-black';
    if (score >= 65) return 'text-blue-700 font-bold';
    if (score >= 50) return 'text-amber-700 font-semibold';
    return 'text-rose-700 font-semibold';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Hidden in Print */}
      <div className="print:hidden bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-base">analytics</span>
            Kenyan CBC Academic Registry & Database Evaluation
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Master Broadsheets & Performance Rankings
          </h1>
          <p className="text-rose-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
            Consolidated evaluation marksheet calculated directly from local database records featuring class rankings, best performing classes per subject, and top students per learning area.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportAllAnalyticsCSV}
            disabled={!broadsheet || !broadsheet.rows.length}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            title="Download complete analytics package including all ranking tables and broadsheet"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export All Analytics CSV
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

      {/* Control Selector Bar - Hidden in Print */}
      <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Class Quick-Select Pills */}
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
            {/* Class Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Class / Grade</label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {classes.length > 0 ? (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="">No classes configured in database</option>
                )}
              </select>
            </div>

            {/* Stream Selector */}
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

            {/* Assessment / Exam Type Selector */}
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
                <option value="KPSEA / Mock Examination">KPSEA / Mock Examination</option>
              </select>
            </div>

            {/* Term Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {academicTerms.length > 0 ? (
                  academicTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="term-2026-t3">Term 3</option>
                    <option value="term-2026-t2">Term 2</option>
                    <option value="term-2026-t1">Term 1</option>
                  </>
                )}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#500b1b] focus:border-[#500b1b]"
              >
                {academicYears.length > 0 ? (
                  academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="year-2026">2026</option>
                    <option value="year-2025">2025</option>
                  </>
                )}
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

        {/* Active Class & Cohort Status Banner */}
        {selectedClassId && (
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#500b1b] text-white font-extrabold rounded-md uppercase tracking-wider text-[11px] shadow-sm">
                {classes.find((c) => c.id === selectedClassId)?.name || 'Class'}
              </span>
              <span className="text-slate-800 font-bold">
                {selectedStreamId === 'all'
                  ? `All Streams (${streams.length} Streams Consolidated)`
                  : `Stream: ${streams.find((s) => s.id === selectedStreamId)?.name || 'Selected Stream'}`}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-semibold">
                {broadsheet?.totalStudents ?? 0} Students Evaluated
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 font-medium">
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                {selectedExamType}
              </span>
              <span>•</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                {broadsheet?.termName || 'Term 3'} ({broadsheet?.yearName || '2026'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Performance Highlights */}
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
                  : 0}
                % of cohort
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
                  : 0}
                % of cohort
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

          {/* Gender-Disaggregated MOE Statistical Card */}
          {broadsheet.genderStats && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-pink-400 text-xl">diversity_3</span>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-100">
                    Gender-Disaggregated MOE & KNEC Performance Analysis
                  </h3>
                </div>
                <span className="text-[11px] text-slate-300 font-medium bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  Ministry of Education Equity & Inclusion Metrics
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-sky-200">
                    <span className="font-bold">Boys Enrolled</span>
                    <span className="material-symbols-outlined text-sm">male</span>
                  </div>
                  <p className="text-2xl font-black text-sky-300 mt-1">{broadsheet.genderStats.boysCount}</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Mean: <strong className="text-white">{broadsheet.genderStats.boysMeanScore}%</strong> ({broadsheet.genderStats.boysMeanPoints} pts)
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-pink-200">
                    <span className="font-bold">Girls Enrolled</span>
                    <span className="material-symbols-outlined text-sm">female</span>
                  </div>
                  <p className="text-2xl font-black text-pink-300 mt-1">{broadsheet.genderStats.girlsCount}</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Mean: <strong className="text-white">{broadsheet.genderStats.girlsMeanScore}%</strong> ({broadsheet.genderStats.girlsMeanPoints} pts)
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-amber-200">
                    <span className="font-bold">Top Boy Performer</span>
                    <span className="material-symbols-outlined text-sm">military_tech</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1 truncate" title={broadsheet.genderStats.topBoyName || 'N/A'}>
                    {broadsheet.genderStats.topBoyName || 'N/A'}
                  </p>
                  <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                    {broadsheet.genderStats.topBoyScore ? `${broadsheet.genderStats.topBoyScore}% Avg` : '--'}
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span className="font-bold">Top Girl Performer</span>
                    <span className="material-symbols-outlined text-sm">military_tech</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1 truncate" title={broadsheet.genderStats.topGirlName || 'N/A'}>
                    {broadsheet.genderStats.topGirlName || 'N/A'}
                  </p>
                  <p className="text-[11px] text-emerald-300 font-mono mt-0.5">
                    {broadsheet.genderStats.topGirlScore ? `${broadsheet.genderStats.topGirlScore}% Avg` : '--'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs Bar - Hidden in Print */}
      <div className="print:hidden flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
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
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {broadsheet?.rows.length || 0}
          </span>
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
          Class & Stream Ranking
          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {effectiveClassRankings.length}
          </span>
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
          <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {effectiveBestClassesPerSubject.length}
          </span>
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
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {effectiveBestStudentsPerSubject.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 sm:ml-auto ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_agenda</span>
          All Tables (Executive Report)
        </button>
      </div>

      {/* Printable Letterhead Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 print:border-none print:shadow-none print:p-0">
        <div className="text-center border-b pb-4 mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider">
            SMARTSHULE ACADEMY
          </h2>
          <p className="text-xs text-slate-500 font-medium">Ministry of Education CBC Assessment Framework</p>
          <div className="mt-2 inline-flex items-center gap-3 text-xs font-bold text-indigo-900 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-200">
            <span>Class: {broadsheet?.className || 'Grade Level'}</span>
            <span>•</span>
            <span>Stream: {broadsheet?.streamName || 'Selected Stream'}</span>
            <span>•</span>
            <span>Term: {selectedTerm}</span>
            <span>•</span>
            <span>Year: {selectedYear}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-4xl mb-3 text-indigo-600">
              progress_activity
            </span>
            <p className="font-semibold">Aggregating stream marks from database records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500">
            <span className="material-symbols-outlined text-4xl mb-2">error</span>
            <p className="font-semibold">{error}</p>
          </div>
        ) : !broadsheet || !broadsheet.rows.length ? (
          <div className="p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">table_rows</span>
            <p className="text-slate-600 font-medium">No marksheet records available in database for this stream.</p>
            <p className="text-xs text-slate-400 mt-1">
              Ensure student assessments have been entered in the CBC Formative & Summative module.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ========================================================================= */}
            {/* TABLE 1: CLASS & STREAM RANKING */}
            {/* ========================================================================= */}
            {(activeTab === 'classRanking' || activeTab === 'all') && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-gradient-to-r from-amber-50/80 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-xl">military_tech</span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Class & Stream Performance Ranking
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparative academic ranking of streams and classes for {broadsheet.className} ({selectedTerm} {selectedYear})
                    </p>
                  </div>
                  {effectiveClassRankings.length > 0 && (
                    <button
                      onClick={handleExportClassRankingCSV}
                      className="print:hidden bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                      title="Download Class Ranking Table as CSV"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      Download Class Ranking CSV
                    </button>
                  )}
                </div>

                {effectiveClassRankings.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No comparative class rankings available for this grade in the database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <th className="p-2.5 border text-center w-16">Rank</th>
                          <th className="p-2.5 border min-w-[160px]">Class & Stream Name</th>
                          <th className="p-2.5 border text-center w-24">Learners</th>
                          <th className="p-2.5 border text-center w-24">Mean Score</th>
                          <th className="p-2.5 border text-center w-20">Level</th>
                          <th className="p-2.5 border text-center min-w-[140px]">Quality Pass Rate (EE+ME)</th>
                          <th className="p-2.5 border text-center min-w-[130px]">CBC Breakdown (EE/ME/AE/BE)</th>
                          <th className="p-2.5 border min-w-[180px]">Top Performer in Stream</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {effectiveClassRankings.map((cr) => {
                          const isCurrentStream =
                            cr.streamId === broadsheet.streamId || cr.streamName === broadsheet.streamName;
                          return (
                            <tr
                              key={cr.streamId || cr.streamName}
                              className={`hover:bg-amber-50/40 transition-colors ${
                                isCurrentStream ? 'bg-amber-50/20 font-semibold' : ''
                              }`}
                            >
                              <td className="p-2.5 border text-center font-bold font-mono text-sm">
                                {cr.rank === 1 ? '🥇 1' : cr.rank === 2 ? '🥈 2' : cr.rank === 3 ? '🥉 3' : `#${cr.rank}`}
                              </td>
                              <td className="p-2.5 border">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{cr.className}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-indigo-900 font-semibold">{cr.streamName}</span>
                                  {isCurrentStream && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 border text-center font-mono font-medium text-slate-700">
                                {cr.totalStudents}
                              </td>
                              <td className="p-2.5 border text-center font-mono font-extrabold text-sm">
                                <span className={getScoreColor(cr.meanScore)}>{cr.meanScore}%</span>
                              </td>
                              <td className="p-2.5 border text-center">{getLevelBadge(cr.overallPerformanceLevel)}</td>
                              <td className="p-2.5 border">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-2 rounded-full"
                                      style={{ width: `${Math.min(100, cr.qualityPassRate || 0)}%` }}
                                    />
                                  </div>
                                  <span className="font-mono font-bold text-emerald-800 text-xs">
                                    {cr.qualityPassRate || 0}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 border text-center font-mono text-[11px]">
                                <span className="text-emerald-700 font-bold">{cr.counts?.EE || 0}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="text-blue-700 font-bold">{cr.counts?.ME || 0}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="text-amber-700 font-bold">{cr.counts?.AE || 0}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="text-rose-700 font-bold">{cr.counts?.BE || 0}</span>
                              </td>
                              <td className="p-2.5 border">
                                <div className="font-medium text-slate-900">{cr.topStudentName || 'N/A'}</div>
                                {cr.topStudentScore ? (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Avg: <span className="font-bold text-indigo-700">{cr.topStudentScore}%</span> ({cr.topStudentAdmissionNumber || ''})
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-700">
                          <td colSpan={2} className="p-2.5 border text-right uppercase tracking-wider text-[11px]">
                            Streams Evaluated: {effectiveClassRankings.length}
                          </td>
                          <td className="p-2.5 border text-center font-mono font-extrabold text-indigo-900">
                            {effectiveClassRankings.reduce((sum, c) => sum + c.totalStudents, 0)} Total
                          </td>
                          <td className="p-2.5 border text-center font-mono font-black text-indigo-900">
                            {effectiveClassRankings.length > 0
                              ? Math.round(
                                  effectiveClassRankings.reduce((sum, c) => sum + c.meanScore, 0) /
                                    effectiveClassRankings.length
                                )
                              : 0}
                            % Avg
                          </td>
                          <td colSpan={4} className="p-2.5 border text-slate-500 text-[11px] font-normal italic">
                            Calculated directly from local database assessments.
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 2: BEST PERFORMING CLASS PER SUBJECT */}
            {/* ========================================================================= */}
            {(activeTab === 'bestClassPerSubject' || activeTab === 'all') && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600 text-xl">award_star</span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Best Performing Class Per Subject
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Leading class / stream benchmarks for each CBC learning area in {broadsheet.className}
                    </p>
                  </div>
                  {effectiveBestClassesPerSubject.length > 0 && (
                    <button
                      onClick={handleExportBestClassPerSubjectCSV}
                      className="print:hidden bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                      title="Download Best Class Per Subject Table as CSV"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      Download Best Class CSV
                    </button>
                  )}
                </div>

                {effectiveBestClassesPerSubject.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No subject class benchmarks found in the database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <th className="p-2.5 border text-center w-12">#</th>
                          <th className="p-2.5 border min-w-[180px]">Subject / Learning Area</th>
                          <th className="p-2.5 border min-w-[180px]">Leading Class & Stream</th>
                          <th className="p-2.5 border text-center w-28">Subject Mean Score</th>
                          <th className="p-2.5 border text-center w-20">Level</th>
                          <th className="p-2.5 border text-center w-24">Candidates</th>
                          <th className="p-2.5 border min-w-[160px]">Runner-Up Stream</th>
                          <th className="p-2.5 border text-center w-24">Lead Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {effectiveBestClassesPerSubject.map((sub, idx) => {
                          const margin = sub.runnerUpMeanScore
                            ? (sub.meanScore - sub.runnerUpMeanScore).toFixed(1)
                            : null;
                          return (
                            <tr key={sub.learningAreaId} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="p-2.5 border text-center font-mono font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-2.5 border">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {sub.learningAreaName}
                                </span>
                              </td>
                              <td className="p-2.5 border">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-amber-500 text-base">emoji_events</span>
                                  <span className="font-bold text-indigo-950">
                                    {sub.bestClassName} - {sub.bestStreamName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 border text-center font-mono font-black text-sm">
                                <span className={getScoreColor(sub.meanScore)}>{sub.meanScore}%</span>
                              </td>
                              <td className="p-2.5 border text-center">{getLevelBadge(sub.performanceLevel)}</td>
                              <td className="p-2.5 border text-center font-mono font-medium text-slate-600">
                                {sub.totalStudents}
                              </td>
                              <td className="p-2.5 border">
                                {sub.runnerUpStreamName ? (
                                  <div className="text-slate-700">
                                    <span className="font-medium">{sub.runnerUpStreamName}</span>{' '}
                                    <span className="font-mono text-slate-500">({sub.runnerUpMeanScore}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None</span>
                                )}
                              </td>
                              <td className="p-2.5 border text-center font-mono font-bold">
                                {margin ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    +{margin}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">--</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-700">
                          <td colSpan={3} className="p-2.5 border text-right uppercase tracking-wider text-[11px]">
                            Learning Areas Evaluated: {effectiveBestClassesPerSubject.length}
                          </td>
                          <td className="p-2.5 border text-center font-mono font-black text-indigo-900">
                            {effectiveBestClassesPerSubject.length > 0
                              ? Math.round(
                                  effectiveBestClassesPerSubject.reduce((sum, b) => sum + b.meanScore, 0) /
                                    effectiveBestClassesPerSubject.length
                                )
                              : 0}
                            % Overall Mean
                          </td>
                          <td colSpan={4} className="p-2.5 border text-slate-500 text-[11px] font-normal italic">
                            Evaluated strictly from student assessment database records.
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 3: BEST STUDENT PER SUBJECT */}
            {/* ========================================================================= */}
            {(activeTab === 'bestStudentPerSubject' || activeTab === 'all') && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-xl">stars</span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Best Student Per Subject (Subject Champions)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Top ranking learner across each learning area for {broadsheet.className}
                    </p>
                  </div>
                  {effectiveBestStudentsPerSubject.length > 0 && (
                    <button
                      onClick={handleExportBestStudentPerSubjectCSV}
                      className="print:hidden bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                      title="Download Best Student Per Subject Table as CSV"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      Download Best Student CSV
                    </button>
                  )}
                </div>

                {effectiveBestStudentsPerSubject.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No subject champions found in the database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <th className="p-2.5 border text-center w-12">#</th>
                          <th className="p-2.5 border min-w-[180px]">Subject / Learning Area</th>
                          <th className="p-2.5 border min-w-[200px]">Top Learner Full Name</th>
                          <th className="p-2.5 border text-center w-28">Admission No</th>
                          <th className="p-2.5 border min-w-[140px]">Class & Stream</th>
                          <th className="p-2.5 border text-center w-16">Sex</th>
                          <th className="p-2.5 border text-center w-28">Highest Score</th>
                          <th className="p-2.5 border text-center w-20">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {effectiveBestStudentsPerSubject.map((champ, idx) => (
                          <tr key={champ.learningAreaId} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="p-2.5 border text-center font-mono font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border font-extrabold text-slate-900 text-sm">
                              {champ.learningAreaName}
                            </td>
                            <td className="p-2.5 border">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-500 font-bold">⭐</span>
                                <span className="font-extrabold text-slate-950 text-sm">
                                  {champ.studentName}
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 border text-center font-mono font-bold text-slate-700">
                              {champ.admissionNumber}
                            </td>
                            <td className="p-2.5 border font-medium text-slate-700">
                              {champ.className} - {champ.streamName}
                            </td>
                            <td className="p-2.5 border text-center font-bold text-slate-600">
                              {champ.gender?.[0] || 'M'}
                            </td>
                            <td className="p-2.5 border text-center font-mono font-black text-sm">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {champ.score}%
                              </span>
                            </td>
                            <td className="p-2.5 border text-center">{getLevelBadge(champ.performanceLevel)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-700">
                          <td colSpan={2} className="p-2.5 border text-right uppercase tracking-wider text-[11px]">
                            Subject Champions Recognized: {effectiveBestStudentsPerSubject.length}
                          </td>
                          <td colSpan={4} className="p-2.5 border text-slate-600 text-xs font-semibold">
                            Average Champion Score across Subjects:
                          </td>
                          <td className="p-2.5 border text-center font-mono font-black text-emerald-800 text-sm">
                            {effectiveBestStudentsPerSubject.length > 0
                              ? Math.round(
                                  effectiveBestStudentsPerSubject.reduce((sum, s) => sum + s.score, 0) /
                                    effectiveBestStudentsPerSubject.length
                                )
                              : 0}
                            %
                          </td>
                          <td className="p-2.5 border text-center">
                            <span className="text-[10px] font-bold text-emerald-700">EE Highest</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 4: COMPLETE STREAM LEARNER MARKSHEET */}
            {/* ========================================================================= */}
            {(activeTab === 'marksheet' || activeTab === 'all') && (
              <div className="space-y-6">
                {/* TABLE 4 CONTROLS & STREAM QUICK-SELECT BAR */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-700 text-xl">table_rows</span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Stream Learner Marksheet & Side-by-Side Broadsheet
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Individual raw scores, CBC levels, rubric points, stream rank, overall grade rank, and qualitative progress remarks for {broadsheet.className} - {broadsheet.streamName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search student or adm..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#500b1b] w-48"
                        />
                        <span className="material-symbols-outlined absolute left-2 top-2 text-slate-400 text-sm">
                          search
                        </span>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="bg-[#500b1b] hover:bg-[#7a1228] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        title="Download Stream Marksheet as CSV"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        Download Marksheet CSV
                      </button>
                    </div>
                  </div>

                  {/* Stream Quick Navigation & Layout Switcher Bar */}
                  <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-[#500b1b]">tune</span>
                        Streams:
                      </span>
                      <button
                        onClick={() => setSelectedStreamId('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          selectedStreamId === 'all'
                            ? 'bg-[#500b1b] text-white shadow-sm'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>⭐ All Streams</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedStreamId === 'all' ? 'bg-white/20 text-white' : 'bg-black/10'}`}>
                          {broadsheet.totalStudents}
                        </span>
                      </button>
                      {streams.map((s) => {
                        const count = streamCounts[s.id] || streamCounts[`Stream ${s.name}`] || streamCounts[s.name] || 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStreamId(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              selectedStreamId === s.id
                                ? 'bg-[#500b1b] text-white shadow-sm'
                                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <span>🏫 Stream {s.name}</span>
                            {count > 0 && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedStreamId === s.id ? 'bg-white/20 text-white' : 'bg-black/10'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* View Mode Toggle when viewing All Streams */}
                    {selectedStreamId === 'all' && groupedStreamSections.length > 1 && (
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                          onClick={() => setStreamBreakoutMode('sectioned')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            streamBreakoutMode === 'sectioned'
                              ? 'bg-[#500b1b] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Break learners apart into separate stream tables with stream subtotals"
                        >
                          <span className="material-symbols-outlined text-sm">view_agenda</span>
                          Break Apart by Stream
                        </button>
                        <button
                          onClick={() => setStreamBreakoutMode('consolidated')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            streamBreakoutMode === 'consolidated'
                              ? 'bg-[#500b1b] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Consolidated continuous table of all candidates ranked #1 to #30"
                        >
                          <span className="material-symbols-outlined text-sm">table_rows</span>
                          Consolidated Ranking
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* VIEW MODE 1: BROKEN APART BY STREAM (SECTIONED STREAM TABLES) */}
                {/* ========================================================================= */}
                {selectedStreamId === 'all' && streamBreakoutMode === 'sectioned' && groupedStreamSections.length > 0 ? (
                  <div className="space-y-8">
                    {groupedStreamSections.map((sec) => (
                      <div key={sec.streamId} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        {/* Stream Section Banner */}
                        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shadow-inner">
                              <span className="material-symbols-outlined text-amber-400 text-2xl">school</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-white tracking-wide">
                                  {sec.streamName}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20">
                                  {sec.rows.length} Candidates
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                                  {broadsheet.className}
                                </span>
                              </div>
                              <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                                Stream Academic Marksheet & Learning Area Performance • {selectedTerm} {selectedYear}
                              </p>
                            </div>
                          </div>

                          {/* Stream KPI Cards */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[75px]">
                              <div className="text-[10px] text-slate-300 uppercase font-semibold">Stream Mean</div>
                              <div className="text-sm font-black text-emerald-400">{sec.streamMeanScore}%</div>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[75px]">
                              <div className="text-[10px] text-slate-300 uppercase font-semibold">Stream GPA</div>
                              <div className="text-sm font-black text-indigo-300">{sec.streamMeanPoints} pts</div>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[80px]">
                              <div className="text-[10px] text-slate-300 uppercase font-semibold">Quality Pass</div>
                              <div className="text-sm font-black text-amber-300">{sec.qualityPassRate}%</div>
                            </div>
                            {sec.topStudent && (
                              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-left max-w-[170px] truncate">
                                <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center gap-1">
                                  <span>🥇 Top Learner</span>
                                </div>
                                <div className="text-xs font-black text-white truncate" title={sec.topStudent.studentName}>
                                  {sec.topStudent.studentName}
                                </div>
                                <div className="text-[10px] text-emerald-300 font-mono">
                                  {sec.topStudent.averageScore}% ({sec.topStudent.totalScore} pts)
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stream Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300">
                                <th className="p-2 border text-center w-12" title="Rank in student's specific stream">Stream Pos</th>
                                <th className="p-2 border text-center w-12 bg-indigo-50/70 text-indigo-950" title="Overall rank in entire grade across all streams">Grade Pos</th>
                                <th className="p-2 border w-24">Adm No</th>
                                <th className="p-2 border min-w-[150px]">Learner Full Name</th>
                                <th className="p-2 border text-center w-14">Stream</th>
                                <th className="p-2 border text-center w-10">Sex</th>

                                {/* Dynamic Subjects */}
                                {broadsheet.learningAreas.map((la) => (
                                  <th key={la.id} className="p-2 border text-center min-w-[105px]">
                                    <div className="font-bold text-[11px] truncate" title={la.name}>{la.name}</div>
                                    <div className="text-[9px] text-slate-500 font-medium">Score • Lvl • Pts • Pos</div>
                                  </th>
                                ))}

                                <th className="p-2 border text-center w-16 bg-slate-100">Total Marks</th>
                                <th className="p-2 border text-center w-16 bg-slate-100">Mean %</th>
                                <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">Total Pts</th>
                                <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">GPA</th>
                                <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">Level</th>
                                <th className="p-2 border min-w-[180px]">Teacher Remarks & Progress Evaluation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {sec.rows.map((row) => (
                                <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-2 border text-center font-bold font-mono">
                                    {(row.streamRank || row.rank) === 1
                                      ? '🥇 1'
                                      : (row.streamRank || row.rank) === 2
                                      ? '🥈 2'
                                      : (row.streamRank || row.rank) === 3
                                      ? '🥉 3'
                                      : `#${row.streamRank || row.rank}`}
                                  </td>
                                  <td className="p-2 border text-center font-bold font-mono text-indigo-950 bg-indigo-50/30">
                                    {row.classRank ? `#${row.classRank}` : `#${row.rank}`}
                                  </td>
                                  <td className="p-2 border font-mono text-[11px] text-slate-600">
                                    {row.admissionNumber}
                                  </td>
                                  <td className="p-2 border font-semibold text-slate-900">{row.studentName}</td>
                                  <td className="p-2 border text-center">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {row.streamName || sec.streamName}
                                    </span>
                                  </td>
                                  <td className="p-2 border text-center text-slate-600 font-bold">
                                    {row.gender?.[0] || 'M'}
                                  </td>

                                  {/* Subject Marks */}
                                  {broadsheet.learningAreas.map((la) => {
                                    const scoreObj = row.subjects[la.id];
                                    return (
                                      <td key={la.id} className="p-1.5 border text-center">
                                        {scoreObj && scoreObj.levelLabel !== '--' ? (
                                          <div className="flex flex-col items-center gap-0.5">
                                            <div className="flex items-center justify-center gap-1">
                                              <span className="font-mono font-bold text-slate-900 text-xs">
                                                {scoreObj.numericScore}%
                                              </span>
                                              {getLevelBadge(scoreObj.performanceLevel)}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono">
                                              <span className="text-indigo-700 font-semibold">{scoreObj.points || 0} pts</span>
                                              {scoreObj.subjectRank ? (
                                                <span className="text-slate-400">#{scoreObj.subjectRank}</span>
                                              ) : null}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 text-xs">--</span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  <td className="p-2 border text-center font-mono font-bold text-slate-900">
                                    {row.totalScore}
                                  </td>
                                  <td className="p-2 border text-center font-mono font-black text-indigo-700 text-sm">
                                    {row.averageScore}%
                                  </td>
                                  <td className="p-2 border text-center font-mono font-bold text-indigo-950 bg-indigo-50/20">
                                    {row.totalPoints || 0}
                                  </td>
                                  <td className="p-2 border text-center font-mono font-extrabold text-indigo-800 bg-indigo-50/20 text-xs">
                                    {row.meanPoints || 0}
                                  </td>
                                  <td className="p-2 border text-center bg-indigo-50/20">
                                    {getLevelBadge(row.overallPerformanceLevel)}
                                  </td>
                                  <td className="p-2 border text-[11px] text-slate-700 leading-tight">
                                    {row.remarks || 'Satisfactory academic progress.'}
                                  </td>
                                </tr>
                              ))}

                              {/* STREAM SUMMARY ROW 1: SUBJECT MEANS */}
                              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <td
                                  colSpan={6}
                                  className="p-2 border text-right uppercase tracking-wider text-[11px] text-slate-700"
                                >
                                  1. {sec.streamName} Subject Mean Score (%)
                                </td>
                                {broadsheet.learningAreas.map((la) => {
                                  const sumObj = sec.subjectSummaries.find(
                                    (s) => s.learningAreaId === la.id
                                  );
                                  return (
                                    <td
                                      key={la.id}
                                      className="p-2 border text-center font-mono font-black text-indigo-700 text-xs"
                                    >
                                      {sumObj?.averageScore ? `${sumObj.averageScore}%` : '--'}
                                    </td>
                                  );
                                })}
                                <td
                                  colSpan={6}
                                  className="p-2 border text-center font-mono font-black text-indigo-900 text-xs"
                                >
                                  {sec.streamMeanScore}% Stream Mean
                                </td>
                              </tr>

                              {/* STREAM SUMMARY ROW 2: SUBJECT MEAN POINTS (GPA) */}
                              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                <td
                                  colSpan={6}
                                  className="p-2 border text-right uppercase tracking-wider text-[11px] text-slate-600"
                                >
                                  2. {sec.streamName} Subject Mean Points (GPA)
                                </td>
                                {broadsheet.learningAreas.map((la) => {
                                  const sumObj = sec.subjectSummaries.find(
                                    (s) => s.learningAreaId === la.id
                                  );
                                  return (
                                    <td
                                      key={la.id}
                                      className="p-2 border text-center font-mono font-bold text-slate-700 text-xs"
                                    >
                                      {sumObj?.meanPoints ? `${sumObj.meanPoints} pts` : '--'}
                                    </td>
                                  );
                                })}
                                <td
                                  colSpan={6}
                                  className="p-2 border text-center font-mono font-bold text-slate-800 text-xs"
                                >
                                  {sec.streamMeanPoints ? `${sec.streamMeanPoints} Stream GPA` : '--'}
                                </td>
                              </tr>

                              {/* STREAM SUMMARY ROW 3: QUALITY PASS RATE */}
                              <tr className="bg-blue-50/30 text-[10px]">
                                <td
                                  colSpan={6}
                                  className="p-2 border text-right font-bold text-blue-900 uppercase tracking-wider"
                                >
                                  3. {sec.streamName} Quality Pass Rate (EE+ME %)
                                </td>
                                {broadsheet.learningAreas.map((la) => {
                                  const sumObj = sec.subjectSummaries.find(
                                    (s) => s.learningAreaId === la.id
                                  );
                                  return (
                                    <td
                                      key={la.id}
                                      className="p-1.5 border text-center font-mono font-extrabold text-blue-900 text-xs"
                                    >
                                      {sumObj?.passRate !== undefined ? `${sumObj.passRate}%` : '--'}
                                    </td>
                                  );
                                })}
                                <td colSpan={6} className="p-2 border text-center font-bold text-blue-900 font-mono text-xs">
                                  {sec.qualityPassRate}% Stream Pass Rate
                                </td>
                              </tr>

                              {/* STREAM SUMMARY ROW 4: STREAM DISTRIBUTION */}
                              <tr className="bg-slate-50 text-[10px] text-slate-600">
                                <td colSpan={6} className="p-2 border text-right font-medium">
                                  4. {sec.streamName} Breakdown (EE / ME / AE / BE)
                                </td>
                                {broadsheet.learningAreas.map((la) => {
                                  const sumObj = sec.subjectSummaries.find(
                                    (s) => s.learningAreaId === la.id
                                  );
                                  return (
                                    <td key={la.id} className="p-1.5 border text-center font-mono text-[10px]">
                                      {sumObj?.counts ? (
                                        <div>
                                          <span className="text-emerald-700 font-bold">{sumObj.counts.EE}</span>/
                                          <span className="text-blue-700 font-bold">{sumObj.counts.ME}</span>/
                                          <span className="text-amber-700 font-bold">{sumObj.counts.AE}</span>/
                                          <span className="text-rose-700 font-bold">{sumObj.counts.BE}</span>
                                        </div>
                                      ) : (
                                        '--'
                                      )}
                                    </td>
                                  );
                                })}
                                <td colSpan={6} className="p-2 border text-center font-mono font-bold text-slate-800">
                                  Total {sec.streamName}: {sec.rows.length} Candidates
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {/* GRADE COHORT MASTER CONSOLIDATED SUMMARY CARD */}
                    <div className="border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-700 text-2xl">grade</span>
                            <h4 className="text-lg font-black text-slate-900">
                              {broadsheet.className} Master Cohort Summary ({broadsheet.totalStudents} Learners across {groupedStreamSections.length} Streams)
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Consolidated grade-wide benchmarks aggregating all candidates across streams for {selectedTerm} {selectedYear}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="bg-indigo-950 text-white px-3.5 py-2 rounded-xl text-center shadow-xs">
                            <div className="text-[10px] text-indigo-200 uppercase font-semibold">Grade Overall Mean</div>
                            <div className="text-lg font-black text-emerald-400">{broadsheet.streamMeanScore}%</div>
                          </div>
                          <div className="bg-indigo-950 text-white px-3.5 py-2 rounded-xl text-center shadow-xs">
                            <div className="text-[10px] text-indigo-200 uppercase font-semibold">Grade GPA</div>
                            <div className="text-lg font-black text-indigo-300">{broadsheet.streamMeanPoints || 0} pts</div>
                          </div>
                          <div className="bg-indigo-950 text-white px-3.5 py-2 rounded-xl text-center shadow-xs">
                            <div className="text-[10px] text-indigo-200 uppercase font-semibold">Cohort Quality Pass</div>
                            <div className="text-lg font-black text-amber-300">
                              {broadsheet.rows.length > 0
                                ? Math.round(
                                    (broadsheet.rows.filter(
                                      (r) =>
                                        r.overallPerformanceLevel?.toUpperCase().includes('EXCEED') ||
                                        r.overallPerformanceLevel?.toUpperCase().includes('MEET') ||
                                        r.averageScore >= 65
                                    ).length /
                                      broadsheet.rows.length) *
                                      100
                                  )
                                : 0}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stream Comparison Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        {groupedStreamSections.map((sec, idx) => (
                          <div key={sec.streamId} className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="font-extrabold text-sm text-slate-900">{sec.streamName}</span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {sec.rows.length} Candidates • Quality Pass: <strong className="text-slate-800">{sec.qualityPassRate}%</strong>
                              </p>
                              {sec.topStudent && (
                                <p className="text-[10px] text-amber-800 truncate max-w-[170px]" title={sec.topStudent.studentName}>
                                  Top: <strong>{sec.topStudent.studentName}</strong> ({sec.topStudent.averageScore}%)
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black text-slate-900">{sec.streamMeanScore}%</div>
                              <div className="text-[10px] text-slate-500 font-mono">{sec.streamMeanPoints} GPA</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* VIEW MODE 2: CONSOLIDATED CONTINUOUS TABLE (OR SINGLE STREAM VIEW) */
                  /* ========================================================================= */
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300">
                            <th className="p-2 border text-center w-12" title="Rank in student's specific stream">Stream Pos</th>
                            <th className="p-2 border text-center w-12 bg-indigo-50/70 text-indigo-950" title="Overall rank in entire grade across all streams">Grade Pos</th>
                            <th className="p-2 border w-24">Adm No</th>
                            <th className="p-2 border min-w-[150px]">Learner Full Name</th>
                            <th className="p-2 border text-center w-14">Stream</th>
                            <th className="p-2 border text-center w-10">Sex</th>

                            {/* Dynamic Subjects */}
                            {broadsheet.learningAreas.map((la) => (
                              <th key={la.id} className="p-2 border text-center min-w-[105px]">
                                <div className="font-bold text-[11px] truncate" title={la.name}>{la.name}</div>
                                <div className="text-[9px] text-slate-500 font-medium">Score • Lvl • Pts • Pos</div>
                              </th>
                            ))}

                            <th className="p-2 border text-center w-16 bg-slate-100">Total Marks</th>
                            <th className="p-2 border text-center w-16 bg-slate-100">Mean %</th>
                            <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">Total Pts</th>
                            <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">GPA</th>
                            <th className="p-2 border text-center w-14 bg-indigo-50/60 text-indigo-950">Level</th>
                            <th className="p-2 border min-w-[180px]">Teacher Remarks & Progress Evaluation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredRows.map((row) => (
                            <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2 border text-center font-bold font-mono">
                                {(row.streamRank || row.rank) === 1
                                  ? '🥇 1'
                                  : (row.streamRank || row.rank) === 2
                                  ? '🥈 2'
                                  : (row.streamRank || row.rank) === 3
                                  ? '🥉 3'
                                  : `#${row.streamRank || row.rank}`}
                              </td>
                              <td className="p-2 border text-center font-bold font-mono text-indigo-950 bg-indigo-50/30">
                                {row.classRank ? `#${row.classRank}` : `#${row.rank}`}
                              </td>
                              <td className="p-2 border font-mono text-[11px] text-slate-600">
                                {row.admissionNumber}
                              </td>
                              <td className="p-2 border font-semibold text-slate-900">{row.studentName}</td>
                              <td className="p-2 border text-center">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {row.streamName || broadsheet.streamName}
                                </span>
                              </td>
                              <td className="p-2 border text-center text-slate-600 font-bold">
                                {row.gender?.[0] || 'M'}
                              </td>

                              {/* Subject Marks */}
                              {broadsheet.learningAreas.map((la) => {
                                const scoreObj = row.subjects[la.id];
                                return (
                                  <td key={la.id} className="p-1.5 border text-center">
                                    {scoreObj && scoreObj.levelLabel !== '--' ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex items-center justify-center gap-1">
                                          <span className="font-mono font-bold text-slate-900 text-xs">
                                            {scoreObj.numericScore}%
                                          </span>
                                          {getLevelBadge(scoreObj.performanceLevel)}
                                        </div>
                                        <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono">
                                          <span className="text-indigo-700 font-semibold">{scoreObj.points || 0} pts</span>
                                          {scoreObj.subjectRank ? (
                                            <span className="text-slate-400">#{scoreObj.subjectRank}</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-xs">--</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="p-2 border text-center font-mono font-bold text-slate-900">
                                {row.totalScore}
                              </td>
                              <td className="p-2 border text-center font-mono font-black text-indigo-700 text-sm">
                                {row.averageScore}%
                              </td>
                              <td className="p-2 border text-center font-mono font-bold text-indigo-950 bg-indigo-50/20">
                                {row.totalPoints || 0}
                              </td>
                              <td className="p-2 border text-center font-mono font-extrabold text-indigo-800 bg-indigo-50/20 text-xs">
                                {row.meanPoints || 0}
                              </td>
                              <td className="p-2 border text-center bg-indigo-50/20">
                                {getLevelBadge(row.overallPerformanceLevel)}
                              </td>
                              <td className="p-2 border text-[11px] text-slate-700 leading-tight">
                                {row.remarks || 'Satisfactory academic progress.'}
                              </td>
                            </tr>
                          ))}

                          {/* BOTTOM SUMMARY ROW 1: SUBJECT MEANS */}
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                            <td
                              colSpan={6}
                              className="p-2 border text-right uppercase tracking-wider text-[11px] text-slate-700"
                            >
                              1. Subject Mean Score (%)
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td
                                  key={la.id}
                                  className="p-2 border text-center font-mono font-black text-indigo-700 text-xs"
                                >
                                  {sumObj?.averageScore ? `${sumObj.averageScore}%` : '--'}
                                </td>
                              );
                            })}
                            <td
                              colSpan={6}
                              className="p-2 border text-center font-mono font-black text-indigo-900 text-xs"
                            >
                              {broadsheet.streamMeanScore}% Overall Mean
                            </td>
                          </tr>

                          {/* BOTTOM SUMMARY ROW 2: SUBJECT MEAN POINTS (GPA) */}
                          <tr className="bg-slate-50 font-bold border-t border-slate-200">
                            <td
                              colSpan={6}
                              className="p-2 border text-right uppercase tracking-wider text-[11px] text-slate-600"
                            >
                              2. Subject Mean Points (GPA)
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td
                                  key={la.id}
                                  className="p-2 border text-center font-mono font-bold text-slate-700 text-xs"
                                >
                                  {sumObj?.meanPoints ? `${sumObj.meanPoints} pts` : '--'}
                                </td>
                              );
                            })}
                            <td
                              colSpan={6}
                              className="p-2 border text-center font-mono font-bold text-slate-800 text-xs"
                            >
                              {broadsheet.streamMeanPoints ? `${broadsheet.streamMeanPoints} Mean GPA` : '--'}
                            </td>
                          </tr>

                          {/* BOTTOM SUMMARY ROW 3: HIGHEST SCORE */}
                          <tr className="bg-emerald-50/40 text-[10px]">
                            <td
                              colSpan={6}
                              className="p-2 border text-right font-bold text-emerald-900 uppercase tracking-wider"
                            >
                              3. Highest Mark in Subject
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td
                                  key={la.id}
                                  className="p-1.5 border text-center font-mono font-bold text-emerald-800"
                                  title={sumObj?.highestScorerName || ''}
                                >
                                  {sumObj?.highestScore ? (
                                    <div>
                                      <span className="text-xs">{sumObj.highestScore}%</span>
                                      {sumObj.highestScorerName && (
                                        <div className="text-[9px] text-emerald-700 truncate max-w-[95px] mx-auto font-sans font-normal">
                                          {sumObj.highestScorerName.split(' ')[0]}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    '--'
                                  )}
                                </td>
                              );
                            })}
                            <td colSpan={6} className="p-2 border text-center font-bold text-emerald-900 font-mono text-xs">
                              Top Subject Benchmarks
                            </td>
                          </tr>

                          {/* BOTTOM SUMMARY ROW 4: LOWEST SCORE */}
                          <tr className="bg-rose-50/30 text-[10px]">
                            <td
                              colSpan={6}
                              className="p-2 border text-right font-bold text-rose-900 uppercase tracking-wider"
                            >
                              4. Lowest Mark in Subject
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td
                                  key={la.id}
                                  className="p-1.5 border text-center font-mono font-bold text-rose-800"
                                >
                                  {sumObj?.lowestScore ? `${sumObj.lowestScore}%` : '--'}
                                </td>
                              );
                            })}
                            <td colSpan={6} className="p-2 border text-center font-bold text-rose-900 font-mono text-xs">
                              Intervention Targets
                            </td>
                          </tr>

                          {/* BOTTOM SUMMARY ROW 5: QUALITY PASS RATE (% EE + ME) */}
                          <tr className="bg-blue-50/30 text-[10px]">
                            <td
                              colSpan={6}
                              className="p-2 border text-right font-bold text-blue-900 uppercase tracking-wider"
                            >
                              5. Quality Pass Rate (EE+ME %)
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td
                                  key={la.id}
                                  className="p-1.5 border text-center font-mono font-extrabold text-blue-900 text-xs"
                                >
                                  {sumObj?.passRate !== undefined ? `${sumObj.passRate}%` : '--'}
                                </td>
                              );
                            })}
                            <td colSpan={6} className="p-2 border text-center font-bold text-blue-900 font-mono text-xs">
                              {broadsheet.rows.length > 0
                                ? Math.round(
                                    (broadsheet.rows.filter(
                                      (r) =>
                                        r.overallPerformanceLevel?.toUpperCase().includes('EXCEED') ||
                                        r.overallPerformanceLevel?.toUpperCase().includes('MEET') ||
                                        r.averageScore >= 65
                                    ).length /
                                      broadsheet.rows.length) *
                                      100
                                  )
                                : 0}
                              % Overall Pass Rate
                            </td>
                          </tr>

                          {/* BOTTOM SUMMARY ROW 6: CBC PERFORMANCE LEVEL COUNTS */}
                          <tr className="bg-slate-50 text-[10px] text-slate-600">
                            <td colSpan={6} className="p-2 border text-right font-medium">
                              6. CBC Breakdown (EE / ME / AE / BE)
                            </td>
                            {broadsheet.learningAreas.map((la) => {
                              const sumObj = broadsheet.subjectSummaries.find(
                                (s) => s.learningAreaId === la.id
                              );
                              return (
                                <td key={la.id} className="p-1.5 border text-center font-mono text-[10px]">
                                  {sumObj?.counts ? (
                                    <div>
                                      <span className="text-emerald-700 font-bold">{sumObj.counts.EE}</span>/
                                      <span className="text-blue-700 font-bold">{sumObj.counts.ME}</span>/
                                      <span className="text-amber-700 font-bold">{sumObj.counts.AE}</span>/
                                      <span className="text-rose-700 font-bold">{sumObj.counts.BE}</span>
                                    </div>
                                  ) : (
                                    '--'
                                  )}
                                </td>
                              );
                            })}
                            <td colSpan={6} className="p-2 border text-center font-mono font-bold text-slate-800">
                              Total Cohort Size: {broadsheet.totalStudents} Learners
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CBC Performance Grading Scale & Rubric Legend Card */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 print:bg-white print:border-slate-300">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-700">info</span>
                    Official Kenyan CBC Performance Level Rubric & Grading Scale
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
                      <div className="font-bold flex items-center justify-between">
                        <span>Exceeding Expectations (EE)</span>
                        <span className="font-mono text-emerald-700 font-black">4 Points</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Score: <strong>80% - 100%</strong>. Exceptional mastery, creativity, and self-directed competence.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950">
                      <div className="font-bold flex items-center justify-between">
                        <span>Meeting Expectations (ME)</span>
                        <span className="font-mono text-blue-700 font-black">3 Points</span>
                      </div>
                      <p className="text-[11px] text-blue-800 mt-1">
                        Score: <strong>65% - 79%</strong>. Proficient learner; consistently meets curriculum learning outcomes.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">
                      <div className="font-bold flex items-center justify-between">
                        <span>Approaching Expectations (AE)</span>
                        <span className="font-mono text-amber-700 font-black">2 Points</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Score: <strong>50% - 64%</strong>. Emerging competence; regular review and revision exercises recommended.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-950">
                      <div className="font-bold flex items-center justify-between">
                        <span>Below Expectations (BE)</span>
                        <span className="font-mono text-rose-700 font-black">1 Point</span>
                      </div>
                      <p className="text-[11px] text-rose-800 mt-1">
                        Score: <strong>0% - 49%</strong>. Critical academic intervention required; candidate for remedial clinic.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Official 3-Party Signatures & Certification Block */}
        <div className="pt-8 text-xs text-slate-700 border-t mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Class Teacher Endorsement:</p>
            <p className="text-slate-500 text-[11px]">Certified accurate reflection of classroom assessment records.</p>
            <div className="pt-8 border-b border-slate-400 w-48" />
            <p className="text-[11px] text-slate-600">Signature & Date</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Dean of Studies / Academic Coordinator:</p>
            <p className="text-slate-500 text-[11px]">Academic evaluation verified against KNEC syllabus standards.</p>
            <div className="pt-8 border-b border-slate-400 w-48" />
            <p className="text-[11px] text-slate-600">Signature & Date</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Head Teacher / Principal Approval:</p>
            <p className="text-slate-500 text-[11px]">Official School Stamp and Validation.</p>
            <div className="pt-8 border-b border-slate-400 w-48" />
            <p className="text-[11px] text-slate-600">Official Stamp & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
};
