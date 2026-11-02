// @vitest-environment node
// The web app's Adhan downloads: kept only when complete and unchanged, with
// progress and cancellation, and saved across visits.
import { describe, expect, it } from "vitest";
import { createWebAdhanDownloads } from "./adhanWebDownloads";
import type { AdhanFileStore, AdhanStoredFile } from "./adhanWebDownloads";

const bytes = new Uint8Array(1000).map((_, i) => i % 251);
const hex = async (data: Uint8Array<ArrayBuffer>) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map((b) => b.toString(16).padStart(2, "0")).join("");

function memoryStore() {
  const saved = new Map<string, Blob>();
  const versions = new Map<string, string | undefined>();
  const store: AdhanFileStore = {
    all: async () => [...saved].map(([id, blob]): AdhanStoredFile => ({ id, blob, sha256: versions.get(id) })),
    put: async ({ id, blob, sha256 }) => {
      saved.set(id, blob);
      versions.set(id, sha256);
    },
    remove: async (id) => void saved.delete(id),
  };
  return { saved, store };
}

/** Delivers [data] in chunks; waits at [hold] until released, honouring the abort signal like a real fetch. */
function fetcher(data: Uint8Array<ArrayBuffer>, options: { status?: number; chunk?: number } = {}): typeof fetch {
  return (async (_: RequestInfo | URL, init?: RequestInit) => {
    const chunk = options.chunk ?? 300;
    let at = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        if (init?.signal?.aborted) return c.error(new DOMException("aborted", "AbortError"));
        await new Promise((r) => setTimeout(r, 0));
        if (init?.signal?.aborted) return c.error(new DOMException("aborted", "AbortError"));
        if (at >= data.length) return c.close();
        c.enqueue(data.subarray(at, at + chunk));
        at += chunk;
      },
    });
    return new Response(body, { status: options.status ?? 200 });
  }) as typeof fetch;
}

const request = async (data = bytes) => ({ id: "husary", url: "audio/adhan/x.mp3", bytes: data.length, sha256: await hex(data) });

describe("web Adhan downloads", () => {
  it("saves a verified file, reports progress up to the whole file, and returns a playable URL", async () => {
    const { saved, store } = memoryStore();
    const web = createWebAdhanDownloads(store, fetcher(bytes));
    const seen: number[] = [];
    await web.addListener("progress", (e) => seen.push(e.received));
    const { path } = await web.download(await request());
    expect(path.startsWith("blob:")).toBe(true);
    expect(seen).toEqual([300, 600, 900, 1000]);
    expect(new Uint8Array(await saved.get("husary")!.arrayBuffer())).toEqual(bytes);
  });

  it("marks audio with its real type, so the browser can play it", async () => {
    const { saved, store } = memoryStore();
    const web = createWebAdhanDownloads(store, fetcher(bytes));
    await web.download({ ...(await request()), url: "a.m4a" });
    expect(saved.get("husary")!.type).toBe("audio/mp4");
  });

  it("keeps nothing when the checksum differs", async () => {
    const { saved, store } = memoryStore();
    const tampered = bytes.slice();
    tampered[5] ^= 1;
    const web = createWebAdhanDownloads(store, fetcher(tampered));
    await expect(web.download(await request())).rejects.toThrow("mismatch");
    expect(saved.size).toBe(0);
  });

  it("keeps nothing when the file is short or too long", async () => {
    const { saved, store } = memoryStore();
    const want = await request();
    await expect(createWebAdhanDownloads(store, fetcher(bytes.slice(0, 900))).download(want)).rejects.toThrow("mismatch");
    await expect(createWebAdhanDownloads(store, fetcher(new Uint8Array(1200))).download(want)).rejects.toThrow("mismatch");
    expect(saved.size).toBe(0);
  });

  it("keeps nothing on a server error", async () => {
    const { saved, store } = memoryStore();
    await expect(createWebAdhanDownloads(store, fetcher(bytes, { status: 404 })).download(await request())).rejects.toThrow("source-unavailable");
    expect(saved.size).toBe(0);
  });

  it("cancels with a 'cancelled' result and keeps nothing; it can then be downloaded again", async () => {
    const { saved, store } = memoryStore();
    const web = createWebAdhanDownloads(store, fetcher(bytes, { chunk: 10 }));
    const want = await request();
    const running = web.download(want);
    await new Promise((r) => setTimeout(r, 5));
    await web.cancel({ id: "husary" });
    await expect(running).rejects.toThrow("cancelled");
    expect(saved.size).toBe(0);
    await web.download(want);
    expect(saved.size).toBe(1);
  });

  it("finds saved files on a later visit, and forgets a removed one", async () => {
    const { store } = memoryStore();
    await createWebAdhanDownloads(store, fetcher(bytes)).download(await request());
    const later = createWebAdhanDownloads(store, fetcher(bytes));
    const { files } = await later.list();
    expect(files.map((f) => f.id)).toEqual(["husary"]);
    expect(files[0].path.startsWith("blob:")).toBe(true);
    await later.remove({ id: "husary" });
    expect((await later.list()).files).toEqual([]);
  });

  it("reports a connection that never answers, or drops partway, as offline", async () => {
    const { saved, store } = memoryStore();
    const noAnswer = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    await expect(createWebAdhanDownloads(store, noAnswer).download(await request())).rejects.toThrow("offline");
    const drops = (async () => {
      let sent = false;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(c) {
            if (sent) return c.error(new TypeError("network error"));
            sent = true;
            c.enqueue(bytes.subarray(0, 100));
          },
        }),
      );
    }) as typeof fetch;
    await expect(createWebAdhanDownloads(store, drops).download(await request())).rejects.toThrow("offline");
    expect(saved.size).toBe(0);
  });

  it("says when the browser's storage limit is reached: when saving", async () => {
    const { store } = memoryStore();
    const full: AdhanFileStore = {
      ...store,
      put: async () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    await expect(createWebAdhanDownloads(full, fetcher(bytes)).download(await request())).rejects.toThrow("no-space");
  });

  it("says when the browser's storage limit is reached: beforehand, without fetching anything", async () => {
    const { store } = memoryStore();
    const real = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { storage: { estimate: async () => ({ quota: 1500, usage: 1000 }) } } });
    try {
      let fetched = false;
      const fetchSpy = (async () => {
        fetched = true;
        return new Response(bytes);
      }) as typeof fetch;
      await expect(createWebAdhanDownloads(store, fetchSpy).download(await request())).rejects.toThrow("no-space");
      expect(fetched).toBe(false);
    } finally {
      if (real) Object.defineProperty(globalThis, "navigator", real);
    }
  });

  it("says when storage refuses for another reason", async () => {
    const { store } = memoryStore();
    const broken: AdhanFileStore = {
      ...store,
      put: async () => {
        throw new DOMException("blocked", "InvalidStateError");
      },
    };
    await expect(createWebAdhanDownloads(broken, fetcher(bytes)).download(await request())).rejects.toThrow("storage");
  });

  it("records which version a file is, and reports its real size", async () => {
    const { store } = memoryStore();
    const want = await request();
    await createWebAdhanDownloads(store, fetcher(bytes)).download(want);
    const { files } = await createWebAdhanDownloads(store, fetcher(bytes)).list();
    expect(files[0]).toMatchObject({ bytes: 1000, sha256: want.sha256 });
  });

  it("refuses a second download of the same file at once", async () => {
    const { store } = memoryStore();
    const web = createWebAdhanDownloads(store, fetcher(bytes));
    const want = await request();
    const first = web.download(want);
    await expect(web.download(want)).rejects.toThrow("already");
    await first;
  });
});
