import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Money } from '@/lib/money';
import { useTheme } from '@/app/components/ThemeContext';
import {
  Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft,
  AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket
} from 'lucide-react';
import { ResaleEventCard } from '@/features/resale/components/ResaleEventCard';
import type { ResaleListing, UserTicket } from '@/types';
import { resaleModule } from '@/lib/resale';
import { eventsModule } from '@/lib/events';
import { useResalePurchase } from '@/features/resale/hooks/useResalePurchase';
import { InfoCardsGrid } from '@/features/event-detail/components/InfoCards';
import { LineupSection } from '@/features/event-detail/components/LineupSection';
import { OrganizerCard, resolveOrganizers } from '@/features/event-detail/components/OrganizerSection';
import { FilterPanel } from '@/features/resale/components/FilterPanel';

import { ListingSuccessOverlay } from '@/features/resale/components/ListingSuccessOverlay';
import { RemoveListingSheet } from '@/features/resale/components/RemoveListingSheet';
import { ResaleEmptyState } from '@/features/resale/components/ResaleEmptyState';
import { SellTicketSheet } from '@/features/resale/components/SellTicketSheet';
import { PayoutMethodsSheet } from '@/features/resale/components/PayoutMethodsSheet';
import { ticketKeys } from '@/lib/tickets';
import { sellerReportsService, sellerReportsKeys } from '@/lib/seller-reports';
import { toastError } from '@/lib/feedback';
import { mapApiError } from '@/lib/errors';
import { isoToDisplayDate } from '@/lib/mappers';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { EventCardSkeleton, ListingRowSkeleton, LoadErrorCard, useShowSkeleton } from '@/components/loading';

interface ResaleMarketplaceProps {
  userTickets: UserTicket[];
  initialListTicket?: UserTicket | null;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export function ResaleMarketplace({ userTickets, initialListTicket }: ResaleMarketplaceProps) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'browse' | 'myListings'>('browse');
  const [showListSheet, setShowListSheet] = useState(false);
  const [listingTicket, setListingTicket] = useState<UserTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'priceAsc' | 'priceDesc'>('recent');
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
  const [showListingSuccess, setShowListingSuccess] = useState(false);
  const [successListing, setSuccessListing] = useState<ResaleListing | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removedFlashId, setRemovedFlashId] = useState<string | null>(null);
  const [showPayoutSheet, setShowPayoutSheet] = useState(false);
  // Browse + my-listings read through the Resale module (live backend: browse
  // serves active listings; my-listings are the active rows created in this
  // session — the backend exposes no owner identifier on browse).
  const {
    data: browseListings = [],
    isPending: browsePending,
    isError: browseError,
    refetch: refetchBrowse,
  } = useQuery({ queryKey: resaleModule.keys.all, queryFn: () => resaleModule.fetchListings() });
  const {
    data: myListings = [],
    isPending: myPending,
    isError: myError,
    refetch: refetchMine,
  } = useQuery({ queryKey: resaleModule.keys.myListings, queryFn: () => resaleModule.fetchMyListings() });
  // Seller earnings — read straight from the seller reports endpoints.
  const { data: sellerBalance = [], isError: balanceError, refetch: refetchBalance } = useQuery({ queryKey: sellerReportsKeys.balance, queryFn: () => sellerReportsService.fetchBalance() });
  const { data: sellerHistory = [] } = useQuery({ queryKey: sellerReportsKeys.history, queryFn: () => sellerReportsService.fetchHistory() });
  const [showAllHistory, setShowAllHistory] = useState(false);
  // Skeletons only appear if loading persists.
  const showBrowseLoading = useShowSkeleton(browsePending);
  const showMyLoading = useShowSkeleton(myPending);
  const [showFilters, setShowFilters] = useState(false);
  // Ticket-type options come from the live data (backend type names are
  // arbitrary — no hardcoded VIP/Regular). Verified and face-value filters
  // are cut: the backend serves neither seller metadata nor buyer face value.
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const typeOptions = Array.from(new Set(browseListings.map((l) => l.ticketType))).sort();
  const activeFilterCount = typeFilter !== 'all' ? 1 : 0;
  const matchesFilters = (l: ResaleListing) => {
    if (typeFilter !== 'all' && l.ticketType !== typeFilter) return false;
    return true;
  };
  const resetFilters = () => { setTypeFilter('all'); };
  const createListingMutation = useMutation({
    mutationKey: ['resale', 'createListing'],
    mutationFn: ({ ticket, price }: { ticket: UserTicket; price: number }) =>
      resaleModule.createListing(ticket, Money.fromMajor(price, 'ETB').amountMinor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      queryClient.invalidateQueries({ queryKey: resaleModule.keys.all });
      queryClient.invalidateQueries({ queryKey: resaleModule.keys.myListings });
    },
  });
  const removeListingMutation = useMutation({
    mutationKey: ['resale', 'removeListing'],
    mutationFn: (listingId: string) => resaleModule.cancelListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resaleModule.keys.all });
      queryClient.invalidateQueries({ queryKey: resaleModule.keys.myListings });
    },
    // The confirm sheet closes on submit, so a failure has no surface left on
    // screen — toast it (reusing the existing sonner host + error copy).
    onError: (error) => toastError(error, 'Could not delist this ticket. Please try again.'),
  });

  // Auto-open sell sheet when navigated from TicketView with a ticket to list
  useEffect(() => {
    if (initialListTicket) {
      setListingTicket(initialListTicket);
      setShowListSheet(true);
      setActiveTab('myListings');
    }
  }, [initialListTicket]);

  // Lock body scroll when a bottom sheet is open
  useEffect(() => {
    if (showListSheet || showPayoutSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showListSheet, showPayoutSheet]);

  // Group browse listings by event (mirrors the browse view's "Events with Resale").
  const eventGroups = (() => {
    const map = new Map<string, {
      eventId: string;
      eventName: string;
      eventDate: string;
      eventTime: string;
      venue: string;
      city: string;
      image: string;
      count: number;
      minPrice: number;
      maxPrice: number;
      hasVIP: boolean;
      listings: ResaleListing[];
    }>();
    for (const l of browseListings.filter(matchesFilters)) {
      const g = map.get(l.event_id);
      if (g) {
        g.count += 1;
        g.minPrice = Math.min(g.minPrice, l.askingPriceMinor);
        g.maxPrice = Math.max(g.maxPrice, l.askingPriceMinor);
        g.hasVIP = g.hasVIP || l.ticketType === 'VIP';
        g.listings.push(l);
      } else {
        map.set(l.event_id, {
          eventId: l.event_id,
          eventName: l.eventName,
          eventDate: l.eventDate,
          eventTime: l.eventTime,
          venue: l.venue,
          city: l.city,
          image: l.image,
          count: 1,
          minPrice: l.askingPriceMinor,
          maxPrice: l.askingPriceMinor,
          hasVIP: l.ticketType === 'VIP',
          listings: [l],
        });
      }
    }
    return Array.from(map.values()).filter(g =>
      g.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  })();

  const selectedGroup = selectedEventName
    ? (() => {
        const all = browseListings.filter(l => l.eventName === selectedEventName);
        if (!all.length) return null;
        const first = all[0];
        return {
          eventId: first.event_id,
          eventSlug: first.eventSlug,
          eventName: first.eventName,
          eventDate: first.eventDate,
          eventTime: first.eventTime,
          venue: first.venue,
          city: first.city,
          image: first.image,
          count: all.length,
          minPrice: Math.min(...all.map(l => l.askingPriceMinor)),
          maxPrice: Math.max(...all.map(l => l.askingPriceMinor)),
          hasVIP: all.some(l => l.ticketType === 'VIP'),
          listings: all,
        };
      })()
    : null;
  const eventListings = selectedGroup
    ? [...selectedGroup.listings].filter(matchesFilters).sort((a, b) => {
        if (sortBy === 'priceAsc') return a.askingPriceMinor - b.askingPriceMinor;
        if (sortBy === 'priceDesc') return b.askingPriceMinor - a.askingPriceMinor;
        return 0;
      })
    : [];

  // Resale purchase — the shared command used by every resale buy surface.
  const resalePurchase = useResalePurchase();
  // The event behind the selected group, for the ticket-detail elements the
  // event page shows (about / lineup / organizer). Absent data renders nothing.
  const selectedEventQuery = useQuery({
    queryKey: eventsModule.keys.detail(selectedGroup?.eventSlug ?? ''),
    queryFn: () => eventsModule.fetchById(selectedGroup!.eventSlug),
    enabled: Boolean(selectedGroup?.eventSlug),
  });
  const selectedEvent = selectedEventQuery.data ?? null;

  const handleListTicket = (ticket: UserTicket) => {
    // Clear any error from a previous attempt so the sheet opens clean.
    createListingMutation.reset();
    setListingTicket(ticket);
    setShowListSheet(true);
  };
  // A failed listing keeps the sheet open, so the message renders inline
  // (mirrors the purchase error) instead of vanishing into a toast.
  const listingError = createListingMutation.error
    ? mapApiError(createListingMutation.error, 'Could not list this ticket. Please try again.')
    : null;

  const handleConfirmListing = async (price: number) => {
    if (!listingTicket) return;
    const ticket = listingTicket;
    createListingMutation.mutate(
      { ticket, price },
      {
        onSuccess: (listing) => {
          setShowListSheet(false);
          setSuccessListing(listing);
          setListingTicket(null);
          setShowListingSuccess(true);
          // Keep the confirmation open so the seller can share their listing before continuing.
        },
      },
    );
  };

  const handleRemoveListing = (id: string) => {
    // Show confirmation sheet rather than deleting immediately.
    setPendingRemoveId(id);
  };

  const confirmRemoveListing = () => {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    setPendingRemoveId(null);
    // Brief "delisted" flash on the row before it disappears.
    setRemovedFlashId(id);
    setTimeout(() => {
      removeListingMutation.mutate(id);
      setRemovedFlashId(null);
    }, 400);
  };

  return (
    <div className="min-h-screen pb-40 lg:pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 lg:pt-14 pb-2">
        <p className="text-[11px] tracking-[3px] uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
          Marketplace
        </p>
        <h1 className="text-[32px] font-light tracking-[-0.5px]"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
          Resale
        </h1>
        <p className="text-[13px] mt-1"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }}>
          Buy & sell tickets securely
        </p>
      </motion.div>

      {/* Tabs — matches TicketView segmented control */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="px-5 pt-5">
        <div
          className="relative grid grid-cols-2 rounded-2xl p-1 overflow-hidden"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)',
            border: `1px solid ${isDark ? 'rgba(217,255,0,0.15)' : 'rgba(214,249,5,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Sliding active pill */}
          <motion.div
            layout
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl"
            style={{
              left: activeTab === 'browse' ? '4px' : 'calc(50% + 0px)',
              background: isDark
                ? 'linear-gradient(135deg, rgba(217,255,0,0.35), rgba(214,249,5,0.2))'
                : 'linear-gradient(135deg, rgba(214,249,5,0.95), rgba(214,249,5,0.8))',
              boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
            }}
          />
          {(['browse', 'myListings'] as const).map(tab => {
            const active = activeTab === tab;
            return (
              <AppButton
                key={tab}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab)}
                className="relative z-10 py-2.5 text-[12px] tracking-[1px] uppercase flex items-center justify-center cursor-pointer"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: active ? 600 : 500,
                  color: active
                    ? (isDark ? '#fff' : '#0a0a0a')
                    : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)'),
                  transition: 'color 0.25s',
                }}
              >
                {tab === 'browse' ? 'Browse' : 'My Listings'}
              </AppButton>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'browse' ? (
          <motion.div key="browse" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <AnimatePresence mode="wait">
              {!selectedEventName ? (
                /* ─── Event List View ─── */
                <motion.div key="events"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}>
                  {/* Search + Filter */}
                  <div className="px-5 pt-5">
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        }}>
                        <Search className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} strokeWidth={1.5} />
                        <AppInput
                          type="text"
                          placeholder="Search events..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-[13px]"
                          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}
                        />
                      </div>
                      <AppButton whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters(v => !v)}
                        className="relative w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer"
                        style={{
                          background: showFilters || activeFilterCount > 0
                            ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.08)')
                            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                          border: `1px solid ${showFilters || activeFilterCount > 0
                            ? (isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.2)')
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}`,
                        }}>
                        <Filter className="w-4 h-4"
                          style={{ color: activeFilterCount > 0 ? (isDark ? '#d6f905' : '#0a0a0a') : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }}
                          strokeWidth={1.5} />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px]"
                            style={{ background: isDark ? '#d6f905' : '#d6f905', color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                            {activeFilterCount}
                          </span>
                        )}
                      </AppButton>
                    </div>
                    <FilterPanel
                      open={showFilters}
                      isDark={isDark}
                      typeOptions={typeOptions}
                      typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                      onReset={resetFilters}
                    />
                  </div>

                  {/* Section header */}
                  <div className="px-5 pt-6 flex items-center justify-between">
                    <p className="text-[10px] tracking-[2.5px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                      Events with Resale
                    </p>
                    <p className="text-[10px] tracking-[1.5px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }}>
                      {eventGroups.length} {eventGroups.length === 1 ? 'event' : 'events'}
                    </p>
                  </div>

                  {/* Event Cards — matching Discover page */}
                  <div className="px-5 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventGroups.map((group, index) => (
                      <motion.div key={group.eventName}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.35 }}>
                        <ResaleEventCard group={group} onClick={() => setSelectedEventName(group.eventName)} />
                      </motion.div>
                    ))}
                    {browseError ? (
                      <div className="col-span-full">
                        <LoadErrorCard onRetry={() => void refetchBrowse()} />
                      </div>
                    ) : showBrowseLoading ? (
                      <>
                        <div className="col-span-full sm:col-span-1"><EventCardSkeleton /></div>
                        <div className="col-span-full sm:col-span-1"><EventCardSkeleton /></div>
                        <div className="col-span-full sm:col-span-1"><EventCardSkeleton /></div>
                      </>
                    ) : eventGroups.length === 0 && (
                      <div className="col-span-full">
                        <ResaleEmptyState
                          isDark={isDark}
                          searchQuery={searchQuery}
                          onClear={() => setSearchQuery('')}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : selectedGroup ? (
                /* ─── Event Detail / Listings Sub-View ─── */
                <motion.div key="listings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}>
                  {/* Back link */}
                  <div className="px-5 lg:px-8 pt-5">
                    <AppButton whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedEventName(null)}
                      className="flex items-center gap-1.5 mb-4 cursor-pointer">
                      <ArrowLeft className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} strokeWidth={1.5} />
                      <span className="text-[12px] tracking-[0.3px]"
                        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                        All Events
                      </span>
                    </AppButton>
                  </div>

                  {/* EventDetail-style layout: hero on left (desktop), content rail on right */}
                  <div className="px-5 lg:px-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10">
                    {/* Hero image card */}
                    <div className="relative h-[260px] sm:h-[340px] lg:h-[520px] rounded-3xl overflow-hidden">
                      <img src={selectedGroup.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,20,0.9))' }}
                      />
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d6f905' }} />
                        <span className="text-[10px] tracking-[1.5px] uppercase text-white"
                          style={{ fontFamily: "'Inter', sans-serif" }}>Resale Live</span>
                      </div>
                      <div className="absolute bottom-5 left-5 right-5">
                        <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-light text-white leading-tight mb-2"
                          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                          {selectedGroup.eventName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-white/85">
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                            {selectedGroup.eventDate}
                          </span>
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                            {selectedGroup.eventTime}
                          </span>
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                            {selectedGroup.venue}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content rail */}
                    <div className="flex flex-col">
                    {/* Stats + Sort + Filter */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] tracking-[2px] uppercase"
                        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                        {eventListings.length} of {selectedGroup.count} {selectedGroup.count === 1 ? 'Ticket' : 'Tickets'}
                      </p>
                      <div className="flex items-center gap-2">
                        <AppButton whileTap={{ scale: 0.95 }}
                          onClick={() => setSortBy(s => s === 'recent' ? 'priceAsc' : s === 'priceAsc' ? 'priceDesc' : 'recent')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                          }}>
                          <ArrowUpDown className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.5} />
                          <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                            {sortBy === 'recent' ? 'Recent' : sortBy === 'priceAsc' ? 'Low → High' : 'High → Low'}
                          </span>
                        </AppButton>
                        <AppButton whileTap={{ scale: 0.95 }}
                          onClick={() => setShowFilters(v => !v)}
                          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
                          style={{
                            background: showFilters || activeFilterCount > 0
                              ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.08)')
                              : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                            border: `1px solid ${showFilters || activeFilterCount > 0
                              ? (isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.2)')
                              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}`,
                          }}>
                          <Filter className="w-3 h-3"
                            style={{ color: activeFilterCount > 0 ? (isDark ? '#d6f905' : '#0a0a0a') : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') }}
                            strokeWidth={1.5} />
                          <span className="text-[10px]"
                            style={{ fontFamily: "'Inter', sans-serif", color: activeFilterCount > 0 ? (isDark ? '#d6f905' : '#0a0a0a') : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') }}>
                            Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
                          </span>
                        </AppButton>
                      </div>
                    </div>
                    <FilterPanel
                      open={showFilters}
                      isDark={isDark}
                      typeOptions={typeOptions}
                      typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                      onReset={resetFilters}
                    />
                    {eventListings.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Filter className="w-7 h-7 mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} strokeWidth={1} />
                        <p className="text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                          No tickets match your filters
                        </p>
                        <AppButton onClick={resetFilters} className="text-[11px] cursor-pointer underline"
                          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
                          Clear filters
                        </AppButton>
                      </div>
                    )}

                    {/* Purchase failures stay on the page next to the rows. */}
                    {resalePurchase.error && (
                      <p className="text-[11px] mb-3 leading-[1.5]"
                        style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                        {resalePurchase.error}
                      </p>
                    )}

                    {/* Flat sales list */}
                    <div className="flex flex-col gap-2">
                      {eventListings.map((listing, index) => {
                        // Face value exists only in the seller view; buyer rows
                        // show the asking price without a delta.
                        const face = listing.originalPriceMinor;
                        const above = face != null && listing.askingPriceMinor > face;
                        const below = face != null && listing.askingPriceMinor < face;
                        const deltaPct = face != null && face > 0
                          ? Math.round(Math.abs(listing.askingPriceMinor - face) / face * 100)
                          : 0;
                        const isVIP = listing.ticketType === 'VIP';
                        const accent = isDark ? '#d6f905' : '#0a0a0a';
                        return (
                          <motion.div key={listing.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#fff'; }}
                          >
                            {/* Type icon */}
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${isDark ? 'rgba(214,249,5,0.2)' : 'rgba(0,0,0,0.06)'}`,
                              }}>
                              {isVIP ? (
                                <Crown className="w-4 h-4" style={{ color: accent }} strokeWidth={2} />
                              ) : (
                                <Ticket className="w-4 h-4" style={{ color: accent }} strokeWidth={2} />
                              )}
                            </div>

                            {/* Type + face value */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] tracking-[1.5px] uppercase leading-none mb-1.5"
                                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#0a0a0a', fontWeight: 600 }}>
                                {listing.ticketType}
                              </p>
                              <p className="text-[11px] leading-none"
                                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                                {face != null
                                  ? <>Face value · {Money.fromMinor(face, "ETB").format()}</>
                                  : <>{listing.ticketType}</>}
                              </p>
                            </div>

                            {/* Price + delta (delta only with a face value) */}
                            <div className="flex-shrink-0 text-right">
                              <p className="text-[18px] font-light leading-none tracking-[-0.3px]"
                                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#0a0a0a' }}>
                                {Money.fromMinor(listing.askingPriceMinor, "ETB").format()}
                                <span className="text-[10px] ml-1 tracking-[1px]"
                                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                                  ETB
                                </span>
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1.5">
                                {face == null ? null : above ? (
                                  <>
                                    <TrendingUp className="w-3 h-3" style={{ color: '#f87171' }} strokeWidth={2} />
                                    <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>
                                      +{deltaPct}%
                                    </span>
                                  </>
                                ) : below ? (
                                  <>
                                    <TrendingDown className="w-3 h-3" style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={2} />
                                    <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#059669' }}>
                                      -{deltaPct}%
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] tracking-[0.5px]"
                                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                                    At face
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Buy — own listings are not purchasable */}
                            {myListings.some((l) => l.id === listing.id) ? (
                              <span className="text-[11px] flex-shrink-0 tracking-[0.5px] uppercase"
                                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                                Your listing
                              </span>
                            ) : (
                              <AppButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => void resalePurchase.buy(listing)}
                                disabled={resalePurchase.purchasing}
                                className="flex-shrink-0 px-4 py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)', color: '#0a0a0a' }}>
                                <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Buy</span>
                              </AppButton>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                    </div>

                  {/* Same elements as the ticket detail page — date/time/venue
                      cards, about, lineup and organizer. Absent data renders
                      nothing rather than inventing it. */}
                  {selectedEvent && (
                    <div className="px-5 lg:px-8 mt-8 lg:mt-10">
                      <InfoCardsGrid
                        items={[
                          { icon: <Calendar className="w-4 h-4" />, label: 'Date', value: selectedGroup!.eventDate },
                          { icon: <Clock className="w-4 h-4" />, label: 'Time', value: selectedGroup!.eventTime },
                          { icon: <MapPin className="w-4 h-4" />, label: 'Venue', value: selectedGroup!.venue },
                        ]}
                      />
                      {selectedEvent.description && (
                        <>
                          <h2 className="text-[13px] tracking-[2px] uppercase mb-4 mt-8"
                            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)' }}>
                            About
                          </h2>
                          <p className="text-[14px] leading-relaxed font-light"
                            style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }}>
                            {selectedEvent.description}
                          </p>
                        </>
                      )}
                      <LineupSection lineup={selectedEvent.lineup} isDark={isDark} />
                      <OrganizerCard organizers={resolveOrganizers(selectedEvent)} isDark={isDark} />
                    </div>
                  )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="myListings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {/* Active Listings */}
            {myError ? (
              <div className="px-5 pt-5">
                <LoadErrorCard onRetry={() => void refetchMine()} />
              </div>
            ) : showMyLoading ? (
              <div className="px-5 pt-5">
                <p className="text-[11px] tracking-[2px] uppercase mb-3 ml-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                  Active Listings
                </p>
                <div className="space-y-3">
                  <ListingRowSkeleton />
                  <ListingRowSkeleton />
                </div>
              </div>
            ) : myListings.length > 0 && (
              <div className="px-5 pt-5">
                <p className="text-[11px] tracking-[2px] uppercase mb-3 ml-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                  Active Listings
                </p>
                <motion.div layout className="space-y-3">
                  <AnimatePresence initial={false}>
                  {myListings.map(listing => {
                    const isRemoving = removedFlashId === listing.id;
                    return (
                    <motion.div
                      key={listing.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: isRemoving ? 0.4 : 1, scale: isRemoving ? 0.98 : 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: 'easeIn' } }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="relative flex items-center justify-between p-4 rounded-2xl overflow-hidden"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                        border: `1px solid ${isRemoving ? 'rgba(239,68,68,0.3)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                      }}
                    >
                      {/* "Delisted" flash overlay */}
                      {isRemoving && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
                          style={{ background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)' }}>
                          <span className="text-[12px] tracking-[1.5px] uppercase text-red-400"
                            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                            Delisted
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 min-w-0">
                        {listing.image && (
                          <img src={listing.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                            {listing.eventName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
                              {Money.fromMinor(listing.askingPriceMinor, listing.currency).format()}
                            </p>
                            <span className="text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 rounded-full"
                              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                              Live
                            </span>
                          </div>
                        </div>
                      </div>
                      <AppButton
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRemoveListing(listing.id)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer ml-3"
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.18)',
                          color: '#ef4444',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <X className="w-3 h-3" strokeWidth={2.5} />
                        Delist
                      </AppButton>
                    </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}


            {/* List a ticket — intentionally unboxed so the ticket rows read as the primary, full-width actions. */}
            <div className="px-5 pt-7">
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(214,249,5,0.09)' : 'rgba(214,249,5,0.10)' }}>
                  <Tag className="w-[18px] h-[18px]" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={1.6} />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                    List a Ticket for Sale
                  </h3>
                  <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                    Choose a ticket from your collection
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {userTickets.filter((t) => t.status === 'active').map(ticket => (
                  <AppButton key={ticket.id} whileTap={{ scale: 0.985 }}
                    onClick={() => handleListTicket(ticket)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.065)' : 'rgba(0,0,0,0.055)'}`,
                    }}>
                    <div className="flex min-w-0 items-center gap-3.5">
                      {ticket.image && (
                        <img src={ticket.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 text-left">
                        <p className="text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                          {ticket.eventName}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                          {ticket.ticketType} · {ticket.eventDate}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 ml-3" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} strokeWidth={1.5} />
                  </AppButton>
                ))}
              </div>

              {/* Seller earnings — balance + ledger from the seller reports API. */}
              {balanceError && (
                <div className="mt-3 p-4 rounded-2xl text-center"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                  <p className="text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                    Couldn't load your earnings.
                  </p>
                  <AppButton onClick={() => void refetchBalance()} className="cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: isDark ? '#d6f905' : '#6d28d9' }}>
                    Retry
                  </AppButton>
                </div>
              )}
              {!balanceError && sellerBalance.length > 0 && (
                <div className="mt-3 p-4 rounded-2xl"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)' }}>
                      <TrendingUp className="w-5 h-5" style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                        Available to pay out
                      </p>
                      <p className="text-[18px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? '#fff' : '#1a1a1a' }}>
                        {sellerBalance.map((b) => Money.fromMinor(b.availableMinor, b.currency).format()).join(' · ')}
                      </p>
                      {sellerBalance.some((b) => b.reservedMinor > 0) && (
                        <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                          {sellerBalance
                            .filter((b) => b.reservedMinor > 0)
                            .map((b) => `${Money.fromMinor(b.reservedMinor, b.currency).format()} on hold`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {sellerHistory.length > 0 && (
                    <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                      {(showAllHistory ? sellerHistory : sellerHistory.slice(0, 3)).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12.5px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                              {entry.description || entry.eventName || entry.type}
                            </p>
                            <p className="text-[10.5px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                              {entry.eventName ? `${entry.eventName} · ` : ''}Available {isoToDisplayDate(entry.availableAt)}
                            </p>
                          </div>
                          <p className="text-[12.5px] flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: entry.amountMinor < 0 ? (isDark ? '#ff6b70' : '#c0392b') : (isDark ? '#34d399' : '#059669') }}>
                            {entry.amountMinor < 0 ? '' : '+'}{Money.fromMinor(entry.amountMinor, entry.currency).format()}
                          </p>
                        </div>
                      ))}
                      {sellerHistory.length > 3 && (
                        <AppButton onClick={() => setShowAllHistory((v) => !v)} className="cursor-pointer"
                          style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: isDark ? '#d6f905' : '#6d28d9' }}>
                          {showAllHistory ? 'Show less' : `Show all ${sellerHistory.length}`}
                        </AppButton>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payout methods entry */}
              <AppButton whileTap={{ scale: 0.98 }}
                onClick={() => setShowPayoutSheet(true)}
                className="mt-3 w-full flex items-center gap-3 p-4 rounded-2xl cursor-pointer text-left"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                  <Wallet className="w-5 h-5" style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                    Payout methods
                  </p>
                  <p className="text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                    Manage where you get paid
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} strokeWidth={1.5} />
              </AppButton>
            </div>

            {!showMyLoading && !myError && myListings.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-12 text-center px-6">
                <Sparkles className="w-6 h-6 mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} strokeWidth={1} />
                <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }}>
                  No active listings yet
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "You're live!" success celebration */}
      <AnimatePresence>
        {showListingSuccess && successListing && (
          <ListingSuccessOverlay
            ticket={successListing.ticket ?? {
              id: successListing.id,
              eventName: successListing.eventName,
              eventDate: successListing.eventDate,
              eventTime: successListing.eventTime,
              venue: successListing.venue,
              ticketType: successListing.ticketType,
              qrCode: '',
              purchased: new Date().toISOString(),
              image: successListing.image,
            }}
            price={successListing.askingPriceMinor}
            listingId={successListing.id}
            isDark={isDark}
            onClose={() => { setShowListingSuccess(false); setActiveTab('myListings'); }}
          />
        )}
      </AnimatePresence>

      {/* Delist confirmation sheet */}
      <AnimatePresence>
        {pendingRemoveId && (() => {
          const listing = myListings.find(l => l.id === pendingRemoveId);
          if (!listing) return null;
          return (
            <RemoveListingSheet
              listing={listing}
              isDark={isDark}
              onCancel={() => setPendingRemoveId(null)}
              onConfirm={confirmRemoveListing}
            removing={removeListingMutation.isPending}
            />
          );
        })()}
      </AnimatePresence>

      {/* Sell Ticket Sheet */}
      <AnimatePresence>
        {showListSheet && listingTicket && (
          <SellTicketSheet
            ticket={listingTicket}
            onClose={() => { setShowListSheet(false); setListingTicket(null); }}
            onConfirm={handleConfirmListing}
            submitting={createListingMutation.isPending}
            error={listingError}
          />
        )}
      </AnimatePresence>

      {/* Payout methods manager */}
      <AnimatePresence>
        {showPayoutSheet && (
          <PayoutMethodsSheet onClose={() => setShowPayoutSheet(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LISTING DETAIL SHEET
   ═══════════════════════════════════════════════════════ */
