/** Local Rails media must follow the same-origin dev API proxy on LAN/HTTPS. */
export function developmentStorageUrl(value: string): string {
  if (value.startsWith('/rails/active_storage/')) return `/__digis_api${value}`;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return value;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== '3000') return value;
    return url.pathname.startsWith('/rails/active_storage/')
      ? `/__digis_api${url.pathname}${url.search}${url.hash}` : value;
  } catch {
    return value;
  }
}

export function routeDevelopmentMedia<T>(value: T): T {
  if (typeof value === 'string') return developmentStorageUrl(value) as T;
  if (Array.isArray(value)) return value.map(routeDevelopmentMedia) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, routeDevelopmentMedia(child)])) as T;
  }
  return value;
}
