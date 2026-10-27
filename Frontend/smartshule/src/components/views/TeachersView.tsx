import React, { useState, useEffect, useCallback } from 'react';
import { Teacher, UserRole, ClassRoom, StreamItem, TeacherCorrectionRequest } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TeachersViewProps {
  teachers: Teacher[];
  onToggleClockIn: (teacherId: string) => void;
  onOpenOnboardTeacher?: () => void;
  onDeleteTeacher?: (teacherId: string) => void;
  onAssignTeacher?: (teacherId: string, assignedClass: string) => void;
  onNavigateTab?: (tabId: string) => void;
  onTeacherUpdated?: (updatedTeacher: Teacher) => void;
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

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  onToggleClockIn,
  onOpenOnboardTeacher,
  onDeleteTeacher,
  onAssignTeacher,
  onNavigateTab,
  onTeacherUpdated,
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

  const [activeTab, setActiveTab] = useState<'roster' | 'corrections'>('roster');
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [, setLoadingAcademic] = useState(false);

  // Correction Requests State
  const [correctionRequests, setCorrectionRequests] = useState<TeacherCorrectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<TeacherCorrectionRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Profile Drawer / Modal State
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] = useState<Teacher | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'details' | 'audit' | 'edit'>('details');
  const [teacherProfileData, setTeacherProfileData] = useState<any | null>(null);
  const [teacherAuditLogs, setTeacherAuditLogs] = useState<any[]>([]);
  const [loadingProfileData, setLoadingProfileData] = useState(false);
  const [savingAdminEdit, setSavingAdminEdit] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState<any>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Assignment Modal States
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStreamMode, setSelectedStreamMode] = useState<string>('');
  const [customStreamName, setCustomStreamName] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('CLASS_TEACHER');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const loadCorrectionRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await apiService.listTeacherCorrectionRequests();
      if (res?.success && Array.isArray(res.data)) {
        setCorrectionRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load correction requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadClassesAndStreams();
    loadCorrectionRequests();
  }, [loadCorrectionRequests]);

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

  const resolveAssignedClassName = (assignedClass: string | undefined): string => {
    if (!assignedClass || assignedClass === 'Unassigned') return 'Unassigned';
    const parts = assignedClass.split(',').map((p) => p.trim());
    const resolvedParts = parts.map((part) => {
      for (const [classId, sList] of Object.entries(streamsMap)) {
        const foundStream = (sList as any[])?.find((s) => s.id === part);
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
    if (t.assignedClass && t.assignedClass !== 'Unassigned') {
      const match = allClassOptions.find((c) =>
        t.assignedClass.toLowerCase().includes(c.name.toLowerCase())
      );
      matchedClassId = match ? match.id : allClassOptions[0].id;
    } else {
      matchedClassId = 'standard-Grade 1';
    }

    setSelectedClassId(matchedClassId);
    const streamsForClass = streamsMap[matchedClassId] || [];
    if (streamsForClass.length > 0) {
      setSelectedStreamMode(streamsForClass[0].id);
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

      let targetStreamId = '';
      let targetStreamName = '';

      if (selectedStreamMode === 'main-default') {
        const existingMain = (streamsMap[activeClassId] || []).find(
          (s) => s.name.toLowerCase() === 'main' || s.name.toLowerCase() === 'main stream'
        );

        if (existingMain) {
          targetStreamId = existingMain.id;
          targetStreamName = existingMain.name;
        } else {
          const createStreamRes = await apiService.createStream({
            classRoomId: activeClassId,
            name: 'Main Stream',
            capacity: 40,
          });

          if (!createStreamRes?.data?.id) {
            throw new Error('Failed to create default Main Stream');
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
          throw new Error('Please enter a stream name (e.g., East, Blue)');
        }

        const createStreamRes = await apiService.createStream({
          classRoomId: activeClassId,
          name: customStreamName.trim(),
          capacity: 40,
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
        const found = (streamsMap[activeClassId] || []).find((s) => s.id === targetStreamId);
        targetStreamName = found ? found.name : 'Stream';
      }

      await apiService.assignStreamToTeacher(selectedTeacher.id, targetStreamId);

      const assignedLabel = `${activeClassName} - ${targetStreamName}`;
      if (onAssignTeacher) {
        onAssignTeacher(selectedTeacher.id, assignedLabel);
      }

      setAssignSuccess(`Successfully assigned ${selectedTeacher.name} to ${assignedLabel}!`);
      setTimeout(() => {
        setIsAssignOpen(false);
        setAssignSuccess(null);
      }, 1200);
    } catch (err: any) {
      setAssignError(err?.message || 'Assignment failed. Please check inputs.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`Are you sure you want to delete teacher ${teacher.name} (${teacher.employeeNumber || teacher.tscNumber})? This removes their account.`)) {
      return;
    }
    setDeletingId(teacher.id);
    try {
      await apiService.deleteTeacher(teacher.id);
      if (onDeleteTeacher) onDeleteTeacher(teacher.id);
      setFeedback({ type: 'success', message: `Teacher ${teacher.name} removed successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete teacher.' });
    } finally {
      setDeletingId(null);
    }
  };

  // View Teacher Profile Modal Handler
  const handleViewFullProfile = async (teacher: Teacher, initialTab: 'details' | 'audit' | 'edit' = 'details') => {
    setSelectedTeacherForProfile(teacher);
    setProfileModalTab(initialTab);
    setLoadingProfileData(true);
    setTeacherProfileData(null);
    setTeacherAuditLogs([]);
    setModalError(null);
    setModalSuccess(null);

    try {
      const [tRes, auditRes] = await Promise.all([
        apiService.getTeacherById(teacher.id).catch(() => null),
        apiService.getTeacherAuditHistory(teacher.id).catch(() => ({ success: true, data: [] })),
      ]);

      if (tRes?.data) {
        setTeacherProfileData(tRes.data);
        const t = tRes.data;
        const specs = Array.isArray(t.specialization) ? t.specialization.join(', ') : (t.specialization || '');
        setAdminEditForm({
          firstName: t.user?.firstName || '',
          lastName: t.user?.lastName || '',
          email: t.user?.email || '',
          phone: t.user?.phone || '',
          role: t.user?.role || 'TEACHER',
          tscNumber: t.tscNumber || '',
          employeeNumber: t.employeeNumber || '',
          qualification: t.qualification || '',
          specialization: specs,
          dateOfBirth: t.dateOfBirth || '',
          gender: t.gender || '',
          nationalId: t.nationalId || '',
          residentialAddress: t.residentialAddress || '',
          department: t.department || '',
          employmentDate: t.employmentDate || '',
          employmentType: t.employmentType || 'FULL_TIME',
          employmentStatus: t.employmentStatus || 'ACTIVE',
          emergencyContactName: t.emergencyContact?.name || '',
          emergencyContactPhone: t.emergencyContact?.phone || '',
          emergencyContactRelationship: t.emergencyContact?.relationship || '',
        });
      }
      if (auditRes?.data) {
        setTeacherAuditLogs(auditRes.data);
      }
    } catch (err) {
      console.error('Error fetching teacher full profile:', err);
    } finally {
      setLoadingProfileData(false);
    }
  };

  const handleOpenDirectEdit = (teacher: Teacher) => {
    handleViewFullProfile(teacher, 'edit');
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForProfile) return;

    setSavingAdminEdit(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const payload: any = {
        firstName: adminEditForm.firstName?.trim(),
        lastName: adminEditForm.lastName?.trim(),
        email: adminEditForm.email?.trim() ? adminEditForm.email.trim().toLowerCase() : undefined,
        phone: adminEditForm.phone?.trim() || undefined,
        role: adminEditForm.role,
        tscNumber: adminEditForm.tscNumber?.trim() || undefined,
        employeeNumber: adminEditForm.employeeNumber?.trim() || undefined,
        qualification: adminEditForm.qualification?.trim() || undefined,
        specialization: adminEditForm.specialization
          ? adminEditForm.specialization.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        dateOfBirth: adminEditForm.dateOfBirth?.trim() || undefined,
        gender: adminEditForm.gender?.trim() || undefined,
        nationalId: adminEditForm.nationalId?.trim() || undefined,
        residentialAddress: adminEditForm.residentialAddress?.trim() || undefined,
        department: adminEditForm.department?.trim() || undefined,
        employmentDate: adminEditForm.employmentDate?.trim() || undefined,
        employmentType: adminEditForm.employmentType?.trim() || undefined,
        employmentStatus: adminEditForm.employmentStatus?.trim() || undefined,
      };

      if (adminEditForm.emergencyContactName?.trim() || adminEditForm.emergencyContactPhone?.trim()) {
        payload.emergencyContact = {
          name: adminEditForm.emergencyContactName?.trim() || 'Emergency Contact',
          phone: adminEditForm.emergencyContactPhone?.trim() || '',
          relationship: adminEditForm.emergencyContactRelationship?.trim() || 'Next of Kin'
        };
      }

      const res = await apiService.adminUpdateTeacherProfile(selectedTeacherForProfile.id, payload);
      if (res?.success) {
        setFeedback({ type: 'success', message: 'Staff/Teacher profile updated successfully by administrator.' });
        setModalSuccess('Profile changes saved successfully!');
        setTeacherProfileData(res.data);
        const updatedTeacher: Teacher = {
          ...selectedTeacherForProfile,
          name: res.data?.user ? `${res.data.user.firstName} ${res.data.user.lastName}` : selectedTeacherForProfile.name,
          email: res.data?.user?.email || selectedTeacherForProfile.email,
          phone: res.data?.user?.phone || selectedTeacherForProfile.phone,
          tscNumber: res.data?.tscNumber || selectedTeacherForProfile.tscNumber,
          employeeNumber: res.data?.employeeNumber || selectedTeacherForProfile.employeeNumber,
          role: res.data?.user?.role ? res.data.user.role.replace(/_/g, ' ') : selectedTeacherForProfile.role,
        };
        setSelectedTeacherForProfile(updatedTeacher);
        if (onTeacherUpdated) {
          onTeacherUpdated(updatedTeacher);
        }
        // Refresh audit logs
        const auditRes = await apiService.getTeacherAuditHistory(selectedTeacherForProfile.id).catch(() => ({ data: [] }));
        if (auditRes?.data) setTeacherAuditLogs(auditRes.data);
      } else {
        setModalError(res?.message || 'Failed to update teacher profile.');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Error updating teacher profile.');
    } finally {
      setSavingAdminEdit(false);
    }
  };

  // Review Correction Request Handler
  const handleOpenReviewModal = (req: TeacherCorrectionRequest, action: 'APPROVE' | 'REJECT') => {
    setSelectedRequestForReview(req);
    setReviewAction(action);
    setReviewRemarks(action === 'APPROVE' ? 'Approved upon verification of official records.' : '');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForReview) return;

    if (reviewAction === 'REJECT' && !reviewRemarks.trim()) {
      alert('A remark or explanation is required when rejecting a correction request.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await apiService.reviewTeacherCorrectionRequest(
        selectedRequestForReview.id,
        reviewAction,
        reviewRemarks.trim()
      );

      if (res?.success) {
        setFeedback({
          type: 'success',
          message: `Correction request for ${selectedRequestForReview.fieldLabel} has been ${reviewAction.toLowerCase()}ed.`,
        });
        setSelectedRequestForReview(null);
        await loadCorrectionRequests();
      } else {
        setFeedback({ type: 'error', message: res?.message || 'Review action failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'An error occurred during review.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const s = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      (t.email || '').toLowerCase().includes(s) ||
      (t.phone || '').toLowerCase().includes(s) ||
      (t.tscNumber || '').toLowerCase().includes(s) ||
      (t.employeeNumber || '').toLowerCase().includes(s) ||
      t.learningAreas.some((la) => la.toLowerCase().includes(s))
    );
  });

  const pendingRequestsCount = correctionRequests.filter((r) => r.status === 'PENDING').length;

  const filteredCorrectionRequests = correctionRequests.filter((r) => {
    if (requestStatusFilter === 'ALL') return true;
    return r.status === requestStatusFilter;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
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
            TSC registered educators, stream allocations, profile records verification, and correction approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('geofencing')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Open standalone School Compound Geofencing page"
            >
              <span className="material-symbols-outlined text-rose-800 text-[16px]">share_location</span>
              <span>School Geofencing</span>
            </button>
          )}

          {onOpenOnboardTeacher && canOnboard && (
            <button
              onClick={onOpenOnboardTeacher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Onboard Teacher</span>
            </button>
          )}

          <span className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            {teachers.filter((t) => t.status === 'Clocked In').length}/{teachers.length} Clocked In
          </span>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-black">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Tab Switcher: Faculty Roster vs Correction Requests */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'roster'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            <span>Faculty Roster ({teachers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('corrections')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'corrections'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">rule</span>
            <span>Profile Correction Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>
        </div>

        {activeTab === 'roster' && (
          <div className="relative max-w-xs w-full">
            <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search faculty name, TSC, EMP..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary shadow-xs"
            />
          </div>
        )}
      </div>

      {/* VIEW TAB 1: FACULTY ROSTER */}
      {activeTab === 'roster' && (
        <>
          {filteredTeachers.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">person_off</span>
              <p className="font-bold text-base text-on-surface">No educators found</p>
              <p className="text-xs text-outline">Click "Onboard Teacher" to register faculty members with TSC numbers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((t) => {
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
                            <p className="text-[11px] text-on-surface-variant font-data-mono">TSC: {t.tscNumber || 'None'}</p>
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

                    <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewFullProfile(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          title="View full profile details & audit history"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                          <span>Profile</span>
                        </button>

                        <button
                          onClick={() => handleOpenDirectEdit(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          title={`Edit and correct details for ${t.name}`}
                        >
                          <span className="material-symbols-outlined text-[15px] text-amber-700">edit</span>
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleOpenAssignModal(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                          title={`Assign Class & Stream to ${t.name}`}
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary group-hover:text-white transition-colors">
                            school
                          </span>
                          <span>Assign</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          disabled={deletingId === t.id}
                          title="Delete Teacher Record"
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {deletingId === t.id ? 'sync' : 'delete'}
                          </span>
                        </button>
                        <button
                          onClick={() => onToggleClockIn(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
        </>
      )}

      {/* VIEW TAB 2: CORRECTION REQUESTS REVIEW */}
      {activeTab === 'corrections' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <div>
              <h2 className="text-base font-bold text-on-surface">Teacher Profile Correction Requests</h2>
              <p className="text-xs text-on-surface-variant">
                Verify requested amendments to restricted teacher credentials and approve or reject with audit trail.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    requestStatusFilter === st
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loadingRequests ? (
            <div className="py-12 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">progress_activity</span>
              <p className="text-xs font-semibold">Loading correction requests...</p>
            </div>
          ) : filteredCorrectionRequests.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">done_all</span>
              <p className="text-sm font-bold text-on-surface">No {requestStatusFilter.toLowerCase()} correction requests.</p>
              <p className="text-xs">Any teacher requested profile adjustments will appear here for review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCorrectionRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-outline-variant/25 bg-surface-container-low hover:bg-surface-container transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-on-surface">
                        {req.teacher?.name || 'Teacher'} ({req.teacher?.employeeNumber || 'EMP'})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {req.fieldLabel || req.fieldName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        Requested: {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-on-surface-variant">Current Value: </span>
                        <span className="font-medium text-gray-700">{req.currentValue || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">Proposed Correction: </span>
                        <strong className="text-primary">{req.proposedValue}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-on-surface-variant">
                      <span className="font-semibold">Reason: </span>
                      <span className="italic text-on-surface">"{req.reason}"</span>
                    </div>

                    {req.evidenceUrl && (
                      <div className="text-[11px]">
                        <a
                          href={req.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline inline-flex items-center gap-1 font-semibold"
                        >
                          <span className="material-symbols-outlined text-[12px]">attachment</span>
                          <span>View Supporting Evidence</span>
                        </a>
                      </div>
                    )}

                    {req.reviewRemarks && (
                      <div className="p-2 rounded-lg bg-surface border border-outline-variant/30 text-[11px] space-y-0.5">
                        <span className="font-bold text-on-surface">Reviewer ({req.reviewedByName}):</span>
                        <p className="text-on-surface-variant">{req.reviewRemarks}</p>
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenReviewModal(req, 'APPROVE')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleOpenReviewModal(req, 'REJECT')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: REVIEW CORRECTION REQUEST */}
      {selectedRequestForReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    reviewAction === 'APPROVE' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {reviewAction === 'APPROVE' ? 'verified' : 'cancel'}
                </span>
                <h3 className="font-bold text-sm text-on-surface">
                  {reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Correction Request
                </h3>
              </div>
              <button onClick={() => setSelectedRequestForReview(null)} className="text-gray-500 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container text-xs space-y-1">
              <div>
                <span className="text-on-surface-variant">Field: </span>
                <strong>{selectedRequestForReview.fieldLabel}</strong>
              </div>
              <div>
                <span className="text-on-surface-variant">Proposed Value: </span>
                <strong className="text-primary">{selectedRequestForReview.proposedValue}</strong>
              </div>
              <div>
                <span className="text-on-surface-variant">Teacher: </span>
                <span>{selectedRequestForReview.teacher?.name}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">
                  Administrator Remarks / Reason {reviewAction === 'REJECT' && <span className="text-error">*</span>}
                </label>
                <textarea
                  required={reviewAction === 'REJECT'}
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'e.g. Verified against official TSC documentation.'
                      : 'State clear reason for rejection (e.g., mismatch with TSC registry record)...'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForReview(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 rounded-lg text-white font-bold cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                    reviewAction === 'APPROVE' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {submittingReview && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                  <span>Confirm {reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL TEACHER PROFILE & AUDIT LOG */}
      {selectedTeacherForProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant/30 my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between shrink-0 bg-surface-container-lowest">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {(selectedTeacherForProfile.name || '')
                    .replace('Tr. ', '')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">{selectedTeacherForProfile.name}</h3>
                  <p className="text-xs text-on-surface-variant font-data-mono">
                    TSC: {selectedTeacherForProfile.tscNumber || 'None'} • Emp No: {selectedTeacherForProfile.employeeNumber || 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTeacherForProfile(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Sub-tabs: Details vs Audit Trail vs Edit (Admin Override) */}
            <div className="px-5 pt-2 flex items-center gap-3 border-b border-outline-variant/20 bg-surface-container-lowest shrink-0 text-xs font-bold">
              <button
                onClick={() => setProfileModalTab('details')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-all ${
                  profileModalTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Profile Details (7 Sections)
              </button>
              <button
                onClick={() => setProfileModalTab('audit')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-all ${
                  profileModalTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Audit History ({teacherAuditLogs.length})
              </button>
              <button
                onClick={() => setProfileModalTab('edit')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-all ${
                  profileModalTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Admin Direct Edit (Override)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingProfileData ? (
                <div className="py-16 text-center text-on-surface-variant space-y-2">
                  <span className="material-symbols-outlined text-3xl animate-spin text-primary">progress_activity</span>
                  <p className="font-semibold">Loading teacher profile details...</p>
                </div>
              ) : profileModalTab === 'details' ? (
                <div className="space-y-4">
                  {/* Personal & Contact Grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Full Name</span>
                      <span className="font-bold text-on-surface">{teacherProfileData?.user?.fullName || selectedTeacherForProfile.name}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Email Address</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.user?.email || 'None'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Phone</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.user?.phone || selectedTeacherForProfile.phone}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">National ID</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.nationalId || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Date of Birth</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.dateOfBirth || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Gender</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.gender || 'Not set'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[11px] text-on-surface-variant">Residential Address</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.residentialAddress || 'Not recorded'}</span>
                    </div>
                  </div>

                  {/* Professional & Employment */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">TSC Number</span>
                      <span className="font-bold text-primary">{teacherProfileData?.tscNumber || 'None'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Employee Number</span>
                      <span className="font-bold text-on-surface">{teacherProfileData?.employeeNumber || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Qualification</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.qualification || 'Bachelor of Education'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Department</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.department || 'Primary CBC'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Employment Type</span>
                      <span className="font-semibold text-on-surface">{teacherProfileData?.employmentType || 'FULL_TIME'}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-on-surface-variant">Employment Status</span>
                      <span className="font-bold text-emerald-700">{teacherProfileData?.employmentStatus || 'ACTIVE'}</span>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <h4 className="font-bold text-primary mb-2 uppercase text-[10px] tracking-wider">Emergency Contact</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="block text-[11px] text-on-surface-variant">Name</span>
                        <span className="font-semibold text-on-surface">{teacherProfileData?.emergencyContact?.name || 'Not recorded'}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-on-surface-variant">Phone</span>
                        <span className="font-semibold text-on-surface">{teacherProfileData?.emergencyContact?.phone || 'Not recorded'}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-on-surface-variant">Relationship</span>
                        <span className="font-semibold text-on-surface">{teacherProfileData?.emergencyContact?.relationship || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : profileModalTab === 'audit' ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-on-surface">Audit History Trail</h4>
                  {teacherAuditLogs.length === 0 ? (
                    <p className="text-on-surface-variant italic py-6 text-center">No profile change audit records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {teacherAuditLogs.map((log, i) => (
                        <div key={i} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{log.action}</span>
                            <span className="text-[10px] text-on-surface-variant">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface">{log.details}</p>
                          <div className="text-[10px] text-on-surface-variant">
                            <span>Actor: </span>
                            <strong>{log.actorEmail || log.actorUserId || 'System'}</strong>
                            {log.actorRole && <span> ({log.actorRole})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Admin Override Form */
                <form onSubmit={handleSaveAdminProfile} className="space-y-4">
                  {modalError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                      <span className="font-semibold">{modalError}</span>
                    </div>
                  )}

                  {modalSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                      <span className="font-semibold">{modalSuccess}</span>
                    </div>
                  )}

                  {/* Section 1: Identity & Role */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      <span>Account & Basic Identity</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-on-surface mb-1">
                          First Name <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={adminEditForm.firstName || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, firstName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">
                          Last Name <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={adminEditForm.lastName || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, lastName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Email Address</label>
                        <input
                          type="email"
                          value={adminEditForm.email || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, email: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={adminEditForm.phone || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, phone: e.target.value })}
                          placeholder="e.g. +254712345678"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary font-data-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-on-surface mb-1">System Role</label>
                        <select
                          value={adminEditForm.role || 'TEACHER'}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, role: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary cursor-pointer font-bold"
                        >
                          <option value="TEACHER">Teacher (Faculty Educator)</option>
                          <option value="HEAD_TEACHER">Head Teacher (Pedagogical Head)</option>
                          <option value="DEPUTY_HEAD_TEACHER">Deputy Head Teacher</option>
                          <option value="BURSAR">Bursar (Finance Officer)</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="ADMISSIONS">Admissions Officer</option>
                          <option value="SCHOOL_ADMIN">School Administrator</option>
                          <option value="ADMIN">System Administrator</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Biodata & Demographics */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <h4 className="font-bold text-xs text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span>Personal Demographics & Identification</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-on-surface mb-1">National ID / Passport</label>
                        <input
                          type="text"
                          value={adminEditForm.nationalId || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, nationalId: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={adminEditForm.dateOfBirth || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, dateOfBirth: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Gender</label>
                        <select
                          value={adminEditForm.gender || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, gender: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary cursor-pointer"
                        >
                          <option value="">Select Gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-bold text-on-surface mb-1">Residential Address</label>
                        <input
                          type="text"
                          value={adminEditForm.residentialAddress || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, residentialAddress: e.target.value })}
                          placeholder="e.g. Estate / House No, City / County"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Professional & Employment */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">work</span>
                      <span>Credentials & Employment Record</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Employee Number</label>
                        <input
                          type="text"
                          value={adminEditForm.employeeNumber || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, employeeNumber: e.target.value })}
                          placeholder="e.g. EMP-1001"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary font-data-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">TSC Number</label>
                        <input
                          type="text"
                          value={adminEditForm.tscNumber || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, tscNumber: e.target.value })}
                          placeholder="e.g. TSC/123456"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary font-data-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Highest Qualification</label>
                        <input
                          type="text"
                          value={adminEditForm.qualification || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, qualification: e.target.value })}
                          placeholder="e.g. B.Ed (Science), Diploma in Education"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Department</label>
                        <input
                          type="text"
                          value={adminEditForm.department || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, department: e.target.value })}
                          placeholder="e.g. Sciences, Languages, Administration"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-on-surface mb-1">Specialization / Subjects (Comma-separated)</label>
                        <input
                          type="text"
                          value={adminEditForm.specialization || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, specialization: e.target.value })}
                          placeholder="e.g. Mathematics, Integrated Science"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Employment Type</label>
                        <select
                          value={adminEditForm.employmentType || 'FULL_TIME'}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, employmentType: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary cursor-pointer"
                        >
                          <option value="FULL_TIME">Full Time</option>
                          <option value="PART_TIME">Part Time</option>
                          <option value="CONTRACT">Contract</option>
                          <option value="INTERN">Intern / Volunteer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Employment Status</label>
                        <select
                          value={adminEditForm.employmentStatus || 'ACTIVE'}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, employmentStatus: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary cursor-pointer"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="ON_LEAVE">On Leave</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="TERMINATED">Terminated</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Emergency Contact */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">contact_emergency</span>
                      <span>Emergency Contact Details</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={adminEditForm.emergencyContactName || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, emergencyContactName: e.target.value })}
                          placeholder="e.g. Jane Mwangi"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={adminEditForm.emergencyContactPhone || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, emergencyContactPhone: e.target.value })}
                          placeholder="e.g. +254711223344"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary font-data-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-on-surface mb-1">Relationship</label>
                        <input
                          type="text"
                          value={adminEditForm.emergencyContactRelationship || ''}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, emergencyContactRelationship: e.target.value })}
                          placeholder="e.g. Spouse, Sibling"
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                    <button
                      type="button"
                      onClick={() => setProfileModalTab('details')}
                      className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface cursor-pointer font-bold hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingAdminEdit}
                      className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white font-bold cursor-pointer shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingAdminEdit && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Class & Stream Modal */}
      {isAssignOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Assign Class & Stream</h3>
                  <p className="text-[11px] text-on-surface-variant truncate max-w-[220px]">
                    {selectedTeacher.name} ({selectedTeacher.employeeNumber || selectedTeacher.tscNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignClassAndStream} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
              {assignSuccess && (
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700 text-[18px]">check_circle</span>
                  <span>{assignSuccess}</span>
                </div>
              )}
              {assignError && (
                <div className="p-3 bg-error-container/40 border border-error/20 text-on-error-container rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>
                  <span>{assignError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  1. Target Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary cursor-pointer"
                >
                  {allClassOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  2. Stream Allocation
                </label>
                <select
                  value={selectedStreamMode}
                  onChange={(e) => handleStreamModeChange(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary cursor-pointer"
                >
                  {(streamsMap[selectedClassId] || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} Stream
                    </option>
                  ))}
                  <option value="main-default">+ Assign Default (Main Stream)</option>
                  <option value="__NEW_STREAM__">+ Create & Assign New Custom Stream...</option>
                </select>
              </div>

              {selectedStreamMode === '__NEW_STREAM__' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <label className="block font-bold text-amber-900 text-[11px]">
                    Custom Stream Name *
                  </label>
                  <input
                    type="text"
                    value={customStreamName}
                    onChange={(e) => setCustomStreamName(e.target.value)}
                    placeholder="e.g. East, Blue, St. Peter"
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-on-surface focus:outline-primary"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase text-[10px] tracking-wider">
                  3. Teaching Role in this Class
                </label>
                <select
                  value={assignmentRole}
                  onChange={(e) => setAssignmentRole(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg p-2.5 text-xs text-on-surface font-semibold focus:outline-primary cursor-pointer"
                >
                  <option value="CLASS_TEACHER">Class Teacher (Lead Educator & Roll Call)</option>
                  <option value="SUBJECT_TEACHER">Subject Teacher (CBC Learning Area)</option>
                  <option value="ASSISTANT_TEACHER">Assistant Class Teacher</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-outline-variant/60 text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {assignLoading && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
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
