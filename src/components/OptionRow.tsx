import { Check } from "lucide-react";

// One selectable Settings row — same visual language (gold border + check
// icon) LocationSettingsView's own city rows use. Used by
// QuranReciterSettingsView.
export function OptionRow({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-start"
      style={{
        borderColor: selected ? "var(--color-gold)" : "var(--color-gold-soft)",
        background: "var(--color-surface)",
        boxShadow: selected ? "inset 0 0 0 1px var(--color-gold)" : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </span>
      {selected && <Check size={16} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--color-gold)" }} />}
    </button>
  );
}
