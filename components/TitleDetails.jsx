"use client";
import { useEffect, useRef, useState } from "react";
import { fetchTitleDetails } from "../lib/media";

export default function TitleDetails({ item, lang, onClose, actions }) {
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
      <div
        className="td-art"
        style={{
          backgroundImage: `url("${item.poster || data?.poster || data?.backdrop || ""}")`,
        }}
      />
      <button
        className="td-close"
        aria-label={w("Close", "დახურვა")}
        onClick={onClose}
      >
        ×
      </button>
      <div className="td-content">
        {(item.poster || info.poster) && (
          <img className="td-poster" src={item.poster || info.poster} alt="" />
        )}
        <div className="td-copy">
          <span className="td-kicker">
            {w("A closer look", "გაიცანი ისტორია")}
          </span>
          <h2>{item.title}</h2>
          <div className="td-meta">
            {[
              info.year || item.year,
              info.runtime ? `${info.runtime} ${w("min", "წთ")}` : "",
              info.seasons ? `${info.seasons} ${w("seasons", "სეზონი")}` : "",
              info.episodes
                ? `${info.episodes} ${w("episodes", "ეპიზოდი")}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <div className="td-rating">
            <span aria-hidden="true">★</span>
            <strong>{rating ? Number(rating).toFixed(1) : "—"}</strong>
            <span>
              / 10{" "}
              <small>
                TMDB
                {data?.votes
                  ? ` · ${data.votes.toLocaleString()} ${w("votes", "შეფასება")}`
                  : ""}
              </small>
            </span>
          </div>
          {actions && <div className="td-actions">{actions}</div>}
          <div className="td-genres">
            {(data?.genres || (item.genre ? [item.genre] : [])).map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
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
        </div>
      </div>
    </dialog>
  );
}
