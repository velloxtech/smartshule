import React, {useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import {apiService} from '../../services/api';
import {canManageCurriculum} from '../../utils/curriculumPermissions';

export function DeleteCurriculumPlanButton({schemeId, onDeleted, disabled=false}: {
  schemeId?: string; onDeleted: () => Promise<void>; disabled?: boolean;
}) {
  const {user} = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!schemeId || !canManageCurriculum(user?.role)) return null;
  const remove = async () => {
    if (busy || !window.confirm('Delete this syllabus coverage and its scheme of work? This cannot be undone. Delete any linked Records of Work and lesson plans first.')) return;
    setBusy(true); setError('');
    try {
      await apiService.deleteScheme(schemeId);
    } catch (reason: any) {
      setError(reason.message || 'Could not delete the plan.');
      setBusy(false);
      return;
    }
    try { await onDeleted(); }
    catch { setError('The plan was deleted. Refresh the page to reload the list.'); }
    finally { setBusy(false); }
  };
  return <div className="min-w-0 lg:col-span-full">
    <button type="button" className="ui-button text-red-700" disabled={disabled || busy} onClick={remove}>
      {busy ? 'Deleting…' : 'Delete coverage & scheme'}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
