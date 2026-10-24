"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import TitleDetails from "./TitleDetails";
import CabinetProfile from "./CabinetProfile";
import ReleaseHome from "./ReleaseHome";
import ProfileAvatar from "./ProfileAvatar";
import { useRouter } from "next/navigation";
import { useVelora } from "../lib/useVelora.js";
import { searchTitlesPage, fetchTrailer } from "../lib/media.js";
import { translate, translateAuthMessage } from "../lib/i18n.js";

const keyOf = (i) => `${i.title}|${i.year || ""}`.toLowerCase();
const closeStyle = {
  position: "static",
  opacity: 1,
  padding: "2px 8px",
  fontSize: 15,
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};
function Dialog({ id, open, onClose, children, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      id={id}
      ref={ref}
      style={style}
      onCancel={onClose}
      onClose={() => {
        if (open) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
function Options({ values }) {
  return values.map((v) => (
    <option key={v.id} value={v.id}>
      {v.label}
    </option>
  ));
}
function Rating({ first, ...props }) {
  return (
    <select aria-label="Rating" {...props}>
      <option value="">{first}</option>
      {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
        <option key={n} value={n}>
          ★ {n}
        </option>
      ))}
    </select>
  );
}
function Card({
  item: i,
  kinds,
  statuses,
  t,
  words,
  onTrailer,
  onDetails,
  onEpisode,
  update,
  remove,
  notify,
}) {
  const [failed, setFailed] = useState("");
  let h = 0;
  for (const c of i.title) h = (h * 31 + c.charCodeAt(0)) % 360;
  const season = i.season || 1,
    episode = i.episode ?? 1,
    status = statuses.find((s) => s.id === i.status) || statuses[0];
  const step = (delta) => {
    const ep = Math.max(0, episode + delta);
    update(i.id, {
      season,
      episode: ep,
      ...(delta > 0 && i.status === "want" ? { status: "watching" } : {}),
    });
    notify(
      `${delta > 0 ? "🍿" : "⏪"} ${i.title} — ${t("seasonAbbr")} ${season}, ${t("episodeAbbr")} ${ep}`,
    );
  };
  return (
    <div className="card">
      <div
        className={`poster${i.poster && failed !== i.poster ? " has" : ""}`}
        style={{
          background: `linear-gradient(165deg,hsl(${h} 50% 30%),hsl(${(h + 50) % 360} 55% 9%))`,
          cursor: "pointer",
        }}
        onClick={() => onDetails(i)}
      >
        {i.poster && failed !== i.poster && (
          <img
            src={i.poster}
            alt=""
            loading="lazy"
            onError={() => setFailed(i.poster)}
          />
        )}
        <span className="chip">
          {kinds.find((k) => k.id === i.kind)?.label || i.kind}
        </span>
        <span className="pt">{i.title}</span>
        <button
          className="tr-btn"
          title={t("trailer")}
          aria-label={t("trailer")}
          onClick={(e) => {
            e.stopPropagation();
            onTrailer(i);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
        <button
          className="x"
          title={words("Remove", "წაშლა")}
          aria-label={`Remove ${i.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`${words("Remove", "წაიშალოს")} "${i.title}"?`))
              remove(i.id);
          }}
        >
          ×
        </button>
      </div>
      <div className="ct" title={i.title}>
        {i.title}
      </div>
      <div className="cm">
        {i.rating ? (
          <>
            <b>★ {i.rating}</b>
            {i.year ? ` · ${i.year}` : ""}
          </>
        ) : (
          i.year || t("notRated")
        )}
      </div>
      {(i.kind === "Series" || i.kind === "Anime") && (
        <div className="ep-tracker">
          <button
            className="ep-btn"
            title={words("Previous episode (-1)", "წინა სერია (-1)")}
            onClick={() => step(-1)}
          >
            –
          </button>
          <span
            className="ep-info"
            role="button"
            tabIndex={0}
            title={words(
              "Click to edit season/episode",
              "სეზონის/სერიის შეცვლა",
            )}
            onClick={() => onEpisode(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEpisode(i);
              }
            }}
          >
            {t("seasonAbbr")} {season} · {t("episodeAbbr")} {episode}
          </span>
          <button
            className="ep-btn"
            title={words("Next episode (+1)", "შემდეგი სერია (+1)")}
            onClick={() => step(1)}
          >
            +
          </button>
        </div>
      )}
      <div className="ctl">
        <select
          aria-label="Status"
          value={status.id}
          style={{ color: status.color }}
          onChange={(e) => update(i.id, { status: e.target.value })}
        >
          <Options values={statuses} />
        </select>
        <Rating
          className="r"
          first={t("rate")}
          value={i.rating || ""}
          onChange={(e) =>
            update(i.id, {
              rating: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </div>
    </div>
  );
}
function Result({ item, kinds, have, onAdd, words, onDetails }) {
  const [kind, setKind] = useState(item.kind);
  return (
    <div className="res">
      {item.poster ? (
        <img className="thumb" src={item.poster} alt="" />
      ) : (
        <div className="thumb" />
      )}
      <div>
        <button className="rt td-open" onClick={() => onDetails(item)}>
          {item.title}
        </button>
        <div className="m">
          {[item.year, item.tmdbRating ? `TMDB ★ ${item.tmdbRating}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <select
        aria-label="Type"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <Options values={kinds} />
      </select>
      <button
        className={have ? "" : "primary"}
        disabled={have}
        onClick={() => onAdd({ ...item, kind })}
      >
        {have ? words("In your list", "უკვე სიაშია") : words("Add", "დამატება")}
      </button>
    </div>
  );
}

export default function VeloraApp({ initialPage = "discover" }) {
  const router = useRouter();
  const discover = initialPage === "discover";
  const settings = initialPage === "settings";
  const [detailItem, setDetailItem] = useState(null);
  const [theme, setTheme] = useState("night");
  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "bright" ? "bright" : "night",
    );
  }, []);
  function toggleTheme() {
    const next = theme === "night" ? "bright" : "night";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("velora.theme", next);
    } catch {}
  }
  const themeButton = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={
        theme === "night"
          ? "ნათელი რეჟიმის ჩართვა / Bright mode"
          : "ღამის რეჟიმის ჩართვა / Night mode"
      }
      aria-pressed={theme === "bright"}
    >
      <Icon name={theme === "night" ? "moon" : "sun"} />
    </button>
  );
  const [releaseCategory, setReleaseCategory] = useState(null);
  const data = useVelora();
  const {
    items,
    ready,
    user,
    syncState,
    authMode,
    setAuthMode,
    authError,
    authMessage,
    authBusy,
    authenticate,
    logout,
    sync,
    addItems,
    updateItem,
    removeItem,
    importBackup,
    importLetterboxd,
    exportBackup,
    findPosters,
    posterProgress,
    toast,
    setToast,
  } = data;
  const [lang, setLang] = useState("ka"),
    [view, setView] = useState("library"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("new"),
    [modal, setModal] = useState(null);
  const [search, setSearch] = useState(""),
    [results, setResults] = useState([]),
    [searchMessage, setSearchMessage] = useState("");
  const [searchPage, setSearchPage] = useState(0),
    [searchPages, setSearchPages] = useState(0),
    [searchBusy, setSearchBusy] = useState(false);
  const searchRequest = useRef({ epoch: 0, busy: false });
  const [sStatus, setSStatus] = useState("want"),
    [sRating, setSRating] = useState(""),
    [title, setTitle] = useState(""),
    [kind, setKind] = useState("Film"),
    [year, setYear] = useState(""),
    [status, setStatus] = useState("want"),
    [rating, setRating] = useState("");
  const [bulk, setBulk] = useState(""),
    [bKind, setBKind] = useState("Film"),
    [bStatus, setBStatus] = useState("want"),
    [bulkMessage, setBulkMessage] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [edit, setEdit] = useState(null),
    [season, setSeason] = useState(1),
    [episode, setEpisode] = useState(1),
    [trailer, setTrailer] = useState(null);
  const fileRef = useRef(null),
    lbRef = useRef(null),
    titleRef = useRef(null),
    searchRef = useRef(null),
    trailerSeq = useRef(0);
  const t = (k) => translate(lang, k),
    w = (en, ka) => (lang === "ka" ? ka : en);
  const kinds = [
    { id: "Film", label: t("movies") },
    { id: "Anime", label: t("anime") },
    { id: "Series", label: t("series") },
  ];
  const statuses = [
    { id: "want", label: t("want"), color: "#e0b84a" },
    { id: "watching", label: t("watching"), color: "#5b9be0" },
    { id: "seen", label: t("seen"), color: "#1fd68a" },
    { id: "dropped", label: t("dropped"), color: "#e26d6d" },
  ];
  useEffect(() => {
    try {
      setLang(localStorage.getItem("velora.lang") === "en" ? "en" : "ka");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (authMode === "update") {
      setPassword("");
      setModal("auth");
    }
  }, [authMode]);
  useEffect(() => {
    if (user && modal === "auth" && authMode === "signup") setModal(null);
  }, [user, modal, authMode]);
  async function loadSearchPage(page, epoch, append = false) {
    if (searchRequest.current.busy) return;
    searchRequest.current.busy = true;
    setSearchBusy(true);
    setSearchMessage("");
    try {
      const data = await searchTitlesPage(search.trim(), undefined, page);
      if (searchRequest.current.epoch !== epoch) return;
      setResults((previous) => {
        const combined = append ? [...previous, ...data.items] : data.items;
        return [
          ...new Map(
            combined.map((item) => [`${item.media}:${item.tmdbId}`, item]),
          ).values(),
        ];
      });
      setSearchPage(data.page);
      setSearchPages(data.totalPages);
      if (!append && !data.items.length)
        setSearchMessage(
          lang === "ka"
            ? "ამ გვერდზე სათაურები ვერ მოიძებნა."
            : "No titles found on this page.",
        );
    } catch (error) {
      if (searchRequest.current.epoch === epoch)
        setSearchMessage(
          error.message === "key"
            ? lang === "ka"
              ? "TMDB გასაღები არ მუშაობს."
              : "TMDB key problem."
            : lang === "ka"
              ? "შედეგების ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა."
              : "Could not load results. Please retry.",
        );
    } finally {
      if (searchRequest.current.epoch === epoch) {
        searchRequest.current.busy = false;
        setSearchBusy(false);
      }
    }
  }
  useEffect(() => {
    const epoch = ++searchRequest.current.epoch;
    searchRequest.current.busy = false;
    setResults([]);
    setSearchMessage("");
    setSearchPage(0);
    setSearchPages(0);
    setSearchBusy(false);
    if ((modal !== "add" && !discover) || search.trim().length < 2) return;
    const timer = setTimeout(() => loadSearchPage(1, epoch), 350);
    return () => {
      clearTimeout(timer);
      searchRequest.current.epoch++;
    };
  }, [search, modal, lang, discover]);
  const moreSearchResults =
    (searchPage < searchPages ||
      searchBusy ||
      (searchMessage && !searchPage)) &&
    search.trim().length >= 2 ? (
      <div className="search-pagination">
        <button
          type="button"
          disabled={searchBusy}
          onClick={() =>
            loadSearchPage(searchPage + 1, searchRequest.current.epoch, true)
          }
        >
          {searchBusy
            ? lang === "ka"
              ? "იტვირთება…"
              : "Loading…"
            : lang === "ka"
              ? "მეტის ჩატვირთვა"
              : "Load more"}
        </button>
      </div>
    ) : null;
  const close = () => {
    setModal(null);
    trailerSeq.current++;
    setTrailer(null);
  };
  const openAdd = () => {
    setSearch("");
    setResults([]);
    setModal("add");
    setTimeout(() => searchRef.current?.focus(), 0);
  };
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.slice(1);
      if (discover) {
        if (["movies", "anime", "series"].includes(hash)) {
          setReleaseCategory(hash);
          setSearch("");
        }
      } else if (
        ["watchlist", "history", "library", "Film", "Anime", "Series"].includes(
          hash,
        )
      ) {
        setView(
          { watchlist: "want", history: "done", library: "library" }[hash] ||
            hash,
        );
        setFilter("all");
        setQuery("");
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [discover]);
  function openCabinet(next = "library") {
    const hash = { want: "watchlist", done: "history", library: "library" }[
      next
    ];
    if (discover || settings) router.push("/cabinet#" + hash);
    else {
      navigate(next);
      window.history.replaceState(window.history.state, "", "/cabinet#" + hash);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }
  function openDiscover(next = null) {
    if (discover) {
      setReleaseCategory(next);
      setSearch("");
      window.scrollTo({ top: 0, behavior: "auto" });
    } else router.push("/" + (next ? "#" + next : ""));
  }
  const navigate = (next, f = "all") => {
    if (settings) {
      router.push(
        "/cabinet#" + ({ want: "watchlist", done: "history" }[next] || next),
      );
      return;
    }

    setView(next);
    setFilter(f);
    setQuery("");
  };
  const posters = async () => {
    if (!items.some((i) => !i.poster)) {
      setToast(
        w(
          "All your titles already have posters.",
          "ყველა სათაურს უკვე აქვს პოსტერი.",
        ),
      );
      return;
    }
    try {
      await findPosters();
    } catch (e) {
      setToast(e.message);
    }
  };
  const signOut = async () => {
    if (
      confirm(
        w("Log out of your account?", "ნამდვილად გსურთ ანგარიშიდან გამოსვლა?"),
      )
    ) {
      if (await logout()) close();
    }
  };
  const playTrailer = async (item) => {
    const seq = ++trailerSeq.current;
    setTrailer({ item, loading: true });
    setModal("trailer");
    try {
      const video = await fetchTrailer(item, undefined, (patch) => {
        if (seq === trailerSeq.current) updateItem(item.id, patch);
      });
      if (seq === trailerSeq.current)
        setTrailer({ item, key: video?.key, error: video ? "" : "missing" });
    } catch (e) {
      if (seq === trailerSeq.current)
        setTrailer({ item, error: e.message === "key" ? "key" : "load" });
    }
  };
  const openEpisode = (i) => {
    setEdit(i);
    setSeason(i.season || 1);
    setEpisode(i.episode ?? 1);
    setModal("episode");
  };
  const saveEpisode = () => {
    const s = parseInt(season, 10),
      ep = parseInt(episode, 10);
    if (!edit || !Number.isFinite(s) || s < 1 || !Number.isFinite(ep) || ep < 0)
      return;
    updateItem(edit.id, {
      season: s,
      episode: ep,
      ...(edit.status === "want" ? { status: "watching" } : {}),
    });
    setToast(
      `🍿 ${edit.title} — ${t("seasonAbbr")} ${s}, ${t("episodeAbbr")} ${ep}`,
    );
    close();
  };
  const cards = (list, cls) => (
    <div className={cls}>
      {list.map((i) => (
        <Card
          key={i.id}
          item={i}
          kinds={kinds}
          statuses={statuses}
          t={t}
          words={w}
          onTrailer={playTrailer}
          onDetails={setDetailItem}
          onEpisode={openEpisode}
          update={updateItem}
          remove={removeItem}
          notify={setToast}
        />
      ))}
    </div>
  );
  const q = query.trim().toLowerCase();
  let filtered = items.filter((i) => i.title.toLowerCase().includes(q));
  if (!q) {
    if (kinds.some((k) => k.id === view))
      filtered = filtered.filter((i) => i.kind === view);
    else if (view === "want")
      filtered = filtered.filter((i) => i.status === "want");
    else if (view === "done")
      filtered = filtered.filter((i) => i.status === "seen");
  }
  if (filter !== "all") filtered = filtered.filter((i) => i.status === filter);
  if (sort === "new") filtered.reverse();
  else if (sort === "rating")
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else filtered.sort((a, b) => a.title.localeCompare(b.title));
  const rated = items.filter((i) => i.rating),
    avg = rated.length
      ? (rated.reduce((sum, i) => sum + i.rating, 0) / rated.length).toFixed(1)
      : "–";
  const syncLabel =
    syncState === "synced"
      ? w("☁️ Synced", "☁️ სინქრონიზებულია")
      : syncState === "saving"
        ? w("☁️ Saving…", "☁️ ინახება…")
        : syncState === "err"
          ? w("⚠️ Sync error", "⚠️ სინქრონიზაციის შეცდომა")
          : w("Stored on this device", "შენახულია ამ მოწყობილობაზე");
  const authTitle =
    authMode === "signup"
      ? w("Register", "რეგისტრაცია")
      : authMode === "reset"
        ? w("Reset password", "პაროლის აღდგენა")
        : authMode === "update"
          ? w("Set a new password", "ახალი პაროლის დაყენება")
          : w("Sign In", "შესვლა");
  const authSubmit =
    authMode === "reset"
      ? w("Send reset link", "აღდგენის ბმულის გაგზავნა")
      : authMode === "update"
        ? w("Save new password", "ახალი პაროლის შენახვა")
        : authTitle;
  const navButton = (id, label) => (
    <button
      key={id}
      className={`nav${view === id ? " on" : ""}`}
      onClick={() => navigate(id)}
    >
      <Icon
        name={
          {
            home: "home",
            Film: "film",
            Series: "tv",
            Anime: "spark",
            want: "bookmark",
            done: "clock",
          }[id]
        }
      />
      {label}
    </button>
  );
  function changePersonalDetails(item, patch) {
    const existing = items.find(
      (entry) =>
        (item.tmdbId &&
          entry.tmdbId === item.tmdbId &&
          entry.media === item.media) ||
        keyOf(entry) === keyOf(item) ||
        (item.category &&
          entry.title.toLowerCase() === item.title.toLowerCase()),
    );
    if (existing) updateItem(existing.id, patch);
    else
      addItems([
        {
          ...item,
          kind:
            item.kind ||
            (item.category === "anime"
              ? "Anime"
              : item.category === "series" || item.media === "tv"
                ? "Series"
                : "Film"),
          status: "want",
          rating: null,
          overview: item.overview || item.description || "",
          ...patch,
        },
      ]);
  }
  const accountPanel = (
    <CabinetProfile
      showSettings={settings}
      user={user}
      items={items}
      lang={lang}
      syncState={syncState}
      syncLabel={syncLabel}
      sync={sync}
      updateProfile={data.updateProfile}
      uploadAvatar={data.uploadAvatar}
      onLogout={signOut}
      exportBackup={exportBackup}
      onImport={() => fileRef.current?.click()}
      onLetterboxd={() => lbRef.current?.click()}
      onLanguage={(next) => {
        setLang(next);
        try {
          localStorage.setItem("velora.lang", next);
        } catch {}
      }}
      onSignIn={() => {
        setAuthMode("signin");
        setModal("auth");
      }}
      onReset={() => {
        setAuthMode("reset");
        setEmail(user?.email || "");
        setModal("auth");
      }}
    />
  );
  return (
    <>
      <div className="app">
        <aside>
          <div className="logo">
            <i />
            Velora
          </div>
          <div className="mobile-tools">
            <button
              type="button"
              aria-label={w("Open watchlist", "სანახავი სიის გახსნა")}
              onClick={() => openCabinet("want")}
            >
              <Icon name="bookmark" size={19} />
            </button>
            <button
              type="button"
              aria-label={w("Open viewing history", "ნანახი ისტორიის გახსნა")}
              onClick={() => openCabinet("done")}
            >
              <Icon name="clock" size={19} />
            </button>
          </div>
          <div id="nav" style={{ display: "contents" }}>
            <Link
              className={discover && !releaseCategory ? "nav on" : "nav"}
              aria-current={discover ? "page" : undefined}
              href="/"
              onClick={() => {
                setReleaseCategory(null);
                setSearch("");
              }}
            >
              <Icon name="home" />
              {t("home")}
            </Link>
            {discover &&
              kinds.map((k) => (
                <button
                  key={k.id}
                  className={`nav${releaseCategory === { Film: "movies", Anime: "anime", Series: "series" }[k.id] ? " on" : ""}`}
                  onClick={() => {
                    setSearch("");
                    setReleaseCategory(
                      { Film: "movies", Anime: "anime", Series: "series" }[
                        k.id
                      ],
                    );
                  }}
                >
                  <Icon
                    name={
                      k.id === "Film"
                        ? "film"
                        : k.id === "Anime"
                          ? "spark"
                          : "tv"
                    }
                  />
                  {k.label}
                </button>
              ))}
            <Link
              className={!discover && !settings ? "nav on" : "nav"}
              aria-current={!discover && !settings ? "page" : undefined}
              href="/cabinet"
            >
              <Icon name="settings" />
              {t("cabinet")}
            </Link>
            {!discover && navButton("library", t("library"))}
            {!discover && kinds.map((k) => navButton(k.id, k.label))}
            {!discover && <div className="grp">{t("yourStuff")}</div>}
            {!discover && navButton("want", t("watchlist"))}
            {!discover && navButton("done", t("history"))}
          </div>
          <div className="sp" />
          <div className="side-tools" hidden={discover}>
            <button id="exp" onClick={exportBackup}>
              {t("exportBackup")}
            </button>
            <button id="lb" onClick={() => lbRef.current?.click()}>
              {t("importLetterboxd")}
            </button>
            <input
              id="lbFile"
              ref={lbRef}
              type="file"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = "";
                if (!files.length) return;
                try {
                  const r = await importLetterboxd(files);
                  if (
                    confirm(
                      w(
                        `Letterboxd import done: ${r.added} added, ${r.updated} updated. Find posters now?`,
                        `Letterboxd: დაემატა ${r.added}, განახლდა ${r.updated}. მოვძებნოთ პოსტერები?`,
                      ),
                    )
                  )
                    await posters();
                } catch (err) {
                  setToast(err.message);
                }
              }}
            />
            <button
              id="fp"
              disabled={Boolean(posterProgress)}
              onClick={posters}
            >
              {posterProgress
                ? `${t("findPosters")} ${posterProgress.current ?? posterProgress.done ?? ""}/${posterProgress.total ?? ""}`
                : t("findPosters")}
            </button>
            <button id="imp" onClick={() => fileRef.current?.click()}>
              {t("importBackup")}
            </button>
            <input
              id="file"
              ref={fileRef}
              type="file"
              accept=".json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const count = await importBackup(file);
                  setToast(
                    w(
                      `${count} new titles added.`,
                      `დაემატა ${count} ახალი სათაური.`,
                    ),
                  );
                } catch {
                  setToast(
                    w(
                      "That file isn't a valid backup.",
                      "ფაილი არ არის სწორი სარეზერვო ასლი.",
                    ),
                  );
                }
              }}
            />
            <small id="storageNote">{t("storageNote")}</small>
          </div>
        </aside>
        <main>
          <div className="top">
            {discover ? (
              <input
                id="catalogSearch"
                type="search"
                aria-label="Search movies and series"
                placeholder={t("catalogSearch")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            ) : (
              <input
                id="q"
                type="search"
                aria-label="Search"
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
            {!discover && (
              <button className="primary" id="openAdd" onClick={openAdd}>
                {t("addTitle")}
              </button>
            )}
            <button
              id="langBtn"
              className="lang-btn"
              title="შეცვალეთ ენა / Switch Language"
              onClick={() => {
                const next = lang === "ka" ? "en" : "ka";
                setLang(next);
                try {
                  localStorage.setItem("velora.lang", next);
                } catch {}
              }}
            >
              {lang === "ka" ? "🇬🇪 GE" : "🇬🇧 EN"}
            </button>
            <div id="authArea" className="auth-area">
              {themeButton}
              <Link
                href="/settings"
                className="theme-toggle settings-toggle"
                aria-label={w("Settings", "პარამეტრები")}
                title={w("Settings", "პარამეტრები")}
                aria-current={settings ? "page" : undefined}
              >
                <Icon name="settings" />
              </Link>
              {user ? (
                <button
                  type="button"
                  className="auth-user"
                  aria-label={w("Open my cabinet", "ჩემი კაბინეტის გახსნა")}
                  title={t("cabinet")}
                  onClick={() => router.push("/cabinet")}
                >
                  <span className="auth-avatar">
                    <ProfileAvatar
                      user={user}
                      fallback={(user.email || "U")[0]}
                    />
                  </span>
                </button>
              ) : (
                <button
                  className="auth-btn"
                  onClick={() => {
                    setAuthMode("signin");
                    setEmail("");
                    setPassword("");
                    setModal("auth");
                  }}
                >
                  👤 {w("Sign In / Register", "შესვლა / რეგისტრაცია")}
                </button>
              )}
            </div>
          </div>
          <div className="page-heading">
            <div>
              <h1>
                {settings
                  ? w("Settings", "პარამეტრები")
                  : discover
                    ? t("discoverTitle")
                    : q
                      ? w("Search results", "ძიების შედეგები")
                      : view === "library"
                        ? t("cabinet")
                        : view === "want"
                          ? t("watchlist")
                          : view === "done"
                            ? t("history")
                            : kinds.find((k) => k.id === view)?.label}
              </h1>
              <p>
                {w(
                  discover
                    ? "New movies, anime and series — in one place."
                    : "Every story that stays with you.",
                  discover
                    ? "ახალი ფილმები, ანიმეები და სერიალები — ერთ სივრცეში."
                    : "ყველა ისტორია, რომელიც შენთან რჩება.",
                )}
              </p>
            </div>
            <span className="m">
              {discover
                ? w("Movie catalog", "ფილმების კატალოგი")
                : w("Personal library", "პირადი ბიბლიოთეკა")}
            </span>
          </div>
          {!discover && accountPanel}
          <div id="view" aria-busy={!ready}>
            {settings ? null : discover ? (
              <section className="catalog-view">
                {search.trim().length < 2 && (
                  <ReleaseHome
                    onTrailer={playTrailer}
                    onPersonalChange={changePersonalDetails}
                    onCollection={() => openCabinet("library")}
                    onUpdate={(id, patch) => {
                      updateItem(id, patch);
                      setToast(w("Episode marked", "სერია მოინიშნა"));
                    }}
                    category={releaseCategory}
                    setCategory={setReleaseCategory}
                    items={items}
                    lang={lang}
                    onSave={(item) => {
                      addItems([item]);
                      setToast(
                        w("Added to your watchlist", "დაემატა სანახავ სიას"),
                      );
                    }}
                  />
                )}
                <div className="f2" hidden={search.trim().length < 2}>
                  <select
                    aria-label="Add with status"
                    value={sStatus}
                    onChange={(e) => setSStatus(e.target.value)}
                  >
                    <Options values={statuses} />
                  </select>
                  <Rating
                    first={t("notRated")}
                    value={sRating}
                    onChange={(e) => setSRating(e.target.value)}
                  />
                </div>
                <div
                  className="catalog-results"
                  aria-live="polite"
                  hidden={search.trim().length < 2}
                >
                  {searchMessage && <p className="m">{searchMessage}</p>}
                  {results.map((m) => (
                    <Result
                      key={`${m.media}:${m.tmdbId}`}
                      item={m}
                      onDetails={setDetailItem}
                      kinds={kinds}
                      words={w}
                      have={items.some((i) => keyOf(i) === keyOf(m))}
                      onAdd={(m) =>
                        addItems([
                          {
                            ...m,
                            status: sStatus,
                            rating: sRating ? Number(sRating) : null,
                          },
                        ])
                      }
                    />
                  ))}
                  {moreSearchResults}
                  {!search.trim() && (
                    <p className="empty">{t("catalogEmpty")}</p>
                  )}
                </div>
              </section>
            ) : (
              <>
                {view === "library" && !q && filter === "all" ? (
                  <>
                    {!items.length ? (
                      <div className="empty">{t("emptyLib")}</div>
                    ) : (
                      [
                        ["watching", "secWatching", "library", "watching"],
                        ["want", "secWant", "want", "all"],
                        ["seen", "secSeen", "done", "all"],
                      ].map(([status, key, next, f]) => {
                        const list = items.filter((i) => i.status === status);
                        return list.length ? (
                          <div className="sec" key={key}>
                            <div className="sechead">
                              <h2>{t(key)}</h2>
                              <button
                                className="link"
                                onClick={() => navigate(next, f)}
                              >
                                {t("seeAll")}
                              </button>
                            </div>
                            {cards(list.slice().reverse().slice(0, 12), "row")}
                          </div>
                        ) : null;
                      })
                    )}
                  </>
                ) : (
                  <>
                    <div className="bar">
                      <h2>
                        {q
                          ? w("Search results", "ძიების შედეგები")
                          : view === "library"
                            ? statuses.find((s) => s.id === filter)?.label
                            : view === "want"
                              ? t("watchlist")
                              : view === "done"
                                ? t("history")
                                : kinds.find((k) => k.id === view)?.label}
                      </h2>
                      {!q &&
                        view !== "want" &&
                        [{ id: "all", label: t("all") }, ...statuses].map(
                          (s) => (
                            <button
                              key={s.id}
                              className={`tab${filter === s.id ? " on" : ""}`}
                              onClick={() => setFilter(s.id)}
                            >
                              {s.label}
                            </button>
                          ),
                        )}
                      <select
                        aria-label="Sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <Options
                          values={[
                            { id: "new", label: t("sortRecent") },
                            { id: "rating", label: t("sortRating") },
                            { id: "title", label: t("sortTitle") },
                          ]}
                        />
                      </select>
                    </div>
                    {filtered.length ? (
                      cards(filtered, "grid")
                    ) : (
                      <div className="empty">{t("emptyFilter")}</div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <Dialog id="dlg" open={modal === "add"} onClose={close}>
        <h3>{w("Add a title", "სათაურის დამატება")}</h3>
        <div className="f2" style={{ margin: "0 0 8px" }}>
          <select
            id="sStatus"
            aria-label="Status"
            value={sStatus}
            onChange={(e) => setSStatus(e.target.value)}
          >
            <Options values={statuses} />
          </select>
          <Rating
            id="sRating"
            first={t("notRated")}
            value={sRating}
            onChange={(e) => setSRating(e.target.value)}
          />
          <span className="m">
            {w(
              "Applied to what you add below",
              "გამოიყენება ქვემოთ დამატებულ სათაურებზე",
            )}
          </span>
        </div>
        <input
          id="sq"
          ref={searchRef}
          placeholder={w(
            "Type a film, series or anime name",
            "ჩაწერეთ ფილმის, სერიალის ან ანიმეს სახელი",
          )}
          style={{ width: "100%" }}
          aria-label="Search titles"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div id="results">
          {searchMessage && <div className="m">{searchMessage}</div>}
          {results.map((m) => (
            <Result
              key={`${m.media}:${m.tmdbId}`}
              item={m}
              onDetails={setDetailItem}
              kinds={kinds}
              words={w}
              have={items.some((i) => keyOf(i) === keyOf(m))}
              onAdd={(m) =>
                addItems([
                  {
                    ...m,
                    status: sStatus,
                    rating: sRating ? Number(sRating) : null,
                  },
                ])
              }
            />
          ))}
          {moreSearchResults}
        </div>
        <details>
          <summary>{w("Add by hand", "ხელით დამატება")}</summary>
          <form
            id="add"
            style={{ marginTop: 8 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              await addItems([
                {
                  title: title.trim(),
                  kind,
                  year: year.trim(),
                  status,
                  rating: rating ? Number(rating) : null,
                },
              ]);
              setTitle("");
              setYear("");
              setRating("");
              titleRef.current?.focus();
            }}
          >
            <div className="f">
              <input
                id="title"
                ref={titleRef}
                placeholder={w("Title", "სათაური")}
                required
                aria-label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                id="kind"
                aria-label="Type"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <Options values={kinds} />
              </select>
              <input
                id="year"
                placeholder={w("Year", "წელი")}
                inputMode="numeric"
                maxLength={4}
                aria-label="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="f2">
              <select
                id="status"
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <Options values={statuses} />
              </select>
              <Rating
                id="rating"
                first={t("notRated")}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
              <button className="primary">{w("Add", "დამატება")}</button>
            </div>
          </form>
        </details>
        <details>
          <summary>
            {w("Add many at once", "რამდენიმეს ერთად დამატება")}
          </summary>
          <p className="m">
            {w(
              "One title per line. Add a rating after a comma:",
              "თითო სათაური თითო ხაზზე. მძიმის შემდეგ მიუთითეთ შეფასება:",
            )}{" "}
            <b>Breaking Bad, 10</b>.{" "}
            {w(
              "A year in brackets is optional:",
              "სურვილისამებრ, წელი ფრჩხილებში:",
            )}{" "}
            <b>Dune (2021), 8</b>.
          </p>
          <textarea
            id="bulkText"
            rows={6}
            placeholder={"Breaking Bad, 10\nAttack on Titan, 9\nDune (2021), 8"}
            aria-label="List of titles"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <div className="f2">
            <select
              id="bKind"
              aria-label="Type for all"
              value={bKind}
              onChange={(e) => setBKind(e.target.value)}
            >
              <Options values={kinds} />
            </select>
            <select
              id="bStatus"
              aria-label="Status for all"
              value={bStatus}
              onChange={(e) => setBStatus(e.target.value)}
            >
              <Options values={statuses} />
            </select>
            <button
              className="primary"
              id="bAdd"
              type="button"
              onClick={async () => {
                const list = [];
                for (let line of bulk.split("\n")) {
                  line = line.trim();
                  if (!line) continue;
                  const m = line.match(
                    /^(.*?)(?:\s*\((\d{4})\))?(?:\s*(?:[|,;]|\s[-\u2013\u2014]\s)\s*(\d{1,2}))?\s*$/,
                  );
                  let title = m ? m[1].trim() : line,
                    year = m?.[2] || "",
                    rating = m?.[3] ? Number(m[3]) : null;
                  if (rating !== null && (rating < 1 || rating > 10)) {
                    title = line;
                    rating = null;
                  }
                  if (title)
                    list.push({
                      title,
                      year,
                      rating,
                      kind: bKind,
                      status: bStatus,
                    });
                }
                const n = await addItems(list);
                setBulkMessage(
                  w(
                    `${n} added${list.length - n ? `, ${list.length - n} already in your list` : ""}`,
                    `დაემატა ${n}${list.length - n ? `, უკვე სიაშია ${list.length - n}` : ""}`,
                  ),
                );
                if (n) setBulk("");
              }}
            >
              {w("Add all", "ყველას დამატება")}
            </button>
            <span className="m" id="bMsg">
              {bulkMessage}
            </span>
          </div>
        </details>
        <div className="f2" style={{ justifyContent: "flex-end" }}>
          <button id="close" type="button" onClick={close}>
            {w("Close", "დახურვა")}
          </button>
        </div>
      </Dialog>
      {detailItem && (
        <TitleDetails
          item={detailItem}
          personalItem={items.find(
            (entry) => keyOf(entry) === keyOf(detailItem),
          )}
          onPersonalChange={changePersonalDetails}
          lang={lang}
          onClose={() => setDetailItem(null)}
          actions={
            <button
              className="primary"
              onClick={() => {
                const selected = detailItem;
                setDetailItem(null);
                void playTrailer(selected);
              }}
            >
              {w("Watch trailer", "თრეილერის ნახვა")}
            </button>
          }
        />
      )}
      <Dialog id="authDlg" open={modal === "auth"} onClose={close}>
        <div style={headerStyle}>
          <h3 id="authTitle" style={{ margin: 0 }}>
            {authTitle}
          </h3>
          <button
            id="closeAuth"
            type="button"
            className="x"
            style={closeStyle}
            onClick={close}
          >
            ×
          </button>
        </div>
        <p className="m" id="authSub" style={{ margin: "0 0 14px" }}>
          {authMode === "reset"
            ? w(
                "Enter your email to receive a password reset link.",
                "ჩაწერეთ ელფოსტა პაროლის აღდგენის ბმულის მისაღებად.",
              )
            : authMode === "update"
              ? w(
                  "Enter your new password below.",
                  "შეიყვანეთ თქვენი ახალი პაროლი ქვემოთ.",
                )
              : w(
                  "Save your series and movies in the cloud to access them anywhere.",
                  "შეინახეთ სერიალები და ფილმები ღრუბელში ყველა მოწყობილობიდან წვდომისთვის.",
                )}
        </p>
        <div
          className="auth-tabs"
          id="authTabs"
          style={{
            display: ["signin", "signup"].includes(authMode) ? "flex" : "none",
          }}
        >
          <button
            type="button"
            id="tabSignIn"
            className={`tab${authMode === "signin" ? " on" : ""}`}
            onClick={() => setAuthMode("signin")}
          >
            {w("Sign In", "შესვლა")}
          </button>
          <button
            type="button"
            id="tabSignUp"
            className={`tab${authMode === "signup" ? " on" : ""}`}
            onClick={() => setAuthMode("signup")}
          >
            {w("Register", "რეგისტრაცია")}
          </button>
        </div>
        <form
          id="authForm"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const mode = authMode;
            const result = await authenticate(mode, email.trim(), password);
            if (result && (mode === "signin" || mode === "update")) {
              close();
              if (mode === "update") setAuthMode("signin");
            }
          }}
        >
          <div
            id="authEmailWrap"
            style={{ display: authMode === "update" ? "none" : "block" }}
          >
            <label
              htmlFor="authEmail"
              className="m"
              style={{ display: "block", fontSize: 12, marginBottom: 4 }}
            >
              {w("Email", "ელფოსტა")}
            </label>
            <input
              type="email"
              id="authEmail"
              required={authMode !== "update"}
              placeholder="you@example.com"
              style={{ width: "100%" }}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div
            id="authPasswordWrap"
            style={{ display: authMode === "reset" ? "none" : "block" }}
          >
            <label
              htmlFor="authPassword"
              className="m"
              id="authPassLabel"
              style={{ display: "block", fontSize: 12, marginBottom: 4 }}
            >
              {authMode === "update"
                ? w("New password", "ახალი პაროლი")
                : w(
                    "Password (at least 6 characters)",
                    "პაროლი (მინიმუმ 6 სიმბოლო)",
                  )}
            </label>
            <input
              type="password"
              id="authPassword"
              required={authMode !== "reset"}
              minLength={6}
              placeholder="••••••••"
              style={{ width: "100%" }}
              autoComplete={
                authMode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div
              id="authForgotRow"
              style={{
                textAlign: "right",
                marginTop: 4,
                display: authMode === "signin" ? "block" : "none",
              }}
            >
              <button
                type="button"
                id="authForgotBtn"
                className="link"
                style={{ fontSize: 12 }}
                onClick={() => setAuthMode("reset")}
              >
                {w("Forgot password?", "დაგავიწყდათ პაროლი?")}
              </button>
            </div>
          </div>
          <div
            id="authAlert"
            role="status"
            className={`auth-alert${authError ? " error" : authMessage ? " success" : ""}`}
          >
            {translateAuthMessage(lang, authError || authMessage)}
          </div>
          <button
            type="submit"
            className="primary"
            id="authSubmit"
            disabled={authBusy}
            style={{ padding: 10, marginTop: 6, width: "100%" }}
          >
            {authBusy ? w("⏳ Processing…", "⏳ მუშავდება…") : authSubmit}
          </button>
        </form>
        <div
          className="m"
          style={{ marginTop: 14, textAlign: "center", fontSize: 12 }}
        >
          <span id="authToggleHint">
            {authMode === "signin"
              ? w("Don't have an account?", "არ გაქვთ ანგარიში?")
              : authMode === "signup"
                ? w("Already have an account?", "უკვე გაქვთ ანგარიში?")
                : ""}
          </span>
          <button
            type="button"
            id="authToggleBtn"
            className="link"
            style={{ marginLeft: 4 }}
            onClick={() =>
              setAuthMode(authMode === "signin" ? "signup" : "signin")
            }
          >
            {authMode === "signin"
              ? w("Create account", "ახალი რეგისტრაცია")
              : w("Back to sign in", "უკან შესვლაზე")}
          </button>
        </div>
      </Dialog>
      <Dialog
        id="trailerDlg"
        open={modal === "trailer"}
        onClose={close}
        style={{
          padding: 0,
          background: "#000",
          border: "1px solid var(--line)",
          borderRadius: 18,
          overflow: "hidden",
          width: "min(820px,94vw)",
        }}
      >
        <div
          style={{
            ...headerStyle,
            padding: "12px 18px",
            background: "var(--side)",
            marginBottom: 0,
          }}
        >
          <b id="trailerTitle" style={{ fontSize: 15 }}>
            ▶ {trailer?.item.title}
            {trailer?.item.year ? ` (${trailer.item.year})` : ""}
            {trailer?.error
              ? ` — ${trailer.error === "missing" ? w("Trailer not found", "თრეილერი ვერ მოიძებნა") : trailer.error === "key" ? w("TMDB key problem", "TMDB გასაღები არ მუშაობს") : w("Couldn't load trailer", "თრეილერის ჩატვირთვა ვერ მოხერხდა")}`
              : ""}
          </b>
          <a
            id="trailerYT"
            href={
              trailer?.key
                ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`
                : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${trailer?.item.title || ""} ${trailer?.item.year || ""} trailer`)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "auto", marginRight: 12 }}
          >
            {trailer?.key
              ? w("Open on YouTube ↗", "YouTube-ზე გახსნა ↗")
              : w("Search on YouTube ↗", "YouTube-ზე ძებნა ↗")}
          </a>
          <button
            id="closeTrailer"
            className="x"
            style={closeStyle}
            onClick={close}
          >
            ×
          </button>
        </div>
        <div
          style={{
            position: "relative",
            paddingTop: "56.25%",
            background: "#000",
          }}
        >
          <a id="trailerThumb" style={{ display: "none" }}>
            <span id="trailerThumbText" />
            <span id="trailerThumbNote" />
          </a>
          <iframe
            id="trailerFrame"
            title={t("trailer")}
            src={
              modal === "trailer" && trailer?.key
                ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`
                : "about:blank"
            }
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </Dialog>
      <Dialog
        id="epDlg"
        open={modal === "episode"}
        onClose={close}
        style={{ width: "min(380px,92vw)", padding: 20, borderRadius: 18 }}
      >
        <div style={headerStyle}>
          <h3 id="epDlgTitle" style={{ margin: 0, fontSize: 16 }}>
            {edit?.title}
          </h3>
          <button
            id="closeEpDlg"
            className="x"
            style={closeStyle}
            onClick={close}
          >
            ×
          </button>
        </div>
        <p
          className="m"
          id="epDlgSub"
          style={{ margin: "0 0 16px", fontSize: 13 }}
        >
          {w(
            "Set your current season and episode:",
            "მიუთითეთ რომელ სეზონსა და სერიაზე ხართ:",
          )}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {[
            [
              "epSeasonInput",
              "epSeasonLabel",
              w("Season", "სეზონი"),
              season,
              setSeason,
              1,
            ],
            [
              "epNumberInput",
              "epNumberLabel",
              w("Episode", "სერია"),
              episode,
              setEpisode,
              0,
            ],
          ].map(([id, labelId, label, value, setValue, min]) => (
            <div
              key={id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 12,
                textAlign: "center",
              }}
            >
              <label
                htmlFor={id}
                className="m"
                id={labelId}
                style={{ display: "block", fontSize: 12, marginBottom: 6 }}
              >
                {label}
              </label>
              <input
                type="number"
                id={id}
                min={min}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: 22,
                  fontWeight: 700,
                  textAlign: "center",
                  padding: 6,
                }}
              />
            </div>
          ))}
        </div>
        <div className="f2" style={{ justifyContent: "flex-end" }}>
          <button id="epCancelBtn" onClick={close}>
            {w("Cancel", "გაუქმება")}
          </button>
          <button className="primary" id="epSaveBtn" onClick={saveEpisode}>
            {w("Save", "შენახვა")}
          </button>
        </div>
      </Dialog>
      <nav
        className="mobile-nav"
        aria-label={w("Mobile navigation", "ტელეფონის ნავიგაცია")}
      >
        {[
          { id: "home", label: t("home"), icon: "home" },
          { id: "movies", label: t("movies"), icon: "film" },
          { id: "anime", label: t("anime"), icon: "spark" },
          { id: "series", label: t("series"), icon: "tv" },
          { id: "cabinet", label: w("Cabinet", "კაბინეტი"), icon: "settings" },
        ].map((n) => {
          const active =
            n.id === "cabinet"
              ? !discover
              : discover &&
                (n.id === "home" ? !releaseCategory : releaseCategory === n.id);
          return (
            <button
              key={n.id}
              type="button"
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() =>
                n.id === "cabinet"
                  ? openCabinet()
                  : openDiscover(n.id === "home" ? null : n.id)
              }
            >
              <Icon name={n.icon} size={21} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div id="toast" role="status" className={`toast${toast ? " show" : ""}`}>
        {toast || ""}
      </div>
    </>
  );
}
