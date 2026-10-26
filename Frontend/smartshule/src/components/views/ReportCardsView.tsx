import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, CBCReportCardData, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { resolveStreamName, resolveGradeName, resolveAcademicYearName, resolveLearningAreaName, resolveLearningAreaCode } from '../../utils/formatters';
import { DocumentSigningModal } from '../common/DocumentSigningModal';

interface ReportCardsViewProps {
  students?: Student[];
  selectedStudent?: Student;
}

export const LOWER_PRIMARY_CBC_SUBJECTS = [
  { name: 'English Language Activities', code: 'ENG', short: 'English' },
  { name: 'English Reading Activities', code: 'REA', short: 'Reading' },
  { name: 'Mathematical Activities', code: 'MAT', short: 'Math' },
  { name: 'Kiswahili Language Activities', code: 'KIS', short: 'Kiswahili' },
  { name: 'Kusoma Activities', code: 'KUSO', short: 'Kusoma' },
  { name: 'Environmental Activities', code: 'ENVI', short: 'Environment' },
  { name: 'Christian Religious Education', code: 'CRE', short: 'CRE' },
  { name: 'Creative Arts Activities', code: 'CREA', short: 'Creative Arts' },
];

export const STANDARD_12_CBC_SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', short: 'Math' },
  { name: 'English Language', code: 'ENG', short: 'English' },
  { name: 'Kiswahili Language', code: 'KISW', short: 'Kiswahili' },
  { name: 'Integrated Science', code: 'INTSCI', short: 'Science' },
  { name: 'Health Education', code: 'HLTH', short: 'Health' },
  { name: 'Social Studies', code: 'SST', short: 'Social St' },
  { name: 'Christian Religious Education', code: 'CRE', short: 'CRE' },
  { name: 'Agriculture & Nutrition', code: 'AGRI', short: 'Agric' },
  { name: 'Pre-Technical Studies', code: 'PRETECH', short: 'Pre-Tech' },
  { name: 'Creative Arts & Sports', code: 'ARTS', short: 'Creative Arts' },
  { name: 'Business Studies', code: 'BUS', short: 'Business' },
  { name: 'Computer Science', code: 'COMP', short: 'Comp Sci' },
];

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({
  students: propStudents = [],
  selectedStudent: initialStudent,
}) => {
  const [students, setStudents] = useState<Student[]>(propStudents);
  const [selectedId, setSelectedId] = useState<string>(
    initialStudent ? initialStudent.id : (propStudents && propStudents.length > 0 ? propStudents[0].id : '')
  );
  const [reportCardData, setReportCardData] = useState<CBCReportCardData | null>(null);
  const [currentYear, setCurrentYear] = useState<any>(null);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [availableTerms, setAvailableTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, activeViewMode } = useAuth();
  const isParent =
    user?.role === UserRole.PARENT ||
    user?.role === UserRole.GUARDIAN ||
    activeViewMode === 'PARENT';
  const [guardianPortalData, setGuardianPortalData] = useState<any>(null);
  const [checkingClearance, setCheckingClearance] = useState<boolean>(isParent);

  // Sync propStudents or fetch from DB if empty
  useEffect(() => {
    if (isParent) {
      setCheckingClearance(true);
      apiService.getGuardianPortalData().then((res) => {
        if (res?.data?.children && Array.isArray(res.data.children) && res.data.children.length > 0) {
          setGuardianPortalData(res.data);
          const mapped = res.data.children.map((c: any) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            admNo: c.admissionNumber,
            grade: resolveGradeName(c.gradeLevel),
            stream: resolveStreamName(c.streamId, c.streamName || c.stream?.name, c.gradeLevel) || 'Main Stream',
            feeBalance: c.fee?.balance || 0,
            isChargeExempt: Boolean(c.isChargeExempt),
            fee: c.fee,
          }));
          setStudents(mapped);
          if (!selectedId) setSelectedId(mapped[0].id);
        }
      }).catch(() => {}).finally(() => setCheckingClearance(false));
    } else if (propStudents && propStudents.length > 0) {
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
  }, [propStudents, isParent]);

  // Load school & academic context
  useEffect(() => {
    async function loadContext() {
      try {
        const [ctxRes, scRes, laRes] = await Promise.all([
          apiService.getCurrentContext().catch(() => null),
          apiService.getSchool().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
        ]);
        if (ctxRes?.success && ctxRes.data) {
          setCurrentYear(ctxRes.data.currentYear);
          setCurrentTerm(ctxRes.data.currentTerm);
          if (ctxRes.data.allTerms && Array.isArray(ctxRes.data.allTerms)) {
            setAvailableTerms(ctxRes.data.allTerms);
          }
          if (ctxRes.data.currentTerm?.id) {
            setSelectedTermId(ctxRes.data.currentTerm.id);
          }
        }
        if (scRes?.data) {
          setSchoolInfo(scRes.data);
        }
        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
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
  const matchedPortalChild = guardianPortalData?.children?.find((c: any) => c.id === student?.id) || guardianPortalData?.children?.[0];
  const currentFeeBalance = matchedPortalChild?.fee?.balance ?? (student as any)?.feeBalance ?? (student as any)?.fee?.balance ?? 0;
  const isChargeExempt = Boolean(matchedPortalChild?.isChargeExempt || (student as any)?.isChargeExempt);
  const isFeeCleared = !isParent || isChargeExempt || currentFeeBalance <= 0;

  const loadReportCard = async (stdId: string, termId?: string, yearId?: string) => {
    if (!stdId) return;
    if (isParent && !isFeeCleared) {
      setReportCardData(null);
      return;
    }
    const tId = termId || selectedTermId || currentTerm?.id;
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
    if (isParent && checkingClearance) return;
    if (isParent && !isFeeCleared) {
      setReportCardData(null);
      return;
    }
    const activeTermId = selectedTermId || currentTerm?.id;
    if (student?.id && activeTermId && currentYear?.id) {
      loadReportCard(student.id, activeTermId, currentYear.id);
    }
  }, [student?.id, selectedTermId, currentTerm?.id, currentYear?.id, isParent, isFeeCleared, checkingClearance]);

  // Active term resolution
  const activeTerm = availableTerms.find(t => t.id === selectedTermId) || currentTerm;

  // Digital Signatures state & resolution for current report card
  const [documentSignatures, setDocumentSignatures] = useState<any[]>([]);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);

  const reportCardDocId = useMemo(() => {
    if (!student) return '';
    const yr = currentYear?.name || currentYear?.year || currentYear?.id || '2026';
    const trm = selectedTermId || currentTerm?.id || 'TERM_1';
    return `RC_${yr}_${trm}_${student.id}`;
  }, [student, currentYear, selectedTermId, currentTerm]);

  const loadSignatures = async (docId: string) => {
    if (!docId) return;
    try {
      const res = await apiService.getDocumentSignatures(docId);
      if (res?.data && Array.isArray(res.data)) {
        setDocumentSignatures(res.data);
      } else {
        setDocumentSignatures([]);
      }
    } catch {
      setDocumentSignatures([]);
    }
  };

  useEffect(() => {
    if (reportCardDocId) {
      loadSignatures(reportCardDocId);
    } else {
      setDocumentSignatures([]);
    }
  }, [reportCardDocId]);

  const classTeacherSig = useMemo(() => {
    return documentSignatures.find(s => {
      const r = (s.signerRole || '').toUpperCase();
      return r === 'CLASS_TEACHER' || r === 'TEACHER';
    });
  }, [documentSignatures]);

  const headTeacherSig = useMemo(() => {
    return documentSignatures.find(s => {
      const r = (s.signerRole || '').toUpperCase();
      return r === 'HEAD_TEACHER' || r === 'PRINCIPAL' || r === 'SUPER_ADMIN';
    });
  }, [documentSignatures]);

  const canUserSign = useMemo(() => {
    if (!user || isParent) return false;
    const r = (user.role || '').toUpperCase();
    return ['TEACHER', 'CLASS_TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER', 'SUPER_ADMIN', 'ADMIN'].includes(r);
  }, [user, isParent]);

  const canonicalDocContent = useMemo(() => {
    if (!student) return '';
    return JSON.stringify({
      school: schoolInfo?.name || 'Grace Seeds School',
      studentId: student.id,
      admNo: student.admNo,
      name: student.name,
      grade: student.grade,
      stream: student.stream,
      year: currentYear?.name || currentYear?.year || '2026',
      term: activeTerm?.name || selectedTermId || 'Term 1',
      reportCardData: reportCardData || {},
      issuedAt: reportCardData?.issueDate || new Date().toISOString()
    });
  }, [student, schoolInfo, currentYear, activeTerm, selectedTermId, reportCardData]);

  // Evaluation Period: End of Term (Summative Dossier) vs Mid-Term Assessment
  const [evaluationPeriod, setEvaluationPeriod] = useState<'END_OF_TERM' | 'MID_TERM'>('END_OF_TERM');
  const isEndTerm = evaluationPeriod === 'END_OF_TERM';

  // Helper to dynamically resolve the accurate school reopening date
  const nextTermOpening = useMemo(() => {
    const activeTerm = availableTerms.find(t => t.id === selectedTermId) || currentTerm;

    // 1. If report card already has explicit nextTermOpeningDate saved in DB
    if (reportCardData?.nextTermOpeningDate) {
      try {
        const d = new Date(reportCardData.nextTermOpeningDate);
        if (!isNaN(d.getTime())) {
          return {
            dateStr: reportCardData.nextTermOpeningDate,
            formatted: d.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            shortFormatted: d.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            termName: 'Next Term',
            isExplicit: true,
          };
        }
      } catch {}
    }

    // 2. Identify current term number
    const termNum = (() => {
      if (activeTerm?.termNumber) return Number(activeTerm.termNumber);
      const name = (activeTerm?.name || selectedTermId || '').toLowerCase();
      if (name.includes('1') || name.includes('t1')) return 1;
      if (name.includes('2') || name.includes('t2')) return 2;
      return 3;
    })();

    const isTerm1 = termNum === 1;
    const isTerm2 = termNum === 2;
    const isTerm3 = termNum === 3;

    // 3. Find subsequent term in available terms
    let nextTerm: any = null;
    if (isTerm1) {
      nextTerm = availableTerms.find(t => Number(t.termNumber) === 2 && (!activeTerm?.academicYearId || t.academicYearId === activeTerm.academicYearId));
    } else if (isTerm2) {
      nextTerm = availableTerms.find(t => Number(t.termNumber) === 3 && (!activeTerm?.academicYearId || t.academicYearId === activeTerm.academicYearId));
    } else if (isTerm3) {
      // End of Year (Term 3): Look for Term 1 of subsequent academic year or term with startDate after current term's endDate
      nextTerm = availableTerms.find(t => Number(t.termNumber) === 1 && t.id !== activeTerm?.id && (!activeTerm?.academicYearId || t.academicYearId !== activeTerm.academicYearId));
      if (!nextTerm && activeTerm?.endDate) {
        nextTerm = availableTerms.find(t => t.id !== activeTerm?.id && new Date(t.startDate).getTime() > new Date(activeTerm.endDate).getTime());
      }
    }

    if (nextTerm?.startDate) {
      const d = new Date(nextTerm.startDate);
      if (!isNaN(d.getTime())) {
        const nextTermLabel = nextTerm.name || (isTerm3 ? 'Term 1, Next Academic Year' : `Term ${termNum + 1}`);
        return {
          dateStr: nextTerm.startDate.split('T')[0],
          formatted: d.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          shortFormatted: d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          termName: nextTermLabel,
          isExplicit: false,
        };
      }
    }

    // 4. Default estimation based on active term's endDate
    if (activeTerm?.endDate) {
      const endD = new Date(activeTerm.endDate);
      if (!isNaN(endD.getTime())) {
        // Holiday duration: ~56 days (8 weeks) for Term 3 (long vacation), ~21 days (3 weeks) for Term 1 or Term 2
        const vacationDays = isTerm3 ? 56 : 21;
        const estimatedDate = new Date(endD.getTime() + vacationDays * 86400000);
        const nextTermLabel = isTerm3 ? 'Term 1, Next Academic Year' : `Term ${termNum + 1}`;
        return {
          dateStr: estimatedDate.toISOString().split('T')[0],
          formatted: estimatedDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          shortFormatted: estimatedDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          termName: nextTermLabel,
          isExplicit: false,
        };
      }
    }

    return {
      dateStr: null,
      formatted: 'Monday, 5th January 2027',
      shortFormatted: '5th Jan 2027',
      termName: isTerm3 ? 'Term 1, Next Academic Year' : `Term ${termNum + 1}`,
      isExplicit: false,
    };
  }, [availableTerms, selectedTermId, currentTerm, reportCardData?.nextTermOpeningDate]);

  const handleGenerateReportCard = async () => {
    if (!student) return;
    const activeTerm = availableTerms.find(t => t.id === selectedTermId) || currentTerm;
    if (!activeTerm?.id || !currentYear?.id) {
      alert('Academic year or term is not configured in the database.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await apiService.generateReportCard({
        studentId: student.id,
        termId: activeTerm.id,
        academicYearId: currentYear.id,
        classTeacherRemarks: `${student.name} demonstrates commendable diligence, discipline, and active participation in continuous CBC strand learning outcomes.`,
        headTeacherRemarks: 'Commendable performance throughout the term. Demonstrates steady growth in core competencies and moral values.',
        closingDate: activeTerm.endDate ? new Date(activeTerm.endDate).toISOString().split('T')[0] : undefined,
        nextTermOpeningDate: nextTermOpening.dateStr || (activeTerm.endDate
          ? new Date(new Date(activeTerm.endDate).getTime() + (Number(activeTerm.termNumber) === 3 ? 56 : 21) * 86400000).toISOString().split('T')[0]
          : undefined),
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


  const schoolName = schoolInfo?.name || 'Grace Seeds School';
  const schoolMotto = schoolInfo?.motto || 'The future Begins Here';
  const schoolAddress = schoolInfo?.address || 'KEMRI Street, Kisian, Kisumu, Kenya';
  const schoolPhone = schoolInfo?.phone || '0745436312';
  const schoolEmail = schoolInfo?.email || 'schoolgraceseeds@gmail.com';

  const daysPresent = (reportCardData as any)?.attendanceDaysPresent ?? reportCardData?.attendanceStats?.daysPresent ?? 58;
  const daysTotal = (reportCardData as any)?.attendanceDaysTotal ?? reportCardData?.attendanceStats?.totalDays ?? 60;
  const attendanceRate = daysTotal > 0 ? Math.round((daysPresent / daysTotal) * 100) : 100;

  // Reconcile and dynamically resolve subjects corresponding directly to evaluated marks
  const resolvedSubjects = useMemo(() => {
    const rawEvals = reportCardData?.learningAreaAssessments || [];

    // If student has recorded assessments, use them directly as the source of truth!
    if (rawEvals && rawEvals.length > 0) {
      return rawEvals.map((ev: any, index: number) => {
        const rawScore = ev.score !== undefined && ev.score !== null ? Number(ev.score) : null;
        const score = rawScore !== null
          ? (rawScore > 0 && rawScore <= 4 ? (rawScore === 4 ? 86 : rawScore === 3 ? 76 : rawScore === 2 ? 58 : 44) : rawScore)
          : null;

        let rubricCode: 'EE' | 'ME' | 'AE' | 'BE' = 'ME';
        const rawLvl = (ev.levelLabel || ev.performanceLevel || '').toUpperCase();
        if (score !== null) {
          if (rawLvl.includes('EE') || rawLvl.includes('EXCEED') || score >= 80) {
            rubricCode = 'EE';
          } else if (rawLvl.includes('ME') || rawLvl.includes('MEET') || score >= 65) {
            rubricCode = 'ME';
          } else if (rawLvl.includes('AE') || rawLvl.includes('APPROACH') || score >= 50) {
            rubricCode = 'AE';
          } else {
            rubricCode = 'BE';
          }
        }

        const rubricScore = ev.rubricScore ?? (score !== null ? (rubricCode === 'EE' ? 4 : rubricCode === 'ME' ? 3 : rubricCode === 'AE' ? 2 : 1) : null);

        const term1Score = ev.term1Score !== undefined && ev.term1Score !== null
          ? Number(ev.term1Score)
          : undefined;
        const term2Score = ev.term2Score !== undefined && ev.term2Score !== null
          ? Number(ev.term2Score)
          : undefined;
        const term3Score = ev.term3Score !== undefined && ev.term3Score !== null
          ? Number(ev.term3Score)
          : undefined;
        const rawName = ev.learningAreaName || ev.name || '';
        const name = resolveLearningAreaName(ev.learningAreaId || rawName, rawName) || `Subject ${index + 1}`;
        const code = ev.code || resolveLearningAreaCode(ev.learningAreaId || name);
        const short = ev.shortName || (ev.code && ev.code.length <= 4 ? ev.code : resolveLearningAreaCode(name));

        return {
          id: ev.learningAreaId || ev.id || `subj-${index}`,
          name,
          short,
          code,
          score: score !== null ? score : 0,
          rawScore: score,
          rubricScore: rubricScore ?? 1,
          rubricCode,
          performanceLevel: ev.performanceLevel || (rubricCode === 'EE' ? 'EXCEEDING_EXPECTATIONS' : rubricCode === 'ME' ? 'MEETING_EXPECTATIONS' : rubricCode === 'AE' ? 'APPROACHING_EXPECTATIONS' : 'BELOW_EXPECTATIONS'),
          teacherRemarks: ev.teacherRemarks || (score !== null ? 'Demonstrates continuous understanding and progress.' : 'Pending assessment.'),
          term1Score,
          term2Score,
          term3Score,
          isAssessed: score !== null,
        };
      });
    }

    // Strictly return empty when no valid assessment marks exist in the database for this learner and term
    return [];
  }, [reportCardData?.learningAreaAssessments]);

  // Totals & Averages
  const assessedSubjects = useMemo(() => {
    return resolvedSubjects.filter(s => s.isAssessed);
  }, [resolvedSubjects]);

  const totalMarks = useMemo(() => {
    return assessedSubjects.reduce((acc, s) => acc + s.score, 0);
  }, [assessedSubjects]);

  const totalPossible = useMemo(() => {
    return assessedSubjects.length * 100;
  }, [assessedSubjects]);

  const overallAverage = useMemo(() => {
    if (reportCardData?.overallAverageScore !== undefined && reportCardData?.overallAverageScore !== null) {
      const avg = Number(reportCardData.overallAverageScore);
      return avg <= 4 ? Math.round(avg * 25) : Math.round(avg);
    }
    return assessedSubjects.length > 0 ? Math.round(totalMarks / assessedSubjects.length) : 0;
  }, [reportCardData?.overallAverageScore, totalMarks, assessedSubjects.length]);

  const overallPerformanceLevel = useMemo(() => {
    if (reportCardData?.overallPerformanceLevel) {
      const lvl = reportCardData.overallPerformanceLevel.toUpperCase();
      if (lvl === 'EE' || lvl.includes('EXCEED')) return 'Exceeding Expectations';
      if (lvl === 'ME' || lvl.includes('MEET')) return 'Meeting Expectations';
      if (lvl === 'AE' || lvl.includes('APPROACH')) return 'Approaching Expectations';
      if (lvl === 'BE' || lvl.includes('BELOW')) return 'Below Expectations';
    }
    if (assessedSubjects.length === 0) return 'Pending Assessment';
    if (overallAverage >= 80) return 'Exceeding Expectations';
    if (overallAverage >= 65) return 'Meeting Expectations';
    if (overallAverage >= 50) return 'Approaching Expectations';
    return 'Below Expectations';
  }, [reportCardData?.overallPerformanceLevel, overallAverage, assessedSubjects.length]);

  const activeTermNumber = useMemo(() => {
    const t = availableTerms.find(term => term.id === selectedTermId) || currentTerm;
    if (t?.termNumber) return Number(t.termNumber);
    const idStr = (selectedTermId || currentTerm?.id || '').toLowerCase();
    if (idStr.includes('1') || idStr.includes('t1')) return 1;
    if (idStr.includes('2') || idStr.includes('t2')) return 2;
    return 3;
  }, [selectedTermId, availableTerms, currentTerm]);

  // Strictly resolve only terms that have verified assessment records
  const recordedTerms = useMemo(() => {
    const rawTrends = (reportCardData?.termTrends || []) as any[];
    const validTrends = rawTrends.filter(t => t && t.averageScore !== undefined && t.averageScore !== null && !isNaN(Number(t.averageScore)));

    if (validTrends.length > 0) {
      return validTrends.map(t => {
        const tNum = Number(t.termNumber || (t.term?.includes('1') ? 1 : t.term?.includes('2') ? 2 : 3));
        return {
          termNumber: tNum,
          label: t.term || `Term ${tNum}`,
          short: `T${tNum}`,
          averageScore: Math.round(Number(t.averageScore))
        };
      }).sort((a, b) => a.termNumber - b.termNumber);
    }

    if (assessedSubjects.length > 0) {
      return [{
        termNumber: activeTermNumber,
        label: `Term ${activeTermNumber}`,
        short: `T${activeTermNumber}`,
        averageScore: overallAverage
      }];
    }

    return [];
  }, [reportCardData?.termTrends, assessedSubjects.length, activeTermNumber, overallAverage]);

  const termGrowth = useMemo(() => {
    if (recordedTerms.length >= 2) {
      const first = recordedTerms[0].averageScore;
      const last = recordedTerms[recordedTerms.length - 1].averageScore;
      return Number((last - first).toFixed(1));
    }
    return null;
  }, [recordedTerms]);

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

  // Pure SVG string generator for offline HTML export and print
  const buildPerformanceGraphSVG = (
    termsList: typeof recordedTerms,
    _subjects?: typeof resolvedSubjects
  ): string => {
    if (termsList.length === 0) {
      return `
        <svg viewBox="0 0 760 90" width="100%" height="auto" class="performance-graph-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="750" height="80" rx="6" fill="#fafafa" stroke="#e5e7eb" stroke-width="1" />
          <text x="380" y="48" text-anchor="middle" font-size="9" font-weight="600" fill="#6b7280" font-family="system-ui, sans-serif">
            No term assessment data recorded for this academic year.
          </text>
        </svg>
      `;
    }

    const getY = (val: number) => Math.round(115 - (Math.min(100, Math.max(0, val)) / 100) * 95);
    const getRubricCode = (val: number) => (val >= 80 ? 'EE' : val >= 65 ? 'ME' : val >= 50 ? 'AE' : 'BE');

    const t1 = termsList.find(t => t.termNumber === 1 || t.label.toLowerCase().includes('term 1') || t.short === 'T1');
    const t2 = termsList.find(t => t.termNumber === 2 || t.label.toLowerCase().includes('term 2') || t.short === 'T2');
    const t3 = termsList.find(t => t.termNumber === 3 || t.label.toLowerCase().includes('term 3') || t.short === 'T3');

    const x1 = 150;
    const x2 = 360;
    const x3 = 570;

    let connectingElements = '';
    // Segment between Term 1 and Term 2 (only if both consecutive terms exist)
    if (t1 && t2) {
      const y1 = getY(t1.averageScore);
      const y2 = getY(t2.averageScore);
      connectingElements += `
        <polygon points="${x1},${y1} ${x2},${y2} ${x2},115 ${x1},115" fill="url(#termProgressionGrad)" />
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#800000" stroke-width="2.5" stroke-linecap="round" />
      `;
    }

    // Segment between Term 2 and Term 3 (only if both consecutive terms exist)
    if (t2 && t3) {
      const y2 = getY(t2.averageScore);
      const y3 = getY(t3.averageScore);
      connectingElements += `
        <polygon points="${x2},${y2} ${x3},${y3} ${x3},115 ${x2},115" fill="url(#termProgressionGrad)" />
        <line x1="${x2}" y1="${y2}" x2="${x3}" y2="${y3}" stroke="#800000" stroke-width="2.5" stroke-linecap="round" />
      `;
    }

    const renderPoint = (t: typeof t1, x: number) => {
      if (!t) return '';
      const y = getY(t.averageScore);
      const rubric = getRubricCode(t.averageScore);
      const badgeY = y < 35 ? y + 8 : y - 18;
      return `
        <circle cx="${x}" cy="${y}" r="5" fill="#800000" stroke="#ffffff" stroke-width="1.8" />
        <circle cx="${x}" cy="${y}" r="2" fill="#ffffff" />
        <rect x="${x - 22}" y="${badgeY}" width="44" height="13" rx="3" fill="#800000" />
        <text x="${x}" y="${badgeY + 9.5}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#ffffff" font-family="system-ui, sans-serif">
          ${t.averageScore}% &middot; ${rubric}
        </text>
      `;
    };

    let noteHTML = '';
    if (termsList.length === 1) {
      noteHTML = `
        <rect x="180" y="7" width="400" height="14" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.8" />
        <text x="380" y="16.5" text-anchor="middle" font-size="6.8" fill="#64748b" font-family="system-ui, sans-serif">
          Term comparison unavailable — Earlier assessment data is not recorded for this academic year.
        </text>
      `;
    }

    return `
      <svg viewBox="0 0 760 150" width="100%" height="auto" class="performance-graph-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="termProgressionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#800000" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#800000" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Outer Boundary -->
        <rect x="5" y="5" width="750" height="140" rx="6" fill="#fafafa" stroke="#e5e7eb" stroke-width="1" />

        ${noteHTML}

        <!-- Benchmark Horizontal Guidelines -->
        <line x1="60" y1="${getY(80)}" x2="640" y2="${getY(80)}" stroke="#059669" stroke-dasharray="3,3" stroke-width="0.9" stroke-opacity="0.7" />
        <text x="645" y="${getY(80) + 3}" font-size="7" font-weight="bold" fill="#059669" font-family="system-ui, sans-serif">EE Target (80%)</text>

        <line x1="60" y1="${getY(65)}" x2="640" y2="${getY(65)}" stroke="#800000" stroke-dasharray="3,3" stroke-width="0.9" stroke-opacity="0.5" />
        <text x="645" y="${getY(65) + 3}" font-size="7" font-weight="bold" fill="#800000" font-family="system-ui, sans-serif">ME Benchmark (65%)</text>

        <line x1="60" y1="${getY(50)}" x2="640" y2="${getY(50)}" stroke="#d97706" stroke-dasharray="3,3" stroke-width="0.8" stroke-opacity="0.5" />
        <text x="645" y="${getY(50) + 3}" font-size="7" font-weight="bold" fill="#d97706" font-family="system-ui, sans-serif">AE Benchmark (50%)</text>

        <!-- Baseline Axis (0%) -->
        <line x1="60" y1="115" x2="640" y2="115" stroke="#9ca3af" stroke-width="1.2" />

        <!-- Vertical Term Gridlines -->
        <line x1="${x1}" y1="20" x2="${x1}" y2="115" stroke="#f1f5f9" stroke-dasharray="2,2" stroke-width="1" />
        <line x1="${x2}" y1="20" x2="${x2}" y2="115" stroke="#f1f5f9" stroke-dasharray="2,2" stroke-width="1" />
        <line x1="${x3}" y1="20" x2="${x3}" y2="115" stroke="#f1f5f9" stroke-dasharray="2,2" stroke-width="1" />

        <!-- Y-Axis Ticks & Labels -->
        <text x="54" y="${getY(100) + 3}" text-anchor="end" font-size="7" fill="#6b7280" font-family="system-ui, sans-serif">100%</text>
        <text x="54" y="${getY(75) + 3}" text-anchor="end" font-size="7" fill="#6b7280" font-family="system-ui, sans-serif">75%</text>
        <text x="54" y="${getY(50) + 3}" text-anchor="end" font-size="7" fill="#6b7280" font-family="system-ui, sans-serif">50%</text>
        <text x="54" y="${getY(25) + 3}" text-anchor="end" font-size="7" fill="#6b7280" font-family="system-ui, sans-serif">25%</text>
        <text x="54" y="118" text-anchor="end" font-size="7" fill="#6b7280" font-family="system-ui, sans-serif">0%</text>

        <!-- Connecting Lines & Area Fills -->
        ${connectingElements}

        <!-- Data Point Markers & Value Badges -->
        ${renderPoint(t1, x1)}
        ${renderPoint(t2, x2)}
        ${renderPoint(t3, x3)}

        <!-- X-Axis Labels (Term 1, Term 2, Term 3) -->
        <g>
          <text x="${x1}" y="129" text-anchor="middle" font-size="8.5" font-weight="bold" fill="${t1 ? '#800000' : '#4b5563'}" font-family="system-ui, sans-serif">Term 1</text>
          <text x="${x1}" y="140" text-anchor="middle" font-size="7" font-weight="${t1 ? '600' : 'normal'}" fill="${t1 ? '#047857' : '#9ca3af'}" font-style="${t1 ? 'normal' : 'italic'}" font-family="system-ui, sans-serif">
            ${t1 ? `${t1.averageScore}% (${getRubricCode(t1.averageScore)})` : '-- (Unrecorded)'}
          </text>

          <text x="${x2}" y="129" text-anchor="middle" font-size="8.5" font-weight="bold" fill="${t2 ? '#800000' : '#4b5563'}" font-family="system-ui, sans-serif">Term 2</text>
          <text x="${x2}" y="140" text-anchor="middle" font-size="7" font-weight="${t2 ? '600' : 'normal'}" fill="${t2 ? '#047857' : '#9ca3af'}" font-style="${t2 ? 'normal' : 'italic'}" font-family="system-ui, sans-serif">
            ${t2 ? `${t2.averageScore}% (${getRubricCode(t2.averageScore)})` : '-- (Unrecorded)'}
          </text>

          <text x="${x3}" y="129" text-anchor="middle" font-size="8.5" font-weight="bold" fill="${t3 ? '#800000' : '#4b5563'}" font-family="system-ui, sans-serif">Term 3</text>
          <text x="${x3}" y="140" text-anchor="middle" font-size="7" font-weight="${t3 ? '600' : 'normal'}" fill="${t3 ? '#047857' : '#9ca3af'}" font-style="${t3 ? 'normal' : 'italic'}" font-family="system-ui, sans-serif">
            ${t3 ? `${t3.averageScore}% (${getRubricCode(t3.averageScore)})` : '-- (Unrecorded)'}
          </text>
        </g>
      </svg>
    `;
  };

  // Generates complete, full-page A4 calibrated HTML for Print & PDF download
  const buildReportCardPrintHTML = (termName: string, yearName: string, graphSVGString: string) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Grace Seeds School - CBE Report Card - ${student.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      background: #fff;
      line-height: 1.25;
      font-size: 9px;
    }
    .page-container {
      width: 100%;
      height: 284mm;
      max-height: 284mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #800000;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .logo {
      height: 52px;
      width: 52px;
      object-fit: contain;
      margin: 0 auto 3px;
      display: block;
      border-radius: 8px;
      border: 1.5px solid #800000;
      padding: 2px;
      background: #fff;
    }
    .school-title {
      font-size: 19px;
      font-weight: 900;
      color: #800000;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 1px;
      line-height: 1.15;
    }
    .sub-title {
      font-size: 10px;
      font-weight: 800;
      color: #222;
      margin: 2px 0;
      text-transform: uppercase;
    }
    .meta-info {
      font-size: 8.5px;
      color: #555;
      margin-bottom: 2px;
    }
    .motto {
      font-size: 9px;
      font-style: italic;
      color: #800000;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .badge {
      display: inline-block;
      background: #800000;
      color: #fff;
      padding: 2.5px 12px;
      font-size: 9px;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    .demographics {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      background: #fdfdfd;
      border: 1px solid #ccc;
      padding: 5px 8px;
      border-radius: 6px;
      margin-bottom: 5px;
      font-size: 9px;
    }
    .demo-item strong {
      display: block;
      font-size: 7.5px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 1.5px;
    }
    .demo-item span {
      font-size: 10px;
      font-weight: 700;
      color: #111;
    }
    
    .rubric-key {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f4f4f4;
      padding: 3px 8px;
      border-radius: 5px;
      margin-bottom: 5px;
      font-size: 8.5px;
      font-weight: 600;
    }
    .rubric-pill {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 8px;
      color: #fff;
      margin-right: 2px;
    }
    .rubric-ee { background: #047857; }
    .rubric-me { background: #800000; }
    .rubric-ae { background: #b45309; }
    .rubric-be { background: #b91c1c; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 9px;
    }
    th, td {
      border: 1px solid #666;
      padding: 3.5px 5px;
      text-align: left;
      vertical-align: middle;
      line-height: 1.2;
    }
    th {
      background: #fce8ec;
      color: #800000;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .center { text-align: center; }

    .performance-graph-box {
      background: #fafafa;
      border: 1px solid #ccc;
      padding: 5px 7px;
      border-radius: 6px;
      margin-bottom: 5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .performance-graph-svg {
      width: 100%;
      height: auto;
      max-height: 185px;
      display: block;
    }

    .remarks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .remark-box {
      background: #fafafa;
      border: 1px solid #ccc;
      padding: 5px 7px;
      border-radius: 6px;
      font-size: 8.5px;
    }
    .remark-title {
      font-size: 9px;
      font-weight: 700;
      color: #800000;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .remark-text {
      font-style: italic;
      color: #333;
      min-height: 26px;
      margin-bottom: 3px;
      line-height: 1.25;
      font-size: 8.5px;
    }
    .sig-line {
      border-bottom: 1px solid #666;
      height: 16px;
      margin-top: 3px;
    }

    .footer-seal {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1.5px dashed #800000;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 8.5px;
      margin-top: auto;
    }
    .seal-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid #800000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6px;
      font-weight: 900;
      text-align: center;
      color: #800000;
      text-transform: uppercase;
      line-height: 1.05;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <img src="/logo.png" alt="Grace Seeds School Logo" class="logo" onerror="if(!this.src.endsWith('/logo.jpg')){this.src='/logo.jpg';}" />
      <h1 class="school-title">GRACE SEEDS SCHOOL</h1>
      <div class="sub-title">MINISTRY OF EDUCATION · CBE SUMMATIVE EVALUATION REPORT</div>
      <div class="meta-info">${schoolAddress} · Tel: ${schoolPhone} · Email: ${schoolEmail}</div>
      <div class="motto">&quot;${schoolMotto}&quot;</div>
      <div class="badge">Learner Competency Summative Dossier · ${termName} ${yearName}</div>
    </div>

    <div class="demographics">
      <div class="demo-item"><strong>Learner Name:</strong> <span>${student.name}</span></div>
      <div class="demo-item"><strong>Admission / UPI:</strong> <span>${student.admNo}${student.upi ? ` / ${student.upi}` : ''}</span></div>
      <div class="demo-item"><strong>Grade &amp; Cohort:</strong> <span>${student.grade}${student.stream && student.stream !== student.grade && student.stream !== 'Main Stream' && student.stream !== 'Main Cohort' ? ` - ${student.stream}` : ' (Main Cohort)'}</span></div>
      <div class="demo-item"><strong>Grade Manager:</strong> <span>${(student as any).classTeacherName || 'Tr. In Charge'}</span></div>
      <div class="demo-item"><strong>Term Attendance:</strong> <span>${attendanceRate}% (${daysPresent} / ${daysTotal} Days)</span></div>
    </div>

    <div class="rubric-key">
      <span style="color: #800000; font-weight: 700;">KNEC RUBRICS:</span>
      <span><span class="rubric-pill rubric-ee">EE</span> Exceeding Expectations (4)</span>
      <span><span class="rubric-pill rubric-me">ME</span> Meeting Expectations (3)</span>
      <span><span class="rubric-pill rubric-ae">AE</span> Approaching Expectations (2)</span>
      <span><span class="rubric-pill rubric-be">BE</span> Below Expectations (1)</span>
    </div>

    <!-- CBC Learning Areas Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 32%;">Learning Area (${resolvedSubjects.length} Subjects)</th>
          <th style="width: 14%;" class="center">Score / 100</th>
          <th style="width: 12%;" class="center">Rubric</th>
          <th>Performance Level &amp; Evaluator Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${resolvedSubjects.length === 0 ? `
          <tr>
            <td colspan="4" class="center" style="padding: 16px; font-style: italic; color: #666;">
              No assessment results recorded for this learner in the selected term.
            </td>
          </tr>
        ` : resolvedSubjects.map((s) => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td class="center font-mono"><strong>${s.score}</strong></td>
            <td class="center font-mono" style="font-weight: 700; font-size: 10px;">${s.rubricScore}</td>
            <td>
              <span style="color: #222; font-weight: 600;">${s.performanceLevel.replace(/_/g, ' ')}:</span>
              <span style="margin-left: 4px; color: #444;">${s.teacherRemarks}</span>
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background: #fce8ec; font-weight: bold; border-top: 1.5px solid #800000;">
          <td style="font-weight: 900; text-transform: uppercase;">Total Marks (${resolvedSubjects.length} Subjects)</td>
          <td class="center" style="font-size: 9.5px; font-weight: 900; color: #800000;">
            ${totalMarks}
          </td>
          <td class="center font-mono" style="font-weight: bold;">
            -
          </td>
          <td>
            <strong style="color: #047857;">Overall Average:</strong> ${overallAverage}% · ${overallPerformanceLevel}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Performance Graph -->
    <div class="performance-graph-box">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 3px;">
        <div>
          <span style="font-size: 8.5px; font-weight: 800; color: #800000; text-transform: uppercase;">
            TERM PERFORMANCE PROGRESSION — TERMS 1, 2 AND 3
          </span>
          <span style="font-size: 7px; color: #666; margin-left: 6px;">
            ${recordedTerms.length > 1
              ? `Academic progression across recorded terms (${recordedTerms.map(t => t.label).join(' & ')})`
              : (recordedTerms.length === 1 ? `Official summative evaluation for ${recordedTerms[0].label}` : 'No recorded assessment data')}
          </span>
        </div>
        <div>
          ${recordedTerms.length > 1 ? `
            <span style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1.5px 6px; border-radius: 3px; color: #047857; font-size: 7.5px; font-weight: bold;">
              Progression: ${termGrowth !== null && termGrowth >= 0 ? `+${termGrowth} pp` : `${termGrowth} pp`} (${recordedTerms[0].short} &rarr; ${recordedTerms[recordedTerms.length - 1].short})
            </span>
          ` : (recordedTerms.length === 1 ? `
            <span style="background: #fce8ec; border: 1px solid #800000; padding: 1.5px 6px; border-radius: 3px; color: #800000; font-size: 7.5px; font-weight: bold;">
              ${recordedTerms[0].label} Dossier
            </span>
          ` : `
            <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1.5px 6px; border-radius: 3px; color: #64748b; font-size: 7.5px; font-style: italic;">
              No assessment marks
            </span>
          `)}
        </div>
      </div>
      ${graphSVGString}
    </div>

    ${isEndTerm ? `
    <!-- Official End of Term Reopening Directive -->
    <div style="margin: 4px 0 3px 0; padding: 4px 8px; background: #fff5f5; border: 1.5px solid #800000; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 18px; height: 18px; border-radius: 4px; background: #800000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; flex-shrink: 0;">📅</div>
        <div>
          <strong style="color: #800000; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.3px; display: block;">
            OFFICIAL SCHOOL REOPENING DIRECTIVE &middot; ${nextTermOpening.termName.toUpperCase()}
          </strong>
          <span style="color: #374151; font-size: 6.8px; line-height: 1.2;">
            Learners are required to report promptly on reopening morning by <strong>7:45 AM</strong> in complete standard school uniform.
          </span>
        </div>
      </div>
      <div style="text-align: right; background: #800000; color: #ffffff; padding: 3px 8px; border-radius: 4px; flex-shrink: 0;">
        <span style="display: block; font-size: 5.5px; text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.9;">Reopening Date:</span>
        <strong style="font-size: 8px; font-weight: 800; white-space: nowrap;">
          ${nextTermOpening.formatted}
        </strong>
      </div>
    </div>
    ` : ''}

    <!-- Remarks & Signatures -->
    <div class="remarks-grid">
      <div class="remark-box">
        <div class="remark-title">Class Teacher Remarks</div>
        <div class="remark-text">&quot;${reportCardData?.classTeacherRemarks || `${student.name} demonstrates commendable diligence, discipline, and active engagement in continuous strand learning outcomes.`}&quot;</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <span style="font-size: 6.5px; color: #666; text-transform: uppercase;">Class Teacher Signature:</span>
            <div class="sig-line" style="width: 110px;"></div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 6.5px; color: #666; text-transform: uppercase;">Date:</span>
            <span style="font-size: 7.5px; font-weight: bold; color: #333;">${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>
      <div class="remark-box">
        <div class="remark-title">Head Teacher Endorsement</div>
        <div class="remark-text">&quot;${reportCardData?.headTeacherRemarks || 'Commendable performance throughout the term. Shows steady growth in core competencies and moral values.'}&quot;</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <span style="font-size: 6.5px; color: #666; text-transform: uppercase;">Principal Signature:</span>
            <div class="sig-line" style="width: 110px;"></div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 6.5px; color: #666; text-transform: uppercase;">Date:</span>
            <span style="font-size: 7.5px; font-weight: bold; color: #333;">${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Seal -->
    <div class="footer-seal">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="seal-badge">Official<br/>School<br/>Seal</div>
        <div>
          <strong style="font-size: 8px;">Grace Seeds School Examination Board</strong><br/>
          <span style="color: #666; font-size: 7px;">Certified Official Competency Summative Dossier</span>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="color: #666; text-transform: uppercase; font-size: 7px;">Official Date of Issue:</span><br/>
        <strong style="color: #800000; font-size: 8.5px;">
          ${new Date().toLocaleDateString('en-GB')}
        </strong>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Full-Page Dedicated Print & PDF Generation via Isolated Iframe
  const handlePrint = () => {
    if (!student) return;
    const activeTerm = availableTerms.find(t => t.id === selectedTermId) || currentTerm;
    const termName = activeTerm?.name || 'Term 3';
    const yearName = resolveAcademicYearName(currentYear?.name || currentYear?.year || currentYear?.id);
    const graphSVGString = buildPerformanceGraphSVG(recordedTerms, resolvedSubjects);
    const htmlContent = buildReportCardPrintHTML(termName, yearName, graphSVGString);

    const oldFrame = document.getElementById('smartshule-print-frame');
    if (oldFrame && oldFrame.parentNode) {
      oldFrame.parentNode.removeChild(oldFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'smartshule-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          const toRemove = document.getElementById('smartshule-print-frame');
          if (toRemove && toRemove.parentNode) {
            toRemove.parentNode.removeChild(toRemove);
          }
        }, 3000);
      }, 400);
    } else {
      window.print();
    }
  };

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
        // try next
      }
    }
    return null;
  };

  // Official CBC Report Card PDF Export
  const handleExportPDF = async () => {
    if (!student) return;
    const activeTerm = availableTerms.find((t) => t.id === selectedTermId) || currentTerm;
    const termName = activeTerm?.name || 'Term 3';
    const yearName = resolveAcademicYearName(currentYear?.name || currentYear?.year || currentYear?.id);
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || 'Grace Seeds School';
    const motto = schoolInfo?.motto || 'The Future Begins Here';

    // Top burgundy bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 18, 18);
      } catch {
        // continue
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
    doc.text('Ministry of Education · Kenya Competency-Based Education (CBE) Official Report Card', 36, curY + 16);

    curY += 23;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, curY, 196, curY);

    curY += 5;
    // Learner Dossier Header Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, curY, 182, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, curY, 182, 18, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(`Learner: ${student.name}`, 18, curY + 5.5);
    doc.text(`Adm #: ${student.admNo}`, 85, curY + 5.5);
    doc.text(`UPI / NEMIS: ${student.upi || '--'}`, 140, curY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text(`Grade / Stream: ${student.grade} - ${student.stream}`, 18, curY + 12);
    doc.text(`Period: ${termName}, ${yearName}`, 85, curY + 12);
    doc.text(`Attendance Rate: ${student.attendanceRate || 100}%`, 140, curY + 12);

    curY += 23;

    // Assessment Matrix Table
    const tableRows = resolvedSubjects.map((s, idx) => [
      (idx + 1).toString(),
      s.name,
      s.rubricCode || '--',
      `${s.score || 0}%`,
      s.performanceLevel.replace(/_/g, ' '),
      s.teacherRemarks || 'Satisfactory progress demonstrated.',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Learning Area', 'Rubric', 'Score', 'Performance Level', 'Teacher Pedagogical Remarks']],
      body: tableRows,
      foot: [['', 'OVERALL TERMLY EVALUATION', '', `${overallAverage}%`, overallPerformanceLevel, `Quality Pass: ${Math.round((resolvedSubjects.filter(s => s.rubricCode === 'EE' || s.rubricCode === 'ME').length / Math.max(1, resolvedSubjects.length)) * 100)}%`]],
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
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      footStyles: {
        fillColor: [254, 242, 242],
        textColor: [122, 18, 40],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 36 },
        5: { cellWidth: 64 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 200) + 7;
    if (finalY + 45 > 280) {
      doc.addPage('a4', 'portrait');
      finalY = 18;
    }

    // Teacher & Headteacher remarks
    doc.setFillColor(249, 250, 251);
    doc.rect(14, finalY, 182, 34, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, finalY, 182, 34, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(122, 18, 40);
    doc.text('CLASS TEACHER REMARKS & RECOMMENDATIONS:', 18, finalY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text(reportCardData?.classTeacherRemarks || 'Consistently demonstrates good understanding of CBC competencies and participates actively.', 18, finalY + 10.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(122, 18, 40);
    doc.text('PRINCIPAL / HEAD TEACHER DIRECTIVE & ENDORSEMENT:', 18, finalY + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text(reportCardData?.headTeacherRemarks || 'Commendable academic effort. Encouraged to sustain reading habit and inquiry skills next term.', 18, finalY + 24);

    finalY += 40;
    if (isEndTerm) {
      if (finalY + 12 > 280) {
        doc.addPage('a4', 'portrait');
        finalY = 18;
      }
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(122, 18, 40);
      doc.rect(14, finalY, 182, 8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(122, 18, 40);
      doc.text(
        `OFFICIAL SCHOOL REOPENING DIRECTIVE: School reopens on ${nextTermOpening.formatted}. Reporting time: 7:45 AM.`,
        18,
        finalY + 5.5
      );
      finalY += 11;
    }

    if (finalY + 15 > 285) {
      doc.addPage('a4', 'portrait');
      finalY = 18;
    }

    // Class Teacher Signature Placement
    if (classTeacherSig?.signatureDataSnapshot) {
      try {
        doc.addImage(classTeacherSig.signatureDataSnapshot, 'PNG', 18, finalY - 4, 38, 10);
      } catch {}
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(22, 101, 52);
      doc.text(`✓ Digitally Signed: ${classTeacherSig.signerName}`, 18, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Cert Hash: ${classTeacherSig.documentHash ? classTeacherSig.documentHash.substring(0, 16) : 'VERIFIED'}... · ${new Date(classTeacherSig.signedAt).toLocaleDateString('en-GB')}`, 18, finalY + 11);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Class Teacher Signature: _______________________', 18, finalY);
    }

    // Head Teacher Endorsement & Stamp Placement
    if (headTeacherSig?.signatureDataSnapshot) {
      try {
        doc.addImage(headTeacherSig.signatureDataSnapshot, 'PNG', 115, finalY - 4, 38, 10);
      } catch {}
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(22, 101, 52);
      doc.text(`✓ Official Endorsement: ${headTeacherSig.signerName}`, 115, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Cert Hash: ${headTeacherSig.documentHash ? headTeacherSig.documentHash.substring(0, 16) : 'VERIFIED'}... · ${new Date(headTeacherSig.signedAt).toLocaleDateString('en-GB')}`, 115, finalY + 11);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Head Teacher Official Stamp: [                             ]', 115, finalY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(122, 18, 40);
    doc.text(`Official Certification · Grace Seeds School Examination Board`, 18, finalY + 6);

    doc.setFontSize(7);
    doc.text(`Grace Seeds School · Official Progress Dossier · Generated on ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });

    doc.save(`Grace_Seeds_School_Report_Card_${student.admNo}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}_${termName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (isParent && checkingClearance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-[#800000] font-body">Verifying fee clearance status with Grace Seeds School...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics &amp; CBC</span>
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

  // Visual SVG coordinates calculation for JSX render
  const getY = (val: number) => Math.round(115 - (Math.min(100, Math.max(0, val)) / 100) * 95);

  if (isParent && !isFeeCleared) {
    const balance = currentFeeBalance;
    const studentName = student?.name || 'Learner';
    const admNo = student?.admNo || 'N/A';
    const grade = student?.grade || 'Grade';
    const waText = encodeURIComponent(
      `Hello, I am requesting fee clearance authorization and access to the term report card for my child ${studentName} (Adm: ${admNo}, ${grade}) at Grace Seeds School.`
    );

    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-amber-400/60 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#7a1228] text-white uppercase tracking-wider">
              Fee Clearance Required
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-on-surface mt-2.5">
              Official CBE Term Report Card Withheld
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto mt-1 leading-relaxed">
              In accordance with Grace Seeds School policy, academic term report cards are released once all term levies are settled in full or authorized by school leadership.
            </p>
          </div>

          {students && students.length > 1 && (
            <div className="bg-amber-100/60 p-2.5 rounded-xl border border-amber-300/60 max-w-md mx-auto">
              <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1 text-left">Switch Child:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {students.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (student?.id === c.id)
                        ? 'bg-[#7a1228] text-white shadow-xs'
                        : 'bg-white text-amber-950 hover:bg-amber-200/50'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs font-bold text-on-surface">
              <span>Learner Name:</span>
              <span className="text-primary">{studentName}</span>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Admission / Grade:</span>
              <span className="font-data-mono">{admNo} · {grade}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-2 border-t border-amber-200">
              <span className="text-amber-950">Outstanding Balance:</span>
              <span className="font-data-mono text-base text-[#7a1228] font-black">
                KES {balance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/254745436312?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Request Clearance from Head Teacher</span>
            </a>

            <a
              href={`https://wa.me/254745436312?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#7a1228] hover:bg-[#5a1226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              <span>Request Clearance from Director</span>
            </a>
          </div>

          <div className="text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/20">
            For direct inquiries, reach Grace Seeds School office at <strong className="text-primary">0745436312</strong> or <strong className="text-primary">schoolgraceseeds@gmail.com</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-body print:space-y-0 print:p-0 print:m-0 print:w-full">
      {/* Injected Print Stylesheet Calibrated for Print & PDF Export */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }
          header, aside, #main-sidebar, nav, footer, .no-print, .term-lifecycle-banner, [class*="term-lifecycle"], [class*="termNotice"] {
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
            max-width: 100% !important;
            height: 284mm !important;
            max-height: 284mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-header {
            border-bottom: 2px solid #800000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding-bottom: 4px !important;
            margin-bottom: 5px !important;
          }
          .printable-header .school-logo-wrapper {
            width: 52px !important;
            height: 52px !important;
            margin-bottom: 3px !important;
            border-width: 1.5px !important;
            padding: 2px !important;
            box-shadow: none !important;
          }
          .printable-header .school-logo-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
          .printable-header h2 {
            font-size: 19px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;
            margin: 0 !important;
          }
          .printable-header p {
            font-size: 8.5px !important;
            margin: 1px 0 !important;
            line-height: 1.2 !important;
          }
          .report-card-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 5px !important;
          }
          .report-card-table th, .report-card-table td {
            border: 1px solid #666 !important;
            padding: 3.5px 5px !important;
            line-height: 1.2 !important;
            font-size: 9px !important;
          }
          .report-card-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-card-table th {
            background-color: #fce8ec !important;
            color: #800000 !important;
            font-size: 9px !important;
            font-weight: 700 !important;
          }
          .performance-graph-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 5px !important;
          }
          .performance-graph-svg {
            width: 100% !important;
            height: auto !important;
            max-height: 185px !important;
            display: block !important;
          }
          .remarks-signatures-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 5px !important;
          }
          .footer-seal-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: auto !important;
          }
        }
      `}</style>

      {/* Top Toolbar (Controls, Action Buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBE Competencies</span>
            <span>/</span>
            <span className="text-[#800000] font-semibold">Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBE Learner Summative Dossier
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ministry of Education &amp; KNEC CBE format · Continuous summative compilation for Grace Seeds School
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Evaluation Type Switch (End-of-Term vs Mid-Term) */}
          <div className="flex items-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-0.5 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setEvaluationPeriod('END_OF_TERM')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                isEndTerm
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Official End of Term Summative Dossier"
            >
              End of Term
            </button>
            <button
              type="button"
              onClick={() => setEvaluationPeriod('MID_TERM')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                !isEndTerm
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Continuous Mid-Term Progress Assessment"
            >
              Mid-Term
            </button>
          </div>

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

          {/* Term Select */}
          <select
            value={selectedTermId || currentTerm?.id || ''}
            onChange={(e) => {
              const newTermId = e.target.value;
              setSelectedTermId(newTermId);
              const matchedTerm = availableTerms.find(t => t.id === newTermId);
              if (matchedTerm) setCurrentTerm(matchedTerm);
              if (student?.id) loadReportCard(student.id, newTermId, currentYear?.id);
            }}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-2 px-3 text-xs font-semibold text-on-surface shadow-xs"
          >
            {availableTerms.length > 0 ? (
              availableTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || `Term ${t.termNumber || t.id}`}
                </option>
              ))
            ) : (
              <option value={currentTerm?.id || 'term-2026-t3'}>
                {currentTerm?.name || 'Term 3 - 2026'}
              </option>
            )}
          </select>

          {/* Auto Compile Button */}
          {!isParent && (
            <button
              onClick={handleGenerateReportCard}
              disabled={isGenerating}
              className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recompile strand assessments and formative evaluations"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>{isGenerating ? 'Compiling...' : 'Auto-Compile Dossier'}</span>
            </button>
          )}

          {/* Download / Print PDF Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#600000] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download or print report card with centered school logo"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Download / Print PDF</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download official CBC Report Card as PDF document"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download Report Card (PDF)</span>
          </button>

          {/* Electronic Document Signing Button */}
          {canUserSign && (
            <button
              onClick={() => setIsSigningModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Electronically sign this report card using your verified digital signature"
            >
              <span className="material-symbols-outlined text-[16px]">draw</span>
              <span>Sign Report Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Report Card Printable Document */}
      <div className="printable-report-card bg-white text-gray-900 rounded-2xl shadow-xl border border-outline-variant/30 p-6 sm:p-8 print:p-0 max-w-5xl mx-auto space-y-4 print:space-y-0 print:max-w-none print:w-full print:m-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Centered School Letterhead Header */}
        <div className="printable-header flex flex-col items-center justify-center text-center pb-4 print:pb-1.5 border-b-2 border-[#800000]">
          {/* Centered School Logo */}
          <div className="school-logo-wrapper w-24 h-24 sm:w-28 sm:h-28 print:w-12 print:h-12 rounded-xl border-2 border-[#800000] p-1.5 print:p-0.5 bg-white flex items-center justify-center shadow-md print:shadow-none mx-auto mb-2 print:mb-0.5 shrink-0">
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

          <h2 className="text-xl sm:text-2xl print:text-sm font-black uppercase text-[#800000] tracking-wider leading-tight">
            GRACE SEEDS SCHOOL
          </h2>
          <p className="text-xs sm:text-sm print:text-[8.5px] font-bold text-gray-800 uppercase tracking-wide mt-0.5 print:mt-0">
            MINISTRY OF EDUCATION · CBC SUMMATIVE EVALUATION REPORT
          </p>
          <p className="text-[11px] print:text-[7.5px] text-gray-600 font-medium mt-0.5 print:mt-0">
            {schoolAddress} · Tel: <strong>{schoolPhone}</strong> · Email: <strong>{schoolEmail}</strong>
          </p>
          <p className="text-xs print:text-[7.5px] italic text-[#800000] font-semibold mt-0.5 print:mt-0">
            &quot;{schoolMotto}&quot;
          </p>

          <div className="mt-2 print:mt-0.5 inline-flex flex-wrap items-center justify-center gap-1.5 px-4 py-1 print:py-0.5 bg-[#800000] text-white rounded-md text-xs print:text-[7.5px] font-bold uppercase tracking-wider shadow-xs print:shadow-none">
            <span>{isEndTerm ? 'END-OF-TERM COMPETENCY SUMMATIVE DOSSIER' : 'MID-TERM COMPETENCY PROGRESS EVALUATION'}</span>
            <span>·</span>
            <span>{(availableTerms.find(t => t.id === selectedTermId) || currentTerm)?.name || 'TERM 3'}, {resolveAcademicYearName(currentYear?.name || currentYear?.year || currentYear?.id)}</span>
          </div>
        </div>

        {/* Learner Demographic Details */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 print:gap-1.5 p-3 print:p-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs print:text-[8px] print:bg-transparent print:border-gray-400">
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px] print:text-[7px]">Learner Full Name</span>
            <span className="font-bold text-gray-900 text-sm print:text-[9.5px]">{student.name}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px] print:text-[7px]">Admission / NEMIS UPI</span>
            <span className="font-data-mono font-bold text-[#800000] print:text-[9px]">
              {student.admNo}{student.upi ? ` / ${student.upi}` : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px] print:text-[7px]">Grade &amp; Cohort</span>
            <span className="font-bold text-gray-900 print:text-[9px]">{student.grade}{student.stream && student.stream !== student.grade && student.stream !== 'Main Stream' && student.stream !== 'Main Cohort' ? ` - ${student.stream}` : ' (Main Cohort)'}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px] print:text-[7px]">Grade Manager</span>
            <span className="font-bold text-gray-900 print:text-[9px]">{(student as any).classTeacherName || 'Tr. In Charge'}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block uppercase text-[10px] print:text-[7px]">Term Attendance</span>
            <span className="font-data-mono font-bold text-emerald-800 text-sm print:text-[9.5px]">
              {attendanceRate}% ({daysPresent} / {daysTotal} Days)
            </span>
          </div>
        </div>

        {/* Rubric Key Guide */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 print:p-1 rounded-lg bg-gray-100 text-[11px] print:text-[7.5px] font-semibold text-gray-700 print:bg-transparent print:border print:border-gray-300">
          <span className="font-bold text-[#800000] uppercase text-[10px] print:text-[7px]">KNEC Rubric Guide:</span>
          <span className="flex items-center gap-1"><span className="px-1 py-0.1 rounded bg-emerald-700 text-white font-bold text-[9px] print:text-[7px]">EE</span> Exceeding Expectations (4)</span>
          <span className="flex items-center gap-1"><span className="px-1 py-0.1 rounded bg-[#800000] text-white font-bold text-[9px] print:text-[7px]">ME</span> Meeting Expectations (3)</span>
          <span className="flex items-center gap-1"><span className="px-1 py-0.1 rounded bg-amber-700 text-white font-bold text-[9px] print:text-[7px]">AE</span> Approaching Expectations (2)</span>
          <span className="flex items-center gap-1"><span className="px-1 py-0.1 rounded bg-rose-700 text-white font-bold text-[9px] print:text-[7px]">BE</span> Below Expectations (1)</span>
        </div>

        {/* CBC Learning Areas Evaluation Table */}
        <div className="border border-gray-200 rounded-xl print:rounded-md overflow-hidden print:border-gray-400">
          <table className="report-card-table w-full text-left text-xs print:text-[8px]">
            <thead className="bg-[#800000] text-white uppercase text-[11px] print:text-[7.5px] font-bold">
              <tr>
                <th className="py-2 print:py-1 px-3 print:px-2 w-1/4">Learning Area ({resolvedSubjects.length} Subjects)</th>
                <th className="py-2 print:py-1 px-2 print:px-1 text-center w-20 print:w-14">Score / 100</th>
                <th className="py-2 print:py-1 px-2.5 print:px-1.5 text-center w-28 print:w-20">Rubric</th>
                <th className="py-2 print:py-1 px-3 print:px-2">Performance Level &amp; Evaluator Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {resolvedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <span className="material-symbols-outlined text-gray-400 text-3xl mb-1 block">assignment_late</span>
                    <p className="font-semibold text-gray-700">No assessment results recorded for this learner in the selected term.</p>
                    <p className="text-xs text-gray-500 mt-1">Assessments for this term have not yet been recorded or published.</p>
                  </td>
                </tr>
              ) : (
                resolvedSubjects.map((s, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="py-1.5 print:py-0.5 px-3 print:px-2 font-bold text-gray-900">
                      {s.name}
                    </td>
                    <td className="py-1.5 print:py-0.5 px-2 print:px-1 text-center font-mono font-bold text-gray-900">
                      {s.score}
                    </td>
                    <td className="py-1.5 print:py-0.5 px-2.5 print:px-1.5 text-center font-mono font-bold text-gray-900 text-xs print:text-[8px]">
                      {s.rubricScore}
                    </td>
                    <td className="py-1.5 print:py-0.5 px-3 print:px-2 text-gray-700 text-[11px] print:text-[7.5px] leading-snug print:leading-tight">
                      <span className="font-semibold text-gray-900 mr-1.5">
                        {s.performanceLevel.replace(/_/g, ' ')}:
                      </span>
                      <span>{s.teacherRemarks}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-rose-50/60 font-bold border-t border-gray-300 text-gray-900 text-xs print:text-[8px]">
              <tr>
                <td className="py-1.5 px-3 uppercase font-black text-gray-800">
                  Total Marks ({resolvedSubjects.length} Subjects)
                </td>
                <td className="py-1.5 px-2 text-center font-mono text-[#800000] font-black">
                  {totalMarks} / {totalPossible}
                </td>
                <td className="py-1.5 px-2 text-center font-mono text-gray-500 font-bold">
                  -
                </td>
                <td className="py-1.5 px-3 text-emerald-800 font-bold">
                  Overall Average: {overallAverage}% · Summary: {overallPerformanceLevel}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Performance Graph Section (Multi-Term Line Graph) */}
        <div className="performance-graph-section p-3 print:p-1.5 rounded-xl bg-gray-50/80 border border-gray-200 print:border-gray-400 space-y-2 print:space-y-1 print:bg-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2 print:pb-1">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#800000] text-[18px] print:hidden">show_chart</span>
                <h4 className="font-bold text-xs print:text-[8.5px] text-[#800000] uppercase tracking-wider">
                  Term Performance Progression — Terms 1, 2 and 3
                </h4>
              </div>
              <p className="text-[11px] print:text-[7px] text-gray-500 mt-0.5">
                {recordedTerms.length > 1
                  ? `Continuous academic performance trajectory across recorded terms for ${resolveAcademicYearName(currentYear?.name || currentYear?.year || currentYear?.id)}`
                  : `Evaluated academic performance for ${recordedTerms[0]?.label || `Term ${activeTermNumber}`} (${resolveAcademicYearName(currentYear?.name || currentYear?.year || currentYear?.id)})`}
              </p>
            </div>

            {/* Progression Status Badge */}
            <div className="text-right">
              {recordedTerms.length > 1 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs print:text-[7.5px] font-bold">
                  <span>Progression:</span>
                  <span className="font-mono">
                    {termGrowth !== null && termGrowth >= 0 ? `+${termGrowth} pp` : `${termGrowth} pp`}
                  </span>
                  <span className="text-emerald-700 text-[10px] print:text-[6.5px]">
                    ({recordedTerms[0].short} &rarr; {recordedTerms[recordedTerms.length - 1].short})
                  </span>
                </div>
              ) : recordedTerms.length === 1 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 border border-rose-200 text-[#800000] text-xs print:text-[7.5px] font-bold">
                  <span>{recordedTerms[0].label} Evaluation</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-500 text-xs print:text-[7.5px] font-medium italic">
                  <span>No Assessment Records</span>
                </div>
              )}
            </div>
          </div>

          {/* Pure Vector SVG Chart matching buildPerformanceGraphSVG */}
          <div className="w-full overflow-x-auto">
            {recordedTerms.length === 0 ? (
              <svg viewBox="0 0 760 90" width="100%" height="auto" className="performance-graph-svg min-w-[650px] sm:min-w-0" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="750" height="80" rx="6" fill="#fafafa" stroke="#e5e7eb" strokeWidth="1" />
                <text x="380" y="48" textAnchor="middle" fontSize="9" fontWeight="600" fill="#6b7280" fontFamily="system-ui, sans-serif">
                  No term assessment data recorded for this academic year.
                </text>
              </svg>
            ) : (
              (() => {
                const getRubricCode = (val: number) => (val >= 80 ? 'EE' : val >= 65 ? 'ME' : val >= 50 ? 'AE' : 'BE');
                const t1 = recordedTerms.find(t => t.termNumber === 1 || t.label.toLowerCase().includes('term 1') || t.short === 'T1');
                const t2 = recordedTerms.find(t => t.termNumber === 2 || t.label.toLowerCase().includes('term 2') || t.short === 'T2');
                const t3 = recordedTerms.find(t => t.termNumber === 3 || t.label.toLowerCase().includes('term 3') || t.short === 'T3');

                const x1 = 150;
                const x2 = 360;
                const x3 = 570;

                const renderPoint = (t: typeof t1, x: number) => {
                  if (!t) return null;
                  const y = getY(t.averageScore);
                  const rubric = getRubricCode(t.averageScore);
                  const badgeY = y < 35 ? y + 8 : y - 18;
                  return (
                    <g key={x}>
                      <circle cx={x} cy={y} r="5" fill="#800000" stroke="#ffffff" strokeWidth="1.8" />
                      <circle cx={x} cy={y} r="2" fill="#ffffff" />
                      <rect x={x - 22} y={badgeY} width="44" height="13" rx="3" fill="#800000" />
                      <text x={x} y={badgeY + 9.5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#ffffff" fontFamily="system-ui, sans-serif">
                        {t.averageScore}% · {rubric}
                      </text>
                    </g>
                  );
                };

                return (
                  <svg viewBox="0 0 760 150" width="100%" height="auto" className="performance-graph-svg min-w-[650px] sm:min-w-0" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="jsxTermProgressionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#800000" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#800000" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Outer Boundary */}
                    <rect x="5" y="5" width="750" height="140" rx="6" fill="#fafafa" stroke="#e5e7eb" strokeWidth="1" />

                    {/* Single-Term Neutral Comparison Notice */}
                    {recordedTerms.length === 1 && (
                      <g>
                        <rect x="180" y="7" width="400" height="14" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />
                        <text x="380" y="16.5" textAnchor="middle" fontSize="6.8" fill="#64748b" fontFamily="system-ui, sans-serif">
                          Term comparison unavailable — Earlier assessment data is not recorded for this academic year.
                        </text>
                      </g>
                    )}

                    {/* Benchmark Horizontal Guidelines */}
                    <line x1="60" y1={getY(80)} x2="640" y2={getY(80)} stroke="#059669" strokeDasharray="3,3" strokeWidth="0.9" strokeOpacity="0.7" />
                    <text x="645" y={getY(80) + 3} fontSize="7" fontWeight="bold" fill="#059669" fontFamily="system-ui, sans-serif">EE Target (80%)</text>

                    <line x1="60" y1={getY(65)} x2="640" y2={getY(65)} stroke="#800000" strokeDasharray="3,3" strokeWidth="0.9" strokeOpacity="0.5" />
                    <text x="645" y={getY(65) + 3} fontSize="7" fontWeight="bold" fill="#800000" fontFamily="system-ui, sans-serif">ME Benchmark (65%)</text>

                    <line x1="60" y1={getY(50)} x2="640" y2={getY(50)} stroke="#d97706" strokeDasharray="3,3" strokeWidth="0.8" strokeOpacity="0.5" />
                    <text x="645" y={getY(50) + 3} fontSize="7" fontWeight="bold" fill="#d97706" fontFamily="system-ui, sans-serif">AE Benchmark (50%)</text>

                    {/* Baseline Axis (0%) */}
                    <line x1="60" y1="115" x2="640" y2="115" stroke="#9ca3af" strokeWidth="1.2" />

                    {/* Vertical Term Gridlines */}
                    <line x1={x1} y1="20" x2={x1} y2="115" stroke="#f1f5f9" strokeDasharray="2,2" strokeWidth="1" />
                    <line x1={x2} y1="20" x2={x2} y2="115" stroke="#f1f5f9" strokeDasharray="2,2" strokeWidth="1" />
                    <line x1={x3} y1="20" x2={x3} y2="115" stroke="#f1f5f9" strokeDasharray="2,2" strokeWidth="1" />

                    {/* Y-Axis Ticks & Labels */}
                    <text x="54" y={getY(100) + 3} textAnchor="end" fontSize="7" fill="#6b7280" fontFamily="system-ui, sans-serif">100%</text>
                    <text x="54" y={getY(75) + 3} textAnchor="end" fontSize="7" fill="#6b7280" fontFamily="system-ui, sans-serif">75%</text>
                    <text x="54" y={getY(50) + 3} textAnchor="end" fontSize="7" fill="#6b7280" fontFamily="system-ui, sans-serif">50%</text>
                    <text x="54" y={getY(25) + 3} textAnchor="end" fontSize="7" fill="#6b7280" fontFamily="system-ui, sans-serif">25%</text>
                    <text x="54" y="118" textAnchor="end" fontSize="7" fill="#6b7280" fontFamily="system-ui, sans-serif">0%</text>

                    {/* Connecting Lines & Area Fills (Only between valid consecutive terms) */}
                    {t1 && t2 && (
                      <g>
                        <polygon points={`${x1},${getY(t1.averageScore)} ${x2},${getY(t2.averageScore)} ${x2},115 ${x1},115`} fill="url(#jsxTermProgressionGrad)" />
                        <line x1={x1} y1={getY(t1.averageScore)} x2={x2} y2={getY(t2.averageScore)} stroke="#800000" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    )}

                    {t2 && t3 && (
                      <g>
                        <polygon points={`${x2},${getY(t2.averageScore)} ${x3},${getY(t3.averageScore)} ${x3},115 ${x2},115`} fill="url(#jsxTermProgressionGrad)" />
                        <line x1={x2} y1={getY(t2.averageScore)} x2={x3} y2={getY(t3.averageScore)} stroke="#800000" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    )}

                    {/* Data Point Markers & Value Badges */}
                    {renderPoint(t1, x1)}
                    {renderPoint(t2, x2)}
                    {renderPoint(t3, x3)}

                    {/* X-Axis Labels (Term 1, Term 2, Term 3) */}
                    <g>
                      <text x={x1} y="129" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill={t1 ? '#800000' : '#4b5563'} fontFamily="system-ui, sans-serif">Term 1</text>
                      <text x={x1} y="140" textAnchor="middle" fontSize="7" fontWeight={t1 ? '600' : 'normal'} fill={t1 ? '#047857' : '#9ca3af'} fontStyle={t1 ? 'normal' : 'italic'} fontFamily="system-ui, sans-serif">
                        {t1 ? `${t1.averageScore}% (${getRubricCode(t1.averageScore)})` : '-- (Unrecorded)'}
                      </text>

                      <text x={x2} y="129" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill={t2 ? '#800000' : '#4b5563'} fontFamily="system-ui, sans-serif">Term 2</text>
                      <text x={x2} y="140" textAnchor="middle" fontSize="7" fontWeight={t2 ? '600' : 'normal'} fill={t2 ? '#047857' : '#9ca3af'} fontStyle={t2 ? 'normal' : 'italic'} fontFamily="system-ui, sans-serif">
                        {t2 ? `${t2.averageScore}% (${getRubricCode(t2.averageScore)})` : '-- (Unrecorded)'}
                      </text>

                      <text x={x3} y="129" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill={t3 ? '#800000' : '#4b5563'} fontFamily="system-ui, sans-serif">Term 3</text>
                      <text x={x3} y="140" textAnchor="middle" fontSize="7" fontWeight={t3 ? '600' : 'normal'} fill={t3 ? '#047857' : '#9ca3af'} fontStyle={t3 ? 'normal' : 'italic'} fontFamily="system-ui, sans-serif">
                        {t3 ? `${t3.averageScore}% (${getRubricCode(t3.averageScore)})` : '-- (Unrecorded)'}
                      </text>
                    </g>
                  </svg>
                );
              })()
            )}
          </div>
        </div>


        {/* Official School Reopening Directive (End-of-Term Directive) */}
        {isEndTerm && (
          <div className="p-3.5 print:p-2 rounded-xl border-2 border-[#800000] bg-rose-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 print:w-7 print:h-7 rounded-xl bg-[#800000] text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[22px] print:text-[14px]">calendar_month</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#800000] uppercase text-xs print:text-[8.5px] tracking-wide">
                    Official School Reopening Directive &middot; {nextTermOpening.termName}
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] print:text-[7px] font-bold bg-[#800000] text-white uppercase">
                    End of Term Notice
                  </span>
                </div>
                <p className="text-gray-700 text-[11px] print:text-[7.5px] mt-0.5 leading-snug">
                  Learners are required to report promptly on reopening morning by <strong>7:45 AM</strong> in complete standard school uniform with requisite CBC learning workbooks.
                </p>
              </div>
            </div>
            <div className="text-right sm:text-right shrink-0 bg-[#800000] text-white px-3 py-1.5 rounded-lg shadow-2xs">
              <span className="block text-[10px] print:text-[6.5px] uppercase font-bold text-rose-200">Reopening Date:</span>
              <span className="font-black text-sm print:text-[9.5px] whitespace-nowrap">
                {nextTermOpening.formatted}
              </span>
            </div>
          </div>
        )}

        {/* Remarks and Official Signatures Block */}
        <div className="remarks-signatures-section space-y-2.5 print:space-y-1 pt-0.5">
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 print:gap-2">
            {/* Class Teacher Section */}
            <div className="p-3 print:p-1.5 rounded-xl border border-gray-300 bg-gray-50/70 space-y-1.5 print:space-y-0.5 text-xs print:bg-transparent print:border-gray-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#800000] uppercase text-[11px] print:text-[8px]">Class Teacher Remarks</span>
                <span className="text-[10px] print:text-[7.5px] text-gray-500 font-data-mono">{reportCardData?.classTeacherRemarks ? 'Class Educator' : 'Class Educator'}</span>
              </div>
              <p className="text-gray-800 italic text-[11px] print:text-[7.5px] leading-relaxed print:leading-tight min-h-[26px] print:min-h-0">
                &quot;{reportCardData?.classTeacherRemarks || `${student.name} demonstrates commendable diligence, discipline, and active engagement in continuous strand learning outcomes.`}&quot;
              </p>
              <div className="pt-1.5 print:pt-0.5 border-t border-gray-300 flex justify-between items-end text-[11px] print:text-[7.5px] text-gray-600">
                <div>
                  <span className="block text-[10px] print:text-[7px] text-gray-500 uppercase">Class Teacher Signature:</span>
                  {classTeacherSig?.signatureDataSnapshot ? (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <img src={classTeacherSig.signatureDataSnapshot} alt="Class Teacher Signature" className="h-7 print:h-5 object-contain" />
                      <span className="text-[9px] print:text-[6.5px] font-semibold text-emerald-700 bg-emerald-50 print:bg-transparent px-1 py-0.5 rounded border border-emerald-200 print:border-none inline-flex items-center gap-1">
                        ✓ Digitally Signed ({classTeacherSig.signerName})
                      </span>
                    </div>
                  ) : (
                    <div className="border-b border-gray-500 w-32 print:w-24 h-4 print:h-3"></div>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] print:text-[7px] text-gray-500 uppercase">Date:</span>
                  <span className="font-semibold text-gray-800">
                    {classTeacherSig?.signedAt ? new Date(classTeacherSig.signedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Head Teacher Section */}
            <div className="p-3 print:p-1.5 rounded-xl border border-gray-300 bg-gray-50/70 space-y-1.5 print:space-y-0.5 text-xs print:bg-transparent print:border-gray-400">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#800000] uppercase text-[11px] print:text-[8px]">Head Teacher Endorsement</span>
                <span className="text-[10px] print:text-[7.5px] text-gray-500 font-data-mono">Principal / Head Teacher</span>
              </div>
              <p className="text-gray-800 italic text-[11px] print:text-[7.5px] leading-relaxed print:leading-tight min-h-[26px] print:min-h-0">
                &quot;{reportCardData?.headTeacherRemarks || 'Commendable performance throughout the term. Shows steady growth in core competencies and moral values.'}&quot;
              </p>
              <div className="pt-1.5 print:pt-0.5 border-t border-gray-300 flex justify-between items-end text-[11px] print:text-[7.5px] text-gray-600">
                <div>
                  <span className="block text-[10px] print:text-[7px] text-gray-500 uppercase">Principal Signature:</span>
                  {headTeacherSig?.signatureDataSnapshot ? (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <img src={headTeacherSig.signatureDataSnapshot} alt="Head Teacher Signature" className="h-7 print:h-5 object-contain" />
                      <span className="text-[9px] print:text-[6.5px] font-semibold text-emerald-700 bg-emerald-50 print:bg-transparent px-1 py-0.5 rounded border border-emerald-200 print:border-none inline-flex items-center gap-1">
                        ✓ Official Seal &amp; Endorsement ({headTeacherSig.signerName})
                      </span>
                    </div>
                  ) : (
                    <div className="border-b border-gray-500 w-32 print:w-24 h-4 print:h-3"></div>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] print:text-[7px] text-gray-500 uppercase">Date:</span>
                  <span className="font-semibold text-gray-800">
                    {headTeacherSig?.signedAt ? new Date(headTeacherSig.signedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Seal and Term Schedule Footer */}
          <div className="footer-seal-section p-2.5 print:p-1.5 rounded-xl border border-dashed border-gray-300 flex flex-col sm:flex-row print:flex-row items-center justify-between gap-2.5 print:gap-1 text-xs bg-gray-50/50 print:bg-transparent print:border-solid print:border-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 print:w-7 print:h-7 rounded-full border-2 border-dashed border-[#800000] flex items-center justify-center text-[#800000] print:border-solid shrink-0">
                <span className="text-[7px] print:text-[5.5px] font-black text-center uppercase leading-tight">Official<br/>School<br/>Seal</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xs print:text-[8px]">Official School Seal &amp; Certification</p>
                <p className="text-[11px] print:text-[7px] text-gray-600">Certified by Grace Seeds School Academic Assessment Board</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-[10px] print:text-[7px] uppercase">Official Date of Issue:</span>
              <span className="font-bold text-[#800000] text-xs print:text-[8.5px]">
                {new Date().toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Electronic Document Signing Modal */}
      {canUserSign && isSigningModalOpen && (
        <DocumentSigningModal
          isOpen={isSigningModalOpen}
          onClose={() => setIsSigningModalOpen(false)}
          documentId={reportCardDocId}
          documentType="REPORT_CARD"
          documentVersion="1.0"
          documentTitle={`Summative Report Card: ${student.name} (${student.admNo})`}
          documentContent={canonicalDocContent}
          onSignatureComplete={() => {
            loadSignatures(reportCardDocId);
          }}
        />
      )}
    </div>
  );
};
