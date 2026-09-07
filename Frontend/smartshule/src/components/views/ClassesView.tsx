import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { ClassRoom, StreamItem } from '../../types';

export const ClassesView: React.FC = () => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Form states for new class
  const [newClassName, setNewClassName] = useState('Grade 8');
  const [newGradeLevel, setNewGradeLevel] = useState('GRADE_8');
  const [newEduLevel, setNewEduLevel] = useState('JUNIOR_SCHOOL');

  // Form states for new stream
  const [newStreamName, setNewStreamName] = useState('West');
  const [newCapacity, setNewCapacity] = useState('40');

  const loadClassesAndStreams = async () => {
    setLoading(true);
    try {
      const res = await apiService.getClasses();
      if (res.success && res.data?.length) {
        setClasses(res.data);
        // Fetch streams for all classes
        const streamEntries: Record<string, StreamItem[]> = {};
        for (const c of res.data) {
          const streamRes = await apiService.getStreamsByClass(c.id);
          if (streamRes.success) {
            streamEntries[c.id] = streamRes.data;
          }
        }
        setStreamsMap(streamEntries);
      }
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassesAndStreams();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createClass({
        name: newClassName,
        gradeLevel: newGradeLevel,
        educationLevel: newEduLevel,
        schoolId: 'school-001',
      });
      if (res.success) {
        setIsAddClassOpen(false);
        loadClassesAndStreams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create class');
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createStream({
        classRoomId: selectedClassId,
        name: newStreamName,
        capacity: Number(newCapacity),
      });
      if (res.success) {
        setIsAddStreamOpen(false);
        loadClassesAndStreams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create stream');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary font-semibold">Classes & Streams</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Classes, Streams & Learner Distribution
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            PP1 through Grade 9 CBC streams, education cycles, and classroom allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddClassOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Backend Live Classes Grid */}
      {classes.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              Active Registered CBC Grades ({classes.length})
            </h3>
            <span className="text-xs text-secondary font-semibold">Live Backend Synced</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const streams = streamsMap[c.id] || [];
              return (
                <div
                  key={c.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider bg-secondary-container/40 px-2 py-0.5 rounded">
                        {c.educationLevel.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                        {c.gradeLevel}
                      </span>
                    </div>

                    <h3 className="font-headline-md text-lg font-bold text-on-surface mt-3">{c.name}</h3>
                    <p className="text-xs text-on-surface-variant">
                      {streams.length} Stream{streams.length !== 1 ? 's' : ''} Allocated
                    </p>

                    <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                      <div className="font-semibold text-primary mb-1">Streams:</div>
                      {streams.length > 0 ? (
                        <div className="space-y-1">
                          {streams.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-2 rounded bg-surface-container-low"
                            >
                              <span className="font-bold text-on-surface">Stream {s.name}</span>
                              <span className="font-data-mono text-outline">Cap: {s.capacity} learners</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-outline italic text-[11px]">No streams registered yet</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-container flex justify-between items-center">
                    <button
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setIsAddStreamOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Add Stream</span>
                    </button>
                    <span className="text-[10px] text-outline font-data-mono">{c.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-outline">meeting_room</span>
            <p className="font-bold text-base text-on-surface">No classes configured</p>
            <p className="text-xs text-outline">Click "Add Class" above to create CBC grades and streams.</p>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add New CBC Class / Grade</h3>
              <button onClick={() => setIsAddClassOpen(false)} className="text-blue-200 hover:text-white cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Class Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Grade 8"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Grade Level</label>
                  <select
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  >
                    <option value="PP1">PP1</option>
                    <option value="PP2">PP2</option>
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
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Education Cycle</label>
                  <select
                    value={newEduLevel}
                    onChange={(e) => setNewEduLevel(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  >
                    <option value="EARLY_YEARS">Early Years</option>
                    <option value="PRIMARY_SCHOOL">Primary School</option>
                    <option value="JUNIOR_SCHOOL">Junior School</option>
                    <option value="SENIOR_SCHOOL">Senior School</option>
                  </select>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stream Modal */}
      {isAddStreamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add Stream to Class</h3>
              <button onClick={() => setIsAddStreamOpen(false)} className="text-blue-200 hover:text-white cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateStream} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Stream Name</label>
                <input
                  type="text"
                  required
                  value={newStreamName}
                  onChange={(e) => setNewStreamName(e.target.value)}
                  placeholder="e.g. West, North, Blue"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Capacity (Learners)</label>
                <input
                  type="number"
                  required
                  min="5"
                  max="70"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container"
                >
                  Create Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
