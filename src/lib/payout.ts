import type { AddPayoutMethodInput, PayoutMethod } from '@/types/payout';

// Mock in-memory store. In production this would be a backend that tokenizes
// the account details — here we keep them locally to drive the UI.
const store = new Map<string, PayoutMethod>();

const genId = () => `payout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const payoutService = {
  async fetchMethods(): Promise<PayoutMethod[]> {
    // Default first, then most-recently-added.
    return Array.from(store.values()).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },

  async addMethod(input: AddPayoutMethodInput): Promise<PayoutMethod> {
    const isFirst = store.size === 0;
    const method: PayoutMethod = {
      id: genId(),
      kind: input.kind,
      holderName: input.holderName.trim(),
      accountNumber: input.accountNumber.replace(/\s+/g, ''),
      // The first method a seller adds becomes their default automatically.
      isDefault: isFirst,
    };
    store.set(method.id, method);
    return method;
  },

  async removeMethod(id: string): Promise<{ success: true }> {
    const removed = store.get(id);
    store.delete(id);
    // If we deleted the default, promote whatever remains so a seller always
    // has a destination.
    if (removed?.isDefault) {
      const next = Array.from(store.values())[0];
      if (next) store.set(next.id, { ...next, isDefault: true });
    }
    return { success: true };
  },

  async setDefault(id: string): Promise<{ success: true }> {
    for (const [key, method] of store) {
      store.set(key, { ...method, isDefault: key === id });
    }
    return { success: true };
  },
};

export const payoutKeys = {
  all: ['payout', 'methods'] as const,
};
