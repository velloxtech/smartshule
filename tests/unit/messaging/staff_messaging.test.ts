import {StaffMessagingUseCases} from '../../../src/application/messaging/StaffMessagingUseCases';
import {InMemoryStaffMessageRepository} from '../../../src/infrastructure/database/in-memory/InMemoryStaffMessageRepository';
import {InMemoryUserRepository} from '../../../src/infrastructure/database/in-memory/InMemoryRepositories';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {ForbiddenError,ValidationError} from '../../../src/core/domain/shared/Errors';
import {SendStaffMessageSchema,ReadStaffMessagesSchema} from '../../../src/infrastructure/http/controllers/StaffMessagingController';

const teacher={userId:'teacher',role:UserRole.TEACHER,schoolId:'school'};
const head={userId:'head',role:UserRole.HEAD_TEACHER,schoolId:'school'};
const colleague={userId:'colleague',role:UserRole.BURSAR,schoolId:'school'};
const outsider={userId:'outsider',role:UserRole.TEACHER,schoolId:'other-school'};
const parent={userId:'parent',role:UserRole.PARENT,schoolId:'school'};

describe('Staff messaging conversations and privacy',()=>{
 let users:InMemoryUserRepository,repository:InMemoryStaffMessageRepository,service:StaffMessagingUseCases;
 beforeEach(async()=>{
  users=new InMemoryUserRepository();repository=new InMemoryStaffMessageRepository();service=new StaffMessagingUseCases(repository,users);
  for(const actor of [teacher,head,colleague,outsider,parent]) await users.save(User.create({schoolId:actor.schoolId,firstName:actor.userId,lastName:'Synthetic',role:actor.role,status:UserStatus.ACTIVE,passwordHash:'test-secret',email:actor.userId+'@example.test'},actor.userId));
  await users.save(User.create({schoolId:'school',firstName:'Inactive',lastName:'Staff',role:UserRole.TEACHER,status:UserStatus.INACTIVE,passwordHash:'test'},'inactive'));
 });
 it('lists active colleagues from the same school without exposing account secrets',async()=>{
  const contacts=await service.contacts(teacher);
  expect(contacts.map(c=>c.id).sort()).toEqual(['colleague','head']);
  for(const contact of contacts)expect(Object.keys(contact).sort()).toEqual(['id','isActive','name','role']);
 });
 it('sends, replies and reloads saved messages using the authenticated sender',async()=>{
  const sent=await service.send(teacher,{recipientId:head.userId,body:'  Can we swap the lesson?  '});
  expect(sent).toMatchObject({senderId:'teacher',recipientId:'head',schoolId:'school',body:'Can we swap the lesson?',readAt:null});
  await service.send(head,{recipientId:teacher.userId,body:'Yes, the timetable is updated.'});
  const reloaded=new StaffMessagingUseCases(repository,users);
  const page=await reloaded.messages(teacher,head.userId);
  expect(page.messages).toHaveLength(2);expect(page.messages.map(m=>m.body)).toContain('Yes, the timetable is updated.');
  const inbox=await reloaded.inbox(head);expect(inbox.unreadCount).toBe(1);expect(inbox.conversations[0].peer.id).toBe('teacher');
 });
 it('marks only received messages through the displayed boundary as read',async()=>{
  const make=async(id:string,senderId:string,recipientId:string,day:number)=>repository.save({id,schoolId:'school',senderId,recipientId,body:id,createdAt:`2026-11-${day}T10:00:00.000Z`,readAt:null});
  await make('seen','teacher','head',20);await make('new','teacher','head',21);await make('other','colleague','head',20);
  await service.markRead(head,'teacher','seen');
  const rows=await service.messages(teacher,'head');
  expect(rows.messages.find(m=>m.id==='seen')!.readAt).not.toBeNull();expect(rows.messages.find(m=>m.id==='new')!.readAt).toBeNull();
  expect((await service.inbox(head)).unreadCount).toBe(2);
  await service.markRead(teacher,'head','new');
  expect((await service.inbox(head)).unreadCount).toBe(2);
 });
 it('paginates older history without losing or duplicating messages sharing a timestamp',async()=>{
  for(let i=0;i<111;i++)await repository.save({id:String(i).padStart(3,'0'),schoolId:'school',senderId:'teacher',recipientId:'head',body:String(i),createdAt:'2026-11-22T10:00:00.000Z',readAt:null});
  const first=await service.messages(head,'teacher');expect(first.messages).toHaveLength(50);expect(first.hasMore).toBe(true);
  const second=await service.messages(head,'teacher',first.nextCursor!);expect(second.messages).toHaveLength(50);
  const third=await service.messages(head,'teacher',second.nextCursor!);expect(third.messages).toHaveLength(11);expect(third.hasMore).toBe(false);
  expect(new Set([...first.messages,...second.messages,...third.messages].map(m=>m.id)).size).toBe(111);
 });
 it('isolates conversations, school data, read markers and foreign cursors',async()=>{
  const privateMessage=await service.send(teacher,{recipientId:'head',body:'Private'});
  expect((await service.messages(colleague,'teacher')).messages).toEqual([]);
  await service.markRead(colleague,'teacher',privateMessage.id);
  expect((await service.inbox(head)).unreadCount).toBe(1);
  await expect(service.messages(outsider,'teacher')).rejects.toBeInstanceOf(ForbiddenError);
  await expect(service.send(teacher,{recipientId:'outsider',body:'No'})).rejects.toBeInstanceOf(ForbiddenError);
  expect((await service.messages(colleague,'head',privateMessage.id)).messages).toEqual([]);
 });
 it.each([parent,{...teacher,schoolId:'other-school'},{...teacher,role:UserRole.ADMIN},{...teacher,userId:'missing'}])('rejects unauthorized or stale actor %j',async actor=>{
  await expect(service.contacts(actor)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(service.send(actor,{recipientId:'head',body:'No'})).rejects.toBeInstanceOf(ForbiddenError);
  await expect(service.inbox(actor)).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('rejects inactive recipients, parents and self-messages',async()=>{
  for(const recipientId of ['inactive','parent','teacher','missing'])await expect(service.send(teacher,{recipientId,body:'No'})).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('refuses empty or excessive messages and preserves message text safely',async()=>{
  for(const body of ['','   ','x'.repeat(5001)])await expect(service.send(teacher,{recipientId:'head',body})).rejects.toBeInstanceOf(ValidationError);
  const body='<script>alert(1)</script>\nKeep this as plain text.';
  expect((await service.send(teacher,{recipientId:'head',body})).body).toBe(body);
 });
 it('rejects forged sender/school fields and invalid request shapes at the API boundary',()=>{
  expect(SendStaffMessageSchema.safeParse({recipientId:'head',body:'Hello',senderId:'head',schoolId:'foreign'}).success).toBe(false);
  expect(SendStaffMessageSchema.safeParse({recipientId:'head',body:'   '}).success).toBe(false);
  expect(ReadStaffMessagesSchema.safeParse({throughId:''}).success).toBe(false);
 });
 it('keeps inactive colleagues’ history readable while preventing new sends',async()=>{
  await repository.save({id:'history',schoolId:'school',senderId:'inactive',recipientId:'teacher',body:'Earlier message',createdAt:'2026-11-20T10:00:00.000Z',readAt:null});
  expect((await service.messages(teacher,'inactive')).messages).toHaveLength(1);
  expect((await service.inbox(teacher)).conversations[0].peer.isActive).toBe(false);
 });
});
