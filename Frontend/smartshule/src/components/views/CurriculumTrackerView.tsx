import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  BackendLearningArea,
  BackendStrand,
  BackendSubStrand
} from '../../types';

// Safe API caller helpers
const trackerApi = {
  create: (data: CreateCurriculumTrackerDTO) => {
    const fn = apiService?.createCurriculumTracker || libraryApi?.createCurriculumTracker || createCurriculumTracker;
    return fn(data);
  },
  getAll: (params?: any) => {
    const fn = apiService?.getCurriculumTrackers || libraryApi?.getCurriculumTrackers || getCurriculumTrackers;
    return fn(params);
  },
  confirmCovered: (id: string, week: number, data: ConfirmWeekCoveredDTO) => {
    const fn = apiService?.confirmTrackerWeekCovered || libraryApi?.confirmTrackerWeekCovered || confirmTrackerWeekCovered;
    return fn(id, week, data);
  },
  updatePlan: (id: string, week: number, data: Partial<CurriculumTrackerWeekItem>) => {
    const fn = apiService?.updateTrackerWeekPlan || libraryApi?.updateTrackerWeekPlan || updateTrackerWeekPlan;
    return fn(id, week, data);
  },
  updateComment: (id: string, week: number, comment: string) => {
    const fn = apiService?.updateTrackerWeekComment || libraryApi?.updateTrackerWeekComment || updateTrackerWeekComment;
    return fn(id, week, comment);
  },
  batchUpdate: (id: string, weeks: Partial<CurriculumTrackerWeekItem>[]) => {
    const fn = apiService?.batchUpdateTrackerWeeks || libraryApi?.batchUpdateTrackerWeeks || batchUpdateTrackerWeeks;
    return fn(id, weeks);
  },
  deleteTracker: (id: string) => {
    const fn = apiService?.deleteCurriculumTracker || libraryApi?.deleteCurriculumTracker || deleteCurriculumTracker;
    return fn(id);
  },
  addDailyLog: (id: string, data: AddDailyLogDTO) => {
    const fn = apiService?.addCurriculumDailyLog || libraryApi?.addCurriculumDailyLog || addCurriculumDailyLog;
    return fn(id, data);
  },
  updateDailyLog: (id: string, logId: string, data: UpdateDailyLogDTO) => {
    const fn = apiService?.updateCurriculumDailyLog || libraryApi?.updateCurriculumDailyLog || updateCurriculumDailyLog;
    return fn(id, logId, data);
  },
  endorseDailyLog: (id: string, logId: string, data: EndorseDailyLogDTO) => {
    const fn = apiService?.endorseCurriculumDailyLog || libraryApi?.endorseCurriculumDailyLog || endorseCurriculumDailyLog;
    return fn(id, logId, data);
  },
  deleteDailyLog: (id: string, logId: string) => {
    const fn = apiService?.deleteCurriculumDailyLog || libraryApi?.deleteCurriculumDailyLog || deleteCurriculumDailyLog;
    return fn(id, logId);
  },
  getDailyLogs: (params?: any) => {
    const fn = apiService?.getCurriculumDailyLogs || libraryApi?.getCurriculumDailyLogs || getCurriculumDailyLogs;
    return fn(params);
  }
};

const SAMPLE_CBC_TEMPLATES: Record<string, Partial<CurriculumTrackerWeekItem>[]> = {
  'Christian Religious Education': [
    { weekNumber: 1, strand: 'Creation', subStrand: 'Self-awareness & Uniqueness', learningOutcomes: 'Recognize self as a unique creation in the image of God', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 1-6' },
    { weekNumber: 2, strand: 'Creation', subStrand: 'God as Provider of Family', learningOutcomes: 'Appreciate family members and their roles in God’s design', plannedLessons: 5, resources: 'Oxford Growing in Christ Bk 3 Pg 7-12' },
  ],
  'Mathematics': [
    { weekNumber: 1, strand: 'Numbers', subStrand: 'Whole Numbers', learningOutcomes: 'Identify and state place value of digits', plannedLessons: 5, resources: 'KLB Primary Maths Pg 1-8' },
  ],
  'English Language': [
    { weekNumber: 1, strand: 'Listening & Speaking', subStrand: 'Oral Presentation', learningOutcomes: 'Speak clearly expressing thoughts', plannedLessons: 5, resources: 'New Primary English Pg 1-5' },
  ]
};

export const CurriculumTrackerView: React.FC = () => {
  const { user } = useAuth();
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
  const [planStrandId, setPlanStrandId] = useState('');
  const [planSubStrandId, setPlanSubStrandId] = useState('');
  const [planOutcomes, setPlanOutcomes] = useState('');
  const [planPlannedLessons, setPlanPlannedLessons] = useState<number>(5);
  const [planResources, setPlanResources] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Form states for Comment Modal
  const [quickComment, setQuickComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Tab Mode Switcher
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily' | 'leadership'>('weekly');

  // School-wide daily logs state
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
  const [dailyPeriod, setDailyPeriod] = useState<string>('Period 1');
  const [dailyStrandId, setDailyStrandId] = useState<string>('');
  const [dailySubStrandId, setDailySubStrandId] = useState<string>('');
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

  // Endorsement Modal
  const [endorseModalLog, setEndorseModalLog] = useState<{ trackerId: string; log: CurriculumTrackerDailyLog } | null>(null);
  const [endorsementRemark, setEndorsementRemark] = useState<string>('');
  const [savingEndorsement, setSavingEndorsement] = useState(false);

  // Dynamic Strands & SubStrands State
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [loadingStrands, setLoadingStrands] = useState(false);

  useEffect(() => {
    async function loadAcademicMetaData() {
      try {
        const [clsRes, laRes] = await Promise.all([
          apiService.getClasses().catch(() => null),
          apiService.getLearningAreas().catch(() => null)
        ]);
        if (clsRes?.data) setClasses(clsRes.data);
        if (laRes?.data) setLearningAreas(laRes.data);
      } catch {}
    }
    loadAcademicMetaData();
  }, []);

  const loadTrackers = async () => {
    setLoading(true);
    try {
      const res = await trackerApi.getAll();
      if (res && res.data) {
        setTrackers(res.data);
        if (res.data.length > 0) {
          setSelectedTracker((prev) => {
            if (!prev) return res.data[0];
            return res.data.find((t) => t.id === prev.id) || res.data[0];
          });
        } else {
          setSelectedTracker(null);
        }
      }
    } catch {
      setTrackers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackers();
  }, []);

  // SMART DB FETCHING: Load Strands when a Tracker is selected
  useEffect(() => {
    if (!selectedTracker) {
      setStrands([]);
      return;
    }

    const trackerClass = classes.find(c => c.id === selectedTracker.classRoomId);
    const classGradeFormat = trackerClass?.gradeLevel || '';

    setLoadingStrands(true);
    apiService.getStrandsByLearningArea(selectedTracker.learningAreaId, classGradeFormat)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          const gradeStrands = res.data.filter((st: any) => !classGradeFormat || st.gradeLevel === classGradeFormat);
          setStrands(gradeStrands.length > 0 ? gradeStrands : res.data);
        } else {
          setStrands([]);
        }
      })
      .catch(() => setStrands([]))
      .finally(() => setLoadingStrands(false));
  }, [selectedTracker, classes]);

  // AUTOMATIC SUB-STRAND FETCHING: Whenever planStrandId changes, fetch its sub-strands
  useEffect(() => {
    if (!planStrandId) {
      setSubStrands([]);
      setPlanSubStrandId('');
      return;
    }
    apiService.getSubStrandsByStrand(planStrandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          if (!res.data.some(sub => sub.id === planSubStrandId)) {
            setPlanSubStrandId(res.data[0].id);
            if (res.data[0].specificLearningOutcomes?.length > 0) {
              setPlanOutcomes(res.data[0].specificLearningOutcomes.join('\n'));
            }
          }
        } else {
          setSubStrands([]);
          setPlanSubStrandId('');
        }
      })
      .catch(() => {
        setSubStrands([]);
        setPlanSubStrandId('');
      });
  }, [planStrandId]);

  // AUTOMATIC SUB-STRAND FETCHING FOR DAILY LOGS
  useEffect(() => {
    if (!dailyStrandId) {
      setSubStrands([]);
      setDailySubStrandId('');
      return;
    }
    apiService.getSubStrandsByStrand(dailyStrandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          if (!res.data.some(sub => sub.id === dailySubStrandId)) {
            setDailySubStrandId(res.data[0].id);
            if (res.data[0].specificLearningOutcomes?.length > 0) {
              setDailyOutcomes(res.data[0].specificLearningOutcomes.join('\n'));
            }
          }
        } else {
          setSubStrands([]);
          setDailySubStrandId('');
        }
      })
      .catch(() => {
        setSubStrands([]);
        setDailySubStrandId('');
      });
  }, [dailyStrandId]);

  const filteredWeeks = useMemo(() => {
    if (!selectedTracker) return [];
    return selectedTracker.items.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = item.strand.toLowerCase().includes(q) || item.subStrand.toLowerCase().includes(q);
      let matchesStatus = true;
      if (statusFilter === 'COVERED') matchesStatus = item.isCovered;
      if (statusFilter === 'PENDING') matchesStatus = !item.isCovered && item.status === 'PENDING';
      if (statusFilter === 'IN_PROGRESS') matchesStatus = item.status === 'IN_PROGRESS';
      if (statusFilter === 'COMMENTED') matchesStatus = Boolean(item.teacherComment?.trim());
      return matchesSearch && matchesStatus;
    });
  }, [selectedTracker, searchTerm, statusFilter]);

  const loadAllDailyLogs = async () => {
    setLoadingDailyLogs(true);
    try {
      const params: any = {};
      if (dailyFilterDate) params.date = dailyFilterDate;
      if (dailyFilterClass !== 'ALL') params.classRoomId = dailyFilterClass;
      if (dailyFilterSearch) params.search = dailyFilterSearch;
      const res = await trackerApi.getDailyLogs(params);
      if (res?.data) setAllSchoolDailyLogs(res.data);
    } catch {
      setAllSchoolDailyLogs([]);
    } finally {
      setLoadingDailyLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leadership' && isSchoolAdmin) loadAllDailyLogs();
  }, [activeTab, dailyFilterDate, dailyFilterClass]);

  const filteredDailyLogs = useMemo(() => {
    if (!selectedTracker) return [];
    return (selectedTracker.dailyLogs || []).filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || log.strand.toLowerCase().includes(q) || log.subStrand.toLowerCase().includes(q);
      let matchesStatus = true;
      if (statusFilter === 'TAUGHT') matchesStatus = log.status === 'TAUGHT';
      if (statusFilter === 'REMEDIAL') matchesStatus = log.status === 'REMEDIAL';
      if (statusFilter === 'ENDORSED') matchesStatus = Boolean(log.endorsement);
      return matchesSearch && matchesStatus;
    });
  }, [selectedTracker, searchTerm, statusFilter]);

  const filteredLeadershipLogs = useMemo(() => {
    return allSchoolDailyLogs.filter((log) => {
      if (dailyFilterClass !== 'ALL' && (log as any).classRoomId !== dailyFilterClass) return false;
      if (dailyFilterDate && log.date !== dailyFilterDate) return false;
      return true;
    });
  }, [allSchoolDailyLogs, dailyFilterClass, dailyFilterDate]);

  const handleOpenAddDailyLog = (weekNum?: number, strandNamePrefill?: string, subStrandNamePrefill?: string) => {
    setEditingDailyLog(null);
    setDailyDate(new Date().toISOString().split('T')[0]);
    setDailyWeekNumber(weekNum || 1);
    
    let matchedStrandId = '';
    if (strandNamePrefill && strands.length > 0) {
      const st = strands.find(s => s.title.toLowerCase() === strandNamePrefill.toLowerCase());
      if (st) matchedStrandId = st.id;
    }
    setDailyStrandId(matchedStrandId || (strands[0]?.id || ''));
    setDailyOutcomes('');
    setReflectionWhatWentWell('');
    setIsDailyModalOpen(true);
  };

  const handleOpenEditDailyLog = (log: CurriculumTrackerDailyLog) => {
    setEditingDailyLog(log);
    setDailyDate(log.date);
    
    const matchedStrand = strands.find(s => s.title === log.strand) || strands[0];
    setDailyStrandId(matchedStrand?.id || '');

    setDailyOutcomes(log.learningOutcomesTaught);
    setReflectionWhatWentWell(log.reflection?.whatWentWell || '');
    setIsDailyModalOpen(true);
  };

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker) return;

    const finalStrand = strands.find(s => s.id === dailyStrandId)?.title || dailyStrandId;
    const finalSubStrand = subStrands.find(s => s.id === dailySubStrandId)?.title || dailySubStrandId;

    setSavingDailyLog(true);
    try {
      const payload: any = {
        date: dailyDate,
        dayOfWeek: dailyDayOfWeek,
        weekNumber: dailyWeekNumber,
        lessonPeriod: dailyPeriod,
        strand: finalStrand,
        subStrand: finalSubStrand,
        learningOutcomesTaught: dailyOutcomes,
        activitiesConducted: dailyActivities,
        resourcesUsed: dailyResources,
        status: dailyStatus,
        reflection: {
          comprehensionLevel: reflectionComprehension,
          whatWentWell: reflectionWhatWentWell,
          challengesFaced: reflectionChallenges,
          remedialPlan: reflectionRemedialPlan,
          nextSteps: reflectionNextSteps
        }
      };

      const res = editingDailyLog 
        ? await trackerApi.updateDailyLog(selectedTracker.id, editingDailyLog.id, payload)
        : await trackerApi.addDailyLog(selectedTracker.id, payload);
        
      if (res?.data?.tracker) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.tracker.id ? res.data.tracker : t)));
        setSelectedTracker(res.data.tracker);
      }
      setIsDailyModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDailyLog(false);
    }
  };

  const handleDeleteDailyLog = async (trackerId: string, logId: string) => {
    if (!window.confirm('Delete this daily log?')) return;
    try {
      await trackerApi.deleteDailyLog(trackerId, logId);
      loadTrackers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEndorseModal = (trackerId: string, log: CurriculumTrackerDailyLog) => {
    setEndorseModalLog({ trackerId, log });
    setEndorsementRemark(log.endorsement?.remarks || '');
  };

  const handleSaveEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endorseModalLog || !endorsementRemark.trim()) return;
    setSavingEndorsement(true);
    try {
      await trackerApi.endorseDailyLog(endorseModalLog.trackerId, endorseModalLog.log.id, { remarks: endorsementRemark.trim() });
      loadTrackers();
      setEndorseModalLog(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEndorsement(false);
    }
  };

  const handleOpenConfirm = (week: CurriculumTrackerWeekItem) => {
    setConfirmModalWeek(week);
    setConfirmDate(week.coveredAt || new Date().toISOString().split('T')[0]);
    setConfirmStatus(week.isCovered ? 'COVERED' : 'COVERED');
  };

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
      const res = await trackerApi.confirmCovered(selectedTracker.id, confirmModalWeek.weekNumber, payload);
      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setConfirmModalWeek(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingConfirm(false);
    }
  };

  const handleOpenEditPlan = (week: CurriculumTrackerWeekItem) => {
    setEditPlanModalWeek(week);
    
    let matchedStrandId = '';
    if (week.strand && strands.length > 0) {
      const st = strands.find(s => s.title.toLowerCase() === week.strand?.toLowerCase());
      if (st) matchedStrandId = st.id;
    }
    
    setPlanStrandId(matchedStrandId || (strands[0]?.id || ''));
    setPlanOutcomes(week.learningOutcomes || '');
    setPlanPlannedLessons(week.plannedLessons || 5);
    setPlanResources(week.resources || '');
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !editPlanModalWeek) return;
    setSavingPlan(true);
    
    const finalStrand = strands.find(s => s.id === planStrandId)?.title || planStrandId;
    const finalSubStrand = subStrands.find(s => s.id === planSubStrandId)?.title || planSubStrandId;

    try {
      const res = await trackerApi.updatePlan(selectedTracker.id, editPlanModalWeek.weekNumber, {
        strand: finalStrand,
        subStrand: finalSubStrand,
        learningOutcomes: planOutcomes,
        plannedLessons: planPlannedLessons,
        resources: planResources
      });
      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setEditPlanModalWeek(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleOpenComment = (week: CurriculumTrackerWeekItem) => {
    setCommentModalWeek(week);
    setQuickComment(week.teacherComment || '');
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker || !commentModalWeek) return;
    setSavingComment(true);
    try {
      const res = await trackerApi.updateComment(selectedTracker.id, commentModalWeek.weekNumber, quickComment);
      if (res?.data) {
        setTrackers((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
        setSelectedTracker(res.data);
      }
      setCommentModalWeek(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteTracker = async (id: string, name: string) => {
    if (!window.confirm(`Delete the tracker for "${name}"?`)) return;
    try {
      await trackerApi.deleteTracker(id);
      loadTrackers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stats = selectedTracker?.stats || {
    totalWeeks: 12, coveredWeeks: 0, inProgressWeeks: 0, pendingWeeks: 12, completionPercentage: 0, commentsCount: 0
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span><span>/</span><span>Curriculum & Timetable</span><span>/</span>
            <span className="text-primary font-semibold">Curriculum Progress Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-[#7a1228] text-3xl">fact_check</span>
            Curriculum Progress Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsCreateModalOpen(true)} className="px-3.5 py-2 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] font-semibold text-xs flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Subject Tracker</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#7a1228] text-[18px]">auto_stories</span>
            Select Tracker:
          </label>
          <select
            value={selectedTracker?.id || ''}
            onChange={(e) => setSelectedTracker(trackers.find((t) => t.id === e.target.value) || null)}
            className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 bg-white font-semibold text-gray-800"
          >
            {trackers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.subjectName} · {t.className} &mdash; {t.stats?.completionPercentage ?? 0}% Covered
              </option>
            ))}
            {trackers.length === 0 && <option value="">No curriculum trackers yet</option>}
          </select>
        </div>
        {selectedTracker && (
          <button onClick={() => handleDeleteTracker(selectedTracker.id, selectedTracker.subjectName)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 no-print overflow-x-auto">
        <button onClick={() => setActiveTab('weekly')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeTab === 'weekly' ? 'bg-[#7a1228] text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
          <span>Weekly Syllabus Scope</span>
        </button>
        <button onClick={() => setActiveTab('daily')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeTab === 'daily' ? 'bg-[#7a1228] text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <span className="material-symbols-outlined text-[18px]">today</span>
          <span>Daily Tracking & Reflections</span>
        </button>
        {isSchoolAdmin && (
          <button onClick={() => setActiveTab('leadership')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeTab === 'leadership' ? 'bg-[#7a1228] text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Leadership Oversight</span>
          </button>
        )}
      </div>

      {/* WEEKLY TAB */}
      {activeTab === 'weekly' && selectedTracker && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print-full-width">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm print-table">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Week</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Curriculum Content</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWeeks.map((week) => (
                  <tr key={week.weekNumber} className={week.isCovered ? 'bg-emerald-50/15' : ''}>
                    <td className="px-4 py-3.5"><span className="font-bold text-xs bg-gray-100 px-2 py-1 rounded-lg">Week {week.weekNumber}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900 text-sm">{week.strand || 'No Strand'}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{week.subStrand || '--'}</div>
                      <div className="text-xs text-gray-500 mt-1">{week.learningOutcomes}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${week.isCovered ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {week.isCovered ? 'Covered' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEditPlan(week)} className="p-1.5 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onClick={() => { setActiveTab('daily'); handleOpenAddDailyLog(week.weekNumber, week.strand, week.subStrand); }} className="p-1.5 text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg cursor-pointer"><span className="material-symbols-outlined text-[18px]">add_circle</span></button>
                        <button onClick={() => handleOpenConfirm(week)} className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"><span className="material-symbols-outlined text-[18px]">verified</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DAILY TAB */}
      {activeTab === 'daily' && selectedTracker && (
        <div className="space-y-4">
          <button onClick={() => handleOpenAddDailyLog()} className="px-4 py-2 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Log Daily Lesson & Reflection</span>
          </button>
          
          <div className="space-y-4">
            {filteredDailyLogs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between border-b border-gray-100 pb-3 mb-3">
                  <div className="font-bold text-xs bg-gray-100 px-3 py-1 rounded-xl text-gray-800">
                    {log.date} ({log.dayOfWeek}) · Wk {log.weekNumber}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEditDailyLog(log)} className="text-gray-400 hover:text-[#7a1228] cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onClick={() => handleDeleteDailyLog(selectedTracker.id, log.id)} className="text-gray-400 hover:text-red-600 cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-900">{log.strand} &mdash; <span className="font-semibold text-gray-700">{log.subStrand}</span></h4>
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <strong className="block">Outcomes Taught:</strong> {log.learningOutcomesTaught}
                </div>
                {log.reflection && (
                  <div className="mt-3 bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-xs">
                    <strong className="text-amber-900">Reflection:</strong> {log.reflection.whatWentWell}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEADERSHIP TAB */}
      {activeTab === 'leadership' && isSchoolAdmin && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-gray-900 via-[#7a1228] to-gray-900 rounded-2xl p-6 text-white shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Leadership Curriculum Oversight</h2>
              <p className="text-xs text-rose-100 mt-1">Review and endorse daily lesson logs across all classrooms.</p>
            </div>
            <button onClick={loadAllDailyLogs} className="px-4 py-2 bg-white text-[#7a1228] font-bold text-xs rounded-xl hover:bg-gray-100 cursor-pointer">Refresh Feed</button>
          </div>
          <div className="space-y-4">
            {filteredLeadershipLogs.map((log) => (
              <div key={`${log.trackerId}-${log.id}`} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#7a1228]/10 text-[#7a1228] font-bold text-xs rounded-xl">{log.subjectName}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs rounded-xl">{log.className}</span>
                    <span className="text-xs text-gray-500 font-medium py-1">Teacher: <strong className="text-gray-900">{log.loggedByTeacherName}</strong></span>
                  </div>
                  {!log.endorsement && (
                    <button onClick={() => handleOpenEndorseModal(log.trackerId, log)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Endorse</button>
                  )}
                </div>
                <h4 className="text-sm font-bold">{log.strand} &mdash; <span className="font-semibold text-gray-700">{log.subStrand}</span></h4>
                {log.reflection && <p className="text-xs text-gray-600 mt-2">"{log.reflection.whatWentWell}"</p>}
                {log.endorsement && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                    <strong>Endorsed by {log.endorsement.endorsedByName}:</strong> {log.endorsement.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRM COVERED MODAL */}
      {confirmModalWeek && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#7a1228] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Confirm Curriculum Coverage</h3>
              <button onClick={() => setConfirmModalWeek(null)} className="cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSaveConfirm} className="p-6 space-y-4">
              <select value={confirmStatus} onChange={(e) => setConfirmStatus(e.target.value as any)} className="w-full p-2 text-xs border rounded-xl">
                <option value="COVERED">Fully Covered</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setConfirmModalWeek(null)} className="px-4 py-2 text-xs border rounded-xl">Cancel</button>
                <button type="submit" disabled={savingConfirm} className="px-4 py-2 bg-[#7a1228] text-white text-xs font-semibold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WEEK PLAN MODAL */}
      {editPlanModalWeek && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Week {editPlanModalWeek.weekNumber} Plan</h3>
              <button onClick={() => setEditPlanModalWeek(null)} className="cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Curriculum Strand *</label>
                  {loadingStrands ? (
                    <div className="p-2 text-xs text-gray-500">Loading DB strands...</div>
                  ) : strands.length > 0 ? (
                    <select value={planStrandId} onChange={(e) => setPlanStrandId(e.target.value)} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl cursor-pointer">
                      {strands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : <div className="p-2 text-xs text-rose-500 bg-rose-50 rounded-lg">No Strands Found</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sub-strand *</label>
                  {subStrands.length > 0 ? (
                    <select value={planSubStrandId} onChange={(e) => setPlanSubStrandId(e.target.value)} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl cursor-pointer">
                      {subStrands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : <div className="p-2 text-xs text-gray-500">-</div>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Specific Learning Outcomes *</label>
                <textarea rows={3} required value={planOutcomes} onChange={(e) => setPlanOutcomes(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditPlanModalWeek(null)} className="px-4 py-2 text-xs border rounded-xl">Cancel</button>
                <button type="submit" disabled={savingPlan} className="px-4 py-2 bg-[#7a1228] text-white text-xs font-semibold rounded-xl">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY LOG MODAL */}
      {isDailyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#7a1228] text-white flex justify-between">
              <h3 className="font-bold text-sm">Log Daily Lesson</h3>
              <button onClick={() => setIsDailyModalOpen(false)} className="cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSaveDailyLog} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Curriculum Strand *</label>
                  {strands.length > 0 ? (
                    <select value={dailyStrandId} onChange={(e) => setDailyStrandId(e.target.value)} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl cursor-pointer">
                      {strands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : <div className="p-2 text-xs text-rose-500 bg-rose-50 rounded-lg">No Strands Found</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sub-strand *</label>
                  {subStrands.length > 0 ? (
                    <select value={dailySubStrandId} onChange={(e) => setDailySubStrandId(e.target.value)} required className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl cursor-pointer">
                      {subStrands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : <div className="p-2 text-xs text-gray-500">-</div>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Outcomes Taught *</label>
                <textarea rows={2} required value={dailyOutcomes} onChange={(e) => setDailyOutcomes(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teacher Reflection (What went well) *</label>
                <textarea rows={2} required value={reflectionWhatWentWell} onChange={(e) => setReflectionWhatWentWell(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsDailyModalOpen(false)} className="px-4 py-2 text-xs border rounded-xl">Cancel</button>
                <button type="submit" disabled={savingDailyLog} className="px-4 py-2 bg-[#7a1228] text-white text-xs font-semibold rounded-xl">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENDORSE MODAL */}
      {endorseModalLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 text-white flex justify-between">
              <h3 className="font-bold text-sm">Supervisory Endorsement</h3>
              <button onClick={() => setEndorseModalLog(null)} className="cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSaveEndorsement} className="p-6 space-y-4">
              <textarea rows={3} required placeholder="Endorsement remarks..." value={endorsementRemark} onChange={(e) => setEndorsementRemark(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEndorseModalLog(null)} className="px-4 py-2 text-xs border rounded-xl">Cancel</button>
                <button type="submit" disabled={savingEndorsement} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl">Sign Endorsement</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

interface CreateTrackerModalProps {
  classes: ClassRoom[];
  learningAreas: BackendLearningArea[];
  onClose: () => void;
  onCreated: (tracker: CurriculumTracker) => void;
}

const CreateTrackerModal: React.FC<CreateTrackerModalProps> = ({ classes, learningAreas, onClose, onCreated }) => {
  const [learningAreaId, setLearningAreaId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find(c => c.id === classRoomId);
    const la = learningAreas.find(l => l.id === learningAreaId);
    if (!cls || !la) return alert('Select Class and Subject');

    setLoading(true);
    try {
      const res = await trackerApi.create({
        learningAreaId,
        subjectName: la.name,
        classRoomId,
        className: cls.name,
        academicYear: '2026',
        term: 'Term 3',
        totalWeeks: 12
      });
      if (res?.data) onCreated(res.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 bg-[#7a1228] text-white flex justify-between">
          <h3 className="font-bold text-sm">New Tracker</h3>
          <button onClick={onClose} className="cursor-pointer"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} required className="w-full p-2 text-sm border rounded-xl">
            <option value="">Select Class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={learningAreaId} onChange={(e) => setLearningAreaId(e.target.value)} required className="w-full p-2 text-sm border rounded-xl">
            <option value="">Select Subject...</option>
            {learningAreas.map(la => <option key={la.id} value={la.id}>{la.name}</option>)}
          </select>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold border rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#7a1228] text-white text-xs font-semibold rounded-xl">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurriculumTrackerView;