'use strict';
// Replaces globalThis.fetch with canned responses. Preload into the spawned emitter via
//   NODE_OPTIONS=--require <abs path to this file>
// Routes come from the FETCH_STUB env var (JSON array):
//   [{ method: "GET", url: "substring to match", status: 200, body: {...} }, ...]
// Any request that matches no route throws — this is the offline guarantee: no test
// can silently hit a real tracker.
const routes = JSON.parse(process.env.FETCH_STUB || '[]');

globalThis.fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const route = routes.find(
    (r) => (r.method || 'GET').toUpperCase() === method && String(url).includes(r.url));
  if (!route) throw new Error(`fetch-stub: no route for ${method} ${url}`);
  return {
    ok: route.status >= 200 && route.status < 300,
    status: route.status,
    json: async () => route.body,
    text: async () => JSON.stringify(route.body),
  };
};
