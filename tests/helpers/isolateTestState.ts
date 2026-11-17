import { rateLimitStores } from '../../src/infrastructure/http/middlewares/rateLimiter';

// Requests in one test still share their limiter, so brute-force checks remain meaningful.
// Independent tests must not inherit another scenario's exhausted quota.
beforeEach(() => {
  for (const store of Object.values(rateLimitStores)) store.resetAll();
});
