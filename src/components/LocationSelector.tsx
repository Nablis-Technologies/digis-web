import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, MapPin, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

const LOCATIONS = [
  { city: 'Addis Ababa', region: 'Ethiopia', events: 142 },
  { city: 'Bahir Dar', region: 'Amhara', events: 28 },
  { city: 'Hawassa', region: 'Sidama', events: 19 },
  { city: 'Mekelle', region: 'Tigray', events: 12 },
  { city: 'Adama', region: 'Oromia', events: 24 },
  { city: 'Dire Dawa', region: 'Eastern', events: 16 },
  { city: 'Gondar', region: 'Amhara', events: 9 },
  { city: 'Jimma', region: 'Oromia', events: 7 },
];

export function LocationSelector() {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('Addis Ababa');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const accent = isDark ? '#d6f905' : '#d6f905';
  const triggerColor = isDark ? '#d6f905' : '#292633';
  const activeText = isDark ? accent : '#292633';

  return (
    <div ref={ref} className="relative inline-block">
      <AppButton
        onClick={() => setOpen((v) => !v)}
        className="group relative inline-flex items-center gap-1.5 h-10 overflow-hidden px-3.5 rounded-full transition-all duration-300"
        style={{
          fontFamily: "'Inter', sans-serif",
          color: triggerColor,
          background: open
            ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.13)')
            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.52)'),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <GlassReflection isDark={isDark} />
        <MapPin className="relative z-10 w-3 h-3" strokeWidth={2.5} />
        <span className="relative z-10 text-[11px] tracking-[3px] uppercase">{selected}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 inline-flex"
        >
          <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        </motion.span>
      </AppButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-[calc(100%+8px)] z-[45] w-[260px] rounded-2xl overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(20,20,22,0.92), rgba(12,12,14,0.92))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.84), rgba(234,231,242,0.76))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <GlassReflection isDark={isDark} />
            <div
              className="relative z-10 px-4 pt-3 pb-2 text-[10px] tracking-[2.5px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(81,72,101,0.075)'}`,
              }}
            >
              Choose your city
            </div>
            <div className="relative z-10 max-h-[280px] overflow-y-auto py-1 scrollbar-hide">
              {LOCATIONS.map((loc) => {
                const active = loc.city === selected;
                return (
                  <AppButton
                    key={loc.city}
                    onClick={() => {
                      setSelected(loc.city);
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-200"
                    style={{
                      background: active
                        ? isDark ? 'rgba(214,249,5,0.06)' : 'rgba(214,249,5,0.1)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(81,72,101,0.055)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span
                        className="text-[13px] tracking-[0.3px]"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: active ? activeText : isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
                        }}
                      >
                        {loc.city}
                      </span>
                      <span
                        className="text-[10px] tracking-[1.5px] uppercase"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
                        }}
                      >
                        {loc.region} · {loc.events} events
                      </span>
                    </div>
                    {active ? (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: accent }}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} color={isDark ? '#000' : '#fff'} />
                      </div>
                    ) : (
                      <span
                        className="text-[10px] tracking-[1px]"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                        }}
                      >
                        {loc.events}
                      </span>
                    )}
                  </AppButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
