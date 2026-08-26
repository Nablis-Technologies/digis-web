import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback } from 'react';
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
import { useTicketGroups } from '@/features/tickets/hooks/useTicketGroups';
import { toPng } from 'html-to-image';
import { ticketsService, ticketKeys } from '@/services/tickets.service';
import { transferService } from '@/services/transfer.service';
import { eventsService } from '@/services/events.service';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { SelectedEventProduct, UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

interface TicketViewProps {
  tickets: UserTicket[];
  onListForResale?: (ticket: UserTicket) => void;
  onDiscover?: () => void;
}

export function TicketView({ tickets, onListForResale, onDiscover }: TicketViewProps) {
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [transferringTicket, setTransferringTicket] = useState<UserTicket | null>(null);
  const [sharingTicket, setSharingTicket] = useState<UserTicket | null>(null);
  const [editingAnswersTicket, setEditingAnswersTicket] = useState<UserTicket | null>(null);
  const [answerSaveError, setAnswerSaveError] = useState('');
  const [addingExtrasTicket, setAddingExtrasTicket] = useState<UserTicket | null>(null);
  const [extrasDone, setExtrasDone] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateAnswersMutation = useMutation({
    mutationKey: ['tickets', 'answers'],
    mutationFn: ({ ticketId, answers }: { ticketId: string; answers: Record<string, unknown> }) => ticketsService.updateTicketAnswers(ticketId, answers),
    onSuccess: () => { setAnswerSaveError(''); setEditingAnswersTicket(null); queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets }); },
    onError: (error: Error) => setAnswerSaveError(error.message),
  });
  const addExtrasMutation = useMutation({
    mutationKey: ['tickets', 'extras'],
    mutationFn: ({ ticketId, items }: { ticketId: string; items: SelectedEventProduct[] }) => ticketsService.purchaseTicketExtras(ticketId, items),
    onSuccess: () => {
      setExtrasDone(true);
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      setTimeout(() => { setAddingExtrasTicket(null); setExtrasDone(false); }, 1200);
    },
  });
  const extrasProducts = addingExtrasTicket?.eventId
    ? eventsService.initialData.find((e) => e.id === addingExtrasTicket.eventId)?.products ?? []
    : [];
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { upcoming, past } = useTicketGroups(tickets);

  const visibleTickets = tab === 'upcoming' ? upcoming : past;

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
      console.error('Failed to download ticket:', err);
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
          {upcoming.length} upcoming · {past.length} past
        </p>
      </motion.div>

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

      {visibleTickets.length === 0 && (
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
                onResell={() => { if (onListForResale) { onListForResale(selectedTicket); setSelectedTicket(null); } }}
                onEditAnswers={selectedTicket.customQuestions?.length && selectedTicket.answersEditableUntil && Date.parse(selectedTicket.answersEditableUntil) > Date.now() ? () => { setAnswerSaveError(''); setEditingAnswersTicket(selectedTicket); setSelectedTicket(null); } : undefined}
                onAddExtras={selectedTicket.eventId && (eventsService.initialData.find((e) => e.id === selectedTicket.eventId)?.products?.length) ? () => { setExtrasDone(false); setAddingExtrasTicket(selectedTicket); setSelectedTicket(null); } : undefined}
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
            isSaving={addExtrasMutation.isPending}
            done={extrasDone}
            onClose={() => setAddingExtrasTicket(null)}
            onConfirm={(items) => addExtrasMutation.mutate({ ticketId: addingExtrasTicket.id, items })}
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
            onTransfer={async ({ recipientName, contactMethod, contactValue, note }) => {
              const result = transferService.sendTransfer({
                fromName: user?.name || 'A friend',
                recipientName,
                contactMethod,
                contactValue,
                note,
                ticket: {
                  id: transferringTicket.id,
                  eventId: transferringTicket.eventId,
                  eventName: transferringTicket.eventName,
                  eventDate: transferringTicket.eventDate,
                  eventTime: transferringTicket.eventTime,
                  venue: transferringTicket.venue,
                  ticketType: transferringTicket.ticketType,
                  ticketLevel: transferringTicket.ticketLevel,
                  image: transferringTicket.image,
                  seat: transferringTicket.seat,
                },
              });
              queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
              return { shareLink: result.link, recipientHasAccount: result.recipientHasAccount };
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
