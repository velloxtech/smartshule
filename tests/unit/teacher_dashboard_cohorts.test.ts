import {teacherDashboardCohorts} from '../../Frontend/smartshule/src/utils/teacherDashboardCohorts';

describe('Teacher dashboard roster permissions',()=>{
 it('keeps subject assignments and prefers a verified class-teacher cohort',()=>{
  const choices=teacherDashboardCohorts([{id:'g4',name:'Grade 4',streams:[{id:'west',name:'West'},{id:'alpha',name:'Alpha'}],classTeacherByStream:{west:false,alpha:true}}]);
  expect(choices.map(c=>[c.streamId,c.isClassTeacher])).toEqual([['alpha',true],['west',false]]);
  expect(choices.find(c=>c.key==='g4::west')).toMatchObject({label:'Grade 4 · West',isClassTeacher:false});
 });
 it('never infers private roster permission from a subject-only or legacy whole-class selector',()=>{
  const choices=teacherDashboardCohorts([{id:'g5',name:'Grade 5',wholeClass:true,streams:[]}]);
  expect(choices).toHaveLength(1);expect(choices[0].isClassTeacher).toBe(false);
 });
 it('supports explicit whole-class duties without granting unrelated stream permissions',()=>{
  const choices=teacherDashboardCohorts([{id:'g4',name:'Grade 4',wholeClass:true,streams:[{id:'west',name:'West'}],classTeacherByStream:{'':true,west:false}}]);
  expect(choices.find(c=>c.key==='g4')?.isClassTeacher).toBe(true);expect(choices.find(c=>c.streamId==='west')?.isClassTeacher).toBe(false);
 });
 it('shows an empty list only when no authorized cohorts exist',()=>{expect(teacherDashboardCohorts([])).toEqual([]);});
});
