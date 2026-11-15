import { useEffect } from 'react';

/**
 * Set the document title — the browser tab, history entries, and shared links
 * should name the current surface, not a static app name.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
