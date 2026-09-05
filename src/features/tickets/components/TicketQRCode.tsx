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
  const common = {
    value: code || 'DIGIS',
    level: 'M' as const,
    bgColor: 'transparent',
    fgColor: '#1a1a1a',
  };

  if (size) return <QRCode {...common} size={size} />;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <QRCode {...common} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
