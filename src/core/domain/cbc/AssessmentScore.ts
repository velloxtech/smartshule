/** Raw marks and maxima must come from the same strand records. Never infer a maximum. */
export function assessmentScore(strands: unknown): {
  rawScore?: number; maxScore?: number; percentageScore?: number; scoreIssue?: string;
} {
  if (strands != null && !Array.isArray(strands)) return { scoreIssue: 'Legacy score mapping requires verification' };
  if (!Array.isArray(strands) || strands.length === 0) return {};
  const scored = strands.filter(s => s && s.rawScore !== undefined && s.rawScore !== null);
  if (!scored.length) return {};
  if (scored.some(s => typeof s.rawScore !== 'number' || !Number.isFinite(s.rawScore) ||
    typeof s.maxScore !== 'number' || !Number.isFinite(s.maxScore) || s.maxScore <= 0 || s.rawScore < 0)) {
    return { scoreIssue: 'Unverified score or maximum' };
  }
  const rawScore = scored.reduce((n, s) => n + s.rawScore, 0);
  const maxScore = scored.reduce((n, s) => n + s.maxScore, 0);
  if (scored.some(s => s.rawScore > s.maxScore)) {
    return { rawScore, maxScore, scoreIssue: 'Raw score exceeds configured maximum; verification required' };
  }
  return { rawScore, maxScore, percentageScore: Math.round(rawScore / maxScore * 100) };
}

/** Collapse repeated imports for display, retaining their IDs and flagging disagreements. */
export function assessmentResults<T extends { id: string; studentId: string; learningAreaId: string; termId: string; academicYearId: string; strandScores: unknown; overallPerformanceLevel?: string; updatedAt?: unknown }>(records: T[]) {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const key = [record.studentId,record.learningAreaId,String(record.termId || '').replace(/-t([1-3])$/, '-$1'),record.academicYearId].join('|');
    const group = groups.get(key) || []; group.push(record); groups.set(key,group);
  }
  return [...groups.values()].map(group => {
    group.sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || String(a.id || '').localeCompare(String(b.id || '')));
    const row = group[0];
    const signature = (r: T) => JSON.stringify([r.overallPerformanceLevel,Array.isArray(r.strandScores) ? r.strandScores.map(s => [s.rawScore,s.maxScore]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) : r.strandScores]);
    const conflict = new Set(group.map(signature)).size > 1;
    return { ...row, ...assessmentScore(row.strandScores), duplicateIds: group.length > 1 ? group.map(r => r.id) : undefined,
      ...(conflict ? { percentageScore: undefined, scoreIssue: 'Conflicting duplicate results require verification' } : {}) };
  });
}
