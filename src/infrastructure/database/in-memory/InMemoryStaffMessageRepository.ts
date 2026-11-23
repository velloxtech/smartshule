import {IStaffMessageRepository} from '../../../core/ports/repositories/IStaffMessageRepository';
import {StaffMessage, StaffConversation} from '../../../core/domain/messaging/StaffMessage';
export class InMemoryStaffMessageRepository implements IStaffMessageRepository {
  private rows = new Map<string, StaffMessage>();
  async save(message: StaffMessage) { this.rows.set(message.id, {...message}); }
  async saveMany(messages: StaffMessage[]) {
    const copies = messages.map(message => ({...message}));
    for (const message of copies) this.rows.set(message.id, message);
  }
  private sorted(schoolId: string, userId: string, peerId?: string) {
    return [...this.rows.values()].filter(m => m.schoolId === schoolId &&
      (peerId ? (m.senderId === userId && m.recipientId === peerId) || (m.senderId === peerId && m.recipientId === userId) : m.senderId === userId || m.recipientId === userId))
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }
  async inbox(schoolId: string, userId: string) {
    const conversations = new Map<string, StaffConversation>();
    for (const m of this.sorted(schoolId,userId)) {
      const peerId = m.senderId === userId ? m.recipientId : m.senderId;
      if (!conversations.has(peerId)) conversations.set(peerId,{peerId,lastMessage:{...m},unreadCount:0});
      if (m.recipientId === userId && !m.readAt) conversations.get(peerId)!.unreadCount++;
    }
    return [...conversations.values()];
  }
  async messages(schoolId: string, userId: string, peerId: string, beforeId?: string, limit = 50) {
    const rows = this.sorted(schoolId,userId,peerId);
    const index = beforeId ? rows.findIndex(m => m.id === beforeId) : -1;
    if (beforeId && index < 0) return [];
    return rows.slice(index+1,index+1+limit).map(m => ({...m}));
  }
  async markRead(schoolId: string, userId: string, peerId: string, throughId: string, readAt: string) {
    const rows = this.sorted(schoolId,userId,peerId);
    const index = rows.findIndex(m => m.id === throughId);
    if (index < 0) return;
    for (const m of rows.slice(index)) if (m.recipientId === userId && !m.readAt) this.rows.set(m.id,{...m,readAt});
  }
}
