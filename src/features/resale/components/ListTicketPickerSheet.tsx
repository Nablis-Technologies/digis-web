import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/app/components/ThemeContext';
import { X, ArrowRight, Ticket as TicketIcon } from 'lucide-react';
import type { UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

/**
 * Choose which ticket to list for resale. The "List a ticket" CTA opens this
 * picker rather than showing the tickets inline, so the action and the seller's
 * active listings stay visually distinct.
 */
export function ListTicketPickerSheet({ tickets, onPick, onClose }: {
  tickets: UserTicket[];
  onPick: (ticket: UserTicket) => void;
  onClose: () => void;
}) {
  const { isDark } = useTheme();

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';

  const sheet = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center"
      onClick={onClose}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[85vh] lg:max-h-[80vh] overflow-y-auto overflow-x-hidden"
        style={{ background: isDark ? '#101115' : '#fff' }}
        onClick={(e) => e.stopPropagation()}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
          <div className="flex justify-center pt-3 pb-2 lg:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
          </div>

          <div className="px-6 pb-10 pt-3 lg:pt-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[20px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                List a ticket
              </h3>
              <AppButton onClick={onClose} className="cursor-pointer">
                <X className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
              </AppButton>
            </div>
            <p className="text-[12px] mb-6" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
              Choose a ticket from your collection to put up for resale.
            </p>

            {tickets.length === 0 ? (
              <div className="relative rounded-2xl overflow-hidden p-6 text-center" style={{ background: cardBg }}>
                <GlassReflection isDark={isDark} />
                <p className="relative z-10 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                  You have no active tickets to list right now.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {tickets.map((ticket) => (
                  <AppButton key={ticket.id} whileTap={{ scale: 0.985 }} onClick={() => onPick(ticket)}
                    className="relative w-full flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer text-left overflow-hidden"
                    style={{ background: cardBg }}>
                    <GlassReflection isDark={isDark} />
                    <div className="relative z-10 flex min-w-0 items-center gap-3.5">
                      {ticket.image ? (
                        <img src={ticket.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.14)' }}>
                          <TicketIcon className="w-5 h-5" style={{ color: accent }} strokeWidth={1.75} />
                        </span>
                      )}
                      <div className="min-w-0 text-left">
                        <p className="text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                          {ticket.eventName}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                          {ticket.ticketType} · {ticket.eventDate}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="relative z-10 w-4 h-4 flex-shrink-0 ml-3" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} strokeWidth={1.5} />
                  </AppButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
