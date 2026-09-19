import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { BackendLearningArea, ClassRoom, StreamItem, Teacher } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const LearningAreasView: React.FC = () => {
  const { user } = useAuth();
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  // Subject Form State
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectGradeLevel, setSubjectGradeLevel] = useState('GRADE_7');
  const [subjectEducationLevel, setSubjectEducationLevel] = useState('JUNIOR_SCHOOL');
  const [isElective, setIsElective] = useState(false);
  const [assignedTeacherId, setAssignedTeacherId] = useState('');

  // Stream Form State
  const [streamClassRoomId, setStreamClassRoomId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [streamCapacity, setStreamCapacity] = useState('40');
  const [streamTeacherId, setStreamTeacherId] = useState('');

  // Class Form State
  const [className, setClassName] = useState('');
  const [classGradeLevel, setClassGradeLevel] = useState('GRADE_7');
  const [classEducationLevel, setClassEducationLevel] = useState('JUNIOR_SCHOOL');

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [scRes, laRes, cRes, tRes] = await Promise.all([
        apiService.getSchool().catch(() => null),
        apiService.getLearningAreas().catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getTeachers().catch(() => null),
      ]);

      if (scRes?.data) setSchoolInfo(scRes.data);
      if (laRes?.data) setLearningAreas(laRes.data || []);
      if (cRes?.data) {
        setClasses(cRes.data || []);
        if (cRes.data.length > 0 && !streamClassRoomId) {
          setStreamClassRoomId(cRes.data[0].id);
        }

        // Load streams for all classes
        const sMap: Record<string, StreamItem[]> = {};
        for (const cls of cRes.data) {
          const sRes = await apiService.getStreamsByClass(cls.id).catch(() => null);
          if (sRes?.data) {
            sMap[cls.id] = sRes.data;
          }
        }
        setStreamsMap(sMap);
      }

      if (tRes?.data) setTeachers(tRes.data || []);
    } catch (err: any) {
      console.error('Failed to load academic data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) {
      setFeedback({ type: 'error', message: 'Subject name and code are required.' });
      return;
    }

    const schoolId = user?.schoolId || schoolInfo?.id || 'school-001';

    try {
      const res = await apiService.createLearningArea({
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        gradeLevel: subjectGradeLevel,
        educationLevel: subjectEducationLevel,
        isElective,
        schoolId,
        teacherId: assignedTeacherId || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Subject "${subjectName}" saved successfully into the database!` });
        setIsAddSubjectOpen(false);
        setSubjectName('');
        setSubjectCode('');
        setAssignedTeacherId('');
        await loadAllData();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create subject' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving subject' });
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamClassRoomId || !streamName.trim()) {
      setFeedback({ type: 'error', message: 'Class and stream name are required.' });
      return;
    }

    try {
      const res = await apiService.createStream({
        classRoomId: streamClassRoomId,
        name: streamName.trim(),
        capacity: parseInt(streamCapacity, 10) || 40,
        classTeacherId: streamTeacherId || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Stream "${streamName}" saved successfully into the database!` });
        setIsAddStreamOpen(false);
        setStreamName('');
        setStreamTeacherId('');
        await loadAllData();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create stream' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving stream' });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setFeedback({ type: 'error', message: 'Class name is required.' });
      return;
    }

    const schoolId = user?.schoolId || schoolInfo?.id || 'school-001';

    try {
      const res = await apiService.createClass({
        name: className.trim(),
        gradeLevel: classGradeLevel,
        educationLevel: classEducationLevel,
        schoolId,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Class "${className}" created successfully!` });
        setIsAddClassOpen(false);
        setClassName('');
        await loadAllData();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create class' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving class' });
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete subject "${name}"? This action cannot be undone.`)) {
      try {
        const res = await apiService.deleteLearningArea(id);
        if (res.success) {
          setLearningAreas((prev) => prev.filter((la) => la.id !== id));
          setFeedback({ type: 'success', message: `Subject "${name}" deleted from database.` });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed to delete subject.' });
      }
    }
  };

  const filteredAreas = learningAreas.filter((la) => {
    const matchesSearch =
      la.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      la.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGradeFilter === 'ALL' || la.gradeLevel === selectedGradeFilter;
    return matchesSearch && matchesGrade;
  });

  const getTeacherName = (tId?: string) => {
    if (!tId) return 'Unassigned';
    const teacher = teachers.find((t) => t.id === tId);
    return teacher ? teacher.name : 'Assigned Teacher';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-[#800000]">Subjects & Curriculum</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {schoolInfo?.name || 'Grace Seeds School'} · Subjects & Learning Areas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Single institution curriculum database: configure KICD learning areas, assign subject teachers, and manage streams
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddSubjectOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Subject</span>
          </button>
          <button
            onClick={() => setIsAddStreamOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">splitscreen</span>
            <span>Add Stream</span>
          </button>
          <button
            onClick={() => setIsAddClassOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-600 hover:text-black cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#F8F5F5] rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Subjects</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{learningAreas.length}</span>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[12px]">database</span>
            <span>Database Synced</span>
          </span>
        </div>

        <div className="bg-[#F8F5F5] rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Core Subjects</span>
          <span className="text-2xl font-black text-[#800000] mt-1 block">
            {learningAreas.filter((la) => !la.isElective).length}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">Mandatory KICD CBC</span>
        </div>

        <div className="bg-[#F8F5F5] rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Elective Subjects</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {learningAreas.filter((la) => la.isElective).length}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">Specialized Pathways</span>
        </div>

        <div className="bg-[#F8F5F5] rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Classes & Streams</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {classes.length} / {Object.values(streamsMap).reduce((acc, curr) => acc + curr.length, 0)}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">Grace Seeds Cohorts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#F8F5F5] p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject title or code..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#800000]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Grade Filter:</span>
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-[#800000]"
          >
            <option value="ALL">All Grades (PP1 - Grade 9)</option>
            <option value="PP1">Pre-Primary 1 (PP1)</option>
            <option value="PP2">Pre-Primary 2 (PP2)</option>
            <option value="GRADE_1">Grade 1</option>
            <option value="GRADE_2">Grade 2</option>
            <option value="GRADE_3">Grade 3</option>
            <option value="GRADE_4">Grade 4</option>
            <option value="GRADE_5">Grade 5</option>
            <option value="GRADE_6">Grade 6</option>
            <option value="GRADE_7">Grade 7</option>
            <option value="GRADE_8">Grade 8</option>
            <option value="GRADE_9">Grade 9</option>
          </select>
        </div>
      </div>

      {/* Subjects Grid & List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#800000]">menu_book</span>
            <span>Curriculum Subjects ({filteredAreas.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Live KICD CBC Database Records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-[#F8F5F5] rounded-2xl border border-slate-200">
            Loading subjects from Grace Seeds School database...
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-[#F8F5F5] rounded-2xl border border-slate-200 p-8">
            <span className="material-symbols-outlined text-4xl text-slate-400">subject</span>
            <p className="font-bold text-sm text-slate-800 mt-2">No subjects match your query</p>
            <p className="text-xs text-slate-500 mt-1">Click "Create Subject" to add a new subject to the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map((la) => (
              <div
                key={la.id}
                className="bg-[#F8F5F5] rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#800000] bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-200">
                      {la.code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        la.isElective
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {la.isElective ? 'Elective' : 'Core Subject'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3">{la.name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Target: <span className="font-semibold text-slate-800">{la.gradeLevel.replace('_', ' ')}</span> ·{' '}
                    {la.educationLevel.replace(/_/g, ' ')}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Lead Educator:</span>
                      <span className="font-semibold text-slate-900">{getTeacherName(la.teacherId)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Standard Framework:</span>
                      <span className="font-semibold text-emerald-800">KICD CBC Accredited</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">ID: {la.id.slice(0, 10)}</span>
                  <button
                    onClick={() => handleDeleteSubject(la.id, la.name)}
                    className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classes and Streams Overview Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#800000]">splitscreen</span>
            <span>Grace Seeds School · Class Cohorts & Stream Capacity ({classes.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Enrolled Streams & Class Teachers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const clsStreams = streamsMap[cls.id] || [];
            return (
              <div key={cls.id} className="bg-[#F8F5F5] rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {cls.gradeLevel.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Streams ({clsStreams.length > 0 ? `${clsStreams.length} Active` : 'Optional / None'})
                  </span>
                  {clsStreams.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-white border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-slate-700">Single Class Cohort</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Streams Optional</span>
                    </div>
                  ) : (
                    clsStreams.map((st) => (
                      <div
                        key={st.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">Stream {st.name}</span>
                          <div className="text-[11px] text-slate-500">
                            Teacher: {getTeacherName(st.classTeacherId)}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Cap: {st.capacity}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: CREATE SUBJECT */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#800000] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                <h3 className="font-bold text-sm">Create New Subject</h3>
              </div>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Subject / Learning Area Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Mathematics, Integrated Science, Computer Studies"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Subject Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MATH, SCIE"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono uppercase focus:outline-[#800000]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Target Grade Level
                  </label>
                  <select
                    value={subjectGradeLevel}
                    onChange={(e) => setSubjectGradeLevel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  >
                    <option value="PP1">Pre-Primary 1 (PP1)</option>
                    <option value="PP2">Pre-Primary 2 (PP2)</option>
                    <option value="GRADE_1">Grade 1</option>
                    <option value="GRADE_2">Grade 2</option>
                    <option value="GRADE_3">Grade 3</option>
                    <option value="GRADE_4">Grade 4</option>
                    <option value="GRADE_5">Grade 5</option>
                    <option value="GRADE_6">Grade 6</option>
                    <option value="GRADE_7">Grade 7</option>
                    <option value="GRADE_8">Grade 8</option>
                    <option value="GRADE_9">Grade 9</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Education Level (CBC Cycle)
                </label>
                <select
                  value={subjectEducationLevel}
                  onChange={(e) => setSubjectEducationLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="PRE_PRIMARY">Pre-Primary (PP1 - PP2)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (Grade 1 - 3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Grade 4 - 6)</option>
                  <option value="JUNIOR_SCHOOL">Junior Secondary (Grade 7 - 9)</option>
                  <option value="SENIOR_SCHOOL">Senior Secondary (Grade 10 - 12)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assign Lead Educator (From Database)
                </label>
                <select
                  value={assignedTeacherId}
                  onChange={(e) => setAssignedTeacherId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="">-- Select Teacher (Optional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.tscNumber || 'Educator'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="electiveCheck"
                  checked={isElective}
                  onChange={(e) => setIsElective(e.target.checked)}
                  className="w-4 h-4 rounded text-[#800000] focus:ring-[#800000]"
                />
                <label htmlFor="electiveCheck" className="font-semibold text-slate-800 cursor-pointer">
                  Elective Subject (Optional Selection)
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Subject into Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STREAM TO CLASS */}
      {isAddStreamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">splitscreen</span>
                <h3 className="font-bold text-sm">Add Stream to Class</h3>
              </div>
              <button
                onClick={() => setIsAddStreamOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStream} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Target Class Room <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={streamClassRoomId}
                  onChange={(e) => setStreamClassRoomId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.gradeLevel.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Stream Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streamName}
                    onChange={(e) => setStreamName(e.target.value)}
                    placeholder="e.g. East, West, Alpha"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Student Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={streamCapacity}
                    onChange={(e) => setStreamCapacity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assigned Class Teacher (From Database)
                </label>
                <select
                  value={streamTeacherId}
                  onChange={(e) => setStreamTeacherId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="">-- Select Class Teacher (Optional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.tscNumber || 'Educator'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Stream into Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE CLASS */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#800000] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">school</span>
                <h3 className="font-bold text-sm">Add New Academic Class</h3>
              </div>
              <button
                onClick={() => setIsAddClassOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Class Room Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Grade 7, Grade 8, Pre-Primary 1"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Grade Level
                </label>
                <select
                  value={classGradeLevel}
                  onChange={(e) => setClassGradeLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="PP1">Pre-Primary 1 (PP1)</option>
                  <option value="PP2">Pre-Primary 2 (PP2)</option>
                  <option value="GRADE_1">Grade 1</option>
                  <option value="GRADE_2">Grade 2</option>
                  <option value="GRADE_3">Grade 3</option>
                  <option value="GRADE_4">Grade 4</option>
                  <option value="GRADE_5">Grade 5</option>
                  <option value="GRADE_6">Grade 6</option>
                  <option value="GRADE_7">Grade 7</option>
                  <option value="GRADE_8">Grade 8</option>
                  <option value="GRADE_9">Grade 9</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Education Level (CBC Stage)
                </label>
                <select
                  value={classEducationLevel}
                  onChange={(e) => setClassEducationLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="PRE_PRIMARY">Pre-Primary (PP1 - PP2)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (Grade 1 - 3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Grade 4 - 6)</option>
                  <option value="JUNIOR_SCHOOL">Junior Secondary (Grade 7 - 9)</option>
                  <option value="SENIOR_SCHOOL">Senior Secondary (Grade 10 - 12)</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Class into Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
