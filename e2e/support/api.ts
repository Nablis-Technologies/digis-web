/** Match only HTTP API traffic, whether direct or through Vite's dev proxy. */
export function apiRoute(pathPattern = '/**'): (url: URL) => boolean {
  const escaped = pathPattern.split('**').map(part => part.split('*').map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  const expression = new RegExp(`^${escaped}$`);
  return url => {
    const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
    const isApi = isLocal && (url.port === '3000' || (url.port === '5173' && url.pathname.startsWith('/__digis_api/')));
    return isApi && expression.test(apiPath(url));
  };
}

export function apiPath(url: URL | string): string {
  return (typeof url === 'string' ? new URL(url) : url).pathname.replace(/^\/__digis_api/, '');
}
