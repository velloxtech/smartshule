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
