import { motion, AnimatePresence } from 'motion/react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassInputSurface } from '@/lib/ui/glass';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  variant?: 'hero' | 'nav';
  showFilter?: boolean;
  onFilterClick?: () => void;
  filterActive?: boolean;
  activeFilterCount?: number;
  inputRef?: React.RefObject<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SearchBar({
  value,
  onChange,
  variant = 'hero',
  showFilter = false,
  onFilterClick,
  filterActive = false,
  activeFilterCount = 0,
  inputRef,
  onFocus,
  onBlur,
}: SearchBarProps) {
  const { isDark } = useTheme();
  const isNav = variant === 'nav';

  // Reserve room on the right for the embedded controls (clear + filter).
  const rightPad = showFilter
    ? (isNav ? 'pr-12' : 'pr-14')
    : 'pr-10';
  // When the filter button is present, the clear (X) sits to its left.
  const clearRight = showFilter
    ? (isNav ? 'right-[44px]' : 'right-[50px]')
    : 'right-3';

  return (
    <div className="relative w-full group">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          ...glassInputSurface(isDark),
          ...(isNav ? { boxShadow: 'none' } : {}),
        }}
      >
        <GlassReflection isDark={isDark} />
        <Search
          size={16}
          strokeWidth={2}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 pointer-events-none"
          style={{
            width: 16,
            height: 16,
            color: value
              ? '#d6f905'
              : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'),
          }}
        />
        <AppInput
          ref={inputRef}
          type="text"
          placeholder="Search events, venues, artists..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`relative z-10 w-full rounded-2xl bg-transparent pl-11 ${rightPad} focus:outline-none transition-all ${
            isNav ? 'py-2.5 text-[13px]' : 'py-3.5 lg:py-4 text-[13px] lg:text-[14px]'
          }`}
          style={{
            background: 'transparent',
            fontFamily: "'Inter', sans-serif",
            color: isDark ? '#fff' : '#1a1a1a',
            border: 'none',
            boxShadow: 'none',
          }}
        />
      </div>


      <AnimatePresence>
        {value && (
          <AppButton
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => onChange('')}
            className={`absolute ${clearRight} top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-10`}
            style={{
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              color: isDark ? '#fff' : '#1a1a1a',
            }}
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </AppButton>
        )}
      </AnimatePresence>

      {showFilter && (
        <AppButton
          whileTap={{ scale: 0.9 }}
          onClick={onFilterClick}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl flex items-center justify-center transition-all z-10 ${
            isNav ? 'w-8 h-8' : 'w-9 h-9 lg:w-10 lg:h-10'
          }`}
          style={{
            background: filterActive
              ? (isDark ? '#d6f905' : '#0a0a0a')
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
            color: filterActive
              ? (isDark ? '#0a0a0a' : '#fff')
              : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'),
            border: 'none',
          }}
          aria-label="Filters"
        >
          <GlassReflection isDark={isDark} />
          <SlidersHorizontal className="relative z-10 w-[15px] h-[15px]" strokeWidth={2} />
          {activeFilterCount > 0 && (
            <span
              className="absolute z-10 -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9.5px]"
              style={{
                background: isDark ? '#0a0a0a' : '#d6f905',
                color: isDark ? '#d6f905' : '#0a0a0a',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                boxShadow: `0 0 0 2px ${isDark ? '#d6f905' : '#fff'}`,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </AppButton>
      )}
    </div>
  );
}
