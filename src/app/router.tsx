import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserRouter, RouterProvider, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, LogIn, UserCircle } from 'lucide-react';
import { ticketsService, ticketKeys } from '@/lib/tickets';
import { eventsModule } from '@/lib/events';
import { productsModule } from '@/lib/products';
import { orderModule } from '@/lib/order';
import type { Event, UserTicket } from '@/types';
import { EventDiscovery } from '@/features/discovery/pages/DiscoveryPage';
import { EventDetailSkeleton } from '@/components/loading';
import { TicketView } from '@/features/tickets/pages/TicketsPage';
import { EventDetail } from '@/features/event-detail/pages/EventDetailPage';
import { UserProfile } from '@/features/profile/pages/ProfilePage';
import { SettingsView } from '@/features/profile/pages/SettingsPage';
import { ResaleMarketplace } from '@/features/resale/pages/ResalePage';
import { PayoutsView } from '@/features/payouts/pages/PayoutsPage';
import { resaleModule } from '@/lib/resale';
import { ClaimTicketPage } from '@/features/tickets/pages/ClaimTicketPage';
import { UIPreviewPage } from '@/features/ui-preview/pages/UIPreviewPage';
import { Navigation } from '@/components/Navigation';
import { useTheme } from './components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { TopBar } from '@/components/TopBar';
import { usePaymentReturnConfirmation, useGuestPaymentReturnConfirmation } from '@/lib/payment-return';
import { closeCheckoutPopup } from '@/lib/checkout-popup';
import { usePageTitle } from '@/lib/usePageTitle';
import { Checkout } from '@/features/checkout/pages/CheckoutPage';
import { AppButton } from '@/components/primitives/AppButton';

export type AppView = 'discover' | 'tickets' | 'profile' | 'create' | 'resale' | 'settings' | 'payouts';

export const VIEW_PATHS: Record<AppView, string> = {
  discover: '/',
  tickets: '/tickets',
  profile: '/profile',
  create: '/create',
  resale: '/resale',
  settings: '/settings',
  payouts: '/payouts',
};

export function eventPath(event: Event): string {
  // Prefer the backend slug (handles duplicate titles like "…-2"); fall back
  // to a name-derived slug for mock-only events.
  if (event.slug) return `/events/${event.slug}`;
  const slug = (event.name || event.id)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `/events/${slug}`;
}

export function pathToView(pathname: string): AppView {
  if (pathname === '/tickets' || pathname.startsWith('/tickets/')) return 'tickets';
  if (pathname === '/profile') return 'profile';
  if (pathname === '/create') return 'create';
  if (pathname === '/resale' || pathname.startsWith('/resale/')) return 'resale';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/payouts') return 'payouts';
  return 'discover';
}

// Module-level so the saved feed scroll position survives any route-driven
// remount of AppContent (a component-local ref would reset and lose it).
const scrollStore = { discover: 0 };

export const ORGANIZER_APP_URL = "https://ORGANIZER_APP_URL_PLACEHOLDER"; // TODO: replace with real organizer app URL

function CreateRedirect() {
  useEffect(() => {
    window.location.href = ORGANIZER_APP_URL;
  }, []);
  return null;
}

// Restore scroll reliably: with AnimatePresence mode="wait" the feed mounts a
// few frames after navigation, and its height settles as cards lay out — so we
// re-apply the target each frame until it sticks (or we give up).
function restoreScroll(y: number) {
  let tries = 0;
  const tick = () => {
    window.scrollTo(0, y);
    if (Math.abs(window.scrollY - y) <= 2 || tries++ > 30) return;
    requestAnimationFrame(tick);
  };
  tick(); // apply now, then keep re-applying each frame until it sticks
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = pathToView(location.pathname);
  const eventSlug = useMemo(() => {
    if (!location.pathname.startsWith('/events/')) return null;
    return decodeURIComponent(location.pathname.split('/')[2] ?? '') || null;
  }, [location.pathname]);
  // `/tickets/:id` — the deep-linkable open-ticket route.
  const ticketId = useMemo(() => {
    if (!location.pathname.startsWith('/tickets/')) return null;
    return decodeURIComponent(location.pathname.split('/')[2] ?? '') || null;
  }, [location.pathname]);
  // `/resale/events/:slug` — the deep-linkable per-event resale page.
  const resaleEventSlug = useMemo(() => {
    const m = location.pathname.match(/^\/resale\/events\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) || null : null;
  }, [location.pathname]);
  // In-app navigation ships the just-fetched list event through location.state
  // (instant paint, no request). Deep links and refreshes have no state and
  // fetch the event by slug instead (gap #1b — backend public_show now serves
  // the full detail shape).
  const routeEvent = useMemo(
    () => (location.state as { event?: Event } | null)?.event ?? null,
    [location.state],
  );
  const detailQuery = useQuery({
    queryKey: eventsModule.keys.detail(eventSlug ?? ''),
    queryFn: () => eventsModule.fetchById(eventSlug!),
    enabled: !!eventSlug && !routeEvent,
  });
  // Fire the ticket-types fetch in parallel with the detail fetch. Without
  // this the products query lives in EventDetailPage and only starts once the
  // detail resolves — a serial chain that adds ~700ms to deep-link loads.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!eventSlug || routeEvent) return;
    void queryClient.prefetchQuery({
      queryKey: productsModule.keys.forEvent(eventSlug),
      queryFn: () => productsModule.fetchForEvent(eventSlug),
    });
  }, [queryClient, eventSlug, routeEvent]);
  const selectedEvent = routeEvent ?? (eventSlug && !routeEvent ? detailQuery.data ?? null : null);
  const detailLoading = !!eventSlug && !routeEvent && detailQuery.isPending;
  const detailMissing =
    !!eventSlug && !routeEvent && detailQuery.isSuccess && !detailQuery.data;

  useEffect(() => {
    if (detailMissing) navigate('/', { replace: true });
  }, [detailMissing, navigate]);
  // Dynamic document title — the tab, history, and shared links name the current
  // surface rather than a static "Digis".
  usePageTitle(useMemo(() => {
    const name =
      selectedEvent ? selectedEvent.name :
      currentView === 'tickets' ? (ticketId ? 'Ticket' : 'My Tickets') :
      currentView === 'resale' ? (resaleEventSlug ? 'Resale listing' : 'Resale') :
      currentView === 'profile' ? 'Profile' :
      currentView === 'settings' ? 'Settings' :
      currentView === 'payouts' ? 'Payouts' :
      'Discover events';
    return `${name} · Digis`;
  }, [selectedEvent, currentView, ticketId, resaleEventSlug]));
  const navigateToView = useCallback((view: AppView) => navigate(VIEW_PATHS[view]), [navigate]);
  const [resaleTicket, setResaleTicket] = useState<UserTicket | null>(null);
  // Search lives in the URL (?q=) so it is shareable, refresh-safe, and
  // back/forward-able. `searchMode` stays UI state (is the search UI active).
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = useMemo(
    () => new URLSearchParams(location.search).get('q') ?? '',
    [location.search],
  );
  const [searchMode, setSearchMode] = useState(Boolean(searchQuery));
  const setSearchQuery = useCallback((next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next) params.set('q', next);
      else params.delete('q');
      return params;
    }, { replace: true });
  }, [setSearchParams]);
  // Auth is a real route (/login, /signup). CTAs navigate there with a
  // `returnTo` so the user lands back where they were after signing in.
  const requestAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    navigate(mode === 'signup' ? '/signup' : '/login', {
      state: { returnTo: location.pathname + location.search },
    });
  }, [navigate, location.pathname, location.search]);
  const { isAuthenticated } = useAuth();
  const [heroSearchInView, setHeroSearchInView] = useState(true);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const heroSearchInputRef = useRef<HTMLInputElement>(null);
  const savedFeaturedIdx = useRef(0);
  const savedMagazineIdx = useRef(0);
  const pendingRestore = useRef(false);
  const { isDark } = useTheme();

  // Note: scroll-to-top when opening an event is handled by EventDetail's own
  // on-mount effect, which (with AnimatePresence mode="wait") runs only after
  // the feed has unmounted — doing it here would scroll the still-exiting feed
  // up to the featured listings and flash them before the detail appears.

  useEffect(() => {
    const el = heroSearchRef.current;
    if (!el) {
      setHeroSearchInView(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setHeroSearchInView(entry.isIntersecting),
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [currentView, selectedEvent]);

  const focusHeroSearch = () => {
    setSearchMode(true);
    const input = heroSearchInputRef.current;
    const el = heroSearchRef.current;
    input?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (searchQuery) setSearchMode(true);
  }, [searchQuery]);

  useEffect(() => {
    if (heroSearchInView && !searchQuery) setSearchMode(false);
  }, [heroSearchInView, searchQuery]);

  // Owner wallet — GET /tickets (real). Keyed on auth state so signing in
  // fetches (the signed-out 401 must not poison the cache) and signing out
  // drops the previous user's tickets. Disabled while signed out.
  const {
    data: userTickets = [],
    isPending: walletPending,
    isFetching: walletFetching,
    isError: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: [...ticketKeys.userTickets, isAuthenticated] as const,
    queryFn: ticketsService.fetchUserTickets,
    enabled: isAuthenticated,
    // Personal data is never "fresh" (ADR-0005: personal data staleTime 0) —
    // the wallet must show the ticket the moment the backend issues it, not
    // 60s later. The return-confirmation poll keeps it updating while a
    // payment is settling.
    staleTime: 0,
  });

  // Post-Chapa return: CHAPA_RETURN_URL lands the browser on /?status=return
  // (the checkout modal is closed by then, so modal-level detection can never
  // run). Poll the wallet for the newly issued ticket — the webhook, not the
  // redirect, is the authority — then take the buyer to their ticket.
  const isPaymentReturn =
    typeof window !== 'undefined' &&
    new URLSearchParams(location.search).get('status') === 'return';
  // Return scope = the event + payment attempt the confirmation sheet
  // reconciles against. Resolved ON DEMAND, never snapshotted at mount: the
  // in-app popup flow writes `digis:payment-id:*` (and the guest creds) AFTER
  // this component mounted, so a mount-time memo would miss them — the guest
  // refresh poll would never start and the Chapa tab would never close.
  // Keyed to the specific order when known, so a stale earlier order in
  // storage is never reconciled by mistake.
  const resolveReturnScope = (orderId?: string) => {
    const read = (key: string) =>
      sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
    let eventId: string | undefined;
    let paymentId: string | undefined;
    try {
      const urlEvent = new URLSearchParams(location.search).get('event_id');
      if (urlEvent) eventId = urlEvent;
      if (orderId) {
        eventId = eventId ?? read(`digis:payment-event:${orderId}`) ?? undefined;
        paymentId = read(`digis:payment-id:${orderId}`) ?? undefined;
      }
      for (let i = 0; !paymentId && i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith('digis:payment-id:')) {
          const v = read(k);
          if (v) paymentId = v;
        }
      }
      for (let i = 0; !eventId && i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith('digis:payment-event:')) {
          const v = sessionStorage.getItem(k);
          if (v) eventId = v;
        }
      }
    } catch { /* storage unavailable — scope stays empty */ }
    return { eventId, paymentId };
  };
  const [returnScope, setReturnScope] = useState(() => resolveReturnScope());
  const returnController = usePaymentReturnConfirmation(
    returnScope.eventId,
    userTickets,
    isAuthenticated,
    returnScope.paymentId,
  );
  const guestReturnController = useGuestPaymentReturnConfirmation(
    returnScope.eventId,
    returnScope.paymentId,
  );
  const { state: returnState, start: startReturnConfirm } = returnController;
  const { state: guestReturnState, start: startGuestReturnConfirm } = guestReturnController;

  useEffect(() => {
    if (!isPaymentReturn) return;
    const sp = new URLSearchParams(location.search);
    sp.delete('status');
    const next = sp.toString();
    navigate(location.pathname + (next ? `?${next}` : ''), { replace: true });
    setReturnScope(resolveReturnScope());
    // Return confirmation is server-verified: POST /payments/:id/refresh (or the
    // guest variant) calls the provider and returns state + issued tickets. The
    // Chapa callback reaches the backend through the public callback URL, so no
    // client-side callback replay is needed.
    if (isAuthenticated) startReturnConfirm();
    else startGuestReturnConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentReturn, isAuthenticated]);

  // Chapa V2 doesn't redirect back, so the checkout opens in a NEW tab and
  // signals THIS still-open tab (digis:awaiting-confirm) to start confirming.
  // Keep the latest start fn in a ref so the listener never needs re-binding.
  const confirmStartRef = useRef<() => void>(() => {});
  confirmStartRef.current = () => {
    // `digis:awaiting-confirm` holds the order id whose hosted checkout just
    // opened — resolve the scope for THAT order before starting the poll.
    let orderId: string | undefined;
    try { orderId = sessionStorage.getItem('digis:awaiting-confirm') ?? undefined; } catch { /* ignore */ }
    setReturnScope(resolveReturnScope(orderId));
    if (isAuthenticated) startReturnConfirm();
    else startGuestReturnConfirm();
  };
  useEffect(() => {
    const handler = () => confirmStartRef.current();
    window.addEventListener('digis:awaiting-confirm', handler);
    return () => window.removeEventListener('digis:awaiting-confirm', handler);
  }, []);

  // When the payment resolves, CLOSE the Chapa tab so the buyer is returned to
  // Digis (Chapa V2 never redirects back). Drop the awaiting flag either way so
  // a later load doesn't re-start the poll.
  useEffect(() => {
    const confirmed = returnState.kind === 'confirmed' || guestReturnState.kind === 'confirmed';
    const done =
      returnState.kind === 'timeout' || returnState.kind === 'terminal' ||
      guestReturnState.kind === 'timeout' || guestReturnState.kind === 'terminal';
    if (confirmed) closeCheckoutPopup();
    if (confirmed || done) {
      try { sessionStorage.removeItem('digis:awaiting-confirm'); } catch { /* ignore */ }
    }
  }, [returnState.kind, guestReturnState.kind]);

  const confirmedTicket =
    returnState.kind === 'confirmed' ? returnState.ticket : null;
  const guestConfirmedTicket =
    guestReturnState.kind === 'confirmed' ? guestReturnState.ticket : null;
  // Snapshot of the last confirmed purchase — survives `returnController.stop()`
  // so the tickets view can open the ticket QR without waiting for the wallet.
  const lastConfirmedTicketRef = useRef<UserTicket | null>(null);
  const returnConfirming = isAuthenticated
    ? returnState.kind === 'confirming'
    : guestReturnState.kind === 'confirming';
  const returnTimedOut = isAuthenticated
    ? returnState.kind === 'timeout'
    : guestReturnState.kind === 'timeout';
  const returnTerminal = isAuthenticated
    ? returnState.kind === 'terminal'
    : guestReturnState.kind === 'terminal';
  // Fresh wallet on every arrival at /tickets: a ticket the backend issued
  // moments ago (webhook → outbox → issue) must show up, not a cached list
  // from before the purchase.
  useEffect(() => {
    if (currentView === 'tickets' && isAuthenticated) {
      void refetchWallet();
    }
  }, [currentView, isAuthenticated, refetchWallet]);

  const closeReturn = () => {
    if (isAuthenticated) {
      if (returnConfirming) returnController.dismiss();
      else returnController.stop();
    } else {
      if (returnConfirming) guestReturnController.dismiss();
      else guestReturnController.stop();
    }
    navigateToView('tickets');
  };

  return (
    <div
      className="relative min-h-screen transition-colors duration-500 scrollbar-hide"
      style={{
        fontFamily: "'Inter', sans-serif",
        overflowX: 'clip',
        background: isDark ? '#0a0a0a' : '#f8f7fc',
        color: isDark ? '#fff' : '#1a1a1a',
      }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            opacity: isDark ? 0.02 : 0.015,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />
      </div>

      {!selectedEvent && (
        <TopBar
          currentView={currentView}
          showSearchButton={currentView === 'discover' && !heroSearchInView}
          onSearchClick={focusHeroSearch}
          onRequestAuth={requestAuth}
          onNavigate={(view) => {
            if (view !== 'resale') setResaleTicket(null);
            navigateToView(view);
          }}
        />
      )}

      <div className="relative">
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            // Restore the feed scroll only after the detail has fully unmounted,
            // so we never scroll the outgoing detail page (which flashed the
            // ticket section before).
            if (pendingRestore.current) {
              pendingRestore.current = false;
              restoreScroll(scrollStore.discover);
            }
          }}
        >
          {selectedEvent ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.4 }}
            >
              <EventDetail
                event={selectedEvent}
                onBack={() => {
                  pendingRestore.current = true;
                  navigate('/');
                }}
                onPurchase={() => navigateToView('tickets')}
                onNavigate={(view) => navigateToView(view as AppView)}
              />
            </motion.div>
          ) : detailLoading ? (
            // Deep-link fetch in flight. Deliberately NOT the mock feed —
            // mock must never appear while loading (user rule).
            <motion.div key="detail-loading">
              <EventDetailSkeleton />
            </motion.div>
          ) : detailQuery.isError ? (
            // A transient failure is NOT a missing event: show an error with
            // retry instead of silently bouncing to discovery.
            <motion.div
              key="detail-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[70vh] flex items-center justify-center px-5"
            >
              <div
                className="relative w-full max-w-md rounded-[28px] p-8 text-center"
                style={{
                  background: isDark ? '#0f0f10' : '#ffffff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} strokeWidth={1.8} />
                </div>
                <h1
                  className="text-[22px] font-light tracking-[-0.3px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#0a0a0a' }}
                >
                  Couldn't load this event
                </h1>
                <p
                  className="mt-2 text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}
                >
                  Something went wrong while loading the event. Check your connection and try again.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <AppButton
                    onClick={() => void detailQuery.refetch()}
                    className="px-5 py-3 rounded-full cursor-pointer"
                    style={{ background: '#d6f905', color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}
                  >
                    Try again
                  </AppButton>
                  <AppButton
                    onClick={() => navigate('/')}
                    className="px-5 py-3 rounded-full cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? '#fff' : '#0a0a0a',
                      fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Browse events
                  </AppButton>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              {currentView === 'discover' ? (
                <EventDiscovery
                  onSelectEvent={(event) => {
                    scrollStore.discover = window.scrollY;
                    navigate(eventPath(event), { state: { event } });
                  }}
                  initialFeaturedIdx={savedFeaturedIdx.current}
                  onFeaturedIdxChange={(i) => { savedFeaturedIdx.current = i; }}
                  initialMagazineIdx={savedMagazineIdx.current}
                  onMagazineIdxChange={(i) => { savedMagazineIdx.current = i; }}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  heroSearchRef={heroSearchRef}
                  heroSearchInputRef={heroSearchInputRef}
                  searchMode={searchMode}
                  onSearchModeChange={setSearchMode}
                />
              ) : currentView === 'tickets' ? (
                <TicketView
                  tickets={userTickets}
                  initialOpenTicket={lastConfirmedTicketRef.current ?? confirmedTicket}
                  selectedTicketId={ticketId}
                  onOpenTicket={(id) => navigate(`/tickets/${encodeURIComponent(id)}`)}
                  onCloseTicket={() => navigate('/tickets', { replace: true })}
                  loading={isAuthenticated && walletPending}
                  refreshing={isAuthenticated && walletFetching && !walletPending}
                  loadError={isAuthenticated && walletError}
                  onRetry={() => void refetchWallet()}
                  isAuthenticated={isAuthenticated}
                  onRequestAuth={requestAuth}
                  onDiscover={() => navigateToView('discover')} onListForResale={(ticket) => {
                  setResaleTicket(ticket);
                  navigateToView('resale');
                }} />
              ) : currentView === 'profile' ? (
                isAuthenticated ? (
                  <UserProfile
                    tickets={userTickets}
                    loading={isAuthenticated && walletPending}
                    onOpenSettings={() => navigateToView('settings')}
                  />
                ) : (
                  <SignInGate isDark={isDark} onSignIn={requestAuth} />
                )
              ) : currentView === 'create' ? (
                null
              ) : currentView === 'resale' ? (
                <ResaleMarketplace
                  userTickets={userTickets}
                  initialListTicket={resaleTicket}
                  selectedEventSlug={resaleEventSlug}
                  onOpenEvent={(slug) => navigate(`/resale/events/${encodeURIComponent(slug)}`)}
                  onCloseEvent={() => navigate('/resale')}
                />
              ) : currentView === 'settings' ? (
                <SettingsView
                  onBack={() => navigateToView('profile')}
                  onRequestAuth={requestAuth}
                />
              ) : currentView === 'payouts' ? (
                isAuthenticated ? (
                  <PayoutsView onBack={() => navigateToView('profile')} />
                ) : (
                  <SignInGate isDark={isDark} onSignIn={requestAuth} />
                )
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!selectedEvent && (
        <div className="lg:hidden">
          <Navigation
            currentView={currentView}
            onRequestAuth={requestAuth}
            onNavigate={(view) => {
              if (view !== 'resale') setResaleTicket(null);
              navigateToView(view);
            }}
          />
        </div>
      )}

      {/* Returned from Chapa as an unauthenticated user. If guest credentials
          are stored (guest checkout flow), the guest return confirmation starts
          automatically. Otherwise the session probably expired — offer login. */}
      <AnimatePresence>
        {isPaymentReturn && !isAuthenticated && guestReturnState.kind === 'idle' && (
          <motion.div
            key="payment-return-login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: 'rgba(4,4,4,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
          >
            <div
              className="w-full max-w-sm rounded-[28px] px-7 py-12 flex flex-col items-center"
              style={{
                background: isDark ? '#0a0a0a' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(217,255,0,0.18)' : 'rgba(214,249,5,0.12)'}`,
              }}
            >
              <h3
                className="text-[20px] font-light mb-2 text-center"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}
              >
                Welcome back
              </h3>
              <p
                className="text-[12px] max-w-[280px] text-center mb-6"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)' }}
              >
                Your session expired while you were paying. Log in again and we&apos;ll confirm your payment and show
                your ticket.
              </p>
              <button
                onClick={() => requestAuth('signin')}
                className="w-full py-3.5 rounded-2xl cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)',
                  color: '#000',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Log in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

{/* Post-Chapa return — shown inside the SAME checkout modal the buyer left:
          "Securing your spot" (checkout) → "Confirming your payment" →
          "You're going!" all live in this sheet. */}
      {(() => {
        const activeConfirmed = isAuthenticated ? confirmedTicket : guestConfirmedTicket;
        const activeDismissed = isAuthenticated
          ? returnController.dismissed
          : guestReturnController.dismissed;
        if (activeDismissed) return null;
        if (!returnConfirming && !returnTimedOut && !returnTerminal && !activeConfirmed) return null;
        return (
          <Checkout
            event={{ name: activeConfirmed?.eventName ?? '', date: activeConfirmed?.eventDate ?? '', time: activeConfirmed?.eventTime ?? '', venue: '' }}
            ticketType={activeConfirmed?.ticketType ?? ''}
            ticketLevel=""
            basePrice={0}
            returnMode={{
              confirming: returnConfirming,
              timedOut: returnTimedOut,
              terminal: returnTerminal,
              // A guest return that couldn't be verified (stale checkout creds,
              // throttled, or storage cleared) must not be told "payment failed /
              // nothing was charged" — the payment may well have succeeded. Point
              // them at the SMS link and the on-device wallet instead.
              terminalMessage: !isAuthenticated && returnTerminal
                ? "We couldn't verify this purchase from here. If you completed the payment, your ticket was sent by SMS and is available under Tickets on this device."
                : undefined,
              confirmedTicket: activeConfirmed,
              onViewTicket: () => {
                const id = activeConfirmed?.id;
                const controller = isAuthenticated ? returnController : guestReturnController;
                lastConfirmedTicketRef.current = activeConfirmed;
                controller.stop();
                navigate(id ? `/tickets/${encodeURIComponent(id)}` : '/tickets');
              },
              onGoToTickets: closeReturn,
            }}
            onClose={closeReturn}
            onComplete={closeReturn}
          />
        );
      })()}
    </div>
  );
}

function SignInGate({ isDark, onSignIn }: { isDark: boolean; onSignIn: () => void }) {
  return (
    <div className="px-6 pt-24 pb-20 flex flex-col items-center text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: isDark ? 'rgba(217,255,0,0.08)' : 'rgba(214,249,5,0.1)',
          border: `1px solid ${isDark ? 'rgba(217,255,0,0.2)' : 'rgba(214,249,5,0.25)'}`,
        }}
      >
        <UserCircle className="w-8 h-8" strokeWidth={1.5} style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
      </div>
      <h2
        className="text-[24px] font-light mb-2"
        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}
      >
        Log in to your profile
      </h2>
      <p
        className="text-[13px] leading-relaxed max-w-[300px] mb-7"
        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)' }}
      >
        Your tickets, transfers, and saved events live here. You can still browse and buy as a guest anytime.
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onSignIn}
        className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full cursor-pointer"
        style={{
          background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
          color: isDark ? '#000' : '#fff',
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          letterSpacing: '0.5px',
          fontWeight: 600,
        }}
      >
        <LogIn className="w-4 h-4" strokeWidth={2} />
        Log in or create account
      </motion.button>
    </div>
  );
}

/**
 * Standalone auth route (`/login`, `/signup`). The modal IS the page, so its
 * presence is exactly the route — deterministic on direct link, refresh, and
 * Back. `returnTo` travels in route state (relative-only) so a signed-in or
 * dismissed modal returns the user where they came from.
 */
function AuthRoute({ mode }: { mode: 'signin' | 'signup' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  usePageTitle(mode === 'signup' ? 'Create account · Digis' : 'Log in · Digis');
  const state = location.state as { returnTo?: string } | null;
  const returnTo =
    state?.returnTo && state.returnTo.startsWith('/') && !state.returnTo.startsWith('//')
      ? state.returnTo
      : '/';
  // Already signed in (e.g. a reload lands here mid-success): don't show the
  // auth form — go straight back. Captured once so logging in via this route
  // still shows the success beat before closing.
  const authedOnMount = useRef(isAuthenticated).current;
  useEffect(() => {
    if (authedOnMount) navigate(returnTo, { replace: true });
  }, [authedOnMount, navigate, returnTo]);
  const close = () => navigate(returnTo, { replace: true });
  const switchMode = (next: 'signin' | 'signup') =>
    navigate(next === 'signup' ? '/signup' : '/login', { replace: true, state: { returnTo } });
  return <AuthModal key={mode} initialMode={mode} onModeChange={switchMode} onClose={close} />;
}

function AuthLoginRoute() { return <AuthRoute mode="signin" />; }
function AuthSignupRoute() { return <AuthRoute mode="signup" />; }

/**
 * `/resale/listings/:id` — the shareable listing link. Resolves the listing
 * (public detail) and opens its event's resale page, so a shared listing id
 * lands on a stable, meaningful URL. A gone listing falls back to a notice.
 */
function ResaleListingRedirect() {
  const { listingId = '' } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    resaleModule.fetchListingDetail(listingId)
      .then((listing) => {
        if (!alive) return;
        if (listing.eventSlug) navigate(`/resale/events/${encodeURIComponent(listing.eventSlug)}`, { replace: true });
        else setFailed(true);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [listingId, navigate]);
  if (!failed) return null;
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[15px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          This listing is no longer available.
        </p>
        <AppButton onClick={() => navigate('/resale')} className="px-5 py-3 rounded-full cursor-pointer"
          style={{ background: '#d6f905', color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
          Browse resale
        </AppButton>
      </div>
    </div>
  );
}

function ClaimRoute() {
  const navigate = useNavigate();
  usePageTitle('Claim your ticket · Digis');
  const [authModal, setAuthModal] = useState<null | 'signin' | 'signup'>(null);
  const { isDark } = useTheme();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  return (
    <div
      className="relative min-h-screen"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: isDark ? '#0a0a0a' : '#f8f7fc',
        color: isDark ? '#fff' : '#1a1a1a',
      }}
    >
      <ClaimTicketPage
        id={id}
        token={token}
        onRequestAuth={() => setAuthModal('signin')}
        onNavigateHome={() => navigate(VIEW_PATHS.discover)}
        onNavigateTickets={() => navigate(VIEW_PATHS.tickets)}
      />
      <AnimatePresence>
        {authModal && <AuthModal onClose={() => setAuthModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

export function AppRouterProvider() {
  // Create the router lazily inside the component so it is always constructed
  // inside the React tree (and therefore inside AuthProvider / ThemeProvider).
  // useState with an initialiser guarantees it runs exactly once, on first
  // render, never at module-evaluation time.
  const [router] = useState(() =>
    createBrowserRouter([
      { path: '/', Component: AppContent },
      { path: '/events/:eventTitle', Component: AppContent },
      { path: '/tickets', Component: AppContent },
      { path: '/tickets/:ticketId', Component: AppContent },
      { path: '/profile', Component: AppContent },
      { path: '/resale', Component: AppContent },
      { path: '/resale/events/:eventSlug', Component: AppContent },
      { path: '/resale/listings/:listingId', Component: ResaleListingRedirect },
      { path: '/create', Component: CreateRedirect },
      { path: '/settings', Component: AppContent },
      { path: '/payouts', Component: AppContent },
      { path: '/login', Component: AuthLoginRoute },
      { path: '/signup', Component: AuthSignupRoute },
      { path: '/claim/:id', Component: ClaimRoute },
      // UI preview is a dev-only design sandbox; it is not registered in prod.
      ...(import.meta.env.DEV ? [{ path: '/ui-preview', Component: UIPreviewPage }] : []),
    ])
  );
  return <RouterProvider router={router} />;
}
