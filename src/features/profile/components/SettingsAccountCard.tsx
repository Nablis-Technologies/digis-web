import { motion } from 'motion/react';
import { BadgeCheck, User } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

import type { AuthUser } from '@/types/auth';

interface SettingsAccountCardProps {
  isDark: boolean;
  cardBorder: string;
  cardBg: string;
  value: string;
  heading: string;
  isAuthenticated: boolean;
  user?: AuthUser | null;
  accentText: string;
  subtle: string;
  onRequestAuth?: () => void;
  onEditProfile?: () => void;
}

/**
 * Account card with profile summary and edit trigger (G-14 & G-47).
 */
export function SettingsAccountCard(props: SettingsAccountCardProps) {
  const {
    isDark, cardBorder, heading, isAuthenticated, user,
    accentText, subtle, onRequestAuth, onEditProfile,
  } = props;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl mb-7"
      style={{
        background: isDark
          ? 'linear-gradient(150deg, rgba(217,255,0,0.08), rgba(255,255,255,0.02))'
          : 'linear-gradient(150deg, rgba(214,249,5,0.14), rgba(255,255,255,0.7))',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <GlassReflection isDark={isDark} />
      {isAuthenticated && user ? (
        <div className="relative z-10 flex items-center gap-4 p-5">
          <UserAvatar user={user} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[15px] truncate"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: heading }}>
                {user.name}
              </p>
              <BadgeCheck className="w-4 h-4 flex-shrink-0" strokeWidth={2} style={{ color: accentText }} />
            </div>
            <p className="text-[12px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
              {user.email || user.phone || 'Digis member'}
            </p>
            {user.phone && (
              <p className="text-[11px] mt-0.5 truncate" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                {user.phone}
              </p>
            )}
          </div>
          {onEditProfile && (
            <AppButton
              whileTap={{ scale: 0.94 }}
              onClick={onEditProfile}
              className="px-3.5 py-1.5 rounded-full flex-shrink-0 cursor-pointer text-[12px] font-medium"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: heading,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Edit
            </AppButton>
          )}
        </div>
      ) : (
        /* Guest card */
        <div className="relative z-10 flex items-center gap-4 p-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <User className="w-6 h-6" strokeWidth={1.75} style={{ color: subtle }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: heading }}>
              You're browsing as a guest
            </p>
            <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
              Log in to sync tickets across devices
            </p>
          </div>
          <AppButton
            whileTap={{ scale: 0.96 }}
            onClick={onRequestAuth}
            className="px-4 py-2 rounded-full flex-shrink-0 cursor-pointer"
            style={{
              background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
              color: isDark ? '#000' : '#fff',
              fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600,
            }}
          >
            Log in
          </AppButton>
        </div>
      )}
    </motion.div>
  );
}
