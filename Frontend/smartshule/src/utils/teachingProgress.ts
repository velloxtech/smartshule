type LessonEvidence = {
  id?: string;
  teacherSelfReflection?: string;
  afterClassReport?: {teachingStatus?: string};
};
type TeachingEvidence = {
  status?: string;
  isOfficialCoverage?: boolean;
  reflection?: string;
  reflectionData?: {teachingStatus?: string;whatWentWell?: string;challengesFaced?: string};
};
export type TeachingProgressInput = {
  lessonPlan?: LessonEvidence | null;
  record?: TeachingEvidence | null;
  statuses?: {planned?: boolean;taught?: boolean;reflection?: boolean};
};
const hasText = (value: unknown) => typeof value === 'string' && !!value.trim();

/** Saved-evidence indicators, separate from coverage approval. */
export function teachingProgressChecks({lessonPlan,record,statuses}: TeachingProgressInput) {
  const teachingStatus=record?.reflectionData?.teachingStatus||lessonPlan?.afterClassReport?.teachingStatus;
  const hasEvidence=!!(record||lessonPlan?.afterClassReport)&&record?.status!=='RETURNED';
  const taught=!!statuses?.taught||(hasEvidence&&(!teachingStatus||teachingStatus==='COMPLETED'));
  const partial=!taught&&hasEvidence&&teachingStatus==='PARTIAL';
  const planned=statuses?.planned??!!lessonPlan?.id;
  const reflected=!!statuses?.reflection||[lessonPlan?.teacherSelfReflection,record?.reflection,
    record?.reflectionData?.whatWentWell,record?.reflectionData?.challengesFaced].some(hasText);
  let teachingDetail='Not yet recorded as taught';
  if(record?.status==='RETURNED'&&!statuses?.taught)teachingDetail='Returned — update the teaching record';
  else if(partial)teachingDetail='Partly taught — continue';
  else if(taught)teachingDetail=statuses?.taught||(record?.status==='APPROVED'&&record.isOfficialCoverage)?'Verified by admin':record?.status==='APPROVED'?'Teaching record approved':record?.status==='DRAFT'?'Teaching saved in draft':'Reported — awaiting review';
  else if(teachingStatus==='POSTPONED')teachingDetail='Postponed — not taught';
  else if(teachingStatus==='CANCELLED')teachingDetail='Cancelled — not taught';
  return [
    {label:'Planned',checked:planned,partial:false,detail:planned?'Lesson plan saved':'Lesson plan needed'},
    {label:'Taught',checked:taught,partial,detail:teachingDetail},
    {label:'Reflection',checked:reflected,partial:false,detail:reflected?'Reflection saved':'Reflection needed'},
  ];
}
