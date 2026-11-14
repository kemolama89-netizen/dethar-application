// scripts/android/recompress-apk.py (the APK's lossless level-9 repack): every entry keeps its exact
// stored name bytes. Gradle writes UTF-8 names — the Arabic adhkar recordings, the built-in adhan —
// WITHOUT the ZIP UTF-8 flag; reading them as CP437 and writing them back re-encoded once changed
// those bytes, so Android could no longer find "اللهم عافني في بدني.mp3" and Play All stopped after
// morning_007 with «تعذر التشغيل». Runs the script's own functions on a Gradle-like archive.
import { describe, expect, it } from "vitest";

const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));

const PYTHON = String.raw`
import importlib.util, json, struct, sys, zipfile
script, tmp = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("recompress", script)
r = importlib.util.module_from_spec(spec); spec.loader.exec_module(r)

names = ["assets/public/audio/adhkar/morning/morning_007.mp3", "assets/public/audio/adhkar/shared/اللهم عافني في بدني.mp3", "assets/public/index.js"]
src = tmp + "/gradle-like.apk"
with zipfile.ZipFile(src, "w") as z:
    for n in names:
        z.writestr(zipfile.ZipInfo(n), b"audio-or-code:" + n.encode(), compress_type=zipfile.ZIP_STORED if n.endswith(".mp3") else zipfile.ZIP_DEFLATED)

def clear_utf8_flag(path):
    """As Gradle writes it: UTF-8 name bytes, flag bit 11 not set (local and central headers)."""
    data = bytearray(open(path, "rb").read())
    for sig, off in ((b"PK\x03\x04", 6), (b"PK\x01\x02", 8)):
        i = data.find(sig)
        while i != -1:
            flags = struct.unpack_from("<H", data, i + off)[0]
            struct.pack_into("<H", data, i + off, flags & ~0x800)
            i = data.find(sig, i + 4)
    open(path, "wb").write(bytes(data))

def raw_names(path):
    data = open(path, "rb").read(); eocd = data.rfind(b"PK\x05\x06")
    count, size, offset = struct.unpack("<HII", data[eocd + 10:eocd + 20]); out = []; p = offset
    for _ in range(count):
        n, e, c = struct.unpack("<HHH", data[p + 28:p + 34]); out.append(data[p + 46:p + 46 + n].decode("utf-8")); p += 46 + n + e + c
    return out

clear_utf8_flag(src)
dst = tmp + "/repacked.apk"
r.repack(src, dst)
# What the old repack produced: the CP437-misread name written back re-encoded.
bad = tmp + "/double-encoded.apk"
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(bad, "w") as zout:
    for i in zin.infolist():
        zout.writestr(zipfile.ZipInfo(i.filename), zin.read(i), compress_type=i.compress_type)

print(json.dumps({
    "input_names": raw_names(src),
    "input_flagless": all(not (i.flag_bits & 0x800) for i in zipfile.ZipFile(src).infolist()),
    "output_names": raw_names(dst),
    "check_ok": r.verify_same_content(src, dst),
    "check_bad": r.verify_same_content(src, bad),
    "bad_names": raw_names(bad),
}))
`;

describe("the APK repack (scripts/android/recompress-apk.py)", () => {
  it("keeps every entry's stored name bytes — Arabic asset names included — and its check rejects any change to them", async () => {
    const { spawnSync } = await nodeModule("child_process");
    const { mkdtempSync, rmSync } = await nodeModule("fs");
    const { join } = await nodeModule("path");
    const { tmpdir } = await nodeModule("os");
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    const tmp: string = mkdtempSync(join(tmpdir(), "dithar-apk-"));
    try {
      const run = spawnSync("python3", ["-I", "-B", "-c", PYTHON, join(cwd, "scripts/android/recompress-apk.py"), tmp], { encoding: "utf8" });
      expect(run.stderr).toBe("");
      const r = JSON.parse(run.stdout);
      const arabic = "assets/public/audio/adhkar/shared/اللهم عافني في بدني.mp3";
      // The fixture is Gradle-like: real UTF-8 names, no UTF-8 flag.
      expect(r.input_flagless).toBe(true);
      expect(r.input_names).toContain(arabic);
      // Repacked: exactly the same names, byte for byte, in the same order.
      expect(r.output_names).toEqual(r.input_names);
      expect(r.check_ok).toBeNull();
      // The old behaviour (name misread and re-encoded) loses the asset, and the check now says so.
      expect(r.bad_names).not.toContain(arabic);
      expect(r.check_bad).toMatch(/differ in name/);
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});
