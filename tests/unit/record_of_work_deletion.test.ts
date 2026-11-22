import { RecordOfWorkUseCases } from '../../src/application/curriculum-plans/RecordOfWorkUseCases';

describe('Record of Work deletion permissions and coverage cleanup', () => {
  const record = {id:'record',teacherId:'teacher',schoolId:'school',status:'DRAFT',weekNumber:1};
  const setup = (overrides = {}, tracker?: any) => {
    const repo = {findById:jest.fn().mockResolvedValue({...record,...overrides}),delete:jest.fn().mockResolvedValue(true)};
    return {repo, useCases:new RecordOfWorkUseCases(repo as any,tracker)};
  };
  it('lets an owner delete a draft', async () => {
    const {repo,useCases}=setup();
    await expect(useCases.deleteDiaryEntry('record',{userId:'teacher',role:'TEACHER',schoolId:'school'})).resolves.toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('record');
  });
  it.each([{userId:'other',role:'TEACHER',schoolId:'school'}, {userId:'parent',role:'PARENT',schoolId:'school'}, {userId:'admin',role:'ADMIN',schoolId:'other-school'}])('rejects unauthorized deletion: %j', async actor => {
    const {repo,useCases}=setup();
    await expect(useCases.deleteDiaryEntry('record',actor)).rejects.toThrow();
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it('protects approved work from teacher deletion', async () => {
    const {repo,useCases}=setup({status:'APPROVED'});
    await expect(useCases.deleteDiaryEntry('record',{userId:'teacher',role:'TEACHER',schoolId:'school'})).rejects.toThrow('Approved');
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it.each(['ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'])('lets %s delete approved work and removes its tracker evidence', async role => {
    const tracker:any={dailyLogs:[{id:'record',weekNumber:1,endorsement:{}}],items:[{weekNumber:1,isCovered:true}],removeDailyLog:jest.fn(function(this:any){this.dailyLogs=[];}),setWeekPlan:jest.fn(),returnWeekCoverage:jest.fn()};
    const trackers={findTrackers:jest.fn().mockResolvedValue([tracker]),update:jest.fn()};
    const {repo,useCases}=setup({status:'APPROVED'},trackers);
    await useCases.deleteDiaryEntry('record',{userId:'leader',role,schoolId:'school'});
    expect(tracker.removeDailyLog).toHaveBeenCalledWith('record');
    expect(tracker.returnWeekCoverage).toHaveBeenCalled();
    expect(trackers.update).toHaveBeenCalledWith(tracker);
    expect(repo.delete).toHaveBeenCalledWith('record');
  });
  it('retains week approval when another endorsed record remains', async () => {
    const tracker:any={dailyLogs:[{id:'record',weekNumber:1},{id:'other',weekNumber:1,status:'TAUGHT',endorsement:{}}],items:[{weekNumber:1,isCovered:true}],removeDailyLog:jest.fn(function(this:any){this.dailyLogs=this.dailyLogs.filter((log:any)=>log.id!=='record');}),setWeekPlan:jest.fn(),returnWeekCoverage:jest.fn()};
    const {useCases}=setup({status:'APPROVED'},{findTrackers:jest.fn().mockResolvedValue([tracker]),update:jest.fn()});
    await useCases.deleteDiaryEntry('record',{userId:'leader',role:'ADMIN',schoolId:'school'});
    expect(tracker.returnWeekCoverage).not.toHaveBeenCalled();
    expect(tracker.setWeekPlan).toHaveBeenCalledWith(1,{lessonsTaught:1});
    expect(tracker.dailyLogs[0].id).toBe('other');
  });

});
