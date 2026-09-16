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
