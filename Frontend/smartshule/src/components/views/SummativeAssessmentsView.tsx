import React, { useState, useEffect, useMemo } from 'react';
import {
  Student,
  BackendLearningArea,
  BackendSummativeAssessment,
  AcademicYear,
  AcademicTerm,
  ClassRoom,
} from '../../types';
import { apiService } from '../../services/api';

interface SummativeAssessmentsViewProps {
  students?: Student[];
  learningAreas?: BackendLearningArea[];
  onOpenUploadMarks: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface CanonicalSubjectItem {
  id: string;
  key: string;
  code: string;
  name: string;
  initial: string;
  aliasIds: string[];
}

export const getSubjectCanonicalKey = (nameOrCodeOrId: string): string => {
  if (!nameOrCodeOrId) return 'OTHER';
  const clean = nameOrCodeOrId.trim().toUpperCase();

  if (
    clean.includes('CREATIVE') ||
    clean.includes('CREA') ||
    clean.includes('CRA') ||
    (clean.includes('ART') && !clean.includes('SMART'))
  ) {
    return 'CREA';
  }

  if (
    clean.includes('READING') ||
    clean.includes('REA') ||
    clean.includes('LITERACY')
  ) {
    return 'REA';
  }

  if (
    clean.includes('KUSOMA') ||
    clean.includes('KUSO') ||
    clean.includes('WKU')
  ) {
    return 'KUSO';
  }

  if (
    clean.includes('ENVIRONMENT') ||
    clean.includes('ENVI') ||
    clean.includes('SENV') ||
    clean.includes('ENV')
  ) {
    return 'ENVI';
  }

  if (clean.includes('ENG') || clean.includes('ENGLISH')) return 'ENG';
  if (clean.includes('KISW') || clean.includes('SWAHILI') || clean.includes('KIS')) return 'KISW';
  if (clean.includes('MATH') || clean.includes('MAT')) return 'MATH';
  if (clean.includes('RELIGIOUS') || clean.includes('CRE') || clean.includes('IRE') || clean.includes('HRE')) return 'CRE';

  if (clean.includes('INTEGRATED SCIENCE') || clean.includes('INTSCI') || clean.includes('SCI_TECH') || clean.includes('SCIENCE') || clean.includes('SCI')) return 'SCI';
  if (clean.includes('HEALTH') || clean.includes('HLTH')) return 'HLTH';
  if (clean.includes('SOCIAL') || clean.includes('SST') || clean.includes('SOC')) return 'SST';
  if (clean.includes('AGRI') || clean.includes('NUTRITION') || clean.includes('AGR')) return 'AGRI';
  if (clean.includes('PRE-TECH') || clean.includes('PRETECH') || clean.includes('TECHNICAL') || clean.includes('PTECH') || clean.includes('PRET')) return 'PRETECH';
  if (clean.includes('BUSINESS') || clean.includes('BUS')) return 'BUS';
  if (clean.includes('COMPUTER') || clean.includes('COMP')) return 'COMP';
  if (clean.includes('FRENCH') || clean.includes('FRE')) return 'FRE';
  if (clean.includes('GERMAN') || clean.includes('GER')) return 'GER';
  if (clean.includes('ARABIC') || clean.includes('ARA')) return 'ARA';
  if (clean.includes('INDIGENOUS') || clean.includes('IND')) return 'IND';

  return clean;
};

export const getCanonicalInitial = (canonicalKey: string): string => {
  switch (canonicalKey) {
    case 'ENG': return 'ENG';
    case 'REA': return 'REA';
    case 'MATH': return 'MAT';
    case 'KISW': return 'KIS';
    case 'KUSO': return 'KUSO';
    case 'ENVI': return 'ENVI';
    case 'CRE': return 'CRE';
    case 'CREA': return 'CREA';
    case 'SCI': return 'SCI';
    case 'SST': return 'SST';
    case 'AGRI': return 'AGR';
    case 'ARTS': return 'ART';
    case 'PRETECH': return 'PRET';
    case 'HLTH': return 'HLTH';
    case 'BUS': return 'BUS';
    case 'COMP': return 'COMP';
    case 'FRE': return 'FRE';
    case 'GER': return 'GER';
    case 'ARA': return 'ARA';
    default: return canonicalKey.slice(0, 4);
  }
};

export const getCanonicalName = (canonicalKey: string, fallbackName?: string): string => {
  switch (canonicalKey) {
    case 'ENG': return 'English Language Activities';
    case 'REA': return 'English Reading Activities';
    case 'MATH': return 'Mathematical Activities';
    case 'KISW': return 'Kiswahili Language Activities';
    case 'KUSO': return 'Kusoma Activities';
    case 'ENVI': return 'Environmental Activities';
    case 'CRE': return 'Christian Religious Education';
    case 'CREA': return 'Creative Arts Activities';
    case 'SCI': return 'Science and Technology';
    case 'SST': return 'Social Studies';
    case 'AGRI': return 'Agriculture & Nutrition';
    case 'ARTS': return 'Creative Arts & Sports';
    case 'PRETECH': return 'Pre-Technical Studies';
    case 'HLTH': return 'Health Education';
    case 'BUS': return 'Business Studies';
    case 'COMP': return 'Computer Science';
    case 'FRE': return 'French';
    case 'GER': return 'German';
    case 'ARA': return 'Arabic';
    default: return fallbackName || canonicalKey;
  }
};

export const getSubjectInitials = (nameOrCode: string): string => {
  const key = getSubjectCanonicalKey(nameOrCode);
  return getCanonicalInitial(key);
};

export const CANONICAL_ORDER = [
  'ENG',
  'REA',
  'MATH',
  'KISW',
  'KUSO',
  'ENVI',
  'CRE',
  'CREA',
  'SCI',
  'SST',
  'AGRI',
  'ARTS',
  'PRETECH',
  'HLTH',
  'BUS',
  'COMP',
  'FRE',
  'GER',
  'ARA',
  'IND',
];

const DEFAULT_CBC_SUBJECTS: BackendLearningArea[] = [
  { id: 'la-g3-eng', code: 'ENG', name: 'English Language Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-rea', code: 'REA', name: 'English Reading Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-mat', code: 'MAT', name: 'Mathematical Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-kis', code: 'KIS', name: 'Kiswahili Language Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-wku', code: 'KUSO', name: 'Kusoma Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-senv', code: 'ENVI', name: 'Environmental Activities', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-cre', code: 'CRE', name: 'Christian Religious Education', gradeLevel: 'GRADE_3' } as any,
  { id: 'la-g3-crea', code: 'CREA', name: 'Creative Arts Activities', gradeLevel: 'GRADE_3' } as any,
];

export const SummativeAssessmentsView: React.FC<SummativeAssessmentsViewProps> = ({
  students = [],
  learningAreas = [],
  onOpenUploadMarks,
  onNavigateTab,
}) => {
  const [summatives, setSummatives] = useState<BackendSummativeAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('All');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [allLearningAreas, setAllLearningAreas] = useState<BackendLearningArea[]>(learningAreas);
  const [internalStudents, setInternalStudents] = useState<Student[]>(students);

  useEffect(() => {
    if (students && students.length > 0) {
      setInternalStudents(students);
    } else {
      apiService
        .getStudents()
        .then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const mapped: Student[] = res.data.map((st: any) => ({
              id: st.id,
              admNo: st.admissionNumber || st.admNo || '--',
              name: st.name || st.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Learner',
              grade: st.className || (st.gradeLevel ? st.gradeLevel.replace(/_/g, ' ') : 'Grade 3'),
              stream: st.streamName || st.stream || 'Grade 3',
              gender:
                (st.gender || 'M').toUpperCase().startsWith('F') ||
                (st.gender || 'M').toUpperCase().startsWith('G')
                  ? 'Girl'
                  : 'Boy',
              classroomId: st.classroomId,
              gradeLevel: st.gradeLevel,
              status: st.status || 'Active',
              upi: st.upiNumber || '--',
              nemis: st.upiNumber || '--',
              guardianName: st.guardianName || '--',
              guardianPhone: st.guardianPhone || '--',
              feeBalance: 0,
              totalFee: 0,
              attendanceRate: 100,
              CBCRating: 'ME' as any,
            }));
            setInternalStudents(mapped);
          }
        })
        .catch(() => {});
    }
  }, [students]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [yearsRes, classesRes, laRes] = await Promise.allSettled([
          apiService.getAcademicYears(),
          apiService.getClasses(),
          learningAreas.length > 0 ? Promise.resolve({ data: learningAreas }) : apiService.getLearningAreas(),
        ]);

        let activeYrId = '';
        if (yearsRes.status === 'fulfilled' && yearsRes.value?.data) {
          const yrs = yearsRes.value.data;
          setAcademicYears(yrs);
          const currentYr = yrs.find((y: any) => y.isCurrent) || yrs[0];
          if (currentYr) {
            activeYrId = currentYr.id;
            setSelectedYearId(currentYr.id);
            if (currentYr.terms && currentYr.terms.length > 0) {
              setTerms(currentYr.terms);
              const currentT = currentYr.terms.find((t: any) => t.isCurrent) || currentYr.terms[0];
              if (currentT) setSelectedTermId(currentT.id);
            }
          }
        }

        if (classesRes.status === 'fulfilled' && classesRes.value?.data) {
          setClasses(classesRes.value.data);
        }

        if (laRes.status === 'fulfilled' && laRes.value?.data && laRes.value.data.length > 0) {
          setAllLearningAreas(laRes.value.data);
        } else if (allLearningAreas.length === 0) {
          setAllLearningAreas(DEFAULT_CBC_SUBJECTS);
        }

        const termsRes = await apiService.getTerms(activeYrId || undefined).catch(() => null);
        if (termsRes?.data && termsRes.data.length > 0) {
          setTerms(termsRes.data);
          const activeTerm =
            termsRes.data.find((t: any) => t.isCurrent) ||
            termsRes.data.find((t: any) => t.name.toLowerCase().includes('term 3')) ||
            termsRes.data[termsRes.data.length - 1];
          if (activeTerm) {
            setSelectedTermId(activeTerm.id);
          }
        }
      } catch (err) {
        console.error('Failed to load metadata in SummativeAssessmentsView', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    if (!selectedYearId || academicYears.length === 0) return;
    const yr = academicYears.find((y) => y.id === selectedYearId);
    if (yr?.terms && yr.terms.length > 0) {
      setTerms(yr.terms);
      if (!yr.terms.some((t) => t.id === selectedTermId)) {
        const curr = yr.terms.find((t) => t.isCurrent) || yr.terms[0];
        setSelectedTermId(curr?.id || '');
      }
    } else {
      apiService
        .getTerms(selectedYearId)
        .then((res) => {
          if (res?.data && res.data.length > 0) {
            setTerms(res.data);
            if (!res.data.some((t) => t.id === selectedTermId)) {
              const curr =
                res.data.find((t) => t.isCurrent) ||
                res.data.find((t) => t.name.toLowerCase().includes('term 3')) ||
                res.data[0];
              setSelectedTermId(curr?.id || '');
            }
          }
        })
        .catch(() => {});
    }
  }, [selectedYearId, academicYears]);

  const fetchSummatives = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.listSummatives({
        academicYearId: selectedYearId || undefined,
        termId: selectedTermId || undefined,
      });

      let loaded = res?.data && Array.isArray(res.data) ? res.data : [];

      if (loaded.length === 0 && selectedTermId) {
        const altTermId = selectedTermId.includes('-t')
          ? selectedTermId.replace('-t', '-')
          : selectedTermId.replace(/-(\d)$/, '-t$1');
        const altRes = await apiService
          .listSummatives({
            academicYearId: selectedYearId || undefined,
            termId: altTermId,
          })
          .catch(() => null);
        if (altRes?.data && Array.isArray(altRes.data) && altRes.data.length > 0) {
          loaded = altRes.data;
        }
      }

      setSummatives(loaded);
    } catch (err: any) {
      console.error('Error fetching summatives:', err);
      setError(err.message || 'Failed to load summative assessments');
      setSummatives([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummatives();
  }, [selectedYearId, selectedTermId]);

  const effectiveSubjects: CanonicalSubjectItem[] = useMemo(() => {
    let sourceList: BackendLearningArea[] = [];
    if (selectedClassId !== 'All') {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls && cls.gradeLevel) {
        const matching = allLearningAreas.filter(
          (la: any) => la.gradeLevel === cls.gradeLevel || la.grade_level === cls.gradeLevel
        );
        if (matching.length > 0) {
          sourceList = matching;
        }
      }
    }

    if (sourceList.length === 0) {
      if (summatives.length > 0) {
        const assessedLaIds = new Set(summatives.map((s) => s.learningAreaId.toLowerCase()));
        const matchingFromAll = allLearningAreas.filter(
          (la) =>
            assessedLaIds.has(la.id.toLowerCase()) ||
            assessedLaIds.has((la.code || '').toLowerCase()) ||
            assessedLaIds.has(getSubjectCanonicalKey(la.id).toLowerCase())
        );
        if (matchingFromAll.length > 0) {
          sourceList = matchingFromAll;
        }
      }
      if (sourceList.length === 0) {
        sourceList = allLearningAreas.length > 0 ? allLearningAreas : DEFAULT_CBC_SUBJECTS;
      }
    }

    const canonicalMap = new Map<string, {
      id: string;
      key: string;
      code: string;
      name: string;
      initial: string;
      aliasSet: Set<string>;
    }>();

    sourceList.forEach((la) => {
      const key = getSubjectCanonicalKey(`${la.code || ''} ${la.name || ''} ${la.id || ''}`);
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, {
          id: key,
          key,
          code: getCanonicalInitial(key),
          name: getCanonicalName(key, la.name),
          initial: getCanonicalInitial(key),
          aliasSet: new Set([la.id, la.code, la.name, key].filter(Boolean) as string[]),
        });
      } else {
        const item = canonicalMap.get(key)!;
        item.aliasSet.add(la.id);
        if (la.code) item.aliasSet.add(la.code);
        if (la.name) item.aliasSet.add(la.name);
      }
    });

    allLearningAreas.forEach((la) => {
      const key = getSubjectCanonicalKey(`${la.code || ''} ${la.name || ''} ${la.id || ''}`);
      if (canonicalMap.has(key)) {
        const item = canonicalMap.get(key)!;
        item.aliasSet.add(la.id);
        if (la.code) item.aliasSet.add(la.code);
        if (la.name) item.aliasSet.add(la.name);
      }
    });

    summatives.forEach((s) => {
      const key = getSubjectCanonicalKey(s.learningAreaId);
      if (canonicalMap.has(key)) {
        canonicalMap.get(key)!.aliasSet.add(s.learningAreaId);
      } else if (selectedClassId === 'All') {
        canonicalMap.set(key, {
          id: key,
          key,
          code: getCanonicalInitial(key),
          name: getCanonicalName(key, s.learningAreaId),
          initial: getCanonicalInitial(key),
          aliasSet: new Set([s.learningAreaId, key]),
        });
      }
    });

    const list = Array.from(canonicalMap.values()).map((c) => ({
      id: c.id,
      key: c.key,
      code: c.code,
      name: c.name,
      initial: c.initial,
      aliasIds: Array.from(c.aliasSet),
    }));

    list.sort((a, b) => {
      const idxA = CANONICAL_ORDER.indexOf(a.key);
      const idxB = CANONICAL_ORDER.indexOf(b.key);
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      return rankA - rankB;
    });

    return list;
  }, [allLearningAreas, selectedClassId, classes, summatives]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      c.streams?.forEach((st) => set.add(st.name));
    });
    internalStudents.forEach((s) => {
      if (s.stream) set.add(s.stream);
    });
    return Array.from(set).sort();
  }, [classes, internalStudents]);

  const getScoreInfo = (s?: BackendSummativeAssessment) => {
    if (!s) return { score: 0, level: '--', points: 0, hasMark: false };

    let score = -1;
    if (s.strandScores && s.strandScores.length > 0) {
      let totalRaw = 0;
      let totalMax = 0;
      s.strandScores.forEach((st) => {
        if (st.rawScore !== undefined && st.maxScore) {
          totalRaw += st.rawScore;
          totalMax += st.maxScore;
        }
      });
      if (totalMax > 0) {
        score = Math.round((totalRaw / totalMax) * 100);
      } else if (s.strandScores[0]?.rawScore !== undefined) {
        score = s.strandScores[0].rawScore;
      }
    }

    if (score === -1) {
      switch (s.overallPerformanceLevel) {
        case 'EE': score = 85; break;
        case 'ME': score = 70; break;
        case 'AE': score = 55; break;
        case 'BE': score = 40; break;
        default: score = 0; break;
      }
    }

    const level = s.overallPerformanceLevel || (score >= 80 ? 'EE' : score >= 65 ? 'ME' : score >= 50 ? 'AE' : 'BE');
    const points = level === 'EE' ? 4 : level === 'ME' ? 3 : level === 'AE' ? 2 : 1;

    return { score, level, points, hasMark: true };
  };

  const matrixRows = useMemo(() => {
    const studentSummativeMap = new Map<string, Map<string, BackendSummativeAssessment>>();
    summatives.forEach((s) => {
      if (!studentSummativeMap.has(s.studentId)) {
        studentSummativeMap.set(s.studentId, new Map());
      }
      const sMap = studentSummativeMap.get(s.studentId)!;
      sMap.set(s.learningAreaId, s);
      sMap.set(s.learningAreaId.toLowerCase(), s);

      const canon = getSubjectCanonicalKey(s.learningAreaId);
      if (!sMap.has(canon)) {
        sMap.set(canon, s);
      }
    });

    const candidateMap = new Map<string, Student>();
    internalStudents.forEach((st) => candidateMap.set(st.id, st));

    summatives.forEach((s) => {
      if (!candidateMap.has(s.studentId)) {
        candidateMap.set(s.studentId, {
          id: s.studentId,
          admNo: (s as any).admissionNumber || '--',
          name: (s as any).studentName || 'Learner',
          grade: (s as any).gradeLevel || 'Grade 3',
          stream: (s as any).streamName || 'Grade 3',
          gender: 'M',
        } as any);
      }
    });

    let candidates = Array.from(candidateMap.values());

    if (selectedClassId !== 'All') {
      const cls = classes.find((c) => c.id === selectedClassId);
      candidates = candidates.filter((st) => {
        if (!cls) return true;
        const matchesClassId = st.classroomId === selectedClassId;
        const g = (st.grade || '').toLowerCase();
        const sLevel = (st.gradeLevel || '').toLowerCase();
        const clsName = cls.name?.toLowerCase() || '';
        const gradeText = cls.gradeLevel?.replace(/_/g, ' ').toLowerCase() || '';
        return matchesClassId || g.includes(clsName) || g.includes(gradeText) || sLevel.includes(gradeText);
      });
    }

    if (selectedStream !== 'All') {
      candidates = candidates.filter((st) => (st.stream || '').toLowerCase() === selectedStream.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      candidates = candidates.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.admNo.toLowerCase().includes(q) ||
          (st.stream && st.stream.toLowerCase().includes(q))
      );
    }

    const rows = candidates.map((st) => {
      const studentRecords = studentSummativeMap.get(st.id);
      let totalMarks = 0;
      let totalPoints = 0;
      let subjectCount = 0;

      const subjectScores: Record<
        string,
        { score: number; level: string; points: number; hasMark: boolean; recordId?: string }
      > = {};

      effectiveSubjects.forEach((sub) => {
        let record: BackendSummativeAssessment | undefined;
        if (studentRecords) {
          for (const alias of sub.aliasIds) {
            if (studentRecords.has(alias)) {
              record = studentRecords.get(alias);
              break;
            }
          }
          if (!record) {
            record = studentRecords.get(sub.id) || studentRecords.get(sub.key) || studentRecords.get(sub.code);
          }
        }

        const info = getScoreInfo(record);
        subjectScores[sub.id] = {
          ...info,
          recordId: record?.id,
        };

        if (info.hasMark) {
          totalMarks += info.score;
          totalPoints += info.points;
          subjectCount++;
        }
      });

      const meanScore = subjectCount > 0 ? Math.round(totalMarks / subjectCount) : 0;
      const meanGpa = subjectCount > 0 ? (totalPoints / subjectCount).toFixed(1) : '0.0';
      const overallLevel =
        meanScore >= 80 ? 'EE' : meanScore >= 65 ? 'ME' : meanScore >= 50 ? 'AE' : subjectCount > 0 ? 'BE' : '--';

      let remark = 'Exceeding curriculum competency standards with exceptional subject mastery.';
      if (overallLevel === 'ME') remark = 'Consistently meets grade-level competencies with solid performance.';
      else if (overallLevel === 'AE') remark = 'Approaching expected standards. Encouraged to improve in revision areas.';
      else if (overallLevel === 'BE') remark = 'Requires academic intervention and structured remedial support in core areas.';
      else if (overallLevel === '--') remark = 'No exam marks recorded for this academic period.';

      const gRaw = (st.gender || 'M').toUpperCase();
      const gender = (gRaw.startsWith('F') || gRaw.startsWith('G')) ? 'F' : 'M';

      return {
        studentId: st.id,
        admNo: st.admNo || 'ADM',
        name: st.name || 'Learner',
        grade: st.grade || 'Grade 3',
        stream: st.stream || 'Grade 3',
        gender,
        student: st,
        subjectScores,
        totalMarks,
        meanScore,
        meanGpa,
        overallLevel,
        subjectCount,
        remark,
        rank: 0,
      };
    });

    rows.sort((a, b) => b.totalMarks - a.totalMarks);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    return rows;
  }, [summatives, internalStudents, effectiveSubjects, classes, selectedClassId, selectedStream, searchQuery]);

  const summaryStats = useMemo(() => {
    const totalLearners = matrixRows.length;
    const evaluatedLearners = matrixRows.filter((r) => r.subjectCount > 0);
    const evalCount = evaluatedLearners.length;

    if (evalCount === 0) {
      return {
        total: totalLearners,
        evalCount: 0,
        meanScore: 0,
        passRate: 0,
        eeCount: 0,
        meCount: 0,
        aeCount: 0,
        beCount: 0,
      };
    }

    const totalMeanSum = evaluatedLearners.reduce((acc, r) => acc + r.meanScore, 0);
    const meanScore = Math.round(totalMeanSum / evalCount);

    const eeCount = evaluatedLearners.filter((r) => r.overallLevel === 'EE').length;
    const meCount = evaluatedLearners.filter((r) => r.overallLevel === 'ME').length;
    const aeCount = evaluatedLearners.filter((r) => r.overallLevel === 'AE').length;
    const beCount = evaluatedLearners.filter((r) => r.overallLevel === 'BE').length;
    const passRate = Math.round(((eeCount + meCount) / evalCount) * 100);

    return {
      total: totalLearners,
      evalCount,
      meanScore,
      passRate,
      eeCount,
      meCount,
      aeCount,
      beCount,
    };
  }, [matrixRows]);

  const subjectAverages = useMemo(() => {
    const averages: Record<string, { mean: number; count: number }> = {};

    effectiveSubjects.forEach((sub) => {
      let sum = 0;
      let count = 0;
      matrixRows.forEach((row) => {
        const item = row.subjectScores[sub.id];
        if (item && item.hasMark) {
          sum += item.score;
          count++;
        }
      });
      averages[sub.id] = {
        mean: count > 0 ? Math.round(sum / count) : 0,
        count,
      };
    });

    return averages;
  }, [effectiveSubjects, matrixRows]);

  const handleExportMatrixCSV = () => {
    if (matrixRows.length === 0) return;

    const headers = ['Pos', 'Adm No', 'Learner Full Name', 'Class / Cohort', 'Stream', 'Sex'];
    effectiveSubjects.forEach((sub) => {
      headers.push(`${getSubjectInitials(sub.code || sub.name)} (%)`);
      headers.push(`${getSubjectInitials(sub.code || sub.name)} (Lvl)`);
    });
    headers.push('Total Marks', 'Mean %', 'GPA', 'Level', 'Teacher Evaluation Remarks');

    const lines: string[] = [];
    lines.push('GRACE SEEDS SCHOOL - SUMMATIVE EXAMINATION MARKSHEET MATRIX');
    lines.push('KEMRI Street, Kisian, Kisumu, Kenya · Tel: 0745436312 · Email: schoolgraceseeds@gmail.com');
    lines.push(`Academic Term: ${selectedTermId}, Year: ${selectedYearId}, Exported: ${new Date().toLocaleDateString('en-KE')}`);
    lines.push('');
    lines.push(headers.join(','));

    matrixRows.forEach((r, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        `"${r.admNo}"`,
        `"${r.name}"`,
        `"${r.grade}"`,
        `"${r.stream}"`,
        `"${r.gender}"`,
      ];

      effectiveSubjects.forEach((sub) => {
        const cell = r.subjectScores[sub.id];
        if (cell && cell.hasMark) {
          row.push(cell.score);
          row.push(`"${cell.level}"`);
        } else {
          row.push(0);
          row.push('"--"');
        }
      });

      row.push(r.totalMarks);
      row.push(`${r.meanScore}%`);
      row.push(r.meanGpa);
      row.push(`"${r.overallLevel}"`);
      row.push(`"${r.remark.replace(/"/g, '""')}"`);

      lines.push(row.join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Summative_Marksheet_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelPill = (level: string) => {
    switch (level) {
      case 'EE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">EE</span>;
      case 'ME':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-300">ME</span>;
      case 'AE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">AE</span>;
      case 'BE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">BE</span>;
      default:
        return <span className="text-gray-400 font-mono text-[9px]">--</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 font-bold';
    if (score >= 65) return 'text-blue-700 font-bold';
    if (score >= 50) return 'text-amber-700 font-semibold';
    return 'text-rose-700 font-semibold';
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-200 uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-sm">school</span>
            Academics / CBE Assessment System / Summative Marksheet
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[32px] text-rose-200">grid_on</span>
            <span>Summative Marksheet Matrix (Exams &amp; Tests)</span>
          </h1>
          <p className="text-xs md:text-sm text-rose-100/90 mt-1 max-w-2xl leading-relaxed">
            Side-by-side learner exam marksheet matrix: learners arranged in rows with subject initials in columns for quick terminal mark entry and performance tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('broadsheets')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              title="Open full class rankings and comparative broadsheet"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Master Broadsheet</span>
            </button>
          )}

          <button
            onClick={handleExportMatrixCSV}
            disabled={matrixRows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Matrix CSV</span>
          </button>

          <button
            onClick={onOpenUploadMarks}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-rose-50 text-[#7a1228] text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>Record Exam Marks</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Enrolled Learners
            </span>
            <div className="text-2xl font-black text-gray-900 font-data-mono mt-1">
              {summaryStats.total}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {summaryStats.evalCount} evaluated with marks
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">groups</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Class Mean Score
            </span>
            <div className="text-2xl font-black text-[#7a1228] font-data-mono mt-1">
              {summaryStats.meanScore}%
            </div>
            <span className="text-[10px] text-gray-400">Mean composite score</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#7a1228] border border-rose-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">trending_up</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Quality Pass Rate
            </span>
            <div className="text-2xl font-black text-emerald-700 font-data-mono mt-1">
              {summaryStats.passRate}%
            </div>
            <span className="text-[10px] text-gray-400">EE ({summaryStats.eeCount}) + ME ({summaryStats.meCount})</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Subjects Tracked
            </span>
            <div className="text-2xl font-black text-indigo-700 font-data-mono mt-1">
              {effectiveSubjects.length}
            </div>
            <span className="text-[10px] text-gray-400">CBE Learning Areas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Academic Year
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              {academicYears.map((yr) => (
                <option key={yr.id} value={yr.id}>
                  Year {yr.name || yr.id} {yr.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Academic Term
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Class / Grade
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              <option value="All">All Grades &amp; Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Stream / Cohort
            </label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              <option value="All">All Streams</option>
              {availableStreams.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-outline-variant/20">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Filter by learner name, admission number, stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low text-xs rounded-lg border border-outline-variant/30 text-on-surface focus:outline-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSummatives}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Manually refresh marksheet"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>Refresh</span>
            </button>
            <div className="text-xs font-medium text-gray-500">
              Showing <strong>{matrixRows.length}</strong> learners across <strong>{effectiveSubjects.length}</strong> subject columns
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
            <span className="text-xs font-semibold">Compiling summative marksheet matrix...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-700 bg-rose-50/50 p-6">
            <span className="material-symbols-outlined text-3xl mb-2">error</span>
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={fetchSummatives}
              className="mt-3 px-4 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-bold hover:bg-rose-800"
            >
              Retry
            </button>
          </div>
        ) : matrixRows.length === 0 ? (
          <div className="py-16 text-center p-6">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-[#7a1228] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl">grid_on</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              No Learners Found
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4 leading-relaxed">
              No student records matched the selected cohort filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-800 border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
                  <th className="py-3 px-2 border text-center w-12 bg-gray-200/80">Pos</th>
                  <th className="py-3 px-2 border w-24">Adm No</th>
                  <th className="py-3 px-3 border min-w-[140px]">Learner Full Name</th>
                  <th className="py-3 px-2 border text-center w-16">Stream</th>
                  <th className="py-3 px-2 border text-center w-10">Sex</th>

                  {effectiveSubjects.map((sub) => {
                    const initial = getSubjectInitials(sub.code || sub.name);
                    return (
                      <th
                        key={sub.id}
                        className="py-2.5 px-2 border text-center min-w-[70px] bg-rose-50/40 hover:bg-rose-100/40 transition-colors"
                        title={sub.name}
                      >
                        <div className="font-black text-xs text-[#7a1228] font-mono tracking-wider">
                          {initial}
                        </div>
                        <div className="text-[9px] text-gray-500 font-medium truncate max-w-[65px] mx-auto">
                          {sub.name}
                        </div>
                      </th>
                    );
                  })}

                  <th className="py-3 px-2 border text-center w-16 bg-gray-200/60">Total</th>
                  <th className="py-3 px-2 border text-center w-16 bg-gray-200/60">Mean %</th>
                  <th className="py-3 px-2 border text-center w-14 bg-indigo-50/70 text-indigo-950">GPA</th>
                  <th className="py-3 px-2 border text-center w-14 bg-indigo-50/70 text-indigo-950">Level</th>
                  <th className="py-3 px-3 border min-w-[170px]">Progress Remarks</th>
                  <th className="py-3 px-2 border text-right w-16 print:hidden">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 font-medium">
                {matrixRows.map((row, idx) => (
                  <tr key={row.studentId} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2 px-2 border text-center font-bold font-mono text-gray-900 bg-gray-50/50">
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `#${idx + 1}`}
                    </td>

                    <td className="py-2 px-2 border font-mono font-bold text-[11px] text-gray-700">
                      {row.admNo}
                    </td>

                    <td className="py-2 px-3 border font-bold text-gray-900">
                      <div>{row.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{row.grade}</div>
                    </td>

                    <td className="py-2 px-2 border text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {row.stream}
                      </span>
                    </td>

                    <td className="py-2 px-2 border text-center font-bold text-gray-600">
                      {row.gender}
                    </td>

                    {effectiveSubjects.map((sub) => {
                      const cell = row.subjectScores[sub.id];
                      return (
                        <td key={sub.id} className="py-2 px-1.5 border text-center">
                          {cell && cell.hasMark ? (
                            <div className="space-y-0.5">
                              <div className={`font-mono text-xs ${getScoreColor(cell.score)}`}>
                                {cell.score}%
                              </div>
                              <div>{getLevelPill(cell.level)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-300 font-mono text-xs">--</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-2 border text-center font-bold font-mono text-gray-900 bg-gray-50/40">
                      {row.totalMarks}
                    </td>

                    <td className="py-2 px-2 border text-center font-black font-mono text-sm bg-gray-50/40">
                      <span className={getScoreColor(row.meanScore)}>
                        {row.meanScore}%
                      </span>
                    </td>

                    <td className="py-2 px-2 border text-center font-black font-mono text-xs text-indigo-950 bg-indigo-50/20">
                      {row.meanGpa}
                    </td>

                    <td className="py-2 px-2 border text-center bg-indigo-50/20">
                      {getLevelPill(row.overallLevel)}
                    </td>

                    <td className="py-2 px-3 border text-gray-600 text-[11px] truncate max-w-xs italic" title={row.remark}>
                      &quot;{row.remark}&quot;
                    </td>

                    <td className="py-2 px-2 border text-right print:hidden">
                      <div className="inline-flex items-center gap-1">
                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('report-cards')}
                            title="View Student Report Card"
                            className="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">article</span>
                          </button>
                        )}
                        <button
                          onClick={onOpenUploadMarks}
                          title="Record / Update Marks"
                          className="p-1 rounded text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-800 text-[11px]">
                  <td colSpan={5} className="py-2.5 px-3 border text-right uppercase tracking-wider text-gray-600">
                    Subject Class Averages:
                  </td>

                  {effectiveSubjects.map((sub) => {
                    const avg = subjectAverages[sub.id];
                    return (
                      <td key={sub.id} className="py-2.5 px-1.5 border text-center bg-rose-50/60 font-mono">
                        <div className={`font-black ${getScoreColor(avg?.mean || 0)}`}>
                          {avg && avg.count > 0 ? `${avg.mean}%` : '--'}
                        </div>
                        <div className="text-[8px] text-gray-500 font-normal">
                          {avg?.count || 0} sat
                        </div>
                      </td>
                    );
                  })}

                  <td colSpan={6} className="py-2.5 px-3 border text-gray-600 text-xs">
                    Overall Cohort Mean: <strong className="text-[#7a1228] font-mono text-sm">{summaryStats.meanScore}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};