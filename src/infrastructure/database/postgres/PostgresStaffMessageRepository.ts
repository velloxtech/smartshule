import {Pool} from 'pg';
import {IStaffMessageRepository} from '../../../core/ports/repositories/IStaffMessageRepository';
import {StaffMessage, StaffConversation} from '../../../core/domain/messaging/StaffMessage';
export const STAFF_MESSAGE_SCHEMA = `CREATE TABLE IF NOT EXISTS staff_messages (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS staff_messages_sender_idx ON staff_messages (school_id, sender_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS staff_messages_recipient_idx ON staff_messages (school_id, recipient_id, created_at DESC, id DESC);
`;
export class PostgresStaffMessageRepository implements IStaffMessageRepository {
  constructor(private pool: Pool) {}
  private map(r: any): StaffMessage { return {id:r.id,schoolId:r.school_id,senderId:r.sender_id,recipientId:r.recipient_id,body:r.body,createdAt:new Date(r.created_at).toISOString(),readAt:r.read_at ? new Date(r.read_at).toISOString() : null}; }
  async save(m: StaffMessage) {
    await this.pool.query('INSERT INTO staff_messages (id,school_id,sender_id,recipient_id,body,created_at,read_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',[m.id,m.schoolId,m.senderId,m.recipientId,m.body,m.createdAt,m.readAt]);
  }
  async saveMany(messages: StaffMessage[]) {
    if (!messages.length) return;
    // One statement is atomic and uses one parameter regardless of audience size.
    const rows = messages.map(m => ({id:m.id,school_id:m.schoolId,sender_id:m.senderId,recipient_id:m.recipientId,body:m.body,created_at:m.createdAt,read_at:m.readAt}));
    await this.pool.query(`INSERT INTO staff_messages (id,school_id,sender_id,recipient_id,body,created_at,read_at)
      SELECT id,school_id,sender_id,recipient_id,body,created_at::timestamptz,read_at::timestamptz
      FROM jsonb_to_recordset($1::jsonb) AS audience(id text,school_id text,sender_id text,recipient_id text,body text,created_at text,read_at text)`,[JSON.stringify(rows)]);
  }
  async inbox(schoolId: string, userId: string): Promise<StaffConversation[]> {
    const result = await this.pool.query(`WITH scoped AS (
      SELECT *, CASE WHEN sender_id=$2 THEN recipient_id ELSE sender_id END AS peer_id
      FROM staff_messages WHERE school_id=$1 AND (sender_id=$2 OR recipient_id=$2)
    ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY peer_id ORDER BY created_at DESC,id DESC) AS rank,
      count(*) FILTER (WHERE recipient_id=$2 AND read_at IS NULL) OVER (PARTITION BY peer_id) AS unread_count FROM scoped
    ) SELECT * FROM ranked WHERE rank=1 ORDER BY created_at DESC,id DESC`,[schoolId,userId]);
    return result.rows.map(r => ({peerId:r.peer_id,lastMessage:this.map(r),unreadCount:Number(r.unread_count)}));
  }
  async messages(schoolId: string,userId: string,peerId: string,beforeId?: string,limit=50) {
    const result = await this.pool.query(`WITH scoped AS (SELECT * FROM staff_messages WHERE school_id=$1 AND ((sender_id=$2 AND recipient_id=$3) OR (sender_id=$3 AND recipient_id=$2)))
      SELECT * FROM scoped WHERE ($4::text IS NULL OR (created_at,id) < (SELECT created_at,id FROM scoped WHERE id=$4)) ORDER BY created_at DESC,id DESC LIMIT $5`,[schoolId,userId,peerId,beforeId || null,limit]);
    return result.rows.map(r => this.map(r));
  }
  async markRead(schoolId: string,userId: string,peerId: string,throughId: string,readAt: string) {
    await this.pool.query(`UPDATE staff_messages SET read_at=$5 WHERE school_id=$1 AND recipient_id=$2 AND sender_id=$3 AND read_at IS NULL AND (created_at,id) <= (
      SELECT created_at,id FROM staff_messages WHERE id=$4 AND school_id=$1 AND ((sender_id=$2 AND recipient_id=$3) OR (sender_id=$3 AND recipient_id=$2)))`,[schoolId,userId,peerId,throughId,readAt]);
  }
}
