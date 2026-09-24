import React, { useState, useEffect } from 'react';
import { Teacher, UserRole, ClassRoom, StreamItem } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TeachersViewProps {
  teachers: Teacher[];
  onToggleClockIn: (teacherId: string) => void;
  onOpenOnboardTeacher?: () => void;
  onDeleteTeacher?: (teacherId: string) => void;
  onAssignTeacher?: (teacherId: string, assignedClass: string) => void;
}

const CBC_STANDARD_CLASSES = [
  { name: 'Playgroup', gradeLevel: 'PLAYGROUP', educationLevel: 'PRE_PRIMARY' },
  { name: 'Pre-Primary 1 (PP1)', gradeLevel: 'PP1', educationLevel: 'PRE_PRIMARY' },
  { name: 'Pre-Primary 2 (PP2)', gradeLevel: 'PP2', educationLevel: 'PRE_PRIMARY' },
  { name: 'Grade 1', gradeLevel: 'GRADE_1', educationLevel: 'LOWER_PRIMARY' },
  { name: 'Grade 2', gradeLevel: 'GRADE_2', educationLevel: 'LOWER_PRIMARY' },
  { name: 'Grade 3', gradeLevel: 'GRADE_3', educationLevel: 'LOWER_PRIMARY' },
  { name: 'Grade 4', gradeLevel: 'GRADE_4', educationLevel: 'UPPER_PRIMARY' },
  { name: 'Grade 5', gradeLevel: 'GRADE_5', educationLevel: 'UPPER_PRIMARY' },
  { name: 'Grade 6', gradeLevel: 'GRADE_6', educationLevel: 'UPPER_PRIMARY' },
  { name: 'Grade 7', gradeLevel: 'GRADE_7', educationLevel: 'JUNIOR_SCHOOL' },
  { name: 'Grade 8', gradeLevel: 'GRADE_8', educationLevel: 'JUNIOR_SCHOOL' },
  { name: 'Grade 9', gradeLevel: 'GRADE_9', educationLevel: 'JUNIOR_SCHOOL' },
];

const formatGradeLabel = (grade: string): string => {
  return (grade || '').replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  onToggleClockIn,
  onOpenOnboardTeacher,
  onDeleteTeacher,
  onAssignTeacher,
}) => {
  const { user } = useAuth();
  const canOnboard = Boolean(
    user?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.ADMISSIONS
    ].includes(user.role)
  );

  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [, setLoadingAcademic] = useState(false);

  // Assignment Modal States
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStreamMode, setSelectedStreamMode] = useState<string>(''); // streamId | 'main-default' | '__NEW_STREAM__'
  const [customStreamName, setCustomStreamName] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('CLASS_TEACHER');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadClassesAndStreams = async () => {
    setLoadingAcademic(true);
    try {
      const cRes = await apiService.getClasses();
      if (cRes?.data && Array.isArray(cRes.data) && cRes.data.length > 0) {
        setClasses(cRes.data);
        const map: Record<string, StreamItem[]> = {};
        await Promise.all(
          cRes.data.map(async (c) => {
            try {
              const sRes = await apiService.getStreamsByClass(c.id);
              if (sRes?.data && Array.isArray(sRes.data)) {
                map[c.id] = sRes.data;
              } else {
                map[c.id] = [];
              }
            } catch {
              map[c.id] = [];
            }
          })
        );
        setStreamsMap(map);
      } else {
        setClasses([]);
        setStreamsMap({});
      }
    } catch (err) {
      console.error('Error loading academic structure in TeachersView:', err);
    } finally {
      setLoadingAcademic(false);
    }
  };

  useEffect(() => {
    loadClassesAndStreams();
  }, []);

  // Compute all available class options (database + any missing standard CBC levels)
  const existingNames = new Set(classes.map((c) => c.name.toLowerCase()));
  const missingStandards = CBC_STANDARD_CLASSES.filter(
    (sc) => !existingNames.has(sc.name.toLowerCase())
  ).map((sc) => ({
    id: `standard-${sc.name}`,
    name: sc.name,
    gradeLevel: sc.gradeLevel,
    educationLevel: sc.educationLevel,
    schoolId: 'school-001',
  }));

  const allClassOptions = [...classes, ...missingStandards];

  // Helper to translate stream IDs or raw text into readable Class - Stream label
  const resolveAssignedClassName = (assignedClass: string | undefined): string => {
    if (!assignedClass || assignedClass === 'Unassigned') return 'Unassigned';
    const parts = assignedClass.split(',').map((p) => p.trim());
    const resolvedParts = parts.map((part) => {
      for (const [classId, sList] of Object.entries(streamsMap)) {
        const foundStream = sList.find((s) => s.id === part);
        if (foundStream) {
          const foundClass = classes.find((c) => c.id === classId);
          return foundClass ? `${foundClass.name} - ${foundStream.name}` : `${foundStream.name} Stream`;
        }
      }
      return part;
    });
    return resolvedParts.join(', ');
  };

  const handleOpenAssignModal = (t: Teacher) => {
    setSelectedTeacher(t);
    setAssignSuccess(null);
    setAssignError(null);
    setCustomStreamName('');
    setAssignmentRole('CLASS_TEACHER');

    let matchedClassId = '';
    if (allClassOptions.length > 0) {
      const match = allClassOptions.find((c) =>
        t.assignedClass &&
        (c.name.toLowerCase().includes(t.assignedClass.toLowerCase()) ||
          t.assignedClass.toLowerCase().includes(c.name.toLowerCase()))
      );
      matchedClassId = match ? match.id : allClassOptions[0].id;
    } else {
      matchedClassId = 'standard-Grade 1';
    }

    setSelectedClassId(matchedClassId);

    const streamsForClass = streamsMap[matchedClassId] || [];
    if (streamsForClass.length > 0) {
      const matchStream = streamsForClass.find((s) =>
        t.assignedClass &&
        (t.assignedClass.toLowerCase().includes(s.name.toLowerCase()) ||
          t.assignedClass.includes(s.id))
      );
      setSelectedStreamMode(matchStream ? matchStream.id : streamsForClass[0].id);
    } else {
      setSelectedStreamMode('main-default');
    }

    setIsAssignOpen(true);
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const streamsForClass = streamsMap[newClassId] || [];
    if (streamsForClass.length > 0) {
      setSelectedStreamMode(streamsForClass[0].id);
    } else {
      setSelectedStreamMode('main-default');
    }
    setCustomStreamName('');
    setAssignError(null);
  };

  const handleStreamModeChange = (newMode: string) => {
    setSelectedStreamMode(newMode);
    if (newMode === '__NEW_STREAM__') {
      setCustomStreamName('');
    }
    setAssignError(null);
  };

  const handleAssignClassAndStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    setAssignLoading(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      let activeClassId = selectedClassId;
      let activeClassName = '';

      // 1. Resolve or create ClassRoom in DB
      let classObj = classes.find((c) => c.id === activeClassId);

      if (!classObj) {
        const standardMatch = CBC_STANDARD_CLASSES.find(
          (sc) => `standard-${sc.name}` === activeClassId || sc.name === activeClassId
        ) || CBC_STANDARD_CLASSES[2];

        const activeSchoolId = user?.schoolId || 'school-001';
        const createClassRes = await apiService.createClass({
          name: standardMatch.name,
          gradeLevel: standardMatch.gradeLevel,
          educationLevel: standardMatch.educationLevel,
          schoolId: activeSchoolId,
        });

        if (!createClassRes?.data?.id) {
          throw new Error('Could not initialize class in database');
        }

        classObj = createClassRes.data;
        activeClassId = classObj.id;
        activeClassName = classObj.name;
        setClasses((prev) => [...prev, classObj!]);
      } else {
        activeClassName = classObj.name;
      }

      // 2. Resolve or create Stream
      let targetStreamId = '';
      let targetStreamName = '';

      if (selectedStreamMode === 'main-default') {
        const existingMain = (streamsMap[activeClassId] || []).find(
          (s) =>
            s.name.toLowerCase() === 'main' ||
            s.name.toLowerCase() === 'main stream'
        );

        if (existingMain) {
          targetStreamId = existingMain.id;
          targetStreamName = existingMain.name;
        } else {
          const createStreamRes = await apiService.createStream({
            classRoomId: activeClassId,
            name: 'Main Stream',
            capacity: 40,
            classTeacherId:
              assignmentRole === 'CLASS_TEACHER' ? selectedTeacher.id : undefined,
          });

          if (!createStreamRes?.data?.id) {
            throw new Error('Failed to create Main Stream for this class');
          }

          targetStreamId = createStreamRes.data.id;
          targetStreamName = createStreamRes.data.name;

          setStreamsMap((prev) => ({
            ...prev,
            [activeClassId]: [...(prev[activeClassId] || []), createStreamRes.data],
          }));
        }
      } else if (selectedStreamMode === '__NEW_STREAM__') {
        if (!customStreamName.trim()) {
          setAssignError('Please enter a name for the new stream.');
          setAssignLoading(false);
          return;
        }

        const createStreamRes = await apiService.createStream({
          classRoomId: activeClassId,
          name: customStreamName.trim(),
          capacity: 40,
          classTeacherId:
            assignmentRole === 'CLASS_TEACHER' ? selectedTeacher.id : undefined,
        });

        if (!createStreamRes?.data?.id) {
          throw new Error('Failed to create custom stream');
        }

        targetStreamId = createStreamRes.data.id;
        targetStreamName = createStreamRes.data.name;

        setStreamsMap((prev) => ({
          ...prev,
          [activeClassId]: [...(prev[activeClassId] || []), createStreamRes.data],
        }));
      } else {
        targetStreamId = selectedStreamMode;
        const found = (streamsMap[activeClassId] || []).find((s) => s.id === selectedStreamMode);
        targetStreamName = found ? found.name : 'Stream';
      }

      // 3. Assign stream to teacher in backend
      const res = await apiService.assignStreamToTeacher(selectedTeacher.id, targetStreamId);
      if (!res.success) {
        throw new Error(res.message || 'Failed to assign stream to educator');
      }

      const assignedLabel = `${activeClassName} - ${targetStreamName}`;
      setAssignSuccess(`Assigned ${selectedTeacher.name} to ${assignedLabel}!`);

      // 4. Update parent state
      onAssignTeacher?.(selectedTeacher.id, assignedLabel);

      setTimeout(() => {
        setIsAssignOpen(false);
        setAssignSuccess(null);
      }, 1200);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign class & stream');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteTeacher = async (t: Teacher) => {
    if (window.confirm(`Are you sure you want to delete ${t.name} (TSC: ${t.tscNumber})? This action cannot be undone.`)) {
      setDeletingId(t.id);
      try {
        const res = await apiService.deleteTeacher(t.id);
        if (res.success) {
          onDeleteTeacher?.(t.id);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete teacher');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tscNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase()) ||
      t.learningAreas.some((la) => la.toLowerCase().includes(search.toLowerCase()))
  );

  const currentStreams = streamsMap[selectedClassId] || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary font-semibold">Teachers & Staff</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Faculty & Biometric Clock-in Registry
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Article 237 (TSC) & Chapter 6 Compliant</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            TSC registered educators, assigned learning areas, stream allocations, and real-time roll call
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenOnboardTeacher && canOnboard && (
            <button
              onClick={onOpenOnboardTeacher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Onboard Teacher (Art. 237)</span>
            </button>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            {teachers.filter((t) => t.status === 'Clocked In').length}/{teachers.length} Clocked In
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher name, TSC number, or learning area..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary shadow-xs"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-outline">person_off</span>
            <p className="font-bold text-base text-on-surface">No educators found</p>
            <p className="text-xs text-outline">Click "Onboard CBC Teacher" to register faculty members with TSC numbers.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const isClockedIn = t.status === 'Clocked In';
            return (
              <div
                key={t.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {(t.name || '')
                          .replace('Tr. ', '')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <h3 className="font-headline-md text-sm font-bold text-on-surface">{t.name}</h3>
                        <p className="text-[11px] text-on-surface-variant font-data-mono">{t.tscNumber}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isClockedIn ? 'bg-secondary text-white' : 'bg-surface-container text-outline'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Role / Designation:</span>
                      <span className="font-semibold text-on-surface">{t.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Assigned Class:</span>
                      <span
                        className="font-bold text-primary truncate max-w-[170px]"
                        title={resolveAssignedClassName(t.assignedClass)}
                      >
                        {resolveAssignedClassName(t.assignedClass)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Specialization:</span>
                      <span className="font-semibold text-secondary truncate max-w-[170px]">
                        {t.learningAreas.join(', ')}
                      </span>
                    </div>
                    {t.qualification && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Qualification:</span>
                        <span className="text-on-surface">{t.qualification}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Direct Phone:</span>
                      <span className="font-data-mono text-outline">{t.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenAssignModal(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                    title={`Assign Class & Stream to ${t.name}`}
                  >
                    <span className="material-symbols-outlined text-[15px] text-primary group-hover:text-white transition-colors">
                      school
                    </span>
                    <span>Assign Class</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteTeacher(t)}
                      disabled={deletingId === t.id}
                      title="Delete Teacher Record"
                      className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {deletingId === t.id ? 'sync' : 'delete'}
                      </span>
                    </button>
                    <button
                      onClick={() => onToggleClockIn(t.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                        isClockedIn
                          ? 'bg-error-container text-on-error-container hover:bg-error/20'
                          : 'bg-primary text-white hover:bg-primary-container'
                      }`}
                    >
                      {isClockedIn ? 'Clock Out' : 'Clock In'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Class & Stream Modal */}
      {isAssignOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            {/* Header */}
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-rose-200">school</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assign Class & Stream</h3>
                  <p className="text-[11px] text-rose-200">Allocate CBC grade level and roll-call stream</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAssignClassAndStream} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              {/* Selected Educator Card */}
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {(selectedTeacher.name || '')
                    .replace('Tr. ', '')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-on-surface truncate text-xs">{selectedTeacher.name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-data-mono">
                      {selectedTeacher.tscNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                    Currently: <span className="font-semibold text-primary">{resolveAssignedClassName(selectedTeacher.assignedClass)}</span>
                  </p>
                </div>
              </div>

              {assignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{assignSuccess}</span>
                </div>
              )}

              {assignError && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20 animate-in fade-in">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>
                  <span>{assignError}</span>
                </div>
              )}

              {/* Dropdown 1: Target Class / Grade Level */}
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  1. Target CBC Class / Grade Level <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    disabled={assignLoading}
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary focus:border-primary transition-all cursor-pointer"
                  >
                    {allClassOptions.length === 0 ? (
                      <option value="">No classes available</option>
                    ) : (
                      allClassOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.gradeLevel ? `(${formatGradeLabel(c.gradeLevel)})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <p className="text-[10px] text-outline mt-1">Select the CBC class level to which this teacher is assigned.</p>
              </div>

              {/* Dropdown 2: Target Stream Allocation */}
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  2. Target Stream / Room Allocation <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedStreamMode}
                    onChange={(e) => handleStreamModeChange(e.target.value)}
                    disabled={assignLoading}
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary focus:border-primary transition-all cursor-pointer"
                  >
                    {currentStreams.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} Stream {st.capacity ? `(Capacity: ${st.capacity})` : ''}
                      </option>
                    ))}
                    {currentStreams.length === 0 && (
                      <option value="main-default">Main Stream (Default)</option>
                    )}
                    <option value="__NEW_STREAM__">+ Create / Allocate New Custom Stream...</option>
                  </select>
                </div>
                <p className="text-[10px] text-outline mt-1">
                  {currentStreams.length > 0
                    ? `${currentStreams.length} active stream(s) available for this class.`
                    : 'No stream records exist yet. "Main Stream" will be created and assigned automatically.'}
                </p>
              </div>

              {/* Custom stream name input if __NEW_STREAM__ is chosen */}
              {selectedStreamMode === '__NEW_STREAM__' && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
                  <label className="block font-bold text-amber-900 text-[11px]">
                    Custom Stream Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={customStreamName}
                    onChange={(e) => setCustomStreamName(e.target.value)}
                    placeholder="e.g. East, Blue, North, St. Peter"
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-on-surface focus:outline-primary"
                    autoFocus
                  />
                  <p className="text-[10px] text-amber-800">
                    This new stream will be initialized under the selected class and linked to the teacher.
                  </p>
                </div>
              )}

              {/* Dropdown 3: Responsibility / Role */}
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  3. Teaching Role in this Class
                </label>
                <select
                  value={assignmentRole}
                  onChange={(e) => setAssignmentRole(e.target.value)}
                  disabled={assignLoading}
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary focus:border-primary transition-all cursor-pointer"
                >
                  <option value="CLASS_TEACHER">Class Teacher (Lead Educator & Roll Call)</option>
                  <option value="SUBJECT_TEACHER">Subject Teacher (CBC Learning Area)</option>
                  <option value="ASSISTANT_TEACHER">Assistant Class Teacher</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  disabled={assignLoading}
                  className="px-3.5 py-2 rounded-lg border border-outline-variant/60 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {assignLoading ? 'sync' : 'check'}
                  </span>
                  <span>{assignLoading ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
