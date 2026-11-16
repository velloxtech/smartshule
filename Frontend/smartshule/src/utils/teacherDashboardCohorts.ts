interface AssignedClass {
  id:string;
  name:string;
  wholeClass?:boolean;
  streams:Array<{id:string;name:string}>;
  classTeacherByStream?:Record<string,boolean>;
}

/** Roster access comes from a verified class duty, never from a subject assignment. */
export function teacherDashboardCohorts(classes:AssignedClass[]){
  return classes.flatMap(c=>[
    ...(c.wholeClass?[{key:c.id,classId:c.id,streamId:'',label:c.name,isClassTeacher:c.classTeacherByStream?.['']===true}]:[]),
    ...c.streams.map(s=>({key:c.id+'::'+s.id,classId:c.id,streamId:s.id,label:c.name+' · '+s.name,isClassTeacher:c.classTeacherByStream?.[s.id]===true}))
  ]).sort((a,b)=>Number(b.isClassTeacher)-Number(a.isClassTeacher));
}
