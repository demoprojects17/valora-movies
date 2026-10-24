// The shared TMDB credential stays on the server.
export async function GET(request) {
  const input = new URL(request.url).searchParams;
  const path = input.get("path") || "";
  if (
    !/^\/(search\/multi|discover\/(movie|tv)|configuration|(movie|tv)\/\d+(\/videos)?)$/.test(
      path,
    )
  )
    return Response.json({ error: "Invalid catalog request" }, { status: 400 });
  const key = process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY;
  if (!key)
    return Response.json({ error: "catalog_unavailable" }, { status: 503 });
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  if (input.has("page")) {
    const page = Number(input.get("page"));
    if (!Number.isInteger(page) || page < 1 || page > 500)
      return Response.json({ error: "Invalid page" }, { status: 400 });
    url.searchParams.set("page", String(page));
  }
  for (const name of ["query", "language", "with_genres", "sort_by"]) {
    if (input.has(name))
      url.searchParams.set(name, input.get(name).slice(0, 200));
  }
  url.searchParams.set("include_adult", "false");
  const headers = {};
  if (key.length > 40) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  try {
    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return Response.json(
        { error: "catalog_unavailable" },
        { status: response.status === 429 ? 429 : 503 },
      );
    return Response.json(await response.json());
  } catch {
    return Response.json({ error: "catalog_unavailable" }, { status: 503 });
  }
}
