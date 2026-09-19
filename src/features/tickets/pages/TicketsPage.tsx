import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/app/components/ThemeContext';
import { TransferTicket } from '@/features/tickets/components/TransferTicketDialog';
import { ShareCard } from '@/features/tickets/components/ShareCard';
import { DetailedTicket } from '@/features/tickets/components/DetailedTicket';
import { DownloadableTicketCard } from '@/features/tickets/components/DownloadableTicketCard';
import { GlassTicketCard } from '@/features/tickets/components/GlassTicketCard';
import { TicketsEmptyState } from '@/features/tickets/components/TicketsEmptyState';
import { EditTicketAnswersDialog } from '@/features/tickets/components/EditTicketAnswersDialog';
import { AddExtrasDialog } from '@/features/tickets/components/AddExtrasDialog';
import { ExtrasOnlyCheckout } from '@/features/checkout/components/ExtrasOnlyCheckout';
import { useTicketGroups } from '@/features/tickets/hooks/useTicketGroups';
import { toPng } from 'html-to-image';
import { ticketsService, ticketKeys } from '@/lib/tickets';
import { productsModule } from '@/lib/products';
import { LoadErrorCard, TicketRowSkeleton, useShowSkeleton } from '@/components/loading';
import { transferService, buildClaimLink } from '@/lib/transfer';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { EventProduct, SelectedEventProduct, UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { useGuestDeviceTickets } from '@/features/tickets/hooks/useGuestDeviceTickets';
import { ClaimGuestSheet } from '@/features/tickets/components/ClaimGuestSheet';
import { toastError } from '@/lib/feedback';

interface TicketViewProps {
  tickets: UserTicket[];
  onListForResale?: (ticket: UserTicket) => void;
  onDiscover?: () => void;
  /** Wallet not yet resolved — row skeletons in the card's own layout. */
  loading?: boolean;
  refreshing?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  /** Just-confirmed purchase (post-Chapa). Open its QR immediately instead of
   *  waiting for the wallet refetch to settle the ticket into `tickets`. */
  initialOpenTicket?: UserTicket | null;
  /** Signed out — the wallet query is disabled; show the device guest wallet. */
  isAuthenticated?: boolean;
  /** Opens the auth modal (claim path for durable cross-device tickets). */
  onRequestAuth?: () => void;
  /** Route-driven open ticket (`/tickets/:id`) — the deep-linkable selection. */
  selectedTicketId?: string | null;
  onOpenTicket?: (id: string) => void;
  onCloseTicket?: () => void;
}

export function TicketView({ tickets, onListForResale, onDiscover, loading = false, refreshing = false, loadError = false, onRetry, initialOpenTicket, isAuthenticated = true, onRequestAuth, selectedTicketId = null, onOpenTicket, onCloseTicket }: TicketViewProps) {
  const [showQR, setShowQR] = useState(false);
  const [transferringTicket, setTransferringTicket] = useState<UserTicket | null>(null);
  const [sharingTicket, setSharingTicket] = useState<UserTicket | null>(null);
  const [editingAnswersTicket, setEditingAnswersTicket] = useState<UserTicket | null>(null);
  const [answerSaveError, setAnswerSaveError] = useState('');
  const [claimingTicket, setClaimingTicket] = useState<UserTicket | null>(null);
  const [addingExtrasTicket, setAddingExtrasTicket] = useState<UserTicket | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Signed-out buyers see tickets purchased on this device (encrypted at rest)
  // merged into the normal upcoming/past list, not a separate section.
  const guestDevice = useGuestDeviceTickets();
  // When signed out, the account wallet is empty and the on-device guest
  // tickets ARE the collection — render them like any other ticket.
  const combinedTickets: UserTicket[] = isAuthenticated
    ? tickets
    : [...tickets, ...guestDevice.tickets];
  const deviceCount = guestDevice.tickets.length;
  // The open ticket is route-driven (`/tickets/:id`) so it is deep-linkable and
  // Back closes it. `pendingOpenTicket` covers the post-purchase instant-open
  // (the confirmed ticket before the wallet refetch settles) when no route id
  // is present. `setSelectedTicket` keeps the existing call sites working:
  // opening navigates, closing returns to /tickets.
  const [pendingOpenTicket, setPendingOpenTicket] = useState<UserTicket | null>(null);
  const routeOpenTicket = selectedTicketId
    ? combinedTickets.find((t) => t.id === selectedTicketId) ?? null
    : null;
  const selectedTicket = selectedTicketId ? routeOpenTicket : pendingOpenTicket;
  const setSelectedTicket = (ticket: UserTicket | null) => {
    if (ticket) {
      setPendingOpenTicket(null);
      if (onOpenTicket) onOpenTicket(ticket.id);
      else setPendingOpenTicket(ticket);
    } else {
      setPendingOpenTicket(null);
      if (onCloseTicket) onCloseTicket();
    }
  };
  const updateAnswersMutation = useMutation({
    mutationKey: ['tickets', 'answers'],
    mutationFn: ({ ticketId, answers }: { ticketId: string; answers: Record<string, unknown> }) => ticketsService.updateTicketAnswers(ticketId, answers),
    onSuccess: () => { setAnswerSaveError(''); setEditingAnswersTicket(null); queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets }); },
    onError: (error: Error) => setAnswerSaveError(error.message),
  });
  // Real extras-only checkout: opens the Chapa payment flow for just the extras
  // (no ticket) instead of the mock purchaseTicketExtras (which only mutates the
  // in-memory store and fails for live wallet tickets).
  const [extrasCheckout, setExtrasCheckout] = useState<{ ticket: UserTicket; products: EventProduct[] } | null>(null);
  const [extrasProducts, setExtrasProducts] = useState<EventProduct[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasError, setExtrasError] = useState(false);
  const [extrasReload, setExtrasReload] = useState(0);
  // Fetch the ticket's event extras when the Add Extras dialog opens — the
  // dialog offers what the backend actually sells for that event (parking,
  // merch, food, ...). An empty list with no error = genuinely no extras; a
  // failed fetch is tracked separately so it never masquerades as "none".
  useEffect(() => {
    if (!addingExtrasTicket?.eventSlug) {
      setExtrasProducts([]);
      setExtrasError(false);
      return;
    }
    let alive = true;
    setExtrasLoading(true);
    setExtrasError(false);
    productsModule.fetchForEvent(addingExtrasTicket.eventSlug)
      .then(({ extras }) => { if (alive) setExtrasProducts(extras); })
      .catch(() => { if (alive) { setExtrasProducts([]); setExtrasError(true); } })
      .finally(() => { if (alive) setExtrasLoading(false); });
    return () => { alive = false; };
  }, [addingExtrasTicket, extrasReload]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  // Just-returned-from-Chapa: the router opens `/tickets/:id` and also passes the
  // confirmed ticket (with its QR) from the refresh projection, so open it
  // instantly rather than waiting for the wallet refetch. Only used when no
  // route id is present (the route is the source of truth once it is).
  const initialRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialOpenTicket && initialRef.current !== initialOpenTicket.id) {
      initialRef.current = initialOpenTicket.id;
      setPendingOpenTicket(initialOpenTicket);
      setShowQR(true);
      setDownloadDone(false);
    }
  }, [initialOpenTicket]);

  const { upcoming, past } = useTicketGroups(combinedTickets);

  const visibleTickets = tab === 'upcoming' ? upcoming : past;
  const showLoading = useShowSkeleton(loading);

  const handleDownload = useCallback(async () => {
    if (!selectedTicket || !downloadRef.current) return;
    setDownloading(true);
    setDownloadDone(false);
    try {
      // Small delay to ensure the offscreen card is fully rendered
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(downloadRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${selectedTicket.eventName.replace(/\s+/g, '_')}_ticket.png`;
      link.click();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch (err) {
      toastError(err, 'Couldn’t save your ticket image. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [selectedTicket]);

  return (
    <div className="min-h-screen pb-32 lg:pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 lg:pt-14 pb-2">
        <p className="text-[11px] tracking-[3px] uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
          Your Collection
        </p>
        <h1 className="text-[32px] font-light tracking-[-0.5px]"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
          Tickets
        </h1>
        <p className="text-[13px] mt-1"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }}>
          {showLoading ? '…' : `${upcoming.length} upcoming · ${past.length} past${deviceCount > 0 ? ` · ${deviceCount} on this device` : ''}`}
          {refreshing && !showLoading && (
            <span className="ml-2 text-[11px]">Refreshing…</span>
          )}
        </p>
      </motion.div>

      {/* Signed-out + device tickets: a subtle notice + manage row. The tickets
          themselves render in the normal list below. */}
      {!isAuthenticated && deviceCount > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
            Stored on this device
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={guestDevice.clearAll}
              className="text-[11px] cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              Clear
            </button>
            <button
              onClick={onRequestAuth ?? (() => {})}
              className="text-[11px] underline underline-offset-2 cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? '#d6f905' : '#0a0a0a' }}
            >
              Create an account to keep them
            </button>
          </div>
        </div>
      )}

      {/* Segmented control */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <div
          className="relative grid grid-cols-2 rounded-2xl p-1 overflow-hidden"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)',
            border: `1px solid ${isDark ? 'rgba(217,255,0,0.15)' : 'rgba(214,249,5,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <motion.div
            layout
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl"
            style={{
              left: tab === 'upcoming' ? '4px' : 'calc(50% + 0px)',
              background: isDark
                ? 'linear-gradient(135deg, rgba(217,255,0,0.35), rgba(214,249,5,0.2))'
                : 'linear-gradient(135deg, rgba(214,249,5,0.95), rgba(214,249,5,0.8))',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.08)'
                : 'none',
            }}
          />
          {(['upcoming', 'past'] as const).map(k => {
            const active = tab === k;
            const count = k === 'upcoming' ? upcoming.length : past.length;
            return (
              <AppButton
                key={k}
                onClick={() => setTab(k)}
                className="relative z-10 py-2.5 text-[12px] tracking-[1.5px] uppercase flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: active
                    ? (isDark ? '#fff' : '#0a0a0a')
                    : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)'),
                  transition: 'color 0.25s',
                }}
              >
                {k}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px]"
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)'),
                  }}
                >
                  {count}
                </span>
              </AppButton>
            );
          })}
        </div>
      </div>

      {/* Tickets */}
      {loadError ? (
        <LoadErrorCard onRetry={onRetry ?? (() => {})} />
      ) : showLoading ? (
        <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-6 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          <TicketRowSkeleton />
          <TicketRowSkeleton />
          <TicketRowSkeleton />
        </div>
      ) : (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-6 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
        {visibleTickets.map((ticket, index) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 30, rotateX: 5 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: index * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ perspective: '1000px' }}
          >
            <GlassTicketCard ticket={ticket} onClick={() => { setSelectedTicket(ticket); setShowQR(false); setDownloadDone(false); }} />
          </motion.div>
        ))}
      </div>
      )}

      {!showLoading && !loadError && visibleTickets.length === 0 && (
        <TicketsEmptyState tab={tab} isDark={isDark} onDiscover={onDiscover} />
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-5"
            onClick={() => setSelectedTicket(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" style={{ background: isDark ? 'rgba(8,8,8,0.85)' : 'rgba(232,230,242,0.82)', backdropFilter: 'blur(40px)' }} />
            <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[28px]">
              <DetailedTicket ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onTransfer={() => { setTransferringTicket(selectedTicket); setSelectedTicket(null); }}
                onShare={() => { setSharingTicket(selectedTicket); setSelectedTicket(null); }}
                onResell={selectedTicket.status === 'active' && onListForResale ? () => { onListForResale(selectedTicket); setSelectedTicket(null); } : undefined}
                onEditAnswers={selectedTicket.customQuestions?.length && selectedTicket.answersEditableUntil && Date.parse(selectedTicket.answersEditableUntil) > Date.now() ? () => { setAnswerSaveError(''); setEditingAnswersTicket(selectedTicket); setSelectedTicket(null); } : undefined}
                onAddExtras={selectedTicket.eventSlug ? () => { setAddingExtrasTicket(selectedTicket); setSelectedTicket(null); } : undefined}
                onClaim={!isAuthenticated && selectedTicket.registrationId && selectedTicket.ticketViewToken ? () => { setClaimingTicket(selectedTicket); setSelectedTicket(null); } : undefined}
                onDownload={handleDownload}
                downloading={downloading}
                downloadDone={downloadDone} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {addingExtrasTicket && (
          <AddExtrasDialog
            ticket={addingExtrasTicket}
            products={extrasProducts}
            isLoading={extrasLoading}
            error={extrasError}
            onRetry={() => setExtrasReload((n) => n + 1)}
            onClose={() => setAddingExtrasTicket(null)}
            onConfirm={(items) => {
              const ticket = addingExtrasTicket;
              if (!ticket.eventId || !items.length) return;
              // Open the real extras-only checkout with the picked items.
              setExtrasCheckout({ ticket, products: extrasProducts });
              setAddingExtrasTicket(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {extrasCheckout && (
          <ExtrasOnlyCheckout
            event={{ name: extrasCheckout.ticket.eventName, date: extrasCheckout.ticket.eventDate, time: extrasCheckout.ticket.eventTime, venue: extrasCheckout.ticket.venue }}
            eventId={extrasCheckout.ticket.eventId!}
            products={extrasCheckout.products}
            onClose={() => setExtrasCheckout(null)}
            onComplete={() => { setExtrasCheckout(null); queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets }); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAnswersTicket && (
          <EditTicketAnswersDialog
            ticket={editingAnswersTicket}
            isSaving={updateAnswersMutation.isPending}
            saveError={answerSaveError}
            onClose={() => { if (!updateAnswersMutation.isPending) setEditingAnswersTicket(null); }}
            onSave={(answers) => updateAnswersMutation.mutate({ ticketId: editingAnswersTicket.id, answers })}
          />
        )}
      </AnimatePresence>

      {/* Guest ticket → account claim (#31) */}
      <AnimatePresence>
        {claimingTicket && (
          <ClaimGuestSheet
            ticket={claimingTicket}
            onClose={() => setClaimingTicket(null)}
            onClaimed={() => {
              setClaimingTicket(null);
              // The account wallet now owns this ticket — refetch it.
              queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
            }}
          />
        )}
      </AnimatePresence>

      {/* Offscreen downloadable ticket card */}
      {selectedTicket && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <DownloadableTicketCard ref={downloadRef} ticket={selectedTicket} />
        </div>
      )}

      {/* Transfer Flow */}
      <AnimatePresence>
        {transferringTicket && (
          <TransferTicket
            ticket={transferringTicket}
            onClose={() => setTransferringTicket(null)}
            onTransfer={async ({ contactValue, note }) => {
              const result = await transferService.initiate({
                ticketId: transferringTicket.id,
                phone: contactValue,
                note,
              });
              return {
                shareLink: buildClaimLink(result.transferId, result.token),
                recipientHasAccount: false,
              };
            }}
          />
        )}
      </AnimatePresence>

      {/* Share Card */}
      <AnimatePresence>
        {sharingTicket && (
          <ShareCard
            event={{
              name: sharingTicket.eventName,
              date: sharingTicket.eventDate,
              time: sharingTicket.eventTime,
              venue: sharingTicket.venue,
              image: sharingTicket.image || '',
            }}
            ticketType={sharingTicket.ticketType}
            purchased
            onClose={() => setSharingTicket(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DOWNLOADABLE TICKET CARD (rendered offscreen, captured as PNG)
   ═══════════════════════════════════════════════════════ */
