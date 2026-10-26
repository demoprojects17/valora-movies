"use client";
import { useEffect, useRef, useState } from "react";
import { fetchTitleDetails } from "../lib/media";

export default function TitleDetails({
  item,
  lang,
  onClose,
  actions,
  personalItem,
  onPersonalChange,
  onRemove,
}) {
  const dialog = useRef(null);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [retry, setRetry] = useState(0);
  const w = (en, ka) => (lang === "ka" ? ka : en);
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    setState("loading");
    fetchTitleDetails(item)
      .then((result) => {
        if (active) {
          setData(result);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [item, retry]);
  const info = data || item;
  const coverSource = item.backdrop || data?.backdrop || data?.poster || item.poster;
  const coverImage = coverSource?.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+\//, "$1original/");
  const rating = info.tmdbRating;
  return (
    <dialog
      ref={dialog}
      className="title-details"
      aria-label={item.title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="td-cover">
        {coverImage && (
          <img
            className="td-cover-image"
            src={coverImage}
            onError={(event) => { if (item.poster && event.currentTarget.getAttribute("src") !== item.poster) event.currentTarget.src = item.poster; }}
            alt=""
          />
        )}
        <div className="td-cover-shade" />
        <span className="td-category">
          {item.category === "anime" || item.kind === "Anime"
            ? w("Anime", "ანიმე")
            : item.category === "series" || item.kind === "Series"
              ? w("Series", "სერიალი")
              : w("Movie", "ფილმი")}{" "}
          / {info.year || item.year || ""}
        </span>
        <button
          className="td-close"
          aria-label={w("Close", "დახურვა")}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="td-content">
        <div className="td-heading">
          <div className="td-title">
            <span className="td-kicker">
              {w("Your next story", "შენი შემდეგი ისტორია")}
            </span>
            <h2>{item.title}</h2>
            <div className="td-genres">
              {(data?.genres || (item.genre ? [item.genre] : [])).map((g) => (
                <span key={g}>{g}</span>
              ))}
              {(info.year || item.date) && (
                <span>{info.year || item.date}</span>
              )}
            </div>
          </div>
          <div
            className="td-rating"
            aria-label={w("TMDB rating", "TMDB რეიტინგი")}
          >
            <div>
              <span aria-hidden="true">★</span>{" "}
              <strong>{rating ? Number(rating).toFixed(1) : "—"}</strong>
              <small>/ 10</small>
            </div>
            <span>
              TMDB
              {data?.votes
                ? ` · ${data.votes.toLocaleString()} ${w("votes", "შეფასება")}`
                : ""}
            </span>
          </div>
        </div>
        {actions && <div className="td-actions">{actions}</div>}
        <div className="td-columns">
          <section className="td-about">
            <h3>{w("About the story", "ისტორიის შესახებ")}</h3>
            <p className="td-overview">
              {(lang === "ka" && item.description) ||
                info.overview ||
                item.description ||
                w(
                  "A description is not available yet.",
                  "აღწერა ჯერ არ არის ხელმისაწვდომი.",
                )}
            </p>
            {[
              [w("Release", "გამოშვება"), info.year || item.date || item.year],
              [
                w("Runtime", "ხანგრძლივობა"),
                info.runtime ? `${info.runtime} ${w("min", "წთ")}` : null,
              ],
              [w("Seasons", "სეზონები"), info.seasons],
              [w("Episodes", "ეპიზოდები"), info.episodes],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div className="td-info-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            <div role="status" className="td-status">
              {state === "loading" &&
                w("Loading details…", "ინფორმაცია იტვირთება…")}
              {state === "error" && (
                <>
                  {w(
                    "Couldn't load additional details.",
                    "დამატებითი ინფორმაციის ჩატვირთვა ვერ მოხერხდა.",
                  )}{" "}
                  <button onClick={() => setRetry((n) => n + 1)}>
                    {w("Retry", "ხელახლა ცდა")}
                  </button>
                </>
              )}
            </div>
          </section>
          {onPersonalChange && (
            <section className="td-personal">
              <span className="td-kicker">
                {w("Your film journal", "შენი კინოჟურნალი")}
              </span>
              <h3>{w("Your rating", "შენი შეფასება")}</h3>
              <p>
                {personalItem?.rating
                  ? `${personalItem.rating} / 10`
                  : w(
                      "What impression did it leave?",
                      "რა შთაბეჭდილება დაგრჩა?",
                    )}
              </p>
              <div
                className="td-stars"
                role="group"
                aria-label={w("Your rating", "შენი შეფასება")}
              >
                {[2, 4, 6, 8, 10].map((score) => (
                  <button
                    type="button"
                    key={score}
                    aria-label={`${score} / 10`}
                    aria-pressed={personalItem?.rating === score}
                    onClick={() =>
                      onPersonalChange({ ...data, ...item }, { rating: score })
                    }
                    className={personalItem?.rating >= score ? "selected" : ""}
                  >
                    ★
                  </button>
                ))}
              </div>
              <select
                aria-label={w("Watch status", "ყურების სტატუსი")}
                value={personalItem?.status || "want"}
                onChange={(e) =>
                  onPersonalChange(
                    { ...data, ...item },
                    { status: e.target.value },
                  )
                }
              >
                {[
                  ["want", w("Want to watch", "მინდა ვუყურო")],
                  ["watching", w("Watching", "ვუყურებ")],
                  ["seen", w("Watched", "ნანახი")],
                  ["dropped", w("Dropped", "მიტოვებული")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="td-note">
                {w(
                  "Your rating and watch status are saved to your collection.",
                  "შეფასება და სტატუსი შენს კოლექციაში ინახება.",
                )}
              </span>
              {personalItem && onRemove && <button type="button" className="td-remove" onClick={() => { if (window.confirm(w(`Remove "${item.title}" from your collection?`, `წაიშალოს „${item.title}“ კოლექციიდან?`))) { onRemove(personalItem.id); onClose(); } }}>{w("Remove from collection", "კოლექციიდან წაშლა")}</button>}
            </section>
          )}
        </div>
        <div className="td-foot">
          ✧{" "}
          {w(
            "Save it for your next movie night.",
            "შეინახე შენი შემდეგი კინოსაღამოსთვის.",
          )}
        </div>
      </div>
    </dialog>
  );
}
