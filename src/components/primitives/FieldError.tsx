import type { CSSProperties } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Field-attached validation message. Rendered with `role="alert"` so assistive
 * tech announces it, and placed directly under the input it describes. Pair it
 * with a red border / `aria-invalid` on the input itself so sighted users also
 * see which field is wrong.
 */
export function FieldError({ error, className, style }: {
  error?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className={className ?? 'flex items-center gap-1.5 mt-1.5 text-[11px]'}
      style={{ fontFamily: "'Inter', sans-serif", color: '#f87171', ...style }}
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
      {error}
    </p>
  );
}
