import React, { useState } from 'react';
import { SchemeOfWork } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { canReviewCurriculum } from '../../utils/curriculumPermissions';

interface Props {
  scheme: SchemeOfWork;
  onReviewed: () => Promise<void>;
  compact?: boolean;
}

/** Review controls must remain visible even before lesson rows are prepared. */
export function SchemeApprovalActions({ scheme, onReviewed, compact = false }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!canReviewCurriculum(user?.role)) return null;

  const sourceStatus = scheme.planningState?.coverageReviewStatus;
  const coveragePending = sourceStatus === 'SUBMITTED';
  const schemePending = scheme.status === 'SUBMITTED';
  const sourceApproved = !sourceStatus || sourceStatus === 'APPROVED';
  const revision = scheme.planningState?.revision;
  const context = { academicYearId: scheme.academicYearId, termId: scheme.termId };
  const review = async (target: 'coverage' | 'scheme', approved: boolean) => {
    const remarks = approved
      ? `${target === 'coverage' ? 'Syllabus coverage' : 'Submitted scheme sessions'} approved by school leadership.`
      : window.prompt(`What should the teacher revise in this ${target === 'coverage' ? 'coverage plan' : 'scheme submission'}?`)?.trim();
    if (!remarks) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (target === 'coverage') {
        if (revision === undefined) throw new Error('Reload the coverage plan before reviewing its latest revision.');
        await apiService.reviewCoverageDraft(scheme.id, { revision, approved, remarks });
      } else {
        await apiService.reviewScheme(scheme.id, { approved, remarks }, context);
      }
      await onReviewed();
      setNotice(approved ? `${target === 'coverage' ? 'Coverage' : 'Submitted scheme sessions'} approved.` : 'Returned to the teacher with your comments.');
    } catch (err: any) { setError(err.message || 'The review could not be saved.'); }
    finally { setBusy(false); }
  };

  return <section aria-label="School leadership approval" className={`rounded-xl border border-outline-variant/30 bg-surface ${compact ? 'p-3' : 'p-4'} space-y-3`}>
    <div><h3 className="text-sm font-bold text-primary">School leadership review</h3>
      <p className="mt-1 text-xs text-on-surface-variant">Admin, Head Teacher and Deputy Head Teacher can review submitted coverage and scheme sessions.</p>
    </div>
    {sourceStatus && <div className="space-y-2">
      <p className="text-xs font-semibold">Syllabus coverage: {sourceStatus}</p>
      <div className="flex flex-wrap gap-2">
        <button className="ui-button ui-button-primary" disabled={busy || !coveragePending || revision === undefined} onClick={() => review('coverage', true)}>Approve coverage</button>
        {coveragePending && <button className="ui-button" disabled={busy || revision === undefined} onClick={() => review('coverage', false)}>Return coverage with comments</button>}
      </div>
      {!coveragePending && sourceStatus !== 'APPROVED' && <p className="text-xs text-on-surface-variant">The teacher must submit the saved coverage before it can be approved.</p>}
    </div>}
    <div className="space-y-2">
      <p className="text-xs font-semibold">Scheme sessions: {scheme.status}{schemePending && scheme.planningState?.submittedEntryIds ? ` · ${scheme.planningState.submittedEntryIds.length} awaiting review` : ''}</p>
      <div className="flex flex-wrap gap-2">
        <button className="ui-button ui-button-primary" disabled={busy || !schemePending || !sourceApproved} onClick={() => review('scheme', true)}>Approve scheme</button>
        {schemePending && <button className="ui-button" disabled={busy} onClick={() => review('scheme', false)}>Return scheme with comments</button>}
      </div>
      {!schemePending && <p className="text-xs text-on-surface-variant">{scheme.status === 'APPROVED' ? 'The submitted sessions are approved. Further draft sessions require a new submission.' : 'The teacher must submit completed sessions before scheme approval is available.'}</p>}
      {schemePending && !sourceApproved && <p className="text-xs text-amber-900">Approve the submitted syllabus coverage first.</p>}
    </div>
    {error && <p role="alert" className="text-xs text-on-error-container">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-800">{notice}</p>}
  </section>;
}
