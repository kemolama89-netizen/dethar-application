import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLanguage } from "../theme/LanguageContext";
import { useBackDismiss } from "../lib/backOverlays";
import { reminderLabels } from "../data/reminderLabels";
import { CROP_HEIGHT, CROP_WIDTH, FRAME_ASPECT, coverPlacement } from "../lib/cropPlacement";

// Positions the user's own photo for the reminder / widget background:
// drag to move it, zoom with the slider, inside a portrait frame (the
// full-screen shape; the widget shows its middle band). Saving re-encodes
// just the framed part as a 720×1280 JPEG — small enough for storage and
// for the widget, and never the original full-size photo.

export function BackgroundCropper({ file, onCancel, onSave }: { file: File; onCancel: () => void; onSave: (jpegDataUrl: string) => void }) {
  const { language } = useLanguage();
  const t = reminderLabels[language];
  const [loaded, setLoaded] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const image = loaded?.image ?? null;
  const url = loaded?.url ?? null;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useBackDismiss(true, onCancel);

  // The photo is read through a short-lived object URL (never copied whole into storage).
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setLoaded({ image: img, url: objectUrl });
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const [frameSize, setFrameSize] = useState({ w: 240, h: 240 / FRAME_ASPECT });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setFrameSize({ w: r.width, h: r.width / FRAME_ASPECT });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const frameW = frameSize.w;
  const frameH = frameSize.h;
  const placement = image ? coverPlacement(image.naturalWidth, image.naturalHeight, frameW, frameH, zoom, pan.x, pan.y) : null;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, panX: placement?.x ?? pan.x, panY: placement?.y ?? pan.y };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setPan({ x: drag.current.panX + (e.clientX - drag.current.x), y: drag.current.panY + (e.clientY - drag.current.y) });
  }

  function save() {
    if (!image || !placement) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_WIDTH;
    canvas.height = CROP_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const k = CROP_WIDTH / frameW;
    ctx.drawImage(image, placement.left * k, placement.top * k, placement.w * k, placement.h * k);
    onSave(canvas.toDataURL("image/jpeg", 0.82));
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col items-center justify-center gap-4 px-6" style={{ background: "rgba(0,0,0,0.85)" }} role="dialog" aria-modal="true" aria-label={t.cropTitle}>
      <p className="text-[15px] font-semibold text-white">{t.cropTitle}</p>
      <div
        ref={frameRef}
        className="relative w-[min(62vw,280px)] touch-none overflow-hidden rounded-2xl"
        style={{ aspectRatio: `${CROP_WIDTH} / ${CROP_HEIGHT}`, background: "#111", boxShadow: "0 0 0 2px rgba(230,213,167,0.8)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        data-crop-frame=""
      >
        {url && placement && (
          <img src={url} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: placement.left, top: placement.top, width: placement.w, height: placement.h }} />
        )}
        {/* The band a wide home-screen widget shows. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[28%] -translate-y-1/2 border-y border-dashed" style={{ borderColor: "rgba(255,255,255,0.45)" }} aria-hidden="true" />
      </div>
      <p className="max-w-[18rem] text-center text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
        {t.cropHint}
      </p>
      <label className="flex w-[min(62vw,280px)] items-center gap-3 text-[12px] text-white">
        {t.zoom}
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
      </label>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border px-5 py-2 text-[13px] text-white" style={{ borderColor: "rgba(255,255,255,0.5)" }}>
          {t.cancel}
        </button>
        <button type="button" onClick={save} disabled={!image} className="rounded-full px-5 py-2 text-[13px] font-semibold" style={{ background: "#E6D5A7", color: "#1c2c55", opacity: image ? 1 : 0.5 }}>
          {t.save}
        </button>
      </div>
    </div>
  );
}
