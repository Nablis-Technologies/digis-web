import QRCode from 'react-qr-code';

/**
 * The real, scannable pass code. Encodes the ticket's `qrCode` value verbatim at
 * error-correction level M, so a gate scanner reads back exactly the string the
 * ticket record is keyed on. Rendered as SVG to stay crisp at any size and to
 * survive being rasterized into the downloadable ticket card.
 *
 * This is the ONLY place the raw token may be used: it enters the QR matrix
 * for the scanner and must never be rendered as human-readable text anywhere
 * (no mono token strings under the QR — show the ticket type instead).
 */
export function TicketQRCode({ code, size }: { code: string; size?: number }) {
  if (!code?.trim()) return null;
  const common = {
    value: code,
    'aria-hidden': true as const,
    level: 'M' as const,
    bgColor: '#fff',
    fgColor: '#1a1a1a',
  };

  if (size) return <div role="img" aria-label="Ticket entry QR" style={{ display: 'inline-block', padding: 12, background: '#fff' }}><QRCode {...common} size={size} /></div>;

  return (
    <div role="img" aria-label="Ticket entry QR" className="w-full h-full flex items-center justify-center p-3 bg-white">
      <QRCode {...common} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
