/**
 * Constitution of Kenya (2010) Educational & Compliance Reference
 * Implements legal frameworks for Articles 10, 27, 31, 43, 53, 54, 237,
 * the Children's Act (2022), Data Protection Act (2019), and Chapter 11 (Devolution).
 */

export interface KenyanCounty {
  code: string;
  name: string;
  subCounties: string[];
}

export const KENYAN_COUNTIES: KenyanCounty[] = [
  { code: '001', name: 'Mombasa', subCounties: ['Mvita', 'Nyali', 'Changamwe', 'Jomvu', 'Kisauni', 'Likoni'] },
  { code: '002', name: 'Kwale', subCounties: ['Matuga', 'Msambweni', 'Kinango', 'Lunga Lunga'] },
  { code: '003', name: 'Kilifi', subCounties: ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'] },
  { code: '004', name: 'Tana River', subCounties: ['Garsen', 'Galole', 'Bura'] },
  { code: '005', name: 'Lamu', subCounties: ['Lamu East', 'Lamu West'] },
  { code: '006', name: 'Taita Taveta', subCounties: ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'] },
  { code: '007', name: 'Garissa', subCounties: ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'] },
  { code: '008', name: 'Wajir', subCounties: ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'] },
  { code: '009', name: 'Mandera', subCounties: ['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey'] },
  { code: '010', name: 'Marsabit', subCounties: ['Moyale', 'North Horr', 'Saku', 'Laisamis'] },
  { code: '011', name: 'Isiolo', subCounties: ['Isiolo North', 'Isiolo South'] },
  { code: '012', name: 'Meru', subCounties: ['Imenti North', 'Imenti South', 'Imenti Central', 'Buuri', 'Tigania East', 'Tigania West', 'Igembe North', 'Igembe Central', 'Igembe South'] },
  { code: '013', name: 'Tharaka-Nithi', subCounties: ['Tharaka', 'Chuka/Igambang\'ombe', 'Maara'] },
  { code: '014', name: 'Embu', subCounties: ['Manyatta', 'Runyenjes', 'Mbeere North', 'Mbeere South'] },
  { code: '015', name: 'Kitui', subCounties: ['Kitui Central', 'Kitui West', 'Kitui East', 'Kitui Rural', 'Kitui South', 'Mwingi North', 'Mwingi Central', 'Mwingi West'] },
  { code: '016', name: 'Machakos', subCounties: ['Machakos Town', 'Mavoko', 'Mwala', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Masinga'] },
  { code: '017', name: 'Makueni', subCounties: ['Makueni', 'Kaiti', 'Kibwezi West', 'Kibwezi East', 'Kilome', 'Mbooni'] },
  { code: '018', name: 'Nyandarua', subCounties: ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Joro Orok', 'Ndaragwa'] },
  { code: '019', name: 'Nyeri', subCounties: ['Nyeri Town', 'Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini'] },
  { code: '020', name: 'Kirinyaga', subCounties: ['Kirinyaga Central', 'Ndia', 'Gichugu', 'Mwea'] },
  { code: '021', name: 'Murang\'a', subCounties: ['Kiharu', 'Kangema', 'Mathioya', 'Kigumo', 'Kandara', 'Gatanga', 'Maragua'] },
  { code: '022', name: 'Kiambu', subCounties: ['Thika Town', 'Ruiru', 'Juja', 'Kiambu Town', 'Kikuyu', 'Limuru', 'Kabete', 'Githunguri', 'Kiambaa', 'Lari', 'Gatundu South', 'Gatundu North'] },
  { code: '023', name: 'Turkana', subCounties: ['Turkana Central', 'Turkana North', 'Turkana West', 'Turkana East', 'Turkana South', 'Loima'] },
  { code: '024', name: 'West Pokot', subCounties: ['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South'] },
  { code: '025', name: 'Samburu', subCounties: ['Samburu West', 'Samburu North', 'Samburu East'] },
  { code: '026', name: 'Trans Nzoia', subCounties: ['Cherangany', 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'] },
  { code: '027', name: 'Uasin Gishu', subCounties: ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'] },
  { code: '028', name: 'Elgeyo Marakwet', subCounties: ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'] },
  { code: '029', name: 'Nandi', subCounties: ['Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop', 'Aldai', 'Tinderet'] },
  { code: '030', name: 'Baringo', subCounties: ['Baringo Central', 'Baringo North', 'Baringo South', 'Eldama Ravine', 'Mogotio', 'Tiaty'] },
  { code: '031', name: 'Laikipia', subCounties: ['Laikipia East', 'Laikipia West', 'Laikipia North'] },
  { code: '032', name: 'Nakuru', subCounties: ['Nakuru Town East', 'Nakuru Town West', 'Naivasha', 'Gilgil', 'Molo', 'Rongai', 'Subukia', 'Njoro', 'Kuresoi North', 'Kuresoi South', 'Bahati'] },
  { code: '033', name: 'Narok', subCounties: ['Narok North', 'Narok South', 'Narok East', 'Narok West', 'Kilgoris', 'Emurua Dikirr'] },
  { code: '034', name: 'Kajiado', subCounties: ['Kajiado Central', 'Kajiado North', 'Kajiado East', 'Kajiado West', 'Kajiado South'] },
  { code: '035', name: 'Kericho', subCounties: ['Ainamoi', 'Belgut', 'Bureti', 'Kipkelion East', 'Kipkelion West', 'Soin/Sigowet'] },
  { code: '036', name: 'Bomet', subCounties: ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'] },
  { code: '037', name: 'Kakamega', subCounties: ['Lurambi', 'Malava', 'Shinyalu', 'Ikolomani', 'Navakholo', 'Mumias East', 'Mumias West', 'Matungu', 'Butere', 'Khwisero', 'Lugari', 'Likuyani'] },
  { code: '038', name: 'Vihiga', subCounties: ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'] },
  { code: '039', name: 'Bungoma', subCounties: ['Kanduyi', 'Bumula', 'Webuye East', 'Webuye West', 'Sirisia', 'Tongaren', 'Kabuchai', 'Kimilili', 'Mt. Elgon'] },
  { code: '040', name: 'Busia', subCounties: ['Matayos', 'Nambale', 'Teso North', 'Teso South', 'Funyula', 'Budalangi', 'Butula'] },
  { code: '041', name: 'Siaya', subCounties: ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Ugunja'] },
  { code: '042', name: 'Kisumu', subCounties: ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Nyando', 'Seme', 'Muhoroni', 'Nyakach'] },
  { code: '043', name: 'Homa Bay', subCounties: ['Homa Bay Town', 'Ndhiwa', 'Suba North', 'Suba South', 'Kabondo Kasipul', 'Kasipul', 'Rangwe', 'Karachuonyo'] },
  { code: '044', name: 'Migori', subCounties: ['Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Rongo', 'Awendo', 'Kuria East', 'Kuria West'] },
  { code: '045', name: 'Kisii', subCounties: ['Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Masaba', 'Nyaribari Chache', 'Bomachoge Borabu', 'Bomachoge Chache', 'Bobasi', 'South Mugirango', 'Bonchari'] },
  { code: '046', name: 'Nyamira', subCounties: ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu'] },
  { code: '047', name: 'Nairobi City', subCounties: ['Westlands', 'Dagoretti North', 'Dagoretti South', 'Lang\'ata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare'] },
];

export interface ConstitutionalClause {
  article: string;
  title: string;
  badge: string;
  summary: string;
  legalText: string;
  obligation: string;
}

export const CONSTITUTIONAL_FRAMEWORK: Record<string, ConstitutionalClause> = {
  ARTICLE_53_CHILD_RIGHTS: {
    article: 'Article 53',
    title: 'Rights of Children',
    badge: 'Child Welfare & Protection',
    summary: 'Guarantees every child a name, nationality, free & compulsory basic education, and protection from all harm.',
    legalText: 'Art. 53(1): Every child has the right (a) to a name and a nationality from birth; (b) to free and compulsory basic education; (d) to be protected from abuse, neglect, harmful cultural practices, all forms of violence, inhuman treatment or punishment, and hazardous or exploitative labour.',
    obligation: 'Schools must verify birth certificate details for NEMIS UPI and enforce a zero-tolerance policy against corporal punishment and neglect.',
  },
  ARTICLE_53_2_BEST_INTERESTS: {
    article: 'Article 53(2)',
    title: 'The Best Interests Principle',
    badge: 'Paramount Standard',
    summary: 'The child\'s best interests are of paramount importance in every matter concerning the child.',
    legalText: 'A child\'s best interests are of paramount importance in every matter concerning the child.',
    obligation: 'All pedagogical, disciplinary, administrative, and data management decisions must prioritize the child\'s health, dignity, and wellbeing.',
  },
  ARTICLE_54_DISABILITY_INCLUSION: {
    article: 'Article 54',
    title: 'Rights of Persons with Disabilities',
    badge: 'Special Needs & Inclusion',
    summary: 'Guarantees access to integrated educational institutions compatible with individual needs.',
    legalText: 'Art. 54(1)(b): A person with any disability is entitled to access educational institutions and facilities for persons with disabilities that are integrated into society, to the extent compatible with the interests of the person.',
    obligation: 'Admissions must assess Special Educational Needs (SNE) to provide Braille, Kenyan Sign Language, mobility ramps, and personalized learning accommodations.',
  },
  ARTICLE_31_DATA_PRIVACY: {
    article: 'Article 31 & DPA 2019',
    title: 'Right to Privacy & Minor Data Protection',
    badge: 'ODPC Kenya Compliant',
    summary: 'Requires explicit parental/guardian consent before collecting and processing a minor\'s biodata and academic records.',
    legalText: 'Art. 31(c): Every person has the right to privacy, which includes the right not to have information relating to their family or private affairs unnecessarily required or revealed. Section 33, Data Protection Act 2019 mandates statutory guardian consent for processing children\'s personal data.',
    obligation: 'Consent must be documented, and biometric, assessment, or medical records must be securely encrypted and used strictly for educational governance.',
  },
  ARTICLE_27_NON_DISCRIMINATION: {
    article: 'Article 27',
    title: 'Equality & Freedom from Discrimination',
    badge: 'Equal Opportunity',
    summary: 'Prohibits direct or indirect discrimination on grounds of gender, religion, ethnic origin, health status, or disability.',
    legalText: 'Art. 27(4): The State shall not discriminate directly or indirectly against any person on any ground, including race, sex, pregnancy, marital status, health status, ethnic or social origin, colour, age, disability, religion, conscience, belief, culture, dress, language or birth.',
    obligation: 'Learner admission, stream assignment, and fee handling cannot discriminate or unfairly exclude any child.',
  },
  ARTICLE_237_TSC: {
    article: 'Article 237',
    title: 'Teachers Service Commission (TSC)',
    badge: 'Constitutional Commission',
    summary: 'Establishes the TSC to register trained teachers, regulate standards, and protect learners.',
    legalText: 'Art. 237(2): The Commission shall register trained teachers; recruit and employ registered teachers; assign teachers employed by the Commission; promote and transfer teachers; exercise disciplinary control; and ensure teaching standards in all learning institutions.',
    obligation: 'All educators onboarded must possess a valid, verifiable TSC Registration Number and CBC pedagogical certification.',
  },
  CHAPTER_SIX_INTEGRITY: {
    article: 'Chapter Six',
    title: 'Leadership and Integrity',
    badge: 'Public Trust & Ethics',
    summary: 'Requires public officers and educators to demonstrate honesty, accountability, and selfless service to the youth.',
    legalText: 'Articles 73–75: Authority assigned to a state/public officer is a public trust to be exercised in a manner that demonstrates respect for the people, brings honour to the nation, promotes public confidence, and serves the best interests of the community.',
    obligation: 'Educators must sign a solemn ethics declaration pledging integrity, child protection, and avoidance of conflict of interest.',
  },
  CHAPTER_ELEVEN_DEVOLUTION: {
    article: 'Chapter 11',
    title: 'Devolved Governance (47 Counties)',
    badge: 'Devolution & Local Access',
    summary: 'Coordinates education between County Governments (Pre-Primary/ECDE) and National Government (Primary & Junior Secondary).',
    legalText: 'Fourth Schedule, Part 2, Item 9: Pre-primary education, village polytechnics, homecraft centres, and childcare facilities are devolved to County Governments.',
    obligation: 'Institutions must register within their designated County and Sub-County education jurisdiction.',
  },
};

export interface SNEAccommodation {
  id: string;
  name: string;
  description: string;
  icon: string;
  kiseAlignment: string;
}

export const SNE_ACCOMMODATIONS: SNEAccommodation[] = [
  {
    id: 'NONE',
    name: 'Standard Inclusive Education',
    description: 'No specialized medical or physical accommodations required; standard CBC classroom participation.',
    icon: 'sentiment_satisfied',
    kiseAlignment: 'General Curriculum',
  },
  {
    id: 'VISUAL',
    name: 'Visual Impairment Accommodations',
    description: 'Large print materials, preferred front-row seating, tactile CBC resources, or Braille assistance.',
    icon: 'visibility',
    kiseAlignment: 'KISE Visual Support Track',
  },
  {
    id: 'HEARING',
    name: 'Hearing & Language Accommodations',
    description: 'Kenyan Sign Language (KSL) interpreter support, assistive acoustics, and visual learning aids.',
    icon: 'hearing',
    kiseAlignment: 'KISE Hearing & KSL Protocol',
  },
  {
    id: 'PHYSICAL',
    name: 'Physical & Mobility Accessibility',
    description: 'Wheelchair ramp access, ground floor classrooms, ergonomic adaptive desk, and mobility assistance.',
    icon: 'accessible',
    kiseAlignment: 'Universal Physical Accessibility',
  },
  {
    id: 'SPEECH',
    name: 'Speech & Communication Support',
    description: 'Alternative and Augmentative Communication (AAC), extra presentation time, and speech remediation.',
    icon: 'record_voice_over',
    kiseAlignment: 'Speech Therapy Support',
  },
  {
    id: 'NEURODIVERSITY',
    name: 'Neurodiversity / ADHD / Autism Spectrum',
    description: 'Structured routine, sensory break area, clear segmented tasks, and individualized CBC pacing.',
    icon: 'psychology',
    kiseAlignment: 'Individualized Education Plan (IEP)',
  },
  {
    id: 'GIFTED',
    name: 'Gifted & Talented CBC Enrichment',
    description: 'Accelerated learning pathways, inquiry-based STEM problem-solving, and advanced creative arts.',
    icon: 'stars',
    kiseAlignment: 'CBC Talent Pathway Development',
  },
];

// Helper Validators & Generators
export function isValidKenyanPhone(phone: string): boolean {
  // Accepts +254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(?:\+254|0|254)(7\d{8}|1\d{8})$/.test(cleaned);
}

export function formatKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+254')) return cleaned;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
  return phone;
}

export function isValidTscNumber(tsc: string): boolean {
  if (!tsc) return false;
  const cleaned = tsc.trim().toUpperCase();
  // Accepts TSC/123456 or 123456 (5 to 7 digits)
  return /^(?:TSC\/)?[0-9]{5,7}$/.test(cleaned);
}

export function formatTscNumber(tsc: string): string {
  const cleaned = tsc.trim().toUpperCase();
  if (cleaned.startsWith('TSC/')) return cleaned;
  const numbersOnly = cleaned.replace(/\D/g, '');
  return numbersOnly ? `TSC/${numbersOnly}` : cleaned;
}

export function isValidBirthCert(certNo: string): boolean {
  if (!certNo) return false;
  // Birth certificate entry number: digits or letters/digits 4 to 12 chars
  return /^[A-Z0-9-]{4,14}$/i.test(certNo.trim());
}

export function isValidKenyanNationalId(id: string): boolean {
  if (!id) return false;
  // Kenyan National ID is typically 6 to 9 digits, or Passport
  return /^[0-9]{6,9}$/.test(id.trim()) || /^[A-Z0-9]{6,10}$/i.test(id.trim());
}

export function generateNemisUpi(birthCertNo?: string): string {
  const seed = birthCertNo
    ? birthCertNo.replace(/\D/g, '').slice(-4).padStart(4, '0')
    : Math.floor(1000 + Math.random() * 9000).toString();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const suffix = chars[Math.floor(Math.random() * chars.length)];
  return `NEMIS-K${seed}${suffix}`;
}
