# Logo assets — provenance

None of the files in this folder are imported by the app (the runtime
copies live in `public/logos/`, see below, so `index.html` can use a
stable `<link rel="preload">` URL). These are kept as an audit trail of
how the runtime assets were derived from the originals.

Pipeline, in order:

1. `ASSETS/dithar-logo-men.png` / `ASSETS/dithar-logo-women.png` — the
   **authoritative source files**, supplied and approved. Never read by
   the app, never modified. (`dithar-logo-men.png` / `dithar-logo-women.png`
   in this folder are untouched byte-identical copies, kept only for local
   reference.)
2. `dithar-logo-women-derived.png` — the women's logo has no alpha channel
   in the source (an opaque near-white canvas baked into the pixels), which
   showed as a visible rectangle against the app's ivory background. This
   file adds transparency by keying out only the pixels statistically
   indistinguishable from that flat background color; every artwork
   pixel's RGB is copied through unchanged — no redrawing, recoloring, or
   reconstruction. (The men's source already had proper alpha, so it
   didn't need this step.)
3. `dithar-logo-men-optimized.png` / `dithar-logo-women-optimized.png` —
   downscaled from the source's 1254×1254px to 480×480px via box-filter
   averaging (pure area-average downsampling, not a quality-lossy resize).
   The source files were ~920KB–1.3MB despite only ever being displayed at
   ~100–250px on screen; at 480×480 they're still sharp at any on-screen
   size the app uses (2–4× oversampled even at 3x device pixel ratio) but
   are 5–11× smaller, which was the main lever against the logo's visible
   load delay in the Codespaces preview.

Runtime copies actually served to the app:

- `public/logos/dithar-logo-men.png` — copy of `dithar-logo-men-optimized.png`
- `public/logos/dithar-logo-women.png` — copy of `dithar-logo-women-optimized.png`
