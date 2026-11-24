import { AsyncLocalStorage } from 'node:async_hooks';
import { deserialize, serialize } from 'node:v8';
import type { RequestHandler } from 'express';

type ReadSnapshot = { result: object; rows: Buffer };
type ReadScope = { reads: Map<string, Promise<ReadSnapshot>> };
const scopes = new AsyncLocalStorage<ReadScope>();
const MAX_READS = 200;

/** One response only: never share account, permission, or school data between requests. */
export const requestReadCache: RequestHandler = (req, res, next) => {
  if (req.method !== 'GET') return next();
  const scope: ReadScope = { reads: new Map() };
  const clear = () => scope.reads.clear();
  res.once('finish', clear);
  res.once('close', clear);
  scopes.run(scope, next);
};

export function runWithReadCache<T>(work: () => T): T {
  return scopes.run({ reads: new Map() }, work);
}

/** Only ordinary table reads are reusable. Writes, locks, CTEs and function calls bypass it. */
export function isReusableTableRead(sql: unknown): sql is string {
  return typeof sql === 'string' && /^\s*SELECT\s+(?:\*|[a-z_]+\.\*)\s+FROM\s+[a-z_]+(?:\s|$)/i.test(sql)
    && !/;|\b(?:FOR|nextval|setval|random|pg_advisory|set_config)\b/i.test(sql);
}

export async function retryTransientRead<T>(sql: unknown, query: () => Promise<T>): Promise<T> {
  try { return await query(); } catch (error: any) {
    const transient = error?.message?.includes('Connection terminated unexpectedly')
      || error?.message?.includes('closed')
      || ['ECONNRESET', 'EPIPE', '57P01'].includes(error?.code);
    if (transient && isReusableTableRead(sql)) return query();
    throw error;
  }
}

export async function reuseRequestRead<T extends { rows: unknown[] }>(sql: unknown, params: unknown, query: () => Promise<T>): Promise<T> {
  const scope = scopes.getStore();
  if (!scope) return query();
  if (!isReusableTableRead(sql)) {
    // A write in an otherwise read-only HTTP handler must invalidate prior snapshots too.
    scope.reads.clear();
    return query();
  }
  const key = JSON.stringify([sql, params]);
  if (key.length > 16_384) return query();
  let pending = scope.reads.get(key);
  if (!pending) {
    if (scope.reads.size >= MAX_READS) return query();
    // pg results also carry private parser functions; serialize only the public row data.
    pending = query().then(result => ({ result, rows: serialize(result.rows) }));
    scope.reads.set(key, pending);
    pending.catch(() => { if (scope.reads.get(key) === pending) scope.reads.delete(key); });
  }
  // Repositories may modify rows; each caller gets its own copy, including Dates and Buffers.
  const snapshot = await pending;
  return { ...snapshot.result, rows: deserialize(snapshot.rows) } as T;
}
