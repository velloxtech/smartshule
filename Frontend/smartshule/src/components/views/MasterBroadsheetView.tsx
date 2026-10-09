import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { BroadsheetResult, ClassRoom, StreamItem } from '../../types';

export const MasterBroadsheetView: React.FC = () => {
 const [classes, setClasses] = useState<ClassRoom[]>([]);
 const [streams, setStreams] = useState<StreamItem[]>([]);
 const [selectedClassId, setSelectedClassId] = useState<string>('');
 const [selectedStreamId, setSelectedStreamId] = useState<string>('');
 const [selectedTerm, setSelectedTerm] = useState<string>('Term 3');
 const [selectedYear, setSelectedYear] = useState<string>('2026');

 const [broadsheet, setBroadsheet] = useState<BroadsheetResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Load Classes & Streams
 useEffect(() => {
 const initClasses = async () => {
 try {
 const res = await apiService.getClasses();
 if (res?.success && res.data && res.data.length > 0) {
 setClasses(res.data);
 const firstClass = res.data[0];
 setSelectedClassId(firstClass.id);

 const sRes = await apiService.getStreamsByClass(firstClass.id);
 if (sRes?.success && sRes.data && sRes.data.length > 0) {
 setStreams(sRes.data);
 setSelectedStreamId(sRes.data[0].id);
 } else {
 // Default stream id
 setSelectedStreamId(firstClass.id);
 }
 } else {
 // Fallback demo classes
 setSelectedStreamId('stream-demo-1');
 }
 } catch (err) {
 console.error('Error fetching classes:', err);
 setSelectedStreamId('stream-demo-1');
 }
 };
 initClasses();
 }, []);

 // When class changes, update streams
 const handleClassChange = async (classId: string) => {
 setSelectedClassId(classId);
 try {
 const sRes = await apiService.getStreamsByClass(classId);
 if (sRes?.success && sRes.data && sRes.data.length > 0) {
 setStreams(sRes.data);
 setSelectedStreamId(sRes.data[0].id);
 } else {
 setStreams([]);
 setSelectedStreamId(classId);
 }
 } catch {
 setStreams([]);
 setSelectedStreamId(classId);
 }
 };

 const fetchBroadsheetData = async (streamIdToFetch: string) => {
 if (!streamIdToFetch) return;
 setLoading(true);
 setError(null);
 try {
 const res = await apiService.getStreamBroadsheet(streamIdToFetch, selectedTerm, selectedYear);
 if (res?.success && res.data) {
 setBroadsheet(res.data);
 } else {
 setError(res?.message || 'Failed to generate broadsheet.');
 }
 } catch (err: any) {
 setError(err?.message || 'Error communicating with broadsheet service.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (selectedStreamId) {
 fetchBroadsheetData(selectedStreamId);
 }
 }, [selectedStreamId, selectedTerm, selectedYear]);

 // Overall Performance Level counts
 const overallStats = useMemo(() => {
 if (!broadsheet || !broadsheet.rows) return { EE: 0, ME: 0, AE: 0, BE: 0 };
 const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
 broadsheet.rows.forEach((r) => {
 const lvl = r.overallPerformanceLevel?.toUpperCase();
 if (lvl?.includes('EXCEED') || lvl === 'EE') counts.EE++;
 else if (lvl?.includes('MEET') || lvl === 'ME') counts.ME++;
 else if (lvl?.includes('APPROACH') || lvl === 'AE') counts.AE++;
 else if (lvl?.includes('BELOW') || lvl === 'BE') counts.BE++;
 else counts.ME++;
 });
 return counts;
 }, [broadsheet]);

 const handlePrint = () => {
 window.print();
 };

 const handleExportCSV = () => {
 if (!broadsheet || !broadsheet.rows) return;
 const headers = ['Rank', 'Adm No', 'Student Name', 'Gender'];
 broadsheet.learningAreas.forEach((la) => {
 headers.push(`${la.name} (Score)`, `${la.name} (Level)`);
 });
 headers.push('Total Score', 'Mean Score', 'Overall Level');

 const csvRows: string[] = [headers.join(',')];

 broadsheet.rows.forEach((r) => {
 const row: string[] = [
 String(r.rank),
 `"${r.admissionNumber || ''}"`,
 `"${r.studentName || ''}"`,
 `"${r.gender || ''}"`,
 ];

 broadsheet.learningAreas.forEach((la) => {
 const sub = r.subjects[la.id];
 row.push(sub ? String(sub.numericScore) : '0');
 row.push(sub ? `"${sub.levelLabel || sub.performanceLevel}"` : '"--"');
 });

 row.push(String(r.totalScore), String(r.averageScore), `"${r.overallPerformanceLevel}"`);
 csvRows.push(row.join(','));
 });

 const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `Broadsheet_${broadsheet.className}_${broadsheet.streamName}_${selectedTerm}_${selectedYear}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const getLevelBadge = (level: string) => {
 const l = level?.toUpperCase() || '';
 if (l.includes('EXCEED') || l === 'EE') {
 return (
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 ">
 EE
 </span>
 );
 }
 if (l.includes('MEET') || l === 'ME') {
 return (
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 ">
 ME
 </span>
 );
 }
 if (l.includes('APPROACH') || l === 'AE') {
 return (
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 ">
 AE
 </span>
 );
 }
 return (
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 ">
 BE
 </span>
 );
 };

 return (
 <div className="space-y-6">
 {/* Header Banner - Hidden in Print */}
 <div className="print:hidden bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
 <span className="material-symbols-outlined text-base">table_chart</span>
 Kenyan CBC / KPSEA / KJSEA Academic Evaluation
 </div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Master Stream Broadsheets</h1>
 <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
 Multi-subject side-by-side grade marksheet with raw scores, performance levels (EE, ME, AE, BE), aggregate points, and class rankings.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={handleExportCSV}
 disabled={!broadsheet || !broadsheet.rows.length}
 className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">download</span>
 Export CSV
 </button>
 <button
 onClick={handlePrint}
 disabled={!broadsheet || !broadsheet.rows.length}
 className="bg-white hover:bg-slate-100 disabled:opacity-50 text-indigo-950 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">print</span>
 Print Broadsheet
 </button>
 </div>
 </div>

 {/* Control Selector Bar - Hidden in Print */}
 <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-3">
 {/* Class Selector */}
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Class / Grade</label>
 <select
 value={selectedClassId}
 onChange={(e) => handleClassChange(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 "
 >
 {classes.length > 0 ? (
 classes.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))
 ) : (
 <>
 <option value="class-1">Grade 1</option>
 <option value="class-2">Grade 2</option>
 <option value="class-3">Grade 3</option>
 <option value="class-4">Grade 4</option>
 <option value="class-6">Grade 6 (KPSEA)</option>
 <option value="class-7">Grade 7 (KJSEA)</option>
 </>
 )}
 </select>
 </div>

 {/* Stream Selector */}
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Stream</label>
 <select
 value={selectedStreamId}
 onChange={(e) => setSelectedStreamId(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 "
 >
 {streams.length > 0 ? (
 streams.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name}
 </option>
 ))
 ) : (
 <>
 <option value="stream-alpha">Stream Alpha</option>
 <option value="stream-east">Stream East</option>
 <option value="stream-west">Stream West</option>
 </>
 )}
 </select>
 </div>

 {/* Term Selector */}
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Academic Term</label>
 <select
 value={selectedTerm}
 onChange={(e) => setSelectedTerm(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="Term 1">Term 1</option>
 <option value="Term 2">Term 2</option>
 <option value="Term 3">Term 3</option>
 </select>
 </div>

 {/* Year */}
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
 <select
 value={selectedYear}
 onChange={(e) => setSelectedYear(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="2026">2026</option>
 <option value="2025">2025</option>
 </select>
 </div>
 </div>

 <button
 onClick={() => fetchBroadsheetData(selectedStreamId)}
 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
 >
 <span className="material-symbols-outlined text-base">refresh</span>
 Recalculate Stream
 </button>
 </div>

 {/* KPI Performance Highlights */}
 {broadsheet && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <span className="text-xs font-medium text-slate-500">Stream Mean Score</span>
 <p className="text-2xl font-black text-indigo-600 mt-1">
 {broadsheet.streamMeanScore}%
 </p>
 <p className="text-xs text-slate-400 mt-1">{broadsheet.totalStudents} learners ranked</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <span className="text-xs font-medium text-slate-500">Exceeding Expectations (EE)</span>
 <p className="text-2xl font-black text-emerald-600 mt-1">
 {overallStats.EE}
 </p>
 <p className="text-xs text-slate-400 mt-1">
 {broadsheet.totalStudents ? Math.round((overallStats.EE / broadsheet.totalStudents) * 100) : 0}% of stream
 </p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <span className="text-xs font-medium text-slate-500">Meeting Expectations (ME)</span>
 <p className="text-2xl font-black text-blue-600 mt-1">
 {overallStats.ME}
 </p>
 <p className="text-xs text-slate-400 mt-1">
 {broadsheet.totalStudents ? Math.round((overallStats.ME / broadsheet.totalStudents) * 100) : 0}% of stream
 </p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <span className="text-xs font-medium text-slate-500">Intervention Needed (AE / BE)</span>
 <p className="text-2xl font-black text-amber-600 mt-1">
 {overallStats.AE + overallStats.BE}
 </p>
 <p className="text-xs text-slate-400 mt-1">
 AE: {overallStats.AE} | BE: {overallStats.BE}
 </p>
 </div>
 </div>
 )}

 {/* BROADSHEET REPORT CARD - Optimized for screen and paper print */}
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 print:border-none print:shadow-none print:p-0">
 {/* Printable Letterhead Header */}
 <div className="text-center border-b pb-4 mb-4">
 <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider">
 SMARTSHULE ACADEMY
 </h2>
 <p className="text-xs text-slate-500">Ministry of Education CBC Assessment Framework</p>
 <div className="mt-2 inline-flex items-center gap-4 text-xs font-bold text-indigo-900 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-200 ">
 <span>Class: {broadsheet?.className || 'Grade Level'}</span>
 <span>•</span>
 <span>Stream: {broadsheet?.streamName || 'Selected Stream'}</span>
 <span>•</span>
 <span>Term: {selectedTerm}</span>
 <span>•</span>
 <span>Year: {selectedYear}</span>
 </div>
 </div>

 {loading ? (
 <div className="p-16 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-4xl mb-3 text-indigo-600">progress_activity</span>
 <p className="font-medium">Aggregating stream marks and computing CBC broadsheet...</p>
 </div>
 ) : error ? (
 <div className="p-12 text-center text-rose-500">
 <span className="material-symbols-outlined text-4xl mb-2">error</span>
 <p className="font-semibold">{error}</p>
 </div>
 ) : !broadsheet || !broadsheet.rows.length ? (
 <div className="p-16 text-center">
 <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">table_rows</span>
 <p className="text-slate-600 font-medium">No marksheet records available for this stream.</p>
 <p className="text-xs text-slate-400 mt-1">Ensure student assessments have been entered in the CBC Formative & Summative module.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 ">
 <th className="p-2 border text-center w-12">Rank</th>
 <th className="p-2 border w-24">Adm No</th>
 <th className="p-2 border min-w-[160px]">Learner Full Name</th>
 <th className="p-2 border text-center w-12">Sex</th>

 {/* Dynamic Subjects */}
 {broadsheet.learningAreas.map((la) => (
 <th key={la.id} className="p-2 border text-center min-w-[90px]">
 <div className="font-bold text-[11px] truncate">{la.name}</div>
 <div className="text-[9px] text-slate-400 font-normal">Score / Lvl</div>
 </th>
 ))}

 <th className="p-2 border text-center w-20 bg-indigo-50/50 ">Total</th>
 <th className="p-2 border text-center w-16 bg-indigo-50/50 ">Mean</th>
 <th className="p-2 border text-center w-20 bg-indigo-50/50 ">Level</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200 ">
 {broadsheet.rows.map((row) => (
 <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
 <td className="p-2 border text-center font-bold font-mono">
 {row.rank === 1 ? '🥇 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : row.rank}
 </td>
 <td className="p-2 border font-mono text-[11px] text-slate-600 ">
 {row.admissionNumber}
 </td>
 <td className="p-2 border font-semibold text-slate-900 ">
 {row.studentName}
 </td>
 <td className="p-2 border text-center text-slate-500 font-medium">{row.gender?.[0] || 'M'}</td>

 {/* Subject Marks */}
 {broadsheet.learningAreas.map((la) => {
 const scoreObj = row.subjects[la.id];
 return (
 <td key={la.id} className="p-2 border text-center">
 {scoreObj ? (
 <div className="flex items-center justify-center gap-1">
 <span className="font-mono font-bold text-slate-900 ">
 {scoreObj.numericScore}%
 </span>
 {getLevelBadge(scoreObj.performanceLevel)}
 </div>
 ) : (
 <span className="text-slate-300 text-xs">--</span>
 )}
 </td>
 );
 })}

 <td className="p-2 border text-center font-mono font-bold text-slate-900 bg-indigo-50/30 ">
 {row.totalScore}
 </td>
 <td className="p-2 border text-center font-mono font-bold text-indigo-700 bg-indigo-50/30 ">
 {row.averageScore}%
 </td>
 <td className="p-2 border text-center bg-indigo-50/30 ">
 {getLevelBadge(row.overallPerformanceLevel)}
 </td>
 </tr>
 ))}

 {/* BOTTOM SUMMARY ROW 1: SUBJECT MEANS */}
 <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 ">
 <td colSpan={4} className="p-2.5 border text-right uppercase tracking-wider text-[11px] text-slate-700 ">
 Subject Stream Mean
 </td>
 {broadsheet.learningAreas.map((la) => {
 const sumObj = broadsheet.subjectSummaries.find((s) => s.learningAreaId === la.id);
 return (
 <td key={la.id} className="p-2 border text-center font-mono font-extrabold text-indigo-700 ">
 {sumObj?.averageScore ? `${sumObj.averageScore}%` : '--'}
 </td>
 );
 })}
 <td colSpan={3} className="p-2 border text-center font-mono font-black text-indigo-900 ">
 {broadsheet.streamMeanScore}% Mean
 </td>
 </tr>

 {/* BOTTOM SUMMARY ROW 2: PERFORMANCE LEVEL COUNTS */}
 <tr className="bg-slate-50 text-[10px] text-slate-600 ">
 <td colSpan={4} className="p-2 border text-right font-medium">
 CBC Level Distribution (EE/ME/AE/BE)
 </td>
 {broadsheet.learningAreas.map((la) => {
 const sumObj = broadsheet.subjectSummaries.find((s) => s.learningAreaId === la.id);
 return (
 <td key={la.id} className="p-2 border text-center font-mono">
 {sumObj?.counts ? (
 <span>
 <span className="text-emerald-600 font-bold">{sumObj.counts.EE}</span>/
 <span className="text-blue-600 font-bold">{sumObj.counts.ME}</span>/
 <span className="text-amber-600 font-bold">{sumObj.counts.AE}</span>/
 <span className="text-rose-600 font-bold">{sumObj.counts.BE}</span>
 </span>
 ) : (
 '--'
 )}
 </td>
 );
 })}
 <td colSpan={3} className="p-2 border text-center font-mono font-bold">
 Class Size: {broadsheet.totalStudents}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 )}

 {/* Print Footer */}
 <div className="hidden print:flex items-center justify-between pt-8 text-xs text-slate-600 border-t mt-8">
 <div>
 <p>Class Teacher Signature: __________________________</p>
 <p className="mt-1">Date: ________________________</p>
 </div>
 <div>
 <p>Head Teacher / Principal Stamp: __________________________</p>
 <p className="mt-1">SmartShule Academic Registry System</p>
 </div>
 </div>
 </div>
 </div>
 );
};
