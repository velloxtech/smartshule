import React, { useState } from 'react';

export interface BookItem {
  learningArea: string;
  bookTitle: string;
  publisher: string;
  authors?: string;
}

export interface StationeryItem {
  item: string;
  quantity: string;
  notes?: string;
}

export interface GradeRequirement {
  id: string;
  label: string;
  sublabel: string;
  badge: string;
  color: string;
  workbooks: BookItem[];
  stationeries: StationeryItem[];
  schoolStoreItems: { item: string; price: number; notes?: string }[];
}

export const GRACE_SEEDS_REQUIREMENTS: GradeRequirement[] = [
  {
    id: 'pg_pp1',
    label: 'Playgroup & PP1',
    sublabel: 'Pre-Primary Foundation (Ages 3 - 4)',
    badge: 'Pre-Primary',
    color: 'emerald',
    workbooks: [
      { learningArea: 'Language Activities', bookTitle: 'Language Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Mathematics Activities', bookTitle: 'Mathematics Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Environmental Activities', bookTitle: 'Environmental Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Psychomotor Activities', bookTitle: 'Psychomotor Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Creative Activities', bookTitle: 'Creative Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Religious Activities', bookTitle: 'Religious Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Music and Movement', bookTitle: 'Music & Movement Activities Workbook', publisher: 'Queenex' },
    ],
    stationeries: [
      { item: 'Economic Superior Exercise books 96pgs (1/2 inch)', quantity: '5 pcs', notes: '1pc square line, 4pcs single line' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'Annual supply' },
      { item: 'Jumbo Crayons (Accord or Nucleus)', quantity: '2 pkts', notes: 'Non-toxic, break-resistant' },
      { item: 'Modelling Clay 500g (Nucleus)', quantity: '1 bar', notes: 'For psychomotor sensory development' },
      { item: 'Sharpener (Nucleus) & Dust Free Eraser', quantity: '2 sharpeners, 1 eraser', notes: 'Dust-free quality' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs', notes: 'Creative project work' },
      { item: 'Spring File', quantity: '1 pc', notes: 'For student work portfolio' },
      { item: 'Tissue Paper', quantity: '3 pcs per term', notes: 'Hygiene & personal care' },
      { item: 'Luxor Permanent Marker Pen', quantity: '2 pcs', notes: 'Labelling learner personal items' },
    ],
    schoolStoreItems: [
      { item: 'Official School Diary', price: 250, notes: 'Daily communication & sign-offs' },
      { item: 'Assessment Book', price: 300, notes: 'Termly progress evaluations' },
      { item: 'Track Suit / T-Shirt', price: 2100, notes: 'Physical education & school activities' },
    ],
  },
  {
    id: 'pp2',
    label: 'PP2',
    sublabel: 'Pre-Primary Transition (Age 5)',
    badge: 'Pre-Primary',
    color: 'emerald',
    workbooks: [
      { learningArea: 'Phonics & Literacy', bookTitle: 'Sound and Read Book 1', publisher: 'Queenex / Approved' },
      { learningArea: 'Language Activities', bookTitle: 'Language Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Mathematics Activities', bookTitle: 'Mathematics Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Environmental Activities', bookTitle: 'Environmental Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Psychomotor Activities', bookTitle: 'Psychomotor Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Creative Activities', bookTitle: 'Creative Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Religious Activities', bookTitle: 'Religious Activities Workbook', publisher: 'Queenex' },
      { learningArea: 'Music and Movement', bookTitle: 'Music & Movement Activities Workbook', publisher: 'Queenex' },
    ],
    stationeries: [
      { item: 'Economic Superior Exercise books 96pgs (A5 size)', quantity: '5 pcs', notes: '1pc square line, 4pcs single line' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'Annual supply' },
      { item: 'Jumbo Crayons (Accord or Nucleus)', quantity: '2 pkts', notes: 'Non-toxic, break-resistant' },
      { item: 'Modelling Clay 500g (Nucleus)', quantity: '1 bar', notes: 'Motor skills development' },
      { item: 'Sharpener (Nucleus) & Dust Free Eraser', quantity: '2 sharpeners, 1 eraser', notes: 'Nucleus brand' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs', notes: 'Colourful project work' },
      { item: 'Spring File', quantity: '1 pc', notes: 'Learner dossier filing' },
      { item: 'Tissue Paper', quantity: '3 pcs per term', notes: 'Hygiene & personal care' },
      { item: 'Luxor Permanent Marker Pen', quantity: '2 pcs', notes: 'Name tagging' },
    ],
    schoolStoreItems: [
      { item: 'Official School Diary', price: 250, notes: 'Daily communication' },
      { item: 'Assessment Book', price: 300, notes: 'Pre-primary exit evaluations' },
      { item: 'Track Suit / T-Shirt', price: 2100, notes: 'Games uniform' },
    ],
  },
  {
    id: 'g1',
    label: 'Grade 1',
    sublabel: 'Lower Primary CBC Foundation',
    badge: 'Lower Primary',
    color: 'sky',
    workbooks: [
      { learningArea: 'Mathematics Activities', bookTitle: "Let's Do Mathematics Activities G1", publisher: 'Oxford', authors: "C. Kayiopi, M. Ng'ang'a, B. Awuor, P. Kahoro, M. Aketch" },
      { learningArea: 'Indigenous Language', bookTitle: 'Native Activities G1', publisher: 'Storymoja', authors: 'M. Achikholwa, S. Wacharo, I. Njengu, W. Kiritu (KICD 2024)' },
      { learningArea: 'English Activities', bookTitle: 'New Progression Primary English Activities', publisher: 'Oxford', authors: 'L. Kariuki, E. Ndua, E. Sore, B. Malandi' },
      { learningArea: 'Religious Education', bookTitle: 'Growing in Christ (CRE Activities)', publisher: 'Oxford', authors: 'H. Onyango, L. Wachira, J. Watitu, D. Rutere, G. Afogoh' },
      { learningArea: 'Kiswahili Activities', bookTitle: 'Kiswahili Dadisi G1', publisher: 'Oxford / KLB' },
      { learningArea: 'Environmental Activities', bookTitle: 'Environmental Activities G1', publisher: 'Storymoja' },
    ],
    stationeries: [
      { item: 'Economic Superior Exercise books 120pg A5', quantity: '10 pcs', notes: '2pcs square line, 8pcs single line' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'Yearly' },
      { item: 'Sharpener (Nucleus) & Dust Free Eraser', quantity: '2 sharpeners, 1 eraser' },
      { item: 'Water Colour Cake (Nucleus)', quantity: '1 pkt', notes: 'Creative arts' },
      { item: 'Jumbo Crayons (Accord or Nucleus)', quantity: '2 pkts' },
      { item: 'Modelling Clay 500g (Nucleus)', quantity: '1 bar' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs' },
      { item: 'Spring File', quantity: '1 pc' },
      { item: 'Tissue Paper', quantity: '3 pcs per term' },
      { item: '30cm Transparent Ruler', quantity: '1 pc' },
      { item: 'Luxor Permanent Marker Pen', quantity: '2 pcs' },
      { item: 'Luxor Inkglide Biro Pens', quantity: '3 pcs', notes: '2 blue pens, 1 black pen' },
    ],
    schoolStoreItems: [
      { item: 'School Diary', price: 250 },
      { item: 'Assessment Book', price: 300 },
      { item: 'Track Suit / T-Shirt', price: 2100 },
    ],
  },
  {
    id: 'g2_g3',
    label: 'Grade 2 & Grade 3',
    sublabel: 'Lower Primary CBC Core',
    badge: 'Lower Primary',
    color: 'sky',
    workbooks: [
      { learningArea: 'Mathematics Activities', bookTitle: 'Mathematics - Oxford (G2/G3)', publisher: 'Oxford', authors: "C. Kayiopi, M. Ng'ang'a, B. Awuor, P. Kahoro, M. Aketch" },
      { learningArea: 'English Activities', bookTitle: 'New Progressive Primary English (Revised Edition)', publisher: 'Oxford', authors: 'L. Kariuki, E. Ndua, E. Sore, B. Malandi' },
      { learningArea: 'Kiswahili Activities', bookTitle: 'Toleo Jipya - Kiswahili Dadisi', publisher: 'Oxford', authors: 'J. Ndege, P. Koza, F. Waititu, Z. Mucheria' },
      { learningArea: 'Religious Education', bookTitle: 'Growing in Christ (CRE Activities)', publisher: 'Oxford', authors: 'H. Onyango, L. Wachira, J. Watitu, D. Rutere, G. Afogoh' },
      { learningArea: 'Environmental Activities', bookTitle: 'Environmental Activities (Rationalised)', publisher: 'KLB' },
      { learningArea: 'Creative Activities', bookTitle: 'Movement and Creative Activities (Rationalised)', publisher: 'KLB' },
    ],
    stationeries: [
      { item: 'Economic Superior Exercise books 120pg A5', quantity: '10 pcs', notes: '2pcs square line, 8pcs single line' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'Yearly' },
      { item: 'Sharpener (Nucleus) & Dust Free Eraser', quantity: '2 sharpeners, 1 eraser' },
      { item: 'Water Colour Cake (Nucleus)', quantity: '1 pkt' },
      { item: 'Jumbo Crayons (Accord or Nucleus)', quantity: '2 pkts' },
      { item: 'Modelling Clay 500g (Nucleus)', quantity: '1 bar' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs' },
      { item: 'Spring File', quantity: '1 pc' },
      { item: 'Tissue Paper', quantity: '3 pcs per term' },
      { item: '30cm Clear Ruler', quantity: '1 pc' },
      { item: 'Luxor Permanent Marker Pen', quantity: '2 pcs' },
      { item: 'Luxor Inkglide Biro Pens', quantity: '3 pcs', notes: '2 blue pens, 1 black pen' },
    ],
    schoolStoreItems: [
      { item: 'School Diary', price: 250 },
      { item: 'Assessment Book', price: 300 },
      { item: 'Track Suit / T-Shirt', price: 2100 },
    ],
  },
  {
    id: 'g4_g5',
    label: 'Grade 4 & Grade 5',
    sublabel: 'Upper Primary CBC Intermediate',
    badge: 'Upper Primary',
    color: 'amber',
    workbooks: [
      { learningArea: 'Social Studies', bookTitle: 'Social Studies Our Lives Today', publisher: 'Oxford', authors: 'Cephas Kamau, Maryclaire Indire' },
      { learningArea: 'Christian Religious Education', bookTitle: 'Growing in Christ CRE', publisher: 'Oxford', authors: 'Hezron Onyango, Jesse Watiki' },
      { learningArea: 'Creative Arts', bookTitle: 'Visionary Art and Craft', publisher: 'KLB', authors: 'Elizabeth Kiama, Okemba S. Lore' },
      { learningArea: 'Mathematics', bookTitle: 'Visionary Mathematics', publisher: 'KLB', authors: 'O. Kiburi, S. Laumbi, Z. Muli, F. Mwangi' },
      { learningArea: 'Kiswahili', bookTitle: 'Kiswahili Dadisi', publisher: 'KLB', authors: 'J. Ndegu, P. Kea, E. Osoro, Z. Mucheria' },
      { learningArea: 'English', bookTitle: 'Visionary English', publisher: 'KLB', authors: 'Dr. P. Mwangi, M. Mukunga, C. Gecaga' },
      { learningArea: 'Agriculture & Nutrition', bookTitle: 'Visionary Agriculture & Home Science', publisher: 'KLB', authors: 'F. Muthua, E. Misiko, A. Wachira, J. Ndungu, K. Nyanumba, L. Nyamu, T. Orwa' },
      { learningArea: 'Science and Technology', bookTitle: 'Visionary Science and Technology', publisher: 'KLB', authors: 'A. Kihugu, F. Munene, M. Aludo, P. Wainaina, L. Maundu, I. Mwendwa, C. Ayadi' },
    ],
    stationeries: [
      { item: 'A4 Economic Superior Exercise Books 120pgs', quantity: '12 pcs', notes: '2pcs square line, 10pcs single line' },
      { item: 'Drawing Book (Economic Superior)', quantity: '1 pc', notes: 'Creative Arts practicals' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'Yearly' },
      { item: 'Sharpener & Dust Free Eraser (Nucleus)', quantity: '2 sharpeners, 1 eraser' },
      { item: 'Graph Book (Economic Superior)', quantity: '1 pc', notes: 'Mathematics & Science plotting' },
      { item: '30cm Clear Ruler & Geometrical Set', quantity: '1 set', notes: 'Oxford or Helix geometric set' },
      { item: 'Luxor Inkglide Biro Pens', quantity: '5 pcs', notes: '3 blue, 1 black, 1 red' },
      { item: 'Water Colour Cake (Nucleus)', quantity: '1 pkt' },
      { item: 'Long Colour Pencils (Accord or Nucleus)', quantity: '1 pkt' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs' },
      { item: 'Tissue Paper', quantity: '3 pcs per term' },
    ],
    schoolStoreItems: [
      { item: 'School Diary', price: 250 },
      { item: 'Assessment Book', price: 300 },
      { item: 'Track Suit / T-Shirt', price: 2100 },
    ],
  },
  {
    id: 'g6',
    label: 'Grade 6',
    sublabel: 'KPSEA Summative Candidate Class',
    badge: 'Upper Primary (KPSEA)',
    color: 'rose',
    workbooks: [
      { learningArea: 'Social Studies', bookTitle: 'Social Studies Our Lives Today (G6)', publisher: 'Oxford', authors: 'C. Kamau, M. Indire, H. Cururu, G. Gitonga' },
      { learningArea: 'Christian Religious Education', bookTitle: 'Growing in Christ CRE - Oxford', publisher: 'Oxford', authors: 'H. Onyango, J. Watiki, D. Rutere' },
      { learningArea: 'Creative Arts', bookTitle: 'Visionary Art and Craft', publisher: 'Mentor' },
      { learningArea: 'Mathematics', bookTitle: 'Visionary Mathematics G6', publisher: 'KLB', authors: 'O. Kiburi, S. Laumbi, Z. Muli, F. Mwangi' },
      { learningArea: 'Kiswahili', bookTitle: 'Kiswahili Dadisi G6', publisher: 'KLB', authors: 'J. Ndegu, P. Kea, E. Osoro, Z. Mucheria' },
      { learningArea: 'English', bookTitle: 'English Learners Book', publisher: 'Longhorn' },
      { learningArea: 'Agriculture & Nutrition', bookTitle: 'Everyday Home Science / Visionary Agriculture', publisher: 'Oxford / KLB', authors: 'P. Njotoge, E. Ireri, M. Karanja, J. Owuye' },
    ],
    stationeries: [
      { item: 'A4 Economic Superior Exercise Books 120pgs', quantity: '12 pcs', notes: '2pcs square line, 10pcs single line' },
      { item: 'Drawing Book (Economic Superior)', quantity: '1 pc' },
      { item: 'HB Pencil (Accord or Nucleus)', quantity: '1 pkt', notes: 'KPSEA preparation' },
      { item: 'Sharpener & Dust Free Eraser (Nucleus)', quantity: '2 sharpeners, 1 eraser' },
      { item: 'Graph Book (Economic Superior)', quantity: '1 pc' },
      { item: '30cm Clear Ruler & Geometrical Set', quantity: '1 set' },
      { item: 'Luxor Inkglide Biro Pens', quantity: '5 pcs', notes: '3 blue, 1 black, 1 red' },
      { item: 'Water Colour Cake (Nucleus)', quantity: '1 pkt' },
      { item: 'Long Colour Pencils (Accord or Nucleus)', quantity: '1 pkt' },
      { item: 'Soft Luminous Paper (Nucleus)', quantity: '2 pcs' },
      { item: 'Tissue Paper', quantity: '3 pcs per term' },
    ],
    schoolStoreItems: [
      { item: 'School Diary', price: 250 },
      { item: 'Assessment Book', price: 300 },
      { item: 'Track Suit / T-Shirt', price: 2100 },
    ],
  },
];

interface StationeryRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGradeId?: string;
}

export const StationeryRequirementsModal: React.FC<StationeryRequirementsModalProps> = ({
  isOpen,
  onClose,
  initialGradeId = 'pg_pp1',
}) => {
  const [selectedGradeId, setSelectedGradeId] = useState(initialGradeId);
  const selectedReq = GRACE_SEEDS_REQUIREMENTS.find((r) => r.id === selectedGradeId) || GRACE_SEEDS_REQUIREMENTS[0];

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Grace Seeds School - Requirements List - ${selectedReq.label}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.3; font-size: 11px; margin: 0; padding: 15px; }
    .header { text-align: center; border-bottom: 2px solid #800000; padding-bottom: 8px; margin-bottom: 12px; }
    .school-title { font-size: 20px; font-weight: 900; color: #800000; margin: 0; text-transform: uppercase; }
    .meta { font-size: 10px; color: #555; margin: 2px 0; }
    .motto { font-size: 11px; font-style: italic; color: #800000; font-weight: bold; margin-top: 2px; }
    .title-banner { background: #800000; color: #fff; padding: 6px 12px; font-size: 13px; font-weight: bold; text-align: center; margin: 10px 0; border-radius: 4px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5px; }
    th, td { border: 1px solid #777; padding: 5px 8px; text-align: left; }
    th { background: #fce8ec; color: #800000; font-weight: bold; text-transform: uppercase; }
    .section-title { font-size: 12px; font-weight: bold; color: #800000; text-transform: uppercase; margin: 10px 0 5px; border-bottom: 1px solid #800000; padding-bottom: 2px; }
    .footer { margin-top: 20px; border-top: 1px dashed #800000; padding-top: 8px; font-size: 10px; color: #444; display: flex; justify-content: space-between; }
    .paybill { background: #fdf2f4; border: 1.5px solid #800000; padding: 8px; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="school-title">GRACE SEEDS SCHOOL</h1>
    <div class="meta">P.O. BOX 12-20123 / 12-40123 KISUMU · Tel: 0745436312 · Email: schoolgraceseeds@gmail.com</div>
    <div class="motto">&quot;The Future Begins Here&quot;</div>
  </div>

  <div class="title-banner">
    Official Requirements List &amp; Booklist 2027 — ${selectedReq.label.toUpperCase()}
  </div>

  <div class="section-title">1. Approved Textbooks &amp; Learners Workbooks</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Learning Area</th>
        <th style="width: 45%;">Workbook / Textbook Title</th>
        <th style="width: 15%;">Publisher</th>
        <th style="width: 15%;">Authors / Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${selectedReq.workbooks.map((b) => `
        <tr>
          <td><strong>${b.learningArea}</strong></td>
          <td>${b.bookTitle}</td>
          <td><span style="font-weight: 600; color: #800000;">${b.publisher}</span></td>
          <td>${b.authors || 'KICD Approved'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">2. Mandatory Stationery &amp; Practical Supplies</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Stationery Item</th>
        <th style="width: 20%;">Quantity Required</th>
        <th style="width: 30%;">Specifications &amp; Brand</th>
      </tr>
    </thead>
    <tbody>
      ${selectedReq.stationeries.map((s) => `
        <tr>
          <td><strong>${s.item}</strong></td>
          <td><span style="font-weight: bold; color: #047857;">${s.quantity}</span></td>
          <td>${s.notes || 'As indicated'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">3. Items Available in School Store</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Item Description</th>
        <th style="width: 25%;">Amount (KES)</th>
        <th style="width: 25%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${selectedReq.schoolStoreItems.map((item) => `
        <tr>
          <td><strong>${item.item}</strong></td>
          <td><strong>KES ${item.price.toLocaleString()}</strong></td>
          <td>${item.notes || 'Available at School Office'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="paybill">
    <strong>MODE OF PAYMENT:</strong><br/>
    M-PESA PAYBILL: <strong>522533</strong> &nbsp;|&nbsp; ACCOUNT NO: <strong>8048859# &lt;LEARNER'S NAME AND GRADE&gt;</strong>
  </div>

  <div class="footer">
    <div>Grace Seeds School · Kisumu County</div>
    <div>Official Ratified Requirement Dossier</div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grace_Seeds_Requirements_${selectedReq.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-950 via-[#800000] to-rose-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white text-xl">menu_book</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Grace Seeds School — Requirement Lists &amp; Booklists
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                  2027 Schedule
                </span>
              </div>
              <p className="text-xs text-rose-200">
                P.O. Box 12-20123 / 12-40123 Kisumu · Tel: 0745436312 · &quot;The Future Begins Here&quot;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportHTML}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1 border border-white/20"
              title="Download standalone HTML document for printing"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="hidden sm:inline">Export HTML</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white text-[#800000] hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1 shadow-sm"
              title="Print Requirements List"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Grade Category Pills */}
        <div className="px-5 py-3 bg-surface-container-low border-b border-outline/10 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {GRACE_SEEDS_REQUIREMENTS.map((r) => {
            const isSelected = r.id === selectedGradeId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedGradeId(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#800000] text-white shadow-sm ring-2 ring-[#800000]/30'
                    : 'bg-surface text-on-surface hover:bg-surface-container-high border border-outline/20'
                }`}
              >
                <span>{r.label}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {r.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-on-surface">
          {/* Active Grade Title Card */}
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-[#800000]">{selectedReq.label}</h4>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#800000] text-white">
                  {selectedReq.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{selectedReq.sublabel}</p>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-rose-200 text-xs text-gray-700 shadow-sm">
              <span className="font-semibold text-gray-900">M-Pesa Paybill:</span> <strong className="text-[#800000]">522533</strong><br/>
              <span className="font-semibold text-gray-900">Account:</span> <span className="font-mono text-xs">8048859# [LEARNER NAME]</span>
            </div>
          </div>

          {/* 1. Approved Textbooks & Workbooks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">1</span>
                <h5 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                  Approved Workbooks &amp; Textbooks ({selectedReq.workbooks.length})
                </h5>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Standard KICD Ratified Curriculum</span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 uppercase text-[11px] font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3">Learning Area</th>
                    <th className="py-2.5 px-3">Book / Workbook Title</th>
                    <th className="py-2.5 px-3">Publisher</th>
                    <th className="py-2.5 px-3">Authors / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedReq.workbooks.map((b, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2 px-3 font-bold text-gray-900">{b.learningArea}</td>
                      <td className="py-2 px-3 text-gray-800">{b.bookTitle}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#800000] border border-rose-200">
                          {b.publisher}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{b.authors || 'Approved Text'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Stationeries & Practical Supplies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">2</span>
                <h5 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                  Required Stationeries &amp; Supplies ({selectedReq.stationeries.length})
                </h5>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Daily Learner Materials</span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 uppercase text-[11px] font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3">Stationery Item</th>
                    <th className="py-2.5 px-3">Quantity Required</th>
                    <th className="py-2.5 px-3">Specification / Brand Recommended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedReq.stationeries.map((s, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-gray-900">{s.item}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {s.quantity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{s.notes || 'Recommended quality'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Items Available in School Store */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">3</span>
                <h5 className="font-black text-sm text-gray-900 uppercase tracking-wide">
                  Available in School Office / Store
                </h5>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Standardized Official Items</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedReq.schoolStoreItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-purple-50/40 border border-purple-200 flex flex-col justify-between">
                  <div>
                    <h6 className="font-bold text-xs text-purple-950">{item.item}</h6>
                    <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-purple-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">Official Rate</span>
                    <strong className="text-sm font-black text-purple-900">KES {item.price.toLocaleString()}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-surface-container-low border-t border-outline/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="material-symbols-outlined text-sm text-[#800000]">verified</span>
            <span>Ratified for <strong>Grace Seeds School</strong> (Kisumu County)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
