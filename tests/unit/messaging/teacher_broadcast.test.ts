import {StaffMessagingUseCases} from '../../../src/application/messaging/StaffMessagingUseCases';
import {InMemoryStaffMessageRepository} from '../../../src/infrastructure/database/in-memory/InMemoryStaffMessageRepository';
import {InMemoryUserRepository} from '../../../src/infrastructure/database/in-memory/InMemoryRepositories';
import {BroadcastStaffMessageSchema} from '../../../src/infrastructure/http/controllers/StaffMessagingController';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {ForbiddenError,ValidationError} from '../../../src/core/domain/shared/Errors';

const admin={userId:'admin',schoolId:'school',role:UserRole.ADMIN};
const first={userId:'teacher-1',schoolId:'school',role:UserRole.TEACHER};
const second={userId:'teacher-2',schoolId:'school',role:UserRole.TEACHER};
const accounts=[admin,first,second,{userId:'school-admin',schoolId:'school',role:UserRole.SCHOOL_ADMIN},{userId:'super-admin',schoolId:'school',role:UserRole.SUPER_ADMIN},{userId:'head',schoolId:'school',role:UserRole.HEAD_TEACHER},{userId:'bursar',schoolId:'school',role:UserRole.BURSAR},{userId:'parent',schoolId:'school',role:UserRole.PARENT},{userId:'student',schoolId:'school',role:UserRole.STUDENT},{userId:'foreign-teacher',schoolId:'other-school',role:UserRole.TEACHER}];
describe('Admin messages to all teachers',()=>{
  let users:InMemoryUserRepository,repository:InMemoryStaffMessageRepository,service:StaffMessagingUseCases;
  beforeEach(async()=>{
    users=new InMemoryUserRepository();repository=new InMemoryStaffMessageRepository();service=new StaffMessagingUseCases(repository,users);
    for(const actor of accounts)await users.save(User.create({schoolId:actor.schoolId,role:actor.role,firstName:actor.userId,lastName:'Test',status:UserStatus.ACTIVE,passwordHash:'synthetic'},actor.userId));
    await users.save(User.create({schoolId:'school',role:UserRole.TEACHER,firstName:'Inactive',lastName:'Teacher',status:UserStatus.INACTIVE,passwordHash:'synthetic'},'inactive'));
  });
  it('delivers once to each active teacher in the sender’s school, with private replies and independent read status',async()=>{
    expect(await service.sendToAllTeachers(admin,{body:'  Staff meeting tomorrow.\nBring your plans.  '})).toMatchObject({recipientCount:2});
    const inbox=await service.inbox(admin);expect(inbox.conversations.map(row=>row.peerId).sort()).toEqual(['teacher-1','teacher-2']);
    const messages=(await service.messages(first,'admin')).messages;
    expect(messages).toHaveLength(1);expect(messages[0]).toMatchObject({schoolId:'school',senderId:'admin',recipientId:'teacher-1',body:'Staff meeting tomorrow.\nBring your plans.',readAt:null});
    expect((await service.inbox(second)).unreadCount).toBe(1);
    await service.markRead(first,'admin',messages[0].id);
    expect((await service.inbox(first)).unreadCount).toBe(0);expect((await service.inbox(second)).unreadCount).toBe(1);
    await service.send(first,{recipientId:'admin',body:'I will attend.'});
    expect((await service.messages(second,'admin')).messages).toHaveLength(1);
    expect((await service.messages(admin,'teacher-1')).messages.map(row=>row.body)).toContain('I will attend.');
  });
  it.each(accounts.filter(actor=>[UserRole.ADMIN,UserRole.SCHOOL_ADMIN,UserRole.SUPER_ADMIN].includes(actor.role)))('allows administrator role $role',async actor=>{
    expect((await service.sendToAllTeachers(actor,{body:'School notice'})).recipientCount).toBe(2);
  });
  it.each(accounts.filter(actor=>![UserRole.ADMIN,UserRole.SCHOOL_ADMIN,UserRole.SUPER_ADMIN].includes(actor.role)))('rejects a non-admin sender $userId',async actor=>{
    await expect(service.sendToAllTeachers(actor,{body:'Unapproved broadcast'})).rejects.toBeInstanceOf(ForbiddenError);
    expect((await repository.inbox('school','admin'))).toEqual([]);
  });
  it('rejects stale roles, wrong school contexts and inactive administrators',async()=>{
    await expect(service.sendToAllTeachers({...first,role:UserRole.ADMIN},{body:'Forged admin role'})).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.sendToAllTeachers({...admin,schoolId:'other-school'},{body:'Wrong school'})).rejects.toBeInstanceOf(ForbiddenError);
    await users.save(User.create({schoolId:'school',role:UserRole.ADMIN,firstName:'Inactive',lastName:'Admin',status:UserStatus.INACTIVE,passwordHash:'synthetic'},'admin'));
    await expect(service.sendToAllTeachers(admin,{body:'Inactive sender'})).rejects.toBeInstanceOf(ForbiddenError);
  });
  it('recomputes active teacher accounts when sending and deduplicates the audience',async()=>{
    await service.contacts(admin);
    await users.save(User.create({schoolId:'school',role:UserRole.TEACHER,firstName:'Inactive',lastName:'Now active',status:UserStatus.ACTIVE,passwordHash:'synthetic'},'inactive'));
    const rows=await users.findAll({schoolId:'school'});
    jest.spyOn(users,'findAll').mockResolvedValue([...rows,...rows]);
    expect((await service.sendToAllTeachers(admin,{body:'Updated audience'})).recipientCount).toBe(3);
    expect((await service.messages(first,'admin')).messages).toHaveLength(1);
  });
  it('does not report success when batch storage fails, and retains no partial delivery',async()=>{
    const batch=jest.spyOn(repository,'saveMany').mockRejectedValueOnce(new Error('Storage unavailable'));
    const individual=jest.spyOn(repository,'save');
    await expect(service.sendToAllTeachers(admin,{body:'Please keep this draft'})).rejects.toThrow('Storage unavailable');
    expect(individual).not.toHaveBeenCalled();expect((await service.inbox(first)).unreadCount).toBe(0);
    batch.mockRestore();expect((await service.sendToAllTeachers(admin,{body:'Please keep this draft'})).recipientCount).toBe(2);
  });
  it('rejects invalid content and an empty audience without writing any messages',async()=>{
    for(const body of ['', '   ', 'x'.repeat(5001)])await expect(service.sendToAllTeachers(admin,{body})).rejects.toBeInstanceOf(ValidationError);
    const emptyUsers=new InMemoryUserRepository();await emptyUsers.save((await users.findById('admin'))!);
    const emptyService=new StaffMessagingUseCases(repository,emptyUsers);
    const batch=jest.spyOn(repository,'saveMany');
    await expect(emptyService.sendToAllTeachers(admin,{body:'No teachers available'})).rejects.toBeInstanceOf(ValidationError);expect(batch).not.toHaveBeenCalled();
  });
  it('does not accept caller-supplied recipients, school IDs or sender IDs',()=>{
    expect(BroadcastStaffMessageSchema.parse({body:'  All teachers notice  '})).toEqual({body:'All teachers notice'});
    for(const extra of [{schoolId:'other-school'},{senderId:'super-admin'},{recipientIds:['foreign-teacher']},{recipientId:'parent'}])expect(BroadcastStaffMessageSchema.safeParse({body:'School notice',...extra}).success).toBe(false);
  });
});
