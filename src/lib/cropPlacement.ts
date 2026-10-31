// Geometry for BackgroundCropper: the user's photo always COVERS the
// portrait frame (the full-screen reminder's shape; a wide widget shows its
// middle band), panned and zoomed by the user, then re-encoded at this size.
export const CROP_WIDTH = 720;
export const CROP_HEIGHT = 1280;
export const FRAME_ASPECT = CROP_WIDTH / CROP_HEIGHT;

/** Where the image sits in a frame of size frameW×frameH, for a pan (px) and zoom (≥1, relative to "cover"). */
export function coverPlacement(imgW: number, imgH: number, frameW: number, frameH: number, zoom: number, panX: number, panY: number) {
  const scale = Math.max(frameW / imgW, frameH / imgH) * zoom;
  const w = imgW * scale;
  const h = imgH * scale;
  // The image always covers the frame: the pan is clamped to its overflow.
  const maxX = (w - frameW) / 2;
  const maxY = (h - frameH) / 2;
  const x = Math.max(-maxX, Math.min(maxX, panX));
  const y = Math.max(-maxY, Math.min(maxY, panY));
  return { scale, w, h, x, y, left: (frameW - w) / 2 + x, top: (frameH - h) / 2 + y };
}
