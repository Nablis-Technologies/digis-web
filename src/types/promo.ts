/**
 * Promo codes are validated server-side (at quote / admission-selection time).
 * The frontend only carries the applied code's display fields.
 */
export type AppliedPromo = {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  label: string;
};
