import React, { useState, useEffect, useMemo } from 'react';
import { apiService, MarksTemplateResult, MarksValidationResult, MarksCommitResult } from '../../services/api';
import {
  Student,
  BackendLearningArea,
  BackendStrand,
  BackendSubStrand,
  ClassRoom,
  StreamItem,
  AcademicYear,
  AcademicTerm,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { resolveStreamName, resolveGradeName, resolveAcademicYearName } from '../../utils/formatters';
import {
  CanonicalSubjectItem,
  getSubjectCanonicalKey,
  getCanonicalInitial,
  getCanonicalName,
  CANONICAL_ORDER,
} from '../views/SummativeAssessmentsView';

export const getSubjectInitials = (nameOrCode: string): string => {
  const key = getSubjectCanonicalKey(nameOrCode);
  return getCanonicalInitial(key);
};

export const getStandardRemark = (level: 'EE' | 'ME' | 'AE' | 'BE'): string => {
  switch (level) {
    case 'EE':
      return 'Exceeds expected curriculum competencies. Demonstrates exemplary conceptual understanding, high accuracy, and creative problem solving.';
    case 'ME':
      return 'Meets expected CBC learning competencies effectively. Demonstrates solid conceptual comprehension and consistent skill application.';
    case 'AE':
      return 'Approaching expected learning competencies. Grasps basic concepts but benefits from guided practice and reinforcement.';
    case 'BE':
      return 'Below expected competency level. Requires structured scaffolding, intensive teacher remediation, and guided interventions.';
  }
};

export interface SubjectMarkEntry {
  rawScore: string;
  maxScore: string;
  remarks: string;
  isCustomRemark: boolean;
}

interface UploadMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarksUploaded?: (msg?: string) => void;
  initialStudent?: Student;
  initialAssessmentType?: 'SUMMATIVE' | 'FORMATIVE';
}

const DEFAULT_CBC_LEARNING_AREAS: BackendLearningArea[] = [
  { id: 'la-mat', code: 'MATH', name: 'Mathematics' } as any,
  { id: 'la-eng', code: 'ENG', name: 'English Language' } as any,
  { id: 'la-rea', code: 'REA', name: 'English Reading Activities' } as any,
  { id: 'la-kis', code: 'KISW', name: 'Kiswahili Language' } as any,
  { id: 'la-kuso', code: 'KUSO', name: 'Kusoma Activities' } as any,
  { id: 'la-envi', code: 'ENVI', name: 'Environmental Activities' } as any,
  { id: 'la-sci', code: 'SCI', name: 'Science and Technology' } as any,
  { id: 'la-soc', code: 'SST', name: 'Social Studies' } as any,
  { id: 'la-cre', code: 'CRE', name: 'Christian Religious Education' } as any,
  { id: 'la-crea', code: 'CREA', name: 'Creative Arts Activities' } as any,
  { id: 'la-agr', code: 'AGRI', name: 'Agriculture & Nutrition' } as any,
  { id: 'la-art', code: 'ARTS', name: 'Creative Arts & Sports' } as any,
  { id: 'la-pret', code: 'PRETECH', name: 'Pre-Technical Studies' } as any,
];

interface DefaultStrandItem {
  id: string;
  code: string;
  title: string;
  subStrands: { id: string; code: string; title: string }[];
}

const DEFAULT_STRANDS_MAP: Record<string, DefaultStrandItem[]> = {
  MATH: [
    {
      id: 'str-math-num',
      code: 'STR-M01',
      title: 'Numbers & Operations',
      subStrands: [
        { id: 'sub-m01-1', code: 'SUB-M1', title: 'Whole Numbers & Place Value' },
        { id: 'sub-m01-2', code: 'SUB-M2', title: 'Fractions, Decimals & Percentages' },
        { id: 'sub-m01-3', code: 'SUB-M3', title: 'Basic Operations & Word Problems' },
      ],
    },
    {
      id: 'str-math-meas',
      code: 'STR-M02',
      title: 'Measurement & Geometry',
      subStrands: [
        { id: 'sub-m02-1', code: 'SUB-M4', title: 'Length, Perimeter & Area' },
        { id: 'sub-m02-2', code: 'SUB-M5', title: 'Mass, Capacity & Volume' },
        { id: 'sub-m02-3', code: 'SUB-M6', title: '2D & 3D Geometric Figures' },
      ],
    },
    {
      id: 'str-math-data',
      code: 'STR-M03',
      title: 'Data Handling & Algebra',
      subStrands: [
        { id: 'sub-m03-1', code: 'SUB-M7', title: 'Tables, Bar Graphs & Interpretation' },
        { id: 'sub-m03-2', code: 'SUB-M8', title: 'Algebraic Expressions & Simple Equations' },
      ],
    },
  ],
  ENG: [
    {
      id: 'str-eng-oral',
      code: 'STR-E01',
      title: 'Listening and Speaking',
      subStrands: [
        { id: 'sub-e01-1', code: 'SUB-E1', title: 'Pronunciation & Phonics' },
        { id: 'sub-e01-2', code: 'SUB-E2', title: 'Conversational Fluency & Etiquette' },
      ],
    },
    {
      id: 'str-eng-read',
      code: 'STR-E02',
      title: 'Reading and Comprehension',
      subStrands: [
        { id: 'sub-e02-1', code: 'SUB-E3', title: 'Extensive & Intensive Reading' },
        { id: 'sub-e02-2', code: 'SUB-E4', title: 'Context Clues & Vocabulary' },
      ],
    },
    {
      id: 'str-eng-writ',
      code: 'STR-E03',
      title: 'Language Structures and Writing',
      subStrands: [
        { id: 'sub-e03-1', code: 'SUB-E5', title: 'Grammar, Tenses & Punctuation' },
        { id: 'sub-e03-2', code: 'SUB-E6', title: 'Creative Composition & Letter Writing' },
      ],
    },
  ],
  KISW: [
    {
      id: 'str-kisw-kusikiliza',
      code: 'STR-K01',
      title: 'Kusikiliza na Kuzungumza',
      subStrands: [
        { id: 'sub-k01-1', code: 'SUB-K1', title: 'Matamshi na Maamkizi' },
        { id: 'sub-k01-2', code: 'SUB-K2', title: 'Mazungumzo na Mijadala' },
      ],
    },
    {
      id: 'str-kisw-kusoma',
      code: 'STR-K02',
      title: 'Kusoma na Ufahamu',
      subStrands: [
        { id: 'sub-k02-1', code: 'SUB-K3', title: 'Ufahamu wa Kifungu' },
        { id: 'sub-k02-2', code: 'SUB-K4', title: 'Kusoma kwa Ufasaha' },
      ],
    },
    {
      id: 'str-kisw-sarufi',
      code: 'STR-K03',
      title: 'Sarufi na Kuandika',
      subStrands: [
        { id: 'sub-k03-1', code: 'SUB-K5', title: 'Ngeli za Nomino na Nyakati' },
        { id: 'sub-k03-2', code: 'SUB-K6', title: 'Insha na Utungaji' },
      ],
    },
  ],
  SCI: [
    {
      id: 'str-sci-living',
      code: 'STR-S01',
      title: 'Living Things & Environment',
      subStrands: [
        { id: 'sub-s01-1', code: 'SUB-S1', title: 'Human Body Systems & Health' },
        { id: 'sub-s01-2', code: 'SUB-S2', title: 'Plants and Animals Classification' },
      ],
    },
    {
      id: 'str-sci-matter',
      code: 'STR-S02',
      title: 'Matter and Physical World',
      subStrands: [
        { id: 'sub-s02-1', code: 'SUB-S3', title: 'States of Matter & Properties' },
        { id: 'sub-s02-2', code: 'SUB-S4', title: 'Forces, Energy & Simple Machines' },
      ],
    },
  ],
  SOC: [
    {
      id: 'str-soc-env',
      code: 'STR-SC01',
      title: 'Physical Environment & Resources',
      subStrands: [
        { id: 'sub-sc01-1', code: 'SUB-SC1', title: 'Weather, Climate & Landforms' },
        { id: 'sub-sc01-2', code: 'SUB-SC2', title: 'Community Resources & Conservation' },
      ],
    },
    {
      id: 'str-soc-citizen',
      code: 'STR-SC02',
      title: 'Citizenship, Culture & Governance',
      subStrands: [
        { id: 'sub-sc02-1', code: 'SUB-SC3', title: 'National Symbols & Leadership' },
        { id: 'sub-sc02-2', code: 'SUB-SC4', title: 'Rights, Duties and Responsibilities' },
      ],
    },
  ],
  CRE: [
    {
      id: 'str-cre-creation',
      code: 'STR-C01',
      title: 'Creation and Moral Teachings',
      subStrands: [
        { id: 'sub-c01-1', code: 'SUB-C1', title: 'Biblical / Religious Narratives' },
        { id: 'sub-c01-2', code: 'SUB-C2', title: 'Living Harmoniously with Others' },
      ],
    },
  ],
  ARTS: [
    {
      id: 'str-arts-creative',
      code: 'STR-A01',
      title: 'Visual Arts and Crafts',
      subStrands: [
        { id: 'sub-a01-1', code: 'SUB-A1', title: 'Drawing, Painting & Collage' },
        { id: 'sub-a01-2', code: 'SUB-A2', title: 'Sculpture, Weaving & Modelling' },
      ],
    },
    {
      id: 'str-arts-music',
      code: 'STR-A02',
      title: 'Music, Dance and Athletics',
      subStrands: [
        { id: 'sub-a02-1', code: 'SUB-A3', title: 'Folk Songs & Instruments' },
        { id: 'sub-a02-2', code: 'SUB-A4', title: 'Movement Skills & Ball Games' },
      ],
    },
  ],
  AGRI: [
    {
      id: 'str-agri-crops',
      code: 'STR-AG01',
      title: 'Crop & Animal Production',
      subStrands: [
        { id: 'sub-ag01-1', code: 'SUB-AG1', title: 'Soil Preparation & Gardening' },
        { id: 'sub-ag01-2', code: 'SUB-AG2', title: 'Domestic Animal Care' },
      ],
    },
    {
      id: 'str-agri-nutr',
      code: 'STR-AG02',
      title: 'Food Preparation & Safety',
      subStrands: [
        { id: 'sub-ag02-1', code: 'SUB-AG3', title: 'Healthy Meals & Kitchen Hygiene' },
      ],
    },
  ],
  PTECH: [
    {
      id: 'str-pt-drawing',
      code: 'STR-PT01',
      title: 'Materials, Tools & Drawing',
      subStrands: [
        { id: 'sub-pt01-1', code: 'SUB-PT1', title: 'Simple Hand Tools & Workshop Safety' },
        { id: 'sub-pt01-2', code: 'SUB-PT2', title: 'Geometric Shapes & Sketching' },
      ],
    },
  ],
};

const CBC_ASSESSMENT_METHODS = [
  { value: 'OBSERVATION', label: 'Observation (Teacher Continuous Monitoring)' },
  { value: 'PRACTICAL_WORK', label: 'Practical Work (Hands-on demonstration)' },
  { value: 'WRITTEN_TEST', label: 'Written Test / Worksheet' },
  { value: 'PROJECT', label: 'Project-Based Learning' },
  { value: 'PORTFOLIO', label: 'Learner Portfolio Evaluation' },
  { value: 'ORAL_QUESTIONING', label: 'Oral Questioning / Presentation' },
  { value: 'SELF_PEER_ASSESSMENT', label: 'Self & Peer Assessment' },
];

const CBC_CORE_COMPETENCIES = [
  { value: 'CRITICAL_THINKING_AND_PROBLEM_SOLVING', label: 'Critical Thinking & Problem Solving' },
  { value: 'COMMUNICATION_AND_COLLABORATION', label: 'Communication & Collaboration' },
  { value: 'CREATIVITY_AND_IMAGINATION', label: 'Creativity & Imagination' },
  { value: 'CITIZENSHIP', label: 'Citizenship' },
  { value: 'DIGITAL_LITERACY', label: 'Digital Literacy' },
  { value: 'LEARNING_TO_LEARN', label: 'Learning to Learn' },
  { value: 'SELF_EFFICACY', label: 'Self-Efficacy' },
];

const CBC_CORE_VALUES = [
  { value: 'INTEGRITY', label: 'Integrity' },
  { value: 'RESPONSIBILITY', label: 'Responsibility' },
  { value: 'RESPECT', label: 'Respect' },
  { value: 'UNITY', label: 'Unity' },
  { value: 'PEACE', label: 'Peace' },
  { value: 'LOVE', label: 'Love' },
  { value: 'SOCIAL_JUSTICE', label: 'Social Justice' },
];

const normalizeStudent = (s: any): Student => {
  const name =
    s.name ||
    s.fullName ||
    [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') ||
    [s.firstName, s.lastName].filter(Boolean).join(' ') ||
    'Learner';
  const admNo = s.admNo || s.admissionNumber || 'N/A';
  const grade = resolveGradeName(s.grade || s.gradeLevel);
  const stream = resolveStreamName(s.streamId, s.stream?.name || s.streamName || s.stream);

  return {
    id: s.id,
    admNo,
    upi: s.upi || s.upiNumber || 'NEMIS-PENDING',
    nemis: s.nemis || s.upiNumber || 'NEMIS-PENDING',
    name,
    gender: s.gender === 'FEMALE' || s.gender === 'Girl' ? 'Girl' : 'Boy',
    grade,
    stream,
    guardianName:
      s.guardianName ||
      (s.guardian ? `${s.guardian.firstName || ''} ${s.guardian.lastName || ''}`.trim() : (s.emergencyContactName || 'N/A')),
    guardianPhone: s.guardianPhone || s.guardian?.phone || s.emergencyContactPhone || 'N/A',
    feeBalance: s.feeBalance || 0,
    totalFee: s.totalFee || 0,
    attendanceRate: s.attendanceRate ?? 100,
    CBCRating: s.CBCRating || 'ME',
    status: s.status === 'ACTIVE' || s.status === 'Active' ? 'Active' : s.status,
    profilePhotoUrl: s.profilePhotoUrl,
    classroomId: s.classroomId,
    streamId: s.streamId,
    gradeLevel: s.gradeLevel,
  };
};

export const UploadMarksModal: React.FC<UploadMarksModalProps> = ({
  isOpen,
  onClose,
  onMarksUploaded,
  initialStudent,
  initialAssessmentType = 'SUMMATIVE',
}) => {
  const { user } = useAuth();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterStreamId, setFilterStreamId] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [learnerSearch, setLearnerSearch] = useState<string>('');

  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<'SUMMATIVE' | 'FORMATIVE'>(initialAssessmentType);

  useEffect(() => {
    if (initialAssessmentType) {
      setAssessmentType(initialAssessmentType);
    }
  }, [initialAssessmentType, isOpen]);

  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState<string>('');

  const [assessmentMethod, setAssessmentMethod] = useState<string>('OBSERVATION');
  const [targetedCompetency, setTargetedCompetency] = useState<string>('CRITICAL_THINKING_AND_PROBLEM_SOLVING');
  const [observedValue, setObservedValue] = useState<string>('INTEGRITY');
  const [specificOutcomeTested, setSpecificOutcomeTested] = useState<string>('Competency mastery evaluation');

  const [rawScore, setRawScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [customRemarks, setCustomRemarks] = useState<string>('');
  const [isCustomRemarkEdited, setIsCustomRemarkEdited] = useState(false);

  const [subjectMarks, setSubjectMarks] = useState<Record<string, SubjectMarkEntry>>({});
  const [loadingExistingMarks, setLoadingExistingMarks] = useState<boolean>(false);
  const [existingMarksCount, setExistingMarksCount] = useState<number>(0);

  // Bulk CSV Import States
  const [entryMode, setEntryMode] = useState<'MANUAL_FORM' | 'BULK_CSV'>('MANUAL_FORM');
  const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
  const [bulkMaxScore, setBulkMaxScore] = useState<string>('100');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<MarksValidationResult | null>(null);
  const [isValidatingCsv, setIsValidatingCsv] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isCommittingCsv, setIsCommittingCsv] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const effectiveSubjects: CanonicalSubjectItem[] = useMemo(() => {
    const student = students.find((s) => s.id === selectedStudentId);
    let targetGrade = '';
    if (student) {
      targetGrade = (student.gradeLevel || student.grade || '').toUpperCase().replace(/[\s-]/g, '_');
    }
    if (!targetGrade && filterClassId) {
      const cls = classes.find((c) => c.id === filterClassId);
      if (cls) {
        targetGrade = (cls.gradeLevel || cls.name || '').toUpperCase().replace(/[\s-]/g, '_');
      }
    }

    let sourceList = learningAreas;
    if (targetGrade && learningAreas.length > 0) {
      const matching = learningAreas.filter((la: any) => {
        const laGrade = (la.gradeLevel || la.grade_level || '').toUpperCase().replace(/[\s-]/g, '_');
        return laGrade && (laGrade === targetGrade || targetGrade.includes(laGrade) || laGrade.includes(targetGrade));
      });
      if (matching.length > 0) {
        sourceList = matching;
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
          id: la.id,
          key,
          code: la.code || key,
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

    DEFAULT_CBC_LEARNING_AREAS.forEach((defLa) => {
      const key = getSubjectCanonicalKey(`${defLa.code || ''} ${defLa.name || ''} ${defLa.id || ''}`);
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, {
          id: defLa.id,
          key,
          code: defLa.code || key,
          name: getCanonicalName(key, defLa.name),
          initial: getCanonicalInitial(key),
          aliasSet: new Set([defLa.id, defLa.code, defLa.name, key].filter(Boolean) as string[]),
        });
      } else {
        canonicalMap.get(key)!.aliasSet.add(defLa.id);
      }
    });

    learningAreas.forEach((la) => {
      const key = getSubjectCanonicalKey(`${la.code || ''} ${la.name || ''} ${la.id || ''}`);
      if (canonicalMap.has(key)) {
        const item = canonicalMap.get(key)!;
        item.aliasSet.add(la.id);
        if (la.code) item.aliasSet.add(la.code);
        if (la.name) item.aliasSet.add(la.name);
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
  }, [learningAreas, selectedStudentId, students, filterClassId, classes]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        const [stRes, laRes, ctxRes, yrRes, cRes] = await Promise.all([
          apiService.getStudents().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);

        if (cRes?.data && Array.isArray(cRes.data)) {
          setClasses(cRes.data);
        }

        const curCalYear = new Date().getFullYear();
        const prevCalYear = curCalYear - 1;
        if (yrRes?.data && Array.isArray(yrRes.data) && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
        } else {
          setAcademicYears([
            { id: `year-${curCalYear}`, name: `${curCalYear}`, startDate: `${curCalYear}-01-05`, endDate: `${curCalYear}-11-28`, isCurrent: true },
            { id: `year-${prevCalYear}`, name: `${prevCalYear}`, startDate: `${prevCalYear}-01-06`, endDate: `${prevCalYear}-11-28`, isCurrent: false },
          ]);
        }

        if (ctxRes?.data) {
          if (ctxRes.data.currentYear?.id) {
            setAcademicYearId(ctxRes.data.currentYear.id);
          }
          if (ctxRes.data.allTerms && Array.isArray(ctxRes.data.allTerms) && ctxRes.data.allTerms.length > 0) {
            setTerms(ctxRes.data.allTerms);
            const curT = ctxRes.data.allTerms.find((t: any) => t.isCurrent) || ctxRes.data.allTerms[0];
            setTermId(curT.id);
          } else if (ctxRes.data.currentTerm?.id) {
            setTermId(ctxRes.data.currentTerm.id);
            setTerms([ctxRes.data.currentTerm]);
          }
        } else {
          setTerms([
            { id: `term-${curCalYear}-t1`, academicYearId: `year-${curCalYear}`, name: 'Term 1', termNumber: 1, startDate: `${curCalYear}-01-05`, endDate: `${curCalYear}-04-05`, isCurrent: false },
            { id: `term-${curCalYear}-t2`, academicYearId: `year-${curCalYear}`, name: 'Term 2', termNumber: 2, startDate: `${curCalYear}-05-04`, endDate: `${curCalYear}-08-07`, isCurrent: false },
            { id: `term-${curCalYear}-t3`, academicYearId: `year-${curCalYear}`, name: 'Term 3', termNumber: 3, startDate: `${curCalYear}-08-31`, endDate: `${curCalYear}-11-28`, isCurrent: true },
          ]);
          setTermId(`term-${curCalYear}-t1`);
        }

        if (stRes?.data && Array.isArray(stRes.data)) {
          const mapped = stRes.data.map(normalizeStudent);
          setStudents(mapped);
          if (initialStudent?.id) {
            const match = mapped.find((m) => m.id === initialStudent.id || m.admNo === initialStudent.admNo);
            setSelectedStudentId(match ? match.id : initialStudent.id);
            const effClass = initialStudent.classroomId || match?.classroomId;
            const effStream = initialStudent.streamId || match?.streamId;
            if (effClass) setFilterClassId(effClass);
            if (effStream) setFilterStreamId(effStream);
          } else if (mapped.length > 0) {
            setSelectedStudentId(mapped[0].id);
          }
        }

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(laRes.data[0].id);
        } else {
          setLearningAreas(DEFAULT_CBC_LEARNING_AREAS);
          setSelectedLearningAreaId(DEFAULT_CBC_LEARNING_AREAS[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data for grading modal:', err);
      }
    }

    loadData();
  }, [isOpen, initialStudent]);

  useEffect(() => {
    if (!academicYearId) return;
    apiService
      .getTerms(academicYearId)
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setTerms(res.data);
          const cur = res.data.find((t) => t.isCurrent) || res.data[0];
          setTermId(cur.id);
        }
      })
      .catch(() => {});
  }, [academicYearId]);

  useEffect(() => {
    if (!filterClassId) {
      setStreams([]);
      setFilterStreamId('');
      return;
    }
    apiService
      .getStreamsByClass(filterClassId)
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setStreams(res.data);
        } else {
          setStreams([]);
        }
        setFilterStreamId('');
      })
      .catch(() => {
        setStreams([]);
        setFilterStreamId('');
      });
  }, [filterClassId]);

  useEffect(() => {
    if (!selectedLearningAreaId) {
      setStrands([]);
      setSelectedStrandId('');
      return;
    }

    const currentLa = learningAreas.find((l) => l.id === selectedLearningAreaId);
    const laCode = (currentLa?.code || 'MATH').toUpperCase();

    apiService
      .getStrandsByLearningArea(selectedLearningAreaId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setStrands(res.data);
          setSelectedStrandId(res.data[0].id);
        } else {
          const defaultList = DEFAULT_STRANDS_MAP[laCode] || DEFAULT_STRANDS_MAP.MATH;
          const mappedStrands: BackendStrand[] = defaultList.map((d) => ({
            id: d.id,
            learningAreaId: selectedLearningAreaId,
            code: d.code,
            title: d.title,
            gradeLevel: 'GRADE_7' as any,
          }));
          setStrands(mappedStrands);
          setSelectedStrandId(mappedStrands[0]?.id || '');
        }
      })
      .catch(() => {
        const defaultList = DEFAULT_STRANDS_MAP[laCode] || DEFAULT_STRANDS_MAP.MATH;
        const mappedStrands: BackendStrand[] = defaultList.map((d) => ({
          id: d.id,
          learningAreaId: selectedLearningAreaId,
          code: d.code,
          title: d.title,
          gradeLevel: 'GRADE_7' as any,
        }));
        setStrands(mappedStrands);
        setSelectedStrandId(mappedStrands[0]?.id || '');
      });
  }, [selectedLearningAreaId, learningAreas]);

  useEffect(() => {
    if (!selectedStrandId) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      return;
    }

    const currentLa = learningAreas.find((l) => l.id === selectedLearningAreaId);
    const laCode = (currentLa?.code || 'MATH').toUpperCase();
    const defaultList = DEFAULT_STRANDS_MAP[laCode] || DEFAULT_STRANDS_MAP.MATH;
    const defaultStrand = defaultList.find((d) => d.id === selectedStrandId || d.code === selectedStrandId);

    apiService
      .getSubStrandsByStrand(selectedStrandId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          setSelectedSubStrandId(res.data[0].id);
        } else if (defaultStrand && defaultStrand.subStrands.length > 0) {
          const mappedSubs: BackendSubStrand[] = defaultStrand.subStrands.map((sub) => ({
            id: sub.id,
            strandId: selectedStrandId,
            code: sub.code,
            title: sub.title,
            specificLearningOutcomes: ['Demonstrates required competency mastery'],
          }));
          setSubStrands(mappedSubs);
          setSelectedSubStrandId(mappedSubs[0].id);
        } else {
          const generalSubs: BackendSubStrand[] = [
            { id: `sub-${selectedStrandId}-1`, strandId: selectedStrandId, code: 'SUB-1', title: 'Concept Exploration & Identification', specificLearningOutcomes: ['Core outcome mastery'] },
            { id: `sub-${selectedStrandId}-2`, strandId: selectedStrandId, code: 'SUB-2', title: 'Practical Application & Inquiry', specificLearningOutcomes: ['Practical implementation'] },
          ];
          setSubStrands(generalSubs);
          setSelectedSubStrandId(generalSubs[0].id);
        }
      })
      .catch(() => {
        if (defaultStrand && defaultStrand.subStrands.length > 0) {
          const mappedSubs: BackendSubStrand[] = defaultStrand.subStrands.map((sub) => ({
            id: sub.id,
            strandId: selectedStrandId,
            code: sub.code,
            title: sub.title,
            specificLearningOutcomes: ['Demonstrates required competency mastery'],
          }));
          setSubStrands(mappedSubs);
          setSelectedSubStrandId(mappedSubs[0].id);
        } else {
          const generalSubs: BackendSubStrand[] = [
            { id: `sub-${selectedStrandId}-1`, strandId: selectedStrandId, code: 'SUB-1', title: 'Concept Exploration & Identification', specificLearningOutcomes: ['Core outcome mastery'] },
            { id: `sub-${selectedStrandId}-2`, strandId: selectedStrandId, code: 'SUB-2', title: 'Practical Application & Inquiry', specificLearningOutcomes: ['Practical implementation'] },
          ];
          setSubStrands(generalSubs);
          setSelectedSubStrandId(generalSubs[0].id);
        }
      });
  }, [selectedStrandId, selectedLearningAreaId, learningAreas]);

  const filteredStudents = students.filter((s) => {
    if (learnerSearch.trim()) {
      const q = learnerSearch.toLowerCase();
      const matchesName = s.name.toLowerCase().includes(q);
      const matchesAdm = s.admNo.toLowerCase().includes(q);
      const matchesUpi = s.upi.toLowerCase().includes(q);
      if (!matchesName && !matchesAdm && !matchesUpi) {
        return false;
      }
    }

    if (filterClassId) {
      const cls = classes.find((c) => c.id === filterClassId);
      if (cls) {
        const matchesClassId = s.classroomId === filterClassId;
        const gradeText = cls.gradeLevel?.replace(/_/g, ' ').toLowerCase() || '';
        const clsName = cls.name?.toLowerCase() || '';
        const sGrade = (s.grade || '').toLowerCase();
        const sGradeLevel = (s.gradeLevel || '').toLowerCase();
        if (!matchesClassId && !sGrade.includes(gradeText) && !sGrade.includes(clsName) && !sGradeLevel.includes(gradeText)) {
          return false;
        }
      }
    }

    if (filterStreamId) {
      const stm = streams.find((st) => st.id === filterStreamId);
      if (stm) {
        const matchesStreamId = s.streamId === filterStreamId;
        const stmName = stm.name?.toLowerCase() || '';
        const sStream = (s.stream || '').toLowerCase();
        if (!matchesStreamId && !sStream.includes(stmName)) {
          return false;
        }
      }
    }

    return true;
  });

  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [filterClassId, filterStreamId, learnerSearch, filteredStudents, selectedStudentId]);

  useEffect(() => {
    if (!isOpen || !selectedStudentId) return;

    let isCancelled = false;
    setLoadingExistingMarks(true);

    const effYear = academicYearId || `year-${new Date().getFullYear()}`;
    const effTerm = termId || `term-${effYear}-t1`;

    apiService
      .listSummatives({
        studentId: selectedStudentId,
        academicYearId: effYear,
        termId: effTerm,
      })
      .then((res) => {
        if (isCancelled) return;
        const records = res?.data || [];
        const newMarks: Record<string, SubjectMarkEntry> = {};
        let loadedCount = 0;

        effectiveSubjects.forEach((sub) => {
          const match = records.find(
            (r: any) =>
              r.learningAreaId === sub.id ||
              (sub.aliasIds && sub.aliasIds.includes(r.learningAreaId)) ||
              getSubjectCanonicalKey(r.learningAreaId) === sub.key ||
              (sub.code && r.learningAreaId === sub.code) ||
              (r.learningAreaName && sub.name && r.learningAreaName.toLowerCase() === sub.name.toLowerCase())
          );

          if (match) {
            const raw = match.strandScores?.[0]?.rawScore;
            const max = match.strandScores?.[0]?.maxScore || 100;
            const pct = max > 0 && typeof raw === 'number' ? Math.round((raw / max) * 100) : 0;
            const level = match.overallPerformanceLevel || (pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE');
            newMarks[sub.id] = {
              rawScore: typeof raw === 'number' ? String(raw) : '',
              maxScore: String(max),
              remarks: match.teacherRemarks || getStandardRemark(level as any),
              isCustomRemark: !!match.teacherRemarks,
            };
            if (typeof raw === 'number') loadedCount++;
          } else {
            newMarks[sub.id] = {
              rawScore: '',
              maxScore: '100',
              remarks: '',
              isCustomRemark: false,
            };
          }
        });

        setSubjectMarks(newMarks);
        setExistingMarksCount(loadedCount);
      })
      .catch((err) => {
        console.error('Failed to load existing student summatives:', err);
        const blankMarks: Record<string, SubjectMarkEntry> = {};
        effectiveSubjects.forEach((sub) => {
          blankMarks[sub.id] = {
            rawScore: '',
            maxScore: '100',
            remarks: '',
            isCustomRemark: false,
          };
        });
        setSubjectMarks(blankMarks);
        setExistingMarksCount(0);
      })
      .finally(() => {
        if (!isCancelled) setLoadingExistingMarks(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedStudentId, academicYearId, termId, effectiveSubjects]);

  const handleSubjectScoreChange = (subId: string, value: string) => {
    setSubjectMarks((prev) => {
      const current = prev[subId] || { rawScore: '', maxScore: '100', remarks: '', isCustomRemark: false };
      const num = parseFloat(value);
      const max = parseFloat(current.maxScore) || 100;
      let newRemarks = current.remarks;
      if (!current.isCustomRemark && !isNaN(num) && value.trim() !== '') {
        const pct = max > 0 ? (num / max) * 100 : 0;
        const lvl: 'EE' | 'ME' | 'AE' | 'BE' = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
        newRemarks = getStandardRemark(lvl);
      } else if (value.trim() === '' && !current.isCustomRemark) {
        newRemarks = '';
      }
      return {
        ...prev,
        [subId]: {
          ...current,
          rawScore: value,
          remarks: newRemarks,
        },
      };
    });
  };

  const handleSubjectMaxChange = (subId: string, value: string) => {
    setSubjectMarks((prev) => {
      const current = prev[subId] || { rawScore: '', maxScore: '100', remarks: '', isCustomRemark: false };
      return {
        ...prev,
        [subId]: {
          ...current,
          maxScore: value,
        },
      };
    });
  };

  const handleSubjectRemarksChange = (subId: string, remarks: string) => {
    setSubjectMarks((prev) => {
      const current = prev[subId] || { rawScore: '', maxScore: '100', remarks: '', isCustomRemark: false };
      return {
        ...prev,
        [subId]: {
          ...current,
          remarks,
          isCustomRemark: true,
        },
      };
    });
  };

  const handleSetAllMaxTo100 = () => {
    setSubjectMarks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = { ...next[key], maxScore: '100' };
      });
      return next;
    });
  };

  const handleClearAllMarks = () => {
    setSubjectMarks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = { ...next[key], rawScore: '', remarks: '', isCustomRemark: false };
      });
      return next;
    });
  };

  const getSubjectRubric = (raw: string, max: string) => {
    const num = parseFloat(raw);
    const mx = parseFloat(max) || 100;
    if (isNaN(num) || raw.trim() === '') {
      return {
        hasMark: false,
        percentage: 0,
        level: '—',
        badgeColor: 'bg-slate-50 text-slate-400 border-slate-200',
      };
    }
    const pct = mx > 0 ? Math.round((num / mx) * 100) : 0;
    if (pct >= 80) {
      return {
        hasMark: true,
        percentage: pct,
        level: 'EE',
        badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      };
    }
    if (pct >= 60) {
      return {
        hasMark: true,
        percentage: pct,
        level: 'ME',
        badgeColor: 'bg-rose-100 text-[#7a1228] border-rose-300',
      };
    }
    if (pct >= 40) {
      return {
        hasMark: true,
        percentage: pct,
        level: 'AE',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    }
    return {
      hasMark: true,
      percentage: pct,
      level: 'BE',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  };

  const marksSummary = useMemo(() => {
    let totalRaw = 0;
    let totalMax = 0;
    let count = 0;
    let totalPoints = 0;

    effectiveSubjects.forEach((sub) => {
      const entry = subjectMarks[sub.id];
      if (entry && entry.rawScore.trim() !== '') {
        const raw = parseFloat(entry.rawScore);
        const max = parseFloat(entry.maxScore) || 100;
        if (!isNaN(raw) && raw >= 0) {
          totalRaw += raw;
          totalMax += max;
          count++;
          const pct = max > 0 ? (raw / max) * 100 : 0;
          const pts = pct >= 80 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1;
          totalPoints += pts;
        }
      }
    });

    const meanPct = totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;
    const meanGpa = count > 0 ? (totalPoints / count).toFixed(2) : '0.00';
    const overallLevel: 'EE' | 'ME' | 'AE' | 'BE' | '—' =
      meanPct >= 80 ? 'EE' : meanPct >= 60 ? 'ME' : meanPct >= 40 ? 'AE' : count > 0 ? 'BE' : '—';

    let levelBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
    if (overallLevel === 'EE') levelBadgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
    else if (overallLevel === 'ME') levelBadgeColor = 'bg-[#7a1228]/15 text-[#7a1228] border-[#7a1228]/30';
    else if (overallLevel === 'AE') levelBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    else if (overallLevel === 'BE') levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';

    return {
      totalRaw,
      totalMax,
      count,
      totalSubjects: effectiveSubjects.length,
      meanPct,
      meanGpa,
      overallLevel,
      levelBadgeColor,
    };
  }, [subjectMarks, effectiveSubjects]);

  const currentIndex = filteredStudents.findIndex((s) => s.id === selectedStudentId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredStudents.length - 1;

  const goToPrevStudent = () => {
    if (hasPrev) {
      setSelectedStudentId(filteredStudents[currentIndex - 1].id);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const goToNextStudent = () => {
    if (hasNext) {
      setSelectedStudentId(filteredStudents[currentIndex + 1].id);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const numScore = parseFloat(rawScore) || 0;
  const numMax = parseFloat(maxScore) || 100;
  const percentage = numMax > 0 ? Math.round((numScore / numMax) * 100) : 0;

  let performanceLevel: 'EE' | 'ME' | 'AE' | 'BE' = 'BE';
  let levelTitle = 'Below Expectations (BE)';
  let levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  let standardCBCRemark = '';

  if (percentage >= 80) {
    performanceLevel = 'EE';
    levelTitle = 'Exceeding Expectations (EE) - Level 4';
    levelBadgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
    standardCBCRemark = getStandardRemark('EE');
  } else if (percentage >= 60) {
    performanceLevel = 'ME';
    levelTitle = 'Meeting Expectations (ME) - Level 3';
    levelBadgeColor = 'bg-[#7a1228]/15 text-[#7a1228] border-[#7a1228]/30';
    standardCBCRemark = getStandardRemark('ME');
  } else if (percentage >= 40) {
    performanceLevel = 'AE';
    levelTitle = 'Approaching Expectations (AE) - Level 2';
    levelBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    standardCBCRemark = getStandardRemark('AE');
  } else {
    performanceLevel = 'BE';
    levelTitle = 'Below Expectations (BE) - Level 1';
    levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
    standardCBCRemark = getStandardRemark('BE');
  }

  const activeRemarks = isCustomRemarkEdited ? customRemarks : standardCBCRemark;

  const handleSubmit = async (e?: React.FormEvent, shouldAdvance: boolean = false) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      setError('Please select a valid learner');
      setIsLoading(false);
      return;
    }

    const effectiveYearId = academicYearId || `year-${new Date().getFullYear()}`;
    const effectiveTermId = termId || `term-${effectiveYearId}-t1`;
    const effectiveTeacherId = (user?.id && user.id.trim() !== '')
      ? user.id
      : (user?.userId && user.userId.trim() !== '')
      ? user.userId
      : 'tch-default-01';

    try {
      if (assessmentType === 'SUMMATIVE') {
        const validSubjects = effectiveSubjects.filter((sub) => {
          const entry = subjectMarks[sub.id];
          return entry && entry.rawScore.trim() !== '' && !isNaN(parseFloat(entry.rawScore));
        });

        if (validSubjects.length === 0) {
          setError('Please enter marks for at least one subject before saving.');
          setIsLoading(false);
          return;
        }

        for (const sub of validSubjects) {
          const entry = subjectMarks[sub.id];
          const raw = parseFloat(entry.rawScore);
          const max = parseFloat(entry.maxScore) || 100;
          if (raw < 0) {
            setError(`Assessment score for ${sub.name} cannot be negative.`);
            setIsLoading(false);
            return;
          }
          if (raw > max) {
            setError(`Assessment score for ${sub.name} (${raw}) cannot exceed maximum allowed marks (${max}).`);
            setIsLoading(false);
            return;
          }
        }

        const assessments = validSubjects.map((sub) => {
          const entry = subjectMarks[sub.id];
          const raw = parseFloat(entry.rawScore);
          const max = parseFloat(entry.maxScore) || 100;
          const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
          const level: 'EE' | 'ME' | 'AE' | 'BE' = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
          const remarks = (entry.remarks && entry.remarks.trim()) || getStandardRemark(level);

          return {
            studentId: selectedStudentId,
            teacherId: effectiveTeacherId,
            learningAreaId: sub.id,
            termId: effectiveTermId,
            academicYearId: effectiveYearId,
            strandScores: [
              {
                strandId: sub.id, // Safe fallback to avoid rigid foreign-key validation failures
                performanceLevel: level,
                rawScore: isNaN(raw) ? 0 : raw,
                maxScore: isNaN(max) ? 100 : max,
              },
            ],
            overallPerformanceLevel: level,
            teacherRemarks: remarks,
            evaluationDate: new Date().toISOString().split('T')[0],
          };
        });

        const res = await apiService.recordSummativeBatch({ assessments });
        if (res.success || Array.isArray(res.data)) {
          const studentName = student.name || 'Learner';
          const successMsg = `Marks uploaded successfully! ${validSubjects.length} subjects recorded for ${studentName}. Mean: ${marksSummary.meanPct}% (${marksSummary.overallLevel})`;
          setSuccessMessage(successMsg);
          onMarksUploaded?.(successMsg);

          if (shouldAdvance && hasNext) {
            setTimeout(() => {
              goToNextStudent();
              setSuccessMessage(null);
            }, 1000);
          } else if (!shouldAdvance) {
            setTimeout(() => {
              onClose();
            }, 1600);
          }
        } else {
          throw new Error(res.message || 'Failed to batch save summative marks');
        }
      } else {
        if (!selectedLearningAreaId) {
          setError('Please select a valid learning area / subject');
          setIsLoading(false);
          return;
        }

        if (!selectedSubStrandId) {
          setError('Please select a valid sub-strand for formative assessment.');
          setIsLoading(false);
          return;
        }

        const payload = {
          studentId: selectedStudentId,
          teacherId: effectiveTeacherId,
          learningAreaId: selectedLearningAreaId,
          subStrandId: selectedSubStrandId,
          termId: effectiveTermId,
          academicYearId: effectiveYearId,
          assessmentDate: new Date().toISOString().split('T')[0],
          assessmentMethod: assessmentMethod || 'OBSERVATION',
          performanceLevel,
          specificOutcomeTested: specificOutcomeTested || 'Competency mastery evaluation',
          teacherRemarks: activeRemarks,
          evidenceNotes: `Score: ${numScore}/${numMax} (${percentage}%)`,
          targetedCompetencies: [targetedCompetency as any],
          valuesObserved: [observedValue as any],
        };

        const res = await apiService.recordFormativeAssessment(payload);
        if (res.success || (res as any).data) {
          const successMsg = `Marks uploaded successfully! Formative evaluation recorded as ${performanceLevel}.`;
          setSuccessMessage(successMsg);
          setTimeout(() => {
            onMarksUploaded?.(successMsg);
            onClose();
          }, 1600);
        } else {
          throw new Error(res.message || 'Failed to record formative assessment');
        }
      }
    } catch (err: any) {
      console.error('Error recording assessment:', err);
      setError(err.message || 'Failed to record marks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!filterClassId) {
      setError('Please select a class before downloading the marks template.');
      return;
    }
    const targetSubjectId = bulkSubjectId || selectedLearningAreaId || (effectiveSubjects.length > 0 ? effectiveSubjects[0].id : '');
    if (!targetSubjectId) {
      setError('Please select a subject / learning area for the marks template.');
      return;
    }

    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const res = await apiService.getMarksTemplate({
        academicYearId: academicYearId || (academicYears.find(y => y.isCurrent)?.id || academicYears[0]?.id || 'year-2026'),
        termId: termId || (terms.find(t => t.isCurrent)?.id || terms[0]?.id || 'term-2026-t1'),
        classRoomId: filterClassId,
        streamId: filterStreamId || undefined,
        learningAreaId: targetSubjectId,
        maxScore: Number(bulkMaxScore) || 100
      });

      if (res.success && res.data) {
        const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage(`Pre-filled marksheet template downloaded for ${res.data.className} (${res.data.studentsCount} enrolled learners).`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate marks template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setError(null);
    setSuccessMessage(null);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length < 2) {
        setError('CSV file appears to be empty or contains only a header.');
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let val = match[1] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          }
          matches.push(val.trim());
          if (regex.lastIndex >= line.length) break;
        }

        if (matches.length > 0 && matches[0]) {
          rows.push({
            admissionNumber: matches[0],
            learnerName: matches[1] || undefined,
            score: matches[2] !== undefined && matches[2] !== '' ? matches[2] : undefined,
            maxScore: matches[3] !== undefined && matches[3] !== '' ? matches[3] : bulkMaxScore,
            performanceLevel: matches[4] !== undefined && matches[4] !== '' ? matches[4] : undefined,
            teacherRemarks: matches[5] !== undefined && matches[5] !== '' ? matches[5] : undefined,
          });
        }
      }

      setParsedRows(rows);

      const targetSubjectId = bulkSubjectId || selectedLearningAreaId || (effectiveSubjects.length > 0 ? effectiveSubjects[0].id : '');
      if (!filterClassId || !targetSubjectId) {
        setError('Please ensure Class and Learning Area are selected above before validating CSV.');
        return;
      }

      setIsValidatingCsv(true);
      try {
        const vRes = await apiService.validateMarksUpload({
          academicYearId: academicYearId || (academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || 'year-2026'),
          termId: termId || (terms.find((t) => t.isCurrent)?.id || terms[0]?.id || 'term-2026-t1'),
          classRoomId: filterClassId,
          streamId: filterStreamId || undefined,
          learningAreaId: targetSubjectId,
          maxScore: Number(bulkMaxScore) || 100,
          rows,
        });

        if (vRes.success && vRes.data) {
          setValidationResult(vRes.data);
        }
      } catch (err: any) {
        setError(err.message || 'CSV validation failed.');
      } finally {
        setIsValidatingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitCsv = async () => {
    if (!validationResult || validationResult.invalidRows > 0) return;
    const targetSubjectId = bulkSubjectId || selectedLearningAreaId || (effectiveSubjects.length > 0 ? effectiveSubjects[0].id : '');

    setIsCommittingCsv(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiService.commitMarksUpload({
        academicYearId: academicYearId || (academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || 'year-2026'),
        termId: termId || (terms.find((t) => t.isCurrent)?.id || terms[0]?.id || 'term-2026-t1'),
        classRoomId: filterClassId,
        streamId: filterStreamId || undefined,
        learningAreaId: targetSubjectId,
        maxScore: Number(bulkMaxScore) || 100,
        rows: parsedRows,
      });

      if (res.success && res.data) {
        setSuccessMessage(res.data.message || 'Marks successfully uploaded and persisted!');
        if (onMarksUploaded) onMarksUploaded();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to commit marks upload.');
    } finally {
      setIsCommittingCsv(false);
    }
  };

  if (!isOpen) return null;

  const currentLearner = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">grade</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Upload Marks & CBE Rubric</h3>
              <p className="text-xs text-rose-100">KICD Competency-Based Assessment System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="p-3 bg-surface-container-low border-b border-outline-variant/30 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEntryMode('MANUAL_FORM');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === 'MANUAL_FORM'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-white text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person_edit</span>
            <span>Manual Individual Entry</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('BULK_CSV');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === 'BULK_CSV'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-white text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">file_upload</span>
            <span>Bulk CSV File Import</span>
          </button>
        </div>

        {entryMode === 'BULK_CSV' ? (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. Selection & Configuration */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#7a1228]">tune</span>
                <span>1. Select Class, Subject & Assessment Session</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Class / Grade *
                  </label>
                  <select
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Stream (Optional)
                  </label>
                  <select
                    value={filterStreamId}
                    onChange={(e) => setFilterStreamId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="">All Streams / Whole Grade</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        Stream {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Learning Area / Subject *
                  </label>
                  <select
                    value={bulkSubjectId || selectedLearningAreaId}
                    onChange={(e) => {
                      setBulkSubjectId(e.target.value);
                      setSelectedLearningAreaId(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Choose Subject --</option>
                    {(effectiveSubjects.length > 0 ? effectiveSubjects : learningAreas).map((la: any) => (
                      <option key={la.id} value={la.id}>
                        {la.name} {la.code ? `(${la.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Academic Year
                  </label>
                  <select
                    value={academicYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    {academicYears.map((yr) => (
                      <option key={yr.id} value={yr.id}>
                        Year {resolveAcademicYearName(yr.name || yr.id)} {yr.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Term</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={bulkMaxScore}
                    onChange={(e) => setBulkMaxScore(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. Download Template & Upload CSV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">download</span>
                    <span>Download Marksheet Template</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Download a pre-populated CSV containing active learners, admission numbers, and full names for this class.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate || !filterClassId}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  <span>{isDownloadingTemplate ? 'Generating CSV...' : 'Download Pre-filled CSV'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>Upload Completed Marksheet</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Select the completed CSV. Blank marks are safely preserved as missing (never silently zeroed).
                  </p>
                </div>
                <label className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-container transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>{csvFileName ? `Replace (${csvFileName})` : 'Choose CSV File to Validate'}</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* 3. Validation Feedback */}
            {isValidatingCsv && (
              <div className="p-6 text-center text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                <span className="font-semibold text-xs">
                  Validating learner marks, score ranges & duplicates...
                </span>
              </div>
            )}

            {validationResult && !isValidatingCsv && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
                    Import Pre-Validation Summary
                  </span>
                  <span className="text-[11px] text-outline">
                    {validationResult.totalRows} row(s) analyzed
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Valid to Record
                    </span>
                    <span className="text-base font-bold text-emerald-900 font-data-mono">
                      {validationResult.validRows}
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      {validationResult.createsCount} new, {validationResult.updatesCount} update(s)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Blank / Missing Marks
                    </span>
                    <span className="text-base font-bold text-amber-900 font-data-mono">
                      {validationResult.missingRows}
                    </span>
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      Preserved as missing (not 0)
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      validationResult.invalidRows > 0
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase block ${
                        validationResult.invalidRows > 0 ? 'text-rose-800' : 'text-slate-600'
                      }`}
                    >
                      Errors / Invalid
                    </span>
                    <span
                      className={`text-base font-bold font-data-mono ${
                        validationResult.invalidRows > 0 ? 'text-rose-900' : 'text-slate-700'
                      }`}
                    >
                      {validationResult.invalidRows}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {validationResult.invalidRows > 0 ? 'Must fix before save' : 'No errors found'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Duplicates</span>
                    <span className="text-base font-bold text-slate-800 font-data-mono">
                      {validationResult.duplicatesCount}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">In upload file</span>
                  </div>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1.5 text-xs text-rose-900">
                    <div className="font-bold flex items-center gap-1.5 text-rose-950">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Flagged Row Issues ({validationResult.errors.length}):</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                      {validationResult.errors.map((e, idx) => (
                        <li key={idx}>
                          Row {e.rowNumber} {e.admissionNumber ? `(${e.admissionNumber})` : ''}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border border-outline-variant/30 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-surface-container sticky top-0 border-b border-outline-variant/30 text-on-surface-variant uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Adm No</th>
                        <th className="p-2">Learner Name</th>
                        <th className="p-2">Score</th>
                        <th className="p-2">Level</th>
                        <th className="p-2">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {validationResult.previewRows.map((r, i) => (
                        <tr
                          key={i}
                          className={
                            r.status === 'INVALID'
                              ? 'bg-rose-50/60'
                              : r.status === 'MISSING'
                              ? 'bg-amber-50/30'
                              : ''
                          }
                        >
                          <td className="p-2 font-mono text-outline">{r.rowNumber}</td>
                          <td className="p-2 font-bold font-mono">{r.admissionNumber || '-'}</td>
                          <td className="p-2">{r.learnerName || '-'}</td>
                          <td className="p-2 font-mono font-bold">
                            {r.score !== undefined ? (
                              `${r.score}/${r.maxScore}`
                            ) : (
                              <span className="text-amber-800 italic">Blank</span>
                            )}
                          </td>
                          <td className="p-2">
                            {r.performanceLevel ? (
                              <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-primary/10 text-primary">
                                {r.performanceLevel}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-2">
                            {r.status === 'VALID' ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.action === 'CREATE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {r.action === 'CREATE' ? 'New Record' : 'Will Update'}
                              </span>
                            ) : r.status === 'MISSING' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                Preserved Missing
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                {r.error || 'Invalid'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Action buttons */}
            <div className="pt-3 flex items-center justify-between gap-2.5 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommitCsv}
                disabled={
                  isCommittingCsv ||
                  !validationResult ||
                  validationResult.invalidRows > 0 ||
                  validationResult.validRows === 0
                }
                className="px-5 py-2.5 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>
                  {isCommittingCsv
                    ? 'Saving marks...'
                    : validationResult
                    ? `Commit ${validationResult.validRows} Mark(s) to Database`
                    : 'Upload & Validate CSV to Commit'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-bold flex items-center gap-3 shadow-md">
              <span className="material-symbols-outlined text-[24px] text-emerald-600">check_circle</span>
              <div className="flex-1">
                <div className="text-sm font-black text-emerald-900">Marks Uploaded Successfully</div>
                <div className="text-xs text-emerald-700 font-medium mt-0.5">{successMessage}</div>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#7a1228]">calendar_month</span>
                <span>Academic Session & Evaluation Mode</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Academic Year
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-primary cursor-pointer"
                >
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      Year {resolveAcademicYearName(yr.name || yr.id)} {yr.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Term / Period
                </label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-primary cursor-pointer"
                >
                  {terms.length === 0 ? (
                    <option value="term-2026-t1">Term 1</option>
                  ) : (
                    terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isCurrent ? '(Current)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Evaluation Type
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-[#7a1228] focus:outline-primary cursor-pointer"
                >
                  <option value="SUMMATIVE">Summative (Term Exam)</option>
                  <option value="FORMATIVE">Formative (Continuous Rubric)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">filter_alt</span>
                <span>Filter Learners by Cohort</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {filteredStudents.length} of {students.length} Learners
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Class / Grade Level
                </label>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-primary cursor-pointer"
                >
                  <option value="">-- All Classes & Grades --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gradeLevel.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Cohort / Stream
                </label>
                <select
                  value={filterStreamId}
                  onChange={(e) => setFilterStreamId(e.target.value)}
                  disabled={!filterClassId}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-primary disabled:opacity-50 cursor-pointer"
                >
                  <option value="">
                    {!filterClassId
                      ? '-- Select Class First --'
                      : streams.length === 0
                      ? '-- Main Cohort (No Stream) --'
                      : '-- All Streams in Class --'}
                  </option>
                  {streams.map((st) => (
                    <option key={st.id} value={st.id}>
                      Stream: {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-on-surface-variant uppercase text-xs">
                Select Learner *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={goToPrevStudent}
                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 text-[11px] font-bold hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Previous Learner"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Prev</span>
                </button>
                <span className="text-[11px] font-bold text-slate-600 font-data-mono">
                  {filteredStudents.length > 0 ? `${currentIndex + 1} of ${filteredStudents.length}` : '0 of 0'}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={goToNextStudent}
                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 text-[11px] font-bold hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Next Learner"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-gray-400 text-[16px]">
                search
              </span>
              <input
                type="text"
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
                placeholder="Search learner by name, admission number, or UPI..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-primary"
              />
              {learnerSearch && (
                <button
                  type="button"
                  onClick={() => setLearnerSearch('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-bold text-on-surface text-xs cursor-pointer shadow-xs"
            >
              {filteredStudents.length === 0 ? (
                <option value="">
                  {students.length === 0
                    ? 'No learners found in database'
                    : 'No learners match your search / filters'}
                </option>
              ) : (
                filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admNo}) · {s.grade} {s.stream ? `· ${s.stream}` : ''}
                  </option>
                ))
              )}
            </select>

            {currentLearner && (
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3 shadow-xs">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-[#7a1228] bg-rose-50 flex items-center justify-center shadow-xs">
                  {currentLearner.profilePhotoUrl ? (
                    <img
                      src={currentLearner.profilePhotoUrl}
                      alt={currentLearner.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-black text-sm text-[#7a1228] tracking-wider">
                      {currentLearner.name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <h4 className="font-bold text-sm text-gray-900 truncate">
                      {currentLearner.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#7a1228] font-bold text-[10px]">
                      {currentLearner.grade} {currentLearner.stream ? `· ${currentLearner.stream}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600 flex-wrap">
                    <span>Adm: <strong className="text-gray-900 font-data-mono">{currentLearner.admNo}</strong></span>
                    <span>·</span>
                    <span>UPI: <span className="font-data-mono font-semibold text-gray-800">{currentLearner.upi}</span></span>
                    <span>·</span>
                    <span className="text-gray-500">Contact: {currentLearner.guardianName} ({currentLearner.guardianPhone})</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {assessmentType === 'SUMMATIVE' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-gradient-to-r from-slate-50 via-rose-50/20 to-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Subjects Filled</span>
                    <span className="font-bold text-xs text-slate-800">
                      <strong className="text-sm font-data-mono text-[#7a1228]">{marksSummary.count}</strong> of {marksSummary.totalSubjects}
                    </span>
                  </div>
                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Marks</span>
                    <span className="font-bold text-xs text-slate-800 font-data-mono">
                      <strong className="text-sm text-slate-900">{marksSummary.totalRaw}</strong>
                      <span className="text-slate-400"> / {marksSummary.totalMax}</span>
                    </span>
                  </div>
                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Mean Score</span>
                    <span className="font-bold text-sm text-[#7a1228] font-data-mono">
                      {marksSummary.meanPct}%
                    </span>
                  </div>
                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Projected Level</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${marksSummary.levelBadgeColor}`}>
                      {marksSummary.overallLevel}
                    </span>
                  </div>
                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">GPA Points</span>
                    <span className="font-bold text-xs text-slate-800 font-data-mono">
                      {marksSummary.meanGpa} / 4.00
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleSetAllMaxTo100}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                    title="Reset all Max Scores to 100"
                  >
                    Set Max = 100
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllMarks}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 rounded text-[11px] font-bold text-rose-700 transition-colors cursor-pointer"
                    title="Clear all entered marks for this learner"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {existingMarksCount > 0 && (
                <div className="px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-teal-700">task_alt</span>
                    <span>
                      <strong>{existingMarksCount}</strong> existing subject marks loaded for this term. Any updates will overwrite existing marks.
                    </span>
                  </div>
                  {loadingExistingMarks && (
                    <span className="text-[10px] text-teal-600 animate-pulse font-medium">Refreshing...</span>
                  )}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-600 tracking-wider items-center">
                  <div className="col-span-5 sm:col-span-4">Learning Area / Subject</div>
                  <div className="col-span-4 sm:col-span-3 text-center">Marks (Score / Out Of)</div>
                  <div className="col-span-3 sm:col-span-2 text-center">CBE Level</div>
                  <div className="col-span-12 sm:col-span-3 hidden sm:block">Pedagogical Remarks</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {effectiveSubjects.map((sub, index) => {
                    const mark = subjectMarks[sub.id] || { rawScore: '', maxScore: '100', remarks: '', isCustomRemark: false };
                    const initials = getSubjectInitials(sub.code || sub.name);
                    const rubric = getSubjectRubric(mark.rawScore, mark.maxScore);

                    return (
                      <div
                        key={sub.id}
                        className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center transition-colors ${
                          rubric.hasMark ? 'bg-slate-50/50 hover:bg-slate-50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                          <span className="w-10 h-7 rounded-md bg-[#7a1228] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs font-data-mono">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate" title={sub.name}>
                              {sub.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-data-mono">
                              {sub.code || `SUB-${index + 1}`}
                            </p>
                          </div>
                        </div>

                        <div className="col-span-4 sm:col-span-3 flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={parseFloat(mark.maxScore) || 1000}
                            step="1"
                            tabIndex={index + 1}
                            value={mark.rawScore}
                            onChange={(e) => handleSubjectScoreChange(sub.id, e.target.value)}
                            placeholder="0"
                            className="w-16 sm:w-20 text-center bg-white border border-slate-300 focus:border-[#7a1228] focus:ring-1 focus:ring-[#7a1228] rounded-lg py-1.5 px-1 font-bold font-data-mono text-sm text-slate-900 shadow-xs"
                          />
                          <span className="text-slate-400 font-bold text-xs">/</span>
                          <input
                            type="number"
                            min="10"
                            max="1000"
                            value={mark.maxScore}
                            onChange={(e) => handleSubjectMaxChange(sub.id, e.target.value)}
                            className="w-12 text-center bg-slate-100 border border-slate-200 rounded-md py-1 px-1 font-semibold font-data-mono text-xs text-slate-600"
                            title="Maximum score"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                          <span
                            className={`w-full py-1 text-center rounded-md text-[11px] font-bold border transition-all font-data-mono ${rubric.badgeColor}`}
                          >
                            {rubric.hasMark ? `${rubric.level} ${rubric.percentage}%` : '—'}
                          </span>
                        </div>

                        <div className="col-span-12 sm:col-span-3 mt-1 sm:mt-0">
                          <input
                            type="text"
                            value={mark.remarks}
                            onChange={(e) => handleSubjectRemarksChange(sub.id, e.target.value)}
                            placeholder={rubric.hasMark ? getStandardRemark(rubric.level as any) : 'Auto pedagogical remarks...'}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 truncate focus:bg-white focus:border-slate-400 focus:outline-none"
                            title={mark.remarks || 'Pedagogical teacher remarks'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {assessmentType === 'FORMATIVE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">
                    Learning Area / Subject *
                  </label>
                  <select
                    value={selectedLearningAreaId}
                    onChange={(e) => setSelectedLearningAreaId(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface font-semibold cursor-pointer"
                  >
                    {effectiveSubjects.length === 0 ? (
                      <option value="">No subjects found</option>
                    ) : (
                      effectiveSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code || sub.initial})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">
                    Curriculum Strand *
                  </label>
                  <select
                    value={selectedStrandId}
                    onChange={(e) => setSelectedStrandId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface cursor-pointer"
                  >
                    {strands.length === 0 ? (
                      <option value="">No strands defined for this subject</option>
                    ) : (
                      <>
                        <option value="">Select Strand</option>
                        {strands.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.code ? `[${st.code}] ` : ''}{st.title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50/40 border border-rose-200/60 rounded-xl space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7a1228] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span>Formative CBE Competency Evaluation</span>
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">
                    Sub-Strand Outcome *
                  </label>
                  <select
                    value={selectedSubStrandId}
                    onChange={(e) => setSelectedSubStrandId(e.target.value)}
                    required
                    className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-on-surface cursor-pointer"
                  >
                    {subStrands.length === 0 ? (
                      <option value="">No sub-strands defined</option>
                    ) : (
                      <>
                        <option value="">Select Sub-Strand</option>
                        {subStrands.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.code ? `[${sub.code}] ` : ''}{sub.title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      Assessment Method *
                    </label>
                    <select
                      value={assessmentMethod}
                      onChange={(e) => setAssessmentMethod(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-on-surface cursor-pointer"
                    >
                      {CBC_ASSESSMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      Specific Learning Outcome Tested
                    </label>
                    <input
                      type="text"
                      value={specificOutcomeTested}
                      onChange={(e) => setSpecificOutcomeTested(e.target.value)}
                      placeholder="e.g. Identification and guided problem solving"
                      className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      Core Competency Demonstrated *
                    </label>
                    <select
                      value={targetedCompetency}
                      onChange={(e) => setTargetedCompetency(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-on-surface cursor-pointer"
                    >
                      {CBC_CORE_COMPETENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-on-surface-variant uppercase mb-1">
                      Core Value Observed *
                    </label>
                    <select
                      value={observedValue}
                      onChange={(e) => setObservedValue(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-on-surface cursor-pointer"
                    >
                      {CBC_CORE_VALUES.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-primary">
                    Learner Numerical Marks & KICD Rubric
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    Standard CBE Rating
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      Marks Scored (Score)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={numMax}
                      step="1"
                      required
                      value={rawScore}
                      onChange={(e) => {
                        setRawScore(e.target.value);
                        setIsCustomRemarkEdited(false);
                      }}
                      placeholder="e.g. 75"
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-base font-bold font-data-mono text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      Out Of (Max Score)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      required
                      value={maxScore}
                      onChange={(e) => {
                        setMaxScore(e.target.value);
                        setIsCustomRemarkEdited(false);
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-base font-bold font-data-mono text-on-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5">
                    Quick Rubric Level Selector (KICD 4-Point Benchmark)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRawScore(String(Math.round(numMax * 0.85)));
                        setIsCustomRemarkEdited(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                        performanceLevel === 'EE'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                          : 'bg-white border-teal-300 text-teal-800 hover:bg-teal-50'
                      }`}
                    >
                      EE (80-100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawScore(String(Math.round(numMax * 0.70)));
                        setIsCustomRemarkEdited(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                        performanceLevel === 'ME'
                          ? 'bg-[#7a1228] text-white border-[#5e0d1e] shadow-xs'
                          : 'bg-white border-rose-300 text-[#7a1228] hover:bg-rose-50'
                      }`}
                    >
                      ME (60-79%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawScore(String(Math.round(numMax * 0.50)));
                        setIsCustomRemarkEdited(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                        performanceLevel === 'AE'
                          ? 'bg-amber-700 text-white border-amber-800 shadow-xs'
                          : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      AE (40-59%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawScore(String(Math.round(numMax * 0.25)));
                        setIsCustomRemarkEdited(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                        performanceLevel === 'BE'
                          ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                          : 'bg-white border-rose-300 text-rose-800 hover:bg-rose-50'
                      }`}
                    >
                      BE (0-39%)
                    </button>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${levelBadgeColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-data-mono">{percentage}%</span>
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white/70">
                        {performanceLevel}
                      </span>
                    </div>
                    <span className="font-bold text-xs">{levelTitle}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed italic">
                    "{standardCBCRemark}"
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-on-surface-variant uppercase">
                    Evaluated Pedagogical Remarks
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomRemarkEdited(false);
                      setCustomRemarks('');
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset to CBE Standard
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={activeRemarks}
                  onChange={(e) => {
                    setCustomRemarks(e.target.value);
                    setIsCustomRemarkEdited(true);
                  }}
                  placeholder="Enter or customize CBE remarks..."
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface leading-relaxed"
                />
              </div>
            </div>
          )}

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {assessmentType === 'SUMMATIVE' && hasNext && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit(undefined, true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
                  title="Save marks and advance immediately to next student"
                >
                  <span className="material-symbols-outlined text-[16px]">fast_forward</span>
                  <span>Save & Next Learner</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-5 py-2 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{isLoading ? 'Saving...' : assessmentType === 'SUMMATIVE' ? 'Save All Subject Marks' : 'Save Formative Evaluation'}</span>
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};