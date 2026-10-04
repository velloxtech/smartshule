import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { TimetableData, TimetableSlot, PeriodDefinition, DayDefinition, UserRole } from '../../types';
import { AddTimetableSlotModal } from '../modals/AddTimetableSlotModal';
import { useAuth } from '../../context/AuthContext';
import { sortAndGroupClasses, sortClassesInCbcSequence } from '../../utils/classCategorization';

const DEFAULT_PERIODS: PeriodDefinition[] = [
  { periodNumber: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false, isLunch: false },
  { periodNumber: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false, isLunch: false },
  { periodNumber: 3, name: 'Morning Break', startTime: '09:30', endTime: '09:50', isBreak: true, isLunch: false },
  { periodNumber: 4, name: 'Period 3', startTime: '09:50', endTime: '10:35', isBreak: false, isLunch: false },
  { periodNumber: 5, name: 'Period 4', startTime: '10:35', endTime: '11:20', isBreak: false, isLunch: false },
  { periodNumber: 6, name: 'Lunch & Rest', startTime: '11:20', endTime: '12:40', isBreak: true, isLunch: true },
  { periodNumber: 7, name: 'Period 5', startTime: '12:40', endTime: '13:25', isBreak: false, isLunch: false },
  { periodNumber: 8, name: 'Period 6', startTime: '13:25', endTime: '14:10', isBreak: false, isLunch: false },
];

const DEFAULT_DAYS: DayDefinition[] = [
  { dayOfWeek: 'MONDAY', label: 'Monday', isEnabled: true },
  { dayOfWeek: 'TUESDAY', label: 'Tuesday', isEnabled: true },
  { dayOfWeek: 'WEDNESDAY', label: 'Wednesday', isEnabled: true },
  { dayOfWeek: 'THURSDAY', label: 'Thursday', isEnabled: true },
  { dayOfWeek: 'FRIDAY', label: 'Friday', isEnabled: true },
];

// Robust subject abbreviation formatter ensuring INSCIE/Integrated Science maps to SCIE
export const formatSubjectAbbreviation = (rawName?: string, rawCode?: string): string => {
  if (!rawName && !rawCode) return 'SUBJ';
  const name = (rawName || '').trim();
  const code = (rawCode || '').trim();
  const upper = (name || code).toUpperCase();

  // Explicit user requirement: Integrated Science / INSCIE / INTSCI -> SCIE
  if (
    upper.includes('INSCIE') ||
    upper.includes('INTSCI') ||
    upper.includes('INTEGRATED SCIENCE') ||
    upper === 'SCIENCE' ||
    upper === 'SCI'
  ) {
    return 'SCIE';
  }

  // Standard CBC learning areas
  if (upper.includes('MATH')) return 'MATH';
  if (upper.includes('ENGLISH') || upper === 'ENG') return 'ENG';
  if (upper.includes('KISWAHILI') || upper.includes('KISW') || upper.includes('SWAHILI')) return 'KISW';
  if (upper.includes('SOCIAL') || upper === 'SST') return 'SST';
  if (upper.includes('CHRISTIAN') || upper === 'CRE') return 'CRE';
  if (upper.includes('ISLAMIC') || upper === 'IRE') return 'IRE';
  if (upper.includes('HINDU') || upper === 'HRE') return 'HRE';
  if (upper.includes('HEALTH') || upper.includes('HLTH')) return 'HLTH';
  if (upper.includes('AGRICULT') || upper.includes('AGRI')) return 'AGRI';
  if (upper.includes('PRE-TECH') || upper.includes('PRETECH') || upper.includes('TECHNICAL')) return 'PRE-TECH';
  if (upper.includes('CREATIVE') || upper.includes('ARTS') || upper.includes('ART')) return 'ARTS';
  if (upper.includes('BUSINESS') || upper === 'BUS') return 'BUS';
  if (upper.includes('COMPUTER') || upper === 'COMP') return 'COMP';
  if (upper.includes('FRENCH') || upper === 'FRE') return 'FREN';
  if (upper.includes('GERMAN') || upper === 'GER') return 'GERM';
  if (upper.includes('ARABIC') || upper === 'ARA') return 'ARAB';
  if (upper.includes('MUSIC') || upper === 'MUS') return 'MUS';
  if (upper.includes('PHYSICAL') || upper === 'PE') return 'PE';

  if (code && code.length <= 6) return code.toUpperCase();
  const firstWord = name.split(/\s+/)[0];
  if (firstWord && firstWord.length <= 6) return firstWord.toUpperCase();
  return firstWord ? firstWord.substring(0, 5).toUpperCase() : 'SUBJ';
};

export const TimetableView: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isParent = user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN;
  const canEditGrid = !isParent && (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN || user?.role === UserRole.HEAD_TEACHER || isTeacher);

  const [viewMode, setViewMode] = useState<'class' | 'teacher'>(isTeacher ? 'teacher' : 'class');
  
  // Selection state
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStreams, setClassStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const [teacherId, setTeacherId] = useState('');
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Dynamic context and entities
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [currentContext, setCurrentContext] = useState<any>(null);

  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Grid Dimensions State
  const [periods, setPeriods] = useState<PeriodDefinition[]>(DEFAULT_PERIODS);
  const [days, setDays] = useState<DayDefinition[]>(DEFAULT_DAYS);
  const [isGridDirty, setIsGridDirty] = useState(false);
  const [isSavingGrid, setIsSavingGrid] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit/Add slot modal state
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<any>(null);

  // Period / Day Modals
  const [editingPeriod, setEditingPeriod] = useState<PeriodDefinition | null>(null);
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState<PeriodDefinition>({
    periodNumber: 9,
    name: 'Period 7',
    startTime: '14:15',
    endTime: '15:00',
    isBreak: false,
    isLunch: false,
  });

  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('Saturday');

  // Load school, academic context, and classes
  useEffect(() => {
    async function loadTimetableContext() {
      try {
        const [scRes, ctxRes, cRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);
        if (scRes?.data) setSchoolInfo(scRes.data);
        if (ctxRes?.data) setCurrentContext(ctxRes.data);
        if (cRes?.data && Array.isArray(cRes.data)) {
          const sorted = sortClassesInCbcSequence(cRes.data);
          setClassesList(sorted);
          if (sorted.length > 0 && !selectedClassId) {
            setSelectedClassId(sorted[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load timetable context:', err);
      }
    }
    loadTimetableContext();
  }, []);

  // Parent context: lock timetable to parent's child
  useEffect(() => {
    if (!isParent) return;
    async function loadParentTimetableContext() {
      try {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.data?.children && Array.isArray(portalRes.data.children) && portalRes.data.children.length > 0) {
          setParentChildren(portalRes.data.children);
          const firstChild = portalRes.data.children[0];
          setSelectedChildId(firstChild.id);
          if (firstChild.classroomId) setSelectedClassId(firstChild.classroomId);
          if (firstChild.streamId) setSelectedStreamId(firstChild.streamId);
        }
      } catch (err) {
        console.error('Failed to load parent children for timetable:', err);
      }
    }
    loadParentTimetableContext();
  }, [isParent]);

  // When selected class changes, load its optional streams
  useEffect(() => {
    if (!selectedClassId) {
      setClassStreams([]);
      setSelectedStreamId('');
      return;
    }
    async function loadClassStreams() {
      try {
        const sRes = await apiService.getStreamsByClass(selectedClassId).catch(() => null);
        if (sRes?.data && Array.isArray(sRes.data)) {
          setClassStreams(sRes.data);
        } else {
          setClassStreams([]);
        }
      } catch {
        setClassStreams([]);
      }
      setSelectedStreamId('');
    }
    loadClassStreams();
  }, [selectedClassId]);

  // Initialize teacher profile if educator & load teachers list
  useEffect(() => {
    async function initTeacher() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
            setTeacherId(res.data.id);
            if (res.data.assignedClassId) {
              setSelectedClassId(res.data.assignedClassId);
            }
          }
        } catch {
          // Keep defaults
        }
      }
      try {
        const tList = await apiService.getTeachers();
        if (tList?.data && Array.isArray(tList.data)) {
          setTeachersList(tList.data);
          if (tList.data.length > 0 && !teacherId) {
            setTeacherId(tList.data[0].id);
          }
        }
      } catch {
        // Keep defaults
      }
    }
    initTeacher();
  }, [isTeacher]);

  const loadTimetable = async () => {
    setLoading(true);
    const activeTermId = currentContext?.currentTerm?.id || '';
    try {
      if (viewMode === 'class') {
        if (!selectedClassId) {
          setTimetable(null);
          setPeriods(DEFAULT_PERIODS);
          setDays(DEFAULT_DAYS);
          setLoading(false);
          return;
        }
        const res = await apiService.getStreamTimetable(selectedStreamId || undefined, activeTermId, selectedClassId);
        if (res.success && res.data) {
          setTimetable(res.data);
          if (res.data.periods && res.data.periods.length > 0) {
            setPeriods(res.data.periods);
          } else {
            setPeriods(DEFAULT_PERIODS);
          }
          if (res.data.days && res.data.days.length > 0) {
            setDays(res.data.days);
          } else {
            setDays(DEFAULT_DAYS);
          }
        } else {
          setTimetable(null);
          setPeriods(DEFAULT_PERIODS);
          setDays(DEFAULT_DAYS);
        }
      } else {
        if (!teacherId) {
          setTeacherSlots([]);
          setLoading(false);
          return;
        }
        const res = await apiService.getTeacherTimetable(teacherId, activeTermId);
        if (res.success && res.data) {
          setTeacherSlots(res.data);
        } else {
          setTeacherSlots([]);
        }
      }
      setIsGridDirty(false);
    } catch {
      if (viewMode === 'class') {
        setTimetable(null);
        setPeriods(DEFAULT_PERIODS);
        setDays(DEFAULT_DAYS);
      } else {
        setTeacherSlots([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [viewMode, selectedClassId, selectedStreamId, teacherId, currentContext]);

  const activeSlots: TimetableSlot[] = viewMode === 'class'
    ? (timetable?.slots || [])
    : teacherSlots;

  // Active names for display & letterhead
  const activeClassObj = classesList.find((c) => c.id === selectedClassId);
  const activeClassName = activeClassObj ? activeClassObj.name : 'Primary Cohort';
  const activeStreamObj = classStreams.find((s) => s.id === selectedStreamId);
  const selectedStreamName = activeStreamObj ? activeStreamObj.name : '';
  const activeTeacherObj = teachersList.find((t) => t.id === teacherId);
  const activeTeacherName = activeTeacherObj ? (activeTeacherObj.name || activeTeacherObj.user?.fullName || `Teacher ${activeTeacherObj.tscNumber || ''}`) : 'Educator Schedule';

  // Active grid persistence to database
  const persistGridActive = async (
    pList: PeriodDefinition[] = periods,
    dList: DayDefinition[] = days,
    sList: TimetableSlot[] = timetable?.slots || [],
    notifyMsg = 'Timetable saved successfully to database!'
  ) => {
    setIsSavingGrid(true);
    setSaveSuccessMsg(null);

    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    const activeAcademicYearId = currentContext?.currentYear?.id || 'year-2026';
    const activeTermId = currentContext?.currentTerm?.id || 'term-2026-t1';

    try {
      const res = await apiService.saveTimetableGrid({
        timetableId: timetable?.id,
        schoolId: activeSchoolId,
        academicYearId: activeAcademicYearId,
        termId: activeTermId,
        classRoomId: selectedClassId,
        streamId: selectedStreamId || undefined,
        periods: pList,
        days: dList,
        slots: sList,
      });

      if (res.success && res.data) {
        setTimetable(res.data);
        if (res.data.periods && res.data.periods.length > 0) setPeriods(res.data.periods);
        if (res.data.days && res.data.days.length > 0) setDays(res.data.days);
        setIsGridDirty(false);
        const timestamp = new Date().toLocaleTimeString();
        setSaveSuccessMsg(`${notifyMsg} (Database active at ${timestamp})`);
        setTimeout(() => setSaveSuccessMsg(null), 4500);
        return res.data;
      } else {
        throw new Error(res.message || 'Server did not confirm successful save');
      }
    } catch (err: any) {
      console.error('Active save failed:', err);
      alert('Failed to save timetable to database: ' + (err.message || 'Unknown error'));
      throw err;
    } finally {
      setIsSavingGrid(false);
    }
  };

  // Primary active save action
  const handleSaveGrid = () => {
    persistGridActive(periods, days, timetable?.slots || [], '✅ Timetable successfully saved to database! All periods, days, and lesson slots are permanently persisted.');
  };

  // Row (Period) Actions with instant active database persist
  const handleAddPeriod = async () => {
    const updated = [...periods, { ...newPeriodData, periodNumber: periods.length + 1 }];
    setPeriods(updated);
    setIsAddPeriodOpen(false);
    setNewPeriodData({
      periodNumber: updated.length + 1,
      name: `Period ${updated.length + 1}`,
      startTime: '14:15',
      endTime: '15:00',
      isBreak: false,
      isLunch: false,
    });
    await persistGridActive(updated, days, timetable?.slots || [], '✅ New period added and actively saved to database!');
  };

  const handleUpdatePeriod = async (updatedPeriod: PeriodDefinition) => {
    const updated = periods.map((p) => (p.periodNumber === updatedPeriod.periodNumber ? updatedPeriod : p));
    setPeriods(updated);
    setEditingPeriod(null);
    await persistGridActive(updated, days, timetable?.slots || [], '✅ Period times updated and actively saved to database!');
  };

  const handleDeletePeriod = async (periodNum: number) => {
    if (!window.confirm(`Delete row Period ${periodNum}? Slots in this period will also be affected.`)) return;
    const updated = periods
      .filter((p) => p.periodNumber !== periodNum)
      .map((p, idx) => ({ ...p, periodNumber: idx + 1 }));
    setPeriods(updated);
    const updatedSlots = (timetable?.slots || []).filter((s) => s.periodNumber !== periodNum);
    if (timetable) {
      setTimetable({ ...timetable, slots: updatedSlots });
    }
    await persistGridActive(updated, days, updatedSlots, `✅ Period ${periodNum} removed and actively saved to database!`);
  };

  // Column (Day) Actions with instant active database persist
  const handleAddDay = async () => {
    const dayKey = newDayLabel.trim().toUpperCase().replace(/\s+/g, '_');
    if (days.some((d) => d.dayOfWeek === dayKey)) {
      alert('A day column with this identifier already exists!');
      return;
    }
    const updated = [...days, { dayOfWeek: dayKey, label: newDayLabel.trim(), isEnabled: true }];
    setDays(updated);
    setIsAddDayOpen(false);
    setNewDayLabel('Saturday');
    await persistGridActive(periods, updated, timetable?.slots || [], `✅ Day "${newDayLabel.trim()}" added and actively saved to database!`);
  };

  const handleDeleteDay = async (dayKey: string) => {
    if (!window.confirm(`Delete the column "${dayKey}" and all scheduled lessons for this day?`)) return;
    const updated = days.filter((d) => d.dayOfWeek !== dayKey);
    setDays(updated);
    const updatedSlots = (timetable?.slots || []).filter((s) => s.dayOfWeek !== dayKey);
    if (timetable) {
      setTimetable({
        ...timetable,
        slots: updatedSlots,
      });
    }
    await persistGridActive(periods, updated, updatedSlots, `✅ Day column "${dayKey}" removed and actively saved to database!`);
  };

  const handleSlotAdded = (updatedTimetable: TimetableData) => {
    setTimetable(updatedTimetable);
    if (updatedTimetable.periods && updatedTimetable.periods.length > 0) {
      setPeriods(updatedTimetable.periods);
    }
    if (updatedTimetable.days && updatedTimetable.days.length > 0) {
      setDays(updatedTimetable.days);
    }
    setIsGridDirty(false);
    const timestamp = new Date().toLocaleTimeString();
    setSaveSuccessMsg(`✅ Timetable slot assigned and saved to database! (Active at ${timestamp})`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (timetable?.id) {
      try {
        const res = await apiService.deleteTimetableSlot(timetable.id, slotId);
        if (res.success && res.data) {
          setTimetable(res.data);
          const timestamp = new Date().toLocaleTimeString();
          setSaveSuccessMsg(`✅ Timetable slot deleted and saved to database! (Active at ${timestamp})`);
          setTimeout(() => setSaveSuccessMsg(null), 3500);
          return;
        }
      } catch {
        // fallback to updating grid
      }
    }
    const updatedSlots = (timetable?.slots || []).filter((s) => s.id !== slotId);
    if (timetable) {
      setTimetable({
        ...timetable,
        slots: updatedSlots,
      });
    }
    await persistGridActive(periods, days, updatedSlots, '✅ Slot deleted and timetable updated in database!');
  };

  const handleCellClick = (dayKey: string, pDef: PeriodDefinition, existingSlot?: TimetableSlot) => {
    if (!canEditGrid) return;
    if (existingSlot) {
      setSelectedSlotForEdit({
        ...existingSlot,
        dayOfWeek: dayKey,
        periodNumber: pDef.periodNumber,
      });
    } else {
      setSelectedSlotForEdit({
        dayOfWeek: dayKey,
        periodNumber: pDef.periodNumber,
        startTime: pDef.startTime,
        endTime: pDef.endTime,
        isBreak: pDef.isBreak,
        label: pDef.isBreak ? pDef.name : undefined,
        teacherId: isTeacher && teacherProfile?.id ? teacherProfile.id : teacherId,
        roomName: activeClassName ? `${activeClassName} Room` : 'Classroom',
      });
    }
    setIsAddSlotOpen(true);
  };

  // Generates complete, full-page A4 Landscape calibrated HTML for Print & PDF download
  const buildTimetablePrintHTML = (titleContext: string, yearName: string) => {
    const schoolTitle = schoolInfo?.name || 'GRACE SEEDS SCHOOL';
    const schoolAddress = schoolInfo?.address || 'KEMRI Street, Kisian, Kisumu';
    const schoolPhone = schoolInfo?.phone || '0745436312';
    const schoolEmail = schoolInfo?.email || 'schoolgraceseeds@gmail.com';
    const numDays = days.length || 5;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Grace Seeds School Timetable - ${titleContext}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 5mm 7mm;
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
      background: #ffffff;
      color: #111111;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5px;
      line-height: 1.15;
    }
    .timetable-wrapper {
      width: 100%;
      height: 200mm;
      max-height: 200mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #800000;
      padding-bottom: 3px;
      margin-bottom: 2mm;
      flex-shrink: 0;
      height: 22mm;
      box-sizing: border-box;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      height: 44px;
      width: 44px;
      object-fit: contain;
      border-radius: 6px;
      border: 1.5px solid #800000;
      padding: 2px;
      background: #fff;
    }
    .school-title {
      font-size: 16px;
      font-weight: 900;
      color: #800000;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0;
      line-height: 1.1;
    }
    .sub-title {
      font-size: 8.5px;
      font-weight: 700;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 1px 0 0;
    }
    .meta-info {
      font-size: 7.5px;
      color: #555;
      margin: 1px 0 0;
    }
    .header-right {
      text-align: right;
    }
    .badge {
      display: inline-block;
      background: #800000;
      color: #fff;
      padding: 3.5px 12px;
      font-size: 10.5px;
      font-weight: 900;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-sub-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 3px;
      font-size: 7.5px;
      color: #444;
    }
    .meta-sub-row strong {
      color: #111;
    }
    .table-container {
      width: 100%;
      height: 154mm;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      margin: 1mm 0;
      overflow: hidden;
    }
    table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      box-sizing: border-box;
    }
    th, td {
      border: 1px solid #555;
      padding: 2.5px 3.5px;
      vertical-align: top;
      word-wrap: break-word;
      overflow: hidden;
      box-sizing: border-box;
    }
    thead {
      height: 10mm;
    }
    th {
      background: #800000 !important;
      color: #ffffff !important;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
      padding: 3px 2px;
      height: 10mm;
    }
    th .period-time-sub {
      color: #ffe0e0;
      font-size: 7px;
      font-family: monospace;
      display: block;
      margin-top: 1px;
    }
    .break-tag {
      display: inline-block;
      margin-top: 1px;
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
      font-weight: 700;
      font-size: 6.5px;
      text-transform: uppercase;
      padding: 0.5px 3px;
      border-radius: 3px;
    }
    tbody {
      height: 144mm;
    }
    tbody tr {
      height: calc(144mm / ${numDays});
    }
    .col-day {
      width: 90px;
      background: #fbfbfb !important;
      vertical-align: middle;
      text-align: center;
    }
    th.col-day {
      background: #800000 !important;
      color: #ffffff !important;
    }
    .day-title {
      font-weight: 900;
      color: #800000;
      font-size: 8.5px;
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .break-cell {
      background: #fef8ee !important;
      text-align: center;
      vertical-align: middle;
      color: #886200;
      font-weight: 800;
      font-size: 8.5px;
      padding: 3px;
      height: 100%;
    }
    .empty-cell {
      text-align: center;
      vertical-align: middle;
      color: #aaa;
      font-size: 9px;
      height: 100%;
    }
    .slot-card {
      height: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 1.5px 2px;
      box-sizing: border-box;
    }
    .subject-abbr-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .subject-abbr {
      font-size: 14px;
      font-weight: 900;
      color: #800000;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      line-height: 1;
      text-align: center;
    }
    .slot-teacher {
      font-size: 7px;
      font-weight: 600;
      color: #4b5563;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-align: center;
    }
    .slot-meta {
      font-size: 6.5px;
      color: #6b7280;
      font-family: monospace;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-align: center;
      border-top: 1px dotted #d1d5db;
      padding-top: 1px;
      width: 100%;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 18mm;
      border-top: 1.5px solid #800000;
      padding-top: 2px;
      margin-top: 1.5mm;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .sig-box {
      width: 31%;
    }
    .sig-title {
      font-weight: 700;
      font-size: 8px;
      color: #222;
      text-transform: uppercase;
    }
    .sig-line {
      border-bottom: 1px solid #666;
      height: 10px;
      margin-bottom: 2px;
    }
    .sig-caption {
      font-size: 7px;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="timetable-wrapper">
    <div class="header-bar">
      <div class="brand-left">
        <img src="/logo.png" onerror="if(!this.src.endsWith('/logo.jpg')){this.src='/logo.jpg';}" alt="${schoolTitle} Logo" class="logo" />
        <div>
          <h1 class="school-title">${schoolTitle}</h1>
          <div class="sub-title">MINISTRY OF EDUCATION · CBC MASTER TIMETABLE</div>
          <div class="meta-info">${schoolAddress} · Tel: ${schoolPhone} · ${schoolEmail}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="badge">${viewMode === 'class' ? `CLASS TIMETABLE · ${titleContext}` : `TEACHER TIMETABLE · ${titleContext}`}</div>
        <div class="meta-sub-row">
          ${viewMode === 'class' && selectedStreamName ? `<span><strong>Cohort:</strong> ${selectedStreamName}</span>` : ''}
          <span><strong>Academic Year:</strong> ${yearName}</span>
          <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="col-day">Day / Period</th>
            ${periods.map(p => `<th>
              <div>${p.name}</div>
              <span class="period-time-sub">${p.startTime} - ${p.endTime}</span>
              ${p.isBreak ? `<span class="break-tag">${p.isLunch ? 'Lunch' : 'Break'}</span>` : ''}
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${days.map(d => `
            <tr>
              <td class="col-day">
                <div class="day-title">${d.label}</div>
              </td>
              ${periods.map(p => {
                const s = activeSlots.find(sl => sl.dayOfWeek === d.dayOfWeek && sl.periodNumber === p.periodNumber);
                if (s) {
                  if (s.isBreak) {
                    return `<td class="break-cell">${s.label || (s.isLunch ? 'Lunch & Rest' : 'Morning Break')}</td>`;
                  }
                  const abbr = formatSubjectAbbreviation(s.learningAreaName);
                  return `<td>
                    <div class="slot-card">
                      <div class="slot-teacher">${s.teacherName || ""}</div>
                      <div class="subject-abbr-wrapper">
                        <span class="subject-abbr">${abbr}</span>
                      </div>
                      <div class="slot-meta">${s.roomName ? s.roomName + " · " : ""}${s.startTime}-${s.endTime}</div>
                    </div>
                  </td>`;
                }
                if (p.isBreak) {
                  return `<td class="break-cell">${p.name || (p.isLunch ? 'Lunch & Rest' : 'Morning Break')}</td>`;
                }
                return `<td class="empty-cell">—</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="sig-box">
        <div class="sig-title">Class Teacher:</div>
        <div class="sig-line"></div>
        <div class="sig-caption">Signature &amp; Date</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Deputy Headteacher (Academics):</div>
        <div class="sig-line"></div>
        <div class="sig-caption">Signature &amp; Date</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Principal / Headteacher:</div>
        <div class="sig-line"></div>
        <div class="sig-caption">Official Stamp &amp; Signature</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Dedicated Isolated Print Iframe Engine (Strict 1-Page A4 Landscape, 100% Page Coverage, No Ribbon)
  const handleDownloadTimetable = () => {
    const titleContext = viewMode === 'class'
      ? `${activeClassName}${selectedStreamName ? ` (${selectedStreamName})` : ''}`
      : activeTeacherName;
    const yearName = currentContext?.currentYear?.name || new Date().getFullYear().toString();
    const htmlContent = buildTimetablePrintHTML(titleContext, yearName);

    const oldFrame = document.getElementById('smartshule-timetable-print-frame');
    if (oldFrame && oldFrame.parentNode) {
      oldFrame.parentNode.removeChild(oldFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'smartshule-timetable-print-frame';
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
          const toRemove = document.getElementById('smartshule-timetable-print-frame');
          if (toRemove && toRemove.parentNode) {
            toRemove.parentNode.removeChild(toRemove);
          }
        }, 3000);
      }, 400);
    } else {
      window.print();
    }
  };

  // Standalone offline HTML export in Landscape Orientation (Whole Page, No Term Ribbon)
  const handleExportHTML = () => {
    const titleContext = viewMode === 'class'
      ? `${activeClassName}${selectedStreamName ? ` (${selectedStreamName})` : ''}`
      : activeTeacherName;
    const yearName = currentContext?.currentYear?.name || new Date().getFullYear().toString();
    const htmlContent = buildTimetablePrintHTML(titleContext, yearName);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Grace_Seeds_School_Timetable_${titleContext.replace(/[\s()]/g, '_')}_Landscape.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 font-body print:space-y-0 print:p-0 print:m-0 print:w-full">
      {/* Print CSS Injected Styles Calibrated for Strict 1-Page A4 Landscape Output Covering the Whole Page */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 7mm !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 8.5px !important;
            line-height: 1.15 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          header, aside, #main-sidebar, nav, footer, .no-print, .term-lifecycle-banner, [class*="term-lifecycle"], [class*="termNotice"] {
            display: none !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .printable-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 200mm !important;
            max-height: 200mm !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-header {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            text-align: left !important;
            border-bottom: 2px solid #800000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding-bottom: 3px !important;
            margin-bottom: 2mm !important;
            background: transparent !important;
            flex-shrink: 0 !important;
            height: 22mm !important;
            box-sizing: border-box !important;
          }
          .printable-header .school-logo-wrapper {
            width: 44px !important;
            height: 44px !important;
            margin: 0 !important;
            padding: 2px !important;
            border: 1.5px solid #800000 !important;
            border-radius: 6px !important;
            flex-shrink: 0 !important;
          }
          .printable-header .school-logo-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
          .timetable-table-wrapper {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 154mm !important;
            margin: 1mm 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .timetable-grid-table {
            width: 100% !important;
            height: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
          .timetable-grid-table thead {
            height: 10mm !important;
          }
          .timetable-grid-table th {
            background-color: #800000 !important;
            color: #ffffff !important;
            font-size: 8.5px !important;
            font-weight: 800 !important;
            text-align: center !important;
            height: 10mm !important;
            padding: 2px 2px !important;
            border: 1px solid #555 !important;
          }
          .timetable-grid-table th span {
            color: #ffffff !important;
          }
          .timetable-grid-table tbody {
            height: 144mm !important;
          }
          .timetable-grid-table tbody tr {
            height: calc(144mm / ${days.length || 5}) !important;
          }
          .timetable-grid-table td {
            border: 1px solid #555 !important;
            padding: 2.5px 3.5px !important;
            vertical-align: top !important;
            overflow: hidden !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }
          .timetable-grid-table td.col-day-cell {
            vertical-align: middle !important;
            text-align: center !important;
            background-color: #fbfbfb !important;
            font-weight: bold !important;
            width: 90px !important;
            white-space: nowrap !important;
          }
          .timetable-grid-table .slot-card {
            height: 100% !important;
            min-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            text-align: center !important;
            padding: 1.5px 2px !important;
            box-sizing: border-box !important;
          }
          .timetable-grid-table .subject-abbr-wrapper {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
          }
          .timetable-grid-table .subject-abbr {
            font-size: 14px !important;
            font-weight: 900 !important;
            color: #800000 !important;
            letter-spacing: 0.8px !important;
            text-transform: uppercase !important;
            line-height: 1 !important;
            text-align: center !important;
          }
          .timetable-grid-table .slot-teacher {
            font-size: 7px !important;
            font-weight: 600 !important;
            color: #4b5563 !important;
            text-align: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
          .timetable-grid-table .slot-meta {
            font-size: 6.5px !important;
            color: #6b7280 !important;
            font-family: monospace !important;
            text-align: center !important;
            border-top: 1px dotted #d1d5db !important;
            padding-top: 1px !important;
            width: 100% !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .print-only-signatures {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            flex-shrink: 0 !important;
            height: 18mm !important;
            margin-top: 1.5mm !important;
            padding-top: 2px !important;
            border-top: 1.5px solid #800000 !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .print-only-signatures > div {
            width: 31% !important;
          }
        }
      `}</style>

      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-[#800000] font-semibold">Master Timetable</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Grace Seeds School Timetable Engine
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Single school scheduling system · Configure periods, days, and assign teachers with automated conflict checks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download and Print Buttons */}
          <button
            onClick={handleDownloadTimetable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Download or print official timetable in landscape orientation covering the full page"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Download / Print (Landscape)</span>
          </button>

          <button
            onClick={handleExportHTML}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
            title="Download offline standalone landscape HTML timetable"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Landscape HTML</span>
          </button>

          {canEditGrid && (
            <>
              <button
                onClick={() => setIsAddPeriodOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
                title="Add a new Period (Time Column)"
              >
                <span className="material-symbols-outlined text-[16px]">view_column</span>
                <span>+ Period</span>
              </button>

              <button
                onClick={() => setIsAddDayOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
                title="Add a new Day (Row)"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>+ Day</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSlotForEdit(null);
                  setIsAddSlotOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Assign Slot</span>
              </button>

              <button
                onClick={handleSaveGrid}
                disabled={isSavingGrid}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                  isSavingGrid
                    ? 'bg-amber-600 text-white cursor-wait'
                    : isGridDirty
                    ? 'bg-[#800000] text-white hover:bg-[#600000] ring-2 ring-[#800000]/30 animate-pulse'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                title="Actively commit all timetable slots, periods, and day columns to database"
              >
                <span className={`material-symbols-outlined text-[16px] ${isSavingGrid ? 'animate-spin' : ''}`}>
                  {isSavingGrid ? 'sync' : isGridDirty ? 'save' : 'cloud_done'}
                </span>
                <span>{isSavingGrid ? 'Actively Saving to Database...' : isGridDirty ? 'Save Timetable (Unsaved Changes)' : 'Save Timetable (Active & Synced)'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in no-print">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-700">check_circle</span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-800 hover:text-emerald-950 p-1 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Control Filters (Class, Stream, Teacher Selection) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 no-print">
        {isParent ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#800000] text-white shadow-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">school</span>
              <span>Child Class Timetable</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'class'
                  ? 'bg-[#800000] text-white shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Class Schedule
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'teacher'
                  ? 'bg-[#800000] text-white shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Teacher Individual View
            </button>
          </div>
        )}

        {isParent ? (
          <div className="flex flex-wrap items-center gap-3">
            {parentChildren.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-on-surface-variant">Learner:</span>
                <select
                  value={selectedChildId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedChildId(cId);
                    const child = parentChildren.find((c) => c.id === cId);
                    if (child) {
                      if (child.classroomId) setSelectedClassId(child.classroomId);
                      if (child.streamId) setSelectedStreamId(child.streamId);
                    }
                  }}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-bold text-on-surface shadow-xs"
                >
                  {parentChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.gradeLevel ? c.gradeLevel.replace('_', ' ') : 'Primary'})
                    </option>
                  ))}
                </select>
              </div>
            ) : parentChildren.length === 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">
                  {parentChildren[0].firstName} {parentChildren[0].lastName}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  {parentChildren[0].gradeLevel ? parentChildren[0].gradeLevel.replace('_', ' ') : 'Primary'}
                </span>
              </div>
            ) : null}

            <span className="text-[11px] text-on-surface-variant font-data-mono">
              {activeClassName}{selectedStreamName ? ` - ${selectedStreamName}` : ''}
            </span>
          </div>
        ) : viewMode === 'class' ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Class Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-on-surface-variant">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-semibold text-on-surface shadow-xs"
              >
                {classesList.length === 0 ? (
                  <option value="">No classes configured</option>
                ) : (
                  sortAndGroupClasses(classesList).map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            {/* Optional Stream Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-on-surface-variant">Stream (Optional):</span>
              <select
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-semibold text-on-surface shadow-xs"
              >
                <option value="">Main Cohort (No Stream)</option>
                {classStreams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-on-surface-variant font-data-mono hidden md:inline">
              Grid: {days.length} Days (Rows) × {periods.length} Periods (Cols)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Teacher:</span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-semibold text-on-surface shadow-xs"
            >
              {teachersList.length === 0 ? (
                <option value="">No teachers available</option>
              ) : (
                teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.user?.fullName || `Teacher ${t.tscNumber || ''}`}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Main Printable Card (Contains Centered School Logo, Letterhead, and Full-Page Grid) */}
      <div className="printable-card bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-4 sm:p-6 print:p-0 space-y-4 print:space-y-0 print:border-none print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none">
        
        {/* School Letterhead Header - Logo and Class or Teacher prominently displayed WITHOUT term ribbon */}
        <div className="printable-header flex flex-col items-center justify-center text-center pb-4 print:pb-1 border-b-2 border-[#800000] print:flex-row print:justify-between print:items-center print:text-left">
          {/* Brand Left (Logo + School Info) */}
          <div className="flex flex-col items-center sm:flex-row print:flex-row print:items-center gap-3">
            <div className="school-logo-wrapper w-20 h-20 sm:w-24 sm:h-24 print:w-11 print:h-11 rounded-2xl print:rounded-md border-2 print:border border-[#800000] p-1 print:p-0.5 bg-white flex items-center justify-center shadow-md print:shadow-none mx-auto mb-1 sm:mb-0 print:mb-0 shrink-0">
              <img
                src="/logo.png"
                alt="Grace Seeds School Logo"
                className="w-full h-full object-contain filter drop-shadow-xs print:drop-shadow-none"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo.jpg')) {
                    target.src = '/logo.jpg';
                  }
                }}
              />
            </div>

            <div className="text-center sm:text-left print:text-left">
              <h2 className="text-xl sm:text-2xl print:text-[15px] font-black uppercase text-[#800000] tracking-wider leading-tight">
                GRACE SEEDS SCHOOL
              </h2>
              <p className="text-xs print:text-[8px] font-bold text-gray-700 uppercase tracking-wide mt-0.5 print:mt-0">
                MINISTRY OF EDUCATION · CBC MASTER TIMETABLE
              </p>
              <p className="text-[11px] print:text-[7.5px] text-gray-500 font-medium">
                KEMRI Street, Kisian, Kisumu · Tel: 0745436312 · schoolgraceseeds@gmail.com
              </p>
            </div>
          </div>

          {/* Context & Class or Teacher Title (NO TERM RIBBON) */}
          <div className="mt-3 sm:mt-0 print:mt-0 flex flex-col items-center sm:items-end print:items-end">
            <div className="inline-flex items-center gap-2 px-4 py-2 print:py-1 print:px-2.5 bg-[#800000] text-white rounded-xl print:rounded-md text-xs sm:text-sm print:text-[10px] font-black uppercase tracking-wider shadow-sm">
              <span className="material-symbols-outlined text-[18px] print:hidden">
                {viewMode === 'class' ? 'school' : 'person'}
              </span>
              <span>
                {viewMode === 'class'
                  ? `CLASS: ${activeClassName}${selectedStreamName ? ` (${selectedStreamName})` : ''}`
                  : `TEACHER: ${activeTeacherName}`}
              </span>
            </div>

            {/* Print metadata inline bar - WITHOUT ANY TERM RIBBON */}
            <div className="hidden print:flex items-center gap-2 mt-1 text-[7.5px] text-gray-600">
              {viewMode === 'class' && (
                <>
                  <span><strong className="text-gray-800 uppercase text-[7px]">Cohort:</strong> {selectedStreamName || 'Main Cohort'}</span>
                  <span>·</span>
                </>
              )}
              <span><strong className="text-gray-800 uppercase text-[7px]">Academic Year:</strong> {currentContext?.currentYear?.name || '2026'}</span>
              <span>·</span>
              <span><strong className="text-gray-800 uppercase text-[7px]">Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Screen-only Metadata Bar - WITHOUT ANY TERM RIBBON */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-gray-200 text-left text-xs no-print">
            <div>
              <span className="text-gray-500 font-semibold block text-[10px] uppercase">
                {viewMode === 'class' ? 'Class Entity:' : 'Instructional Educator:'}
              </span>
              <span className="font-bold text-gray-900">{viewMode === 'class' ? activeClassName : activeTeacherName}</span>
            </div>
            <div>
              <span className="text-gray-500 font-semibold block text-[10px] uppercase">Cohort / Stream:</span>
              <span className="font-bold text-gray-900">{selectedStreamName || 'Main Cohort (No Stream)'}</span>
            </div>
            <div>
              <span className="text-gray-500 font-semibold block text-[10px] uppercase">Academic Year:</span>
              <span className="font-bold text-gray-900">{currentContext?.currentYear?.name || '2026'}</span>
            </div>
          </div>
        </div>

        {/* Timetable Grid Table Container */}
        <div className="timetable-table-wrapper overflow-x-auto flex-1">
          <table className="timetable-grid-table w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30 print:bg-rose-50">
              <tr>
                <th className="py-2.5 px-3 print:py-1 print:px-1.5 w-28 print:w-[75px] border-r border-surface-container print:border-gray-400 text-xs print:text-[8.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface print:text-[#800000]">Day / Period</span>
                    {canEditGrid && (
                      <button
                        onClick={() => setIsAddDayOpen(true)}
                        title="Add day row"
                        className="text-[#800000] hover:opacity-80 cursor-pointer no-print"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_box</span>
                      </button>
                    )}
                  </div>
                </th>
                {periods.map((pDef) => (
                  <th
                    key={pDef.periodNumber}
                    className={`py-2 px-2.5 print:py-1 print:px-1 min-w-[140px] print:min-w-0 border-r border-surface-container last:border-r-0 print:border-gray-400 text-xs print:text-[8.5px] ${
                      pDef.isBreak ? 'bg-amber-500/10 print:bg-amber-100/60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-left">
                        <span className="font-bold text-[#800000] block text-xs print:text-[8px] leading-tight">
                          P{pDef.periodNumber} · {pDef.name}
                        </span>
                        <span className="text-[11px] print:text-[7px] text-outline font-normal block mt-0.5 print:mt-0 font-data-mono">
                          {pDef.startTime} - {pDef.endTime}
                        </span>
                        {pDef.isBreak && (
                          <span className="inline-block mt-1 print:mt-0 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 text-[10px] print:text-[6.5px] font-bold">
                            {pDef.isLunch ? 'Lunch' : 'Break'}
                          </span>
                        )}
                      </div>

                      {canEditGrid && (
                        <div className="flex items-center gap-0.5 ml-1 shrink-0 no-print">
                          <button
                            type="button"
                            onClick={() => setEditingPeriod(pDef)}
                            title="Edit Period Times & Label"
                            className="text-on-surface-variant hover:text-[#800000] cursor-pointer p-0.5 rounded hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                          {periods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(pDef.periodNumber)}
                              title="Delete this period column"
                              className="text-on-surface-variant hover:text-error cursor-pointer p-0.5 rounded hover:bg-surface-container"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {days.map((d) => (
                <tr
                  key={d.dayOfWeek}
                  className="hover:bg-surface-container-low/20 transition-colors"
                >
                  {/* Day Header Row Label */}
                  <td className="col-day-cell py-2.5 px-3 print:py-1 print:px-1.5 border-r border-surface-container print:border-gray-400 align-middle print:bg-[#fbfbfb]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#800000] block text-xs print:text-[8.5px] uppercase tracking-wider">
                        {d.label}
                      </span>
                      {canEditGrid && days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(d.dayOfWeek)}
                          title={`Delete ${d.label} row`}
                          className="text-outline hover:text-error transition-colors cursor-pointer no-print ml-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Period Columns for this Day */}
                  {periods.map((pDef) => {
                    const slot = activeSlots.find(
                      (s) => s.dayOfWeek === d.dayOfWeek && s.periodNumber === pDef.periodNumber
                    );

                    return (
                      <td
                        key={`${d.dayOfWeek}-${pDef.periodNumber}`}
                        onClick={() => handleCellClick(d.dayOfWeek, pDef, slot)}
                        className={`py-2 px-2 print:py-0.5 print:px-1 border-r border-surface-container last:border-r-0 print:border-gray-400 align-top transition-colors ${
                          pDef.isBreak ? 'bg-amber-500/5 print:bg-[#fef8ee]' : ''
                        } ${canEditGrid ? 'cursor-pointer hover:bg-rose-50/30' : ''}`}
                      >
                        {slot ? (
                          slot.isBreak ? (
                            <div className="h-full min-h-[52px] print:min-h-0 print:h-auto rounded-lg print:rounded-none bg-amber-50 border border-amber-200/60 print:border-none p-2 print:p-0.5 flex flex-col justify-center items-center text-center print:bg-[#fef8ee]">
                              <span className="material-symbols-outlined text-amber-700 text-sm no-print">coffee</span>
                              <span className="text-[11px] print:text-[8px] font-bold text-amber-900 print:text-[#886200] mt-0.5 print:mt-0">
                                {slot.label || (slot.isLunch ? 'Lunch & Rest' : 'Morning Break')}
                              </span>
                            </div>
                          ) : (
                            <div className="slot-card h-full min-h-[52px] print:min-h-0 print:h-auto rounded-lg print:rounded-none bg-surface-container-lowest border border-outline-variant/30 print:border-none p-1.5 print:p-0.5 shadow-xs print:shadow-none hover:border-[#800000]/50 transition-all flex flex-col justify-between items-center text-center">
                              <div className="slot-teacher w-full text-center">
                                <span className="text-[10px] print:text-[7px] text-on-surface-variant print:text-gray-600 font-semibold block truncate">
                                  {slot.teacherName || 'Assigned Teacher'}
                                </span>
                              </div>

                              <div className="subject-abbr-wrapper my-1 print:my-0.5 flex-1 flex items-center justify-center w-full">
                                <span className="subject-abbr font-black text-[#800000] text-sm sm:text-base print:text-[14px] uppercase tracking-wider block">
                                  {formatSubjectAbbreviation(slot.learningAreaName)}
                                </span>
                              </div>

                              <div className="slot-meta w-full text-center pt-1 print:pt-0 border-t print:border-none border-surface-container-high text-[9px] print:text-[6.5px] text-outline print:text-gray-500 font-data-mono truncate">
                                <span>{slot.roomName ? slot.roomName + ' · ' : ''}{slot.startTime}-{slot.endTime}</span>
                              </div>
                            </div>
                          )
                        ) : pDef.isBreak ? (
                          <div className="h-full min-h-[52px] print:min-h-0 print:h-auto rounded-lg print:rounded-none bg-surface-container-low/50 border border-dashed border-outline-variant/30 print:border-none p-2 print:p-0.5 flex flex-col justify-center items-center text-center print:bg-[#fef8ee]">
                            <span className="text-[11px] print:text-[8px] text-outline italic print:text-[#886200] print:font-bold">
                              {pDef.name || 'Break'}
                            </span>
                          </div>
                        ) : (
                          <div className="h-full min-h-[52px] print:min-h-0 print:h-auto rounded-lg print:rounded-none border border-dashed border-outline-variant/30 print:border-none p-2 print:p-0.5 flex flex-col justify-center items-center text-center text-outline hover:text-[#800000] hover:border-[#800000] transition-all group">
                            {canEditGrid && (
                              <div className="no-print flex flex-col items-center">
                                <span className="material-symbols-outlined text-xs group-hover:scale-110 transition-transform">add</span>
                                <span className="text-[10px] font-semibold mt-0.5">Empty Slot</span>
                              </div>
                            )}
                            <span className="hidden print:inline text-gray-400 text-[8px]">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Verification Signatures Block (Visible in Print & at bottom of document) */}
        <div className="print-only-signatures mt-8 print:mt-2 pt-6 print:pt-1 border-t-2 print:border-t border-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-6 print:gap-3 text-xs print:text-[8px]">
          <div className="space-y-2 print:space-y-0.5">
            <p className="font-bold text-gray-800 print:text-[8px]">Class Teacher:</p>
            <div className="border-b border-gray-400 h-10 print:h-3.5"></div>
            <p className="text-[10px] print:text-[7px] text-gray-500 italic">Signature & Date</p>
          </div>
          <div className="space-y-2 print:space-y-0.5">
            <p className="font-bold text-gray-800 print:text-[8px]">Deputy Headteacher (Academics):</p>
            <div className="border-b border-gray-400 h-10 print:h-3.5"></div>
            <p className="text-[10px] print:text-[7px] text-gray-500 italic">Signature & Date</p>
          </div>
          <div className="space-y-2 print:space-y-0.5">
            <p className="font-bold text-gray-800 print:text-[8px]">Principal / Headteacher:</p>
            <div className="border-b border-gray-400 h-10 print:h-3.5"></div>
            <p className="text-[10px] print:text-[7px] text-gray-500 italic">Official School Stamp & Signature</p>
          </div>
        </div>

      </div>

      {/* Quick Period Edit Modal */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Edit Period {editingPeriod.periodNumber} Details</h3>
              <button
                onClick={() => setEditingPeriod(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Period Label / Name</label>
                <input
                  type="text"
                  value={editingPeriod.name}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, name: e.target.value })}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingPeriod.startTime}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, startTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingPeriod.endTime}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, endTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="periodIsBreak"
                  checked={editingPeriod.isBreak}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, isBreak: e.target.checked })}
                  className="w-4 h-4 text-[#800000] rounded"
                />
                <label htmlFor="periodIsBreak" className="text-xs font-semibold text-on-surface">
                  This period is a Break or Interval
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePeriod(editingPeriod)}
                className="flex-1 py-2 bg-[#800000] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Update Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Period Modal */}
      {isAddPeriodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Add New Period (Time Column)</h3>
              <button
                onClick={() => setIsAddPeriodOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Period Label</label>
                <input
                  type="text"
                  value={newPeriodData.name}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, name: e.target.value })}
                  placeholder="e.g. Period 7, Evening Study"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newPeriodData.startTime}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, startTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">End Time</label>
                  <input
                    type="time"
                    value={newPeriodData.endTime}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, endTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newIsBreak"
                  checked={newPeriodData.isBreak}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, isBreak: e.target.checked })}
                  className="w-4 h-4 text-[#800000] rounded"
                />
                <label htmlFor="newIsBreak" className="text-xs font-semibold text-on-surface">
                  This period is a Break / Tea / Rest
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddPeriodOpen(false)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPeriod}
                className="flex-1 py-2 bg-[#800000] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Modal */}
      {isAddDayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Add Timetable Day (Row)</h3>
              <button
                onClick={() => setIsAddDayOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Day Name / Label</label>
                <input
                  type="text"
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  placeholder="e.g. Saturday, Sunday, Remedial"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddDayOpen(false)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDay}
                className="flex-1 py-2 bg-[#800000] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      <AddTimetableSlotModal
        isOpen={isAddSlotOpen}
        onClose={() => {
          setIsAddSlotOpen(false);
          setSelectedSlotForEdit(null);
        }}
        onSlotAdded={handleSlotAdded}
        timetableId={timetable?.id || ''}
        classRoomId={selectedClassId}
        streamId={selectedStreamId}
        termId={currentContext?.currentTerm?.id || ''}
        classes={classesList}
        streams={classStreams}
        initialSlot={selectedSlotForEdit}
        availableDays={days.map((d) => ({ key: d.dayOfWeek, label: d.label }))}
        onDeleteSlot={handleDeleteSlot}
      />
    </div>
  );
};
