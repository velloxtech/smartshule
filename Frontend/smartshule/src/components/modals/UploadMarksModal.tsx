import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
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

interface UploadMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarksUploaded?: () => void;
  initialStudent?: Student;
}

// Curated default CBC Learning Areas to ensure dropdowns are always populated
const DEFAULT_CBC_LEARNING_AREAS: BackendLearningArea[] = [
  { id: 'la-math-g7', code: 'MATH', name: 'Mathematics' } as any,
  { id: 'la-eng-g7', code: 'ENG', name: 'English Language' } as any,
  { id: 'la-kisw-g7', code: 'KISW', name: 'Kiswahili Lugha' } as any,
  { id: 'la-sci-g7', code: 'SCI', name: 'Integrated Science' } as any,
  { id: 'la-soc-g7', code: 'SOC', name: 'Social Studies' } as any,
  { id: 'la-cre-g7', code: 'CRE', name: 'Religious Education (CRE / IRE)' } as any,
  { id: 'la-arts-g7', code: 'ARTS', name: 'Creative Arts & Sports' } as any,
  { id: 'la-agri-g7', code: 'AGRI', name: 'Agriculture & Nutrition' } as any,
  { id: 'la-pretech-g7', code: 'PTECH', name: 'Pre-Technical Studies' } as any,
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
  const grade = s.grade || (s.gradeLevel ? s.gradeLevel.replace(/_/g, ' ') : 'CBC Grade');
  const stream = s.stream?.name || s.streamName || (s.streamId ? `Stream ${s.streamId.slice(0, 6)}` : '');

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
    cbcRating: s.cbcRating || 'ME',
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
}) => {
  const { user } = useAuth();

  // Academic Context Dropdowns State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [academicYearId, setAcademicYearId] = useState<string>('year-2026');
  const [termId, setTermId] = useState<string>('term-2026-t1');

  // Class & Stream Filter Dropdowns State
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterStreamId, setFilterStreamId] = useState<string>('');

  // Learner Selection & Search State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [learnerSearch, setLearnerSearch] = useState<string>('');

  // Curriculum Subject / Learning Area Dropdowns State
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<'SUMMATIVE' | 'FORMATIVE'>('SUMMATIVE');

  // Strand and Sub-strand Dropdowns State
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState<string>('');

  // Formative Assessment Specific Dropdowns
  const [assessmentMethod, setAssessmentMethod] = useState<string>('OBSERVATION');
  const [targetedCompetency, setTargetedCompetency] = useState<string>('CRITICAL_THINKING_AND_PROBLEM_SOLVING');
  const [observedValue, setObservedValue] = useState<string>('INTEGRITY');
  const [specificOutcomeTested, setSpecificOutcomeTested] = useState<string>('Competency mastery evaluation');

  // Marks Inputs & CBC Evaluation
  const [rawScore, setRawScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [customRemarks, setCustomRemarks] = useState<string>('');
  const [isCustomRemarkEdited, setIsCustomRemarkEdited] = useState(false);

  // Form State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial academic context, classes, learners, and learning areas from DB
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

        // 1. Classes
        if (cRes?.data && Array.isArray(cRes.data)) {
          setClasses(cRes.data);
        }

        // 2. Academic Years & Terms
        if (yrRes?.data && Array.isArray(yrRes.data) && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
        } else {
          setAcademicYears([
            { id: 'year-2026', name: '2026', startDate: '2026-01-05', endDate: '2026-11-28', isCurrent: true },
            { id: 'year-2025', name: '2025', startDate: '2025-01-06', endDate: '2025-11-28', isCurrent: false },
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
          // Default terms fallback
          setTerms([
            { id: 'term-2026-t1', academicYearId: 'year-2026', name: 'Term 1', termNumber: 1, startDate: '2026-01-05', endDate: '2026-04-05', isCurrent: false },
            { id: 'term-2026-t2', academicYearId: 'year-2026', name: 'Term 2', termNumber: 2, startDate: '2026-05-04', endDate: '2026-08-07', isCurrent: false },
            { id: 'term-2026-t3', academicYearId: 'year-2026', name: 'Term 3', termNumber: 3, startDate: '2026-08-31', endDate: '2026-11-28', isCurrent: true },
          ]);
          setTermId('term-2026-t3');
        }

        // 3. Students
        if (stRes?.data && Array.isArray(stRes.data)) {
          const mapped = stRes.data.map(normalizeStudent);
          setStudents(mapped);
          if (initialStudent?.id) {
            setSelectedStudentId(initialStudent.id);
            if (initialStudent.classroomId) setFilterClassId(initialStudent.classroomId);
            if (initialStudent.streamId) setFilterStreamId(initialStudent.streamId);
          } else if (mapped.length > 0) {
            setSelectedStudentId(mapped[0].id);
          }
        }

        // 4. Learning Areas (With fallback to DEFAULT_CBC_LEARNING_AREAS)
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

  // Load terms when academic year changes
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
      .catch(() => {
        // Keep fallback
      });
  }, [academicYearId]);

  // Load streams when filter class changes
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

  // Fetch strands dynamically when learning area changes (with fallback)
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
          // Provide default CBC strands for this subject
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

  // Fetch sub-strands dynamically when strand changes (with fallback)
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
          // General fallback sub-strands
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

  // Filter students by selected class, stream, and search keyword
  const filteredStudents = students.filter((s) => {
    // 1. Search Query
    if (learnerSearch.trim()) {
      const q = learnerSearch.toLowerCase();
      const matchesName = s.name.toLowerCase().includes(q);
      const matchesAdm = s.admNo.toLowerCase().includes(q);
      const matchesUpi = s.upi.toLowerCase().includes(q);
      if (!matchesName && !matchesAdm && !matchesUpi) {
        return false;
      }
    }

    // 2. Class Filter
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

    // 3. Stream Filter
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

  // Ensure selected student exists in filtered list
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [filterClassId, filterStreamId, learnerSearch, filteredStudents, selectedStudentId]);

  // CBC Standard Dynamic Evaluation Engine
  const numScore = parseFloat(rawScore) || 0;
  const numMax = parseFloat(maxScore) || 100;
  const percentage = numMax > 0 ? Math.round((numScore / numMax) * 100) : 0;

  let performanceLevel: 'EE' | 'ME' | 'AE' | 'BE' = 'BE';
  let levelTitle = 'Below Expectations (BE)';
  let levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  let standardCbcRemark = '';

  if (percentage >= 80) {
    performanceLevel = 'EE';
    levelTitle = 'Exceeding Expectations (EE) - Level 4';
    levelBadgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
    standardCbcRemark = 'Exceeds expected curriculum competencies. Demonstrates exemplary conceptual understanding, high accuracy, creative problem solving, and independent application.';
  } else if (percentage >= 60) {
    performanceLevel = 'ME';
    levelTitle = 'Meeting Expectations (ME) - Level 3';
    levelBadgeColor = 'bg-[#7a1228]/15 text-[#7a1228] border-[#7a1228]/30';
    standardCbcRemark = 'Meets expected CBC learning competencies effectively. Demonstrates solid conceptual comprehension, consistent application of skills, and required task completion.';
  } else if (percentage >= 40) {
    performanceLevel = 'AE';
    levelTitle = 'Approaching Expectations (AE) - Level 2';
    levelBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    standardCbcRemark = 'Approaching expected learning competencies. Grasps basic principles and concepts but benefits from guided teacher practice, scaffolding, and reinforced exercises.';
  } else {
    performanceLevel = 'BE';
    levelTitle = 'Below Expectations (BE) - Level 1';
    levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
    standardCbcRemark = 'Below expected competency level. Requires structured scaffolding, intensive teacher remediation, and personalized interventions to master foundational learning outcomes.';
  }

  // Update remarks default if not manually overridden
  const activeRemarks = isCustomRemarkEdited ? customRemarks : standardCbcRemark;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      setError('Please select a valid learner');
      setIsLoading(false);
      return;
    }

    if (!selectedLearningAreaId) {
      setError('Please select a valid learning area / subject');
      setIsLoading(false);
      return;
    }

    if (assessmentType === 'FORMATIVE' && !selectedSubStrandId) {
      setError('Please select a valid sub-strand for formative assessment.');
      setIsLoading(false);
      return;
    }

    const effectiveYearId = academicYearId || 'year-2026';
    const effectiveTermId = termId || 'term-2026-t1';
    const effectiveTeacherId = (user?.id && user.id.trim() !== '') ? user.id : 'tch-default-01';

    try {
      if (assessmentType === 'SUMMATIVE') {
        const payload = {
          studentId: selectedStudentId,
          teacherId: effectiveTeacherId,
          learningAreaId: selectedLearningAreaId,
          termId: effectiveTermId,
          academicYearId: effectiveYearId,
          strandScores: selectedStrandId
            ? [
                {
                  strandId: selectedStrandId,
                  performanceLevel,
                  rawScore: numScore,
                  maxScore: numMax,
                },
              ]
            : [],
          overallPerformanceLevel: performanceLevel,
          teacherRemarks: activeRemarks,
          evaluationDate: new Date().toISOString().split('T')[0],
        };

        const res = await apiService.recordSummativeAssessment(payload);
        if (res.success) {
          setSuccessMessage(`Marks uploaded successfully! Recorded as ${performanceLevel} (${percentage}%) according to CBC standards.`);
          setTimeout(() => {
            onMarksUploaded?.();
            onClose();
          }, 1500);
        }
      } else {
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
        if (res.success) {
          setSuccessMessage(`Formative evaluation recorded successfully as ${performanceLevel}!`);
          setTimeout(() => {
            onMarksUploaded?.();
            onClose();
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error('Error recording assessment:', err);
      setError(err.message || 'Failed to record CBC marks');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLearner = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Maroon Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">grade</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Upload Marks & CBC Rubric</h3>
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
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

          {/* 1. Academic Session Controls (Year, Term, & Assessment Mode) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#7a1228]">calendar_month</span>
                <span>Academic Session & Evaluation Mode</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Academic Year Dropdown */}
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
                      Year {yr.name} {yr.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term Dropdown */}
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

              {/* Assessment Mode Dropdown */}
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

          {/* 2. Class & Stream Filtering Dropdowns */}
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
              {/* Class Dropdown */}
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

              {/* Stream Dropdown */}
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

          {/* 3. Learner Selection Dropdown with Search & Image/Avatar Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-on-surface-variant uppercase text-xs">
                Select Learner *
              </label>
              {filteredStudents.length > 5 && (
                <span className="text-[10px] text-gray-500">
                  Type name or admission number to search
                </span>
              )}
            </div>

            {/* Quick Search Input */}
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

            {/* Learner Select Dropdown */}
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

            {/* Selected Learner Visual Card with Profile Photo / Avatar */}
            {currentLearner && (
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3 shadow-xs">
                {/* Profile Photo / Initials Avatar */}
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

          {/* 4. Subject / Learning Area Dropdown */}
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
                {learningAreas.length === 0 ? (
                  <option value="">No subjects found</option>
                ) : (
                  learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name} {la.code ? `(${la.code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Curriculum Strand Dropdown */}
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Curriculum Strand {assessmentType === 'FORMATIVE' ? '*' : '(Optional)'}
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

          {/* 5. Formative-Specific Dropdowns (Sub-strand, Method, Competency, Value) */}
          {assessmentType === 'FORMATIVE' && (
            <div className="p-3.5 bg-rose-50/40 border border-rose-200/60 rounded-xl space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#7a1228] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                <span>Formative CBC Competency Evaluation</span>
              </div>

              {/* Sub-Strand Dropdown */}
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
                {/* Assessment Method Dropdown */}
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

                {/* Specific Outcome Tested Input */}
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
                {/* Core Competency Tested Dropdown */}
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

                {/* Core Value Observed Dropdown */}
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
          )}

          {/* 6. Numerical Marks Entry & Performance Rubric Dropdown */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-primary">
                Learner Numerical Marks & KICD Rubric
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">
                Standard CBC Rating
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

            {/* Quick Rubric Selector Buttons */}
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

            {/* Dynamic CBC Live Evaluation Result */}
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
                "{standardCbcRemark}"
              </p>
            </div>
          </div>

          {/* 7. Teacher CBC Evaluated Pedagogical Remarks */}
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
                Reset to CBC Standard
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
              placeholder="Enter or customize CBC remarks..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface leading-relaxed"
            />
            <p className="text-[10px] text-on-surface-variant mt-1">
              Remarks are automatically pre-filled to match KICD National CBC benchmarks for <strong className="font-bold">{performanceLevel}</strong>.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isLoading ? 'Saving Evaluation...' : 'Save CBC Marks & Evaluated Remarks'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
