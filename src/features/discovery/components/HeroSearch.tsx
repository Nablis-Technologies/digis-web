import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { LocationSelector } from "@/components/LocationSelector";
import { useTheme } from "@/app/components/ThemeContext";
import { glassEdge } from "@/lib/ui/glass";
import { FilterPanel } from "./FilterPanel";
import type { EventAccessFilter, EventPriceFilter, EventSortBy } from "@/features/discovery/hooks/useEventFilter";

export function HeroSearch({
  searchQuery,
  onSearchChange,
  searchInputRef,
  heroSearchRef,
  onSearchModeChange,
  showFilters,
  onShowFiltersChange,
  activeFilterCount,
  sortBy,
  onSortChange,
  onlyFeatured,
  onOnlyFeaturedChange,
  onlyAvailable,
  onOnlyAvailableChange,
  eventTypes,
  onEventTypesChange,
  priceRange,
  onPriceRangeChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  heroSearchRef?: React.RefObject<HTMLDivElement>;
  onSearchModeChange?: (mode: boolean) => void;
  showFilters: boolean;
  onShowFiltersChange: (
    show: boolean | ((current: boolean) => boolean),
  ) => void;
  activeFilterCount: number;
  sortBy: EventSortBy;
  onSortChange: (sortBy: EventSortBy) => void;
  onlyFeatured: boolean;
  onOnlyFeaturedChange: (value: boolean) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
  eventTypes: EventAccessFilter[];
  onEventTypesChange: (types: EventAccessFilter[]) => void;
  priceRange: EventPriceFilter | null;
  onPriceRangeChange: (range: EventPriceFilter | null) => void;
}) {
  const { isDark } = useTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [searchStuck, setSearchStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSearchStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden
        className="h-0 w-full md:hidden"
      />
      <motion.div
        ref={heroSearchRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="relative px-5 sm:px-6 lg:px-8 mt-2 mb-3 lg:mt-0 lg:mb-10 lg:max-w-2xl lg:mx-auto w-full sticky top-0 z-[25] md:relative md:top-auto md:z-auto py-2 md:py-0 scroll-mt-24 overflow-visible"
      >
        {searchStuck && (
          <>
            <div
              className="md:hidden absolute inset-0 pointer-events-none"
              style={{
                background: "transparent",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                boxShadow: "none",
              }}
            />
            {/* <div
              className="md:hidden pointer-events-none absolute bottom-0 left-[10%] right-[10%] h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(214,249,5,0.35), transparent)",
              }}
            /> */}
          </>
        )}
        <div className="relative">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            variant="hero"
            showFilter
            onFilterClick={() => onShowFiltersChange((v) => !v)}
            filterActive={showFilters || activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            inputRef={searchInputRef}
            onFocus={() => onSearchModeChange?.(true)}
            onBlur={() => {
              if (!searchQuery) onSearchModeChange?.(false);
            }}
          />
        </div>

        {/* Filter panel — absolute so it overlays content and never shifts scroll */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{
                duration: 0.22,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="absolute left-5 right-5 sm:left-6 sm:right-6 lg:left-8 lg:right-8 top-full mt-2 z-[26]"
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark
                    ? "rgba(14,14,18,0.40)"
                    : "rgba(255,255,255,0.68)",
                  ...glassEdge(isDark),
                  backdropFilter: "blur(40px) saturate(1.6)",
                  WebkitBackdropFilter:
                    "blur(40px) saturate(1.6)",
                  boxShadow: isDark
                    ? "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 8px 32px rgba(20,18,40,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                {/* City */}
                <p
                  className="text-[10px] tracking-[2px] uppercase mb-3"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(0,0,0,0.4)",
                    fontWeight: 600,
                  }}
                >
                  City
                </p>
                <div className="mb-4">
                  <LocationSelector />
                </div>

                {/* Divider */}
                <div
                  className="h-px w-full mb-4"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.05)",
                  }}
                />

                <FilterPanel
                  sortBy={sortBy}
                  onSortChange={onSortChange}
                  onlyFeatured={onlyFeatured}
                  onOnlyFeaturedChange={onOnlyFeaturedChange}
                  onlyAvailable={onlyAvailable}
                  onOnlyAvailableChange={onOnlyAvailableChange}
                  eventTypes={eventTypes}
                  onEventTypesChange={onEventTypesChange}
                  priceRange={priceRange}
                  onPriceRangeChange={onPriceRangeChange}
                  activeFilterCount={activeFilterCount}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}