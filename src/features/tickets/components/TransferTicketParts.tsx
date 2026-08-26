import { Calendar, Ticket as TicketIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const ACCENT = '214,249,5';
const ACCENT_HEX = '#d6f905';

type TransferPreviewTicket = { eventName: string; eventDate: string; venue: string; ticketType: string; image?: string };

export function Field({
  icon,
  children,
  isDark,
  active,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  isDark: boolean;
  active: boolean;
}) {
  const surfaceSoft = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const iconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{
        background: surfaceSoft,
        border: `1px solid ${active ? `rgba(${ACCENT},0.3)` : borderSoft}`,
        transition: 'border-color 0.25s',
      }}
    >
      <span style={{ color: iconColor }}>{icon}</span>
      {children}
    </div>
  );
}

export function Row({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  const textFaint = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  return (
    <div className="flex items-start gap-4">
      <span
        className="text-[10px] tracking-[1.6px] uppercase pt-1 w-10 flex-shrink-0"
        style={{ fontFamily: "'Inter', sans-serif", color: textFaint, fontWeight: 600 }}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function TicketPreview({
  ticket,
  isDark,
  compact,
}: {
  ticket: TransferPreviewTicket;
  isDark: boolean;
  compact?: boolean;
}) {
  const borderSoft = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#fff' : '#0a0a0a';
  const textDim = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)';
  const textFaint = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex"
      style={{
        background: isDark ? '#161618' : '#fafafa',
        border: `1px solid ${borderSoft}`,
        height: compact ? 76 : 92,
      }}
    >
      {ticket.image ? (
        <div className="relative h-full flex-shrink-0" style={{ width: compact ? 76 : 80 }}>
          <img src={ticket.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15))' }} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: compact ? 76 : 80, background: `rgba(${ACCENT},0.08)` }}
        >
          <TicketIcon className="w-6 h-6" style={{ color: ACCENT_HEX }} strokeWidth={1.5} />
        </div>
      )}

      <div className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-center">
        <p
          className="text-[9px] tracking-[1.25px] uppercase truncate"
          style={{ fontFamily: "'Inter', sans-serif", color: ACCENT_HEX, fontWeight: 800 }}
        >
          Tier · {ticket.ticketType}
        </p>
        <p
          className={`${compact ? 'text-[12.5px]' : 'text-[13.5px]'} truncate mt-1`}
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text, fontWeight: 400 }}
        >
          {ticket.eventName}
        </p>
        <span className="flex items-center gap-1 text-[10.5px] mt-1" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}>
          <Calendar className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          <span className="truncate">{ticket.eventDate}</span>
        </span>
      </div>
    </div>
  );
}
