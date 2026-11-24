import {PostgresLessonPlanRepository,PostgresGuardianRepository,PostgresUserRepository} from '../../src/infrastructure/database/postgres/PostgresRepositories';
import {loadUsersByIds} from '../../src/application/shared/LoadUsersByIds';

test('lesson-plan filters reach SQL instead of transferring unrelated rows',async()=>{
 const query=jest.fn(async()=>({rows:[]}));
 await new PostgresLessonPlanRepository({query} as any).findAll({teacherId:'teacher',learningAreaId:'area',classRoomId:'class',streamId:'stream',startDate:'2026-01-01',endDate:'2026-01-31'});
 expect(query).toHaveBeenCalledWith('SELECT * FROM lesson_plans WHERE teacher_id = $1 AND learning_area_id = $2 AND classroom_id = $3 AND stream_id = $4 AND lesson_date >= $5 AND lesson_date <= $6',['teacher','area','class','stream','2026-01-01','2026-01-31']);
});

test('batch contact reads skip empty lists and bind deduplicated IDs',async()=>{
 const query=jest.fn(async()=>({rows:[]}));const users=new PostgresUserRepository({query} as any);
 await users.findByIds([]);expect(query).not.toHaveBeenCalled();
 await users.findByIds(['u','u']);expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ANY($1::text[])',[['u']]);
 const guardians=new PostgresGuardianRepository({query} as any);await guardians.findForStudents(['student'],['guardian']);
 expect(query).toHaveBeenLastCalledWith('SELECT * FROM guardians WHERE id = ANY($1::text[]) OR student_ids ?| $2::text[]',[['guardian'],['student']]);
});

test('contact loader batches IDs and preserves absent contacts without extra point lookups',async()=>{
 const user={id:'u'};const repository={findByIds:jest.fn(async()=>[user]),findById:jest.fn()};
 const contacts=await loadUsersByIds(repository as any,['u','u','missing']);
 expect(contacts.get('u')).toBe(user);expect(contacts.has('missing')).toBe(false);
 expect(repository.findByIds).toHaveBeenCalledTimes(1);expect(repository.findById).not.toHaveBeenCalled();
});
