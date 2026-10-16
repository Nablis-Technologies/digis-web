import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value. Used to keep the discovery search box
 * instant while the server-side `q` query only fires once typing pauses.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
