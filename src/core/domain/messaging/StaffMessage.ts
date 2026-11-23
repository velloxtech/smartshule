export interface StaffMessage {
  id: string;
  schoolId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}
export interface StaffConversation {
  peerId: string;
  lastMessage: StaffMessage;
  unreadCount: number;
}
