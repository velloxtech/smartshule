/**
 * SmartShule Domain Entity & Identifier Formatters
 * 
 * Provides clean, human-readable representations of Academic Years,
 * Classrooms, and Streams - preventing raw UUIDs or generated IDs
 * (e.g. 'year-2026', 'cls-str-123', 'Stream b4c29a') from leaking into the UI.
 */

/**
 * Resolves a human-readable Academic Year name.
 * e.g. 'year-2026' -> '2026', { name: '2026' } -> '2026', 'clw123...' -> '2026'
 */
export function resolveAcademicYearName(
  yearIdOrObj?: string | { id?: string; name?: string } | null,
  fallback = '2026'
): string {
  if (!yearIdOrObj) return fallback;

  if (typeof yearIdOrObj === 'object') {
    if (yearIdOrObj.name && yearIdOrObj.name.trim() !== '') {
      return yearIdOrObj.name.replace(/^year-/i, '').trim();
    }
    if (yearIdOrObj.id) {
      return resolveAcademicYearName(yearIdOrObj.id, fallback);
    }
    return fallback;
  }

  const str = String(yearIdOrObj).trim();
  if (!str) return fallback;

  // 1. Direct 4-digit year like '2026'
  if (/^\d{4}$/.test(str)) {
    return str;
  }

  // 2. Starts with 'year-2026' or 'year-26'
  const yearMatch = str.match(/year-(\d{4})/i);
  if (yearMatch) {
    return yearMatch[1];
  }

  // 3. Contains any 4-digit year 202X or 203X
  const fourDigitMatch = str.match(/\b(20[2-9]\d)\b/);
  if (fourDigitMatch) {
    return fourDigitMatch[1];
  }

  // 4. Starts with 'year-'
  if (str.toLowerCase().startsWith('year-')) {
    const stripped = str.slice(5).trim();
    if (stripped && !/^[0-9a-f-]{20,}$/i.test(stripped)) {
      return stripped.toUpperCase();
    }
  }

  // If it's a UUID/cuid or unreadable hash, use fallback
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(str) || /^c[a-z0-9]{20,}/i.test(str)) {
    return fallback;
  }

  return str;
}

/**
 * Resolves a standard human-readable CBC Grade name.
 * e.g. 'GRADE_1' -> 'Grade 1', 'PLAYGROUP' -> 'Playgroup', 'PP1' -> 'PP1'
 */
export function resolveGradeName(gradeLevel?: string | null): string {
  if (!gradeLevel) return 'CBC Class';
  const clean = String(gradeLevel).trim();
  if (!clean) return 'CBC Class';

  // Common CBC standards
  const upper = clean.toUpperCase();
  if (upper === 'PLAYGROUP') return 'Playgroup';
  if (upper === 'PP1' || upper === 'PRE_PRIMARY_1') return 'PP1';
  if (upper === 'PP2' || upper === 'PRE_PRIMARY_2') return 'PP2';

  const gradeMatch = upper.match(/GRADE_?(\d+)/i);
  if (gradeMatch) {
    return `Grade ${gradeMatch[1]}`;
  }

  // If starts with cls- or raw hash, don't show hash
  if (/^cls[-_]/i.test(clean) || /^[0-9a-f-]{10,}$/i.test(clean) || /^c[a-z0-9]{20,}/i.test(clean)) {
    return 'CBC Class';
  }

  return clean.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves a human-readable stream name.
 * Prevents 'Stream b4c29a', 'stream-grade1-east', or raw UUIDs.
 * Returns clean names like 'East Stream', 'West', 'Stream A', etc.
 */
export function resolveStreamName(
  streamIdOrName?: string | null,
  streamName?: string | null
): string {
  // If explicit streamName provided and human-readable, use it
  if (streamName && typeof streamName === 'string' && streamName.trim() !== '') {
    const sName = streamName.trim();
    if (!/^[0-9a-f-]{10,}$/i.test(sName) && !/^stream-[0-9a-f]+/i.test(sName)) {
      return sName;
    }
  }

  if (!streamIdOrName) return '';
  const raw = String(streamIdOrName).trim();
  if (!raw) return '';

  // Already formatted nicely e.g. 'East', 'Stream A'
  if (/^(East|West|North|South|Red|Blue|Green|Yellow|Central|Main|Alpha|Beta|Stream [A-Z])$/i.test(raw)) {
    return raw;
  }

  // Handle stream-* patterns like 'stream-grade1-east', 'stream-east', 'stream-a'
  if (raw.toLowerCase().startsWith('stream-')) {
    const lower = raw.toLowerCase();
    if (lower.includes('east')) return 'East Stream';
    if (lower.includes('west')) return 'West Stream';
    if (lower.includes('north')) return 'North Stream';
    if (lower.includes('south')) return 'South Stream';
    if (lower.includes('red')) return 'Red Stream';
    if (lower.includes('blue')) return 'Blue Stream';
    if (lower.includes('green')) return 'Green Stream';
    if (lower.includes('yellow')) return 'Yellow Stream';
    if (lower.endsWith('-a') || lower.includes('stream-a')) return 'Stream A';
    if (lower.endsWith('-b') || lower.includes('stream-b')) return 'Stream B';
    if (lower.endsWith('-c') || lower.includes('stream-c')) return 'Stream C';
    
    // Clean up 'stream-' prefix and dashes
    const cleaned = raw.replace(/^stream-/i, '').replace(/grade\d+[-_]?/i, '').replace(/[-_]/g, ' ').trim();
    if (cleaned && !/^[0-9a-f]{6,}$/i.test(cleaned)) {
      return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return 'Stream A';
  }

  // If it's a cuid, uuid, or hex slice (e.g. 'Stream b4c29a' or 'b4c29a')
  if (/^stream\s+[0-9a-f]{4,}$/i.test(raw) || /^[0-9a-f-]{10,}$/i.test(raw) || /^c[a-z0-9]{20,}/i.test(raw)) {
    return 'Stream A';
  }

  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves a human-readable Classroom / Class name.
 * Prevents 'cls-1234' or raw UUIDs.
 */
export function resolveClassName(
  classroomId?: string | null,
  className?: string | null,
  gradeLevel?: string | null
): string {
  // If human-readable className provided
  if (className && typeof className === 'string' && className.trim() !== '') {
    const cName = className.trim();
    if (!/^(cls|class)[-_][0-9a-f]+/i.test(cName) && !/^[0-9a-f-]{10,}$/i.test(cName) && !/^c[a-z0-9]{20,}/i.test(cName)) {
      return cName;
    }
  }

  // Use gradeLevel if available
  if (gradeLevel) {
    return resolveGradeName(gradeLevel);
  }

  if (!classroomId) return 'Main Wing';
  const raw = String(classroomId).trim();

  // Try extracting grade from class ID
  const gradeMatch = raw.match(/grade[_-]?(\d+)/i);
  if (gradeMatch) return `Grade ${gradeMatch[1]}`;

  const ppMatch = raw.match(/pp[_-]?([12])/i);
  if (ppMatch) return `PP${ppMatch[1]}`;

  if (/playgroup/i.test(raw)) return 'Playgroup';

  // If UUID or cuid, use friendly default
  if (/^cls[-_]/i.test(raw) || /^[0-9a-f-]{10,}$/i.test(raw) || /^c[a-z0-9]{20,}/i.test(raw)) {
    return 'Main Wing';
  }

  return raw;
}

/**
 * Resolves an array of assigned class/stream IDs into human-readable labels for teachers.
 */
export function resolveTeacherAssignedClasses(
  assignedIds?: string[] | null,
  classLookup?: Map<string, string>,
  streamLookup?: Map<string, string>
): string {
  if (!assignedIds || assignedIds.length === 0) return 'Unassigned';

  const names = assignedIds.map((id) => {
    if (classLookup?.has(id)) return classLookup.get(id)!;
    if (streamLookup?.has(id)) return streamLookup.get(id)!;
    
    // Parse from ID if matches grade or stream pattern
    if (/grade[_-]?\d+/i.test(id)) {
      const gMatch = id.match(/grade[_-]?(\d+)/i);
      const isEast = /east/i.test(id);
      const isWest = /west/i.test(id);
      const streamSuffix = isEast ? ' East' : isWest ? ' West' : '';
      return `Grade ${gMatch ? gMatch[1] : ''}${streamSuffix}`.trim();
    }
    if (/pp[_-]?1/i.test(id)) return 'PP1';
    if (/pp[_-]?2/i.test(id)) return 'PP2';
    if (/playgroup/i.test(id)) return 'Playgroup';
    
    // If raw ID, resolve nicely
    return resolveStreamName(id) || 'Assigned Class';
  });

  return Array.from(new Set(names)).join(', ');
}
