import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const fieldLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

function RecordedContent({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="text-stone-400">—</span>;
  }

  if (Array.isArray(value)) {
    return (
      <ol className="space-y-2.5">
        {value.map((item, index) => (
          <li
            key={index}
            className="rounded-lg border-l-2 border-rose-800/40 bg-stone-50/80 py-1.5 pl-3.5 pr-2"
          >
            <RecordedContent value={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, item]) => item !== null && item !== undefined && item !== ''
    );

    return (
      <dl className="divide-y divide-stone-100">
        {entries.map(([key, item]) => (
          <div key={key} className="py-2 first:pt-0 last:pb-0">
            <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {fieldLabel(key)}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800">
              <RecordedContent value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <span className="font-medium text-stone-800">
      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
    </span>
  );
}

export function DocumentSerializationView() {
  const { user } = useAuth();
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canList = user?.role !== UserRole.TEACHER;

  useEffect(() => {
    if (canList) {
      apiService
        .getDocumentRegistry()
        .then((r) => setRows(r.data || []))
        .catch((e) => setError(e.message));
    }
  }, [canList]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await apiService.verifyDocumentSerial(serial.trim());
      setResult(r.data);
    } catch (e: any) {
      setError(e.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-8">
      {/* Page Header */}
      <header className="flex flex-col gap-2 border-b border-stone-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950/10 text-rose-900 ring-1 ring-inset ring-rose-900/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Document Serial Center
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Verify the authenticity of official school records. Every issued document receives an immutable serial number that remains permanently verifiable.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-950/5 px-3 py-1 text-xs font-medium text-rose-950 ring-1 ring-inset ring-rose-900/15">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Immutable Ledger Active
        </span>
      </header>

      {/* Verification Search Card */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <form onSubmit={verify} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="serial-input"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-500"
            >
              Document Serial Number
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                id="serial-input"
                className="block w-full rounded-xl border border-stone-300 bg-stone-50/50 py-3 pl-11 pr-4 font-mono text-sm uppercase tracking-wider text-stone-900 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Enter serial code (e.g. 4G82S1S60)"
                required
                maxLength={80}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-rose-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-950 focus:outline-none focus:ring-4 focus:ring-rose-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying…
              </>
            ) : (
              'Verify Serial'
            )}
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <svg className="h-5 w-5 shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Verification Result Banner */}
      {result && (
        <section
          role="status"
          className={`overflow-hidden rounded-2xl border shadow-sm transition-all ${
            result.registered
              ? 'border-emerald-200 bg-white'
              : 'border-red-300 bg-red-50/70'
          }`}
        >
          {/* Status Top Bar */}
          <div
            className={`flex items-center gap-3 border-b px-6 py-4 ${
              result.registered
                ? 'border-emerald-100 bg-emerald-50/80 text-emerald-900'
                : 'border-red-200 bg-red-100/70 text-red-950'
            }`}
          >
            {result.registered ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-700 text-white">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <div>
              <h2 className="text-base font-bold">
                {result.registered
                  ? 'Verified — Serial Issued by This System'
                  : 'Serial Not Found — Document Unverified'}
              </h2>
              <p className="text-xs opacity-80">
                {result.registered
                  ? 'Official issuance record matched in school registry'
                  : 'No matching record exists for this code'}
              </p>
            </div>
          </div>

          {/* Result Body */}
          <div className="p-6">
            {result.registered ? (
              <div className="space-y-6">
                {/* Metadata Grid */}
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <dt className="text-xs font-medium text-stone-500">Serial Number</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-rose-950">
                      {result.serial}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 sm:col-span-2">
                    <dt className="text-xs font-medium text-stone-500">Document Title</dt>
                    <dd className="mt-1 text-sm font-semibold text-stone-900">
                      {result.title}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <dt className="text-xs font-medium text-stone-500">Document Type</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center rounded-md bg-rose-950/10 px-2.5 py-0.5 text-xs font-medium capitalize text-rose-900 ring-1 ring-inset ring-rose-900/20">
                        {result.documentType.replace(/_/g, ' ')}
                      </span>
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <dt className="text-xs font-medium text-stone-500">Issued Timestamp</dt>
                    <dd className="mt-1 text-sm font-medium text-stone-800">
                      {new Date(result.issuedAt).toLocaleString()}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <dt className="text-xs font-medium text-stone-500">Status at Issuance</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {result.snapshot?.status || 'Saved'}
                      </span>
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5">
                    <dt className="text-xs font-medium text-stone-500">Document ID</dt>
                    <dd className="mt-1 font-mono text-xs text-stone-700">
                      {result.documentId}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 sm:col-span-2">
                    <dt className="text-xs font-medium text-stone-500">Content Fingerprint (SHA)</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-stone-600">
                      {result.contentHash}
                    </dd>
                  </div>
                </dl>

                {/* Security Notice */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <p>
                    A copied serial alone does not prove authenticity. Always compare the details and recorded snapshot below against the physical or digital copy presented.
                  </p>
                </div>

                {/* Expandable Original Content */}
                <details className="group rounded-xl border border-stone-200 bg-stone-50/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-rose-950 hover:bg-rose-950/5">
                    <span>View Original Recorded Content</span>
                    <svg
                      className="h-4 w-4 text-rose-900 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="border-t border-stone-200 bg-white p-4">
                    <div className="max-h-96 overflow-auto pr-2 text-sm">
                      <RecordedContent value={result.snapshot} />
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-red-900">
                This serial has no issuance record for this school. Double-check for typos in the serial code and confirm the issuing institution before accepting the document.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Permanent Issuance Register Table */}
      {canList && (
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-rose-950/[0.02] px-6 py-5">
            <h2 className="text-base font-bold text-stone-900">
              Permanent Issuance Register
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Showing the latest 200 document versions. Modified documents receive a new serial while previous versions remain searchable.
            </p>
          </div>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/90 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-6 py-3.5">Serial</th>
                    <th className="px-6 py-3.5">Document</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row) => (
                    <tr
                      key={row.serial}
                      className="transition-colors hover:bg-rose-950/[0.03]"
                    >
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSerial(row.serial);
                            setResult(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center rounded-lg bg-rose-950/10 px-2.5 py-1 font-mono text-xs font-semibold text-rose-900 ring-1 ring-inset ring-rose-900/20 transition hover:bg-rose-900 hover:text-white"
                          title="Load serial into verification box"
                        >
                          {row.serial}
                        </button>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-stone-900">
                        {row.title}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-700">
                          {row.documentType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-xs tabular-nums text-stone-500">
                        {new Date(row.issuedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="rounded-full bg-rose-950/10 p-3 text-rose-900">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-stone-900">
                No serialized documents yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-stone-500">
                Open a saved document or generated report to register its official issued version.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}