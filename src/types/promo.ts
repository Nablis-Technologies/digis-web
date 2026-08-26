export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCode {
  eventId: string;
  code: string;
  discount: number;
  type: PromoDiscountType;
  label: string;
  minTicket: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export type PromoCreateInput = {
  eventId: string;
  code: string;
  discount: number;
  type: PromoDiscountType;
  label: string;
  minTicket?: string;
  maxUses?: number;
  expiresAt?: string;
};

export type AppliedPromo = Pick<PromoCode, 'code' | 'discount' | 'type' | 'label'>;
