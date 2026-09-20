import React, { useState, useEffect } from 'react';
import { ParentHelpRequest, StudentProgressPhoto, Student, UserRole, CBCRubric } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CBC_LEARNING_AREAS = [
  { id: 'la-math-g7', code: 'MATH', name: 'Mathematics' },
  { id: 'la-eng-g7', code: 'ENG', name: 'English Language' },
  { id: 'la-kisw-g7', code: 'KISW', name: 'Kiswahili Lugha' },
  { id: 'la-sci-g7', code: 'SCI', name: 'Integrated Science' },
  { id: 'la-soc-g7', code: 'SOC', name: 'Social Studies' },
  { id: 'la-cre-g7', code: 'CRE', name: 'Religious Education (CRE / IRE)' },
  { id: 'la-arts-g7', code: 'ARTS', name: 'Creative Arts & Sports' },
  { id: 'la-agri-g7', code: 'AGRI', name: 'Agriculture & Nutrition' },
  { id: 'la-pretech-g7', code: 'PTECH', name: 'Pre-Technical Studies' },
];

// Helper to normalize raw database student entities into the frontend Student shape
const normalizeStudent = (st: any): Student => {
  const name =
    st.name ||
    st.fullName ||
    [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ') ||
    [st.firstName, st.lastName].filter(Boolean).join(' ') ||
    'Learner';

  const admNo = st.admNo || st.admissionNumber || 'N/A';
  const grade = st.grade || (st.gradeLevel ? st.gradeLevel.replace(/_/g, ' ') : 'CBC');
  const stream = st.stream || st.streamName || (st.streamId ? `Stream ${st.streamId.slice(0, 6)}` : '');

  return {
    id: st.id,
    admNo,
    upi: st.upi || st.upiNumber || '--',
    nemis: st.nemis || st.upiNumber || '--',
    name,
    gender: st.gender === 'FEMALE' || st.gender === 'Girl' ? 'Girl' : 'Boy',
    grade,
    stream,
    guardianName:
      st.guardianName ||
      (st.guardian && (st.guardian.firstName || st.guardian.lastName)
        ? `${st.guardian.firstName || ''} ${st.guardian.lastName || ''}`.trim()
        : st.emergencyContactName || '--'),
    guardianPhone: st.guardianPhone || st.guardian?.phone || st.emergencyContactPhone || '--',
    feeBalance: st.feeBalance || st.fee?.balance || 0,
    totalFee: st.totalFee || st.fee?.totalBilled || 0,
    attendanceRate: st.attendanceRate ?? st.attendance?.attendanceRate ?? 100,
    cbcRating: st.cbcRating || 'ME',
    status: st.status === 'ACTIVE' || st.status === 'Active' ? 'Active' : (st.status || 'Active'),
    profilePhotoUrl: st.profilePhotoUrl,
    dateOfBirth: st.dateOfBirth,
    medicalConditions: st.medicalConditions,
    specialNeeds: st.specialNeeds,
  };
};

export const VisualCBCView: React.FC = () => {
  const { user } = useAuth();
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT;
  const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<'help_desk' | 'progress_gallery'>('help_desk');
  const [helpRequests, setHelpRequests] = useState<ParentHelpRequest[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<StudentProgressPhoto[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Parent Ask Question Modal States & Dropdowns
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [helpStudentId, setHelpStudentId] = useState<string>('');
  const [helpLearningArea, setHelpLearningArea] = useState<string>('la-math-g7');
  const [helpTitle, setHelpTitle] = useState('');
  const [helpDescription, setHelpDescription] = useState('');
  const [helpImageBase64, setHelpImageBase64] = useState<string | null>(null);
  const [helpImagePreview, setHelpImagePreview] = useState<string | null>(null);
  const [helpImageMime, setHelpImageMime] = useState<string>('image/jpeg');
  const [isSubmittingHelp, setIsSubmittingHelp] = useState(false);

  // Teacher Reply Modal
  const [replyingRequest, setReplyingRequest] = useState<ParentHelpRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Teacher Upload Progress Photo Modal States & Dropdowns
  const [isUploadProgressOpen, setIsUploadProgressOpen] = useState(false);
  const [progressStudentId, setProgressStudentId] = useState<string>('');
  const [progressLearningArea, setProgressLearningArea] = useState<string>('la-sci-g7');
  const [progressCompetency, setProgressCompetency] = useState('Critical Thinking & Problem Solving');
  const [progressRating, setProgressRating] = useState<CBCRubric>('EE');
  const [progressTitle, setProgressTitle] = useState('');
  const [progressDesc, setProgressDesc] = useState('');
  const [progressTags, setProgressTags] = useState('');
  const [progressImageBase64, setProgressImageBase64] = useState<string | null>(null);
  const [progressImagePreview, setProgressImagePreview] = useState<string | null>(null);
  const [progressImageMime, setProgressImageMime] = useState<string>('image/jpeg');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  // Filters for Main Views
  const [helpStudentFilter, setHelpStudentFilter] = useState<string>('ALL');
  const [helpStatusFilter, setHelpStatusFilter] = useState<string>('ALL');
  const [galleryStudentFilter, setGalleryStudentFilter] = useState<string>('ALL');
  const [galleryCompetencyFilter, setGalleryCompetencyFilter] = useState<string>('ALL');
  const [galleryRatingFilter, setGalleryRatingFilter] = useState<string>('ALL');

  // Image Zoom Modal
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  const availableLearningAreas = learningAreas && learningAreas.length > 0 ? learningAreas : DEFAULT_CBC_LEARNING_AREAS;

  const loadData = async () => {
    setLoading(true);
    try {
      const [scRes, laRes] = await Promise.all([
        apiService.getSchool().catch(() => null),
        apiService.getLearningAreas().catch(() => null),
      ]);
      if (scRes?.data) setSchoolInfo(scRes.data);

      if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
        setLearningAreas(laRes.data);
        setHelpLearningArea(laRes.data[0].id);
        setProgressLearningArea(laRes.data[0].id);
      } else {
        setLearningAreas(DEFAULT_CBC_LEARNING_AREAS);
        setHelpLearningArea(DEFAULT_CBC_LEARNING_AREAS[0].id);
        setProgressLearningArea(DEFAULT_CBC_LEARNING_AREAS[0].id);
      }

      // Load student list from database
      let rawStudentList: any[] = [];
      if (isGuardian) {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.data?.children && Array.isArray(portalRes.data.children) && portalRes.data.children.length > 0) {
          rawStudentList = portalRes.data.children;
        }
      }

      // If not guardian or guardian portal returned no children, load from database students endpoint
      if (rawStudentList.length === 0) {
        const stRes = await apiService.getStudents().catch(() => null);
        if (stRes?.data && Array.isArray(stRes.data)) {
          rawStudentList = stRes.data;
        }
      }

      const studentList: Student[] = rawStudentList.map(normalizeStudent);
      setStudents(studentList);
      if (studentList.length > 0) {
        setHelpStudentId((prev) => (prev && studentList.some((s) => s.id === prev) ? prev : studentList[0].id));
        setProgressStudentId((prev) => (prev && studentList.some((s) => s.id === prev) ? prev : studentList[0].id));
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

    if (file.size > 25 * 1024 * 1024) {
      alert('Image file exceeds the 25MB maximum limit.');
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

    const targetStudentId = helpStudentId || students[0]?.id || '';
    if (!targetStudentId) {
      alert('Please select a learner before submitting an inquiry.');
      setIsSubmittingHelp(false);
      return;
    }

    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    setIsSubmittingHelp(true);

    try {
      const la = availableLearningAreas.find((l) => l.id === helpLearningArea) || availableLearningAreas[0];
      const subjectName = la?.name || 'Integrated Homework';

      const res = await apiService.uploadHelpRequest({
        schoolId: activeSchoolId,
        studentId: targetStudentId,
        learningAreaId: la?.id || 'la-math-g7',
        subject: subjectName,
        title: helpTitle,
        description: helpDescription,
        photoBase64: helpImageBase64,
        imageDataOrUrl: helpImageBase64,
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
        response: replyMessage,
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

    const targetStudentId = progressStudentId || students[0]?.id || '';
    if (!targetStudentId) {
      alert('Please select a learner to attach the progress milestone photo.');
      setIsSubmittingProgress(false);
      return;
    }

    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';

    setIsSubmittingProgress(true);
    try {
      const tagList = progressTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const la = availableLearningAreas.find((l) => l.id === progressLearningArea) || availableLearningAreas[0];

      const res = await apiService.uploadProgressPhoto({
        schoolId: activeSchoolId,
        studentId: targetStudentId,
        learningAreaId: la?.id || 'la-sci-g7',
        title: progressTitle,
        description: progressDesc,
        competencyDomain: progressCompetency,
        competencyTag: progressCompetency,
        rating: progressRating,
        tags: tagList,
        photoBase64: progressImageBase64,
        imageDataOrUrl: progressImageBase64,
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

  // Filtered Lists for Display
  const filteredHelpRequests = helpRequests.filter((req) => {
    if (helpStudentFilter !== 'ALL' && req.studentId !== helpStudentFilter) return false;
    if (helpStatusFilter !== 'ALL' && req.status !== helpStatusFilter) return false;
    return true;
  });

  const filteredProgressPhotos = progressPhotos.filter((photo) => {
    if (galleryStudentFilter !== 'ALL' && photo.studentId !== galleryStudentFilter) return false;
    const comp = photo.competencyDomain || (photo as any).competencyTag;
    if (galleryCompetencyFilter !== 'ALL' && comp !== galleryCompetencyFilter) return false;
    if (galleryRatingFilter !== 'ALL' && photo.rating !== galleryRatingFilter) return false;
    return true;
  });

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
              onClick={() => {
                if (students.length > 0 && (!helpStudentId || !students.some((s) => s.id === helpStudentId))) {
                  setHelpStudentId(students[0].id);
                }
                setIsAskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-xl hover:shadow-md text-xs font-bold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              <span>Ask Teacher with Photo</span>
            </button>
          )}

          {isTeacher && (
            <button
              onClick={() => {
                if (students.length > 0 && (!progressStudentId || !students.some((s) => s.id === progressStudentId))) {
                  setProgressStudentId(students[0].id);
                }
                setIsUploadProgressOpen(true);
              }}
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
          {/* Dropdown Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span>Filter Desk:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-on-surface-variant">Learner:</label>
              <select
                value={helpStudentFilter}
                onChange={(e) => setHelpStudentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="ALL">All Learners ({students.length})</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-on-surface-variant">Status:</label>
              <select
                value={helpStatusFilter}
                onChange={(e) => setHelpStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="ALL">All Inquiries ({helpRequests.length})</option>
                <option value="OPEN">Pending Teacher Review (OPEN)</option>
                <option value="RESOLVED">Answered by Teacher (RESOLVED)</option>
              </select>
            </div>

            {(helpStudentFilter !== 'ALL' || helpStatusFilter !== 'ALL') && (
              <button
                onClick={() => { setHelpStudentFilter('ALL'); setHelpStatusFilter('ALL'); }}
                className="text-[11px] text-primary font-bold hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-primary">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs font-bold">Loading help inquiries...</span>
            </div>
          ) : filteredHelpRequests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">question_answer</span>
              <h3 className="font-bold text-base text-on-surface">No Help Inquiries Found</h3>
              <p className="text-xs text-on-surface-variant">
                {isGuardian
                  ? 'Stuck on a homework question? Take a photo of the problem and submit it to get teacher guidance.'
                  : 'No inquiries matching your filter criteria at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHelpRequests.map((req) => {
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
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isResolved ? 'Resolved' : 'Teacher Review Pending'}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2 font-data-mono">
                          <span className="font-semibold text-on-surface">
                            {student ? `${student.name} (${student.admNo})` : ((req as any).studentName || 'Learner')}
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-primary">{req.subject || (req as any).learningAreaId || 'CBC Practical'}</span>
                          <span>·</span>
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
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
                          onClick={() => setViewingImage({ url: req.photoUrl || (req as any).imageUrl, title: req.title })}
                          className="w-28 h-28 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/40 shrink-0 cursor-pointer group relative flex items-center justify-center"
                        >
                          <img
                            src={req.thumbnailUrl || req.photoUrl || (req as any).imageUrl}
                            alt={req.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = '0.4';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">zoom_in</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 text-xs text-on-surface leading-relaxed">
                          <p className="font-medium">{req.description}</p>
                          <div className="text-[10px] text-outline font-data-mono mt-2">
                            MIME: {req.photoMetadata?.mimeType || (req as any).imageMetadata?.format || 'image/jpeg'} · {req.photoMetadata?.width || 800}x{req.photoMetadata?.height || 600}
                          </div>
                        </div>
                      </div>

                      {/* Teacher Response Box */}
                      {req.teacherResponse ? (
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-bold">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-emerald-600">school</span>
                              <span>
                                Teacher Guidance {typeof req.teacherResponse === 'object' && req.teacherResponse.teacherName ? `(${req.teacherResponse.teacherName})` : ''}
                              </span>
                            </span>
                            {req.respondedAt && (
                              <span className="text-[10px] font-data-mono text-emerald-700">
                                {new Date(req.respondedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-emerald-950 font-medium leading-relaxed">
                            {typeof req.teacherResponse === 'string'
                              ? req.teacherResponse
                              : (req.teacherResponse as any)?.responseMessage || 'Teacher guidance noted.'}
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
          {/* Dropdown Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span>Filter Gallery:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-on-surface-variant">Learner:</label>
              <select
                value={galleryStudentFilter}
                onChange={(e) => setGalleryStudentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="ALL">All Learners ({students.length})</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-on-surface-variant">Competency:</label>
              <select
                value={galleryCompetencyFilter}
                onChange={(e) => setGalleryCompetencyFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="ALL">All Competencies</option>
                <option value="Communication & Collaboration">Communication & Collaboration</option>
                <option value="Critical Thinking & Problem Solving">Critical Thinking & Problem Solving</option>
                <option value="Creativity & Imagination">Creativity & Imagination</option>
                <option value="Citizenship">Citizenship</option>
                <option value="Digital Literacy">Digital Literacy</option>
                <option value="Learning to Learn">Learning to Learn</option>
                <option value="Self-Efficacy">Self-Efficacy</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-on-surface-variant">CBC Rating:</label>
              <select
                value={galleryRatingFilter}
                onChange={(e) => setGalleryRatingFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
              >
                <option value="ALL">All Ratings</option>
                <option value="EE">EE - Exceeding Expectations</option>
                <option value="ME">ME - Meeting Expectations</option>
                <option value="AE">AE - Approaching Expectations</option>
                <option value="BE">BE - Below Expectations</option>
              </select>
            </div>

            {(galleryStudentFilter !== 'ALL' || galleryCompetencyFilter !== 'ALL' || galleryRatingFilter !== 'ALL') && (
              <button
                onClick={() => { setGalleryStudentFilter('ALL'); setGalleryCompetencyFilter('ALL'); setGalleryRatingFilter('ALL'); }}
                className="text-[11px] text-primary font-bold hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-primary">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs font-bold">Loading CBC photo journal...</span>
            </div>
          ) : filteredProgressPhotos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">photo_camera</span>
              <h3 className="font-bold text-base text-on-surface">No Progress Photos Found</h3>
              <p className="text-xs text-on-surface-variant">
                Teachers capture photo evidence of students demonstrating core CBC competencies in action.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProgressPhotos.map((photo) => {
                const student = students.find((s) => s.id === photo.studentId);

                return (
                  <div
                    key={photo.id}
                    className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                  >
                    {/* Photo Container */}
                    <div
                      onClick={() => setViewingImage({ url: photo.photoUrl || (photo as any).imageUrl, title: photo.title })}
                      className="h-48 overflow-hidden bg-surface-container relative cursor-pointer flex items-center justify-center"
                    >
                      <img
                        src={photo.thumbnailUrl || photo.photoUrl || (photo as any).imageUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.4';
                        }}
                      />
                      {photo.rating && (
                        <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-[#7a1228] text-white text-[11px] font-bold shadow-md">
                          {photo.rating} · {photo.rating === 'EE' ? 'Exceeding' : 'Meeting'}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                        {photo.competencyDomain || (photo as any).competencyTag || 'Core CBC Competency'}
                      </span>
                    </div>

                    {/* Metadata & Description */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                          <span className="font-bold text-primary font-data-mono">
                            {student ? `${student.name} (${student.admNo})` : ((photo as any).studentName || 'Learner')}
                          </span>
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
              <div>
                <label className="block font-bold text-on-surface mb-1">Select Learner:</label>
                <select
                  value={helpStudentId}
                  onChange={(e) => setHelpStudentId(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
                >
                  {students.length === 0 ? (
                    <option value="">No enrolled learners found</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admNo} · {s.grade})
                      </option>
                    ))
                  )}
                </select>
                {(() => {
                  const sel = students.find((s) => s.id === helpStudentId);
                  if (!sel) return null;
                  return (
                    <div className="flex items-center gap-2.5 p-2 mt-1.5 rounded-xl bg-surface-container border border-outline-variant/30">
                      {sel.profilePhotoUrl ? (
                        <img
                          src={sel.profilePhotoUrl}
                          alt={sel.name}
                          className="w-7 h-7 rounded-full object-cover border border-primary/30"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                          {sel.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-on-surface">{sel.name}</span>
                        <span className="text-on-surface-variant ml-1.5 font-data-mono text-[10px]">
                          Adm: {sel.admNo} · {sel.grade} {sel.stream}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Learning Area / Subject:</label>
                <select
                  value={helpLearningArea}
                  onChange={(e) => setHelpLearningArea(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
                >
                  {availableLearningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name}
                    </option>
                  ))}
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
                  placeholder="e.g. Learner worked through the first step but is confused about finding the common denominator."
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
                  value={progressStudentId}
                  onChange={(e) => setProgressStudentId(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
                >
                  {students.length === 0 ? (
                    <option value="">No enrolled learners found</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.admNo} · {s.grade})</option>
                    ))
                  )}
                </select>
                {(() => {
                  const sel = students.find((s) => s.id === progressStudentId);
                  if (!sel) return null;
                  return (
                    <div className="flex items-center gap-2.5 p-2 mt-1.5 rounded-xl bg-surface-container border border-outline-variant/30">
                      {sel.profilePhotoUrl ? (
                        <img
                          src={sel.profilePhotoUrl}
                          alt={sel.name}
                          className="w-7 h-7 rounded-full object-cover border border-primary/30"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                          {sel.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-on-surface">{sel.name}</span>
                        <span className="text-on-surface-variant ml-1.5 font-data-mono text-[10px]">
                          Adm: {sel.admNo} · {sel.grade} {sel.stream}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Learning Area / Subject:</label>
                <select
                  value={progressLearningArea}
                  onChange={(e) => setProgressLearningArea(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
                >
                  {availableLearningAreas.map((la) => (
                    <option key={la.id} value={la.id}>{la.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Competency Domain:</label>
                  <select
                    value={progressCompetency}
                    onChange={(e) => setProgressCompetency(e.target.value)}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
                  >
                    <option value="Communication & Collaboration">Communication & Collaboration</option>
                    <option value="Critical Thinking & Problem Solving">Critical Thinking & Problem Solving</option>
                    <option value="Creativity & Imagination">Creativity & Imagination</option>
                    <option value="Citizenship">Citizenship</option>
                    <option value="Digital Literacy">Digital Literacy</option>
                    <option value="Learning to Learn">Learning to Learn</option>
                    <option value="Self-Efficacy">Self-Efficacy</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">CBC Rating:</label>
                  <select
                    value={progressRating}
                    onChange={(e) => setProgressRating(e.target.value as CBCRubric)}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
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
