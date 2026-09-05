import React, { useState, useEffect } from 'react';
import { Student } from '../../types';

interface ReportCardsViewProps {
  students: Student[];
  selectedStudent?: Student;
}

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({
  students = [],
  selectedStudent: initialStudent,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialStudent ? initialStudent.id : (students && students.length > 0 ? students[0].id : '')
  );

  useEffect(() => {
    if (initialStudent) {
      setSelectedId(initialStudent.id);
    }
  }, [initialStudent]);

  const student = (students || []).find((s) => s.id === selectedId) || initialStudent || students?.[0];

  const handlePrint = () => {
    window.print();
  };

  if (!student) return null;

  const subjectEvaluations = [
    {
      subject: 'Mathematics Activities',
      strands: 'Numbers, Measurement, Geometry, Data Handling',
      rubric: student.cbcRating === 'BE' ? 'AE' : 'EE',
      remarks: 'Demonstrates deep conceptual understanding and precision in mathematical calculations.',
    },
    {
      subject: 'English Language Activities',
      strands: 'Listening, Speaking, Reading Comprehension, Writing',
      rubric: student.cbcRating === 'AE' ? 'AE' : 'ME',
      remarks: 'Expresses ideas fluently in discussions and produces well-structured creative compositions.',
    },
    {
      subject: 'Kiswahili Lugha na Shughuli',
      strands: 'Kusikiliza, Kuzungumza, Kusoma kwa Ufahamu, Kuandika',
      rubric: 'ME',
      remarks: 'Ana uwezo mzuri wa kutumia msamiati sahihi na kufuata kanuni za sarufi.',
    },
    {
      subject: 'Science & Technology',
      strands: 'Living Things, Matter, Simple Machines, Digital Environment',
      rubric: student.cbcRating === 'EE' ? 'EE' : 'ME',
      remarks: 'Excels in scientific inquiry, experimentation, and applying technology tools.',
    },
    {
      subject: 'Agriculture & Nutrition',
      strands: 'Crop Production, Kitchen Gardening, Food Hygiene',
      rubric: 'ME',
      remarks: 'Active participant in school farm projects and demonstrates strong awareness of nutrition.',
    },
    {
      subject: 'Creative Arts & Sports',
      strands: 'Visual Arts, Music, Physical Education & Movement',
      rubric: 'EE',
      remarks: 'Highly skilled in fine art illustration, vocal expression, and athletics team coordination.',
    },
    {
      subject: 'Social Studies & Religious Education',
      strands: 'Community, Natural Environment, Resources, Moral Values',
      rubric: 'ME',
      remarks: 'Demonstrates solid civic knowledge and upholds positive ethical standards.',
    },
  ];

  const getRubricBadge = (rubric: string) => {
    switch (rubric) {
      case 'EE':
        return <span className="px-2 py-0.5 rounded bg-secondary text-white font-bold text-xs">EE</span>;
      case 'ME':
        return <span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-xs">ME</span>;
      case 'AE':
        return <span className="px-2 py-0.5 rounded bg-amber-700 text-white font-bold text-xs">AE</span>;
      case 'BE':
        return <span className="px-2 py-0.5 rounded bg-error text-white font-bold text-xs">BE</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-xs">ME</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBC Competencies</span>
            <span>/</span>
            <span className="text-primary font-semibold">CBC Report Cards</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBC Learner Progress Report
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Compliant with Kenya Ministry of Education & KNEC Summative CBA Standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-2 px-3 text-xs font-semibold text-on-surface shadow-xs"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.admNo} - {s.grade})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* Official CBC Printable Report Card Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/40 max-w-4xl mx-auto space-y-6 text-on-surface">
        {/* Ministry & School Header */}
        <div className="text-center border-b-2 border-primary pb-5">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[32px]">school</span>
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-secondary uppercase tracking-widest">
                REPUBLIC OF KENYA · MINISTRY OF EDUCATION
              </div>
              <h2 className="text-2xl font-bold text-primary tracking-tight leading-tight">HILLSIDE ACADEMY</h2>
              <div className="text-xs text-on-surface-variant font-medium">
                P.O. BOX 48210 - 00100, NAIROBI · TEL: +254 712 345 678
              </div>
            </div>
          </div>
          <div className="mt-2 inline-block px-4 py-1 bg-surface-container rounded-full text-xs font-bold text-primary uppercase tracking-wider">
            CBC Learner Summative Performance Report · Term 1, 2024
          </div>
        </div>

        {/* Learner Particulars Box */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Learner Name:</span>
            <div className="font-bold text-on-surface text-sm mt-0.5">{student.name}</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Admission No:</span>
            <div className="font-bold font-data-mono text-primary text-sm mt-0.5">{student.admNo}</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">MoE UPI:</span>
            <div className="font-bold font-data-mono text-on-surface text-sm mt-0.5">{student.upi}</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Class & Stream:</span>
            <div className="font-bold text-on-surface text-sm mt-0.5">
              {student.grade} {student.stream}
            </div>
          </div>

          <div>
            <span className="text-on-surface-variant uppercase font-medium">Class Attendance:</span>
            <div className="font-bold text-secondary text-sm mt-0.5">{student.attendanceRate}%</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Class Teacher:</span>
            <div className="font-semibold text-on-surface text-sm mt-0.5">Tr. Sarah Mwangi</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Term Closing:</span>
            <div className="font-semibold text-on-surface text-sm mt-0.5">5th April 2024</div>
          </div>
          <div>
            <span className="text-on-surface-variant uppercase font-medium">Next Term Opens:</span>
            <div className="font-semibold text-on-surface text-sm mt-0.5">29th April 2024</div>
          </div>
        </div>

        {/* CBC Assessment Rubric Matrix */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              Learning Areas Competency Matrix
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-on-surface-variant">
              <span>EE = Exceeding</span>
              <span>·</span>
              <span>ME = Meeting</span>
              <span>·</span>
              <span>AE = Approaching</span>
              <span>·</span>
              <span>BE = Below</span>
            </div>
          </div>

          <div className="border border-outline-variant/30 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
                <tr>
                  <th className="py-2.5 px-3 w-1/4">Learning Area</th>
                  <th className="py-2.5 px-3 w-1/4">Competency Strands Assessed</th>
                  <th className="py-2.5 px-3 text-center w-16">Level</th>
                  <th className="py-2.5 px-3">Formative Remarks & Recommendations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {subjectEvaluations.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/30">
                    <td className="py-2.5 px-3 font-semibold text-on-surface">{sub.subject}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant">{sub.strands}</td>
                    <td className="py-2.5 px-3 text-center">{getRubricBadge(sub.rubric)}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">{sub.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KICD Core Competencies & Values Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2 text-xs">
            <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">
              KICD Core Competencies
            </h4>
            <div className="flex justify-between">
              <span>Communication & Collaboration:</span>
              <span className="font-bold text-secondary">Exceeding (EE)</span>
            </div>
            <div className="flex justify-between">
              <span>Critical Thinking & Problem Solving:</span>
              <span className="font-bold text-primary">Meeting (ME)</span>
            </div>
            <div className="flex justify-between">
              <span>Creativity & Imagination:</span>
              <span className="font-bold text-secondary">Exceeding (EE)</span>
            </div>
            <div className="flex justify-between">
              <span>Digital Literacy & Innovation:</span>
              <span className="font-bold text-primary">Meeting (ME)</span>
            </div>
            <div className="flex justify-between">
              <span>Self-Efficacy & Leadership:</span>
              <span className="font-bold text-primary">Meeting (ME)</span>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2 text-xs">
            <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">
              Values Assessment & Character Index
            </h4>
            <div className="flex justify-between">
              <span>Integrity & Honesty:</span>
              <span className="font-bold text-primary">4.8 / 5.0</span>
            </div>
            <div className="flex justify-between">
              <span>Respect & Courtesy:</span>
              <span className="font-bold text-primary">4.6 / 5.0</span>
            </div>
            <div className="flex justify-between">
              <span>Patriotism & Civic Duty:</span>
              <span className="font-bold text-primary">4.9 / 5.0</span>
            </div>
            <div className="flex justify-between">
              <span>Responsibility & Care:</span>
              <span className="font-bold text-secondary">5.0 / 5.0</span>
            </div>
            <div className="flex justify-between">
              <span>Co-curricular Activity:</span>
              <span className="font-semibold text-on-surface">Athletics & Scouting</span>
            </div>
          </div>
        </div>

        {/* Remarks and Sign-off */}
        <div className="pt-4 border-t border-outline-variant/30 space-y-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-on-surface">
              <span>Class Teacher's Remarks:</span>
              <span className="text-secondary font-bold">Tr. Sarah Mwangi</span>
            </div>
            <p className="italic text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg">
              "{student.name} is an exemplary learner with exceptional curiosity and disciplined peer engagement. Continues to make commendable strides across all learning strands."
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-3">
            <div>
              <div className="font-semibold text-on-surface">Maina Kamau</div>
              <div className="text-on-surface-variant text-[11px]">Principal Administrator, Hillside Academy</div>
              <div className="text-outline text-[10px] font-data-mono mt-0.5">TSC NO: 391024 · Date: 05/03/2024</div>
            </div>

            <div className="text-center p-3 rounded-xl bg-secondary-container/40 border border-secondary/30">
              <div className="text-secondary font-bold text-xs uppercase tracking-wider">
                MoE CBC OFFICIAL DIGITAL SEAL
              </div>
              <div className="text-on-secondary-container font-data-mono text-[10px] mt-0.5">
                VALIDATED ON KNEC CBA PORTAL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
