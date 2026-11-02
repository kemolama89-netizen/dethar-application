// Writes src/data/adhanDownloads.json: for each Adhan recording, the size and
// SHA-256 of the file the APK downloads on demand, so a download is only kept
// if it is byte for byte the file reviewed here.
//   node scripts/audio/adhan-manifest.mjs           writes the manifest
//   node scripts/audio/adhan-manifest.mjs --hosted  checks each hosted file against it
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adhanRecordings } from "../../src/data/adhanRecordings.ts";

const root = new URL("../../", import.meta.url).pathname;
const out = join(root, "src/data/adhanDownloads.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (process.argv.includes("--hosted")) {
  const manifest = JSON.parse(readFileSync(out, "utf8"));
  let bad = 0;
  for (const r of adhanRecordings) {
    const url = manifest.baseUrl + encodeURI(r.path);
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const want = manifest.files[r.id];
    const ok = res.ok && bytes.length === want.bytes && sha(bytes) === want.sha256;
    if (!ok) {
      bad++;
      console.log(`BAD  ${r.id}: HTTP ${res.status}, ${bytes.length} bytes`);
    }
  }
  console.log(`${adhanRecordings.length - bad} of ${adhanRecordings.length} hosted recordings match the manifest.`);
  process.exit(bad ? 1 : 0);
}

const files = {};
for (const r of adhanRecordings) {
  const bytes = readFileSync(join(root, "public", r.path));
  files[r.id] = { bytes: bytes.length, sha256: sha(bytes) };
}
const manifest = {
  // The web app's own deployment (.github/workflows/deploy.yml), which keeps every recording.
  baseUrl: "https://kemolama89-netizen.github.io/dethar-application/",
  // Stay in the APK, so an adhan can always play: one for each section, the app's default voices.
  bundled: { regular: "alafasy-kuwait", fajr: "alafasy-fajr-hijaz" },
  files,
};
writeFileSync(out, JSON.stringify(manifest, null, 1) + "\n");
console.log(`${Object.keys(files).length} recordings, ${(Object.values(files).reduce((n, f) => n + f.bytes, 0) / 1e6).toFixed(1)} MB`);
