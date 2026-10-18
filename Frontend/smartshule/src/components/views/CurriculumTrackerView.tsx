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
  deleteCurriculumTracker,
  addCurriculumDailyLog,
  updateCurriculumDailyLog,
  endorseCurriculumDailyLog,
  deleteCurriculumDailyLog,
  getCurriculumDailyLogs
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CurriculumTracker,
  CurriculumTrackerWeekItem,
  CurriculumTrackerDailyLog,
  EnrichedDailyLog,
  DailyLessonStatus,
  LearnerComprehension,
  AddDailyLogDTO,
  UpdateDailyLogDTO,
  EndorseDailyLogDTO,
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
  },
  addDailyLog: (id: string, data: AddDailyLogDTO) => {
    const fn = apiService?.addCurriculumDailyLog || libraryApi?.addCurriculumDailyLog || addCurriculumDailyLog;
    if (typeof fn !== 'function') throw new Error('addCurriculumDailyLog API function is not available.');
    return fn(id, data);
  },
  updateDailyLog: (id: string, logId: string, data: UpdateDailyLogDTO) => {
    const fn = apiService?.updateCurriculumDailyLog || libraryApi?.updateCurriculumDailyLog || updateCurriculumDailyLog;
    if (typeof fn !== 'function') throw new Error('updateCurriculumDailyLog API function is not available.');
    return fn(id, logId, data);
  },
  endorseDailyLog: (id: string, logId: string, data: EndorseDailyLogDTO) => {
    const fn = apiService?.endorseCurriculumDailyLog || libraryApi?.endorseCurriculumDailyLog || endorseCurriculumDailyLog;
    if (typeof fn !== 'function') throw new Error('endorseCurriculumDailyLog API function is not available.');
    return fn(id, logId, data);
  },
  deleteDailyLog: (id: string, logId: string) => {
    const fn = apiService?.deleteCurriculumDailyLog || libraryApi?.deleteCurriculumDailyLog || deleteCurriculumDailyLog;
    if (typeof fn !== 'function') throw new Error('deleteCurriculumDailyLog API function is not available.');
    return fn(id, logId);
  },
  getDailyLogs: (params?: any) => {
    const fn = apiService?.getCurriculumDailyLogs || libraryApi?.getCurriculumDailyLogs || getCurriculumDailyLogs;
    if (typeof fn !== 'function') throw new Error('getCurriculumDailyLogs API function is not available.');
    return fn(params);
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

  // Tab Mode Switcher (Weekly Scope vs Daily Tracking vs Leadership Oversight)
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily' | 'leadership'>('weekly');

  // School-wide daily logs state for Headteacher, Deputy, and School Director
  const [allSchoolDailyLogs, setAllSchoolDailyLogs] = useState<EnrichedDailyLog[]>([]);
  const [loadingDailyLogs, setLoadingDailyLogs] = useState(false);
  const [dailyFilterDate, setDailyFilterDate] = useState<string>('');
  const [dailyFilterClass, setDailyFilterClass] = useState<string>('ALL');
  const [dailyFilterSearch, setDailyFilterSearch] = useState<string>('');

  // Daily Tracking & Reflection Modal States
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [editingDailyLog, setEditingDailyLog] = useState<CurriculumTrackerDailyLog | null>(null);
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyDayOfWeek, setDailyDayOfWeek] = useState<string>('Monday');
  const [dailyWeekNumber, setDailyWeekNumber] = useState<number>(1);
  const [dailyPeriod, setDailyPeriod] = useState<string>('Period 1 (08:00 - 08:40)');
  const [dailyStrand, setDailyStrand] = useState<string>('');
  const [dailySubStrand, setDailySubStrand] = useState<string>('');
  const [dailyOutcomes, setDailyOutcomes] = useState<string>('');
  const [dailyActivities, setDailyActivities] = useState<string>('');
  const [dailyResources, setDailyResources] = useState<string>('');
  const [dailyStatus, setDailyStatus] = useState<DailyLessonStatus>('TAUGHT');
  // Reflection fields
  const [reflectionComprehension, setReflectionComprehension] = useState<LearnerComprehension>('GOOD');
  const [reflectionWhatWentWell, setReflectionWhatWentWell] = useState<string>('');
  const [reflectionChallenges, setReflectionChallenges] = useState<string>('');
  const [reflectionRemedialPlan, setReflectionRemedialPlan] = useState<string>('');
  const [reflectionNextSteps, setReflectionNextSteps] = useState<string>('');
  const [savingDailyLog, setSavingDailyLog] = useState(false);

  // Administrative Endorsement Modal (Headteacher, Deputy, School Director)
  const [endorseModalLog, setEndorseModalLog] = useState<{ trackerId: string; log: CurriculumTrackerDailyLog } | null>(null);
  const [endorsementRemark, setEndorsementRemark] = useState<string>('');
  const [savingEndorsement, setSavingEndorsement] = useState(false);

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

  // Load school-wide daily logs for leadership oversight
  const loadAllDailyLogs = async () => {
    setLoadingDailyLogs(true);
    try {
      const params: any = {};
      if (dailyFilterDate) params.date = dailyFilterDate;
      if (dailyFilterClass !== 'ALL') params.classRoomId = dailyFilterClass;
      if (dailyFilterSearch) params.search = dailyFilterSearch;
      const res = await trackerApi.getDailyLogs(params);
      if (res?.data) {
        setAllSchoolDailyLogs(res.data);
      } else {
        setAllSchoolDailyLogs([]);
      }
    } catch {
      setAllSchoolDailyLogs([]);
    } finally {
      setLoadingDailyLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leadership' && isSchoolAdmin) {
      loadAllDailyLogs();
    }
  }, [activeTab, dailyFilterDate, dailyFilterClass]);

  // Filtered daily logs for current selected tracker
  const filteredDailyLogs = useMemo(() => {
    if (!selectedTracker) return [];
    const logs = selectedTracker.dailyLogs || [];
    return logs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.strand.toLowerCase().includes(q) ||
        log.subStrand.toLowerCase().includes(q) ||
        log.learningOutcomesTaught.toLowerCase().includes(q) ||
        (log.reflection && (
          log.reflection.whatWentWell.toLowerCase().includes(q) ||
          (log.reflection.challengesFaced && log.reflection.challengesFaced.toLowerCase().includes(q)) ||
          (log.reflection.remedialPlan && log.reflection.remedialPlan.toLowerCase().includes(q))
        ));

      let matchesStatus = true;
      if (statusFilter === 'TAUGHT') matchesStatus = log.status === 'TAUGHT';
      if (statusFilter === 'PARTIALLY_TAUGHT') matchesStatus = log.status === 'PARTIALLY_TAUGHT';
      if (statusFilter === 'POSTPONED') matchesStatus = log.status === 'POSTPONED';
      if (statusFilter === 'REMEDIAL') matchesStatus = log.status === 'REMEDIAL';
      if (statusFilter === 'ENDORSED') matchesStatus = Boolean(log.endorsement);

      return matchesSearch && matchesStatus;
    });
  }, [selectedTracker, searchTerm, statusFilter]);

  // Filtered leadership logs across all school trackers
  const filteredLeadershipLogs = useMemo(() => {
    return allSchoolDailyLogs.filter((log) => {
      if (dailyFilterClass !== 'ALL' && (log as any).classRoomId && (log as any).classRoomId !== dailyFilterClass) {
        return false;
      }
      if (dailyFilterDate && log.date !== dailyFilterDate) {
        return false;
      }
      if (dailyFilterSearch) {
        const q = dailyFilterSearch.toLowerCase();
        const matches =
          log.subjectName.toLowerCase().includes(q) ||
          log.className.toLowerCase().includes(q) ||
          log.loggedByTeacherName.toLowerCase().includes(q) ||
          log.strand.toLowerCase().includes(q) ||
          log.subStrand.toLowerCase().includes(q) ||
          log.learningOutcomesTaught.toLowerCase().includes(q) ||
          (log.reflection && (
            log.reflection.whatWentWell.toLowerCase().includes(q) ||
            (log.reflection.challengesFaced && log.reflection.challengesFaced.toLowerCase().includes(q))
          ));
        if (!matches) return false;
      }
      return true;
    });
  }, [allSchoolDailyLogs, dailyFilterClass, dailyFilterDate, dailyFilterSearch]);

  // Open Daily Log Modal for Adding
  const handleOpenAddDailyLog = (weekNum?: number, strandPrefill?: string, subStrandPrefill?: string) => {
    setEditingDailyLog(null);
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setDailyDate(todayIso);
    setDailyDayOfWeek(days[today.getDay()]);
    setDailyWeekNumber(weekNum || 1);
    setDailyPeriod('Period 1 (08:00 - 08:40)');
    setDailyStrand(strandPrefill || '');
    setDailySubStrand(subStrandPrefill || '');
    setDailyOutcomes('');
    setDailyActivities('');
    setDailyResources('');
    setDailyStatus('TAUGHT');
    setReflectionComprehension('GOOD');
    setReflectionWhatWentWell('');
    setReflectionChallenges('');
    setReflectionRemedialPlan('');
    setReflectionNextSteps('');
    setIsDailyModalOpen(true);
  };

  // Open Daily Log Modal for Editing
  const handleOpenEditDailyLog = (log: CurriculumTrackerDailyLog) => {
    setEditingDailyLog(log);
    setDailyDate(log.date);
    setDailyDayOfWeek(log.dayOfWeek || 'Monday');
    setDailyWeekNumber(log.weekNumber || 1);
    setDailyPeriod(log.lessonPeriod || 'Period 1 (08:00 - 08:40)');
    setDailyStrand(log.strand);
    setDailySubStrand(log.subStrand);
    setDailyOutcomes(log.learningOutcomesTaught);
    setDailyActivities(log.activitiesConducted || '');
    setDailyResources(log.resourcesUsed || '');
    setDailyStatus(log.status || 'TAUGHT');
    setReflectionComprehension(log.reflection?.comprehensionLevel || 'GOOD');
    setReflectionWhatWentWell(log.reflection?.whatWentWell || '');
    setReflectionChallenges(log.reflection?.challengesFaced || '');
    setReflectionRemedialPlan(log.reflection?.remedialPlan || '');
    setReflectionNextSteps(log.reflection?.nextSteps || '');
    setIsDailyModalOpen(true);
  };

  // Submit Daily Log (Add or Update)
  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker) {
      alert('Please select or create a subject tracker first.');
      return;
    }
    if (!dailyDate || !dailyStrand.trim() || !dailySubStrand.trim() || !dailyOutcomes.trim() || !reflectionWhatWentWell.trim()) {
      alert('Please fill in all required fields including lesson details and what went well in the reflection section.');
      return;
    }

    setSavingDailyLog(true);
    try {
      if (editingDailyLog) {
        const payload: UpdateDailyLogDTO = {
          date: dailyDate,
          dayOfWeek: dailyDayOfWeek,
          weekNumber: dailyWeekNumber,
          lessonPeriod: dailyPeriod,
          strand: dailyStrand.trim(),
          subStrand: dailySubStrand.trim(),
          learningOutcomesTaught: dailyOutcomes.trim(),
          activitiesConducted: dailyActivities.trim(),
          resourcesUsed: dailyResources.trim(),
          status: dailyStatus,
          reflection: {
            comprehensionLevel: reflectionComprehension,
            whatWentWell: reflectionWhatWentWell.trim(),
            challengesFaced: reflectionChallenges.trim() || undefined,
            remedialPlan: reflectionRemedialPlan.trim() || undefined,
            nextSteps: reflectionNextSteps.trim() || undefined
          }
        };
        const res = await trackerApi.updateDailyLog(selectedTracker.id, editingDailyLog.id, payload);
        if (res?.data?.tracker) {
          setTrackers((prev) => prev.map((t) => (t.id === res.data.tracker.id ? res.data.tracker : t)));
          setSelectedTracker(res.data.tracker);
        }
      } else {
        const payload: AddDailyLogDTO = {
          date: dailyDate,
          dayOfWeek: dailyDayOfWeek,
          weekNumber: dailyWeekNumber,
          lessonPeriod: dailyPeriod,
          strand: dailyStrand.trim(),
          subStrand: dailySubStrand.trim(),
          learningOutcomesTaught: dailyOutcomes.trim(),
          activitiesConducted: dailyActivities.trim(),
          resourcesUsed: dailyResources.trim(),
          status: dailyStatus,
          reflection: {
            comprehensionLevel: reflectionComprehension,
            whatWentWell: reflectionWhatWentWell.trim(),
            challengesFaced: reflectionChallenges.trim() || undefined,
            remedialPlan: reflectionRemedialPlan.trim() || undefined,
            nextSteps: reflectionNextSteps.trim() || undefined
          }
        };
        const res = await trackerApi.addDailyLog(selectedTracker.id, payload);
        if (res?.data?.tracker) {
          setTrackers((prev) => prev.map((t) => (t.id === res.data.tracker.id ? res.data.tracker : t)));
          setSelectedTracker(res.data.tracker);
        }
      }
      setIsDailyModalOpen(false);
      setEditingDailyLog(null);
      if (isSchoolAdmin) {
        loadAllDailyLogs();
      }
    } catch (err: any) {
      alert(err.message || 'Error saving daily lesson log');
    } finally {
      setSavingDailyLog(false);
    }
  };

  // Delete Daily Log
  const handleDeleteDailyLog = async (trackerId: string, logId: string) => {
    if (!window.confirm('Are you sure you want to delete this daily curriculum log?')) return;
    try {
      await trackerApi.deleteDailyLog(trackerId, logId);
      if (selectedTracker && selectedTracker.id === trackerId) {
        const updatedLogs = (selectedTracker.dailyLogs || []).filter((l) => l.id !== logId);
        const updatedTracker = { ...selectedTracker, dailyLogs: updatedLogs };
        setSelectedTracker(updatedTracker);
        setTrackers((prev) => prev.map((t) => (t.id === trackerId ? updatedTracker : t)));
      }
      if (isSchoolAdmin) {
        loadAllDailyLogs();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting daily curriculum log');
    }
  };

  // Open Endorsement Modal (Headteacher, Deputy, School Director)
  const handleOpenEndorseModal = (trackerId: string, log: CurriculumTrackerDailyLog) => {
    setEndorseModalLog({ trackerId, log });
    setEndorsementRemark(log.endorsement?.remarks || '');
  };

  // Submit Endorsement
  const handleSaveEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endorseModalLog || !endorsementRemark.trim()) {
      alert('Please enter supervisory remarks before endorsing.');
      return;
    }

    setSavingEndorsement(true);
    try {
      const res = await trackerApi.endorseDailyLog(endorseModalLog.trackerId, endorseModalLog.log.id, {
        remarks: endorsementRemark.trim()
      });
      if (res?.data?.tracker) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.tracker.id ? res.data.tracker : t)));
        if (selectedTracker?.id === res.data.tracker.id) {
          setSelectedTracker(res.data.tracker);
        }
      }
      setEndorseModalLog(null);
      setEndorsementRemark('');
      if (isSchoolAdmin) {
        loadAllDailyLogs();
      }
    } catch (err: any) {
      alert(err.message || 'Error saving leadership endorsement');
    } finally {
      setSavingEndorsement(false);
    }
  };

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

  // Average syllabus coverage across all trackers in the school
  const avgSchoolCoverage = useMemo(() => {
    if (trackers.length === 0) return 0;
    const sum = trackers.reduce((acc, t) => acc + (t.stats?.completionPercentage || 0), 0);
    return Math.round(sum / trackers.length);
  }, [trackers]);

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
          Grace Seeds School Academic Management
        </h2>
        <h3 className="text-base font-bold text-[#7a1228] mt-1 uppercase">
          Official Curriculum Progress & Syllabus Coverage Tracker
        </h3>
        {selectedTracker && (
          <div className="mt-2 text-xs text-gray-800 font-semibold flex items-center justify-center gap-3">
            <span>
              {selectedTracker.subjectName} · {selectedTracker.className} {selectedTracker.streamName ? `(${selectedTracker.streamName})` : ''} · {selectedTracker.term} {selectedTracker.academicYear} · Teacher: {selectedTracker.teacherName}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-gray-200 text-gray-900 font-extrabold">
              Syllabus Coverage: {stats.completionPercentage}% Complete ({stats.coveredWeeks}/{stats.totalWeeks} Weeks Covered)
            </span>
          </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
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
              className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors bg-white font-semibold text-gray-800"
            >
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subjectName} · {t.className} ({t.term} {t.academicYear}) &mdash; {t.stats?.completionPercentage ?? 0}% Syllabus Covered
                </option>
              ))}
              {trackers.length === 0 && <option value="">No curriculum trackers yet</option>}
            </select>
          </div>

          {/* Interactive Syllabus Coverage Progress Pill */}
          {selectedTracker && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
              <span className="material-symbols-outlined text-emerald-700 text-[18px]">donut_large</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">Syllabus Coverage:</span>
                  <span className="text-xs font-black text-emerald-800">{stats.completionPercentage}%</span>
                </div>
                <div className="w-24 bg-emerald-200 rounded-full h-1.5 mt-0.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionPercentage}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-emerald-800 font-bold hidden sm:inline">
                ({stats.coveredWeeks}/{stats.totalWeeks} Wks)
              </span>
            </div>
          )}
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

      {/* View Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 no-print overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'weekly'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
          <span>Weekly Syllabus Scope (12 Weeks)</span>
          {selectedTracker && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'weekly' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {stats.completionPercentage}% Covered
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">today</span>
          <span>Daily Tracking & Teacher Reflections</span>
          {selectedTracker && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'daily' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {selectedTracker.dailyLogs?.length || 0} Lessons · {stats.completionPercentage}%
            </span>
          )}
        </button>

        {isSchoolAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('leadership')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leadership'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Leadership Oversight (Headteacher / Deputy / Director)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'leadership' ? 'bg-white/20 text-white' : 'bg-rose-100 text-[#7a1228]'
              }`}
            >
              Avg {avgSchoolCoverage}%
            </span>
          </button>
        )}
      </div>

      {/* WEEKLY SYLLABUS SCOPE TAB */}
      {activeTab === 'weekly' && selectedTracker && (
        <>
          {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          {/* Overall Completion Progress */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Syllabus Coverage Progress</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                {stats.pendingWeeks + stats.inProgressWeeks} weeks remaining to reach 100% syllabus target
              </p>
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

        {/* Filter and Search Bar */}
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

        {/* Main Week-by-Week Table */}
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
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 self-start">
                          {Math.round((week.weekNumber / stats.totalWeeks) * 100)}% of Term
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
                          <span className="text-[10px] font-bold text-emerald-700">
                            +{Math.round(100 / stats.totalWeeks)}% to Syllabus
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
                          <span className="text-[10px] font-medium text-amber-700">
                            {Math.round(100 / stats.totalWeeks)}% in progress
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
                          onClick={() => {
                            setActiveTab('daily');
                            handleOpenAddDailyLog(week.weekNumber, week.strand, week.subStrand);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Log Daily Lesson for Week ${week.weekNumber}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">add_circle</span>
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
        </>
      )}

      {/* DAILY TRACKING & REFLECTIONS VIEW */}
      {activeTab === 'daily' && selectedTracker && (
        <div className="space-y-6">
          {/* Daily KPI Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
            {/* Syllabus Coverage Progress */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Syllabus Coverage</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {stats.completionPercentage}% Done
                </span>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-gray-900">{stats.coveredWeeks} / {stats.totalWeeks}</span>
                  <span className="text-xs font-semibold text-gray-500">Weeks Covered</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">event_available</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lessons Logged</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                  {selectedTracker.dailyLogs?.length || 0}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">Daily Entries</span>
                </h3>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">sentiment_satisfied</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Good Mastery</p>
                <h3 className="text-2xl font-bold text-emerald-800 mt-0.5">
                  {selectedTracker.dailyLogs?.filter((l) => l.reflection?.comprehensionLevel === 'EXCELLENT' || l.reflection?.comprehensionLevel === 'GOOD').length || 0}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">Lessons</span>
                </h3>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">healing</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Needs Remedial</p>
                <h3 className="text-2xl font-bold text-amber-800 mt-0.5">
                  {selectedTracker.dailyLogs?.filter((l) => l.reflection?.comprehensionLevel === 'NEEDS_INTERVENTION' || l.status === 'REMEDIAL').length || 0}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">Interventions</span>
                </h3>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Leadership Endorsed</p>
                <h3 className="text-2xl font-bold text-blue-800 mt-0.5">
                  {selectedTracker.dailyLogs?.filter((l) => Boolean(l.endorsement)).length || 0}
                  <span className="text-xs font-normal text-gray-500 ml-1.5">Signed</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Daily Action & Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search daily lesson, reflection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors bg-white font-medium text-gray-700"
              >
                <option value="ALL">All Lesson Statuses</option>
                <option value="TAUGHT">Fully Taught</option>
                <option value="PARTIALLY_TAUGHT">Partially Taught</option>
                <option value="REMEDIAL">Remedial Lesson</option>
                <option value="POSTPONED">Postponed</option>
                <option value="ENDORSED">Leadership Endorsed Only</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddDailyLog()}
              className="w-full sm:w-auto px-4 py-2 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] transition-colors font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Log Daily Lesson & Reflection</span>
            </button>
          </div>

          {/* Daily Logs Cards List */}
          {filteredDailyLogs.length > 0 ? (
            <div className="space-y-4">
              {filteredDailyLogs.map((log) => {
                const statusBadgeClasses =
                  log.status === 'TAUGHT'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : log.status === 'PARTIALLY_TAUGHT'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : log.status === 'REMEDIAL'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

                const comprehensionBadge =
                  log.reflection?.comprehensionLevel === 'EXCELLENT'
                    ? { text: 'High Comprehension (>80%)', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
                    : log.reflection?.comprehensionLevel === 'GOOD'
                    ? { text: 'Good Comprehension (60-80%)', cls: 'bg-teal-50 text-teal-800 border-teal-300' }
                    : log.reflection?.comprehensionLevel === 'AVERAGE'
                    ? { text: 'Average Comprehension (40-60%)', cls: 'bg-amber-50 text-amber-800 border-amber-300' }
                    : { text: 'Needs Remedial Intervention (<40%)', cls: 'bg-rose-50 text-rose-800 border-rose-300' };

                return (
                  <div
                    key={log.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:border-gray-300 transition-all space-y-4"
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs">
                          <span className="material-symbols-outlined text-[16px] text-gray-500">calendar_today</span>
                          {log.date} ({log.dayOfWeek})
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-[#7a1228] font-bold text-xs">
                          Week {log.weekNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[14px]">donut_large</span>
                          <span>Syllabus: {Math.round((log.weekNumber / (selectedTracker.totalWeeks || 12)) * 100)}%</span>
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          {log.lessonPeriod}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClasses}`}>
                          {log.status === 'TAUGHT'
                            ? 'Fully Taught'
                            : log.status === 'PARTIALLY_TAUGHT'
                            ? 'Partially Taught'
                            : log.status === 'REMEDIAL'
                            ? 'Remedial Lesson'
                            : 'Postponed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isSchoolAdmin && !log.endorsement && (
                          <button
                            type="button"
                            onClick={() => handleOpenEndorseModal(selectedTracker.id, log)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Endorse this lesson as School Leadership"
                          >
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            <span>Endorse</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditDailyLog(log)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit daily lesson log"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDailyLog(selectedTracker.id, log.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete daily log"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Lesson Curriculum Core */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Strand & Sub-Strand</div>
                        <h4 className="text-base font-bold text-gray-900 mt-0.5">{log.strand}</h4>
                        <p className="text-xs text-gray-600 font-medium">{log.subStrand}</p>

                        <div className="mt-3">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outcomes Taught</div>
                          <p className="text-xs text-gray-700 mt-0.5 leading-relaxed bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                            {log.learningOutcomesTaught}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {log.activitiesConducted && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activities Conducted</div>
                            <p className="text-xs text-gray-700 mt-0.5">{log.activitiesConducted}</p>
                          </div>
                        )}
                        {log.resourcesUsed && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resources Used</div>
                            <p className="text-xs text-gray-700 mt-0.5">{log.resourcesUsed}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Teacher Reflection Section */}
                    {log.reflection && (
                      <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-700 text-[20px]">psychology</span>
                            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                              Teacher Reflection & Mastery Assessment
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${comprehensionBadge.cls}`}>
                            {comprehensionBadge.text}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white/80 p-3 rounded-xl border border-amber-100">
                            <span className="font-bold text-gray-800 block mb-1">What Went Well:</span>
                            <p className="text-gray-700 leading-relaxed">{log.reflection.whatWentWell}</p>
                          </div>

                          {log.reflection.challengesFaced && (
                            <div className="bg-white/80 p-3 rounded-xl border border-amber-100">
                              <span className="font-bold text-gray-800 block mb-1">Challenges Faced:</span>
                              <p className="text-gray-700 leading-relaxed">{log.reflection.challengesFaced}</p>
                            </div>
                          )}

                          {log.reflection.remedialPlan && (
                            <div className="bg-white/80 p-3 rounded-xl border border-amber-100">
                              <span className="font-bold text-amber-900 block mb-1">Remedial Action Plan:</span>
                              <p className="text-gray-700 leading-relaxed">{log.reflection.remedialPlan}</p>
                            </div>
                          )}

                          {log.reflection.nextSteps && (
                            <div className="bg-white/80 p-3 rounded-xl border border-amber-100">
                              <span className="font-bold text-gray-800 block mb-1">Next Steps & Homework:</span>
                              <p className="text-gray-700 leading-relaxed">{log.reflection.nextSteps}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Administrative Supervisory Endorsement */}
                    {log.endorsement ? (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-emerald-700 text-xl shrink-0 mt-0.5">verified</span>
                          <div>
                            <div className="font-bold text-emerald-900 flex items-center gap-2">
                              <span>Endorsed by {log.endorsement.endorsedByName}</span>
                              <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                                {log.endorsement.endorsedByRole.replace(/_/g, ' ')}
                              </span>
                              <span className="text-emerald-700 font-normal text-[11px]">
                                on {new Date(log.endorsement.endorsedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-emerald-800 mt-1 italic">
                              "{log.endorsement.remarks}"
                            </p>
                          </div>
                        </div>

                        {isSchoolAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEndorseModal(selectedTracker.id, log)}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0 cursor-pointer"
                          >
                            Update Remarks
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-[18px]">pending</span>
                          <span>Awaiting administrative review & supervisory endorsement (Headteacher / Deputy / Director)</span>
                        </div>
                        {isSchoolAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEndorseModal(selectedTracker.id, log)}
                            className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            Sign Endorsement
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-[#7a1228] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">edit_calendar</span>
              </div>
              <h3 className="text-base font-bold text-gray-900">No Daily Lesson Logs Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
                Record each lesson taught day-by-day along with your reflections on learner comprehension, challenges, and remedial intervention plans.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddDailyLog()}
                className="px-4 py-2 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Log First Daily Lesson</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* LEADERSHIP OVERSIGHT VIEW (Headteacher, Deputy, School Director) */}
      {activeTab === 'leadership' && isSchoolAdmin && (
        <div className="space-y-6">
          {/* Leadership Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-[#7a1228] to-gray-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Administrative Supervisory Desk
              </div>
              <h2 className="text-xl font-black tracking-tight">
                Grace Seeds School Leadership Curriculum Oversight
              </h2>
              <p className="text-xs text-rose-100 max-w-2xl mt-1 leading-relaxed">
                Centralized supervisory desk for the Headteacher, Deputy Headteacher, and School Director. Review daily lesson logs across all classrooms, inspect teacher self-reflections, evaluate remedial interventions, and sign supervisory endorsements.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAllDailyLogs}
              disabled={loadingDailyLogs}
              className="self-start md:self-center px-4 py-2.5 bg-white text-[#7a1228] font-bold text-xs rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${loadingDailyLogs ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{loadingDailyLogs ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>
          </div>

          {/* Leadership KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
            {/* Average School Syllabus Coverage */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Avg Syllabus Coverage</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {avgSchoolCoverage}% Done
                </span>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-gray-900">{avgSchoolCoverage}%</span>
                  <span className="text-xs font-semibold text-gray-500">{trackers.length} Trackers</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${avgSchoolCoverage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total School Logs</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{allSchoolDailyLogs.length}</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Across all classes & teachers</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Supervisory Endorsed</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {allSchoolDailyLogs.filter((l) => Boolean(l.endorsement)).length}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Officially verified lessons</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Awaiting Review</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {allSchoolDailyLogs.filter((l) => !l.endorsement).length}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Pending leadership endorsement</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Remedial Attention</span>
              <div className="text-2xl font-black text-rose-800 mt-1">
                {allSchoolDailyLogs.filter((l) => l.reflection?.comprehensionLevel === 'NEEDS_INTERVENTION' || l.status === 'REMEDIAL').length}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Learners needing intervention</p>
            </div>
          </div>

          {/* Leadership Filters */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between no-print">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search teacher, subject, grade, strand..."
                  value={dailyFilterSearch}
                  onChange={(e) => setDailyFilterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              <select
                value={dailyFilterClass}
                onChange={(e) => setDailyFilterClass(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] bg-white font-medium text-gray-700"
              >
                <option value="ALL">All Grades / Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="date"
                  value={dailyFilterDate}
                  onChange={(e) => setDailyFilterDate(e.target.value)}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  title="Filter by specific date"
                />
                {dailyFilterDate && (
                  <button
                    type="button"
                    onClick={() => setDailyFilterDate('')}
                    className="p-1.5 text-xs text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                    title="Clear date filter"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 font-semibold self-end md:self-center">
              Showing {filteredLeadershipLogs.length} lesson {filteredLeadershipLogs.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>

          {/* Feed List */}
          {filteredLeadershipLogs.length > 0 ? (
            <div className="space-y-4">
              {filteredLeadershipLogs.map((log) => {
                const statusBadgeClasses =
                  log.status === 'TAUGHT'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : log.status === 'PARTIALLY_TAUGHT'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : log.status === 'REMEDIAL'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

                const comprehensionBadge =
                  log.reflection?.comprehensionLevel === 'EXCELLENT'
                    ? { text: 'High Comprehension (>80%)', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
                    : log.reflection?.comprehensionLevel === 'GOOD'
                    ? { text: 'Good Comprehension (60-80%)', cls: 'bg-teal-50 text-teal-800 border-teal-300' }
                    : log.reflection?.comprehensionLevel === 'AVERAGE'
                    ? { text: 'Average Comprehension (40-60%)', cls: 'bg-amber-50 text-amber-800 border-amber-300' }
                    : { text: 'Needs Remedial Intervention (<40%)', cls: 'bg-rose-50 text-rose-800 border-rose-300' };

                return (
                  <div
                    key={`${log.trackerId}-${log.id}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-gray-300 transition-all"
                  >
                    {/* Top Meta info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-[#7a1228]/10 text-[#7a1228] font-bold text-xs">
                          {log.subjectName}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs">
                          {log.className} {log.streamName ? `(${log.streamName})` : ''}
                        </span>
                        {(() => {
                          const t = trackers.find((tr) => tr.id === log.trackerId);
                          const cov = t?.stats?.completionPercentage;
                          return cov !== undefined ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">donut_large</span>
                              <span>Syllabus: {cov}%</span>
                            </span>
                          ) : null;
                        })()}
                        <span className="text-xs text-gray-500 font-medium">
                          Teacher: <strong className="text-gray-900">{log.loggedByTeacherName}</strong>
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-600 font-medium">
                          {log.date} ({log.dayOfWeek}) · {log.lessonPeriod}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClasses}`}>
                          {log.status === 'TAUGHT'
                            ? 'Fully Taught'
                            : log.status === 'PARTIALLY_TAUGHT'
                            ? 'Partially Taught'
                            : log.status === 'REMEDIAL'
                            ? 'Remedial'
                            : 'Postponed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEndorseModal(log.trackerId, log)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            log.endorsement
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {log.endorsement ? 'check_circle' : 'verified'}
                          </span>
                          <span>{log.endorsement ? 'Edit Endorsement' : 'Endorse Lesson'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDailyLog(log.trackerId, log.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete daily log"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Curriculum Topic</div>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                          {log.strand} &mdash; <span className="font-semibold text-gray-700">{log.subStrand}</span>
                        </h4>
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                          <strong className="text-gray-800 block mb-0.5">Outcomes Taught:</strong>
                          {log.learningOutcomesTaught}
                        </div>
                      </div>

                      {/* Reflection */}
                      {log.reflection ? (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-amber-700">psychology</span>
                              Teacher Reflection
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${comprehensionBadge.cls}`}>
                              {comprehensionBadge.text}
                            </span>
                          </div>

                          <div>
                            <span className="font-semibold text-gray-800">What went well:</span>
                            <p className="text-gray-700">{log.reflection.whatWentWell}</p>
                          </div>

                          {log.reflection.challengesFaced && (
                            <div>
                              <span className="font-semibold text-gray-800">Challenges:</span>
                              <p className="text-gray-700">{log.reflection.challengesFaced}</p>
                            </div>
                          )}

                          {log.reflection.remedialPlan && (
                            <div>
                              <span className="font-semibold text-amber-900">Remedial Action Plan:</span>
                              <p className="text-gray-700">{log.reflection.remedialPlan}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No reflection recorded</div>
                      )}
                    </div>

                    {/* Endorsement Details */}
                    {log.endorsement && (
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified</span>
                          <div>
                            <span className="font-bold text-emerald-900">
                              Endorsed by {log.endorsement.endorsedByName} ({log.endorsement.endorsedByRole.replace(/_/g, ' ')}) on {new Date(log.endorsement.endorsedAt).toLocaleDateString()}
                            </span>
                            <p className="text-emerald-800 italic mt-0.5">"{log.endorsement.remarks}"</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center shadow-xs">
              <span className="material-symbols-outlined text-4xl text-gray-300">fact_check</span>
              <p className="text-sm font-semibold text-gray-700 mt-2">No school-wide daily logs match the filter</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing date or class filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no trackers exist */}
      {!selectedTracker && !loading && activeTab !== 'leadership' && (
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

      {/* MODAL 5: Daily Lesson Log & Reflection Modal */}
      {isDailyModalOpen && selectedTracker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#7a1228] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">today</span>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingDailyLog ? 'Edit Daily Lesson Log & Reflection' : 'Log Daily Lesson & Teacher Reflection'}
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    {selectedTracker.subjectName} · {selectedTracker.className} {selectedTracker.streamName ? `(${selectedTracker.streamName})` : ''} · {selectedTracker.term} {selectedTracker.academicYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDailyModalOpen(false);
                  setEditingDailyLog(null);
                }}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDailyLog} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Date, Day of Week, Week Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lesson Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dailyDate}
                    onChange={(e) => {
                      setDailyDate(e.target.value);
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        setDailyDayOfWeek(days[d.getDay()]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Day of Week
                  </label>
                  <select
                    value={dailyDayOfWeek}
                    onChange={(e) => setDailyDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Syllabus Week *
                  </label>
                  <select
                    value={dailyWeekNumber}
                    onChange={(e) => setDailyWeekNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  >
                    {Array.from({ length: selectedTracker.totalWeeks || 12 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Lesson Period & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lesson Period / Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Period 1 (08:00 - 08:40)"
                    value={dailyPeriod}
                    onChange={(e) => setDailyPeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={dailyStatus}
                    onChange={(e) => setDailyStatus(e.target.value as DailyLessonStatus)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  >
                    <option value="TAUGHT">Fully Taught</option>
                    <option value="PARTIALLY_TAUGHT">Partially Taught</option>
                    <option value="REMEDIAL">Remedial Lesson</option>
                    <option value="POSTPONED">Postponed</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Strand & Sub-strand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Strand / Broad Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Numbers / Living Things"
                    value={dailyStrand}
                    onChange={(e) => setDailyStrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Sub-Strand / Sub-Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Multiplication 2-digit numbers"
                    value={dailySubStrand}
                    onChange={(e) => setDailySubStrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              {/* Row 4: Learning Outcomes Taught */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Specific Learning Outcomes Taught Today *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. By the end of the lesson, learners were able to multiply 2-digit numbers by 1-digit numbers with regrouping."
                  value={dailyOutcomes}
                  onChange={(e) => setDailyOutcomes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                />
              </div>

              {/* Row 5: Activities Conducted & Resources */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Activities Conducted (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pair problem solving; Flashcard drills"
                    value={dailyActivities}
                    onChange={(e) => setDailyActivities(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Learning Resources Used (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBC Coursebook Pg 45; Abacus beads"
                    value={dailyResources}
                    onChange={(e) => setDailyResources(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
                  />
                </div>
              </div>

              {/* SECTION: Teacher Self-Reflection */}
              <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700 text-xl">psychology</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Teacher Self-Reflection Section *
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Evaluate learner mastery and record actionable reflections visible to the Headteacher, Deputy, and Director.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Learner Comprehension Level *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: 'EXCELLENT', label: 'Excellent (>80%)' },
                      { val: 'GOOD', label: 'Good (60-80%)' },
                      { val: 'AVERAGE', label: 'Average (40-60%)' },
                      { val: 'NEEDS_INTERVENTION', label: 'Remedial (<40%)' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setReflectionComprehension(item.val as LearnerComprehension)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          reflectionComprehension === item.val
                            ? 'border-[#7a1228] bg-[#7a1228] text-white shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    What Went Well (Successes & Observations) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Learners eagerly participated in practical group work. 30 out of 34 solved the practice questions accurately on their own."
                    value={reflectionWhatWentWell}
                    onChange={(e) => setReflectionWhatWentWell(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Challenges Faced (If any)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 4 learners struggled with carrying over tens column."
                      value={reflectionChallenges}
                      onChange={(e) => setReflectionChallenges(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Remedial Action Plan
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Scheduled a 20-min peer tutoring session tomorrow morning."
                      value={reflectionRemedialPlan}
                      onChange={(e) => setReflectionRemedialPlan(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Next Steps / Homework Assigned
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Page 47 questions 1-5 assigned as home practice; check tomorrow."
                    value={reflectionNextSteps}
                    onChange={(e) => setReflectionNextSteps(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDailyModalOpen(false);
                    setEditingDailyLog(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDailyLog}
                  className="px-5 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-semibold hover:bg-[#5e0d1e] shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{savingDailyLog ? 'Saving...' : editingDailyLog ? 'Update Daily Log' : 'Save Daily Lesson Log'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Supervisory Endorsement Modal (Headteacher, Deputy, School Director) */}
      {endorseModalLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">verified</span>
                <div>
                  <h3 className="font-bold text-sm">Supervisory Lesson Endorsement</h3>
                  <p className="text-[11px] text-gray-300">
                    Administrative sign-off for Headteacher, Deputy & Director
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEndorseModalLog(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEndorsement} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
                <div className="font-bold text-gray-900">
                  {endorseModalLog.log.strand} &mdash; <span className="font-medium">{endorseModalLog.log.subStrand}</span>
                </div>
                <div className="text-gray-600">
                  Date: {endorseModalLog.log.date} ({endorseModalLog.log.dayOfWeek}) · {endorseModalLog.log.lessonPeriod}
                </div>
                {endorseModalLog.log.reflection && (
                  <div className="text-gray-700 italic border-t border-gray-200 pt-1.5 mt-1.5">
                    "{endorseModalLog.log.reflection.whatWentWell}"
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Administrative Supervisory Remarks *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Lesson well executed according to CBC guidelines. Remedial plan approved. Good pacing and interactive methodology observed."
                  value={endorsementRemark}
                  onChange={(e) => setEndorsementRemark(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Your name ({user?.name || 'Administrator'}) and leadership role will be officially stamped with the date.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEndorseModalLog(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEndorsement}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>{savingEndorsement ? 'Saving...' : 'Sign Supervisory Endorsement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
