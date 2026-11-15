/**
 * Seller earnings — mirrors digis_backend's marketplace seller reports:
 *   - GET /marketplace/seller/balance → own per-currency totals
 *   - GET /marketplace/seller/history → own ledger entries (newest first)
 *
 * Both are seller-scoped server-side (the backend answers ownership), so the
 * module never filters by a client-side identity. Money stays in integer minor
 * units; callers format with `Money`.
 */

import { apiFetch } from '@/lib/api';
import type { SellerBalance, SellerLedgerEntry } from '@/types/seller-reports';

interface SellerBalanceWire {
  currency: string;
  ledger_total_minor: number;
  reserved_minor: number;
  available_minor: number;
}

interface SellerLedgerEntryWire {
  id: string;
  type: string;
  amount_minor: number;
  currency: string;
  available_at: string;
  description?: string | null;
  event?: { id: string; slug: string; title: string } | null;
  created_at: string;
}

export function mapSellerBalance(wire: SellerBalanceWire): SellerBalance {
  return {
    currency: wire.currency,
    ledgerTotalMinor: wire.ledger_total_minor,
    reservedMinor: wire.reserved_minor,
    availableMinor: wire.available_minor,
  };
}

export function mapSellerLedgerEntry(wire: SellerLedgerEntryWire): SellerLedgerEntry {
  return {
    id: wire.id,
    type: wire.type,
    amountMinor: wire.amount_minor,
    currency: wire.currency,
    availableAt: wire.available_at,
    description: wire.description ?? '',
    eventName: wire.event?.title ?? '',
    eventSlug: wire.event?.slug ?? '',
    createdAt: wire.created_at,
  };
}

export const sellerReportsService = {
  async fetchBalance(): Promise<SellerBalance[]> {
    const { data } = await apiFetch<SellerBalanceWire[]>('marketplace/seller/balance');
    return (Array.isArray(data) ? data : []).map(mapSellerBalance);
  },

  async fetchHistory(): Promise<SellerLedgerEntry[]> {
    const { data } = await apiFetch<SellerLedgerEntryWire[]>('marketplace/seller/history');
    return (Array.isArray(data) ? data : []).map(mapSellerLedgerEntry);
  },
};

export const sellerReportsKeys = {
  balance: ['seller', 'balance'] as const,
  history: ['seller', 'history'] as const,
};
