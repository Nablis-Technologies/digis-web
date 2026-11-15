import type { Money } from "@/lib/money";

/**
 * Render-only money formatter. Input is always a `Money` value (integer cents +
 * currency); output is a display string. Never format raw cents/decimals here.
 */
export function formatPrice(money: Money): string {
  return money.format();
}

/** @deprecated use `formatPrice(money)` / `money.format()` — accepts major units for transitional use. */
export function formatETB(value: number): string {
  return `${value.toLocaleString("en-US")} ETB`;
}
