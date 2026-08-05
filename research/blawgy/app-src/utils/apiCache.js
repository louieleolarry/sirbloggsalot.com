/**
 * Tiny in-memory API cache with stale-while-revalidate, shared by the main
 * views so tab switches render instantly from the last known data while a
 * background refresh runs. Session-scoped (module memory), keyed by caller.
 *
 * Usage:
 *   const data = await cachedFetch(`plan:${site}`, () => apiClient.get(url).then(r => r.data), {
 *     ttlMs: 60_000,            // fresh window: return cache, no refetch
 *     staleMs: 10 * 60_000,     // stale window: return cache instantly, refetch in background
 *     onUpdate: (fresh) => setState(fresh),  // called when the background refresh lands
 *   });
 * `invalidate(prefix)` after any mutation that changes the underlying data.
 */

const store = new Map(); // key -> { data, at, inflight }

export function getCached(key) {
  return store.get(key)?.data;
}

export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function cachedFetch(key, fetcher, { ttlMs = 60_000, staleMs = 600_000, onUpdate } = {}) {
  const entry = store.get(key);
  const age = entry ? Date.now() - entry.at : Infinity;

  // Fresh: serve from cache, no network.
  if (entry && age < ttlMs) return entry.data;

  // Stale but usable: serve instantly, refresh in the background once.
  if (entry && age < staleMs) {
    if (!entry.inflight) {
      entry.inflight = fetcher()
        .then((data) => {
          store.set(key, { data, at: Date.now(), inflight: null });
          if (onUpdate) onUpdate(data);
          return data;
        })
        .catch(() => { entry.inflight = null; });
    }
    return entry.data;
  }

  // Cold or expired: fetch (dedupe concurrent callers onto one request).
  if (entry?.inflight) return entry.inflight;
  const inflight = fetcher()
    .then((data) => {
      store.set(key, { data, at: Date.now(), inflight: null });
      return data;
    })
    .catch((err) => {
      // A cold fetch that rejects must NOT leave a rejected promise parked as
      // `inflight` — line 49 would hand that same rejected promise to every
      // later caller, bricking the key until a full reload. Clear the inflight
      // slot (preserving any prior cached data) so the next call retries, then
      // rethrow so THIS caller still sees the failure.
      const cur = store.get(key);
      if (cur && cur.inflight === inflight) {
        if (cur.data === undefined) store.delete(key);
        else store.set(key, { data: cur.data, at: cur.at, inflight: null });
      }
      throw err;
    });
  store.set(key, { data: entry?.data, at: entry?.at || 0, inflight });
  return inflight;
}
