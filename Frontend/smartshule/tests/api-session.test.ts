import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
const browser = Object.assign(new EventTarget(), {
  localStorage: storage,
  location: { hostname: 'school.example', protocol: 'https:', port: '' },
  setTimeout,
  clearTimeout,
});
Object.assign(globalThis, { window: browser, localStorage: storage });
const { apiService, setAuthToken, setApiPortalView, captureApiRequestScope, getStoredAuthToken } =
  await import('../src/services/api.ts');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });

beforeEach(() => {
  setAuthToken(null);
  setApiPortalView('STAFF');
  setAuthToken('staff-token');
});

test('switching portals aborts pending staff work and uses Parent headers for new work', async () => {
  const pending = deferred<Response>();
  let staffSignal!: AbortSignal;
  let parentHeader: string | undefined;
  globalThis.fetch = async (_url, options) => {
    const headers = options!.headers as Record<string, string>;
    if (headers['X-Portal-View'] === 'STAFF') {
      staffSignal = options!.signal!;
      return pending.promise; // Simulate a transport that delivers even after abort.
    }
    parentHeader = headers['X-Portal-View'];
    return ok({ name: 'Parent school' });
  };
  const current = captureApiRequestScope();
  const staff = apiService.getSchool();
  const rejected = assert.rejects(staff, { name: 'AbortError' });
  setApiPortalView('PARENT');
  assert.equal(staffSignal.aborted, true);
  assert.equal(current(), false);
  await apiService.getSchool();
  assert.equal(parentHeader, 'PARENT');
  pending.resolve(ok({ name: 'Stale staff school' }));
  await rejected;
});

test('a late 401 from the previous account cannot expire a newly signed-in user', async () => {
  const pending = deferred<Response>();
  globalThis.fetch = async () => pending.promise;
  const old = apiService.getTeachers();
  const rejected = assert.rejects(old, { name: 'AbortError' });
  setAuthToken('new-user-token');
  pending.resolve(new Response('{}', { status: 401 }));
  await rejected;
  assert.equal(getStoredAuthToken(), 'new-user-token');
});

test('current-session 401 clears all token aliases and announces expiry once', async () => {
  let events = 0;
  const listener = () => { events++; };
  browser.addEventListener('smartshule:session-expired', listener);
  storage.setItem('token', 'legacy-token');
  storage.setItem('authToken', 'another-legacy-token');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Expired' } }), { status: 401 });
  try {
    await assert.rejects(apiService.getTeachers(), /Expired/);
    assert.equal(getStoredAuthToken(), null);
    assert.equal(events, 1);
  } finally {
    browser.removeEventListener('smartshule:session-expired', listener);
  }
});

test('permission denials and failed login attempts do not clear an existing session', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 403 });
  await assert.rejects(apiService.getTeachers());
  assert.equal(getStoredAuthToken(), 'staff-token');
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(apiService.login('teacher', 'wrong-password'));
  assert.equal(getStoredAuthToken(), 'staff-token');
});

test('switching back cannot reuse data cached in an earlier portal session', async () => {
  let calls = 0;
  globalThis.fetch = async () => ok({ revision: ++calls });
  await apiService.getSchool();
  setApiPortalView('PARENT');
  setApiPortalView('STAFF');
  await apiService.getSchool();
  assert.equal(calls, 2);
});

test('settling an aborted request does not remove a replacement request from deduplication', async () => {
  const oldResponse = deferred<Response>();
  const newResponse = deferred<Response>();
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? oldResponse.promise : newResponse.promise;
  const old = apiService.getSchool();
  const rejected = assert.rejects(old, { name: 'AbortError' });
  setApiPortalView('PARENT');
  setApiPortalView('STAFF');
  const replacement = apiService.getSchool();
  oldResponse.resolve(ok({ old: true }));
  await rejected;
  const duplicate = apiService.getSchool();
  assert.equal(calls, 2);
  newResponse.resolve(ok({ current: true }));
  assert.deepEqual(await duplicate, await replacement);
});
