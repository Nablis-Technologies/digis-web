import { copyText } from '@/lib/utils/clipboard';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Copy, Instagram, Twitter, Check, Share2 } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { useProminentHue } from '@/lib/hooks/useProminentHue';
import { readableAccent } from '@/lib/utils/color';
import { BoldCard, NightCard, ShareIconButton, StubCard } from '@/features/tickets/components/ShareCardParts';
import { AppButton } from '@/components/primitives/AppButton';

interface ShareCardProps {
  event: {
    name: string;
    date: string;
    time?: string;
    venue: string;
    image: string;
    category?: string;
    price?: number;
  };
  ticketType?: string;
  ticketLevel?: string;
  /** True only when the user actually owns the ticket (shared from their wallet). */
  purchased?: boolean;
  onClose: () => void;
}

type CardStyle = 'bold' | 'night' | 'stub';

const BRAND = '#d6f905';
const INK = '#0a0a0a';
const STATUS = 'Ticket Secured';

/* ── modal shell ─────────────────────────────────────────── */

export function ShareCard({ event, ticketType, ticketLevel, onClose }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVIP = ticketType?.toUpperCase().includes('VIP');
  const [activeStyle, setActiveStyle] = useState<CardStyle>('bold');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Image-extracted accent — same pipeline as the dark-mode featured cards.
  const { rgb } = useImageColor(event.image);
  const hued = useProminentHue(event.image, rgb, true);
  const accentText = readableAccent(hued, true);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}-wrapped.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
    setDownloading(false);
  }, [event.name]);

  const handleCopyLink = () => {
    copyText(`https://digis.app/event/${event.name.replace(/\s+/g, '-').toLowerCase()}`).then((didCopy) => { if (didCopy) { setCopied(true); setTimeout(() => setCopied(false), 2000); } });
  };

  const styles: { key: CardStyle; label: string }[] = [
    { key: 'bold', label: 'Spotlight' },
    { key: 'night', label: 'After Dark' },
    { key: 'stub', label: 'Ticket Cut' },
  ];

  const cardProps = { event, ticketType, ticketLevel, isVIP, hued, accentText };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <motion.div className="absolute inset-0" style={{ background: 'rgba(6,6,10,0.94)', backdropFilter: 'blur(28px)' }} />

      <motion.div
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-sm px-5 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <AppButton
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute -top-2 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}
        >
          <X className="w-5 h-5 text-white/80" strokeWidth={1.75} />
        </AppButton>

        {/* Title */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] tracking-[3px] uppercase mb-5 text-center"
          style={{ fontFamily: "'Inter', sans-serif", color: BRAND, fontWeight: 600 }}
        >
          Flex Your Ticket ✦
        </motion.p>

        {/* Style selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-5"
        >
          {styles.map((s) => {
            const active = activeStyle === s.key;
            return (
              <AppButton
                key={s.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveStyle(s.key)}
                className="px-4 py-2 rounded-full text-[11px] tracking-[0.5px] transition-all duration-300 cursor-pointer"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: active ? 700 : 500,
                  background: active ? BRAND : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${active ? BRAND : 'rgba(255,255,255,0.12)'}`,
                  color: active ? INK : 'rgba(255,255,255,0.6)',
                }}
              >
                {s.label}
              </AppButton>
            );
          })}
        </motion.div>

        {/* Card preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full mb-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStyle}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <div ref={cardRef}>
                {activeStyle === 'bold' && <BoldCard {...cardProps} />}
                {activeStyle === 'night' && <NightCard {...cardProps} />}
                {activeStyle === 'stub' && <StubCard {...cardProps} />}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full space-y-3"
        >
          <AppButton
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            className="w-full h-[54px] rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
            style={{ background: BRAND }}
          >
            {downloading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 rounded-full"
                style={{ borderColor: 'rgba(10,10,10,0.25)', borderTopColor: INK }}
              />
            ) : (
              <>
                <Download className="w-[18px] h-[18px]" style={{ color: INK }} strokeWidth={2} />
                <span className="text-[13px] tracking-[0.5px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: INK }}>
                  Save to Camera Roll
                </span>
              </>
            )}
          </AppButton>

          <div className="flex gap-2.5">
            <AppButton
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLink}
              className="flex-1 h-[48px] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              {copied ? <Check className="w-4 h-4" style={{ color: BRAND }} strokeWidth={2} /> : <Copy className="w-4 h-4 text-white/70" strokeWidth={1.75} />}
              <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: copied ? BRAND : 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </AppButton>

            <ShareIconButton icon={<Instagram className="w-[18px] h-[18px]" strokeWidth={1.75} />} color="#E1306C" />
            <ShareIconButton icon={<Twitter className="w-[18px] h-[18px]" strokeWidth={1.75} />} color="#1DA1F2" />
            <ShareIconButton icon={<Share2 className="w-[18px] h-[18px]" strokeWidth={1.75} />} color={BRAND} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
