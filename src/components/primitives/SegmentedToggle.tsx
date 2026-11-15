import type { ReactNode } from 'react';
import { glassEdge } from '@/lib/ui/glass';

type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * A quiet, single-outline segmented control. Selection is communicated by a
 * brighter surface and text weight—not a second border around the active item.
 */
export function SegmentedToggle<T extends string>({
  value,
  onValueChange,
  options,
  isDark,
  ariaLabel,
  className = '',
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  isDark: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const surface = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
  const activeSurface = isDark ? '#121212' : '#ffffff';
  const activeText = isDark ? '#ffffff' : '#111214';
  const inactiveText = isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.46)';

  return (
    <div
      className={`grid gap-1 rounded-2xl p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, background: surface, ...glassEdge(isDark) }}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6f905]/50 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: active ? activeSurface : 'transparent',
              color: active ? activeText : inactiveText,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
            }}
          >
            {option.icon && <span className="flex-shrink-0" aria-hidden="true">{option.icon}</span>}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
