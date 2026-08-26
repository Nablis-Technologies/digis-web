import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Share2, Download, ChevronDown, ChevronRight, Sparkles, Send, Tag, Check, Ticket as TicketIcon, ArrowRight, Compass, X, ArrowUpRight } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import type { UserTicket } from '@/types';
import { TicketQRCode } from './TicketQRCode';

export const DownloadableTicketCard = forwardRef<HTMLDivElement, { ticket: UserTicket }>(({ ticket }, ref) => {
  const isVIP = ticket.ticketType === 'VIP';

  return (
    <div
      ref={ref}
      style={{
        width: '420px',
        background: '#0e0c18',
        borderRadius: '24px',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Top accent */}
      <div style={{
        height: '4px',
        background: isVIP
          ? 'linear-gradient(90deg, #d6f905, #d9ff00, #d6f905)'
          : 'linear-gradient(90deg, #d9ff00, #d6f905, #d9ff00)',
      }} />

      {/* Event image header */}
      {ticket.image && (
        <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
          <img
            src={ticket.image}
            alt=""
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(14,12,24,0.2) 0%, rgba(14,12,24,0.85) 100%)',
          }} />
          {/* Event name on image */}
          <div style={{ position: 'absolute', bottom: '16px', left: '24px', right: '24px' }}>
            {isVIP && (
              <div style={{
                display: 'inline-block',
                fontSize: '9px',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                color: '#d6f905',
                background: 'rgba(214,249,5,0.12)',
                border: '1px solid rgba(214,249,5,0.25)',
                padding: '3px 10px',
                borderRadius: '20px',
                marginBottom: '8px',
              }}>
                VIP ACCESS
              </div>
            )}
            <div style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              fontSize: '22px',
              fontWeight: 300,
              color: '#fff',
              lineHeight: 1.2,
            }}>
              {ticket.eventName}
            </div>
          </div>
        </div>
      )}

      {/* No-image fallback header */}
      {!ticket.image && (
        <div style={{ padding: '24px 24px 0' }}>
          {isVIP && (
            <div style={{
              display: 'inline-block',
              fontSize: '9px',
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              color: '#d6f905',
              background: 'rgba(214,249,5,0.12)',
              border: '1px solid rgba(214,249,5,0.25)',
              padding: '3px 10px',
              borderRadius: '20px',
              marginBottom: '8px',
            }}>
              VIP ACCESS
            </div>
          )}
          <div style={{
            fontFamily: "'Zalando Sans Expanded', sans-serif",
            fontSize: '22px',
            fontWeight: 300,
            color: '#fff',
            lineHeight: 1.2,
          }}>
            {ticket.eventName}
          </div>
        </div>
      )}

      {/* Details */}
      <div style={{ padding: '20px 24px' }}>
        {[
          { label: 'DATE', value: ticket.eventDate },
          { label: 'TIME', value: ticket.eventTime },
          { label: 'VENUE', value: ticket.venue },
          { label: 'TYPE', value: ticket.ticketType },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)' }}>
              {item.label}
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 300 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tear line */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '8px',
      }}>
        <div style={{
          width: '12px', height: '24px',
          background: '#0e0c18',
          borderRadius: '0 12px 12px 0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: 'none',
        }} />
        <div style={{
          flex: 1,
          borderTop: '2px dashed rgba(255,255,255,0.08)',
        }} />
        <div style={{
          width: '12px', height: '24px',
          background: '#0e0c18',
          borderRadius: '12px 0 0 12px',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRight: 'none',
        }} />
      </div>

      {/* QR Code section */}
      <div style={{ padding: '20px 24px 16px', textAlign: 'center' as const }}>
        <p style={{
          fontSize: '10px',
          letterSpacing: '2px',
          textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.35)',
          marginBottom: '14px',
        }}>
          Scan at entry
        </p>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '20px',
          display: 'inline-block',
        }}>
          <TicketQRCode code={ticket.qrCode} size={180} />
        </div>
        <p style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          letterSpacing: '2px',
          color: 'rgba(255,255,255,0.4)',
          marginTop: '12px',
        }}>
          {ticket.qrCode}
        </p>
      </div>

      {/* Footer branding */}
      <div style={{
        padding: '14px 24px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <span style={{
            fontFamily: "'Zalando Sans Expanded', sans-serif",
            fontSize: '14px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '3px',
          }}>
            DIGIS
          </span>
        </div>
        <div style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.5px',
        }}>
          Valid entry pass
        </div>
      </div>
    </div>
  );
});
