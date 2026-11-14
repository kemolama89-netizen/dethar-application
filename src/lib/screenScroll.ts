// Bringing an element into view inside its screen's own scroll area (.device-screen — DeviceFrame),
// and nowhere else. Element.scrollIntoView also scrolls every scrollable ancestor, and the frame's
// backdrop (overflow: hidden, but still scrollable) is one: on a phone it moved by the system bar's
// inset and slid the screen under the status bar. Outside a frame it falls back to scrollIntoView.

export function scrollIntoScreen(el: Element | null | undefined, block: "start" | "center" = "start", smooth = false): void {
  if (!el) return;
  const screen = el.closest(".device-screen");
  if (!(screen instanceof HTMLElement)) {
    el.scrollIntoView?.({ block, ...(smooth ? { behavior: "smooth" as const } : {}) });
    return;
  }
  const box = screen.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const offset = block === "start" ? r.top - box.top : r.top - box.top - (box.height - r.height) / 2;
  const top = Math.max(0, screen.scrollTop + offset);
  if (smooth && typeof screen.scrollTo === "function") screen.scrollTo({ top, behavior: "smooth" });
  else screen.scrollTop = top;
}
