"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import TitleDetails from "./TitleDetails";
import ReleaseRow from "./ReleaseRow";
import { useDragScroll } from "../lib/useDragScroll";
import { discoverMoodPage } from "../lib/media";
import { releaseCatalog } from "../lib/releases";
export default function ReleaseHome({
  items,
  onSave,
  onUpdate,
  onCollection,
  onTrailer,
  lang,
  category,
  setCategory,
}) {
  const w = (en, ka) => (lang === "ka" ? ka : en);
  const [slide, setSlide] = useState(0),
    [detail, setDetail] = useState(null);
  const features = [
    releaseCatalog[0],
    releaseCatalog[1],
    releaseCatalog[8],
    ...releaseCatalog.filter((_, index) => ![0, 1, 8].includes(index)),
  ];
  const [mood, setMood] = useState("all");
  useEffect(() => {
    setMood("all");
  }, [category]);
  const moods = [
    { id: "all", label: w("All stories", "ყველა ისტორია"), icon: "grid" },
    { id: "tense", label: w("Tense", "დაძაბული"), icon: "film" },
    { id: "light", label: w("Light", "მსუბუქი"), icon: "sun" },
    { id: "fantasy", label: w("Fantastic", "ფანტასტიკური"), icon: "spark" },
    { id: "emotional", label: w("Emotional", "ემოციური"), icon: "bookmark" },
  ];
  const [moodResults, setMoodResults] = useState([]),
    [moodPage, setMoodPage] = useState(0),
    [moodPages, setMoodPages] = useState({ movie: 500, tv: 500 }),
    [moodBusy, setMoodBusy] = useState(false),
    [moodError, setMoodError] = useState("");
  const moodRequest = useRef({ epoch: 0, busy: false });
  async function loadMood(page, epoch, limits = { movie: 500, tv: 500 }) {
    if (moodRequest.current.busy) return;
    moodRequest.current.busy = true;
    setMoodBusy(true);
    setMoodError("");
    try {
      const data = await discoverMoodPage(mood, undefined, page, limits);
      if (moodRequest.current.epoch !== epoch) return;
      setMoodResults((previous) => [
        ...new Map(
          [...previous, ...data.items].map((item) => [item.id, item]),
        ).values(),
      ]);
      setMoodPage(data.page);
      setMoodPages(data.pages);
    } catch (error) {
      if (moodRequest.current.epoch === epoch)
        setMoodError(
          error.message === "key"
            ? w(
                "TMDB key problem. Reconnect the catalog.",
                "TMDB გასაღები არ მუშაობს. ხელახლა დააკავშირე კატალოგი.",
              )
            : w(
                "Could not load titles. Please retry.",
                "სათაურების ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა.",
              ),
        );
    } finally {
      if (moodRequest.current.epoch === epoch) {
        moodRequest.current.busy = false;
        setMoodBusy(false);
      }
    }
  }
  useEffect(() => {
    const epoch = ++moodRequest.current.epoch;
    moodRequest.current.busy = false;
    setMoodResults([]);
    setMoodPage(0);
    setMoodPages({ movie: 500, tv: 500 });
    setMoodError("");
    setMoodBusy(false);
    if (mood !== "all") void loadMood(1, epoch);
    return () => {
      moodRequest.current.epoch++;
    };
  }, [mood, lang]);
  const visibleCatalog = mood === "all" ? releaseCatalog : moodResults;
  const watching = items
    .filter(
      (i) => i.status === "watching" && ["Series", "Anime"].includes(i.kind),
    )
    .slice(0, 2);
  const heroTrack = useRef(null),
    wheelTime = useRef(-Infinity);
  const heroDrag = useDragScroll(heroTrack);
  function goToSlide(index) {
    const track = heroTrack.current;
    if (!track) return;
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  useEffect(() => {
    const track = heroTrack.current;
    const wheel = (e) => {
      if (
        !e.shiftKey ||
        e.ctrlKey ||
        Math.abs(e.deltaX) >= Math.abs(e.deltaY) ||
        !e.deltaY
      )
        return;
      const index = Math.round(track.scrollLeft / track.clientWidth),
        direction = e.deltaY > 0 ? 1 : -1;
      if (index + direction < 0 || index + direction >= features.length) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelTime.current < 550) return;
      wheelTime.current = now;
      goToSlide(index + direction);
    };
    track.addEventListener("wheel", wheel, { passive: false });
    return () => track.removeEventListener("wheel", wheel);
  }, []);

  useEffect(() => {
    const active =
      heroTrack.current?.parentElement.querySelector(".r-slide.active");
    const tabs = active?.parentElement;
    if (tabs)
      tabs.scrollTo({
        left: Math.max(
          0,
          active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2,
        ),
        behavior: "auto",
      });
  }, [slide]);

  const sections = [
    {
      id: "movies",
      title: w("Movies", "ფილმები"),
      subtitle: w(
        "New stories from the big screen",
        "ახალი ისტორიები დიდი ეკრანიდან",
      ),
      icon: "film",
    },
    {
      id: "anime",
      title: w("Anime", "ანიმეები"),
      subtitle: w("Discover new worlds", "აღმოაჩინე ახალი სამყაროები"),
      icon: "spark",
    },
    {
      id: "series",
      title: w("Series", "სერიალები"),
      subtitle: w("Series to discover", "აღმოაჩინე სერიალები"),
      icon: "tv",
    },
  ];
  const isSaved = (item) =>
    items.some((i) => i.title.toLowerCase() === item.title.toLowerCase());
  const save = (item) => {
    if (!isSaved(item))
      onSave({
        title: item.title,
        year: item.tmdbId ? item.year || "" : item.year || "2026",
        tmdbId: item.tmdbId,
        media: item.media,
        kind:
          item.category === "movies"
            ? "Film"
            : item.category === "anime"
              ? "Anime"
              : "Series",
        poster: item.poster,
        overview: item.description,
        link: item.source,
        status: "want",
        rating: null,
      });
  };
  return (
    <div className="r-home">
      <section
        className="r-hero"
        aria-label={w("Featured releases", "გამორჩეული ახალი რელიზები")}
      >
        <div
          {...heroDrag}
          className="r-hero-track"
          ref={heroTrack}
          tabIndex={0}
          aria-label={w(
            "Swipe between featured releases",
            "გადაფურცლე გამორჩეული რელიზები",
          )}
          onScroll={(e) => {
            const track = e.currentTarget;
            setSlide(Math.round(track.scrollLeft / track.clientWidth));
          }}
          onKeyDown={(e) => {
            if (
              e.target === e.currentTarget &&
              ["ArrowLeft", "ArrowRight"].includes(e.key)
            ) {
              e.preventDefault();
              goToSlide(
                Math.max(
                  0,
                  Math.min(
                    features.length - 1,
                    slide + (e.key === "ArrowRight" ? 1 : -1),
                  ),
                ),
              );
            }
          }}
        >
          {features.map((featured, index) => (
            <article
              className="r-hero-panel"
              key={featured.id}
              data-active={slide === index}
              aria-hidden={slide !== index}
              inert={slide !== index}
            >
              <img
                className="r-hero-image"
                src={featured.poster}
                alt=""
                style={{ objectPosition: featured.position || "center" }}
              />
              <div className="r-hero-shade" />
              <span className="r-current">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(features.length).padStart(2, "0")}
              </span>
              <div className="r-hero-content">
                <div className="r-kicker">
                  <span className="r-kicker-dot" />
                  {featured.label} · {featured.year || "2026"}
                </div>
                <h2>{featured.title}</h2>
                <div className="r-meta">
                  <span>{featured.genre}</span>
                  <span>·</span>
                  <span>{featured.date}</span>
                </div>
                <p className="r-description">{featured.description}</p>
                <div className="r-hero-actions">
                  <button
                    className="v-button primary"
                    onClick={() => setDetail(featured)}
                  >
                    {w("Details", "ვრცლად")}
                    <Icon name="arrow" size={16} />
                  </button>
                  <button
                    className="v-button ghost"
                    disabled={isSaved(featured)}
                    onClick={() => save(featured)}
                  >
                    <Icon
                      name={isSaved(featured) ? "check" : "plus"}
                      size={16}
                    />
                    {isSaved(featured)
                      ? w("In your collection", "შენახულია")
                      : w("Watchlist", "სანახავ სიაში")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div
          className="r-hero-controls"
          aria-label={w("Featured navigation", "ბანერის გადაფურცვლა")}
        >
          <button
            type="button"
            aria-label={w("Previous title", "წინა სათაური")}
            disabled={slide === 0}
            onClick={() => goToSlide(slide - 1)}
          >
            <Icon name="arrow" />
          </button>
          <button
            type="button"
            aria-label={w("Next title", "შემდეგი სათაური")}
            disabled={slide === features.length - 1}
            onClick={() => goToSlide(slide + 1)}
          >
            <Icon name="arrow" />
          </button>
        </div>
        <div
          className="r-tabs"
          role="group"
          aria-label={w("Choose release", "რელიზის არჩევა")}
        >
          {features.map((item, i) => (
            <button
              key={item.id}
              className={`r-slide ${slide === i ? "active" : ""}`}
              aria-pressed={slide === i}
              onClick={() => goToSlide(i)}
            >
              <img src={item.poster} alt="" />
              <div>
                <span>
                  {item.category === "movies"
                    ? w("Movie", "ფილმი")
                    : item.category === "anime"
                      ? w("Anime", "ანიმე")
                      : w("Series", "სერიალი")}{" "}
                  / {item.label}
                </span>
                <strong>{item.title}</strong>
              </div>
              <div className="r-slide-number">
                {String(i + 1).padStart(2, "0")}
              </div>
            </button>
          ))}
        </div>
      </section>
      <div className="r-jumps">
        <div className="r-jump-buttons">
          {sections.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setCategory(null);
                requestAnimationFrame(() =>
                  document
                    .getElementById(`new-${n.id}`)
                    ?.scrollIntoView({ block: "start" }),
                );
              }}
            >
              <Icon name={n.icon} />
              {n.title}
            </button>
          ))}
        </div>
        <span className="r-update">
          {w("October selection", "ოქტომბრის არჩევანი")} · 12.10.2026
        </span>
      </div>
      {!category && (
        <section
          className="j-moods"
          aria-label={w("Choose a mood", "განწყობის არჩევა")}
        >
          <div className="j-mood-heading">
            <div>
              <span className="j-overline">
                {w("Your evening · Your choice", "შენი საღამო · შენი არჩევანი")}
              </span>
              <h2>{w("What will you watch today?", "რას უყურებ დღეს?")}</h2>
              <p className="m-intro">
                {w(
                  "Choose a mood — find your next story.",
                  "აირჩიე განწყობა — იპოვე შენი შემდეგი ისტორია.",
                )}
              </p>
            </div>
            <button
              type="button"
              className={`m-all ${mood === "all" ? "is-active" : ""}`}
              aria-pressed={mood === "all"}
              onClick={() => setMood("all")}
            >
              <Icon name="grid" size={14} />
              {w("All stories", "ყველა ისტორია")}
            </button>
          </div>
          <div className="j-mood-options">
            {moods
              .filter((m) => m.id !== "all")
              .map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={mood === m.id ? "selected" : ""}
                  aria-label={m.label}
                  aria-pressed={mood === m.id}
                  onClick={() => setMood(mood === m.id ? "all" : m.id)}
                >
                  <span className="m-tile-top">
                    <span className={`m-icon m-icon-${m.id}`}>
                      <Icon name={m.icon} size={21} />
                    </span>
                    <span className="m-check">
                      <Icon
                        name={mood === m.id ? "check" : "arrow"}
                        size={13}
                      />
                    </span>
                  </span>
                  <strong>{m.label}</strong>
                  <span className="m-caption">
                    {
                      {
                        tense: w(
                          "Intrigue and adrenaline",
                          "ინტრიგა და ადრენალინი",
                        ),
                        light: w(
                          "Smiles and good vibes",
                          "ღიმილი და კარგი განწყობა",
                        ),
                        fantasy: w(
                          "Beyond the everyday",
                          "ყოველდღიურობის მიღმა",
                        ),
                        emotional: w(
                          "Stories that stay with you",
                          "ამბები, რომლებიც გრჩება",
                        ),
                      }[m.id]
                    }
                  </span>
                </button>
              ))}
          </div>
          <div className="m-panel-footer" role="status">
            <span className="m-result">
              <span className="m-result-dot" />
              {mood === "all"
                ? w("Every mood", "ყველა განწყობა")
                : moods.find((m) => m.id === mood)?.label}
              <span className="m-result-divider">/</span>
              {visibleCatalog.length} {w("titles", "სათაური")}
            </span>
            <span className="m-footer-hint">
              {w("Your selection — below", "შენი არჩევანი — ქვემოთ")}
              <Icon name="arrow" size={12} />
            </span>
          </div>
        </section>
      )}
      {category && (
        <button className="link" onClick={() => setCategory(null)}>
          {w("Show all categories", "ყველა კატეგორიის ჩვენება")}
        </button>
      )}
      {sections
        .filter(
          (s) =>
            (!category || s.id === category) &&
            visibleCatalog.some((item) => item.category === s.id),
        )
        .map((section, index) => (
          <section
            className="r-section"
            id={`new-${section.id}`}
            key={section.id}
          >
            <div className="r-section-head">
              <div>
                <div className="r-section-title">
                  <h2>{section.title}</h2>
                  <span>/ 0{index + 1}</span>
                </div>
                <p className="r-section-subtitle">{section.subtitle}</p>
              </div>
              <button
                className="v-link"
                onClick={() => setCategory(section.id)}
              >
                {w("View category", "კატეგორიის ნახვა")}
                <Icon name="arrow" size={14} />
              </button>
            </div>
            <ReleaseRow
              key={mood}
              title={section.title}
              lang={lang}
              scroll={!category}
            >
              {visibleCatalog
                .filter((item) => item.category === section.id)
                .map((item) => (
                  <article className="r-card" key={item.id}>
                    <div className="r-card-image">
                      <img src={item.poster} alt={item.title} loading="lazy" />
                      <button
                        className="r-card-open"
                        aria-label={`${item.title} — ${w("Details", "დეტალები")}`}
                        onClick={() => setDetail(item)}
                      />
                      <span className="r-card-badge">{item.label}</span>
                      <button
                        className={`r-card-save ${isSaved(item) ? "saved" : ""}`}
                        disabled={isSaved(item)}
                        aria-label={`${item.title} — ${isSaved(item) ? w("In your collection", "უკვე კოლექციაშია") : w("Save to watchlist", "სიაში შენახვა")}`}
                        onClick={() => save(item)}
                      >
                        <Icon
                          name={isSaved(item) ? "check" : "plus"}
                          size={16}
                        />
                      </button>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.genre}</p>
                    <div className="r-card-date">{item.date}</div>
                  </article>
                ))}
            </ReleaseRow>
          </section>
        ))}
      {mood !== "all" && (
        <div className="mood-pagination" aria-live="polite">
          {moodError && <p role="alert">{moodError}</p>}
          {!moodBusy &&
            !moodError &&
            moodPage > 0 &&
            !visibleCatalog.length && (
              <p>
                {w(
                  "No matching titles found.",
                  "შესაბამისი სათაურები ვერ მოიძებნა.",
                )}
              </p>
            )}
          {(moodBusy ||
            moodError ||
            moodPage < Math.max(moodPages.movie, moodPages.tv)) && (
            <button
              type="button"
              disabled={moodBusy}
              onClick={() =>
                loadMood(moodPage + 1, moodRequest.current.epoch, moodPages)
              }
            >
              {moodBusy
                ? w("Loading…", "იტვირთება…")
                : w("Load more", "მეტის ჩატვირთვა")}
            </button>
          )}
        </div>
      )}
      {!category && (
        <section
          className="j-continue"
          aria-label={w("Continue watching", "გააგრძელე ყურება")}
        >
          <div className="r-section-head">
            <div>
              <div className="j-overline">
                {w("Your cinema journal", "შენი კინოჟურნალი")}
              </div>
              <h2>{w("Continue watching", "გააგრძელე ყურება")}</h2>
            </div>
            <button className="v-link" onClick={onCollection}>
              {w("My collection", "ჩემი კოლექცია")}
              <Icon name="arrow" size={14} />
            </button>
          </div>
          {watching.length ? (
            <div className="j-continue-grid">
              {watching.map((item) => {
                const episode = item.episode ?? 1,
                  total = Number(item.totalEpisodes) || 0;
                return (
                  <article className="j-continue-card" key={item.id}>
                    <div className="j-continue-art">
                      {item.poster ? (
                        <img src={item.poster} alt="" />
                      ) : (
                        <Icon name="tv" />
                      )}
                    </div>
                    <div className="j-continue-info">
                      <h3>{item.title}</h3>
                      <p>
                        {w("Season", "სეზონი")} {item.season || 1} ·{" "}
                        {w("Episode", "სერია")} {episode}
                        {total ? ` / ${total}` : ""}
                      </p>
                      <div className="j-track" aria-hidden="true">
                        <span
                          style={{
                            width: total
                              ? `${Math.min(100, (episode / total) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                      <span className="j-progress-label">
                        {w("Your current progress", "შენი მიმდინარე პროგრესი")}
                      </span>
                    </div>
                    <button
                      className="j-next"
                      disabled={total > 0 && episode >= total}
                      aria-label={`${item.title} — ${w("Mark next episode", "შემდეგი სერიის მონიშვნა")}`}
                      onClick={() =>
                        onUpdate(item.id, {
                          season: item.season || 1,
                          episode: episode + 1,
                        })
                      }
                    >
                      <Icon name="check" size={18} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="j-empty">
              {w(
                "Mark a series or anime as Watching in your collection to see your progress here.",
                "კოლექციაში სერიალს ან ანიმეს მიუთითე „ვუყურებ“ და პროგრესი აქ გამოჩნდება.",
              )}
            </p>
          )}
        </section>
      )}
      <div className="r-source-note">
        <Icon name="clock" size={14} />
        <span>
          {w(
            "Selected releases and favorites. Availability varies by region.",
            "შერჩეული რელიზები და რჩეული ისტორიები. ხელმისაწვდომობა რეგიონზეა დამოკიდებული.",
          )}
        </span>
      </div>
      {detail && (
        <TitleDetails
          item={detail}
          lang={lang}
          onClose={() => setDetail(null)}
          actions={
            <>
              <button
                className="v-button"
                onClick={() => {
                  const selected = detail;
                  setDetail(null);
                  onTrailer({
                    ...selected,
                    kind:
                      selected.category === "movies"
                        ? "Film"
                        : selected.category === "series"
                          ? "Series"
                          : "Anime",
                    year:
                      selected.year ||
                      String(selected.date || "").match(/\b\d{4}\b/)?.[0],
                  });
                }}
              >
                ▶ {w("Watch trailer", "თრეილერის ნახვა")}
              </button>
              <button
                className="v-button primary"
                disabled={isSaved(detail)}
                onClick={() => save(detail)}
              >
                {isSaved(detail)
                  ? w("In your collection", "შენახულია სანახავ სიაში")
                  : w("Add to watchlist", "სანახავ სიაში დამატება")}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
