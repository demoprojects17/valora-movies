"use client";
import { useEffect, useRef, useState } from "react";
import { getAvatarCrop, getCoverCrop } from "../lib/avatar";
const SIZE = 280;
export default function AvatarCropper({ file, lang, onSave, onClose, coverAspect = null }) {
  const w = (en, ka) => (lang === "ka" ? ka : en);
  const stage = useRef(null);
  const [stageWidth, setStageWidth] = useState(560);
  const viewportWidth = coverAspect ? stageWidth : SIZE;
  const viewportHeight = coverAspect ? stageWidth / coverAspect : SIZE;
  const dialog = useRef(null),
    pointer = useRef(null);
  const [url, setUrl] = useState(""),
    [dimensions, setDimensions] = useState(null),
    [zoom, setZoom] = useState(1),
    [offset, setOffset] = useState({ x: 0, y: 0 }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const source = URL.createObjectURL(file);
    setUrl(source);
    dialog.current.showModal();
    return () => URL.revokeObjectURL(source);
  }, [file]);
  useEffect(() => {
    if (!coverAspect || !stage.current) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [coverAspect]);
  const scale = dimensions
    ? Math.max(viewportWidth / dimensions.width, viewportHeight / dimensions.height) * zoom
    : 1;
  function move(x, y, nextZoom = zoom) {
    if (!dimensions) return;
    const nextScale =
      Math.max(viewportWidth / dimensions.width, viewportHeight / dimensions.height) * nextZoom;
    const limitX = (dimensions.width * nextScale - viewportWidth) / 2,
      limitY = (dimensions.height * nextScale - viewportHeight) / 2;
    setOffset({
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    });
  }
  return (
    <dialog
      ref={dialog}
      className={`avatar-crop-dialog ${coverAspect ? "cover-crop-dialog" : ""}`}
      aria-labelledby="avatarCropTitle"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <h2 id="avatarCropTitle">{coverAspect ? w("Position your cover photo", "ბანერის ფოტოს მორგება") : w("Crop your photo", "ფოტოს მოჭრა")}</h2>
      <p>
        {w(
          "Drag the photo and adjust the zoom.",
          "გადაადგილე ფოტო და შეცვალე მასშტაბი.",
        )}
      </p>
      <div
        ref={stage}
        className="avatar-crop-stage"
        style={coverAspect ? { width: "100%", height: "auto", aspectRatio: String(coverAspect) } : undefined}
        tabIndex={0}
        aria-label={w(
          "Move photo with arrow keys or drag",
          "გადაადგილე ფოტო ისრებით ან გადათრევით",
        )}
        onPointerDown={(e) => {
          if (busy) return;
          pointer.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!pointer.current || busy) return;
          const dx = e.clientX - pointer.current.x,
            dy = e.clientY - pointer.current.y;
          pointer.current = { x: e.clientX, y: e.clientY };
          move(offset.x + dx, offset.y + dy);
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerCancel={() => (pointer.current = null)}
        onKeyDown={(e) => {
          const delta = {
            ArrowLeft: [-10, 0],
            ArrowRight: [10, 0],
            ArrowUp: [0, -10],
            ArrowDown: [0, 10],
          }[e.key];
          if (delta && !busy) {
            e.preventDefault();
            move(offset.x + delta[0], offset.y + delta[1]);
          }
        }}
      >
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setDimensions({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
            onError={() =>
              setError(
                w(
                  "Could not open this photo. Choose another image.",
                  "ფოტო ვერ გაიხსნა. აირჩიე სხვა სურათი.",
                ),
              )
            }
            style={
              dimensions
                ? {
                    width: dimensions.width * scale,
                    height: dimensions.height * scale,
                    left: `calc(50% + ${offset.x}px)`,
                    top: `calc(50% + ${offset.y}px)`,
                  }
                : { visibility: "hidden" }
            }
          />
        )}
        <div className="avatar-crop-guide" />
      </div>
      <label className="avatar-crop-zoom">
        {w("Zoom", "მასშტაბი")}
        <input
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={zoom}
          disabled={!dimensions || busy}
          onChange={(e) => {
            const next = Number(e.target.value);
            setZoom(next);
            move(offset.x, offset.y, next);
          }}
        />
      </label>
      <p role="alert" className="avatar-error">
        {error}
      </p>
      <div className="f2" style={{ justifyContent: "flex-end" }}>
        <button type="button" disabled={busy} onClick={onClose}>
          {w("Cancel", "გაუქმება")}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!dimensions || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const crop = coverAspect ? getCoverCrop(dimensions.width, dimensions.height, zoom, offset.x, offset.y, viewportWidth, viewportHeight) : getAvatarCrop(
                dimensions.width,
                dimensions.height,
                zoom,
                offset.x,
                offset.y,
                SIZE,
              );
              if (await onSave(file, crop)) onClose();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? w("Uploading…", "იტვირთება…")
            : w("Crop and save", "მოჭრა და შენახვა")}
        </button>
      </div>
    </dialog>
  );
}
