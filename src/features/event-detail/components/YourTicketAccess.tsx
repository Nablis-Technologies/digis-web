import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { BadgeCheck, ChevronRight, Clock, QrCode } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ticketKeys, ticketsService } from '@/lib/tickets';
import { DetailedTicket } from '@/features/tickets/components/DetailedTicket';
import { DownloadableTicketCard } from '@/features/tickets/components/DownloadableTicketCard';
import type { UserTicket } from '@/types';
import { tierTheme } from '@/lib/utils/tierTheme';
import { AppButton } from '@/components/primitives/AppButton';

/**
 * Second access point for a ticket the user already owns.
 *
 * Someone at the door is as likely to open the event page as My Tickets, so if
 * they hold a ticket for this event we surface it right here: a compact pass with
 * a live QR that expands into the full ticket view. Actions that belong to the
 * wallet (transfer, resell, share) hand off to My Tickets rather than being
 * duplicated; saving for offline works inline because that's the one thing you
 * want at the gate with no signal.
 */
export function YourTicketAccess({ eventId, eventName, onNavigate }: {
  eventId: string;
  eventName: string;
  onNavigate?: (view: string) => void;
}) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [openTicket, setOpenTicket] = useState<UserTicket | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Shares the router's auth-aware wallet query (keyed on auth state, disabled
  // while signed out — a signed-out fetch would 401 on every event page).
  const { data: tickets = [] } = useQuery({
    queryKey: [...ticketKeys.userTickets, isAuthenticated] as const,
    queryFn: ticketsService.fetchUserTickets,
    enabled: isAuthenticated,
  });

  const mine = tickets.filter(
    (t) => (eventId && t.eventId === eventId) || t.eventName === eventName,
  );

  const handleDownload = useCallback(async () => {
    if (!openTicket || !downloadRef.current) return;
    setDownloading(true);
    setDownloadDone(false);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(downloadRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${openTicket.eventName.replace(/\s+/g, '_')}_ticket.png`;
      link.click();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch (err) {
      console.error('Failed to download ticket:', err);
    } finally {
      setDownloading(false);
    }
  }, [openTicket]);

  if (!mine.length) return null;

  const accent = isDark ? '#d6f905' : '#5f7504';
  const ink = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(20,18,40,0.92)';
  const inkSoft = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(20,18,40,0.55)';
  const hairline = isDark ? 'rgba(214,249,5,0.18)' : 'rgba(20,18,40,0.1)';


  const tierTagStyle = (ticket: UserTicket) => {
    const tier = tierTheme(ticket.ticketType, ticket.ticketLevel);
    const color = isDark ? tier.bright : tier.ink;
    return {
      label: ticket.ticketType || ticket.ticketLevel || 'Standard',
      color,
      background: `rgba(${tier.rgb},${isDark ? '0.14' : '0.12'})`,
    };
  };

  const toWallet = () => {
    setOpenTicket(null);
    onNavigate?.('tickets');
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <h2
          className="text-[13px] tracking-[2px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)' }}
        >
          {mine.length > 1 ? 'Your tickets' : 'Your ticket'}
        </h2>
        <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} style={{ color: accent }} />
      </div>

      <div className="flex flex-col gap-2.5">
        {mine.map((ticket) => {
          const tierTag = tierTagStyle(ticket);
          return (
          <AppButton
            key={ticket.id}
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => setOpenTicket(ticket)}
            className="w-full flex items-center gap-3.5 py-3.5 pl-5 pr-3.5 text-left cursor-pointer rounded-[14px]"
            style={{
              background: isDark ? 'rgba(214,249,5,0.05)' : 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >


            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[8.5px] tracking-[1.6px] uppercase px-1.5 py-0.5 rounded-md leading-none"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    background: tierTag.background,
                    color: tierTag.color,
                  }}
                >
                  {tierTag.label}
                </span>
              </div>

              <p
                className="text-[13.5px] mt-1.5 leading-none"
                style={{ fontFamily: "'Inter', sans-serif", color: ink, fontWeight: 600 }}
              >
                Tap to show at the gate
              </p>

              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="w-2.5 h-2.5 shrink-0" strokeWidth={2} style={{ color: inkSoft }} />
                <span className="text-[10.5px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: inkSoft }}>
                  {ticket.eventDate} · {ticket.eventTime}
                </span>
              </div>
            </div>

            <div
              className="shrink-0 w-9 h-9 rounded-full grid place-items-center"
              style={{
                background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(20,18,40,0.05)',
                  color: accent,
              }}
            >
              <QrCode className="w-4 h-4" strokeWidth={1.9} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 -ml-1.5" strokeWidth={2.5} style={{ color: inkSoft }} />
          </AppButton>
        );
        })}
      </div>

      {/* Full ticket */}
      <AnimatePresence>
        {openTicket && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-5"
            onClick={() => setOpenTicket(null)}
          >
            <div
              className="absolute inset-0"
              style={{ background: isDark ? 'rgba(8,8,8,0.85)' : 'rgba(232,230,242,0.82)', backdropFilter: 'blur(40px)' }}
            />
            <motion.div
              initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[28px]"
            >
              <DetailedTicket
                ticket={openTicket}
                onClose={() => setOpenTicket(null)}
                onTransfer={toWallet}
                onShare={toWallet}
                onResell={toWallet}
                onDownload={handleDownload}
                downloading={downloading}
                downloadDone={downloadDone}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offscreen card that the offline save rasterizes */}
      {openTicket && (
        <div className="fixed -left-[9999px] top-0" aria-hidden="true">
          <div ref={downloadRef}>
            <DownloadableTicketCard ticket={openTicket} />
          </div>
        </div>
      )}
    </>
  );
}
