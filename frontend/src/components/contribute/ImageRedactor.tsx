"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  file: File;
  onRedacted: (blob: Blob | null) => void;
  onRemove: () => void;
}

/**
 * Loads an image, lets the user draw redaction boxes over it, and bakes a
 * DESTRUCTIVE pixelation into those regions before export. Pixelation (mosaic)
 * is used rather than a CSS/gaussian blur because a gaussian blur is partially
 * reversible — a mosaic at a coarse block size is not. The original pixels
 * never leave the browser: the parent only ever receives the redacted Blob.
 */
export function ImageRedactor({ file, onRedacted, onRemove }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drawing, setDrawing] = useState<Box | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  // Load the image once.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const maxW = 560;
      const s = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setScale(s);
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Pixelate one region in-place on the given context, at natural resolution.
  const pixelateRegion = (ctx: CanvasRenderingContext2D, b: Box) => {
    const block = Math.max(8, Math.floor(Math.min(b.w, b.h) / 6));
    const sx = Math.max(0, Math.floor(b.x));
    const sy = Math.max(0, Math.floor(b.y));
    const sw = Math.floor(b.w);
    const sh = Math.floor(b.h);
    if (sw <= 0 || sh <= 0) return;
    const cols = Math.max(1, Math.floor(sw / block));
    const rows = Math.max(1, Math.floor(sh / block));
    // Draw the region tiny, then back up with smoothing off → mosaic.
    const tmp = document.createElement("canvas");
    tmp.width = cols;
    tmp.height = rows;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, cols, rows);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, cols, rows, sx, sy, sw, sh);
    ctx.imageSmoothingEnabled = true;
  };

  // Redraw the display canvas: image + live pixelation under each committed box
  // + the in-progress drawing outline.
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = naturalSize.w;
    canvas.height = naturalSize.h;
    ctx.drawImage(img, 0, 0);
    for (const b of boxes) pixelateRegion(ctx, b);
    if (drawing) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.strokeRect(drawing.x, drawing.y, drawing.w, drawing.h);
      ctx.setLineDash([]);
    }
  }, [boxes, drawing, naturalSize, scale]);

  useEffect(() => {
    if (ready) render();
  }, [ready, render]);

  // Export the redacted image (boxes baked in, no outlines) as a Blob. Large
  // images are downscaled to <=1600px wide so the base64 payload stays well
  // under the serverless request-body limit; box coords are scaled to match.
  const exportRedacted = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const MAX_W = 1600;
    const f = naturalSize.w > MAX_W ? MAX_W / naturalSize.w : 1;
    const out = document.createElement("canvas");
    out.width = Math.round(naturalSize.w * f);
    out.height = Math.round(naturalSize.h * f);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, out.width, out.height);
    for (const b of boxes) {
      pixelateRegion(ctx, { x: b.x * f, y: b.y * f, w: b.w * f, h: b.h * f });
    }
    out.toBlob((blob) => onRedacted(blob), "image/png");
  }, [boxes, naturalSize, onRedacted]);

  // Whenever the box set changes, hand the parent a freshly redacted blob.
  useEffect(() => {
    if (ready) exportRedacted();
  }, [boxes, ready, exportRedacted]);

  const toImageCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * naturalSize.w,
      y: ((e.clientY - rect.top) / rect.height) * naturalSize.h,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = toImageCoords(e);
    setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = toImageCoords(e);
    setDrawing({ ...drawing, w: p.x - drawing.x, h: p.y - drawing.y });
  };

  const onPointerUp = () => {
    if (!drawing) return;
    // Normalise negative-direction drags into a positive-size box.
    const b: Box = {
      x: Math.min(drawing.x, drawing.x + drawing.w),
      y: Math.min(drawing.y, drawing.y + drawing.h),
      w: Math.abs(drawing.w),
      h: Math.abs(drawing.h),
    };
    if (b.w > 6 && b.h > 6) setBoxes((prev) => [...prev, b]);
    setDrawing(null);
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{file.name}</span>
        <button
          type="button"
          onClick={onRemove}
          style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
        >
          Remove
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px" }}>
        Drag over anything sensitive — keys, account IDs, emails — to permanently pixelate it.
        Redaction happens here in your browser; only the redacted image is uploaded.
      </p>

      {ready ? (
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            width: naturalSize.w * scale,
            maxWidth: "100%",
            height: "auto",
            borderRadius: 6,
            cursor: "crosshair",
            touchAction: "none",
            display: "block",
          }}
        />
      ) : (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading image…</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setBoxes((b) => b.slice(0, -1))}
          disabled={boxes.length === 0}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: boxes.length ? "#0f172a" : "#cbd5e1",
            cursor: boxes.length ? "pointer" : "not-allowed",
          }}
        >
          Undo box
        </button>
        <button
          type="button"
          onClick={() => setBoxes([])}
          disabled={boxes.length === 0}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: boxes.length ? "#0f172a" : "#cbd5e1",
            cursor: boxes.length ? "pointer" : "not-allowed",
          }}
        >
          Clear all
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {boxes.length} region{boxes.length === 1 ? "" : "s"} redacted
        </span>
      </div>
    </div>
  );
}
