export interface GroupedClasses {
  category: string;
  classes: any[];
}

/**
 * Calculates a sorting rank and educational category for a class according to Kenyan CBC standards.
 * Progression:
 *  1. Pre-Primary (Playgroup, PP1, PP2)
 *  2. Lower Primary (Grade 1 - 3)
 *  3. Upper Primary (Grade 4 - 6)
 *  4. Junior Secondary School (Grade 7 - 9)
 *  5. Senior Secondary School (Grade 10 - 12)
 *  6. Other Classes
 */
export function getClassRankAndCategory(c: any): { rank: number; category: string } {
  const name = (c.name || '').toLowerCase().trim();
  const edLevel = (c.educationLevel || '').toUpperCase();
  const grLevel = (c.gradeLevel || '').toUpperCase();

  // 1. Pre-Primary (Playgroup, PP1, PP2)
  if (
    edLevel === 'PRE_PRIMARY' ||
    grLevel === 'PLAYGROUP' ||
    grLevel === 'PP1' ||
    grLevel === 'PP2' ||
    name.includes('playgroup') ||
    name.includes('daycare') ||
    name.includes('creche') ||
    name.includes('baby') ||
    name.includes('pp1') ||
    name.includes('pp 1') ||
    name.includes('pre-primary 1') ||
    name.includes('pre primary 1') ||
    name.includes('pp2') ||
    name.includes('pp 2') ||
    name.includes('pre-primary 2') ||
    name.includes('pre primary 2') ||
    name.includes('nursery') ||
    name.includes('reception') ||
    name.includes('kindergarten')
  ) {
    if (name.includes('playgroup') || name.includes('daycare') || name.includes('creche') || name.includes('baby') || grLevel === 'PLAYGROUP') {
      return { rank: 10, category: 'Pre-Primary (Pre-School)' };
    }
    if (name.includes('pp1') || name.includes('pp 1') || name.includes('pre-primary 1') || name.includes('pre primary 1') || name.includes('nursery') || grLevel === 'PP1') {
      return { rank: 20, category: 'Pre-Primary (Pre-School)' };
    }
    if (name.includes('pp2') || name.includes('pp 2') || name.includes('pre-primary 2') || name.includes('pre primary 2') || grLevel === 'PP2') {
      return { rank: 30, category: 'Pre-Primary (Pre-School)' };
    }
    return { rank: 25, category: 'Pre-Primary (Pre-School)' };
  }

  // 2. Lower Primary (Grade 1 - 3)
  if (
    edLevel === 'LOWER_PRIMARY' ||
    grLevel === 'GRADE_1' ||
    grLevel === 'GRADE_2' ||
    grLevel === 'GRADE_3' ||
    name.includes('grade 1') ||
    name.includes('grade 2') ||
    name.includes('grade 3') ||
    name.includes('class 1') ||
    name.includes('class 2') ||
    name.includes('class 3') ||
    name.includes('std 1') ||
    name.includes('std 2') ||
    name.includes('std 3')
  ) {
    if (name.includes('1') || grLevel === 'GRADE_1') return { rank: 110, category: 'Lower Primary (Grade 1 - 3)' };
    if (name.includes('2') || grLevel === 'GRADE_2') return { rank: 120, category: 'Lower Primary (Grade 1 - 3)' };
    return { rank: 130, category: 'Lower Primary (Grade 1 - 3)' };
  }

  // 3. Upper Primary (Grade 4 - 6)
  if (
    edLevel === 'UPPER_PRIMARY' ||
    grLevel === 'GRADE_4' ||
    grLevel === 'GRADE_5' ||
    grLevel === 'GRADE_6' ||
    name.includes('grade 4') ||
    name.includes('grade 5') ||
    name.includes('grade 6') ||
    name.includes('class 4') ||
    name.includes('class 5') ||
    name.includes('class 6') ||
    name.includes('std 4') ||
    name.includes('std 5') ||
    name.includes('std 6')
  ) {
    if (name.includes('4') || grLevel === 'GRADE_4') return { rank: 210, category: 'Upper Primary (Grade 4 - 6)' };
    if (name.includes('5') || grLevel === 'GRADE_5') return { rank: 220, category: 'Upper Primary (Grade 4 - 6)' };
    return { rank: 230, category: 'Upper Primary (Grade 4 - 6)' };
  }

  // 4. Junior Secondary (Grade 7 - 9)
  if (
    edLevel === 'JUNIOR_SCHOOL' ||
    grLevel === 'GRADE_7' ||
    grLevel === 'GRADE_8' ||
    grLevel === 'GRADE_9' ||
    name.includes('grade 7') ||
    name.includes('grade 8') ||
    name.includes('grade 9') ||
    name.includes('jss')
  ) {
    if (name.includes('7') || grLevel === 'GRADE_7') return { rank: 310, category: 'Junior Secondary (Grade 7 - 9)' };
    if (name.includes('8') || grLevel === 'GRADE_8') return { rank: 320, category: 'Junior Secondary (Grade 7 - 9)' };
    return { rank: 330, category: 'Junior Secondary (Grade 7 - 9)' };
  }

  // 5. Senior Secondary (Grade 10 - 12)
  if (
    edLevel === 'SENIOR_SCHOOL' ||
    name.includes('grade 10') ||
    name.includes('grade 11') ||
    name.includes('grade 12') ||
    name.includes('form')
  ) {
    if (name.includes('10')) return { rank: 410, category: 'Senior Secondary (Grade 10 - 12)' };
    if (name.includes('11')) return { rank: 420, category: 'Senior Secondary (Grade 10 - 12)' };
    return { rank: 430, category: 'Senior Secondary (Grade 10 - 12)' };
  }

  return { rank: 500, category: 'Other Classes' };
}

/**
 * Sorts classes in sequential CBC progression order.
 */
export function sortClassesInCbcSequence(classes: any[]): any[] {
  if (!classes || classes.length === 0) return [];
  return [...classes].sort((a, b) => {
    const rankA = getClassRankAndCategory(a);
    const rankB = getClassRankAndCategory(b);
    if (rankA.rank !== rankB.rank) return rankA.rank - rankB.rank;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Groups classes into standard CBC categories with optgroups.
 */
export function sortAndGroupClasses(classes: any[]): GroupedClasses[] {
  if (!classes || classes.length === 0) return [];

  const sorted = sortClassesInCbcSequence(classes);

  const categoryOrder = [
    'Pre-Primary (Pre-School)',
    'Lower Primary (Grade 1 - 3)',
    'Upper Primary (Grade 4 - 6)',
    'Junior Secondary (Grade 7 - 9)',
    'Senior Secondary (Grade 10 - 12)',
    'Other Classes'
  ];

  const groups: GroupedClasses[] = [];
  for (const cat of categoryOrder) {
    const inCat = sorted.filter((c) => getClassRankAndCategory(c).category === cat);
    if (inCat.length > 0) {
      groups.push({ category: cat, classes: inCat });
    }
  }

  return groups;
}
