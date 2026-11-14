// Adhan downloads in a browser: the same operations as Android's plugin
// (AdhanDownloadsPlugin.kt), saving each file in this browser's IndexedDB. A
// file is kept only if its size and SHA-256 match, and a saved file plays from
// a blob: URL, so it needs no network once the page is open.
//
// Failures reach the screen as a reason: "offline", "source-unavailable" (the
// server hasn't got the file), "no-space" (the browser's limit or a full disk),
// "mismatch" (not the expected file) or "storage" (this browser won't store it).
export interface AdhanStoredFile {
  id: string;
  blob: Blob;
  /** Which version it is, so a later app version can tell. Absent on the earliest saves. */
  sha256?: string;
}

export interface AdhanFileStore {
  all(): Promise<AdhanStoredFile[]>;
  put(file: AdhanStoredFile): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORE = "files";

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no storage"));
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("no storage"));
  });
}

async function run<T>(name: string, mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb(name);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = act(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error("storage failed"));
      tx.onabort = () => reject(tx.error ?? new Error("storage failed"));
    });
  } finally {
    db.close();
  }
}

/** A browser file store in its own IndexedDB database — the Adhan's, or the Qur'an reciters' (lib/quranAudioDownloads.ts). */
export function indexedDbFiles(name: string): AdhanFileStore {
  return {
    all: () => run(name, "readonly", (s) => s.getAll() as IDBRequest<AdhanStoredFile[]>),
    put: async (file) => void (await run(name, "readwrite", (s) => s.put(file))),
    remove: async (id) => void (await run(name, "readwrite", (s) => s.delete(id))),
  };
}

export const indexedDbAdhanFiles: AdhanFileStore = indexedDbFiles("dithar-adhan-downloads");

type Progress = (e: { id: string; received: number; total: number }) => void;

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("storage"); // checksums need an https page
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isQuotaError = (e: unknown) => e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");

export function createWebAdhanDownloads(store: AdhanFileStore = indexedDbAdhanFiles, fetcher: typeof fetch = (...args) => fetch(...args)) {
  const listeners = new Set<Progress>();
  const running = new Map<string, AbortController>();
  const urls = new Map<string, string>();

  const urlFor = (id: string, blob: Blob): string => {
    const existing = urls.get(id);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    urls.set(id, url);
    return url;
  };

  return {
    async list() {
      const files = await store.all();
      // Forget the URL of a file that has gone (site data cleared in the meantime).
      for (const [id, url] of urls) {
        if (!files.some((f) => f.id === id)) {
          URL.revokeObjectURL(url);
          urls.delete(id);
        }
      }
      return { files: files.map(({ id, blob, sha256 }) => ({ id, path: urlFor(id, blob), bytes: blob.size, sha256 })) };
    },

    async persisted() {
      return (await navigator.storage?.persisted?.()) ?? false;
    },

    async download({ id, url, bytes, sha256 }: { id: string; url: string; bytes: number; sha256: string }) {
      if (running.has(id)) throw new Error("already downloading");
      const controller = new AbortController();
      running.set(id, controller);
      try {
        // Better to say so now than after the whole file has come down.
        const estimate = await navigator.storage?.estimate?.().catch(() => null);
        if (estimate?.quota !== undefined && estimate.usage !== undefined && estimate.quota - estimate.usage < bytes) throw new Error("no-space");
        let response: Response;
        try {
          response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
        } catch (e) {
          throw controller.signal.aborted ? e : new Error("offline");
        }
        if (!response.ok || !response.body) throw new Error("source-unavailable");
        const reader = response.body.getReader();
        const data = new Uint8Array(bytes);
        let received = 0;
        for (;;) {
          let chunk: ReadableStreamReadResult<Uint8Array>;
          try {
            chunk = await reader.read();
          } catch (e) {
            throw controller.signal.aborted ? e : new Error("offline");
          }
          const { done, value } = chunk;
          if (done) break;
          if (received + value.length > bytes) throw new Error("mismatch");
          data.set(value, received);
          received += value.length;
          for (const listener of listeners) listener({ id, received, total: bytes });
        }
        if (received !== bytes || (await sha256Hex(data)) !== sha256) throw new Error("mismatch");
        // Downloads are meant to stay: asks the browser not to clear them under storage pressure, if it agrees.
        void navigator.storage?.persist?.().catch(() => {});
        const blob = new Blob([data], { type: url.toLowerCase().endsWith(".m4a") ? "audio/mp4" : "audio/mpeg" });
        try {
          await store.put({ id, blob, sha256 });
        } catch (e) {
          throw new Error(isQuotaError(e) ? "no-space" : "storage");
        }
        return { path: urlFor(id, blob) };
      } catch (e) {
        throw controller.signal.aborted ? new Error("cancelled") : e;
      } finally {
        running.delete(id);
      }
    },

    async cancel({ id }: { id: string }) {
      running.get(id)?.abort();
    },

    async remove({ id }: { id: string }) {
      await store.remove(id);
      const url = urls.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.delete(id);
    },

    async addListener(_event: "progress", listener: Progress) {
      listeners.add(listener);
      return { remove: async () => void listeners.delete(listener) };
    },
  };
}
