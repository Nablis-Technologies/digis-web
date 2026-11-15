import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsModule } from "@/lib/events";
import { fetchCategories, categoryKeys } from "@/lib/categories";
import { eventEnded } from "@/lib/eventDates";
import { eventSoldOut } from "@/lib/eventAvailability";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useTheme } from "@/app/components/ThemeContext";
import { FeaturedCarousel } from "@/features/discovery/components/FeaturedCarousel";
import { FeaturedEventCard } from "@/features/discovery/components/FeaturedEventCard";
import { FeaturedMagazine } from "@/features/discovery/components/FeaturedMagazine";
import { CategoryFilter } from "@/features/discovery/components/CategoryFilter";
import { EventGrid } from "@/features/discovery/components/EventGrid";
import { FeaturedSkeleton, useShowSkeleton } from "@/components/loading";
import { HeroSearch } from "@/features/discovery/components/HeroSearch";
import { discoveryServerQuery } from "@/features/discovery/hooks/discoveryQuery";
import {
  useEventFilter,
  type EventAccessFilter,
  type EventPriceFilter,
  type EventSortBy,
} from "@/features/discovery/hooks/useEventFilter";
import type { Event } from "@/types";

interface EventDiscoveryProps {
  onSelectEvent: (event: Event) => void;
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  heroSearchRef?: React.RefObject<HTMLDivElement>;
  heroSearchInputRef?: React.RefObject<HTMLInputElement>;
  searchMode?: boolean;
  onSearchModeChange?: (mode: boolean) => void;
  initialFeaturedIdx?: number;
  onFeaturedIdxChange?: (i: number) => void;
  initialMagazineIdx?: number;
  onMagazineIdxChange?: (i: number) => void;
}

export function EventDiscovery({
  onSelectEvent,
  searchQuery: searchQueryProp,
  onSearchChange,
  heroSearchRef,
  heroSearchInputRef,
  searchMode = false,
  onSearchModeChange,
  initialFeaturedIdx = 0,
  onFeaturedIdxChange,
  initialMagazineIdx = 0,
  onMagazineIdxChange,
}: EventDiscoveryProps) {
  const [searchQueryInternal, setSearchQueryInternal] = useState("");
  const searchQuery = searchQueryProp ?? searchQueryInternal;
  const setSearchQuery = onSearchChange ?? setSearchQueryInternal;
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<EventSortBy>("soonest");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventAccessFilter[]>([]);
  const [priceRange, setPriceRange] = useState<EventPriceFilter | null>(null);
  const { isDark } = useTheme();

  // Category taxonomy (GET /categories) — name → backend slug, because the
  // `category` query param filters by SLUG, not name (#49).
  const { data: backendCategories = [] } = useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
  });
  const categorySlugByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of backendCategories) map.set(category.name, category.slug);
    return map;
  }, [backendCategories]);

  // Stable pill source: the UNFILTERED catalogue. Selecting a category must not
  // collapse the rail, so the pills never derive from the filtered result.
  const { data: catalogueEvents = [] } = useQuery({
    queryKey: eventsModule.keys.list(),
    queryFn: () => eventsModule.fetchAll(),
  });
  const categoryNames = useMemo(() => {
    const present = new Set(
      catalogueEvents.map((e) => e.category).filter((c): c is string => !!c),
    );
    const fromBackend = backendCategories
      .map((c) => c.name)
      .filter((n) => present.has(n));
    return fromBackend.length > 0 ? fromBackend : Array.from(present).sort();
  }, [backendCategories, catalogueEvents]);

  // Server-side discovery (#49): search, category, price and sort all drive the
  // backend query. The search is debounced so typing does not fire a request per
  // keystroke; below the 2-char threshold the box feels instant via the client
  // filter. `null` means the price controls contradict — no query can express an
  // empty window, so the grid renders an honest empty state.
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const categorySlug =
    selectedCategory === "All" ? undefined : categorySlugByName.get(selectedCategory);
  const serverQuery = useMemo(
    () =>
      discoveryServerQuery({
        q: debouncedSearch,
        categorySlug,
        sortBy,
        eventTypes,
        priceRange,
        onlyFeatured,
      }),
    [debouncedSearch, categorySlug, sortBy, eventTypes, priceRange, onlyFeatured],
  );
  const filtersImpossible = serverQuery === null;

  // Fetch events via service. No initialData/placeholderData — the mock must
  // never appear while loading. Pending (no cache yet) renders skeletons in the
  // real layouts; background refetches keep stale data on screen.
  const {
    data: fetchedEvents = [],
    isPending: eventsPending,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: eventsModule.keys.list(serverQuery ?? {}),
    queryFn: () => eventsModule.fetchAll(serverQuery ?? {}),
    enabled: !filtersImpossible,
  });
  // A contradictory filter set fetches nothing; never fall back to the cached
  // unfiltered catalogue (which shares the empty query key).
  const events = filtersImpossible ? [] : fetchedEvents;

  // When the server owns the search, don't re-filter by the raw query
  // client-side (the backend matches more fields — description, organizer …).
  const clientSearchQuery = serverQuery?.q ? "" : searchQuery;
  // Until the taxonomy loads and the pill resolves to a slug, the category
  // filter falls back to the client pipeline (else a fresh pick shows all).
  const clientCategory =
    selectedCategory === "All" || categorySlug ? "All" : selectedCategory;

  const filteredEvents = useEventFilter(events, {
    searchQuery: clientSearchQuery,
    selectedCategory: clientCategory,
    sortBy,
    onlyAvailable,
    // Price/access are server-side now, adopting the backend's "any active
    // public ticket price within the window" shape (#49).
    eventTypes: [],
    priceRange: null,
  });

  const showLoading = useShowSkeleton(eventsPending) && !filtersImpossible;

  const activeFilterCount =
    (sortBy !== "soonest" ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (onlyFeatured ? 1 : 0) +
    eventTypes.length +
    (priceRange ? 1 : 0);
  const filtersActive =
    showFilters || activeFilterCount > 0 || selectedCategory !== "All";
  // Ended AND sold-out events are excluded from the featured carousel (they
  // must never lead discovery); they remain in the grid, sorted behind live /
  // available events.
  const featuredEvents = filteredEvents.filter((e) => e.featured && !eventEnded(e) && !eventSoldOut(e));

  return (
    <div className="min-h-screen pb-28 lg:pb-10">
      {/* Hero — cinematic on desktop, compact on mobile */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative px-5 sm:px-6 lg:px-8 pt-6 md:pt-12 lg:pt-16 pb-1 lg:pb-12"
        >
          {/* Mobile header — brand mark (mobile has no top bar logo) */}
          <div className="md:hidden flex items-center min-h-[40px] pr-[100px]">
            <div className="flex items-center gap-1.5 leading-none">
              <svg
                viewBox="0 0 1000 1000"
                className="w-7 h-7 block"
                fill={isDark ? "#d6f905" : "#0a0a0a"}
              >
                <path d="M481.88,355.78v142.38c-46.95-6.63-89.03-20.18-126.27-40.59-43.22-23.76-78.63-55.56-106.26-95.49-7.6-10.97-14.62-22.59-21.08-34.81-19.52-37.09-32.65-79-39.35-125.65h161.2c4.05,22.52,10.15,42.5,18.25,60.06,16.46,35.55,40.87,61.77,73.22,78.58,7.03,3.65,14.4,6.9,22.15,9.71,5.83,2.16,11.89,4.1,18.15,5.81Z" />
                <rect x="482.05" y="196.36" width="325.96" height="160.48" />
                <path d="M801.18,817.1h-161.33c-4.02-21.15-9.93-40.07-17.6-56.71-16.46-35.58-40.87-61.8-73.22-78.6-32.38-16.76-72.3-25.18-119.72-25.18h-81.21v-137.52h89.73c15.1,0,29.79.6,44.04,1.79,9.41.77,18.64,1.81,27.68,3.13,46.63,6.65,88.44,20.18,125.48,40.49,55.09,30.26,97.52,73.71,127.32,130.27,19.07,36.22,32,76.96,38.83,122.32Z" />
                <rect x="187.65" y="656.64" width="160.46" height="160.46" />
              </svg>
              <span
                className="text-[16px] leading-none tracking-[-0.3px]"
                style={{
                  fontFamily: "'Zalando Sans Expanded', sans-serif",
                  fontWeight: 500,
                  color: isDark ? "#fff" : "#0a0a0a",
                  transform: "translateY(1px)",
                }}
              >
                Digis
              </span>
            </div>
          </div>

          {/* Desktop hero header */}
          <div className="hidden lg:flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.6 }}
              className="text-[64px] font-light tracking-[-2px] leading-[0.95] whitespace-nowrap"
              style={{
                fontFamily: "'Zalando Sans Expanded', sans-serif",
                color: isDark ? "#ffffff" : "#0a0a0a",
              }}
            >
              <span
                style={{
                  color: isDark ? "#d6f905" : "#0a0a0a",
                  fontStyle: "regular",
                  fontWeight: 300,
                }}
              >
                Worth showing up for.
              </span>
            </motion.h1>
          </div>
        </motion.div>
      </div>

      <HeroSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={heroSearchInputRef}
        heroSearchRef={heroSearchRef}
        onSearchModeChange={onSearchModeChange}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onlyFeatured={onlyFeatured}
        onOnlyFeaturedChange={setOnlyFeatured}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
        eventTypes={eventTypes}
        onEventTypesChange={setEventTypes}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
      />

      <CategoryFilter
        categories={categoryNames}
        selectedCategory={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* Featured Events — skeleton hero while loading (same footprint) */}
      {showLoading && !searchMode && !filtersActive && (
        <div className="mb-10">
          <FeaturedSkeleton />
        </div>
      )}
      {featuredEvents.length > 0 && !searchMode && !filtersActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-10"
        >
          {/* Header — hidden on desktop (desktop shows it inside the magazine nav strip) */}
          <div className="lg:hidden flex items-center gap-3 mb-4 px-4 sm:px-6">
            <span
              className="text-[11px] tracking-[1.5px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
              }}
            >
              Headliners
            </span>
            <div className="flex-1 flex items-center justify-end">
              <span
                className="text-[11px] tracking-[1px] uppercase tabular-nums"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
                }}
              >
                {featuredEvents.length} events
              </span>
            </div>
          </div>
          {/* Mobile: coverflow carousel */}
          <FeaturedCarousel
            events={featuredEvents}
            onSelectEvent={onSelectEvent}
            initialActive={initialFeaturedIdx}
            onActiveChange={onFeaturedIdxChange}
            showDots={true}
          />
          {/* Tablet: 2-col grid */}
          <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-4 px-4 sm:px-6">
            {featuredEvents.map((event) => (
              <FeaturedEventCard
                key={event.id}
                event={event}
                onClick={() => onSelectEvent(event)}
              />
            ))}
          </div>
          {/* Desktop: cinematic magazine layout */}
          <div className="hidden lg:block px-4 sm:px-6 lg:px-8">
            <FeaturedMagazine
              events={featuredEvents}
              onSelectEvent={onSelectEvent}
              initialActiveIdx={initialMagazineIdx}
              onActiveIdxChange={onMagazineIdxChange}
            />
          </div>
        </motion.div>
      )}

      <EventGrid
        events={filteredEvents}
        onSelectEvent={onSelectEvent}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        loading={showLoading}
        loadError={eventsError}
        onRetry={() => void refetchEvents()}
        onReset={() => {
          setSelectedCategory("All");
          setSearchQuery("");
          setSortBy("soonest");
          setOnlyAvailable(false);
          setOnlyFeatured(false);
          setEventTypes([]);
          setPriceRange(null);
          onSearchModeChange?.(false);
        }}
      />
    </div>
  );
}
