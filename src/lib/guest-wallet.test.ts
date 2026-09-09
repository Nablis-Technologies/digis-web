import { describe, it, expect, beforeEach } from 'vitest';
import { guestWallet } from '@/lib/guest-wallet';
import type { TicketWalletWire } from '@/lib/tickets';

/* ─── Minimal in-memory IndexedDB fake (subset the module uses) ─── */

class MemoryStore {
  data = new Map<string, unknown>();
  constructor(public name: string, public keyPath?: string) {}
}

function openCursorReq(store: MemoryStore) {
  const iter = store.data.entries();
  const req: { result: { value: unknown; continue: () => void } | null; onsuccess: ((ev: Event) => void) | null; onerror: ((ev: Event) => void) | null } = {
    result: null,
    onsuccess: null,
    onerror: null,
  };
  const fire = () => {
    const next = iter.next();
    req.result = next.done ? null : { value: next.value[1], continue: fire };
    req.onsuccess?.(new Event('success'));
  };
  queueMicrotask(fire);
  return req;
}

class FakeObjectStore {
  constructor(public store: MemoryStore) {}
  get(key: string) {
    const value = this.store.data.get(key);
    return makeReq(value === undefined ? null : value);
  }
  put(value: unknown, key?: string) {
    if (this.store.keyPath) {
      // Real IDB throws DataError when the in-line keyPath property is missing.
      const k = (value as Record<string, unknown>)[this.store.keyPath];
      if (k === undefined || k === null) {
        throw new DOMException('Data provided to an operation does not meet requirements', 'DataError');
      }
      this.store.data.set(String(k), value);
    } else {
      this.store.data.set(key ?? (this.store.data.size + 1).toString(), value);
    }
    return makeReq(undefined);
  }
  delete(key: string) {
    this.store.data.delete(key);
    return makeReq(undefined);
  }
  clear() {
    this.store.data.clear();
    return makeReq(undefined);
  }
  openCursor() {
    return openCursorReq(this.store);
  }
}

class FakeTransaction {
  error: Error | null = null;
  onabort: ((ev: Event) => void) | null = null;
  constructor(public stores: Map<string, MemoryStore>, public storeName: string, public mode: IDBTransactionMode) {}
  objectStore(name: string) {
    return new FakeObjectStore(this.stores.get(name)!);
  }
  abort() {
    this.onabort?.(new Event('abort'));
  }
}

class FakeDB {
  objectStoreNames = { contains: (n: string) => this.stores.has(n) } as unknown as DOMStringList;
  constructor(public stores: Map<string, MemoryStore>) {}
  createObjectStore(name: string, opts?: { keyPath?: string }) {
    const s = new MemoryStore(name, opts?.keyPath);
    this.stores.set(name, s);
    return s;
  }
  transaction(store: string, mode: IDBTransactionMode) {
    return new FakeTransaction(this.stores, store, mode);
  }
}

function makeReq<T>(result: T) {
  const req: { result: T; onsuccess: ((ev: Event) => void) | null; onerror: ((ev: Event) => void) | null } = {
    result,
    onsuccess: null,
    onerror: null,
  };
  queueMicrotask(() => req.onsuccess?.(new Event('success')));
  return req;
}

const dbStores = new Map<string, MemoryStore>();
const fakeIndexedDB = {
  open: () => {
    const db = new FakeDB(dbStores);
    const req: { result: FakeDB | null; onupgradeneeded: ((ev: Event) => void) | null; onsuccess: ((ev: Event) => void) | null; onerror: ((ev: Event) => void) | null } = {
      result: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    };
    queueMicrotask(() => {
      // Real IDB exposes the db on req.result DURING onupgradeneeded.
      req.result = db;
      if (req.onupgradeneeded) req.onupgradeneeded(new Event('upgrade'));
      req.onsuccess?.(new Event('success'));
    });
    return req;
  },
};

function wire(id: string): TicketWalletWire {
  return {
    id,
    status: 'active',
    unit_number: 1,
    admissions_per_unit_snapshot: 1,
    credential_mode: 'group',
    event: { id: 'evt', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
    product: { id: 'prod', name: 'Regular', type: 'ticket' },
    ticket_type: { id: 'tt', admissions_per_unit: 1, entry_validation_mode: 'qr' },
    event_dates: [{
      id: 'date', name: null, starts_at: new Date(Date.now() + 86400000).toISOString(), ends_at: null,
      status: 'scheduled', venue: { id: 'v', name: 'The Venue Warehouse', city: 'Addis Ababa' },
    }],
    admission_slots: [],
    credentials: [{ id: 'c1', admission_slot_id: null, entry_limit: 1, status: 'active', issued_at: new Date().toISOString(), lookup_code: 'A1B2', qr_token: 'qr-token-1' }],
  };
}

beforeEach(() => {
  dbStores.clear();
  Object.defineProperty(globalThis, 'indexedDB', { value: fakeIndexedDB, configurable: true });
});

describe('guestWallet (encrypted device tickets)', () => {
  it('round-trips a wallet wire through AES-GCM and back', async () => {
    await guestWallet.saveTickets([wire('t1')]);
    const records = await guestWallet.list();
    expect(records).toHaveLength(1);
    expect(records[0].ticketId).toBe('t1');
    expect(records[0].wire.credentials[0].qr_token).toBe('qr-token-1');
    expect(await guestWallet.isEncrypted()).toBe(true);
  });

  it('upserts by ticket id without duplicating', async () => {
    await guestWallet.saveTickets([wire('t1')]);
    const updated = wire('t1');
    updated.product.name = 'VIP';
    await guestWallet.saveTickets([updated]);
    const records = await guestWallet.list();
    expect(records).toHaveLength(1);
    expect(records[0].wire.product.name).toBe('VIP');
  });

  it('removes a single ticket', async () => {
    await guestWallet.saveTickets([wire('t1'), wire('t2')]);
    await guestWallet.remove('t1');
    const records = await guestWallet.list();
    expect(records.map((r) => r.ticketId).sort()).toEqual(['t2']);
  });

  it('drops expired records (past event end + 30 days)', async () => {
    const past = wire('old');
    past.event_dates = [{
      ...past.event_dates[0],
      starts_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      ends_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    }];
    await guestWallet.saveTickets([past, wire('fresh')]);
    const records = await guestWallet.list();
    expect(records.map((r) => r.ticketId)).toEqual(['fresh']);
  });

  it('clearAll wipes the device wallet', async () => {
    await guestWallet.saveTickets([wire('t1')]);
    await guestWallet.clearAll();
    expect(await guestWallet.list()).toHaveLength(0);
  });

  it('isSupported requires indexedDB + crypto.subtle', () => {
    expect(guestWallet.isSupported()).toBe(true);
  });
});