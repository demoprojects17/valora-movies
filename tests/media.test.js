import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const root = process.env.VELORA_TEST_LIB;
const {
  tmdb,
  mapResult,
  searchTitles,
  searchTitlesPage,
  discoverMoodPage,
  fetchTrailer,
  fetchTitleDetails,
  testConnection,
} = await import(root ? pathToFileURL(`${root}/media.js`) : "../lib/media.js");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const call = { url: new URL(url), options };
    calls.push(call);
    return handler(call, calls.length);
  };
  return calls;
}
test("TMDB uses query API keys and URL encodes search parameters", async () => {
  const calls = mockFetch(() => response({ results: [] }));
  assert.deepEqual(
    await tmdb("/search/multi", "short-key", {
      query: "Dune & 日本語",
      include_adult: "false",
    }),
    { results: [] },
  );
  assert.equal(calls[0].url.origin, "https://api.themoviedb.org");
  assert.equal(calls[0].url.pathname, "/3/search/multi");
  assert.equal(calls[0].url.searchParams.get("api_key"), "short-key");
  assert.equal(calls[0].url.searchParams.get("query"), "Dune & 日本語");
  assert.deepEqual(calls[0].options.headers, {});
});
test("connection uses bearer token without putting it in URL", async () => {
  const calls = mockFetch(() => response({ images: {} }));
  const token = "a".repeat(41);
  await testConnection(token);
  assert.equal(calls[0].url.pathname, "/3/configuration");
  assert.equal(calls[0].url.searchParams.has("api_key"), false);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
});
test("TMDB distinguishes missing/unauthorized keys, HTTP errors and network failures", async () => {
  const calls = mockFetch(() => response({}, 401));
  await assert.rejects(tmdb("/configuration", "key"), /^Error: key$/);
  mockFetch(() => response({}, 503));
  await assert.rejects(tmdb("/configuration", "key"), /http 503/);
  mockFetch(() => {
    throw new Error("offline");
  });
  await assert.rejects(tmdb("/configuration", "key"), /offline/);
});
test("mapping preserves film, series and Japanese animation media identities", () => {
  assert.equal(mapResult({ media_type: "person" }), null);
  assert.deepEqual(
    mapResult({
      media_type: "movie",
      title: "Dune",
      release_date: "2021-10-22",
      id: 1,
      poster_path: "/d.jpg",
      vote_average: 8.26,
      overview: "Desert",
    }),
    {
      title: "Dune",
      year: "2021",
      kind: "Film",
      poster: "https://image.tmdb.org/t/p/w342/d.jpg",
      tmdbId: 1,
      media: "movie",
      overview: "Desert",
      tmdbRating: 8.3,
    },
  );
  const series = mapResult({
    media_type: "tv",
    name: "Show",
    first_air_date: "2001-01-01",
    id: 2,
  });
  assert.equal(series.kind, "Series");
  assert.equal(series.year, "2001");
  assert.equal(series.poster, "");
  assert.equal(series.tmdbRating, null);
  for (const media_type of ["tv", "movie"])
    assert.equal(
      mapResult({ media_type, genre_ids: [16], original_language: "ja" }).kind,
      "Anime",
    );
  assert.equal(
    mapResult({ media_type: "movie", genre_ids: [16], original_language: "en" })
      .kind,
    "Film",
  );
});
test("search filters people and tolerates missing results", async () => {
  const calls = mockFetch(() =>
    response({
      results: [
        { media_type: "person" },
        { media_type: "tv", name: "Show", id: 2 },
      ],
    }),
  );
  assert.deepEqual(
    (await searchTitles("Show", "key")).map((item) => item.title),
    ["Show"],
  );
  assert.equal(calls[0].url.searchParams.get("include_adult"), "false");
  mockFetch(() => response({}));
  assert.deepEqual(await searchTitles("None", "key"), []);
});
test("trailer chooses official YouTube trailer over other candidates without searching known media", async () => {
  const calls = mockFetch(() =>
    response({
      results: [
        { site: "Vimeo", key: "wrong", type: "Trailer", official: true },
        { site: "YouTube", type: "Trailer", official: true },
        { site: "YouTube", key: "teaser", type: "Teaser" },
        { site: "YouTube", key: "unofficial", type: "Trailer" },
        { site: "YouTube", key: "official", type: "Trailer", official: true },
      ],
    }),
  );
  assert.deepEqual(await fetchTrailer({ tmdbId: 42, media: "movie" }, "key"), {
    key: "official",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, "/3/movie/42/videos");
});
test("trailer falls back through languages after HTTP failure or empty videos", async () => {
  const calls = mockFetch((_, number) =>
    number === 1
      ? response({}, 500)
      : number === 2
        ? response({ results: [] })
        : response({
            results: [{ site: "YouTube", key: "fallback", type: "Teaser" }],
          }),
  );
  assert.deepEqual(await fetchTrailer({ tmdbId: 9, kind: "Series" }, "key"), {
    key: "fallback",
  });
  assert.deepEqual(
    calls.map((call) => call.url.searchParams.get("language")),
    ["en-US", "ja-JP", null],
  );
  assert.ok(calls.every((call) => call.url.pathname === "/3/tv/9/videos"));
});
test("trailer authorization failure stops fallback", async () => {
  const calls = mockFetch(() => response({}, 401));
  await assert.rejects(
    fetchTrailer({ tmdbId: 9, media: "tv" }, "key"),
    /^Error: key$/,
  );
  assert.equal(calls.length, 1);
});
test("anime lookup resolves movie versus TV by matching year", async () => {
  const calls = mockFetch(({ url }) =>
    url.pathname === "/3/search/multi"
      ? response({
          results: [
            {
              media_type: "tv",
              name: "Anime",
              first_air_date: "1990-01-01",
              id: 1,
            },
            {
              media_type: "movie",
              title: "Anime",
              release_date: "2000-01-01",
              id: 2,
            },
          ],
        })
      : response({
          results: [{ site: "YouTube", key: "movie", type: "Trailer" }],
        }),
  );
  assert.deepEqual(
    await fetchTrailer(
      { title: "Anime", year: 2000, tmdbId: 99, kind: "Anime" },
      "key",
    ),
    { key: "movie" },
  );
  assert.equal(calls[1].url.pathname, "/3/movie/2/videos");
});
test("resolved trailer identity can be saved without mutating the item or repeating search", async () => {
  const calls = mockFetch(({ url }) =>
    url.pathname === "/3/search/multi"
      ? response({
          results: [
            {
              id: 17,
              media_type: "tv",
              name: "Anime",
              first_air_date: "2020-01-01",
            },
          ],
        })
      : response({
          results: [{ site: "YouTube", key: "video", type: "Trailer" }],
        }),
  );
  const item = { id: 3, title: "Anime", kind: "Anime", year: "2020" };
  let identity;
  await fetchTrailer(item, "key", (patch) => {
    identity = patch;
  });
  assert.deepEqual(identity, { tmdbId: 17, media: "tv" });
  assert.equal(item.tmdbId, undefined);
  await fetchTrailer({ ...item, ...identity }, "key");
  assert.equal(
    calls.filter((call) => call.url.pathname.endsWith("/search/multi")).length,
    1,
  );
});
test("series lookup prefers TV without a year match and returns null for no titles or videos", async () => {
  const calls = mockFetch(({ url }) =>
    url.pathname === "/3/search/multi"
      ? response({
          results: [
            { media_type: "movie", title: "Title", id: 1 },
            { media_type: "tv", name: "Title", id: 2 },
          ],
        })
      : response({ results: [] }),
  );
  assert.equal(
    await fetchTrailer({ title: "Title", kind: "Series" }, "key"),
    null,
  );
  assert.equal(calls[1].url.pathname, "/3/tv/2/videos");
  assert.equal(calls.length, 4);
  const empty = mockFetch(() => response({ results: [] }));
  assert.equal(await fetchTrailer({ title: "Missing" }, "key"), null);
  assert.equal(empty.length, 1);
});
for (const [videos, expected] of [
  [
    [
      { site: "YouTube", key: "clip", type: "Clip" },
      { site: "YouTube", key: "teaser", type: "Teaser" },
      { site: "YouTube", key: "trailer", type: "Trailer" },
    ],
    "trailer",
  ],
  [
    [
      { site: "YouTube", key: "clip", type: "Clip" },
      { site: "YouTube", key: "teaser", type: "Teaser" },
    ],
    "teaser",
  ],
  [[{ site: "YouTube", key: "clip", type: "Clip" }], "clip"],
])
  test(`trailer candidate fallback chooses ${expected}`, async () => {
    mockFetch(() => response({ results: videos }));
    assert.deepEqual(await fetchTrailer({ tmdbId: 1, kind: "Film" }, "key"), {
      key: expected,
    });
  });

test("search pages preserve pagination and omit person results", async () => {
  const calls = mockFetch(() =>
    response({
      page: 2,
      total_pages: 4,
      results: [
        { id: 5, title: "Film", media_type: "movie" },
        { id: 6, name: "Person", media_type: "person" },
      ],
    }),
  );
  const result = await searchTitlesPage("Film", "short-key", 2);
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 4);
  assert.deepEqual(
    result.items.map((item) => item.tmdbId),
    [5],
  );
});

test("mood discovery loads matching genres and skips exhausted movie pages", async () => {
  const calls = mockFetch(() =>
    response({
      page: 3,
      total_pages: 5,
      results: [
        {
          id: 9,
          name: "Mystery series",
          genre_ids: [80],
          first_air_date: "2020-01-01",
        },
      ],
    }),
  );
  const result = await discoverMoodPage("tense", "short-key", 3, {
    movie: 2,
    tv: 5,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, "/3/discover/tv");
  assert.equal(calls[0].url.searchParams.get("with_genres"), "80|9648");
  assert.equal(calls[0].url.searchParams.get("page"), "3");
  assert.equal(result.items[0].category, "series");
  assert.equal(result.items[0].tmdbId, 9);
  assert.deepEqual(result.pages, { movie: 2, tv: 5 });
});

test("visitors without a key use the shared same-origin catalog", async () => {
  let requested;
  globalThis.fetch = async (url) => {
    requested = url;
    return response({ results: [] });
  };
  assert.deepEqual(
    await tmdb("/search/multi", undefined, { query: "Naruto", page: 2 }),
    { results: [] },
  );
  const url = new URL(requested, "https://velora.test");
  assert.equal(url.pathname, "/api/tmdb");
  assert.equal(url.searchParams.get("path"), "/search/multi");
  assert.equal(url.searchParams.get("query"), "Naruto");
  assert.equal(url.searchParams.has("api_key"), false);
});

test("title details use shared catalog and preserve an unrated score", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(
      new URL(url, "https://velora.test").searchParams.get("path"),
      "/tv/20",
    );
    return response({
      overview: "A story",
      vote_average: 0,
      genres: [{ name: "Drama" }],
      number_of_seasons: 2,
    });
  };
  const details = await fetchTitleDetails({
    tmdbId: 20,
    media: "tv",
    title: "Example",
  });
  assert.equal(details.tmdbRating, null);
  assert.equal(details.seasons, 2);
  assert.deepEqual(details.genres, ["Drama"]);
});

test("details never substitute a different title from the same year", async () => {
  globalThis.fetch = async (url) => {
    const path = new URL(url, "https://velora.test").searchParams.get("path");
    if (path === "/search/multi")
      return response({
        results: [
          {
            id: 1,
            media_type: "movie",
            title: "Unrelated",
            release_date: "2020-01-01",
          },
          {
            id: 2,
            media_type: "movie",
            title: "Correct",
            release_date: "2020-01-01",
          },
        ],
      });
    assert.equal(path, "/movie/2");
    return response({});
  };
  const details = await fetchTitleDetails({
    title: "Correct",
    year: "2020",
    kind: "Film",
  });
  assert.equal(details.tmdbId, 2);
  await assert.rejects(
    () => fetchTitleDetails({ title: "Missing", year: "2020", kind: "Film" }),
    /missing/,
  );
});
