export async function tmdb(path, key, params = {}) {
  if (!key) {
    const query = new URLSearchParams({ path, ...params });
    const response = await fetch(`/api/tmdb?${query}`);
    if (!response.ok) throw new Error("catalog");
    return response.json();
  }
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(params).forEach(([name, value]) =>
    url.searchParams.set(name, value),
  );
  const headers = {};
  if (key.length > 40) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  const response = await fetch(url, { headers });
  if (response.status === 401) throw new Error("key");
  if (!response.ok) throw new Error(`http ${response.status}`);
  return response.json();
}

export function mapResult(result) {
  if (!["movie", "tv"].includes(result.media_type)) return null;
  const anime =
    (result.genre_ids || []).includes(16) && result.original_language === "ja";
  return {
    title: result.title || result.name,
    year: (result.release_date || result.first_air_date || "").slice(0, 4),
    kind: anime ? "Anime" : result.media_type === "tv" ? "Series" : "Film",
    poster: result.poster_path
      ? `https://image.tmdb.org/t/p/w342${result.poster_path}`
      : "",
    tmdbId: result.id,
    media: result.media_type,
    overview: result.overview || "",
    tmdbRating: result.vote_average
      ? Math.round(result.vote_average * 10) / 10
      : null,
  };
}

export async function searchTitlesPage(query, key, page = 1) {
  const data = await tmdb("/search/multi", key, {
    query,
    include_adult: "false",
    page,
  });
  return {
    items: (data.results || []).map(mapResult).filter(Boolean),
    page: data.page || page,
    totalPages: Math.min(500, data.total_pages || 1),
  };
}
export async function searchTitles(query, key) {
  return (await searchTitlesPage(query, key)).items;
}

const moodGenres = {
  tense: { movie: "53|80|9648|27", tv: "80|9648" },
  light: { movie: "35|12", tv: "35|10751" },
  fantasy: { movie: "14|878", tv: "10765" },
  emotional: { movie: "18|10749", tv: "18" },
};
export async function discoverMoodPage(
  mood,
  key,
  page = 1,
  limits = { movie: 500, tv: 500 },
) {
  if (!moodGenres[mood]) throw new Error("mood");
  const batches = await Promise.all(
    ["movie", "tv"].map(async (media) => {
      if (page > limits[media])
        return { items: [], media, pages: limits[media] };
      const data = await tmdb(`/discover/${media}`, key, {
        with_genres: moodGenres[mood][media],
        include_adult: "false",
        sort_by: "popularity.desc",
        page,
      });
      return {
        media,
        pages: Math.min(500, data.total_pages || 0),
        items: (data.results || []).map((raw) => {
          const item = mapResult({ ...raw, media_type: media });
          return {
            ...item,
            id: `tmdb-${media}-${raw.id}`,
            category:
              item.kind === "Anime"
                ? "anime"
                : media === "movie"
                  ? "movies"
                  : "series",
            genre: {
              tense: "დაძაბული ისტორიები",
              light: "მსუბუქი ისტორიები",
              fantasy: "ფანტასტიკური ისტორიები",
              emotional: "დრამა",
            }[mood],
            date: item.year,
            label: "TMDB",
            description: item.overview,
            source: `https://www.themoviedb.org/${media}/${raw.id}`,
          };
        }),
      };
    }),
  );
  return {
    items: batches.flatMap((batch) => batch.items),
    page,
    pages: Object.fromEntries(
      batches.map((batch) => [batch.media, batch.pages]),
    ),
  };
}

export const testConnection = (key) => tmdb("/configuration", key);

export async function fetchTrailer(item, key, onResolve) {
  let id = item.tmdbId;
  let type =
    item.media ||
    (id && item.kind !== "Anime"
      ? item.kind === "Series"
        ? "tv"
        : "movie"
      : null);
  if (!id || !type) {
    const results = await searchTitles(item.title, key);
    const pick =
      results.find(
        (result) => item.year && result.year === String(item.year),
      ) ||
      results.find(
        (result) => item.kind === "Series" && result.media === "tv",
      ) ||
      results[0];
    if (!pick) return null;
    id = pick.tmdbId;
    type = pick.media;
  }
  if (!item.tmdbId || !item.media) onResolve?.({ tmdbId: id, media: type });
  for (const language of ["en-US", "ja-JP", ""]) {
    let data;
    try {
      data = await tmdb(
        `/${type}/${id}/videos`,
        key,
        language ? { language } : {},
      );
    } catch (error) {
      if (error.message === "key") throw error;
      continue;
    }
    const videos = (data.results || []).filter(
      (video) => video.site === "YouTube" && video.key,
    );
    const pick =
      videos.find((video) => video.type === "Trailer" && video.official) ||
      videos.find((video) => video.type === "Trailer") ||
      videos.find((video) => video.type === "Teaser") ||
      videos[0];
    if (pick) return { key: pick.key };
  }
  return null;
}

export async function fetchTitleDetails(item) {
  let media = item.media;
  let id = item.tmdbId;
  if (!id || !media) {
    const results = await searchTitles(item.title);
    const category =
      item.category ||
      (item.kind === "Film"
        ? "movies"
        : item.kind === "Series"
          ? "series"
          : "anime");
    const matches = results.filter((r) =>
      category === "movies"
        ? r.media === "movie"
        : category === "series"
          ? r.media === "tv"
          : r.kind === "Anime",
    );
    const year = String(item.year || item.date || "").match(/\b\d{4}\b/)?.[0];
    const normalize = (title) =>
      title
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "");
    const exact = matches.filter(
      (r) => normalize(r.title) === normalize(item.title),
    );
    const pick = year
      ? exact.find((r) => r.year === year)
      : exact.length === 1
        ? exact[0]
        : null;
    if (!pick) throw new Error("missing");
    media = pick.media;
    id = pick.tmdbId;
  }
  const data = await tmdb(`/${media}/${id}`, undefined, { language: "en-US" });
  return {
    overview: data.overview,
    tmdbRating: data.vote_average || null,
    votes: data.vote_count,
    genres: (data.genres || []).map((g) => g.name),
    year: (data.release_date || data.first_air_date || "").slice(0, 4),
    runtime: data.runtime,
    seasons: data.number_of_seasons,
    episodes: data.number_of_episodes,
    backdrop: data.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
      : "",
    poster: data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : item.poster,
    tmdbId: id,
    media,
  };
}
