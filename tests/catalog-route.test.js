import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/tmdb/route.js";
const originalFetch = globalThis.fetch;
const originalKey = process.env.TMDB_API_KEY,
  originalToken = process.env.TMDB_ACCESS_TOKEN;
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of [
    ["TMDB_API_KEY", originalKey],
    ["TMDB_ACCESS_TOKEN", originalToken],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
const request = (path, extra = "") =>
  new Request(
    `https://velora.test/api/tmdb?path=${encodeURIComponent(path)}${extra}`,
  );
test("public catalog attaches only the server credential and rejects client adult/key overrides", async () => {
  process.env.TMDB_API_KEY = "server-test-key";
  delete process.env.TMDB_ACCESS_TOKEN;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, "https://api.themoviedb.org");
    assert.equal(url.searchParams.get("api_key"), "server-test-key");
    assert.equal(url.searchParams.get("include_adult"), "false");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(options.next.revalidate, 300);
    return Response.json({ page: 2, results: [{ id: 1 }] });
  };
  const response = await GET(
    request(
      "/search/multi",
      "&query=Film&page=2&api_key=visitor-key&include_adult=true",
    ),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { page: 2, results: [{ id: 1 }] });
});
test("catalog only proxies supported paths and valid pages", async () => {
  globalThis.fetch = () => {
    throw Error("must not fetch");
  };
  process.env.TMDB_API_KEY = "server-test-key";
  assert.equal((await GET(request("https://untrusted.test"))).status, 400);
  assert.equal((await GET(request("/account"))).status, 400);
  assert.equal(
    (await GET(request("/discover/movie", "&page=501"))).status,
    400,
  );
});
test("catalog configuration and upstream failures never leak credentials", async () => {
  delete process.env.TMDB_API_KEY;
  delete process.env.TMDB_ACCESS_TOKEN;
  assert.equal((await GET(request("/configuration"))).status, 503);
  process.env.TMDB_API_KEY = "server-test-secret";
  globalThis.fetch = async () =>
    new Response("server-test-secret", { status: 401 });
  const response = await GET(request("/configuration"));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("server-test-secret"), false);
});
