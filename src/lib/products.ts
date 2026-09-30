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
 *   - `requiresTicket` is projected from product metadata (BACKEND_GAPS #3-nuance
 *     resolved 2026-09-08) — extras gating can use it from live products.
 */

import { apiFetch } from "@/lib/api";
import { applyRankAccents } from "@/lib/tierAccents";
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
  requires_ticket?: boolean;
  ticket_type?: {
    id?: string;
    audience?: string | null;
    approval_mode?: string | null;
    date_selection?: string | null;
    waitlist_enabled?: boolean | null;
    admissions_per_unit?: number | null;
  } | null;
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

/** The app charges in ETB; a price in another currency only shows if ETB is
 *  absent. Returns null when nothing is currently purchasable. */
const CHARGE_CURRENCY = "ETB";

function displayPriceMinor(p: BackendProduct): number | null {
  const actives = activePrices(p);
  if (actives.length === 0) return null;
  const inCurrency = actives.filter((o) => o.currency === CHARGE_CURRENCY);
  const pool = inCurrency.length > 0 ? inCurrency : actives;
  return Math.min(...pool.map((o) => o.amount_minor));
}

function purchasableCap(p: BackendProduct): number {
  return p.available ? (p.max_per_order ?? 10) : 0;
}

/** Map non-ticket backend products to checkout extras. */
function toExtra(p: BackendProduct): EventProduct | null {
  const priceMinor = displayPriceMinor(p);
  if (priceMinor === null || priceMinor <= 0) return null;
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    description: p.description ?? undefined,
    priceMinor,
    available: purchasableCap(p),
    maxPerOrder: p.max_per_order ?? undefined,
    ...(p.requires_ticket === true ? { requiresTicket: true } : {}),
  };
}

/** Map ticket backend products to selectable admission offers. A `0` price is a
 *  valid FREE offer (the composable model) — it is kept, not dropped. */
function toTier(p: BackendProduct): TicketTier | null {
  const priceMinor = displayPriceMinor(p);
  if (priceMinor === null) return null;
  return {
    id: p.id,
    // The nested Ticketing::TicketType id — consent_requirements and the
    // registration submit both address it, not the product id.
    ticketTypeId: p.ticket_type?.id ?? undefined,
    audience: (p.ticket_type?.audience as TicketTier['audience']) ?? undefined,
    dateSelection: (p.ticket_type?.date_selection === 'choose_one' ? 'choose_one' : 'fixed'),
    approvalMode: p.ticket_type?.approval_mode === 'manual' ? 'manual' : 'automatic',
    waitlistEnabled: p.ticket_type?.waitlist_enabled === true,
    admissionsPerUnit: p.ticket_type?.admissions_per_unit ?? 1,
    minPerOrder: p.min_per_order ?? 1,
    maxPerOrder: p.max_per_order ?? undefined,
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
  applyRankAccents(tiers);
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
