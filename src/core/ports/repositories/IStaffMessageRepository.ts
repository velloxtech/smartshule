import {StaffMessage, StaffConversation} from '../../domain/messaging/StaffMessage';
export interface IStaffMessageRepository {
  save(message: StaffMessage): Promise<void>;
  /** Avoid partial delivery if the batch write fails. */
  saveMany(messages: StaffMessage[]): Promise<void>;
  inbox(schoolId: string, userId: string): Promise<StaffConversation[]>;
  messages(schoolId: string, userId: string, peerId: string, beforeId?: string, limit?: number): Promise<StaffMessage[]>;
  markRead(schoolId: string, userId: string, peerId: string, throughId: string, readAt: string): Promise<void>;
}
