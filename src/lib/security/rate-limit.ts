type RateLimitOptions = {
  action: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_STORE_KEY = "__studystack_rate_limit_store__";

function getStore() {
  const globalWithStore = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitState>;
  };

  if (!globalWithStore[RATE_LIMIT_STORE_KEY]) {
    globalWithStore[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitState>();
  }

  return globalWithStore[RATE_LIMIT_STORE_KEY];
}

function buildRateLimitKey({ action, identifier }: Pick<RateLimitOptions, "action" | "identifier">) {
  return `${action}:${identifier}`;
}

function pruneExpiredEntries(store: Map<string, RateLimitState>, now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit({
  action,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getStore();

  pruneExpiredEntries(store, now);

  const key = buildRateLimitKey({ action, identifier });
  const current = store.get(key);

  if (!current) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      ok: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    ok: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}
