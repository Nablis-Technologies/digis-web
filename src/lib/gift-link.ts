/** Gift bearer capabilities stay in memory, never URL/router state or storage.
 * A reload after scrubbing requires reopening the original message link. */
const tokens = new Map<string, string>();

export function captureGiftLink(): void {
  const url = new URL(window.location.href);
  const fragment = /^#gift\/([^?]+)\?(.+)$/.exec(url.hash);
  const path = /^\/gifts?\/([^/]+)$/.exec(url.pathname);
  const id = fragment?.[1] ?? path?.[1];
  const token = fragment
    ? new URLSearchParams(fragment[2]).get('token')
    : path ? url.searchParams.get('token') : null;
  if (!id || !token) return;
  // The backend generates UUID ids. Encode defensively before constructing a route.
  let decodedId: string | undefined;
  try { decodedId = decodeURIComponent(id); } catch { /* malformed link */ }
  window.history.replaceState(null, '', `/gift/${decodedId ? encodeURIComponent(decodedId) : 'invalid'}`);
  if (decodedId) tokens.set(decodedId, token);
}

export function giftLinkToken(id: string): string {
  return tokens.get(id) ?? '';
}
