import express from 'express';
import request from 'supertest';
import { types } from 'node:util';
import { requestReadCache, runWithReadCache, reuseRequestRead, retryTransientRead } from '../../src/infrastructure/database/RequestReadCache';

const sql = 'SELECT * FROM users WHERE id = $1';
const result = () => ({rows:[{id:'synthetic',date:new Date('2026-01-01'),bytes:Buffer.from('example')}],_parsers:[() => undefined]});

test('coalesces simultaneous and sequential reads within one response, preserving pg parser functions and isolated rows',async()=>{
 const query=jest.fn(async()=>result());
 await runWithReadCache(async()=>{
  const [a,b]=await Promise.all([reuseRequestRead(sql,['one'],query),reuseRequestRead(sql,['one'],query)]);
  a.rows[0].id='modified';expect(b.rows[0].id).toBe('synthetic');
  expect(types.isDate(b.rows[0].date)).toBe(true);expect(b.rows[0].date.toISOString()).toBe('2026-01-01T00:00:00.000Z');expect(Buffer.isBuffer(b.rows[0].bytes)).toBe(true);
  expect(typeof b._parsers[0]).toBe('function');
  await reuseRequestRead(sql,['one'],query);await reuseRequestRead(sql,['two'],query);
 });
 expect(query).toHaveBeenCalledTimes(2);
});

test('separate HTTP requests always re-read account permissions and cannot share responses',async()=>{
 let calls=0;
 const app=express();app.use(requestReadCache);
 app.get('/',async(req,res)=>{
  const query=async()=>({rows:[{actor:req.header('actor'),revision:++calls}]});
  const a=await reuseRequestRead(sql,['same-id'],query);await reuseRequestRead(sql,['same-id'],query);res.json(a.rows);
 });
 const [a,b]=await Promise.all([request(app).get('/').set('actor','first'),request(app).get('/').set('actor','second')]);
 expect(a.body[0].actor).toBe('first');expect(b.body[0].actor).toBe('second');expect(calls).toBe(2);
});

test('does not reuse reads outside GET requests or beyond the response',async()=>{
 const query=jest.fn(async()=>({rows:[]}));
 const app=express();app.use(requestReadCache);app.post('/',async(_req,res)=>{
  await reuseRequestRead(sql,[],query);await reuseRequestRead(sql,[],query);res.json({ok:true});
 });
 await request(app).post('/');await reuseRequestRead(sql,[],query);expect(query).toHaveBeenCalledTimes(3);
});

test('writes invalidate snapshots; locks and functions are never reused',async()=>{
 const query=jest.fn(async()=>({rows:[]}));
 await runWithReadCache(async()=>{
  await reuseRequestRead(sql,[],query);
  await reuseRequestRead('UPDATE users SET status=$1 WHERE id=$2',['INACTIVE','id'],query);
  await reuseRequestRead(sql,[],query);
  for(const text of ['SELECT * FROM users FOR UPDATE','SELECT nextval($1)','WITH t AS (SELECT * FROM users) SELECT * FROM t']){
   await reuseRequestRead(text,[],query);await reuseRequestRead(text,[],query);
  }
 });expect(query).toHaveBeenCalledTimes(9);
});

test('a failed read can be retried in the same request',async()=>{
 const query=jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({rows:[]});
 await runWithReadCache(async()=>{await expect(reuseRequestRead(sql,[],query)).rejects.toThrow('offline');await reuseRequestRead(sql,[],query);});
 expect(query).toHaveBeenCalledTimes(2);
});

test('caps snapshots per request instead of retaining every learner/report read',async()=>{
 const query=jest.fn(async()=>({rows:[]}));
 await runWithReadCache(async()=>{
  for(let i=0;i<201;i++)await reuseRequestRead(sql,[i],query);
  await reuseRequestRead(sql,[0],query);await reuseRequestRead(sql,[200],query);
 });expect(query).toHaveBeenCalledTimes(202);
});

test('retries one ordinary read after a dropped connection but never repeats an uncertain write',async()=>{
 const read=jest.fn().mockRejectedValueOnce({code:'ECONNRESET'}).mockResolvedValue({rows:[]});
 await retryTransientRead(sql,read);expect(read).toHaveBeenCalledTimes(2);
 for(const text of ['INSERT INTO payments VALUES ($1)','SELECT record_payment($1)','SELECT * FROM users FOR UPDATE']){
  const write=jest.fn().mockRejectedValue({code:'ECONNRESET'});
  await expect(retryTransientRead(text,write)).rejects.toEqual({code:'ECONNRESET'});expect(write).toHaveBeenCalledTimes(1);
 }
});
