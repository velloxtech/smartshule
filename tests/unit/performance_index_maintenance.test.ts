import {ensurePerformanceIndexes,startPerformanceIndexMaintenance,PERFORMANCE_INDEXES} from '../../src/infrastructure/database/postgres/PostgresPerformanceIndexes';

test('verified indexes require no DDL and interrupted builds are repaired concurrently',async()=>{
 const query=jest.fn(async(text:string,params?:string[])=>({rows:text.startsWith('SELECT')?[{valid:params?.[1]!==PERFORMANCE_INDEXES[0][0]}]:[]}));
 await ensurePerformanceIndexes({query} as any);
 const statements=query.mock.calls.map(call=>call[0]);
 expect(statements.filter(text=>text.startsWith('DROP INDEX'))).toEqual([`DROP INDEX CONCURRENTLY IF EXISTS public.${PERFORMANCE_INDEXES[0][0]}`]);
 expect(statements.filter(text=>text.startsWith('CREATE INDEX'))).toHaveLength(1);
});

test('a blocked optional index build never prevents application readiness or becomes an unhandled rejection',async()=>{
 let reject!:(error:Error)=>void;
 const pending=new Promise<never>((_resolve,no)=>{reject=no;});
 const query=jest.fn(()=>pending);const warn=jest.spyOn(console,'warn').mockImplementation(()=>undefined);
 expect(startPerformanceIndexMaintenance({query} as any)).toBeUndefined();
 reject(new Error('Query read timeout'));
 await new Promise(resolve=>setImmediate(resolve));
 expect(warn).toHaveBeenCalledWith('[PostgreSQL] Optional performance index maintenance deferred:','Query read timeout');
});
