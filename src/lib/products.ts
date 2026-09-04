/**
 * Products module — the deep module mirroring the backend's public products
 * contract. Owns the HTTP calls (via apiFetch) AND the backend→domain mapping
 * for event products (tickets + extras). Components call this module; nobody
 * reaches the backend for products any other way.
 *
 * Backend endpoints:
 *   - GET /public/events/:slug/products → Catalog::Public::EventProductSerializer
 *     (price_options in *_minor cents with active windows, available flag,
 *     nested ticket_type). Requires NO auth.
 *
 * Mapping rules (backend is the source of truth for money + availability):
 *   - `priceMinor` = lowest ACTIVE price option's amount_minor. Products with
 *     no active price are dropped (not buyable).
 *   - `available` is a backend boolean without a remaining count; it maps to a
 *     purchasable cap of max_per_order (or 10), 0 when unavailable — enough for
 *     sold-out detection and quantity caps.
 *   - TicketTier extras the backend doesn't model stay minimal: no early-bird /
 *     couples / elite flags, no perks (features: []). The level chip gets a
 *     neutral "GENERAL" — the backend has no tier hierarchy to mirror.
 *   - `requiresTicket` is NOT serialized by the backend yet (BACKEND_GAPS.md #3
 *     nuance) and stays undefined — extras gating treats it as not required.
 */

import { apiFetch } from "@/lib/api";
import type { EventProduct, EventProductType, TicketTier } from "@/types";

export interface BackendPriceOption {
  currency: string;
  amount_minor: number;
  active_from: string;
  active_to: string | null;
}

export interface BackendProduct {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  type: EventProductType;
  allow_custom_price?: boolean;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  min_per_order?: number | null;
  max_per_order?: number | null;
  schedule_change_refund_policy?: string | null;
  sort_order?: number;
  price_options: BackendPriceOption[];
  available: boolean;
  ticket_type?: { admission?: unknown } | null;
}

export interface EventProducts {
  /** Ticket products mapped to selectable tiers (price-ranked). */
  tiers: TicketTier[];
  /** Non-ticket products mapped to purchasable extras (priced only). */
  extras: EventProduct[];
}

/** Active price windows only — expired or future prices are not buyable. */
function activePrices(p: BackendProduct, at: string = new Date().toISOString()): BackendPriceOption[] {
  return (p.price_options ?? []).filter(
    (o) => o.active_from <= at && (o.active_to == null || o.active_to > at),
  );
}

function lowestPriceMinor(p: BackendProduct): number {
  const actives = activePrices(p);
  if (actives.length === 0) return 0;
  return Math.min(...actives.map((o) => o.amount_minor));
}

function purchasableCap(p: BackendProduct): number {
  return p.available ? (p.max_per_order ?? 10) : 0;
}

/** Map non-ticket backend products to checkout extras. */
function toExtra(p: BackendProduct): EventProduct | null {
  const priceMinor = lowestPriceMinor(p);
  if (priceMinor <= 0) return null;
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    description: p.description ?? undefined,
    priceMinor,
    available: purchasableCap(p),
    maxPerOrder: p.max_per_order ?? undefined,
  };
}

/** Map ticket backend products to selectable tiers. */
function toTier(p: BackendProduct): TicketTier | null {
  const priceMinor = lowestPriceMinor(p);
  if (priceMinor <= 0) return null;
  return {
    id: p.id,
    name: p.name,
    level: "GENERAL",
    priceMinor,
    available: purchasableCap(p),
    features: [],
  };
}

/**
 * Backend event products (tickets + extras) for one event, price-ranked.
 * Returns empty lists (never throws for empty) — callers fall back to the
 * event's mock products when the endpoint has nothing live to show.
 */
export async function fetchEventProducts(slug: string): Promise<EventProducts> {
  const { data } = await apiFetch<BackendProduct[]>(`public/events/${slug}/products`);
  const products = data ?? [];
  const tiers = products
    .filter((p) => p.type === "ticket")
    .map(toTier)
    .filter((t): t is TicketTier => t !== null)
    .sort((a, b) => a.priceMinor - b.priceMinor);
  const extras = products
    .filter((p) => p.type !== "ticket")
    .map(toExtra)
    .filter((e): e is EventProduct => e !== null)
    .sort((a, b) => a.priceMinor - b.priceMinor);
  return { tiers, extras };
}

export const productsModule = {
  /** Stable query keys — import these wherever you call useQuery. */
  keys: {
    forEvent: (slug: string) => ["products", slug] as const,
  },

  /** Mirror GET /public/events/:slug/products. */
  async fetchForEvent(slug: string): Promise<EventProducts> {
    return fetchEventProducts(slug);
  },
};
