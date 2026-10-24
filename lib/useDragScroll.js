"use client";
import { useRef } from "react";

// Touch keeps the browser's native scrolling and momentum.
export function useDragScroll(ref) {
  const drag = useRef(null);
  function finish(event) {
    const el = ref.current;
    if (!el || !drag.current) return;
    drag.current.active = false;
    delete el.dataset.dragging;
    if (el.hasPointerCapture(event.pointerId))
      el.releasePointerCapture(event.pointerId);
  }
  return {
    onPointerDown(event) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag.current = {
        active: true,
        moved: false,
        x: event.clientX,
        left: ref.current.scrollLeft,
      };
    },
    onPointerMove(event) {
      const state = drag.current,
        el = ref.current;
      if (!state?.active || !el) return;
      const delta = event.clientX - state.x;
      if (!state.moved && Math.abs(delta) < 8) return;
      state.moved = true;
      el.dataset.dragging = "true";
      if (!el.hasPointerCapture(event.pointerId))
        el.setPointerCapture(event.pointerId);
      event.preventDefault();
      el.scrollLeft = state.left - delta;
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onClickCapture(event) {
      if (drag.current?.moved) {
        event.preventDefault();
        event.stopPropagation();
        drag.current.moved = false;
      }
    },
    onDragStart(event) {
      event.preventDefault();
    },
  };
}
