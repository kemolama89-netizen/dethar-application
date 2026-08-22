// Native-share helper. Previously wired to visible "شارك اللطيفة" /
// "شارك الحديث" buttons on the Home cards, removed from that UI to save
// vertical space (see InsightCard.tsx). Kept here, exported, so the
// sharing behavior is preserved and ready to be reattached to a future
// control (e.g. a card detail view, a menu) without reimplementing it.
export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "unavailable"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // user cancelled the native share sheet — nothing to do
  }
  return "unavailable";
}
