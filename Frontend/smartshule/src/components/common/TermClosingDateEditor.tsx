import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { AcademicTerm } from '../../types';

export function TermClosingDateEditor({ term, onUpdated }: { term: AcademicTerm; onUpdated: (term: AcademicTerm) => void | Promise<void> }) {
  const [date, setDate] = useState(term.endDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { setDate(term.endDate.slice(0, 10)); setError(''); }, [term.id, term.endDate]);
  useEffect(() => { setMessage(''); }, [term.id]);
  const save = async () => {
    setError(''); setMessage('');
    if (!date || date <= term.startDate.slice(0, 10)) { setError('Choose a closing date after the term opening date.'); return; }
    setSaving(true);
    try {
      const result = await apiService.updateTerm(term.id, { endDate: date });
      if (!result.success || !result.data) throw new Error('The closing date could not be saved.');
      await onUpdated(result.data);
      setMessage(`Closing date saved: ${date}.`);
    } catch (e: any) { setError(e.message || 'The closing date could not be saved.'); }
    finally { setSaving(false); }
  };
  return <div className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-2">
    <label className="block text-sm font-semibold text-on-surface">{term.name} closing date
      <input aria-label={`${term.name} closing date`} type="date" required value={date} min={term.startDate.slice(0, 10)} disabled={saving} onChange={e => { setDate(e.target.value); setMessage(''); setError(''); }} className="ui-field block mt-2" />
    </label>
    <button type="button" disabled={saving || !date || date === term.endDate.slice(0, 10)} onClick={save} className="ui-button ui-button-primary">{saving ? 'Saving…' : 'Save closing date'}</button>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
  </div>;
}
