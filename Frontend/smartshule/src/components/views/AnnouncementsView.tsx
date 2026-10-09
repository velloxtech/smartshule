import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  SchoolInfo,
  UserRole,
} from '../../types';
import {
  apiService,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
  acknowledgeAnnouncement,
  getStoredAuthToken,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { resolveGradeName } from '../../utils/formatters';

// Available Grade Levels for Target Audience
const GRADE_LEVEL_OPTIONS = [
  { value: 'PLAYGROUP', label: 'Playgroup' },
  { value: 'PP1', label: 'Pre-Primary 1 (PP1)' },
  { value: 'PP2', label: 'Pre-Primary 2 (PP2)' },
  { value: 'GRADE_1', label: 'Grade 1' },
  { value: 'GRADE_2', label: 'Grade 2' },
  { value: 'GRADE_3', label: 'Grade 3' },
  { value: 'GRADE_4', label: 'Grade 4' },
  { value: 'GRADE_5', label: 'Grade 5' },
  { value: 'GRADE_6', label: 'Grade 6' },
  { value: 'GRADE_7', label: 'Grade 7 (Junior School)' },
  { value: 'GRADE_8', label: 'Grade 8 (Junior School)' },
  { value: 'GRADE_9', label: 'Grade 9 (Junior School)' },
];

// Quick Templates for School Administration
const ANNOUNCEMENT_TEMPLATES = [
  {
    title: 'Term 3 Opening & Reporting Directives',
    category: 'GENERAL' as AnnouncementCategory,
    priority: 'HIGH' as AnnouncementPriority,
    targetAudience: 'PARENTS' as AnnouncementAudience,
    content: `Dear Parents and Guardians,

Grace Seeds School warmly welcomes back our learners for Term 3. 

1. Reporting Time: All learners are expected at school by 7:45 AM on Monday.
2. School Uniform & Grooming: Please ensure full standard uniform, black leather shoes, and clean PE kit on scheduled days.
3. Stationery & CBC Workbooks: Ensure all student exercise books and creative work materials are labelled clearly.
4. Transport & Drop-off: Morning bus routes will commence at 6:15 AM sharp. Parents dropping learners directly are requested to use Gate 2.

We look forward to an enriching and fruitful final term of the academic year.

Warm regards,
Office of the Head Teacher`,
  },
  {
    title: '2026 Annual Fee Settlement & Clearance Directive',
    category: 'FEES' as AnnouncementCategory,
    priority: 'URGENT' as AnnouncementPriority,
    targetAudience: 'PARENTS' as AnnouncementAudience,
    content: `Dear Parents and Guardians,

Please be reminded regarding the settlement of the 2026 Annual Fee Schedule for all CBC grades.

1. Simplified Annual Structure: All fees are scheduled as an all-inclusive annual fee covering tuition, learning materials, and ICT levies.
2. Official Payment Channels:
   • M-Pesa Paybill: 247247 | Account Number: <Admission Number>
   • Bank Account: Equity Bank | Account Name: Grace Seeds School | Acc No: 0140293847291
3. Clearance Deadline: Kindly ensure any outstanding arrears or term settlements are ratified before Monday next week.
4. Download Structure: You may access and download your learner's full breakdown on the Fee Structure tab.

For billing queries, kindly contact the Bursar's Office on bursar@graceseedsschool.sc.ke.`,
  },
  {
    title: 'CBC Formative Assessment & KPSEA Assessment Briefing',
    category: 'ACADEMIC' as AnnouncementCategory,
    priority: 'NORMAL' as AnnouncementPriority,
    targetAudience: 'PARENTS' as AnnouncementAudience,
    content: `Dear Parents and Guardians,

The Kenya National Examinations Council (KNEC) and CBC formative assessment evaluations for this term will be conducted over the upcoming weeks.

• Grade 6 KPSEA Candidates: Final rehearsals and index number verifications have been completed. Practical and portfolio assessments are ongoing.
• Grades 1–5 Continuous Assessment: Teachers are compiling formative rubrics and core competency evaluation reports.
• Study Schedules: Parents are kindly encouraged to support leaners with quiet revision time and monitor digital diary assignments.

Thank you for your sustained partnership in our children's holistic education.`,
  },
  {
    title: 'Annual General Meeting (AGM) & Parents Academic Clinic',
    category: 'EVENT' as AnnouncementCategory,
    priority: 'HIGH' as AnnouncementPriority,
    targetAudience: 'PARENTS' as AnnouncementAudience,
    content: `Notice is hereby given of the upcoming Annual General Meeting (AGM) and 1-on-1 Academic Consultation Clinic:

• Date: Saturday, 24th October 2026
• Venue: Grace Seeds School Multipurpose Hall
• Time: 9:00 AM – 1:00 PM

Agenda:
1. Review of Academic and Co-Curricular Progress
2. CBC Curriculum Competencies and Infrastructure Updates
3. Financial Highlights and 2027 Projections
4. Individual Consultations with Class Teachers and Subject Facilitators

Refreshments will be served. All parents and guardians are cordially invited.`,
  },
  {
    title: 'Emergency Severe Weather Alert & Student Transport Protocol',
    category: 'EMERGENCY' as AnnouncementCategory,
    priority: 'URGENT' as AnnouncementPriority,
    targetAudience: 'ALL' as AnnouncementAudience,
    content: `EMERGENCY NOTICE:

Due to ongoing heavy downpours and local flash flooding warnings issued by the Meteorological Department:

1. Early Afternoon Dismissal: Classes will conclude at 2:30 PM today to allow safe daytime transport.
2. School Bus Transport: All buses will depart the school grounds by 2:45 PM. Real-time driver updates will be communicated via SMS.
3. Private Pickups: Parents picking up students personally are requested to arrive at Gate 1 between 2:30 PM and 3:30 PM.
4. Safety First: Any learners whose routes are impassable will remain safely supervised in the school dining hall until collected.

Emergency Hotline: +254 712 345 678`,
  },
  {
    title: 'Inter-House Sports Gala & Athletics Day 2026',
    category: 'SPORTS' as AnnouncementCategory,
    priority: 'NORMAL' as AnnouncementPriority,
    targetAudience: 'ALL' as AnnouncementAudience,
    content: `Get ready for our annual Inter-House Sports and Athletics Championship!

• Date: Friday, 13th November 2026
• Venue: School Sports Grounds
• Competing Houses: Simba (Yellow), Chui (Red), Ndovu (Blue), Kifaru (Green)

Learners are required to report in their respective House T-Shirts and track pants. Parents and family members are warmly welcome to cheer and participate in the fun 100m Parents Dash!`,
  },
];

export const AnnouncementsView: React.FC = () => {
  const { user } = useAuth();

  // State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAudience, setSelectedAudience] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Modals
  const [selectedForMemo, setSelectedForMemo] = useState<Announcement | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('GENERAL');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formAudience, setFormAudience] = useState<AnnouncementAudience>('ALL');
  const [formGradeLevel, setFormGradeLevel] = useState<string>('GRADE_1');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSendSms, setFormSendSms] = useState(false);
  const [formSendWhatsApp, setFormSendWhatsApp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // User permissions
  const canManage = useMemo(() => {
    if (!user) return false;
    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.BURSAR,
      UserRole.TEACHER,
    ];
    return allowedRoles.includes(user.role);
  }, [user]);

  const isParentOrStudent = useMemo(() => {
    if (!user) return false;
    return (
      user.role === UserRole.PARENT ||
      user.role === UserRole.GUARDIAN ||
      user.role === UserRole.STUDENT
    );
  }, [user]);

  // Resilient API Call Wrappers with fallbacks
  const apiFetchFallback = async (endpoint: string, options: RequestInit = {}) => {
    const token =
      getStoredAuthToken() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('smartshule_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('authToken')
        : null);
    const baseUrl = (import.meta as any).env?.VITE_API_URL || '/api/v1';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${cleanBase}${cleanEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    return res.json();
  };

  const safeGetAnnouncements = async (params?: Record<string, any>) => {
    if (typeof getAnnouncements === 'function') return getAnnouncements(params);
    if (typeof apiService?.getAnnouncements === 'function') return apiService.getAnnouncements(params);
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetchFallback(`/announcements${qs}`);
  };

  const safeCreateAnnouncement = async (data: Partial<Announcement>) => {
    if (typeof createAnnouncement === 'function') return createAnnouncement(data);
    if (typeof apiService?.createAnnouncement === 'function') return apiService.createAnnouncement(data);
    return apiFetchFallback('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const safeUpdateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    if (typeof updateAnnouncement === 'function') return updateAnnouncement(id, data);
    if (typeof apiService?.updateAnnouncement === 'function') return apiService.updateAnnouncement(id, data);
    return apiFetchFallback(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  const safeDeleteAnnouncement = async (id: string) => {
    if (typeof deleteAnnouncement === 'function') return deleteAnnouncement(id);
    if (typeof apiService?.deleteAnnouncement === 'function') return apiService.deleteAnnouncement(id);
    return apiFetchFallback(`/announcements/${id}`, {
      method: 'DELETE',
    });
  };

  const safeTogglePinAnnouncement = async (id: string) => {
    if (typeof togglePinAnnouncement === 'function') return togglePinAnnouncement(id);
    if (typeof apiService?.togglePinAnnouncement === 'function') return apiService.togglePinAnnouncement(id);
    return apiFetchFallback(`/announcements/${id}/pin`, {
      method: 'POST',
    });
  };

  const safeAcknowledgeAnnouncement = async (id: string) => {
    if (typeof acknowledgeAnnouncement === 'function') return acknowledgeAnnouncement(id);
    if (typeof apiService?.acknowledgeAnnouncement === 'function') return apiService.acknowledgeAnnouncement(id);
    return apiFetchFallback(`/announcements/${id}/acknowledge`, {
      method: 'POST',
    });
  };

  // Load announcements & school info
  const loadData = async () => {
    setLoading(true);
    try {
      const [annRes, schoolRes] = await Promise.all([
        safeGetAnnouncements(),
        apiService?.getSchool ? apiService.getSchool().catch(() => null) : Promise.resolve(null),
      ]);

      if (annRes?.success && Array.isArray(annRes.data)) {
        setAnnouncements(annRes.data);
      } else {
        setAnnouncements([]);
      }

      if (schoolRes?.success && schoolRes.data) {
        setSchool(schoolRes.data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper: Logo Base64
  const getSchoolLogoBase64 = async (customUrl?: string): Promise<string | null> => {
    const urlsToTry = [customUrl, '/logo.png', '/logo.jpg'].filter(Boolean) as string[];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (base64 && base64.startsWith('data:image')) {
          return base64;
        }
      } catch {
        // fallback
      }
    }
    return null;
  };

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesContent = item.content?.toLowerCase().includes(q);
        const matchesAuthor = item.authorName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
      }
      // Category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Audience
      if (selectedAudience !== 'ALL' && item.targetAudience !== selectedAudience) {
        return false;
      }
      // Priority
      if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) {
        return false;
      }
      return true;
    });
  }, [announcements, searchQuery, selectedCategory, selectedAudience, selectedPriority]);

  // Pinned / Urgent Announcements
  const pinnedOrUrgent = useMemo(() => {
    return announcements.filter((a) => a.isPinned || a.priority === 'URGENT');
  }, [announcements]);

  // Metrics
  const stats = useMemo(() => {
    const total = announcements.length;
    const urgentCount = announcements.filter((a) => a.priority === 'URGENT').length;
    const pinnedCount = announcements.filter((a) => a.isPinned).length;
    const parentNotices = announcements.filter(
      (a) => a.targetAudience === 'PARENTS' || a.targetAudience === 'ALL'
    ).length;
    const userAckCount = announcements.filter(
      (a) => user?.id && a.acknowledgements && a.acknowledgements.includes(user.id)
    ).length;

    return { total, urgentCount, pinnedCount, parentNotices, userAckCount };
  }, [announcements, user]);

  // Actions
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await safeTogglePinAnnouncement(id);
      if (res.success && res.data) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update pin status');
    }
  };

  const handleAcknowledge = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await safeAcknowledgeAnnouncement(id);
      if (res.success && user?.id) {
        setAnnouncements((prev) =>
          prev.map((item) => {
            if (item.id === id) {
              const acks = item.acknowledgements ? [...item.acknowledgements] : [];
              if (!acks.includes(user.id)) acks.push(user.id);
              return {
                ...item,
                acknowledgements: acks,
                acknowledgementCount: acks.length,
              };
            }
            return item;
          })
        );
        if (selectedForMemo?.id === id) {
          setSelectedForMemo((prev) =>
            prev
              ? {
                  ...prev,
                  acknowledgements: [...(prev.acknowledgements || []), user.id],
                  acknowledgementCount: (prev.acknowledgementCount || 0) + 1,
                }
              : null
          );
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge notice');
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete circular "${title}"?`)) {
      try {
        const res = await safeDeleteAnnouncement(id);
        if (res.success) {
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
          if (selectedForMemo?.id === id) setSelectedForMemo(null);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete announcement');
      }
    }
  };

  // Open Create/Edit Modal
  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('GENERAL');
    setFormPriority('NORMAL');
    setFormAudience('ALL');
    setFormGradeLevel('GRADE_1');
    setFormIsPinned(false);
    setFormExpiryDate('');
    setFormSendSms(false);
    setFormSendWhatsApp(false);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnouncement(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormAudience(item.targetAudience);
    setFormGradeLevel(item.targetGradeLevel || 'GRADE_1');
    setFormIsPinned(item.isPinned);
    setFormExpiryDate(item.expiryDate ? item.expiryDate.slice(0, 10) : '');
    setFormSendSms(!!item.sendSmsBroadcast);
    setFormSendWhatsApp(!!item.sendWhatsAppBroadcast);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const applyTemplate = (tpl: (typeof ANNOUNCEMENT_TEMPLATES)[0]) => {
    setFormTitle(tpl.title);
    setFormCategory(tpl.category);
    setFormPriority(tpl.priority);
    setFormAudience(tpl.targetAudience);
    setFormContent(tpl.content);
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Announcement title is required.');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Circular message content is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: Partial<Announcement> = {
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      priority: formPriority,
      targetAudience: formAudience,
      targetGradeLevel: formAudience === 'SPECIFIC_GRADE' ? formGradeLevel : undefined,
      isPinned: formIsPinned,
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : undefined,
      sendSmsBroadcast: formSendSms,
      sendWhatsAppBroadcast: formSendWhatsApp,
      authorName: user?.name || 'School Administration',
      authorRole: user?.role || 'HEAD_TEACHER',
    };

    try {
      if (editingAnnouncement) {
        const res = await safeUpdateAnnouncement(editingAnnouncement.id, payload);
        if (res.success && res.data) {
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === editingAnnouncement.id ? res.data : a))
          );
          setIsCreateModalOpen(false);
        }
      } else {
        const res = await safeCreateAnnouncement(payload);
        if (res.success && res.data) {
          setAnnouncements((prev) => [res.data, ...prev]);
          setIsCreateModalOpen(false);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save circular announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // PDF Export Engine (Official School Memo)
  // ==========================================
  const downloadNoticePDF = async (item: Announcement) => {
    const logoBase64 = await getSchoolLogoBase64(school?.logoUrl);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let curY = 16;

    // 1. School Crest / Logo
    if (logoBase64) {
      const logoW = 18;
      const logoH = 16;
      const logoX = (pageWidth - logoW) / 2;
      try {
        const format = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, format, logoX, curY, logoW, logoH);
      } catch {
        // fallback
      }
      curY += logoH + 3;
    }

    // 2. School Letterhead
    const schoolName = (school?.name || 'GRACE SEEDS SCHOOL').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Deep Navy
    doc.text(schoolName, pageWidth / 2, curY, { align: 'center' });
    curY += 5;

    const motto = school?.motto ? `"${school.motto}"` : '"Nurturing Excellence, Character & Integrity"';
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate
    doc.text(motto, pageWidth / 2, curY, { align: 'center' });
    curY += 4.5;

    const contactLine = `${school?.address || 'P.O. Box 4521-00100 Nairobi'} • Tel: ${school?.phone || '+254 712 345 678'} • Email: ${school?.email || 'info@graceseedsschool.sc.ke'}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(contactLine, pageWidth / 2, curY, { align: 'center' });
    curY += 5;

    // 3. Official Divider Bars
    doc.setDrawColor(30, 58, 138); // Deep Navy
    doc.setLineWidth(1.2);
    doc.line(margin, curY, pageWidth - margin, curY);
    curY += 1.8;

    doc.setDrawColor(217, 119, 6); // Warm Amber
    doc.setLineWidth(0.6);
    doc.line(margin, curY, pageWidth - margin, curY);
    curY += 7;

    // 4. Document Heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL SCHOOL MEMORANDUM / CIRCULAR', pageWidth / 2, curY, { align: 'center' });
    curY += 7;

    // 5. Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'FD');

    const col1X = margin + 4;
    const col2X = margin + 90;
    const metaY = curY + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('REF NO:', col1X, metaY);
    doc.text('DATE:', col1X, metaY + 6);
    doc.text('TO:', col1X, metaY + 12);

    doc.text('FROM:', col2X, metaY);
    doc.text('CATEGORY:', col2X, metaY + 6);
    doc.text('PRIORITY:', col2X, metaY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const circularRef = `GSS/CIR/${new Date(item.publishDate).getFullYear()}/${item.id.slice(-4).toUpperCase()}`;
    const formattedDate = new Date(item.publishDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let audienceText = 'Whole School Community';
    if (item.targetAudience === 'PARENTS') audienceText = 'All Parents & Guardians';
    if (item.targetAudience === 'TEACHERS') audienceText = 'Teaching & Academic Staff';
    if (item.targetAudience === 'STUDENTS') audienceText = 'All Students & Learners';
    if (item.targetAudience === 'SPECIFIC_GRADE') {
      audienceText = `${resolveGradeName(item.targetGradeLevel)} Parents & Learners`;
    }

    doc.text(circularRef, col1X + 18, metaY);
    doc.text(formattedDate, col1X + 18, metaY + 6);
    doc.text(audienceText, col1X + 18, metaY + 12);

    doc.text(`${item.authorName} (${item.authorRole})`, col2X + 22, metaY);
    doc.text(item.category, col2X + 22, metaY + 6);

    // Priority color
    if (item.priority === 'URGENT') {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else if (item.priority === 'HIGH') {
      doc.setTextColor(217, 119, 6);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(item.priority, col2X + 22, metaY + 12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    curY += 30;

    // 6. Subject Banner
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    const subjectTitle = `SUBJECT: ${item.title.toUpperCase()}`;
    doc.text(subjectTitle, margin + 3, curY + 5.5);
    curY += 14;

    // 7. Memo Body Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    const paragraphs = item.content.split('\n');
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        curY += 4;
        continue;
      }

      const lines = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        if (curY > pageHeight - 45) {
          doc.addPage();
          curY = 20;
        }
        doc.text(line, margin, curY);
        curY += 5.2;
      }
      curY += 2;
    }

    curY += 8;
    if (curY > pageHeight - 50) {
      doc.addPage();
      curY = 25;
    }

    // 8. Sign-off & Stamp Section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Yours faithfully in Education,', margin, curY);
    curY += 12;

    doc.setDrawColor(148, 163, 184);
    doc.line(margin, curY, margin + 55, curY);
    curY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.authorName, margin, curY);
    curY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.authorRole, margin, curY);
    curY += 3.5;
    doc.text(school?.name || 'Grace Seeds School', margin, curY);

    // Official Stamp Graphic (Circular Ring)
    const stampX = pageWidth - margin - 35;
    const stampY = curY - 14;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.circle(stampX, stampY, 15, 'S');
    doc.setLineWidth(0.3);
    doc.circle(stampX, stampY, 13, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text('★ GRACE SEEDS SCHOOL ★', stampX, stampY - 6, { align: 'center' });
    doc.setFontSize(7);
    doc.text('OFFICIAL MEMO', stampX, stampY - 1, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text('VERIFIED', stampX, stampY + 4, { align: 'center' });
    doc.setFontSize(5.5);
    doc.text(new Date(item.publishDate).getFullYear().toString(), stampX, stampY + 8, { align: 'center' });

    // 9. Document Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Grace Seeds School Communication Portal • SmartShule ERP System • Official Certified Notice',
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );

    const safeFilename = `Circular_${item.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(safeFilename);
  };

  // Export Bulletin (All Filtered Notices)
  const downloadAllNoticesPDF = async () => {
    if (filteredAnnouncements.length === 0) {
      alert('No circulars or announcements found to export.');
      return;
    }

    const logoBase64 = await getSchoolLogoBase64(school?.logoUrl);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    // Cover / Title Page
    let curY = 25;
    if (logoBase64) {
      try {
        const format = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, format, (pageWidth - 22) / 2, curY, 22, 20);
        curY += 24;
      } catch {
        // fallback
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text((school?.name || 'GRACE SEEDS SCHOOL').toUpperCase(), pageWidth / 2, curY, { align: 'center' });
    curY += 7;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(school?.motto ? `"${school.motto}"` : '"Nurturing Excellence, Character & Integrity"', pageWidth / 2, curY, { align: 'center' });
    curY += 8;

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.2);
    doc.line(margin, curY, pageWidth - margin, curY);
    curY += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('OFFICIAL NOTICE BOARD & CIRCULAR BULLETIN', pageWidth / 2, curY, { align: 'center' });
    curY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Compiled on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • ${filteredAnnouncements.length} Active Circulars`, pageWidth / 2, curY, { align: 'center' });
    curY += 12;

    filteredAnnouncements.forEach((item, index) => {
      if (curY > pageHeight - 50) {
        doc.addPage();
        curY = 20;
      }

      // Card Header
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 12, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${index + 1}. ${item.title}`, margin + 3, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const subInfo = `Category: ${item.category} | Priority: ${item.priority} | Date: ${new Date(item.publishDate).toLocaleDateString('en-GB')} | By: ${item.authorName}`;
      doc.text(subInfo, margin + 3, curY + 9.5);
      curY += 15;

      // Card Content Preview
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(item.content, contentWidth - 4);
      for (const line of lines.slice(0, 8)) {
        if (curY > pageHeight - 25) {
          doc.addPage();
          curY = 20;
        }
        doc.text(line, margin + 2, curY);
        curY += 4.2;
      }

      if (lines.length > 8) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('[Notice continues in full circular memo...]', margin + 2, curY);
        curY += 4.5;
      }

      curY += 5;
    });

    // Save
    doc.save(`Grace_Seeds_School_Notices_Bulletin_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Helper Badge Colors
  const getCategoryBadgeClass = (cat: AnnouncementCategory) => {
    switch (cat) {
      case 'FEES':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ACADEMIC':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EMERGENCY':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'EVENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HOLIDAY':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'SPORTS':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'EXAM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadgeClass = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 border-red-300 font-semibold animate-pulse';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-300 font-semibold';
      case 'NORMAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getAudienceBadgeText = (aud: AnnouncementAudience, grade?: string) => {
    switch (aud) {
      case 'PARENTS':
        return 'All Parents';
      case 'TEACHERS':
        return 'Teaching Staff';
      case 'STUDENTS':
        return 'All Students';
      case 'SPECIFIC_GRADE':
        return grade ? resolveGradeName(grade) : 'Specific Grade';
      default:
        return 'Whole School';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-300 text-3xl">campaign</span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notice Board & Circulars</h1>
          </div>
          <p className="text-rose-100/90 text-sm max-w-2xl">
            Official communications, administrative circulars, urgent safety alerts, and whole-year school directives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadAllNoticesPDF}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm border border-white/15 shadow-sm"
            title="Download compiled notices bulletin"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>Download Bulletin</span>
          </button>

          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-semibold transition shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-base">post_add</span>
              <span>Post New Notice</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/15"
            title="Refresh Notice Board"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* 2. Key Notice Board Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">article</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Circulars</p>
            <h3 className="text-xl font-bold text-slate-800">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">priority_high</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Urgent Directives</p>
            <h3 className="text-xl font-bold text-red-600">{stats.urgentCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">push_pin</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pinned Notices</p>
            <h3 className="text-xl font-bold text-amber-600">{stats.pinnedCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">
              {isParentOrStudent ? 'check_circle' : 'family_restroom'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              {isParentOrStudent ? 'My Acknowledged' : 'Parent Notices'}
            </p>
            <h3 className="text-xl font-bold text-emerald-600">
              {isParentOrStudent ? stats.userAckCount : stats.parentNotices}
            </h3>
          </div>
        </div>
      </div>

      {/* 3. Urgent / Pinned Spotlight Alert Banner */}
      {pinnedOrUrgent.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-l-4 border-red-500 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-red-800 font-semibold text-sm">
            <span className="material-symbols-outlined text-red-600">notifications_active</span>
            <span>HIGH PRIORITY / PINNED NOTICES ({pinnedOrUrgent.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {pinnedOrUrgent.slice(0, 2).map((item) => (
              <div
                key={`spotlight-${item.id}`}
                onClick={() => setSelectedForMemo(item)}
                className="bg-white p-3 rounded-lg border border-red-200 hover:border-red-300 transition cursor-pointer flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[11px] ${getCategoryBadgeClass(item.category)}`}
                    >
                      {item.category}
                    </span>
                    <span className="text-slate-500">
                      {new Date(item.publishDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                  <p className="text-slate-600 text-xs mt-1 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">person</span>
                    {item.authorName}
                  </span>
                  <span className="text-indigo-600 font-medium hover:underline flex items-center gap-0.5">
                    Read Directive
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search circular title, content, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Audience Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Audience:</span>
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
            >
              <option value="ALL">All Audiences</option>
              <option value="PARENTS">Parents Only</option>
              <option value="TEACHERS">Staff Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="SPECIFIC_GRADE">Specific Grade</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs scrollbar-thin">
          {[
            { id: 'ALL', label: 'All Notices' },
            { id: 'GENERAL', label: 'General' },
            { id: 'ACADEMIC', label: 'Academic & CBC' },
            { id: 'FEES', label: 'Fees & Finance' },
            { id: 'EVENT', label: 'Events & PTA' },
            { id: 'HOLIDAY', label: 'Term Breaks & Holidays' },
            { id: 'EMERGENCY', label: 'Emergency Alerts' },
            { id: 'SPORTS', label: 'Sports & Co-Curricular' },
            { id: 'EXAM', label: 'Assessments & KPSEA' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Announcements List / Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <span className="material-symbols-outlined text-4xl animate-spin text-indigo-600">
            progress_activity
          </span>
          <p className="mt-2 text-sm font-medium">Loading school notice board...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
          <span className="material-symbols-outlined text-5xl text-slate-300">mark_email_unread</span>
          <h3 className="text-base font-semibold text-slate-700 mt-2">No announcements found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no notices matching your current search or filter criteria.
          </p>
          {canManage && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Post a Notice
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAnnouncements.map((item) => {
            const isAcknowledged =
              user?.id && item.acknowledgements && item.acknowledgements.includes(user.id);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedForMemo(item)}
                className={`bg-white rounded-2xl border transition hover:shadow-md cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  item.isPinned
                    ? 'border-amber-300 ring-1 ring-amber-200/70 shadow-xs'
                    : item.priority === 'URGENT'
                    ? 'border-red-300 ring-1 ring-red-200/70'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Top Category Accent Line */}
                <div
                  className={`h-1.5 w-full ${
                    item.category === 'FEES'
                      ? 'bg-emerald-500'
                      : item.category === 'ACADEMIC'
                      ? 'bg-indigo-500'
                      : item.category === 'EMERGENCY'
                      ? 'bg-red-500'
                      : item.category === 'EVENT'
                      ? 'bg-amber-500'
                      : item.category === 'SPORTS'
                      ? 'bg-orange-500'
                      : 'bg-slate-400'
                  }`}
                />

                <div className="p-5 flex-1">
                  {/* Badge & Action Header */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      {item.priority !== 'NORMAL' && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] ${getPriorityBadgeClass(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.isPinned && (
                        <span
                          className="material-symbols-outlined text-amber-500 text-lg"
                          title="Pinned Notice"
                        >
                          push_pin
                        </span>
                      )}

                      {canManage && (
                        <button
                          onClick={(e) => handleTogglePin(item.id, e)}
                          className={`p-1 rounded-md transition ${
                            item.isPinned
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          }`}
                          title={item.isPinned ? 'Unpin Notice' : 'Pin to Top'}
                        >
                          <span className="material-symbols-outlined text-base">keep</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Ref */}
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition">
                    {item.title}
                  </h3>

                  {/* Date & Audience Details */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">calendar_today</span>
                      {new Date(item.publishDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600 font-medium">
                      {getAudienceBadgeText(item.targetAudience, item.targetGradeLevel)}
                    </span>
                  </div>

                  {/* Body Preview */}
                  <p className="text-slate-600 text-xs leading-relaxed mt-3 line-clamp-3">
                    {item.content}
                  </p>

                  {/* Broadcast Badges */}
                  {(item.sendSmsBroadcast || item.sendWhatsAppBroadcast) && (
                    <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
                      {item.sendSmsBroadcast && (
                        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                          <span className="material-symbols-outlined text-xs">sms</span>
                          SMS Sent
                        </span>
                      )}
                      {item.sendWhatsAppBroadcast && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                          <span className="material-symbols-outlined text-xs">chat</span>
                          WhatsApp
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                    <span className="truncate max-w-[120px] font-medium">{item.authorName}</span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Parent Acknowledgement Action */}
                    {isParentOrStudent && (
                      <button
                        onClick={(e) => handleAcknowledge(item.id, e)}
                        disabled={!!isAcknowledged}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                          isAcknowledged
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                        title={isAcknowledged ? 'You have read and acknowledged this notice' : 'Acknowledge notice receipt'}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isAcknowledged ? 'check_circle' : 'visibility'}
                        </span>
                        <span>{isAcknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
                      </button>
                    )}

                    {/* Download PDF button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadNoticePDF(item);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-md transition"
                      title="Download Official Memo PDF"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                    </button>

                    {/* Staff Actions */}
                    {canManage && (
                      <>
                        <button
                          onClick={(e) => openEditModal(item, e)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/70 rounded-md transition"
                          title="Edit Circular"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, item.title, e)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          title="Delete Notice"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. Official Memorandum Reader Modal (High-Fidelity School Letterhead)    */}
      {/* ========================================================================= */}
      {selectedForMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
            {/* Modal Header Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">verified</span>
                <span className="font-semibold text-sm">Official School Circular & Memorandum</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadNoticePDF(selectedForMemo)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg transition"
                  title="Print Circular"
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                </button>
                <button
                  onClick={() => setSelectedForMemo(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Letterhead Memorandum Sheet */}
            <div className="p-8 sm:p-10 bg-slate-50/50 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Official Letterhead */}
              <div className="text-center space-y-1">
                {school?.logoUrl && (
                  <img
                    src={school.logoUrl}
                    alt="School Logo"
                    className="h-16 mx-auto mb-2 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
                  {school?.name || 'GRACE SEEDS SCHOOL'}
                </h2>
                <p className="text-xs text-slate-600 italic">
                  {school?.motto ? `"${school.motto}"` : '"Nurturing Excellence, Character & Integrity"'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {school?.address || 'P.O. Box 4521-00100 Nairobi'} • Tel: {school?.phone || '+254 712 345 678'} • Email:{' '}
                  {school?.email || 'info@graceseedsschool.sc.ke'}
                </p>

                {/* Double Divider Lines */}
                <div className="pt-2">
                  <div className="h-0.5 bg-slate-900 w-full" />
                  <div className="h-0.5 bg-amber-500 w-full mt-0.5" />
                </div>
              </div>

              {/* Document Banner */}
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold tracking-wider rounded uppercase">
                  Official School Memorandum
                </span>
              </div>

              {/* Metadata Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shadow-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Reference No:</span>
                  <p className="font-mono font-medium text-slate-800">
                    GSS/CIR/{new Date(selectedForMemo.publishDate).getFullYear()}/
                    {selectedForMemo.id.slice(-4).toUpperCase()}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Date of Issue:</span>
                  <p className="font-medium text-slate-800">
                    {new Date(selectedForMemo.publishDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">To (Target Audience):</span>
                  <p className="font-medium text-slate-800">
                    {getAudienceBadgeText(
                      selectedForMemo.targetAudience,
                      selectedForMemo.targetGradeLevel
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">From (Author):</span>
                  <p className="font-medium text-slate-800">
                    {selectedForMemo.authorName} ({selectedForMemo.authorRole})
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Category:</span>
                  <p className="font-medium text-slate-800">{selectedForMemo.category}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Priority:</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${getPriorityBadgeClass(
                      selectedForMemo.priority
                    )}`}
                  >
                    {selectedForMemo.priority}
                  </span>
                </div>
              </div>

              {/* Subject Title */}
              <div className="border-b-2 border-slate-300 pb-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase">
                  SUBJECT: {selectedForMemo.title}
                </h3>
              </div>

              {/* Content Paragraphs */}
              <div className="text-slate-800 text-sm leading-relaxed space-y-4 whitespace-pre-line font-sans">
                {selectedForMemo.content}
              </div>

              {/* Official Seal / Signature Block */}
              <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 italic">Yours in the Service of Education,</p>
                  <div className="pt-6 border-b border-slate-400 w-48" />
                  <p className="font-bold text-slate-900 text-sm">{selectedForMemo.authorName}</p>
                  <p className="text-xs text-slate-600">{selectedForMemo.authorRole}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {school?.name || 'Grace Seeds School'}
                  </p>
                </div>

                {/* Stamp Seal Graphic */}
                <div className="w-28 h-28 rounded-full border-2 border-indigo-700 border-dashed p-1 flex flex-col items-center justify-center text-center text-indigo-800 rotate-[-8deg] bg-indigo-50/40 select-none shadow-xs">
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    ★ GRACE SEEDS SCHOOL ★
                  </span>
                  <span className="text-[11px] font-black uppercase my-0.5">OFFICIAL MEMO</span>
                  <span className="text-[8px] font-semibold tracking-widest text-emerald-700">
                    VERIFIED
                  </span>
                  <span className="text-[8px] text-slate-500">
                    {new Date(selectedForMemo.publishDate).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              {/* Acknowledgement Status / Button */}
              <div>
                {isParentOrStudent && (
                  <button
                    onClick={() => handleAcknowledge(selectedForMemo.id)}
                    disabled={
                      !!(
                        user?.id &&
                        selectedForMemo.acknowledgements &&
                        selectedForMemo.acknowledgements.includes(user.id)
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      user?.id &&
                      selectedForMemo.acknowledgements &&
                      selectedForMemo.acknowledgements.includes(user.id)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {user?.id &&
                      selectedForMemo.acknowledgements &&
                      selectedForMemo.acknowledgements.includes(user.id)
                        ? 'check_circle'
                        : 'done'}
                    </span>
                    {user?.id &&
                    selectedForMemo.acknowledgements &&
                    selectedForMemo.acknowledgements.includes(user.id)
                      ? 'Acknowledged by You'
                      : 'Acknowledge Receipt of Circular'}
                  </button>
                )}
                {canManage && (
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedForMemo.acknowledgementCount || 0} user(s) acknowledged receipt
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadNoticePDF(selectedForMemo)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Save PDF
                </button>
                <button
                  onClick={() => setSelectedForMemo(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Create / Edit Announcement Modal                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">post_add</span>
                <h3 className="font-semibold text-base">
                  {editingAnnouncement ? 'Edit Circular Notice' : 'Post New Notice or Circular'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAnnouncement} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quick Template Picker (Only when creating new) */}
              {!editingAnnouncement && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quick Templates (Click to Auto-fill):
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {ANNOUNCEMENT_TEMPLATES.map((tpl, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => applyTemplate(tpl)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium whitespace-nowrap transition"
                      >
                        {tpl.title.slice(0, 26)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Error Banner */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Circular Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 2026 Term 3 Opening Guidelines & Reporting Dates"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="GENERAL">General Notice</option>
                    <option value="ACADEMIC">Academic & CBC</option>
                    <option value="FEES">Fees & Finance</option>
                    <option value="EVENT">Event & PTA</option>
                    <option value="HOLIDAY">Holidays & Term Breaks</option>
                    <option value="EMERGENCY">Emergency & Safety</option>
                    <option value="SPORTS">Sports & Athletics</option>
                    <option value="EXAM">Examinations & Assessments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Red Alert Banner)</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Target Audience & Specific Grade Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as AnnouncementAudience)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">All School Community</option>
                    <option value="PARENTS">Parents & Guardians</option>
                    <option value="TEACHERS">Teachers & Staff</option>
                    <option value="STUDENTS">Students & Learners</option>
                    <option value="SPECIFIC_GRADE">Specific Grade Level</option>
                  </select>
                </div>

                {formAudience === 'SPECIFIC_GRADE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Grade Level</label>
                    <select
                      value={formGradeLevel}
                      onChange={(e) => setFormGradeLevel(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {GRADE_LEVEL_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Memorandum Body Content *
                </label>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter the official text of the circular notice..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              {/* Pin & Broadcast Toggles */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Pin this notice to top of the school notice board
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSendSms}
                    onChange={(e) => setFormSendSms(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Send Instant SMS Alert to Parent Contacts
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSendWhatsApp}
                    onChange={(e) => setFormSendWhatsApp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Broadcast to School WhatsApp Community Channel
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">
                        progress_activity
                      </span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">publish</span>
                      <span>{editingAnnouncement ? 'Update Notice' : 'Publish Circular'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsView;
