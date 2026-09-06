import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Ticket, User, ArrowUpDown, LogIn } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: 'discover' | 'tickets' | 'profile' | 'resale') => void;
  onRequestAuth?: () => void;
}

export const NAV_ITEMS = [
  { id: 'discover' as const, label: 'Discover', Icon: Compass },
  { id: 'tickets' as const, label: 'Tickets', Icon: Ticket },
  { id: 'resale' as const, label: 'Resale', Icon: ArrowUpDown },
  { id: 'profile' as const, label: 'Profile', Icon: User },
];

export function Navigation({ currentView, onNavigate, onRequestAuth }: NavigationProps) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const ticking = useRef(false);

  // Track whether the page has scrolled so we can dial in the blur/opacity.
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = isAuthenticated
    ? [
        { id: 'discover', label: 'Discover', Icon: Compass },
        { id: 'tickets', label: 'Tickets', Icon: Ticket },
        { id: 'resale', label: 'Resale', Icon: ArrowUpDown },
        { id: 'profile', label: 'Profile', Icon: User },
      ]
    : [
        // Guests can buy & receive tickets without an account, so keep Tickets
        // reachable — their passes live in the local cache until they sign in.
        { id: 'discover', label: 'Discover', Icon: Compass },
        { id: 'tickets', label: 'Tickets', Icon: Ticket },
        { id: 'resale', label: 'Resale', Icon: ArrowUpDown },
        { id: 'login', label: 'Log in', Icon: LogIn },
      ];

  return (
    <>
      {/* Mobile: Bottom Navigation */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[30] pb-safe"
      >
        {/* Floating pill container — sits above the glass blur layer so
            it feels detached from the page surface. Opacity and blur
            intensify smoothly once the user starts scrolling. */}
        <div
          className="absolute inset-0 z-0 transition-all duration-300"
          style={{
            background: isDark
              ? `rgba(10,10,12,${scrolled ? 0.72 : 0.7})`
              : `rgba(245,243,252,${scrolled ? 0.76 : 0.7})`,
            backdropFilter: `blur(${scrolled ? 32 : 20}px) saturate(${scrolled ? 1.8 : 1.5})`,
            WebkitBackdropFilter: `blur(${scrolled ? 32 : 20}px) saturate(${scrolled ? 1.8 : 1.5})`,
            boxShadow: isDark
              ? `0 -8px 32px rgba(0,0,0,${scrolled ? 0.5 : 0.25})`
              : `0 -8px 32px rgba(20,18,40,${scrolled ? 0.12 : 0.06})`,
          }}
        />
        <GlassReflection isDark={isDark} />

        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {items.map(({ id, label, Icon }) => (
              <NavItem
                key={id}
                icon={<Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />}
                label={label}
                active={id === 'login' ? false : currentView === id}
                onClick={() => {
                  if (id === 'login') { onRequestAuth?.(); return; }
                  // Tapping the tab you're already on scrolls back to the top,
                  // matching the standard mobile tab-bar convention (single tap).
                  if (currentView === id) window.scrollTo({ top: 0, behavior: 'smooth' });
                  else onNavigate(id as 'discover' | 'tickets' | 'profile' | 'resale');
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <AppButton
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 relative py-2 px-3 min-w-[56px] rounded-2xl"
    >
      {/* Active top indicator */}
      {active && (
        <motion.div
          layoutId="activeNav"
          className="absolute -top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{ background: isDark ? '#d6f905' : '#7c9a00' }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}

      <motion.div
        animate={{
          color: active
            ? (isDark ? '#d6f905' : '#4a6000')
            : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)'),
          scale: active ? 1.05 : 1,
        }}
        transition={{ duration: 0.22 }}
        className="relative z-10"
      >
        {icon}
      </motion.div>

      <motion.span
        animate={{
          color: active
            ? (isDark ? '#d6f905' : '#4a6000')
            : (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'),
        }}
        transition={{ duration: 0.22 }}
        className="text-[10px] tracking-[0.5px] relative z-10"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: active ? 600 : 400 }}
      >
        {label}
      </motion.span>
    </AppButton>
  );
}
