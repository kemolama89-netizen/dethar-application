// Writes the Qur'an recitation download manifests, so a reciter downloaded on
// demand is only kept if every file is byte for byte the one reviewed here:
//
//  - src/data/quranAudioDownloads.json — bundled with the app: for each reciter
//    in the registry (src/data/quranReciters.ts), each file's size and SHA-256,
//    and which reciter stays built into the APK.
//  - public/audio/quran/catalog.json — hosted with the web app: reciters added
//    AFTER this app version (a folder under public/audio/quran/ that the
//    registry doesn't know, with its own reciter.json: name, style, basmala),
//    so they can be offered and downloaded without an app update.
//
//   node scripts/audio/quran-audio-manifest.mjs           writes both
//   node scripts/audio/quran-audio-manifest.mjs --hosted  checks each hosted file against the manifest
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const quranDir = join(root, "public/audio/quran");
const out = join(root, "src/data/quranAudioDownloads.json");
const catalogOut = join(quranDir, "catalog.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
// The web app's own deployment (.github/workflows/deploy.yml), which keeps every reciter — as for the Adhan.
const BASE_URL = "https://kemolama89-netizen.github.io/dethar-application/";
// Stays in the APK, so the Qur'anic adhkar always play offline: the app's default reciter.
const BUNDLED = "husary-murattal";

const filesOf = (id) => {
  const files = {};
  for (const name of readdirSync(join(quranDir, id)).filter((n) => n.endsWith(".mp3")).sort()) {
    const bytes = readFileSync(join(quranDir, id, name));
    files[name] = { bytes: bytes.length, sha256: sha(bytes) };
  }
  return files;
};

if (process.argv.includes("--hosted")) {
  const manifest = JSON.parse(readFileSync(out, "utf8"));
  let bad = 0;
  let count = 0;
  for (const [id, { files }] of Object.entries(manifest.reciters)) {
    for (const [name, want] of Object.entries(files)) {
      count++;
      const res = await fetch(`${manifest.baseUrl}audio/quran/${id}/${name}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (!res.ok || bytes.length !== want.bytes || sha(bytes) !== want.sha256) {
        bad++;
        console.log(`BAD  ${id}/${name}: HTTP ${res.status}, ${bytes.length} bytes`);
      }
    }
  }
  console.log(`${count - bad} of ${count} hosted recitation files match the manifest.`);
  process.exit(bad ? 1 : 0);
}

// The registry's ids, read from its source (the registry module imports JSON, which plain Node won't);
// src/lib/quranAudioDownloads.test.ts checks this manifest names exactly the registry's reciters.
const registry = readFileSync(join(root, "src/data/quranReciters.ts"), "utf8");
const list = registry.slice(registry.indexOf("export const QURAN_RECITERS"), registry.indexOf("];", registry.indexOf("export const QURAN_RECITERS")));
const known = new Set([...list.matchAll(/^\s{4}id: "([a-z0-9-]+)",$/gm)].map((m) => m[1]));
if (!known.has(BUNDLED)) throw new Error(`built-in reciter ${BUNDLED} is not in the registry`);
const reciters = {};
for (const id of known) reciters[id] = { files: filesOf(id) };
writeFileSync(out, JSON.stringify({ baseUrl: BASE_URL, bundled: BUNDLED, reciters }, null, 1) + "\n");

// Reciters this app version doesn't know: each folder brings its own reciter.json.
const extras = [];
for (const entry of readdirSync(quranDir, { withFileTypes: true })) {
  if (!entry.isDirectory() || known.has(entry.name)) continue;
  const meta = join(quranDir, entry.name, "reciter.json");
  if (!existsSync(meta)) throw new Error(`public/audio/quran/${entry.name} has no reciter.json (name, style, basmala)`);
  const { name, style, basmala } = JSON.parse(readFileSync(meta, "utf8"));
  extras.push({ id: entry.name, name, style, basmala, files: filesOf(entry.name) });
}
writeFileSync(catalogOut, JSON.stringify({ v: 1, reciters: extras }, null, 1) + "\n");

const total = (r) => Object.values(r.files).reduce((n, f) => n + f.bytes, 0);
const all = Object.entries(reciters);
console.log(`${all.length} reciters, ${all.reduce((n, [, r]) => n + Object.keys(r.files).length, 0)} files, ${all.reduce((n, [, r]) => n + total(r), 0)} bytes; built in: ${BUNDLED} (${total(reciters[BUNDLED])} bytes); ${extras.length} catalog reciter(s).`);
