# DITHAR identity

The code wins if this file and the code disagree. Check `src/index.css` and `src/theme/looks.ts`.

## Meaning and audience
DITHAR (دِثار) means the garment worn closest to the body. The product should feel close, calm and dignified. It is a daily-remembrance companion for Arabic-speaking Muslims first, with the Gulf as the reference market. English is fully supported but secondary. Android is the main product.

## Fixed choices
These are decisions, not defaults. Do not propose replacing them unless the user asks for an identity change.
- **One identity.** There is no men's and women's switch any more, and the approved logo artwork is not to be redrawn.
- **Colour:** navy `#12213f`, gold `#c6a15b`, ivory `#f2e9da`, surface `#f8f1e4`.
- **Type:** Amiri for display, Tajawal for body. Qur'an and Mushaf fonts are in `src/assets/fonts/`.
- **Four looks:** Classic, Night, Nature, Sunset. A look sets colours, the Home wallpaper and the prayer-times arch scene. Classic is the identity's own ivory appearance.
- **Mushaf:** opts out of looks through `LOOK_OFF_ATTRIBUTE`.
- **Layout direction:** Arabic is the default and reads right to left. Design it first.

Visual references are in `public/reference/`.

## Sacred text comes first
- Qur'an and Hadith text is the most important thing on any screen that shows it. Nothing competes with it, overlaps it or reduces its legibility.
- Do not animate, crop, truncate or restyle sacred text for effect. Line breaks and diacritics must survive every width.
- Wording is not a design material. Use real shipped content in mockups, and never invent religious text, even as a placeholder that might ship.
- Decoration earns its place through meaning, and stays out of the way of reading.

## Protected
Adhkar, duas and Tasbeeh content, visibility and behaviour must not change as a side effect of design work. Restyling their screens needs an explicit request and leaves their counts, order and text intact.
