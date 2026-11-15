/**
 * Guest device wallet — secure local storage for tickets bought WITHOUT
 * logging in (BACKEND_GAPS #14 guest checkout). An unauthenticated buyer's
 * issued tickets (from the guest payment-refresh `ready` response) are stored
 * in this device so they can re-open the QR on the same browser without an
 * account or SMS link.
 *
 * Security model (documented; QR credentials are bearer entry tokens like a
 * paper ticket):
 *  - Payloads live in IndexedDB (not localStorage), so they are not readable
 *    by every script/extension and do not ride along in localStorage backups.
 *  - Each record is encrypted with AES-GCM (Web Crypto) under a per-device
 *    256-bit key stored in a separate IndexedDB store. IVs are random per
 *    record.
 *  - Honest limit: full same-origin devtools access can read the key and
 *    decrypt. This defends against casual scraping / sync / plaintext
 *    exposure, not against a determined attacker with the browser open. The
 *    durable, cross-device path is the OTP claim flow (#31 tracks the backend
 *    surface that unblocks it).
 *  - Records expire at the event's last access end + 30 days (mirrors the
 *    backend guest ticket-view token retention) and are dropped on load.
 *
 * Fallback: in a non-secure context (no crypto.subtle) records are stored
 * unencrypted (`enc: false`) rather than losing the ticket; the section can
 * surface a warning from `guestWallet.isEncrypted()`.
 */

import type { TicketWalletWire } from "@/lib/tickets";

/* ─── IndexedDB helpers (dependency-free, promisified) ─── */

const DB_NAME = "digis";
// v2: re-runs the upgrade handler on DBs created at v1, so the store guards
// below repair a partially-created DB instead of failing every transaction.
const DB_VERSION = 2;
const RECORDS_STORE = "guest-tickets";
const KEYS_STORE = "guest-keys";
const KEY_NAME = "aes-gcm";

interface StoredEnvelope {
  /** The record's in-line key (RECORDS_STORE keyPath "ticketId"). Real
   *  IndexedDB throws DataError on a put whose keyPath property is missing —
   *  the envelope MUST carry it. */
  ticketId: string;
  enc: boolean;
  v: number;
  /** base64 iv (AES-GCM 12-byte) — present when enc */
  iv?: string;
  /** base64 ciphertext (or plaintext JSON when enc=false) */
  data: string;
}

export interface GuestWalletRecord {
  ticketId: string;
  wire: TicketWalletWire;
  savedAt: string;
  /** ISO instant after which the record is dropped (event end + 30 days). */
  expiresAt: string;
  /** The phone the guest checked out with — lets the claim flow pre-fill it
   *  instead of asking the buyer to re-type what we already know. */
  phone?: string;
}

const b64ToBuf = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const bufToB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: "ticketId" });
      }
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = work(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.onabort = () => reject(t.error);
  });
}

async function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readonly");
    const out: T[] = [];
    const req = t.objectStore(store).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out.push(cursor.value as T);
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/* ─── Web Crypto (AES-GCM) ─── */

function cryptoSupported(): boolean {
  return typeof indexedDB !== "undefined" &&
    typeof crypto !== "undefined" && !!crypto.subtle;
}

let cachedKey: CryptoKey | null = null;

async function loadOrCreateKey(db: IDBDatabase): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = await txDone<ArrayBuffer | undefined>(
    db, KEYS_STORE, "readonly",
    (s) => s.get(KEY_NAME) as IDBRequest<ArrayBuffer | undefined>,
  );
  let bytes: Uint8Array<ArrayBuffer>;
  if (raw && raw.byteLength > 0) {
    bytes = new Uint8Array(raw);
  } else {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    const exported = await crypto.subtle.exportKey("raw", key);
    bytes = new Uint8Array(exported);
    // Best-effort persist; a failed write still returns the in-memory key.
    try {
      await txDone(db, KEYS_STORE, "readwrite", (s) => s.put(bytes.buffer, KEY_NAME));
    } catch { /* in-memory key is sufficient for this session */ }
  }
  cachedKey = await crypto.subtle.importKey(
    "raw", bytes, { name: "AES-GCM" }, true, ["encrypt", "decrypt"],
  );
  return cachedKey;
}

async function encryptPayload(db: IDBDatabase, record: GuestWalletRecord): Promise<Omit<StoredEnvelope, "ticketId">> {
  const key = await loadOrCreateKey(db);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(record));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, plain,
  );
  return { enc: true, v: 1, iv: bufToB64(iv), data: bufToB64(cipher) };
}

async function decryptPayload(db: IDBDatabase, env: StoredEnvelope): Promise<GuestWalletRecord> {
  if (!env.enc || !env.iv) {
    return JSON.parse(new TextDecoder().decode(b64ToBuf(env.data))) as GuestWalletRecord;
  }
  const key = await loadOrCreateKey(db);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(env.iv) }, key, b64ToBuf(env.data),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as GuestWalletRecord;
}

/* ─── Expiry + metadata ─── */

const DEVICE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function expiresFor(wire: TicketWalletWire): string {
  const ends = wire.event_dates.map((d) => d.ends_at ?? d.starts_at).filter(Boolean).sort();
  const eventEnd = ends.length ? Date.parse(ends[ends.length - 1]!) : Date.now();
  const base = Number.isNaN(eventEnd) ? Date.now() : eventEnd;
  return new Date(base + DEVICE_RETENTION_MS).toISOString();
}

function toRecord(wire: TicketWalletWire, phone?: string): GuestWalletRecord {
  return {
    ticketId: wire.id,
    wire,
    savedAt: new Date().toISOString(),
    expiresAt: expiresFor(wire),
    ...(phone ? { phone } : {}),
  };
}

/* ─── Module ─── */

export const guestWallet = {
  isSupported: (): boolean => cryptoSupported(),

  /** Encrypted-at-rest device storage. True when records are ciphertext. */
  async isEncrypted(): Promise<boolean> {
    try {
      const db = await openDb();
      const rows = await readAll<{ enc?: boolean }>(db, RECORDS_STORE);
      return rows.every((r) => r.enc !== false);
    } catch {
      return false;
    }
  },

  /**
   * Upsert issued tickets (full wallet wire, includes per-credential QR for
   * active tickets) into the device wallet. Called on the guest return screen
   * BEFORE the checkout resume keys are cleared.
   */
  async saveTickets(wires: TicketWalletWire[], options: { phone?: string } = {}): Promise<void> {
    if (!wires || wires.length === 0) return;
    const db = await openDb();
    for (const wire of wires) {
      const record = toRecord(wire, options.phone);
      const env: StoredEnvelope = cryptoSupported()
        ? { ticketId: wire.id, ...(await encryptPayload(db, record)) }
        : { ticketId: wire.id, enc: false, v: 1, data: bufToB64(new TextEncoder().encode(JSON.stringify(record))) };
      await txDone(db, RECORDS_STORE, "readwrite", (s) => s.put(env));
    }
  },

  /** Decrypt + return all non-expired device tickets (newest first). */
  async list(): Promise<GuestWalletRecord[]> {
    try {
      const db = await openDb();
      const rows = await readAll<StoredEnvelope>(db, RECORDS_STORE);
      const now = Date.now();
      const records: GuestWalletRecord[] = [];
      for (const env of rows) {
        let rec: GuestWalletRecord;
        try {
          rec = await decryptPayload(db, env);
        } catch {
          continue; // corrupt/undecryptable record — skip
        }
        if (Date.parse(rec.expiresAt) <= now) continue;
        records.push(rec);
      }
      return records.sort(
        (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt),
      );
    } catch {
      return [];
    }
  },

  /** The phone stored with a device ticket, if any (claim pre-fill). */
  async getPhone(ticketId: string): Promise<string | undefined> {
    try {
      const records = await guestWallet.list();
      return records.find((r) => r.ticketId === ticketId)?.phone;
    } catch {
      return undefined;
    }
  },

  async remove(ticketId: string): Promise<void> {
    try {
      const db = await openDb();
      await txDone(db, RECORDS_STORE, "readwrite", (s) => s.delete(ticketId));
    } catch { /* best-effort */ }
  },

  async clearAll(): Promise<void> {
    try {
      const db = await openDb();
      await txDone(db, RECORDS_STORE, "readwrite", (s) => s.clear());
    } catch { /* best-effort */ }
  },
};