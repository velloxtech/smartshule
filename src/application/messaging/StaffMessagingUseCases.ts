import {IStaffMessageRepository} from '../../core/ports/repositories/IStaffMessageRepository';
import {IUserRepository} from '../../core/ports/repositories/IUserRepository';
import {User, UserRole, UserStatus} from '../../core/domain/user/User';
import {ForbiddenError, ValidationError, IdGenerator} from '../../core/domain/shared/Errors';
import {AcademicActor} from '../shared/TeacherAssignmentAccess';
export const STAFF_MESSAGING_ROLES = [UserRole.SUPER_ADMIN,UserRole.ADMIN,UserRole.SCHOOL_ADMIN,UserRole.HEAD_TEACHER,UserRole.DEPUTY_HEAD_TEACHER,UserRole.TEACHER,UserRole.ADMISSIONS,UserRole.BURSAR,UserRole.ACCOUNTANT];
export const STAFF_BROADCAST_ROLES = [UserRole.SUPER_ADMIN,UserRole.ADMIN,UserRole.SCHOOL_ADMIN];
export class StaffMessagingUseCases {
  constructor(private repository: IStaffMessageRepository, private users: IUserRepository) {}
  private contact(user: User) { return {id:user.id,name:user.fullName,role:user.role,isActive:user.status === UserStatus.ACTIVE}; }
  private async actor(actor: AcademicActor) {
    const user = actor?.userId ? await this.users.findById(actor.userId) : null;
    if (!user || !actor.schoolId || user.schoolId !== actor.schoolId || user.role !== actor.role || user.status !== UserStatus.ACTIVE || !STAFF_MESSAGING_ROLES.includes(user.role)) throw new ForbiddenError('Staff messaging requires an active school staff account.');
    return user;
  }
  private async peer(actor: AcademicActor, peerId: string, sending = false) {
    const peer = await this.users.findById(peerId);
    if (!peer || peer.schoolId !== actor.schoolId || !STAFF_MESSAGING_ROLES.includes(peer.role) || peer.id === actor.userId || (sending && peer.status !== UserStatus.ACTIVE)) throw new ForbiddenError('Choose an active staff member from your school.');
    return peer;
  }
  async contacts(actor: AcademicActor) {
    await this.actor(actor);
    return (await this.users.findAll({schoolId:actor.schoolId})).filter(u => u.schoolId === actor.schoolId && u.id !== actor.userId && u.status === UserStatus.ACTIVE && STAFF_MESSAGING_ROLES.includes(u.role)).map(u => this.contact(u)).sort((a,b) => a.name.localeCompare(b.name));
  }
  async inbox(actor: AcademicActor) {
    await this.actor(actor);
    const conversations = [];
    for (const row of await this.repository.inbox(actor.schoolId!,actor.userId)) {
      const peer = await this.users.findById(row.peerId);
      if (peer && peer.schoolId === actor.schoolId && STAFF_MESSAGING_ROLES.includes(peer.role)) conversations.push({...row,peer:this.contact(peer)});
    }
    return {conversations,unreadCount:conversations.reduce((sum,c) => sum+c.unreadCount,0)};
  }
  async messages(actor: AcademicActor, peerId: string, beforeId?: string) {
    await this.actor(actor); await this.peer(actor,peerId);
    const rows = await this.repository.messages(actor.schoolId!,actor.userId,peerId,beforeId,51);
    const messages = rows.slice(0,50);
    return {messages:messages.reverse(),hasMore:rows.length > 50,nextCursor:rows.length > 50 ? rows[49].id : null};
  }
  async send(actor: AcademicActor, input: {recipientId: string; body: string}) {
    await this.actor(actor);await this.peer(actor,input.recipientId,true);
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!body || body.length > 5000) throw new ValidationError('Enter a message of 1 to 5,000 characters.');
    const message = {id:IdGenerator.generate(),schoolId:actor.schoolId!,senderId:actor.userId,recipientId:input.recipientId,body,createdAt:new Date().toISOString(),readAt:null};
    await this.repository.save(message);return message;
  }
  async sendToAllTeachers(actor: AcademicActor, input: {body: string}) {
    const sender = await this.actor(actor);
    if (!STAFF_BROADCAST_ROLES.includes(sender.role)) throw new ForbiddenError('Only school administrators can message all teachers at once.');
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!body || body.length > 5000) throw new ValidationError('Enter a message of 1 to 5,000 characters.');
    const teachers = [...new Map((await this.users.findAll({schoolId:sender.schoolId}))
      .filter(user => user.schoolId === sender.schoolId && user.id !== sender.id && user.role === UserRole.TEACHER && user.status === UserStatus.ACTIVE)
      .map(user => [user.id,user])).values()];
    if (!teachers.length) throw new ValidationError('There are no active teacher accounts in your school to message.');
    const createdAt = new Date().toISOString();
    const messages = teachers.map(teacher => ({id:IdGenerator.generate(),schoolId:actor.schoolId!,senderId:sender.id,recipientId:teacher.id,body,createdAt,readAt:null}));
    await this.repository.saveMany(messages);
    return {recipientCount:messages.length,createdAt};
  }
  async markRead(actor: AcademicActor, peerId: string, throughId: string) {
    await this.actor(actor);await this.peer(actor,peerId);
    await this.repository.markRead(actor.schoolId!,actor.userId,peerId,throughId,new Date().toISOString());
  }
}
