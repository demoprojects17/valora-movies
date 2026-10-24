"use client";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { useDragScroll } from "../lib/useDragScroll";
function ReleaseCarousel({ title, lang, children }) {
  const row = useRef(null),
    id = useId();
  const dragHandlers = useDragScroll(row);
  const [edges, setEdges] = useState({ left: false, right: false });
  const update = () => {
    const el = row.current;
    if (el)
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
  };
  useEffect(() => {
    const el = row.current;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);
  function scroll(direction) {
    const el = row.current;
    if (!el) return;
    const cards = Array.from(el.children);
    const current = cards.reduce(
      (best, card, index) =>
        Math.abs(card.offsetLeft - el.offsetLeft - el.scrollLeft) <
        Math.abs(cards[best].offsetLeft - el.offsetLeft - el.scrollLeft)
          ? index
          : best,
      0,
    );
    const visible = Math.max(
      1,
      Math.floor(
        el.clientWidth /
          (cards[0]?.getBoundingClientRect().width || el.clientWidth),
      ),
    );
    const target =
      cards[
        Math.max(0, Math.min(cards.length - 1, current + direction * visible))
      ];
    el.scrollTo({
      left: target.offsetLeft - el.offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <div className="r-carousel">
      <div
        {...dragHandlers}
        ref={row}
        id={id}
        className="r-row"
        role="region"
        aria-label={title}
        tabIndex={0}
        onScroll={update}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            row.current.scrollTo({
              left: e.key === "Home" ? 0 : row.current.scrollWidth,
              behavior: "auto",
            });
          }
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            scroll(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {children}
      </div>
      <button
        className="r-scroll-button r-scroll-left"
        aria-label={`${title} — ${lang === "ka" ? "მარცხნივ" : "Scroll left"}`}
        aria-controls={id}
        disabled={!edges.left}
        onClick={() => scroll(-1)}
      >
        <Icon name="arrow" size={18} />
      </button>
      <button
        className="r-scroll-button r-scroll-right"
        aria-label={`${title} — ${lang === "ka" ? "მარჯვნივ" : "Scroll right"}`}
        aria-controls={id}
        disabled={!edges.right}
        onClick={() => scroll(1)}
      >
        <Icon name="arrow" size={18} />
      </button>
    </div>
  );
}

export default function ReleaseRow({ scroll = false, title, lang, children }) {
  return scroll ? (
    <ReleaseCarousel title={title} lang={lang}>
      {children}
    </ReleaseCarousel>
  ) : (
    <div className="r-row" role="region" aria-label={title}>
      {children}
    </div>
  );
}
