#!/usr/bin/env python3
"""Repack a built DITHAR APK with maximum (level 9) deflate compression — losslessly.

Android Gradle packs the APK's compressed entries at zlib level 1 (its fastest). The
Mushaf pages alone are ~134 MB that way and ~95 MB at level 9. This step changes only
how hard each already-compressed entry is compressed: every file inside the APK stays
byte-for-byte the same (verified below), every entry keeps its name, order and method
(stored entries such as resources.arsc stay stored), and the app decompresses level 9
exactly as it does level 1. Nothing in the project changes; the input APK is not modified.

Steps: repack (level 9) -> zipalign (4-byte, 16 KB pages for any .so) -> apksigner sign
-> verify (apksigner verify, zipalign -c, and every entry's bytes against the input).
A failed check deletes the output and exits non-zero.

Run after Gradle has built the APK (Android Studio, or ./gradlew assembleDebug/assembleRelease):
  npm run apk:recompress -- android/app/build/outputs/apk/debug/app-debug.apk apk/dithar-debug.apk
Signs with the debug key (~/.android/debug.keystore) unless a keystore is given; a release
APK must be signed with the release key:
  npm run apk:recompress -- app-release-unsigned.apk dithar-release.apk \
      --keystore release.jks --ks-alias dithar --ks-pass env:DITHAR_KS_PASS [--key-pass env:DITHAR_KEY_PASS]
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile
import zipfile

# v1 (JAR) signature files: apksigner writes its own; old ones would no longer match.
V1_SIGNATURE = re.compile(r"^META-INF/([^/]+\.(SF|RSA|DSA|EC)|MANIFEST\.MF)$", re.IGNORECASE)


def build_tools(explicit):
    if explicit:
        return explicit
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    props = os.path.join(os.path.dirname(__file__), "../../android/local.properties")
    if not sdk and os.path.exists(props):
        for line in open(props, encoding="utf-8"):
            if line.startswith("sdk.dir="):
                sdk = line.split("=", 1)[1].strip()
    if not sdk:
        sys.exit("recompress-apk: Android SDK not found (set ANDROID_HOME or android/local.properties sdk.dir)")
    versions = sorted(os.listdir(os.path.join(sdk, "build-tools")), key=lambda v: [int(x) if x.isdigit() else 0 for x in re.split(r"[.-]", v)])
    if not versions:
        sys.exit("recompress-apk: no Android build-tools installed")
    return os.path.join(sdk, "build-tools", versions[-1])


def repack(src, dst):
    """Every entry, in order, same name/time/attributes/method; deflated ones at level 9."""
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            if V1_SIGNATURE.match(info.filename):
                continue
            data = zin.read(info)
            out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            out.compress_type = info.compress_type
            out.external_attr = info.external_attr
            out.create_system = info.create_system
            out.comment = info.comment
            # Alignment padding (extra field) is dropped: zipalign writes its own.
            if info.compress_type == zipfile.ZIP_DEFLATED:
                zout.writestr(out, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
            elif info.compress_type == zipfile.ZIP_STORED:
                zout.writestr(out, data, compress_type=zipfile.ZIP_STORED)
            else:
                raise SystemExit(f"recompress-apk: unexpected compression method {info.compress_type} for {info.filename}")


def verify_same_content(src, dst):
    """The output holds exactly the input's files: same names, order, methods, CRCs and bytes."""
    with zipfile.ZipFile(src) as a, zipfile.ZipFile(dst) as b:
        ia = [i for i in a.infolist() if not V1_SIGNATURE.match(i.filename)]
        ib = [i for i in b.infolist() if not V1_SIGNATURE.match(i.filename)]
        if [i.filename for i in ia] != [i.filename for i in ib]:
            return "the entries differ in name or order"
        # Signature files only as the input had them (no files added beyond its own).
        if any(V1_SIGNATURE.match(n) for n in b.namelist()) != any(V1_SIGNATURE.match(n) for n in a.namelist()):
            return "the v1 signature files differ from the input's"
        for x, y in zip(ia, ib):
            if x.compress_type != y.compress_type:
                return f"{x.filename}: compression method changed"
            if x.CRC != y.CRC or x.file_size != y.file_size:
                return f"{x.filename}: content changed"
            if a.read(x) != b.read(y):
                return f"{x.filename}: bytes differ"
        return None


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{os.path.basename(cmd[0])} failed:\n{result.stdout}{result.stderr}")
    return result.stdout


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--keystore", default=os.path.expanduser("~/.android/debug.keystore"))
    p.add_argument("--ks-alias", default="androiddebugkey")
    p.add_argument("--ks-pass", default="pass:android", help="apksigner password spec, e.g. env:VAR (default: the debug key's)")
    p.add_argument("--key-pass", default=None)
    p.add_argument("--build-tools", default=None)
    args = p.parse_args()

    src, dst = os.path.abspath(args.input), os.path.abspath(args.output)
    if src == dst:
        sys.exit("recompress-apk: the output must be a different file (the input is never modified)")
    if not os.path.exists(src):
        sys.exit(f"recompress-apk: {src} not found")
    tools = build_tools(args.build_tools)
    zipalign, apksigner = os.path.join(tools, "zipalign"), os.path.join(tools, "apksigner")
    debug_key = args.keystore == os.path.expanduser("~/.android/debug.keystore")

    # Sign with the schemes Gradle used: v1 (JAR) only if the input had it (minSdk 24+ needs v2 only).
    with zipfile.ZipFile(src) as zin:
        had_v1 = any(V1_SIGNATURE.match(n) and n.upper().endswith(".SF") for n in zin.namelist())

    with tempfile.TemporaryDirectory() as tmp:
        packed, aligned = os.path.join(tmp, "packed.apk"), os.path.join(tmp, "aligned.apk")
        try:
            repack(src, packed)
            run([zipalign, "-f", "-P", "16", "4", packed, aligned])
            sign = [apksigner, "sign", "--ks", args.keystore, "--ks-key-alias", args.ks_alias, "--ks-pass", args.ks_pass, "--v1-signing-enabled", "true" if had_v1 else "false"]
            if args.key_pass:
                sign += ["--key-pass", args.key_pass]
            run(sign + ["--out", dst, aligned])
            problem = verify_same_content(src, dst)
            if problem:
                raise RuntimeError(f"content check failed: {problem}")
            run([zipalign, "-c", "-P", "16", "4", dst])
            schemes = run([apksigner, "verify", "--verbose", dst])
        except Exception as e:  # noqa: BLE001 — any failure: no output left behind
            if os.path.exists(dst):
                os.remove(dst)
            sys.exit(f"recompress-apk: {e}\nNo APK written.")
    for leftover in (dst + ".idsig",):
        if os.path.exists(leftover):
            os.remove(leftover)
    before, after = os.path.getsize(src), os.path.getsize(dst)
    used = ", ".join(re.findall(r"Verified using (v\d(?:\.\d)?) scheme[^:]*: true", schemes)) or "?"
    print(f"recompress-apk: {before} -> {after} bytes ({before / 1e6:.1f} -> {after / 1e6:.1f} MB, -{(before - after) / 1e6:.1f} MB, -{(before - after) * 100 / before:.1f}%)")
    print(f"recompress-apk: every entry byte-identical to the input; aligned; signed ({used}) with {'the DEBUG key' if debug_key else args.keystore}.")


if __name__ == "__main__":
    main()
