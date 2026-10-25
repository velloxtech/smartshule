/**
 * Grace Seeds School Domain Entity & Identifier Formatters
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
 * Prevents 'Stream b4c29a', 'stream-grade1-east', raw UUIDs, or duplicate grade names (e.g. 'Stream: Grade 3').
 * Returns clean names like 'East Stream', 'West', 'Stream A', 'Main Stream', etc.
 */
export function resolveStreamName(
  streamIdOrName?: string | null,
  streamName?: string | null,
  gradeLevel?: string | null
): string {
  const normGrade = gradeLevel ? resolveGradeName(gradeLevel).toLowerCase() : '';

  // If explicit streamName provided and human-readable, use it
  if (streamName && typeof streamName === 'string' && streamName.trim() !== '') {
    const sName = streamName.trim();
    // If stream name is identical to grade (e.g. 'Grade 3' or 'Grade 3 East')
    if (normGrade && sName.toLowerCase() === normGrade) {
      return 'Main Stream';
    }
    if (/^grade\s*\d+$/i.test(sName)) {
      return 'Main Stream';
    }
    if (!/^[0-9a-f-]{10,}$/i.test(sName) && !/^stream-[0-9a-f]+/i.test(sName)) {
      return sName;
    }
  }

  if (!streamIdOrName) return '';
  const raw = String(streamIdOrName).trim();
  if (!raw) return '';

  // If identical to grade
  if (normGrade && raw.toLowerCase() === normGrade) {
    return 'Main Stream';
  }
  if (/^grade\s*\d+$/i.test(raw)) {
    return 'Main Stream';
  }

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
 * Resolves a human-readable CBC Learning Area / Subject Name.
 * Prevents raw IDs ('la-g3-eng', 'la-g3-mat', 'la-g3-kis') or UUIDs from leaking into the UI.
 * Returns clean standard names like 'English Language Activities', 'Mathematical Activities', etc.
 */
export function resolveLearningAreaName(
  learningAreaIdOrName?: string | null,
  fallbackName?: string | null
): string {
  // If fallbackName is already a clean human-readable name (not a UUID, not starting with la-), use it
  if (fallbackName && typeof fallbackName === 'string') {
    const fClean = fallbackName.trim();
    if (fClean && !/^la-[a-z0-9-_]+/i.test(fClean) && !/^[0-9a-f-]{10,}$/i.test(fClean)) {
      return fClean;
    }
  }

  if (!learningAreaIdOrName) return fallbackName || 'Learning Area';
  const raw = String(learningAreaIdOrName).trim();
  if (!raw) return fallbackName || 'Learning Area';

  const clean = raw.toUpperCase();

  // 1. Creative Arts (MUST come before CRE so 'CREA' / 'la-g3-crea' is never confused with CRE)
  if (
    clean.includes('CREATIVE') ||
    clean.includes('CREA') ||
    clean.includes('CRA') ||
    (clean.includes('ART') && !clean.includes('SMART'))
  ) {
    return 'Creative Arts Activities';
  }

  // 2. English Reading / Literacy
  if (
    clean.includes('READING') ||
    clean.includes('-REA') ||
    clean.endsWith('_REA') ||
    clean === 'REA' ||
    clean.includes('LITERACY')
  ) {
    return 'English Reading Activities';
  }

  // 3. Kusoma Activities (WKU / Kusoma / Lower primary literacy)
  if (
    clean.includes('KUSOMA') ||
    clean.includes('KUSO') ||
    clean.includes('-WKU') ||
    clean.includes('_WKU') ||
    clean === 'WKU'
  ) {
    return 'Kusoma Activities';
  }

  // 4. Environmental Activities (SENV / ENVI / ENV)
  if (
    clean.includes('ENVIRONMENT') ||
    clean.includes('ENVI') ||
    clean.includes('SENV') ||
    clean.includes('-ENV') ||
    clean === 'ENV'
  ) {
    return 'Environmental Activities';
  }

  // 5. English Language
  if (clean.includes('ENG') || clean.includes('ENGLISH')) {
    return 'English Language Activities';
  }

  // 6. Kiswahili Language
  if (clean.includes('KISW') || clean.includes('SWAHILI') || clean.includes('KIS')) {
    return 'Kiswahili Language Activities';
  }

  // 7. Mathematics
  if (clean.includes('MATH') || clean.includes('MAT')) {
    return 'Mathematical Activities';
  }

  // 8. Christian / Islamic Religious Education
  if (clean.includes('RELIGIOUS') || clean.includes('CRE') || clean.includes('IRE') || clean.includes('HRE')) {
    return 'Christian Religious Education';
  }

  // 9. Upper Primary & Junior Secondary Subjects
  if (
    clean.includes('INTEGRATED SCIENCE') ||
    clean.includes('INTSCI') ||
    clean.includes('SCI_TECH') ||
    clean.includes('SCIENCE') ||
    clean.includes('-SCI')
  ) {
    return 'Science and Technology';
  }
  if (clean.includes('HEALTH') || clean.includes('HLTH')) return 'Health Education';
  if (clean.includes('SOCIAL') || clean.includes('SST') || clean.includes('SOC')) return 'Social Studies';
  if (clean.includes('AGRI') || clean.includes('NUTRITION') || clean.includes('AGR')) return 'Agriculture & Nutrition';
  if (clean.includes('PRE-TECH') || clean.includes('PRETECH') || clean.includes('TECHNICAL') || clean.includes('PTECH') || clean.includes('PRET')) return 'Pre-Technical Studies';
  if (clean.includes('BUSINESS') || clean.includes('BUS')) return 'Business Studies';
  if (clean.includes('COMPUTER') || clean.includes('COMP')) return 'Computer Science';
  if (clean.includes('FRENCH') || clean.includes('FRE')) return 'French';
  if (clean.includes('GERMAN') || clean.includes('GER')) return 'German';
  if (clean.includes('ARABIC') || clean.includes('ARA')) return 'Arabic';
  if (clean.includes('INDIGENOUS') || clean.includes('IND')) return 'Indigenous Language Activities';
  if (clean.includes('MUSIC') || clean.includes('MUS')) return 'Music Activities';
  if (clean.includes('PSYCHOMOTOR') || clean.includes('PSY')) return 'Psychomotor and Creative Activities';

  // If it's a raw ID like 'la-g3-something' or UUID, provide fallback
  if (/^la-[a-z0-9-_]+/i.test(raw) || /^[0-9a-f-]{10,}$/i.test(raw)) {
    return fallbackName || 'Core Learning Area';
  }

  // Capitalize neatly
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves standard 3-to-4 letter abbreviation code for CBC Learning Areas.
 */
export function resolveLearningAreaCode(nameOrCodeOrId: string): string {
  if (!nameOrCodeOrId) return 'SUBJ';
  const clean = nameOrCodeOrId.toUpperCase();
  if (['MAT', 'LIT', 'LAN', 'ENV', 'CRE', 'SRE'].includes(clean)) return clean;
  if (clean.includes('LIT') || clean.includes('READING') || clean.includes('REA')) return 'LIT';
  if (clean.includes('LANG') || clean === 'LAN') return 'LAN';
  if (clean.includes('SRE') || clean.includes('SPIRITUAL')) return 'SRE';
  if (clean.includes('CREATIVE') || clean.includes('CREA')) return 'CRE';
  if (clean.includes('KUSOMA') || clean.includes('WKU') || clean.includes('KUSO')) return 'KUSO';
  if (clean.includes('ENVIRONMENT') || clean.includes('SENV') || clean.includes('ENVI')) return 'ENV';
  if (clean.includes('ENG')) return 'ENG';
  if (clean.includes('KIS')) return 'KIS';
  if (clean.includes('MAT')) return 'MAT';
  if (clean.includes('CRE')) return 'CRE';
  if (clean.includes('SCI')) return 'SCI';
  if (clean.includes('SST') || clean.includes('SOC')) return 'SST';
  if (clean.includes('AGR')) return 'AGR';
  if (clean.includes('HLTH')) return 'HLTH';
  if (clean.includes('PRET')) return 'PRET';
  if (clean.includes('BUS')) return 'BUS';
  if (clean.includes('COMP')) return 'COMP';
  return clean.slice(0, 4);
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
