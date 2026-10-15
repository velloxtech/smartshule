import React, { useState, useEffect, useMemo } from 'react';
import {
  apiService,
  libraryApi,
  createCurriculumTracker,
  getCurriculumTrackers,
  confirmTrackerWeekCovered,
  updateTrackerWeekPlan,
  updateTrackerWeekComment,
  batchUpdateTrackerWeeks,
  deleteCurriculumTracker
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CurriculumTracker,
  CurriculumTrackerWeekItem,
  CreateCurriculumTrackerDTO,
  ConfirmWeekCoveredDTO,
  UserRole,
  ClassRoom,
  BackendLearningArea
} from '../../types';

// Safe API caller helpers resilient against bundling variations
const trackerApi = {
  create: (data: CreateCurriculumTrackerDTO) => {
    const fn = apiService?.createCurriculumTracker || libraryApi?.createCurriculumTracker || createCurriculumTracker;
    if (typeof fn !== 'function') throw new Error('createCurriculumTracker API function is not available.');
    return fn(data);
  },
  getAll: (params?: any) => {
    const fn = apiService?.getCurriculumTrackers || libraryApi?.getCurriculumTrackers || getCurriculumTrackers;
    if (typeof fn !== 'function') throw new Error('getCurriculumTrackers API function is not available.');
    return fn(params);
  },
  confirmCovered: (id: string, week: number, data: ConfirmWeekCoveredDTO) => {
    const fn = apiService?.confirmTrackerWeekCovered || libraryApi?.confirmTrackerWeekCovered || confirmTrackerWeekCovered;
    if (typeof fn !== 'function') throw new Error('confirmTrackerWeekCovered API function is not available.');
    return fn(id, week, data);
  },
  updatePlan: (id: string, week: number, data: Partial<CurriculumTrackerWeekItem>) => {
    const fn = apiService?.updateTrackerWeekPlan || libraryApi?.updateTrackerWeekPlan || updateTrackerWeekPlan;
    if (typeof fn !== 'function') throw new Error('updateTrackerWeekPlan API function is not available.');
    return fn(id, week, data);
  },
  updateComment: (id: string, week: number, comment: string) => {
    const fn = apiService?.updateTrackerWeekComment || libraryApi?.updateTrackerWeekComment || updateTrackerWeekComment;
    if (typeof fn !== 'function') throw new Error('updateTrackerWeekComment API function is not available.');
    return fn(id, week, comment);
  },
  batchUpdate: (id: string, weeks: Partial<CurriculumTrackerWeekItem>[]) => {
    const fn = apiService?.batchUpdateTrackerWeeks || libraryApi?.batchUpdateTrackerWeeks || batchUpdateTrackerWeeks;
    if (typeof fn !== 'function') throw new Error('batchUpdateTrackerWeeks API function is not available.');
    return fn(id, weeks);
  },
  deleteTracker: (id: string) => {
    const fn = apiService?.deleteCurriculumTracker || libraryApi?.deleteCurriculumTracker || deleteCurriculumTracker;
    if (typeof fn !== 'function') throw new Error('deleteCurriculumTracker API function is not available.');
    return fn(id);
  }
};

// Pre-packaged standard Kenyan CBC syllabus templates for instant quick-fill
const SAMPLE_CBC_TEMPLATES: Record<string, Partial<CurriculumTrackerWeekItem>[]> = {
  'Christian Religious Education': [
    { weekNumber: 1, strand: 'Creation', subStrand: 'Self-awareness & Uniqueness', learningOutcomes: 'Recognize self as a unique creation in the image of God', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 1-6' },
    { weekNumber: 2, strand: 'Creation', subStrand: 'God as Provider of Family', learningOutcomes: 'Appreciate family members and their roles in God’s design', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 7-12' },
    { weekNumber: 3, strand: 'The Holy Bible', subStrand: 'Divisions of the Bible', learningOutcomes: 'Distinguish between Old and New Testaments and recite sample books', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 13-18; Holy Bible' },
    { weekNumber: 4, strand: 'The Holy Bible', subStrand: 'Bible Stories: Samuel', learningOutcomes: 'Narrate call of Samuel and demonstrate listening to God’s voice', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 19-25; Charts' },
    { weekNumber: 5, strand: 'Life of Jesus Christ', subStrand: 'Baptism of Jesus', learningOutcomes: 'Describe Jesus’ baptism by John in River Jordan', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 26-31' },
    { weekNumber: 6, strand: 'Life of Jesus Christ', subStrand: 'Call of First Disciples', learningOutcomes: 'Identify first four disciples and emulate following Jesus', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 32-38' },
    { weekNumber: 7, strand: 'Christian Values', subStrand: 'Honesty and Truthfulness', learningOutcomes: 'Demonstrate honesty in handling school items and peer interactions', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 39-45' },
    { weekNumber: 8, strand: 'Christian Values', subStrand: 'Obedience to Elders', learningOutcomes: 'Explain importance of obeying parents and teachers (Exodus 20:12)', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 46-52' },
    { weekNumber: 9, strand: 'Christian Values', subStrand: 'Forgiveness and Sharing', learningOutcomes: 'Role-play forgiving peers and sharing learning resources', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 53-59' },
    { weekNumber: 10, strand: 'The Church Community', subStrand: 'Prayer and Worship', learningOutcomes: 'Recite Lord’s Prayer and participate in school assembly worship', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 60-66' },
    { weekNumber: 11, strand: 'Term Assessment & Revision', subStrand: 'Key CBC Concepts Review', learningOutcomes: 'Synthesize core biblical competencies, values, and reflections', plannedLessons: 5, resources: 'Revision Question Bank & Worksheets' },
    { weekNumber: 12, strand: 'Portfolio & Remedial Week', subStrand: 'Remedial and Final Endorsement', learningOutcomes: 'Individual learner portfolio completion and teacher assessment', plannedLessons: 5, resources: 'Student CBC Portfolio Folders' },
  ],
  'Mathematics': [
    { weekNumber: 1, strand: 'Numbers', subStrand: 'Whole Numbers: Place Value up to 10,000', learningOutcomes: 'Identify and state place value of digits up to thousands', plannedLessons: 5, resources: 'KLB Primary Maths Bk 4 Pg 1-8; Abacus' },
    { weekNumber: 2, strand: 'Numbers', subStrand: 'Addition with Regrouping', learningOutcomes: 'Add up to 4-digit numbers with carrying', plannedLessons: 5, resources: 'KLB Primary Maths Bk 4 Pg 9-16' },
    { weekNumber: 3, strand: 'Numbers', subStrand: 'Subtraction with Borrowing', learningOutcomes: 'Subtract up to 4-digit numbers with regrouping', plannedLessons: 5, resources: 'KLB Primary Maths Bk 4 Pg 17-24' },
    { weekNumber: 4, strand: 'Numbers', subStrand: 'Multiplication as Repeated Addition', learningOutcomes: 'Multiply 2-digit numbers by 1-digit numbers', plannedLessons: 5, resources: 'Multiplication flash cards; KLB Pg 25-32' },
    { weekNumber: 5, strand: 'Numbers', subStrand: 'Division without Remainder', learningOutcomes: 'Divide 2-digit numbers by 1-digit numbers', plannedLessons: 5, resources: 'Counters; KLB Bk 4 Pg 33-40' },
    { weekNumber: 6, strand: 'Fractions', subStrand: 'Proper and Improper Fractions', learningOutcomes: 'Represent fractions using circle and rectangle cut-outs', plannedLessons: 5, resources: 'Fraction strips; Manila paper' },
    { weekNumber: 7, strand: 'Measurement', subStrand: 'Length: Metres and Centimetres', learningOutcomes: 'Measure classroom items using 1-metre ruler accurately', plannedLessons: 5, resources: 'Metre rules; Tape measures' },
    { weekNumber: 8, strand: 'Measurement', subStrand: 'Mass: Kilograms and Grams', learningOutcomes: 'Estimate and weigh classroom objects using beam balance', plannedLessons: 5, resources: 'Kitchen scale; Beam balance' },
    { weekNumber: 9, strand: 'Measurement', subStrand: 'Time: Hours, Minutes, and O’clock', learningOutcomes: 'Read and tell time on analogue and digital clocks', plannedLessons: 5, resources: 'Model clock faces' },
    { weekNumber: 10, strand: 'Geometry', subStrand: '2D Shapes and Angles', learningOutcomes: 'Identify squares, rectangles, triangles, and right angles in environment', plannedLessons: 5, resources: 'Geo-boards; Rulers' },
    { weekNumber: 11, strand: 'Data Handling', subStrand: 'Tally Marks and Bar Graphs', learningOutcomes: 'Collect classroom data and represent on simple bar charts', plannedLessons: 5, resources: 'Grid paper; Graph books' },
    { weekNumber: 12, strand: 'Summative Revision', subStrand: 'End-of-Term Assessment & Remedial', learningOutcomes: 'Consolidate numeracy problem solving and remedial guidance', plannedLessons: 5, resources: 'End-of-Term Assessment Papers' },
  ],
  'English Language': [
    { weekNumber: 1, strand: 'Listening & Speaking', subStrand: 'Oral Presentation: Self and Family', learningOutcomes: 'Speak clearly expressing thoughts about home and school', plannedLessons: 5, resources: 'New Primary English Bk 3 Pg 1-5' },
    { weekNumber: 2, strand: 'Reading', subStrand: 'Phonics and Sight Words', learningOutcomes: 'Read level-appropriate texts fluently with comprehension', plannedLessons: 5, resources: 'Supplementary Reader: Juma Goes to Town' },
    { weekNumber: 3, strand: 'Grammar in Use', subStrand: 'Nouns: Proper and Common Nouns', learningOutcomes: 'Identify and capitalize proper nouns in sentences', plannedLessons: 5, resources: 'Grammar Charts; Sentence strips' },
    { weekNumber: 4, strand: 'Writing', subStrand: 'Punctuation: Capital Letters & Full Stops', learningOutcomes: 'Write coherent 4-sentence paragraphs with correct punctuation', plannedLessons: 5, resources: 'Writing workbooks' },
    { weekNumber: 5, strand: 'Listening & Speaking', subStrand: 'Etiquette: Polite Language & Requests', learningOutcomes: 'Use polite words (please, excuse me, thank you) naturally', plannedLessons: 5, resources: 'Role-play cards' },
    { weekNumber: 6, strand: 'Grammar in Use', subStrand: 'Pronouns: He, She, It, They, We', learningOutcomes: 'Replace repetitive nouns with correct personal pronouns', plannedLessons: 5, resources: 'Flash cards' },
    { weekNumber: 7, strand: 'Reading', subStrand: 'Poetry and Rhymes Comprehension', learningOutcomes: 'Recite poems with rhythm, intonation, and answer inference questions', plannedLessons: 5, resources: 'Anthology of Children’s Poems' },
    { weekNumber: 8, strand: 'Vocabulary', subStrand: 'Environmental and Hygiene Words', learningOutcomes: 'Define and use new words about hygiene in oral and written context', plannedLessons: 5, resources: 'Word wall; Dictionaries' },
    { weekNumber: 9, strand: 'Writing', subStrand: 'Guided Composition: My Best Friend', learningOutcomes: 'Draft a short guided descriptive essay about a friend', plannedLessons: 5, resources: 'Composition guide' },
    { weekNumber: 10, strand: 'Grammar in Use', subStrand: 'Verbs: Present Continuous Tense', learningOutcomes: 'Identify and construct sentences with -ing verbs', plannedLessons: 5, resources: 'Action flashcards' },
    { weekNumber: 11, strand: 'Revision', subStrand: 'Language Practice & Grammar Drills', learningOutcomes: 'Review term grammar, spelling, and listening competencies', plannedLessons: 5, resources: 'Revision Worksheets' },
    { weekNumber: 12, strand: 'Assessment', subStrand: 'Oral Reading & Written Evaluation', learningOutcomes: 'Individual oral fluency check and final writing feedback', plannedLessons: 5, resources: 'Reading assessment rubric' },
  ]
};

export const CurriculumTrackerView: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isSchoolAdmin = Boolean(
    user?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ].includes(user.role)
  );

  // Data states
  const [trackers, setTrackers] = useState<CurriculumTracker[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<CurriculumTracker | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmModalWeek, setConfirmModalWeek] = useState<CurriculumTrackerWeekItem | null>(null);
  const [editPlanModalWeek, setEditPlanModalWeek] = useState<CurriculumTrackerWeekItem | null>(null);
  const [commentModalWeek, setCommentModalWeek] = useState<CurriculumTrackerWeekItem | null>(null);

  // Form states for Confirm Covered
  const [confirmDate, setConfirmDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [confirmLessons, setConfirmLessons] = useState<number>(5);
  const [confirmComment, setConfirmComment] = useState<string>('');
  const [confirmStatus, setConfirmStatus] = useState<'COVERED' | 'IN_PROGRESS' | 'PENDING'>('COVERED');
  const [savingConfirm, setSavingConfirm] = useState(false);

  // Form states for Quick Edit Week Plan
  const [planStrand, setPlanStrand] = useState('');
  const [planSubStrand, setPlanSubStrand] = useState('');
  const [planOutcomes, setPlanOutcomes] = useState('');
  const [planPlannedLessons, setPlanPlannedLessons] = useState<number>(5);
  const [planResources, setPlanResources] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Form states for Comment Modal
  const [quickComment, setQuickComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Load classes & learning areas for creating trackers
  useEffect(() => {
    async function loadAcademicMetaData() {
      try {
        const [clsRes, laRes] = await Promise.all([
          apiService.getClasses().catch(() => null),
          apiService.getLearningAreas().catch(() => null)
        ]);
        if (clsRes?.data) setClasses(clsRes.data);
        if (laRes?.data) setLearningAreas(laRes.data);
      } catch {
        // Fallback gracefully
      }
    }
    loadAcademicMetaData();
  }, []);

  // Load trackers
  const loadTrackers = async () => {
    setLoading(true);
    try {
      const res = await trackerApi.getAll();
      if (res && res.data) {
        setTrackers(res.data);
        if (res.data.length > 0) {
          // If we had a selected tracker, keep it updated, else pick first
          setSelectedTracker((prev) => {
            if (!prev) return res.data[0];
            const updated = res.data.find((t) => t.id === prev.id);
            return updated || res.data[0];
          });
        } else {
          setSelectedTracker(null);
        }
      } else {
        setTrackers([]);
        setSelectedTracker(null);
      }
    } catch {
      setTrackers([]);
      setSelectedTracker(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackers();
  }, []);

  // Filtered weeks for current selected tracker
  const filteredWeeks = useMemo(() => {
    if (!selectedTracker) return [];
    return selectedTracker.items.filter((item) => {
      const matchesSearch =
        item.strand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subStrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.learningOutcomes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.teacherComment && item.teacherComment.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.resources && item.resources.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'COVERED') matchesStatus = item.isCovered;
      if (statusFilter === 'PENDING') matchesStatus = !item.isCovered && item.status === 'PENDING';
      if (statusFilter === 'IN_PROGRESS') matchesStatus = item.status === 'IN_PROGRESS';
      if (statusFilter === 'COMMENTED') matchesStatus = Boolean(item.teacherComment && item.teacherComment.trim().length > 0);

      return matchesSearch && matchesStatus;
    });
  }, [selectedTracker, searchTerm, statusFilter]);

  // Open Confirm Covered Modal
  const handleOpenConfirm = (week: CurriculumTrackerWeekItem) => {
    setConfirmModalWeek(week);
    setConfirmDate(week.coveredAt || new Date().toISOString().split('T')[0]);
    setConfirmLessons(week.lessonsTaught || week.plannedLessons || 5);
    setConfirmComment(week.teacherComment || '');
    setConfirmStatus(week.isCovered ? 'COVERED' : 'COVERED');
  };

  // Submit Confirm Covered
  const handleSaveConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !confirmModalWeek) return;

    setSavingConfirm(true);
    try {
      const isMarkingCovered = confirmStatus === 'COVERED';
      const payload: ConfirmWeekCoveredDTO = {
        covered: isMarkingCovered,
        coveredAt: isMarkingCovered ? confirmDate : undefined,
        lessonsTaught: confirmLessons,
        comment: confirmComment,
        status: confirmStatus
      };

      const res = await trackerApi.confirmCovered(
        selectedTracker.id,
        confirmModalWeek.weekNumber,
        payload
      );

      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setConfirmModalWeek(null);
    } catch (err: any) {
      alert(err.message || 'Error updating coverage status');
    } finally {
      setSavingConfirm(false);
    }
  };

  // Open Quick Edit Plan Modal
  const handleOpenEditPlan = (week: CurriculumTrackerWeekItem) => {
    setEditPlanModalWeek(week);
    setPlanStrand(week.strand || '');
    setPlanSubStrand(week.subStrand || '');
    setPlanOutcomes(week.learningOutcomes || '');
    setPlanPlannedLessons(week.plannedLessons || 5);
    setPlanResources(week.resources || '');
  };

  // Submit Quick Edit Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !editPlanModalWeek) return;

    setSavingPlan(true);
    try {
      const payload = {
        strand: planStrand,
        subStrand: planSubStrand,
        learningOutcomes: planOutcomes,
        plannedLessons: planPlannedLessons,
        resources: planResources
      };

      const res = await trackerApi.updatePlan(
        selectedTracker.id,
        editPlanModalWeek.weekNumber,
        payload
      );

      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setEditPlanModalWeek(null);
    } catch (err: any) {
      alert(err.message || 'Error saving weekly syllabus plan');
    } finally {
      setSavingPlan(false);
    }
  };

  // Open Quick Comment Modal
  const handleOpenComment = (week: CurriculumTrackerWeekItem) => {
    setCommentModalWeek(week);
    setQuickComment(week.teacherComment || '');
  };

  // Submit Quick Comment
  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !commentModalWeek) return;

    setSavingComment(true);
    try {
      const res = await trackerApi.updateComment(
        selectedTracker.id,
        commentModalWeek.weekNumber,
        quickComment
      );

      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setCommentModalWeek(null);
    } catch (err: any) {
      alert(err.message || 'Error saving comment');
    } finally {
      setSavingComment(false);
    }
  };

  // Quick Load Standard Template for current tracker
  const handleApplyTemplate = async (templateName: string) => {
    if (!selectedTracker) return;
    const templateWeeks = SAMPLE_CBC_TEMPLATES[templateName];
    if (!templateWeeks) return;

    if (
      !window.confirm(
        `Load the standard Kenyan CBC syllabus outline for ${templateName} into this tracker? This will populate Week 1 through 12.`
      )
    ) {
      return;
    }

    try {
      const res = await trackerApi.batchUpdate(selectedTracker.id, templateWeeks);
      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error applying curriculum template');
    }
  };

  // Delete Tracker
  const handleDeleteTracker = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the tracker for "${name}"?`)) return;

    try {
      await trackerApi.deleteTracker(id);
      setTrackers((prev) => prev.filter((t) => t.id !== id));
      if (selectedTracker?.id === id) {
        const remaining = trackers.filter((t) => t.id !== id);
        setSelectedTracker(remaining[0] || null);
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting curriculum tracker');
    }
  };

  // Quick Toggle Covered state inline
  const handleQuickToggleCovered = async (week: CurriculumTrackerWeekItem) => {
    if (!selectedTracker) return;

    const nextCovered = !week.isCovered;
    try {
      const res = await trackerApi.confirmCovered(
        selectedTracker.id,
        week.weekNumber,
        {
          covered: nextCovered,
          coveredAt: nextCovered ? new Date().toISOString().split('T')[0] : undefined,
          status: nextCovered ? 'COVERED' : 'PENDING',
          lessonsTaught: nextCovered ? (week.lessonsTaught || week.plannedLessons || 5) : 0,
          comment: week.teacherComment || (nextCovered ? 'Confirmed covered on schedule' : undefined)
        }
      );

      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling coverage status');
    }
  };

  // Completion percentage
  const stats = selectedTracker?.stats || {
    totalWeeks: 12,
    coveredWeeks: 0,
    inProgressWeeks: 0,
    pendingWeeks: 12,
    delayedWeeks: 0,
    completionPercentage: 0,
    commentsCount: 0
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          header, aside, #main-sidebar, nav, footer, .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #9ca3af !important;
            padding: 6px 8px !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>

      {/* Printable Official Header */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">
          SmartShule Academic Management
        </h2>
        <h3 className="text-base font-bold text-[#7a1228] mt-1 uppercase">
          Official Curriculum Progress & Syllabus Coverage Tracker
        </h3>
        {selectedTracker && (
          <p className="text-xs text-gray-700 mt-1 font-semibold">
            {selectedTracker.subjectName} · {selectedTracker.className} {selectedTracker.streamName ? `(${selectedTracker.streamName})` : ''} · {selectedTracker.term} {selectedTracker.academicYear} · Teacher: {selectedTracker.teacherName}
          </p>
        )}
        <div className="border-b-2 border-gray-900 mt-3 mb-4" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Curriculum & Timetable</span>
            <span>/</span>
            <span className="text-primary font-semibold">Curriculum Progress Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-[#7a1228] text-3xl">fact_check</span>
            Curriculum Progress Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plan what you cover from Week 1 to the final week, confirm coverage as lessons proceed, and record reflections & comments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            disabled={!selectedTracker}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Print syllabus coverage broadsheet report"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Report</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Subject Tracker</span>
          </button>
        </div>
      </div>

      {/* Tracker Selector Bar (Tabs / Dropdown) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#7a1228] text-[18px]">auto_stories</span>
            Select Tracker:
          </label>
          <select
            value={selectedTracker?.id || ''}
            onChange={(e) => {
              const found = trackers.find((t) => t.id === e.target.value);
              if (found) setSelectedTracker(found);
            }}
            className="w-full md:w-80 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors bg-white font-semibold text-gray-800"
          >
            {trackers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.subjectName} · {t.className} ({t.term} {t.academicYear})
              </option>
            ))}
            {trackers.length === 0 && <option value="">No curriculum trackers yet</option>}
          </select>
        </div>

        {selectedTracker && (
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="text-xs text-gray-500 font-medium">
              Teacher: <span className="font-bold text-gray-800">{selectedTracker.teacherName}</span>
            </div>

            {/* Template Fill Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-1 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Populate syllabus with standard Kenyan CBC breakdown"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-700">bolt</span>
                <span>Load CBC Template</span>
                <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
              </button>

              <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-2 hidden group-hover:block group-focus-within:block z-20">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                  1-Click Sample Schemes
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Christian Religious Education')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-rose-50 hover:text-[#7a1228] rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#7a1228]">menu_book</span>
                  Grade 3 CRE (12 Weeks)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Mathematics')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-rose-50 hover:text-[#7a1228] rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-700">calculate</span>
                  Grade 4 Mathematics (12 Weeks)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('English Language')}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-rose-50 hover:text-[#7a1228] rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-700">record_voice_over</span>
                  Grade 3 English (12 Weeks)
                </button>
              </div>
            </div>

            <button
              onClick={() => handleDeleteTracker(selectedTracker.id, selectedTracker.subjectName)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Tracker"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Cards */}
      {selectedTracker && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          {/* Overall Completion Progress */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Curriculum Coverage</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {stats.completionPercentage}% Done
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-gray-900">{stats.coveredWeeks} / {stats.totalWeeks}</span>
                <span className="text-xs font-semibold text-gray-500">Weeks Completed</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pending & In Progress */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming & In Progress</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.pendingWeeks + stats.inProgressWeeks}
                <span className="text-xs font-normal text-gray-500 ml-1.5">Weeks remaining</span>
              </h3>
            </div>
          </div>

          {/* Reflections & Comments Logged */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">comment</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comments Logged</p>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-gray-900">{stats.commentsCount}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-[#7a1228] font-bold">
                  {stats.totalWeeks > 0 ? `${Math.round((stats.commentsCount / stats.totalWeeks) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Academic Term */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Term</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                {selectedTracker.term} · {selectedTracker.academicYear}
              </h3>
              <p className="text-[11px] text-gray-500">{selectedTracker.className} {selectedTracker.streamName || ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {selectedTracker && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search strand, subtopic, or reflection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors bg-white font-medium text-gray-700"
            >
              <option value="ALL">All Weeks</option>
              <option value="COVERED">Covered Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMMENTED">With Comments Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Week-by-Week Table */}
      {selectedTracker && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print-full-width">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm print-table">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Week</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[240px]">
                    Curriculum Content (Strand & Sub-strand)
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[220px]">
                    Specific Learning Outcomes
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider w-40">
                    Resources & Ref
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider w-48 text-center">
                    Coverage Status
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-amber-900 bg-amber-50/40 uppercase tracking-wider min-w-[240px]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">comment</span>
                      Teacher Comment & Reflection
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider text-right no-print w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWeeks.map((week) => (
                  <tr
                    key={week.id || week.weekNumber}
                    className={`transition-colors group align-top ${
                      week.isCovered ? 'bg-emerald-50/15 hover:bg-emerald-50/25' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Week Number & Timeline */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center justify-center w-12 py-1 rounded-lg bg-gray-100 text-gray-900 font-bold text-xs">
                          Week {week.weekNumber}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1 font-medium">
                          {week.plannedLessons || 5} Lessons
                        </span>
                        {week.targetDate && (
                          <span className="text-[10px] text-gray-400 mt-0.5">Target: {week.targetDate}</span>
                        )}
                      </div>
                    </td>

                    {/* Strand & Sub-strand */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900 text-sm">{week.strand || 'No Strand Specified'}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{week.subStrand || '--'}</div>
                      {week.suggestedActivities && (
                        <div className="text-[11px] text-gray-400 mt-1 italic">
                          Act: {week.suggestedActivities}
                        </div>
                      )}
                    </td>

                    {/* Specific Learning Outcomes */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-700 leading-relaxed whitespace-normal">
                        {week.learningOutcomes || (
                          <span className="text-gray-400 italic">No specific outcomes defined yet</span>
                        )}
                      </div>
                    </td>

                    {/* Resources & References */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-600 font-medium whitespace-normal" title={week.resources}>
                        {week.resources || '--'}
                      </div>
                    </td>

                    {/* Coverage Status & Confirmation */}
                    <td className="px-4 py-3.5 text-center">
                      {week.isCovered ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            <span>Covered</span>
                          </span>
                          {week.coveredAt && (
                            <span className="text-[11px] text-gray-500 font-semibold">{week.coveredAt}</span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {week.lessonsTaught || week.plannedLessons} lessons taught
                          </span>
                        </div>
                      ) : week.status === 'IN_PROGRESS' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                            <span className="material-symbols-outlined text-[15px]">timelapse</span>
                            <span>In Progress</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenConfirm(week)}
                            className="mt-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            Mark Covered
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                            Pending
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenConfirm(week)}
                            className="mt-1 px-2.5 py-1 bg-[#7a1228] hover:bg-[#5e0d1e] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Confirm</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Teacher Comment & Reflection */}
                    <td className="px-4 py-3.5 bg-amber-50/20">
                      {week.teacherComment && week.teacherComment.trim() ? (
                        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-2.5 shadow-2xs text-xs text-amber-950">
                          <div className="flex items-center justify-between gap-1 mb-1 text-amber-800 font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-amber-600">psychology</span>
                              <span>Teacher Remark</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenComment(week)}
                              className="text-[10px] text-amber-700 underline hover:text-amber-900 cursor-pointer no-print"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="leading-relaxed whitespace-normal">{week.teacherComment}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-gray-400 italic pt-1">
                          <span>-- No comment yet --</span>
                          <button
                            type="button"
                            onClick={() => handleOpenComment(week)}
                            className="text-[11px] text-[#7a1228] font-semibold hover:underline cursor-pointer not-italic no-print"
                          >
                            + Add Comment
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3.5 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlan(week)}
                          className="p-1.5 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Week Plan (Strand, Outcomes, Resources)"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenConfirm(week)}
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Confirm coverage or update remarks"
                        >
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredWeeks.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
              <p className="text-sm font-semibold text-gray-700 mt-2">No weekly curriculum items match your filter</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting the search box or status filter.</p>
            </div>
          )}

          {/* Printable Signature Footer */}
          <div className="hidden print:flex justify-between items-end p-8 mt-6 border-t border-gray-400 text-xs">
            <div>
              <p className="font-bold text-gray-800">Subject Teacher: {selectedTracker.teacherName}</p>
              <div className="border-b border-gray-400 w-48 mt-8 mb-1" />
              <p className="text-gray-500">Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-800">Head of Department / Academic Dean</p>
              <div className="border-b border-gray-400 w-48 mt-8 mb-1" />
              <p className="text-gray-500">Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-800">Head Teacher / Principal Endorsement</p>
              <div className="border-b border-gray-400 w-48 mt-8 mb-1" />
              <p className="text-gray-500">Official Stamp & Date</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no trackers exist */}
      {!selectedTracker && !loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#7a1228] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">fact_check</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Curriculum Progress Trackers Found</h3>
          <p className="text-xs text-gray-500 max-w-md mt-1 mb-6">
            Create a Curriculum Progress Tracker for your assigned class and subject to organize weekly syllabus goals from Week 1 to Week 12.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] font-semibold text-sm flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Curriculum Tracker</span>
          </button>
        </div>
      )}

      {/* MODAL 1: Confirm Covered Modal */}
      {confirmModalWeek && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#7a1228] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">verified</span>
                <div>
                  <h3 className="font-bold text-sm">Confirm Curriculum Coverage</h3>
                  <p className="text-[11px] text-rose-100">
                    Week {confirmModalWeek.weekNumber}: {confirmModalWeek.strand}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalWeek(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfirm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Coverage Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStatus('COVERED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      confirmStatus === 'COVERED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Fully Covered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmStatus('IN_PROGRESS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      confirmStatus === 'IN_PROGRESS'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">timelapse</span>
                    <span>In Progress</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmStatus('PENDING')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      confirmStatus === 'PENDING'
                        ? 'border-gray-400 bg-gray-100 text-gray-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                    <span>Pending</span>
                  </button>
                </div>
              </div>

              {confirmStatus === 'COVERED' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Date Covered
                    </label>
                    <input
                      type="date"
                      required
                      value={confirmDate}
                      onChange={(e) => setConfirmDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Lessons Conducted
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={confirmLessons}
                      onChange={(e) => setConfirmLessons(parseInt(e.target.value, 10) || 5)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Teacher Comment & Lesson Reflections
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. All 35 learners mastered the concept well. Remedial exercises assigned to two students. Role-play activity was very engaging."
                  value={confirmComment}
                  onChange={(e) => setConfirmComment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave notes on learner mastery, challenges faced, remedial steps, or syllabus pacing.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmModalWeek(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfirm}
                  className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-semibold hover:bg-[#5e0d1e] shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{savingConfirm ? 'Saving...' : 'Confirm Coverage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Week Plan (What to cover) */}
      {editPlanModalWeek && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-rose-400">edit_note</span>
                <div>
                  <h3 className="font-bold text-sm">Edit Week {editPlanModalWeek.weekNumber} Plan</h3>
                  <p className="text-[11px] text-gray-300">Define what is to be covered this week</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditPlanModalWeek(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Strand / Broad Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Numbers / Living Things"
                    value={planStrand}
                    onChange={(e) => setPlanStrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Sub-Strand / Sub-Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Addition with regrouping"
                    value={planSubStrand}
                    onChange={(e) => setPlanSubStrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Specific Learning Outcomes (What to Cover)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. By the end of this week, learners should be able to identify place value up to 10,000 and solve practical problems."
                  value={planOutcomes}
                  onChange={(e) => setPlanOutcomes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Planned Lessons
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={planPlannedLessons}
                    onChange={(e) => setPlanPlannedLessons(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Resources & References
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KLB Bk 4 Pg 12-18; Abacus"
                    value={planResources}
                    onChange={(e) => setPlanResources(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditPlanModalWeek(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-semibold hover:bg-[#5e0d1e] shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{savingPlan ? 'Saving...' : 'Save Weekly Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Comment Modal */}
      {commentModalWeek && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">chat</span>
                <div>
                  <h3 className="font-bold text-sm">Teacher Comment / Reflection</h3>
                  <p className="text-[11px] text-amber-100">Week {commentModalWeek.weekNumber}: {commentModalWeek.strand}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentModalWeek(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveComment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Reflection & Observations
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter your observations regarding learner understanding, practical engagement, remedial needs, or pacing adjustments..."
                  value={quickComment}
                  onChange={(e) => setQuickComment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCommentModalWeek(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingComment}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{savingComment ? 'Saving...' : 'Save Comment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create New Curriculum Tracker Modal */}
      {isCreateModalOpen && (
        <CreateTrackerModal
          classes={classes}
          learningAreas={learningAreas}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newTracker) => {
            setTrackers((prev) => [newTracker, ...prev]);
            setSelectedTracker(newTracker);
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Sub-component for Create Tracker Modal
interface CreateTrackerModalProps {
  classes: ClassRoom[];
  learningAreas: BackendLearningArea[];
  onClose: () => void;
  onCreated: (tracker: CurriculumTracker) => void;
}

const CreateTrackerModal: React.FC<CreateTrackerModalProps> = ({
  classes,
  learningAreas,
  onClose,
  onCreated
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [learningAreaId, setLearningAreaId] = useState('');
  const [className, setClassName] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [term, setTerm] = useState('Term 3');
  const [academicYear, setAcademicYear] = useState('2026');
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [templateSelection, setTemplateSelection] = useState<string>('NONE');
  const [loading, setLoading] = useState(false);

  // When user picks a learning area dropdown
  const handleSelectLearningArea = (laId: string) => {
    setLearningAreaId(laId);
    const la = learningAreas.find((l) => l.id === laId);
    if (la) {
      setSubjectName(la.name);
      // Auto-suggest template if matching
      if (la.name.toLowerCase().includes('relig') || la.name.toLowerCase().includes('cre')) {
        setTemplateSelection('Christian Religious Education');
      } else if (la.name.toLowerCase().includes('math')) {
        setTemplateSelection('Mathematics');
      } else if (la.name.toLowerCase().includes('eng')) {
        setTemplateSelection('English Language');
      }
    }
  };

  // When user picks a class
  const handleSelectClass = (cId: string) => {
    setClassRoomId(cId);
    const c = classes.find((cl) => cl.id === cId);
    if (c) {
      setClassName(c.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !className) {
      alert('Please enter or select both Subject and Class/Grade.');
      return;
    }

    setLoading(true);
    try {
      let initialItems: Partial<CurriculumTrackerWeekItem>[] | undefined = undefined;
      if (templateSelection !== 'NONE' && SAMPLE_CBC_TEMPLATES[templateSelection]) {
        initialItems = SAMPLE_CBC_TEMPLATES[templateSelection];
      }

      const payload: CreateCurriculumTrackerDTO = {
        learningAreaId: learningAreaId || `la-${Date.now()}`,
        subjectName,
        classRoomId: classRoomId || `class-${Date.now()}`,
        className,
        streamName: streamName || undefined,
        term,
        academicYear,
        totalWeeks,
        items: initialItems
      };

      const res = await trackerApi.create(payload);
      if (res?.data) {
        onCreated(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating curriculum tracker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-[#7a1228] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">post_add</span>
            <div>
              <h3 className="font-bold text-sm">New Curriculum Progress Tracker</h3>
              <p className="text-[11px] text-rose-100">Initialize weekly breakdown for a subject and grade</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Subject / Learning Area *
              </label>
              {learningAreas.length > 0 ? (
                <select
                  value={learningAreaId}
                  onChange={(e) => handleSelectLearningArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  required
                >
                  <option value="">Select Learning Area...</option>
                  {learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Class / Grade *
              </label>
              {classes.length > 0 ? (
                <select
                  value={classRoomId}
                  onChange={(e) => handleSelectClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  required
                >
                  <option value="">Select Grade...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 3"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Stream (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. East / Blue"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Term
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Total Weeks in Term
              </label>
              <select
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              >
                <option value={10}>10 Weeks</option>
                <option value={12}>12 Weeks (Standard)</option>
                <option value={14}>14 Weeks</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Pre-populate Template
              </label>
              <select
                value={templateSelection}
                onChange={(e) => setTemplateSelection(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] font-medium text-amber-900 bg-amber-50/50"
              >
                <option value="NONE">Blank (Custom Entry)</option>
                <option value="Christian Religious Education">Grade 3 CRE (12 Weeks)</option>
                <option value="Mathematics">Grade 4 Mathematics (12 Weeks)</option>
                <option value="English Language">Grade 3 English (12 Weeks)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-semibold hover:bg-[#5e0d1e] shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>{loading ? 'Creating...' : 'Initialize Tracker'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurriculumTrackerView;
