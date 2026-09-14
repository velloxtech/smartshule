import React, { useState, useEffect } from 'react';
import { ParentHelpRequest, StudentProgressPhoto, Student, UserRole, CBCRubric } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const VisualCBCView: React.FC = () => {
  const { user } = useAuth();
  const isGuardian = user?.role === UserRole.GUARDIAN;
  const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<'help_desk' | 'progress_gallery'>('help_desk');
  const [helpRequests, setHelpRequests] = useState<ParentHelpRequest[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<StudentProgressPhoto[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected student filter
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Parent Ask Question Modal
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [helpTitle, setHelpTitle] = useState('');
  const [helpDescription, setHelpDescription] = useState('');
  const [helpLearningArea, setHelpLearningArea] = useState('la-math-7');
  const [helpImageBase64, setHelpImageBase64] = useState<string | null>(null);
  const [helpImagePreview, setHelpImagePreview] = useState<string | null>(null);
  const [helpImageMime, setHelpImageMime] = useState<string>('image/jpeg');
  const [isSubmittingHelp, setIsSubmittingHelp] = useState(false);

  // Teacher Reply Modal
  const [replyingRequest, setReplyingRequest] = useState<ParentHelpRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Teacher Upload Progress Photo Modal
  const [isUploadProgressOpen, setIsUploadProgressOpen] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressDesc, setProgressDesc] = useState('');
  const [progressCompetency, setProgressCompetency] = useState('Critical Thinking & Problem Solving');
  const [progressRating, setProgressRating] = useState<CBCRubric>('EE');
  const [progressTags, setProgressTags] = useState('SciencePractical, Experiment, CBCGrade7');
  const [progressImageBase64, setProgressImageBase64] = useState<string | null>(null);
  const [progressImagePreview, setProgressImagePreview] = useState<string | null>(null);
  const [progressImageMime, setProgressImageMime] = useState<string>('image/jpeg');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  // Image Zoom Modal
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load student list
      if (isGuardian) {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.data?.children && Array.isArray(portalRes.data.children) && portalRes.data.children.length > 0) {
          setStudents(portalRes.data.children);
          setSelectedStudentId(portalRes.data.children[0].id);
        }
      } else {
        const stRes = await apiService.getStudents().catch(() => null);
        if (stRes?.data && Array.isArray(stRes.data)) {
          setStudents(stRes.data);
          if (stRes.data.length > 0) setSelectedStudentId(stRes.data[0].id);
        }
      }

      const [hrRes, ppRes] = await Promise.all([
        apiService.getHelpRequests().catch(() => null),
        apiService.getProgressPhotos().catch(() => null),
      ]);

      if (hrRes?.data && Array.isArray(hrRes.data)) {
        setHelpRequests(hrRes.data);
      }
      if (ppRes?.data && Array.isArray(ppRes.data)) {
        setProgressPhotos(ppRes.data);
      }
    } catch (err) {
      console.error('Failed to load visual media data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Image File Selection (Convert to Base64)
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (val: string | null) => void,
    setPreview: (val: string | null) => void,
    setMime: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file exceeds the 10MB maximum limit.');
      return;
    }

    setMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Parent Help Request
  const handleSubmitHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpImageBase64) {
      alert('Please attach a photo of the homework question or page.');
      return;
    }

    setIsSubmittingHelp(true);
    try {
      const res = await apiService.uploadHelpRequest({
        schoolId: 'school-001',
        studentId: selectedStudentId || 'student-001',
        learningAreaId: helpLearningArea,
        title: helpTitle,
        description: helpDescription,
        photoBase64: helpImageBase64,
        mimeType: helpImageMime,
      });

      if (res.success && res.data) {
        setHelpRequests([res.data, ...helpRequests]);
        setIsAskModalOpen(false);
        setHelpTitle('');
        setHelpDescription('');
        setHelpImageBase64(null);
        setHelpImagePreview(null);
      }
    } catch (err: any) {
      alert('Failed to upload help request: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingHelp(false);
    }
  };

  // Submit Teacher Reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingRequest) return;

    setIsSubmittingReply(true);
    try {
      const res = await apiService.respondHelpRequest(replyingRequest.id, {
        responseMessage: replyMessage,
      });

      if (res.success && res.data) {
        setHelpRequests(helpRequests.map((r) => (r.id === replyingRequest.id ? res.data : r)));
        setReplyingRequest(null);
        setReplyMessage('');
      }
    } catch (err: any) {
      alert('Failed to submit response: ' + err.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Submit Teacher Progress Photo
  const handleSubmitProgressPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressImageBase64) {
      alert('Please capture or select an evidence photo.');
      return;
    }

    setIsSubmittingProgress(true);
    try {
      const tagList = progressTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await apiService.uploadProgressPhoto({
        schoolId: 'school-001',
        studentId: selectedStudentId || 'student-001',
        title: progressTitle,
        description: progressDesc,
        competencyDomain: progressCompetency,
        rating: progressRating,
        tags: tagList,
        photoBase64: progressImageBase64,
        mimeType: progressImageMime,
      });

      if (res.success && res.data) {
        setProgressPhotos([res.data, ...progressPhotos]);
        setIsUploadProgressOpen(false);
        setProgressTitle('');
        setProgressDesc('');
        setProgressImageBase64(null);
        setProgressImagePreview(null);
      }
    } catch (err: any) {
      alert('Failed to upload progress milestone: ' + err.message);
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Digital Classroom</span>
            <span>/</span>
            <span className="text-primary font-semibold">Visual CBC & Parent Help Desk</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Visual Learning Evidence & Photo Q&A Desk
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Parents snap photos to ask teachers homework questions, and teachers document hands-on CBC practical milestones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isGuardian && (
            <button
              onClick={() => setIsAskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-xl hover:shadow-md text-xs font-bold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              <span>Ask Teacher with Photo</span>
            </button>
          )}

          {isTeacher && (
            <button
              onClick={() => setIsUploadProgressOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-secondary/90 text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>+ Record Student Progress Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveTab('help_desk')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'help_desk'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">help_center</span>
          <span>Parent Photo Q&A Desk ({helpRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress_gallery')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'progress_gallery'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">photo_library</span>
          <span>CBC Progress Gallery ({progressPhotos.length})</span>
        </button>
      </div>

      {/* TAB 1: PARENT HELP DESK */}
      {activeTab === 'help_desk' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-primary">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs font-bold">Loading help inquiries...</span>
            </div>
          ) : helpRequests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">question_answer</span>
              <h3 className="font-bold text-base text-on-surface">No Help Inquiries Yet</h3>
              <p className="text-xs text-on-surface-variant">
                {isGuardian
                  ? 'Stuck on a homework question? Take a photo of the problem and submit it to get teacher guidance.'
                  : 'No open inquiries from parents at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {helpRequests.map((req) => {
                const student = students.find((s) => s.id === req.studentId);
                const isResolved = req.status === 'RESOLVED';

                return (
                  <div
                    key={req.id}
                    className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface">{req.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'IN_REVIEW'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          Learner: <span className="font-semibold text-primary">{student?.name || 'Enrolled Student'}</span> · {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {isTeacher && !isResolved && (
                        <button
                          onClick={() => setReplyingRequest(req)}
                          className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">reply</span>
                          <span>Reply</span>
                        </button>
                      )}
                    </div>

                    {/* Content & Photo */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="flex gap-4">
                        {/* Attached Question Photo */}
                        <div
                          onClick={() => setViewingImage({ url: req.photoUrl, title: req.title })}
                          className="w-28 h-28 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/40 shrink-0 cursor-pointer group relative"
                        >
                          <img
                            src={req.thumbnailUrl || req.photoUrl}
                            alt={req.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">zoom_in</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 text-xs text-on-surface leading-relaxed">
                          <p className="font-medium">{req.description}</p>
                          <div className="text-[10px] text-outline font-data-mono mt-2">
                            MIME: {req.photoMetadata?.mimeType || 'image/jpeg'} · {req.photoMetadata?.width}x{req.photoMetadata?.height}
                          </div>
                        </div>
                      </div>

                      {/* Teacher Response Box */}
                      {req.teacherResponse ? (
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-bold">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-emerald-600">school</span>
                              <span>Teacher Response ({req.teacherResponse.teacherName})</span>
                            </span>
                            <span className="text-[10px] font-data-mono text-emerald-700">
                              {new Date(req.teacherResponse.respondedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-emerald-950 font-medium leading-relaxed">
                            {req.teacherResponse.responseMessage}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant italic">
                          Awaiting teacher review and explanation.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROGRESS GALLERY */}
      {activeTab === 'progress_gallery' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-primary">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs font-bold">Loading CBC photo journal...</span>
            </div>
          ) : progressPhotos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">photo_camera</span>
              <h3 className="font-bold text-base text-on-surface">No Progress Photos Logged</h3>
              <p className="text-xs text-on-surface-variant">
                Teachers capture photo evidence of students demonstrating core CBC competencies in action.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {progressPhotos.map((photo) => {
                const student = students.find((s) => s.id === photo.studentId);

                return (
                  <div
                    key={photo.id}
                    className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                  >
                    {/* Photo Container */}
                    <div
                      onClick={() => setViewingImage({ url: photo.photoUrl, title: photo.title })}
                      className="h-48 overflow-hidden bg-surface-container relative cursor-pointer"
                    >
                      <img
                        src={photo.photoUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {photo.rating && (
                        <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-[#7a1228] text-white text-[11px] font-bold shadow-md">
                          {photo.rating} · {photo.rating === 'EE' ? 'Exceeding' : 'Meeting'}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                        {photo.competencyDomain || 'Core CBC Competency'}
                      </span>
                    </div>

                    {/* Metadata & Description */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                          <span className="font-bold text-primary font-data-mono">{student?.name || 'Learner'}</span>
                          <span className="text-[10px]">{new Date(photo.recordedDate || photo.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-sm text-on-surface leading-snug">{photo.title}</h4>
                        <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                          {photo.description}
                        </p>
                      </div>

                      {/* Tags */}
                      {photo.tags && photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {photo.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[10px] font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Ask Question with Photo */}
      {isAskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-xl border border-outline-variant/30 p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">add_a_photo</span>
                <h3 className="font-bold text-sm text-on-surface">Ask Teacher a Question with Photo</h3>
              </div>
              <button onClick={() => setIsAskModalOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitHelpRequest} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              {students.length > 1 && (
                <div>
                  <label className="block font-bold text-on-surface mb-1">Select Learner:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-on-surface mb-1">Learning Area / Subject:</label>
                <select
                  value={helpLearningArea}
                  onChange={(e) => setHelpLearningArea(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold"
                >
                  <option value="la-math-7">Mathematics</option>
                  <option value="la-science-7">Integrated Science</option>
                  <option value="la-english-7">English Language</option>
                  <option value="la-kiswahili-7">Kiswahili</option>
                  <option value="la-creative-arts-7">Creative Arts & Sports</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Title / Question Topic:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Difficulty solving Question 4 on Fractions"
                  value={helpTitle}
                  onChange={(e) => setHelpTitle(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Photo Attachment (Snap or Upload):</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => handleFileSelect(e, setHelpImageBase64, setHelpImagePreview, setHelpImageMime)}
                  className="w-full text-xs text-on-surface file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                {helpImagePreview && (
                  <div className="mt-2 w-full h-36 rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container">
                    <img src={helpImagePreview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Explain Where the Child is Stuck:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Kevin worked through the first step but is confused about finding the common denominator."
                  value={helpDescription}
                  onChange={(e) => setHelpDescription(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAskModalOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container rounded-xl font-bold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHelp}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{isSubmittingHelp ? 'Uploading Photo...' : 'Submit Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Teacher Reply */}
      {replyingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">reply</span>
                <h3 className="font-bold text-sm text-on-surface">Respond to Parent Inquiry</h3>
              </div>
              <button onClick={() => setReplyingRequest(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
              <div className="font-bold text-primary">{replyingRequest.title}</div>
              <p className="text-on-surface-variant">{replyingRequest.description}</p>
            </div>

            <form onSubmit={handleSubmitReply} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Teacher Guidance / Explanation:</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide step-by-step guidance or hints for the learner to follow..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingRequest(null)}
                  className="flex-1 py-2.5 bg-surface-container rounded-xl font-bold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{isSubmittingReply ? 'Sending...' : 'Send Guidance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Teacher Record Progress Photo */}
      {isUploadProgressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-xl border border-outline-variant/30 p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-secondary">photo_camera</span>
                <h3 className="font-bold text-sm text-on-surface">Log CBC Visual Milestone</h3>
              </div>
              <button onClick={() => setIsUploadProgressOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitProgressPhoto} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Select Learner:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Competency Domain:</label>
                  <select
                    value={progressCompetency}
                    onChange={(e) => setProgressCompetency(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    <option value="Critical Thinking & Problem Solving">Critical Thinking</option>
                    <option value="Communication & Collaboration">Communication</option>
                    <option value="Creativity & Imagination">Creativity</option>
                    <option value="Digital Literacy">Digital Literacy</option>
                    <option value="Self-Efficacy">Self-Efficacy</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">CBC Rating:</label>
                  <select
                    value={progressRating}
                    onChange={(e) => setProgressRating(e.target.value as CBCRubric)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold"
                  >
                    <option value="EE">EE - Exceeding Expectations</option>
                    <option value="ME">ME - Meeting Expectations</option>
                    <option value="AE">AE - Approaching Expectations</option>
                    <option value="BE">BE - Below Expectations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Milestone Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Experiment: Simple Electric Circuit"
                  value={progressTitle}
                  onChange={(e) => setProgressTitle(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Evidence Photo:</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => handleFileSelect(e, setProgressImageBase64, setProgressImagePreview, setProgressImageMime)}
                  className="w-full text-xs text-on-surface file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-secondary file:text-white hover:file:bg-secondary/90 cursor-pointer"
                />
                {progressImagePreview && (
                  <div className="mt-2 w-full h-36 rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container">
                    <img src={progressImagePreview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Observation & Rubric Notes:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the skills and core values demonstrated by the learner..."
                  value={progressDesc}
                  onChange={(e) => setProgressDesc(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Tags (Comma-separated):</label>
                <input
                  type="text"
                  value={progressTags}
                  onChange={(e) => setProgressTags(e.target.value)}
                  placeholder="SciencePractical, Circuit, HandsOn"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadProgressOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container rounded-xl font-bold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProgress}
                  className="flex-1 py-2.5 bg-secondary text-white rounded-xl font-bold shadow-md hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>{isSubmittingProgress ? 'Uploading...' : 'Save Milestone'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full Size Photo Viewer */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in cursor-zoom-out"
        >
          <div className="max-w-2xl w-full bg-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 bg-black text-white flex items-center justify-between text-xs font-bold">
              <span>{viewingImage.title}</span>
              <button onClick={() => setViewingImage(null)} className="cursor-pointer text-white/80 hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img src={viewingImage.url} alt={viewingImage.title} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
