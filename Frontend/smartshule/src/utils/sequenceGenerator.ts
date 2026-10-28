/**
 * Sequence Generator Utility
 * Computes the next zero-padded 2+ digit sequential ID starting from '01'.
 * Matches pure numbers (e.g. '01', '02', '10') as well as prefixed strings (e.g. 'ADM-01', 'EMP-02').
 * If no existing IDs exist, defaults to '01'.
 */
export function generateNextSequentialNumber(existingIds: (string | undefined | null)[]): string {
  let max = 0;
  for (const id of existingIds) {
    if (!id || typeof id !== 'string') continue;
    const trimmed = id.trim();
    if (!trimmed) continue;

    // 1. Direct integer check: '01', '1', '02', '15'
    if (/^\d+$/.test(trimmed)) {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val) && val > max && val < 100000) {
        max = val;
      }
    } else {
      // 2. Trailing digits check: 'ADM-01', 'EMP-02', 'ADM-2026-05'
      const match = trimmed.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > max && val < 100000) {
          max = val;
        }
      }
    }
  }

  const next = max + 1;
  return next < 10 ? `0${next}` : `${next}`;
}

/**
 * Formats an admission number to a strictly 4-digit zero-padded numeric string
 * (e.g. 1 -> '0001', '05' -> '0005', 9999 -> '9999').
 * For numbers >= 10000, preserves all digits without truncation.
 */
export function formatAdmissionNumber(input: string | number): string {
  const raw = typeof input === 'number' ? Math.floor(input).toString() : String(input).trim();
  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) return '0001';
  const val = parseInt(digitsOnly, 10);
  if (isNaN(val) || val <= 0) return '0001';
  return val < 10000 ? val.toString().padStart(4, '0') : val.toString();
}

/**
 * Computes the next zero-padded 4-digit sequential admission number starting from '0001'.
 * Matches pure numbers ('0001', '05', '168') as well as prefixed legacy strings ('PP1-001', 'GSS/2026/G1-031').
 * If no existing IDs exist, defaults to '0001'.
 */
export function generateNextAdmissionNumber(existingIds: (string | undefined | null)[]): string {
  let max = 0;
  for (const id of existingIds) {
    if (!id || typeof id !== 'string') continue;
    const trimmed = id.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > max && val < 1000000) {
        max = val;
      }
    }
  }
  const next = max + 1;
  return next < 10000 ? next.toString().padStart(4, '0') : next.toString();
}
