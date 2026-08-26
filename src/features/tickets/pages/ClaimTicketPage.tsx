import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { ArrowRight, ArrowLeft, AlertTriangle, LogIn, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { transferService } from '@/services/transfer.service';
import { ticketKeys } from '@/services/tickets.service';
import { DetailedTicket } from '@/features/tickets/components/DetailedTicket';
import { DownloadableTicketCard } from '@/features/tickets/components/DownloadableTicketCard';
import type { UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

const ACCENT_HEX = '#d6f905';


interface ClaimTicketPageProps {
  onRequestAuth: () => void;
  onNavigateHome: () => void;
  onNavigateTickets: () => void;
}

export function ClaimTicketPage({ onRequestAuth, onNavigateHome, onNavigateTickets }: ClaimTicketPageProps) {
  const { token = '' } = useParams();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const transfer = useMemo(() => transferService.getTransfer(token), [token]);

  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transfer) return;
    const timeout = window.setTimeout(() => {
      const origin = { x: 0.5, y: 0.38 };
      confetti({ particleCount: 100, spread: 72, startVelocity: 38, origin, zIndex: 100, colors: ['#d6f905', '#f4f4f0', '#aabbd0', '#ba8b9a'] });
      confetti({ particleCount: 55, spread: 110, startVelocity: 28, scalar: 0.78, origin, zIndex: 100, colors: ['#d6f905', '#f4f4f0', '#aabbd0', '#ba8b9a'] });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [transfer]);

  // The pass belongs to the recipient's number the moment they open the link —
  // no account required. When they happen to be signed in we also drop a copy
  // into their in-app wallet so it shows up under My Tickets.
  useEffect(() => {
    if (!transfer) return;
    try {
      const result = transferService.claimTransfer(token, isAuthenticated);
      if (result.ticket) queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
    } catch {
      /* invalid link handled below */
    }
  }, [transfer, token, isAuthenticated, queryClient]);

  const userTicket: UserTicket | null = useMemo(() => {
    if (!transfer) return null;
    const tk = transfer.ticket;
    return {
      id: `transfer-${transfer.token}`,
      eventId: tk.eventId,
      eventName: tk.eventName,
      eventDate: tk.eventDate,
      eventTime: tk.eventTime ?? '',
      venue: tk.venue,
      ticketType: tk.ticketType,
      ticketLevel: tk.ticketLevel,
      qrCode: transfer.qrCode,
      purchased: 'Transferred',
      image: tk.image,
      seat: tk.seat,
    };
  }, [transfer]);

  const handleDownload = useCallback(async () => {
    if (!downloadRef.current) return;
    setDownloading(true);
    setDownloadDone(false);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(downloadRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${(userTicket?.eventName ?? 'ticket').replace(/\s+/g, '_')}_ticket.png`;
      link.click();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch (err) {
      console.error('Failed to download ticket:', err);
    } finally {
      setDownloading(false);
    }
  }, [userTicket]);

  const surfaceSoft = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#ffffff' : '#0a0a0a';
  const textDim = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const textFaint = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';

  const backButton = (
    <AppButton
      onClick={onNavigateHome}
      className="fixed top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center z-[30]"
      style={{ background: surfaceSoft, border: `1px solid ${border}` }}
      aria-label="Back to Digis"
    >
      <ArrowLeft className="w-4 h-4" style={{ color: textDim }} strokeWidth={1.8} />
    </AppButton>
  );

  // Invalid / expired link
  if (!transfer || !userTicket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        {backButton}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[28px] p-8 text-center"
          style={{ background: isDark ? '#0f0f10' : '#ffffff', border: `1px solid ${border}` }}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} strokeWidth={1.8} />
          </div>
          <h1 className="text-[22px] font-light tracking-[-0.3px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
            Link not found
          </h1>
          <p className="mt-2 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
            This transfer link is invalid or has expired. Ask the sender to share a new one.
          </p>
          <AppButton
            onClick={onNavigateHome}
            className="mt-6 px-6 py-3 rounded-full inline-flex items-center gap-2"
            style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}
          >
            Browse events
            <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
          </AppButton>
        </motion.div>
      </div>
    );
  }

  // The claim footer: keep the ticket accessible on any device (guest) or jump
  // to the in-app wallet (signed in).
  const footer = isAuthenticated ? (
    <AppButton
      onClick={onNavigateTickets}
      className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
      style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
    >
      View in my tickets
      <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
    </AppButton>
  ) : (
    <div className="space-y-2.5">
      <AppButton
        onClick={onRequestAuth}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
        style={{ background: surfaceSoft, border: `1px solid ${border}`, color: text, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
      >
        <LogIn className="w-4 h-4" strokeWidth={2} />
        Sign in to add to My Tickets
      </AppButton>
      <div className="flex items-center gap-1.5 justify-center">
        <ShieldCheck className="w-3 h-3" style={{ color: textFaint }} strokeWidth={2} />
        <p className="text-[10.5px] text-center" style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}>
          Linked to {transfer.contactValue} — no account required
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      {backButton}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md"
      >
        <DetailedTicket
          ticket={userTicket}
          onClose={onNavigateHome}
          onDownload={handleDownload}
          downloading={downloading}
          downloadDone={downloadDone}
          receivedFrom={transfer.fromName}
          receivedNote={transfer.note}
          footer={footer}
        />
      </motion.div>

      {/* Offscreen render used to rasterize the ticket for the "Save for Offline" action */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
        <DownloadableTicketCard ref={downloadRef} ticket={userTicket} />
      </div>
    </div>
  );
}
