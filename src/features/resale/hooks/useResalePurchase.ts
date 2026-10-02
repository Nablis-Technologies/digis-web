/**
 * Resale purchase, shared by every surface that buys a listing (the resale
 * event detail page). Mirrors the checkout pipeline exactly:
 *   POST /resale_listings/:id/purchase → a pending-payment Order
 *   → startPayment (Chapa) → hosted checkout in a NEW tab
 *   → the app tab confirms from the webhook and closes the Chapa tab.
 *
 * Ownership is never claimed here — the wallet proves fulfillment.
 */
import { useState } from 'react';
import { resaleModule } from '@/lib/resale';
import { orderModule } from '@/lib/order';
import type { CheckoutOrder } from '@/lib/order';
import { mapApiError } from '@/lib/errors';
import { openHostedCheckout } from '@/lib/checkout-popup';
import type { ResaleListing } from '@/types';

export interface UseResalePurchase {
  purchasing: boolean;
  /** Mapped, user-readable failure — render inline on the surface. */
  error: string | null;
  /** Set when the payment was accepted without a hosted redirect. */
  pendingOrder: CheckoutOrder | null;
  buy: (listing: ResaleListing) => Promise<void>;
  reset: () => void;
}

export function useResalePurchase(): UseResalePurchase {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<CheckoutOrder | null>(null);

  const buy = async (listing: ResaleListing) => {
    setPurchasing(true);
    setError(null);
    setPendingOrder(null);
    try {
      const order = await resaleModule.purchaseListing(listing.id);
      const { payment } = await orderModule.startPayment({
        orderId: order.id,
        provider: 'chapa',
        paymentMethod: 'telebirr',
        eventId: order.event_id,
      });
      if (payment && payment.status === 'processing' && payment.checkout_url) {
        openHostedCheckout(order.id, payment.checkout_url);
        return;
      }
      // No hosted redirect: the payment was already accepted server-side.
      // Show a pending-confirmation state (never a premature "Purchased!")
      // until the wallet proves fulfillment.
      setPendingOrder(order);
    } catch (e) {
      setError(mapApiError(e, 'Purchase failed. Please try again.'));
    } finally {
      setPurchasing(false);
    }
  };

  return {
    purchasing,
    error,
    pendingOrder,
    buy,
    reset: () => { setError(null); setPendingOrder(null); },
  };
}
