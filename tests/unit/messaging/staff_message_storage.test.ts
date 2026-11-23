import {Pool} from 'pg';
import {PostgresStaffMessageRepository,STAFF_MESSAGE_SCHEMA} from '../../../src/infrastructure/database/postgres/PostgresStaffMessageRepository';
import {readFileSync} from 'fs';
import {resolve} from 'path';

describe('PostgreSQL staff message storage contract',()=>{
 let query:jest.Mock,repository:PostgresStaffMessageRepository;
 beforeEach(()=>{query=jest.fn().mockResolvedValue({rows:[]});repository=new PostgresStaffMessageRepository({query} as unknown as Pool);});
 it('parameterizes message content and the authenticated participant IDs',async()=>{
  const message={id:'message',schoolId:'school',senderId:'teacher',recipientId:'head',body:"Hello'); DROP TABLE users; --",createdAt:'2026-11-22T10:00:00.000Z',readAt:null};
  await repository.save(message);
  expect(query.mock.calls[0][0]).not.toContain(message.body);
  expect(query.mock.calls[0][1]).toEqual(['message','school','teacher','head',message.body,message.createdAt,null]);
 });
 it('restores dates and unread counts from persisted rows',async()=>{
  query.mockResolvedValue({rows:[{id:'message',school_id:'school',sender_id:'teacher',recipient_id:'head',body:'Persisted',created_at:new Date('2026-11-22T10:00:00Z'),read_at:null,peer_id:'teacher',unread_count:'3'}]});
  const inbox=await repository.inbox('school','head');
  expect(inbox[0]).toMatchObject({peerId:'teacher',unreadCount:3,lastMessage:{body:'Persisted',createdAt:'2026-11-22T10:00:00.000Z',readAt:null}});
  const reloaded=new PostgresStaffMessageRepository({query} as unknown as Pool);
  expect((await reloaded.messages('school','head','teacher'))[0].body).toBe('Persisted');
 });
  it('writes a teacher broadcast in one parameterized atomic statement',async()=>{
    const messages=['teacher-one','teacher-two'].map((recipientId,index)=>({id:`broadcast-${index}`,schoolId:'school',senderId:'admin',recipientId,body:"Reminder: bring tomorrow's plans.",createdAt:'2026-11-23T10:00:00.000Z',readAt:null}));
    await repository.saveMany(messages);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql,parameters]=query.mock.calls[0];
    expect(sql).toContain('jsonb_to_recordset($1::jsonb)');expect(sql).not.toContain(messages[0].body);
    expect(JSON.parse(parameters[0])).toEqual(messages.map(message=>({id:message.id,school_id:'school',sender_id:'admin',recipient_id:message.recipientId,body:message.body,created_at:message.createdAt,read_at:null})));
  });
  it('propagates a batch failure and performs no fallback individual inserts',async()=>{
    query.mockRejectedValueOnce(new Error('Batch constraint failed'));
    await expect(repository.saveMany([{id:'message',schoolId:'school',senderId:'admin',recipientId:'teacher',body:'Reminder',createdAt:'2026-11-23T10:00:00.000Z',readAt:null}])).rejects.toThrow('Batch constraint failed');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('skips empty batches',async()=>{
    await repository.saveMany([]);expect(query).not.toHaveBeenCalled();
  });
 it('bounds history and read receipts to the school, both participants and cursor',async()=>{
  await repository.messages('school','head','teacher','cursor',51);
  expect(query.mock.calls[0][1]).toEqual(['school','head','teacher','cursor',51]);
  expect(query.mock.calls[0][0]).toContain('FROM scoped WHERE id=$4');
  await repository.markRead('school','head','teacher','cursor','2026-11-22T11:00:00.000Z');
  expect(query.mock.calls[1][0]).toContain('recipient_id=$2 AND sender_id=$3 AND read_at IS NULL');
  expect(query.mock.calls[1][0]).toContain('WHERE id=$4 AND school_id=$1');
  expect(query.mock.calls[1][1]).toEqual(['school','head','teacher','cursor','2026-11-22T11:00:00.000Z']);
 });
 it('keeps automatic schema initialization identical to the deployable migration',()=>{
  expect(STAFF_MESSAGE_SCHEMA).toBe(readFileSync(resolve(__dirname,'../../../database/migrations/20261122_staff_messaging.sql'),'utf8'));
 });
});
