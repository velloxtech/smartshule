import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan, UserRole } from '../../types';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { ViewSchemeModal } from '../modals/ViewSchemeModal';
import { CurriculumSuiteSwitcher, CurriculumSuiteTab } from '../common/CurriculumSuiteSwitcher';
import { useAuth } from '../../context/AuthContext';

interface SchemesViewProps {
  onNavigateTab?: (tab: string) => void;
  initialTab?: 'schemes' | 'lesson-plans';
}

export const SchemesView: React.FC<SchemesViewProps> = ({ onNavigateTab, initialTab = 'schemes' }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isApprover = Boolean(
    user?.role && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER
    ].includes(user.role)
  );

  const [activeTab, setActiveTab] = useState<'schemes' | 'lesson-plans'>(initialTab);
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);

  // Modals
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeOfWork | null>(null);

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
        // try next fallback
      }
    }
    return null;
  };

  const downloadSchemePDF = async (scheme: SchemeOfWork) => {
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || 'Grace Seeds School';
    const motto = schoolInfo?.motto || 'The Future Begins Here';

    // Top burgundy bar
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 297, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 16, 16);
      } catch {
        // continue
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 34, curY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${motto}"`, 34, curY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Ministry of Education · KICD Competency-Based Curriculum Scheme of Work', 34, curY + 15);

    curY += 20;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, curY, 283, curY);

    curY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`SCHEME OF WORK: ${scheme.title.toUpperCase()}`, 14, curY);

    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const teacherName = teacherProfile?.user ? `${teacherProfile.user.firstName} ${teacherProfile.user.lastName}` : (user?.fullName || 'Educator');
    doc.text(`Educator: Tr. ${teacherName} (${teacherProfile?.tscNumber || 'TSC Verified'}) · Status: ${scheme.status} · Entries: ${scheme.entries?.length || 0} Lessons`, 14, curY);

    if (scheme.reviewRemarks) {
      curY += 4.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(122, 18, 40);
      doc.text(`HOD / Head Teacher Endorsement: "${scheme.reviewRemarks}"`, 14, curY);
    }

    curY += 4;

    const tableRows = (scheme.entries || []).map((e) => [
      e.weekNumber?.toString() || '1',
      e.lessonNumber?.toString() || '1',
      e.strandTitle || '--',
      e.subStrandTitle || '--',
      (e.specificLearningOutcomes || []).join('; ') || '--',
      (e.keyInquiryQuestions || []).join('; ') || '--',
      (e.learningExperiences || []).join('; ') || '--',
      (e.learningResources || []).join('; ') || '--',
      (e.assessmentMethods || []).join(', ') || '--',
      e.reflection || 'Delivered effectively',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Wk', 'Lsn', 'Strand', 'Sub-Strand', 'Specific Learning Outcomes', 'Key Inquiry Questions', 'Learning Experiences', 'Resources', 'Assessment', 'Reflection']],
      body: tableRows.length > 0 ? tableRows : [['1', '1', 'CBC Strand', 'Sub-strand', 'Competency outcome', 'Inquiry question', 'Learner activities', 'Textbook & aids', 'Observation', 'Completed']],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 44 },
        5: { cellWidth: 36 },
        6: { cellWidth: 42 },
        7: { cellWidth: 28 },
        8: { cellWidth: 22 },
        9: { cellWidth: 25 },
      },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    let finalY = (lastTable && lastTable.finalY ? lastTable.finalY : 170) + 8;
    if (finalY + 22 > 195) {
      doc.addPage('a4', 'landscape');
      finalY = 15;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Subject Teacher: _________________________   Date: ${new Date().toLocaleDateString()}`, 14, finalY);
    doc.text('HOD / Curriculum Coordinator: _________________________   Date: ____________', 105, finalY);
    doc.text('Principal / Head Teacher Stamp: [                           ]', 210, finalY);

    doc.setFontSize(7);
    doc.text(`Grace Seeds School · Generated on ${new Date().toLocaleString()} · Official Academic Record`, 148, 202, { align: 'center' });

    doc.save(`Grace_Seeds_School_Scheme_${scheme.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const downloadLessonPlanPDF = async (plan: LessonPlan) => {
    const logoBase64 = await getSchoolLogoBase64(schoolInfo?.logoUrl);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const schoolName = schoolInfo?.name || plan.institutionName || 'Grace Seeds School';

    const teacherName = teacherProfile?.user
      ? `${teacherProfile.user.firstName} ${teacherProfile.user.lastName}`
      : (plan.teacherName || user?.fullName || 'Educator');

    const matchedClass = classes.find((c) => c.id === plan.classRoomId);
    const gradeLevel = plan.gradeLevel || matchedClass?.gradeLevel?.replace(/_/g, ' ') || 'Grade 3';
    const className = plan.className || matchedClass?.name || 'Primary Class';
    const matchedSubject = learningAreas.find((la) => la.id === plan.learningAreaId);
    const learningAreaName = plan.learningAreaName || matchedSubject?.name || 'Learning Area';
    const sessionTitle = plan.sessionTitle || plan.subStrand || plan.strand;
    const weekDisplay = plan.weekNumber ? `Week ${plan.weekNumber}` : 'Week ___';
    const lessonDisplay = plan.lessonNumber ? `Lesson ${plan.lessonNumber}` : 'Lesson ___';

    const formatCompetencyName = (comp: string) => {
      return comp
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const formatValueName = (val: string) => {
      return val
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    // ==========================================
    // PAGE 1 OF 3: SESSION DETAILS & OUTCOMES
    // ==========================================
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    let curY = 12;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, curY, 15, 15);
      } catch {
        // continue
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(122, 18, 40);
    doc.text(schoolName, 32, curY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Session Plan Template (Primary CBE)', 32, curY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${weekDisplay} · ${lessonDisplay} · [${sessionTitle}]`, 32, curY + 14);

    curY += 19;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, curY, 196, curY);

    curY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(122, 18, 40);
    doc.text('SESSION DETAILS', 14, curY);

    curY += 2;

    autoTable(doc, {
      startY: curY,
      head: [['Item', 'Details', 'Item', 'Details']],
      body: [
        ['Date', plan.lessonDate || '---', 'Time', `${plan.durationMinutes || 40} Minutes`],
        ['Week', weekDisplay, 'Lesson', lessonDisplay],
        ['Teacher name', `Tr. ${teacherName}`, 'Grade', gradeLevel],
        ['Name of institution', schoolName, 'Class', className],
        ['', '', 'Learning area', learningAreaName],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 62 },
        2: { fontStyle: 'bold', cellWidth: 30 },
        3: { cellWidth: 58 },
      },
      margin: { left: 14, right: 14 },
    });

    const rollBoys = plan.rollBoys ?? 0;
    const rollGirls = plan.rollGirls ?? 0;
    const totalRoll = rollBoys + rollGirls;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 2,
      head: [['Item', 'Details']],
      body: [
        ['Number of learners', `Boys: ${rollBoys}    Girls: ${rollGirls}    (Total: ${totalRoll})`],
        ['Strand', plan.strand || '---'],
        ['Sub strand', plan.subStrand || '---'],
        ['Session title', sessionTitle],
        ['Learner needs (LLN) or other requirements', plan.learnerNeeds || 'Differentiated instruction: peer-assisted scaffolding for emerging learners; extension challenges for fast learners.'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    const outcomesList = (plan.specificLearningOutcomes && plan.specificLearningOutcomes.length > 0)
      ? plan.specificLearningOutcomes
      : [
          '1. [Outcome 1: start with an action verb, e.g. identify, calculate, construct]',
          '2. [Outcome 2: apply concept collaboratively in practical tasks]',
          '3. [Outcome 3: appreciation or attitude towards the learning area]',
        ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 3,
      head: [['Learning Outcomes', 'Details']],
      body: [
        [
          'By the end of this session, the learner should be able to:',
          outcomesList.map((o, idx) => {
            const clean = o.replace(/^\d+[\.\)]\s*/, '');
            return `${idx + 1}. ${clean}`;
          }).join('\n\n')
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    const inquiryList = (plan.keyInquiryQuestions && plan.keyInquiryQuestions.length > 0)
      ? plan.keyInquiryQuestions
      : [
          '[Learning experience or question 1: How does this concept apply in real life?]',
          '[Learning experience or question 2: What patterns can we observe during our task?]',
          '[Learning experience or question 3: How can we confirm our findings with peers?]',
        ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 3,
      head: [['Key Inquiry Questions', 'The learner is guided to:']],
      body: [
        [
          'Inquiry & Experiences',
          inquiryList.map((q, idx) => {
            const clean = q.replace(/^\d+[\.\)]\s*/, '');
            return `${idx + 1}. ${clean}`;
          }).join('\n\n')
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${schoolName} · Session Plan Template (Primary CBE)`, 14, 289);
    doc.text('Page 1 of 3', 196, 289, { align: 'right' });

    // ==========================================
    // PAGE 2 OF 3: COMPETENCIES, PCIS & PRESENTATION
    // ==========================================
    doc.addPage('a4', 'portrait');

    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    curY = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(122, 18, 40);
    doc.text(`${schoolName} · Session Plan Template (Primary CBE)`, 14, curY);

    curY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${weekDisplay} · ${lessonDisplay} · [${sessionTitle}]`, 14, curY);

    curY += 4;

    const compDisplay = (plan.coreCompetenciesAddressed && plan.coreCompetenciesAddressed.length > 0)
      ? plan.coreCompetenciesAddressed.map(formatCompetencyName).join(', ')
      : 'Critical Thinking and Problem Solving, Communication and Collaboration, Digital Literacy';

    const valDisplay = (plan.valuesAddressed && plan.valuesAddressed.length > 0)
      ? plan.valuesAddressed.map(formatValueName).join(', ')
      : 'Respect, Responsibility, Integrity, Unity, Love';

    const pcisDisplay = (plan.pcis && plan.pcis.length > 0)
      ? plan.pcis.join(', ')
      : 'Financial literacy, Health education, Environmental awareness and conservation';

    const resDisplay = (plan.learningResources && plan.learningResources.length > 0)
      ? plan.learningResources.join('; ')
      : 'Approved KICD/Ministry Curriculum Coursebook, charts, realia, digital learning aids';

    autoTable(doc, {
      startY: curY,
      head: [['Item', 'Details']],
      body: [
        ['Core Competencies', compDisplay],
        ['Values', valDisplay],
        ['PCIs', pcisDisplay],
        ['Resources (references and learning aids)', resDisplay],
        ['Safety requirements', plan.safetyRequirements || 'Orderly handling of instructional aids, structured movement, safe spatial distribution.'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    curY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(122, 18, 40);
    doc.text('SESSION PRESENTATION', 14, curY);

    curY += 2;

    const introText = typeof plan.introduction === 'string'
      ? plan.introduction
      : (plan.introduction?.activities || 'Review previous lesson through recall inquiry. Learners share observations and connect prior knowledge to new lesson concepts in small groups.');
    const introDuration = typeof plan.introduction === 'object' && plan.introduction?.durationMinutes ? plan.introduction.durationMinutes : 5;

    autoTable(doc, {
      startY: curY,
      head: [[`1. Introduction (${introDuration} minutes)`, 'Details']],
      body: [
        [
          'Review the previous lesson. Say how learners will begin: read, discuss or recall.',
          introText
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    const stepRows = (plan.steps || []).map((s) => [
      `Step ${s.stepNumber} (${s.durationMinutes}m)`,
      s.teacherActivities || '--',
      s.learnerActivities || '--',
      s.assessmentCriterion || 'Observation & verbal check',
    ]);

    const defaultSteps = [
      ['Step 1 (10m)', 'Facilitates conceptual exploration and models core concepts.', 'Observe demonstration, ask clarifying questions in pairs.', 'Oral questioning & engagement check'],
      ['Step 2 (10m)', 'Guides hands-on practical tasks and provides scaffolded hints.', 'Perform guided activity in pairs using learning resources.', 'Formative check of exercise book work'],
      ['Step 3 (10m)', 'Monitors differentiated group exercises and scaffolds struggling learners.', 'Apply concept collaboratively to solve problem tasks.', 'Peer assessment & peer feedback'],
      ['Step 4 (5m)', 'Conducts plenary synthesis and checks individual mastery.', 'Demonstrate completed task output and summarize findings.', 'Check individual progress rubric'],
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 3,
      head: [['2. Session Delivery', 'Teacher Activity', 'Learner Activity', 'Learning Check / Assessment']],
      body: stepRows.length > 0 ? stepRows : defaultSteps,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 26 },
        1: { cellWidth: 54 },
        2: { cellWidth: 52 },
        3: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    });

    const reviewText = typeof plan.sessionReview === 'string'
      ? plan.sessionReview
      : (plan.sessionReview?.activities || 'Summarize key points and learning achieved. Conduct a brief interactive Q&A plenary. Provide constructive formative feedback and preview the next session.');
    const reviewDuration = typeof plan.sessionReview === 'object' && plan.sessionReview?.durationMinutes ? plan.sessionReview.durationMinutes : 5;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 3,
      head: [[`3. Session Review (${reviewDuration} minutes)`, 'Details']],
      body: [
        [
          'Summarize key points and learning achieved. Add a brief interactive activity. Preview the next session.',
          reviewText
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [31, 41, 55],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${schoolName} · Session Plan Template (Primary CBE)`, 14, 289);
    doc.text('Page 2 of 3', 196, 289, { align: 'right' });

    // ==========================================
    // PAGE 3 OF 3: EXTENSION, REFLECTION & SIGNATURE
    // ==========================================
    doc.addPage('a4', 'portrait');

    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 5, 'F');

    curY = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(122, 18, 40);
    doc.text(`${schoolName} · Session Plan Template (Primary CBE)`, 14, curY);

    curY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Review, Extended Activities & Institutional Approval Endorsement', 14, curY);

    curY += 4;

    autoTable(doc, {
      startY: curY,
      head: [['Item', 'Details']],
      body: [
        ['Assignment (extended activities)', plan.extendedActivity || 'Learners complete home practice exercise in their coursebook with guardian guidance.'],
        ['Total time', `${plan.durationMinutes || 40} Minutes`],
        ['Session reflection (teacher self-evaluation)', plan.teacherSelfReflection || 'All primary outcomes attained. Majority demonstrated proficient understanding; remedial practice planned for emerging learners.'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    curY = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: curY,
      head: [['Item', 'Signature & Institutional Verification Details']],
      body: [
        [
          'Signature',
          `Teacher Name: Tr. ${teacherName}\nTSC / ID No: ${teacherProfile?.tscNumber || '---'}\nTeacher Signature: _____________________________________      Date: ${plan.lessonDate || new Date().toISOString().split('T')[0]}`
        ],
        [
          'Head Teacher / Deputy Signature',
          `Pedagogical Status: ${plan.status || 'DRAFT'}\nReview Remarks: ${plan.reviewRemarks || (plan.status === 'APPROVED' ? 'Approved for official classroom delivery.' : 'Pending head teacher administrative review.')}\nReviewed By: ${plan.reviewedByUserId ? 'Institutional Leadership' : '_____________________________________'}\nSignature: _____________________________________      Date: ${plan.reviewedAt ? new Date(plan.reviewedAt).toLocaleDateString() : '____________'}\nOfficial School Stamp:\n\n[                                                                                     ]`
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 136 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${schoolName} · Generated on ${new Date().toLocaleString()} · Official Academic Record`, 14, 289);
    doc.text('Page 3 of 3', 196, 289, { align: 'right' });

    doc.save(`${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_Session_Plan_CBE_${(plan.strand || 'Lesson').replace(/[^a-zA-Z0-9]/g, '_')}_${plan.lessonDate}.pdf`);
  };

  useEffect(() => {
    async function initTeacher() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
          }
        } catch {
          // Continue
        }
      }
    }
    initTeacher();
  }, [isTeacher]);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const teacherFilter = isTeacher && teacherProfile?.id ? { teacherId: teacherProfile.id } : undefined;
      const [sRes, lpRes] = await Promise.all([
        apiService.getSchemes(teacherFilter).catch(() => null),
        apiService.getLessonPlans(teacherFilter).catch(() => null),
      ]);
      setSchemes(sRes?.data || []);
      setLessonPlans(lpRes?.data || []);
    } catch {
      setSchemes([]);
      setLessonPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiService.getClasses().then(r => r?.data && setClasses(r.data)).catch(() => {});
    apiService.getLearningAreas().then(r => r?.data && setLearningAreas(r.data)).catch(() => {});
    loadCurriculum();
  }, [teacherProfile]);

  const handleApproveScheme = async (schemeId: string) => {
    try {
      const roleName = user?.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Deputy Head Teacher' : 'Principal / Administration';
      const res = await apiService.reviewScheme(schemeId, {
        approved: true,
        remarks: `Approved by ${roleName}. Well-aligned with CBE learning outcomes.`,
      });
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error approving scheme');
    }
  };

  const handleSubmitLessonPlan = async (planId: string) => {
    try {
      const res = await apiService.submitLessonPlan(planId);
      if (res.success) {
        loadCurriculum();
        if (selectedPlan && selectedPlan.id === planId) {
          setSelectedPlan(res.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting lesson plan');
    }
  };

  const handleReviewLessonPlan = async (planId: string, approved: boolean, customRemarks?: string) => {
    const roleName = user?.role === UserRole.DEPUTY_HEAD_TEACHER ? 'Deputy Head Teacher' : 'Principal / Administration';
    const defaultRemarks = approved
      ? `Approved by ${roleName}. Comprehensive CBE instructional design.`
      : `Revision requested by ${roleName}. Please enrich learner activities.`;
    const finalRemarks = customRemarks || (approved ? defaultRemarks : window.prompt('Enter revision feedback remarks:', defaultRemarks));
    if (!approved && finalRemarks === null) return; // User canceled prompt

    try {
      const res = await apiService.reviewLessonPlan(planId, {
        approved,
        remarks: finalRemarks || defaultRemarks,
      });
      if (res.success) {
        loadCurriculum();
        if (selectedPlan && selectedPlan.id === planId) {
          setSelectedPlan(res.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error reviewing lesson plan');
    }
  };

  const handleSubmitScheme = async (schemeId: string) => {
    try {
      const res = await apiService.submitScheme(schemeId);
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting scheme');
    }
  };

  const handleDeleteScheme = async (schemeId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete scheme "${title}"?`)) {
      try {
        const res = await apiService.deleteScheme(schemeId);
        if (res.success) {
          setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting scheme');
      }
    }
  };

  const handleDeleteLessonPlan = async (planId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete lesson plan "${title}"?`)) {
      try {
        const res = await apiService.deleteLessonPlan(planId);
        if (res.success) {
          setLessonPlans((prev) => prev.filter((lp) => lp.id !== planId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting lesson plan');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Schemes & Lesson Plans</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Teacher Schemes of Work & 40-Min CBE Lesson Plans
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isTeacher
              ? 'Your personalized curriculum work plans, weekly syllabus progression, and instructional designs'
              : 'Weekly syllabus progression, learning experiences, inquiry questions, and digital approvals'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'schemes' ? (
            <button
              onClick={() => setIsCreateSchemeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7a1228] text-white rounded-lg hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Scheme of Work</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreatePlanOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              <span>New Lesson Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Curriculum Planning & Coverage Suite Switcher */}
      <CurriculumSuiteSwitcher
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'schemes' || tab === 'lesson-plans') {
            setActiveTab(tab);
          } else if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
        counts={{
          schemes: schemes.length,
          lessonPlans: lessonPlans.length,
        }}
      />

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {schemes.length > 0 ? (
            schemes.map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-secondary font-data-mono bg-secondary-container px-2 py-0.5 rounded">
                      Term 1 · 2026
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedScheme(s)}
                      className="font-bold text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5 text-left"
                      title="Click to view full Scheme of Work details"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#7a1228]">visibility</span>
                      <span>{s.title}</span>
                    </button>
                  </div>

                  {s.entries && s.entries[0] && (
                    <div className="space-y-1 pt-1">
                      <div className="text-xs text-on-surface font-semibold">
                        Week {s.entries[0].weekNumber}, Lesson {s.entries[0].lessonNumber}: {s.entries[0].strandTitle} ({s.entries[0].subStrandTitle})
                      </div>
                      <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                        "{s.entries[0].specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-outline pt-0.5">
                        <span>Inquiry: {s.entries[0].keyInquiryQuestions?.[0]}</span>
                        <span>·</span>
                        <span>Assessment: {s.entries[0].assessmentMethods?.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {s.reviewRemarks && (
                    <div className="text-[11px] text-secondary font-semibold bg-secondary/10 p-1.5 rounded">
                      HOD / Head Teacher Remarks: {s.reviewRemarks}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex md:flex-col items-end justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      s.status === 'APPROVED'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : s.status === 'SUBMITTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {s.status}
                  </span>

                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => setSelectedScheme(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete Scheme of Work details and full syllabus matrix"
                    >
                      <span className="material-symbols-outlined text-[17px]">visibility</span>
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => downloadSchemePDF(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Download official Scheme of Work as PDF"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Download PDF</span>
                    </button>
                    {s.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Submit for Review
                      </button>
                    )}
                    {isApprover && s.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApproveScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-white hover:bg-secondary-container transition-colors cursor-pointer"
                      >
                        Approve & Endorse
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteScheme(s.id, s.title)}
                      title="Delete Scheme"
                      className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">edit_calendar</span>
              <p className="font-bold text-sm text-on-surface">No schemes of work recorded</p>
              <p className="text-xs text-outline">Click "New Scheme of Work" to create a CBE syllabus progression plan.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plans View */}
      {activeTab === 'lesson-plans' && (
        <div>
          {lessonPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-surface-container pb-2 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                          {lp.durationMinutes} Mins · {lp.lessonDate}
                        </span>
                        {lp.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                            <span>Approved</span>
                          </span>
                        )}
                        {lp.status === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="material-symbols-outlined text-[13px]">pending</span>
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {lp.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="material-symbols-outlined text-[13px]">cancel</span>
                            <span>Revision Needed</span>
                          </span>
                        )}
                        {(!lp.status || lp.status === 'DRAFT') && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            <span className="material-symbols-outlined text-[13px]">edit_note</span>
                            <span>Draft</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-outline font-data-mono">
                        Roll: {lp.rollBoys ?? 0}B / {lp.rollGirls ?? 0}G
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(lp)}
                        className="font-bold text-sm text-on-surface hover:text-[#7a1228] text-left flex items-center gap-1.5 cursor-pointer"
                        title="Click to view lesson plan details"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#7a1228]">visibility</span>
                        <span>{lp.strand}</span>
                      </button>
                      <p className="text-xs text-primary font-medium">Sub-strand: {lp.subStrand}</p>
                    </div>

                    <div className="mt-3 p-3 rounded-lg bg-surface-container-low text-xs space-y-1.5">
                      <div className="font-semibold text-on-surface">Specific Learning Outcome:</div>
                      <p className="text-on-surface-variant italic">
                        "{lp.specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                    </div>

                    <div className="mt-2 text-[11px] text-on-surface-variant flex flex-wrap gap-2">
                      <span>Inquiry: {lp.keyInquiryQuestions?.[0]}</span>
                    </div>

                    {lp.reviewRemarks && (
                      <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900">Review: </span>
                        <span>{lp.reviewRemarks}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadLessonPlanPDF(lp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Download official 40-Minute Lesson Plan as PDF"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleDeleteLessonPlan(lp.id, lp.strand)}
                        title="Delete Lesson Plan"
                        className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>

                      {/* Teacher Submit Action */}
                      {isTeacher && (!lp.status || lp.status === 'DRAFT' || lp.status === 'REJECTED') && (
                        <button
                          onClick={() => handleSubmitLessonPlan(lp.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container text-xs font-semibold cursor-pointer transition-colors"
                          title="Submit Lesson Plan for Review"
                        >
                          <span className="material-symbols-outlined text-[13px]">send</span>
                          <span>Submit Plan</span>
                        </button>
                      )}

                      {/* Approver Actions (Deputy, Head Teacher, Admin, Super Admin) */}
                      {isApprover && (
                        <div className="flex items-center gap-1.5">
                          {lp.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleReviewLessonPlan(lp.id, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold cursor-pointer transition-colors"
                              title="Approve Lesson Plan"
                            >
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              <span>Approve</span>
                            </button>
                          )}
                          {lp.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleReviewLessonPlan(lp.id, false)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                              title="Request Revision"
                            >
                              <span className="material-symbols-outlined text-[13px]">cancel</span>
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedPlan(lp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete 40-Minute CBE Lesson Plan details"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">post_add</span>
              <p className="font-bold text-sm text-on-surface">No lesson plans prepared yet</p>
              <p className="text-xs text-outline">Click "New Lesson Plan" to prepare a 40-minute CBE instructional guide.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            {/* Header */}
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">Session Plan (Primary CBE)</h3>
                <p className="text-xs text-rose-100">
                  {selectedPlan.weekNumber ? `Week ${selectedPlan.weekNumber}` : 'Week ___'} · {selectedPlan.lessonNumber ? `Lesson ${selectedPlan.lessonNumber}` : 'Lesson ___'} · {selectedPlan.sessionTitle || selectedPlan.subStrand || selectedPlan.strand}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-rose-100 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              {/* Approval status banner */}
              <div className="p-3 rounded-xl border flex items-center justify-between gap-2 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Status:</span>
                  {selectedPlan.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>Approved</span>
                    </span>
                  ) : selectedPlan.status === 'SUBMITTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">pending</span>
                      <span>Pending Approval</span>
                    </span>
                  ) : selectedPlan.status === 'REJECTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">cancel</span>
                      <span>Revision Requested</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold text-[11px]">
                      Draft
                    </span>
                  )}
                </div>
                {selectedPlan.reviewRemarks && (
                  <span className="text-[10px] text-slate-500 italic truncate max-w-[240px]">
                    "{selectedPlan.reviewRemarks}"
                  </span>
                )}
              </div>

              {/* 1. Session Details */}
              <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="bg-surface-container-low px-3 py-1.5 font-bold text-primary uppercase text-[11px] border-b border-outline-variant/30">
                  Session Details
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-on-surface">
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Date:</span>{selectedPlan.lessonDate || '---'}</div>
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Time:</span>{selectedPlan.durationMinutes || 40} Mins</div>
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Week:</span>{selectedPlan.weekNumber ? `Week ${selectedPlan.weekNumber}` : '---'}</div>
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Lesson:</span>{selectedPlan.lessonNumber ? `Lesson ${selectedPlan.lessonNumber}` : '---'}</div>
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Roll:</span>{selectedPlan.rollBoys ?? 0} Boys · {selectedPlan.rollGirls ?? 0} Girls</div>
                  <div><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Strand:</span>{selectedPlan.strand}</div>
                  <div className="col-span-2"><span className="text-on-surface-variant block text-[10px] uppercase font-bold">Sub-Strand:</span>{selectedPlan.subStrand}</div>
                </div>
                {selectedPlan.learnerNeeds && (
                  <div className="px-3 pb-3 text-[11px] text-on-surface-variant border-t border-outline-variant/20 pt-2">
                    <strong className="text-on-surface font-semibold">Learner Needs (LLN):</strong> {selectedPlan.learnerNeeds}
                  </div>
                )}
              </div>

              {/* 2. Learning Outcomes */}
              <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="bg-surface-container-low px-3 py-1.5 font-bold text-primary uppercase text-[11px] border-b border-outline-variant/30">
                  Learning Outcomes
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-[11px] text-on-surface-variant font-medium">By the end of this session, the learner should be able to:</p>
                  <ul className="list-decimal list-inside space-y-1 text-on-surface pl-1">
                    {selectedPlan.specificLearningOutcomes?.map((o, idx) => (
                      <li key={idx} className="leading-snug">{o.replace(/^\d+[\.\)]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 3. Key Inquiry Questions */}
              <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="bg-surface-container-low px-3 py-1.5 font-bold text-primary uppercase text-[11px] border-b border-outline-variant/30">
                  Key Inquiry Questions
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-[11px] text-on-surface-variant font-medium">The learner is guided to:</p>
                  <ul className="list-disc list-inside space-y-1 text-on-surface pl-1">
                    {selectedPlan.keyInquiryQuestions?.map((q, idx) => (
                      <li key={idx} className="leading-snug">{q.replace(/^\d+[\.\)]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. Competencies, Values & Resources */}
              <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="bg-surface-container-low px-3 py-1.5 font-bold text-primary uppercase text-[11px] border-b border-outline-variant/30">
                  Core Competencies, Values & Resources
                </div>
                <div className="p-3 space-y-2 text-on-surface">
                  {selectedPlan.coreCompetenciesAddressed && selectedPlan.coreCompetenciesAddressed.length > 0 && (
                    <div>
                      <span className="font-bold text-primary">Competencies: </span>
                      <span>{selectedPlan.coreCompetenciesAddressed.map(c => c.replace(/_/g, ' ')).join(', ')}</span>
                    </div>
                  )}
                  {selectedPlan.valuesAddressed && selectedPlan.valuesAddressed.length > 0 && (
                    <div>
                      <span className="font-bold text-primary">Values: </span>
                      <span>{selectedPlan.valuesAddressed.map(v => v.replace(/_/g, ' ')).join(', ')}</span>
                    </div>
                  )}
                  {selectedPlan.pcis && selectedPlan.pcis.length > 0 && (
                    <div>
                      <span className="font-bold text-primary">PCIs: </span>
                      <span>{selectedPlan.pcis.join(', ')}</span>
                    </div>
                  )}
                  {selectedPlan.learningResources && selectedPlan.learningResources.length > 0 && (
                    <div>
                      <span className="font-bold text-primary">Resources: </span>
                      <span>{selectedPlan.learningResources.join('; ')}</span>
                    </div>
                  )}
                  {selectedPlan.safetyRequirements && (
                    <div>
                      <span className="font-bold text-primary">Safety Requirements: </span>
                      <span>{selectedPlan.safetyRequirements}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Session Presentation */}
              <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="bg-surface-container-low px-3 py-1.5 font-bold text-primary uppercase text-[11px] border-b border-outline-variant/30">
                  Session Presentation
                </div>
                <div className="p-3 space-y-3">
                  {/* Introduction */}
                  <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                    <div className="font-semibold text-secondary">
                      1. Introduction ({typeof selectedPlan.introduction === 'object' && selectedPlan.introduction?.durationMinutes ? selectedPlan.introduction.durationMinutes : 5} Mins)
                    </div>
                    <div className="text-[11px] text-on-surface mt-1">
                      {typeof selectedPlan.introduction === 'string' ? selectedPlan.introduction : (selectedPlan.introduction?.activities || 'Review previous lesson and introduce session context.')}
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <div className="font-semibold text-secondary mb-1.5">2. Session Delivery (Steps)</div>
                    <div className="space-y-2">
                      {selectedPlan.steps?.map((step) => (
                        <div key={step.stepNumber} className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                          <div className="flex justify-between items-center font-bold text-primary text-[11px]">
                            <span>{step.stepTitle}</span>
                            <span className="font-data-mono">{step.durationMinutes} Mins</span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-1">
                            <strong className="text-on-surface">Teacher: </strong>{step.teacherActivities}
                          </div>
                          <div className="text-[11px] text-on-surface mt-0.5">
                            <strong className="text-on-surface">Learner: </strong>{step.learnerActivities}
                          </div>
                          {step.assessmentCriterion && (
                            <div className="text-[11px] text-emerald-800 mt-0.5">
                              <strong>Assessment Check: </strong>{step.assessmentCriterion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review */}
                  <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                    <div className="font-semibold text-secondary">
                      3. Session Review ({typeof selectedPlan.sessionReview === 'object' && selectedPlan.sessionReview?.durationMinutes ? selectedPlan.sessionReview.durationMinutes : 5} Mins)
                    </div>
                    <div className="text-[11px] text-on-surface mt-1">
                      {typeof selectedPlan.sessionReview === 'string' ? selectedPlan.sessionReview : (selectedPlan.sessionReview?.activities || 'Summarize key points, interactive plenary check and preview next session.')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Assignment & Reflection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPlan.extendedActivity && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <div className="font-bold text-primary text-[11px] uppercase">Assignment (extended activities):</div>
                    <div className="text-xs text-on-surface mt-0.5">{selectedPlan.extendedActivity}</div>
                  </div>
                )}
                {selectedPlan.teacherSelfReflection && (
                  <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                    <div className="font-bold text-secondary text-[11px] uppercase">Session Reflection (teacher self-evaluation):</div>
                    <div className="text-xs text-on-surface italic mt-0.5">{selectedPlan.teacherSelfReflection}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Review Actions Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-3 py-1.5 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadLessonPlanPDF(selectedPlan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs cursor-pointer"
                  title="Download 3-Page Primary CBE Lesson Plan as PDF"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Download 3-Page PDF</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isTeacher && (!selectedPlan.status || selectedPlan.status === 'DRAFT' || selectedPlan.status === 'REJECTED') && (
                  <button
                    onClick={() => handleSubmitLessonPlan(selectedPlan.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    <span>Submit for Approval</span>
                  </button>
                )}
                {isApprover && (
                  <>
                    {selectedPlan.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReviewLessonPlan(selectedPlan.id, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        <span>Request Revision</span>
                      </button>
                    )}
                    {selectedPlan.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleReviewLessonPlan(selectedPlan.id, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>Approve Plan</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSchemeModal
        isOpen={isCreateSchemeOpen}
        onClose={() => setIsCreateSchemeOpen(false)}
        onSchemeCreated={() => loadCurriculum()}
      />

      <CreateLessonPlanModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        onPlanCreated={() => loadCurriculum()}
      />

      {/* On-screen Scheme of Work Matrix Modal */}
      <ViewSchemeModal
        scheme={selectedScheme}
        onClose={() => setSelectedScheme(null)}
        onDownloadPDF={downloadSchemePDF}
        onSubmitForReview={handleSubmitScheme}
        onApproveScheme={handleApproveScheme}
        isApprover={isApprover}
      />
    </div>
  );
};
