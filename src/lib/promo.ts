/**
 * Promo service — in-memory mock promo API used by the current app.
 *
 * Swap each method body for a fetch('/api/v1/promos/...') call when
 * the Rails backend is ready.
 */

import type { AppliedPromo, PromoCode, PromoCreateInput } from '@/types/promo';

const promoStorage = new Map<string, PromoCode>();

export const promoService = {
  async create(data: PromoCreateInput): Promise<{ success?: true; promo?: PromoCode; error?: string }> {
    const promoKey = `promo:${data.eventId}:${data.code.toUpperCase()}`;

    if (promoStorage.has(promoKey)) {
      return { error: 'Promo code already exists for this event' };
    }

    const promoData: PromoCode = {
      eventId: data.eventId,
      code: data.code.toUpperCase(),
      discount: Number(data.discount),
      type: data.type,
      label: data.label,
      minTicket: data.minTicket || null,
      maxUses: data.maxUses ? Number(data.maxUses) : null,
      usedCount: 0,
      expiresAt: data.expiresAt || null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    promoStorage.set(promoKey, promoData);
    return { success: true, promo: promoData };
  },

  async getByEvent(eventId: string): Promise<{ promos: PromoCode[] }> {
    const promos: PromoCode[] = [];
    for (const [key, value] of promoStorage.entries()) {
      if (key.startsWith(`promo:${eventId}:`)) {
        promos.push(value);
      }
    }
    return { promos };
  },

  async validate(eventId: string, code: string, ticketType: string): Promise<{ valid: boolean; error?: string; promo?: AppliedPromo }> {
    const promoKey = `promo:${eventId}:${code.toUpperCase()}`;
    const promo = promoStorage.get(promoKey);

    if (!promo) return { valid: false, error: 'Invalid promo code' };
    if (!promo.active) return { valid: false, error: 'This promo code is no longer active' };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date())
      return { valid: false, error: 'This promo code has expired' };
    if (promo.maxUses && promo.usedCount >= promo.maxUses)
      return { valid: false, error: 'This promo code has reached its usage limit' };
    if (promo.minTicket && ticketType) {
      // NOTE: The backend has no tier-ordering concept. Promotions are scoped to
      // event products (promotion_products), not tier names. This tier check is
      // a MOCK-ONLY guard; Phase 3 replaces it with backend validation per
      // event_product_id. When the backend's consumer promo endpoint arrives,
      // delete this check entirely.
      const tierOrder = ['Standard Access', 'VIP Gold Access', 'VVIP Diamond Access'];
      const requiredIdx = tierOrder.indexOf(promo.minTicket);
      const currentIdx = tierOrder.indexOf(ticketType);
      if (currentIdx < requiredIdx)
        return { valid: false, error: `This code requires ${promo.minTicket} or higher` };
    }

    promo.usedCount += 1;
    promoStorage.set(promoKey, promo);

    return {
      valid: true,
      promo: { code: promo.code, discount: promo.discount, type: promo.type, label: promo.label },
    };
  },

  async delete(eventId: string, code: string): Promise<{ success: true }> {
    promoStorage.delete(`promo:${eventId}:${code.toUpperCase()}`);
    return { success: true };
  },

  async toggle(eventId: string, code: string): Promise<{ success: true; promo: PromoCode } | { error: string }> {
    const promoKey = `promo:${eventId}:${code.toUpperCase()}`;
    const promo = promoStorage.get(promoKey);
    if (!promo) return { error: 'Promo code not found' };
    promo.active = !promo.active;
    promoStorage.set(promoKey, promo);
    return { success: true, promo };
  },
};

export const promoKeys = {
  byEvent: (eventId: string) => ['promos', eventId] as const,
};
