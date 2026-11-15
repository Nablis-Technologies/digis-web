/**
 * Handle for the hosted-checkout tab opened via `window.open`.
 *
 * Chapa V2 does not redirect the buyer back to the app (the API `return_url` is
 * ignored and the receipt has no return link), so the checkout opens in a NEW
 * tab and the app tab confirms the payment from the webhook. Once the payment
 * resolves, we close the Chapa tab — which returns the buyer to Digis.
 *
 * Only script-opened windows can be closed this way, which is exactly how this
 * one is created (no `noopener`, so `window.open` returns a usable handle).
 */
let popup: Window | null = null;

export function setCheckoutPopup(win: Window | null): void {
  popup = win;
}

/** Close the hosted-checkout tab (if any) and refocus this tab. */
export function closeCheckoutPopup(): void {
  const win = popup;
  popup = null;
  if (win) {
    try {
      if (!win.closed) win.close();
    } catch { /* ignore — closing may be blocked */ }
  }
  try { window.focus(); } catch { /* ignore — focus may be blocked */ }
}

/**
 * Open the hosted checkout in a new tab and signal this tab to start
 * confirming. Shared by every flow that starts a hosted payment (checkout and
 * resale purchase) so the return UX is identical: the app tab polls, and on
 * confirmation closes the Chapa tab, returning the buyer to Digis.
 *
 * Falls back to a same-tab navigation when the popup is blocked.
 */
export function openHostedCheckout(orderId: string, checkoutUrl: string): void {
  try {
    sessionStorage.setItem('digis:awaiting-confirm', orderId);
    window.dispatchEvent(new Event('digis:awaiting-confirm'));
  } catch { /* storage unavailable — the poll simply won't start */ }
  // No `noopener` feature: with it `window.open` returns null even on success,
  // which made this tab ALSO navigate, and left us no handle to close the tab.
  const opened = window.open(checkoutUrl, '_blank');
  setCheckoutPopup(opened);
  if (!opened) window.location.href = checkoutUrl;
}
