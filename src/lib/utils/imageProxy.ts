/**
 * Many event-cover hosts (i.ibb.co, i.postimg.cc, …) don't send
 * `Access-Control-Allow-Origin`. That taints the canvas — blocking both colour
 * extraction and `html-to-image` export — and can make `<img crossorigin>` fail
 * to render at all. Routing through images.weserv.nl adds the CORS headers and
 * lets us downscale for a faster read.
 *
 * Only point non-CORS hosts at the proxy; a CORS-enabled host (e.g. Unsplash)
 * should render directly.
 */
export function proxiedImageUrl(url: string, width?: number): string {
  const stripped = url.replace(/^https:\/\//, "ssl:").replace(/^http:\/\//, "");
  const size = width ? `&w=${width}` : "";
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}${size}`;
}

/** True when the URL is already served through the CORS proxy. */
export function isProxied(url: string): boolean {
  return url.startsWith("https://images.weserv.nl/");
}
