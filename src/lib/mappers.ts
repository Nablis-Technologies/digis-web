// Data-shape adapters between the Rails JSON API (snake_case, integer-cent
// money, ISO timestamps) and the frontend's camelCase UI types.

export function snakeToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) return input.map((v) => snakeToCamel(v)) as unknown as T;
  if (input && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[camel] = snakeToCamel((input as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return input as T;
}

export function camelToSnake(input: unknown): unknown {
  if (Array.isArray(input)) return input.map((v) => camelToSnake(v));
  if (input && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input as Record<string, unknown>)) {
      const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      out[snake] = camelToSnake((input as Record<string, unknown>)[key]);
    }
    return out;
  }
  return input;
}

/** Convert integer minor units (cents) to major units (e.g. 12345 -> 123.45). */
export function minorToNumber(minor?: number | null): number {
  if (minor == null) return 0;
  return minor / 100;
}

export function isoToDisplayDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function isoToDisplayTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Derive a relative time string (e.g. "2h ago") from an ISO timestamp. */
export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
