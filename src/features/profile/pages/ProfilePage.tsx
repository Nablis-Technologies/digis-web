import { motion } from 'motion/react';
import { Calendar, Settings, BadgeCheck } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import type { UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';
import { ProfileRowSkeleton, useShowSkeleton } from '@/components/loading';

interface UserProfileProps {
  tickets: UserTicket[];
  onOpenSettings?: () => void;
  /** Wallet not yet resolved — row skeletons, not a blank section. */
  loading?: boolean;
}

export function UserProfile({ tickets, onOpenSettings, loading = false }: UserProfileProps) {
  const showLoading = useShowSkeleton(loading);
  const { isDark } = useTheme();
  const { user: authUser } = useAuth();

  const displayName = authUser?.name?.trim() || 'Digis Member';
  const contact = authUser?.phone || authUser?.email;
  const needsProfile = !!authUser && (!authUser.profile?.first_name?.trim() || !authUser.profile?.last_name?.trim());

  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const subText = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#fff';

  return (
    <div className="min-h-screen pb-32 lg:pb-10 max-w-5xl mx-auto">
      {/* Avatar + identity */}
      <div className="px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 mb-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="relative flex-shrink-0">
            <div className="relative rounded-full"
              style={{ boxShadow: `0 0 0 3px ${isDark ? '#0a0a0a' : '#f8f7fc'}` }}>
              <UserAvatar
                user={authUser}
                size={80}
                style={{ borderRadius: '50%' }}
              />
            </div>
            {authUser?.verified_at && <div role="img" aria-label="Verified account" className="absolute -bottom-0.5 -right-0.5 w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center"
              style={{ background: isDark ? '#0a0a0a' : '#f8f7fc' }}>
              <BadgeCheck className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: accent }} strokeWidth={2.5} />
            </div>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] tracking-[-0.3px] leading-tight break-words"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                {displayName}
              </h1>
            </div>
            {contact && <p className="text-[12px] tracking-[0.3px] mt-0.5 break-all"
              style={{ fontFamily: "'Inter', sans-serif", color: subText }}>
              {contact}
            </p>}
          </div>
        </motion.div>

        {needsProfile && <section aria-label="Profile completion" className="mt-5 space-y-2">
          <p className="text-sm" style={{ color: subText }}>Add your given name and father’s name to complete your account profile.</p>
          <AppButton onClick={onOpenSettings} className="min-h-11 px-4 py-2 rounded-xl text-sm" style={{ color: isDark ? '#fff' : '#1a1a1a', ...glassEdge(isDark) }}>Complete your profile</AppButton>
        </section>}
        {/* Action buttons row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex gap-2 mt-4"
        >
          <AppButton
            onClick={onOpenSettings}
            className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl overflow-hidden text-[12px] tracking-[0.5px] transition-colors cursor-pointer"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
              fontWeight: 500,
            }}
          >
            <GlassReflection isDark={isDark} />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Settings className="w-3.5 h-3.5" strokeWidth={2} />
              Settings
            </span>
          </AppButton>
        </motion.div>
      </div>

      {/* Wallet-backed tickets; no inferred attendance or profile statistics. */}
      <div className="px-5 mb-6">
        <h2 className="text-[12px] tracking-[2px] uppercase mb-4 px-1"
          style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
          Your tickets
        </h2>
        <div className="space-y-2.5">
          {showLoading ? (
            <>
              <ProfileRowSkeleton />
              <ProfileRowSkeleton />
            </>
          ) : (
          tickets.map((ticket, index) => (
            <motion.div key={ticket.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.06 }}
              className="relative rounded-2xl overflow-hidden flex items-center gap-3 p-2.5"
              style={{ background: cardBg }}>
              <GlassReflection isDark={isDark} />
              <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
              {ticket.image ? (
                <img src={ticket.image} alt={ticket.eventName}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(214,249,5,0.08)' : 'rgba(214,249,5,0.08)' }}>
                  <Calendar className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] truncate"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 400 }}>
                  {ticket.eventName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] truncate"
                    style={{ fontFamily: "'Inter', sans-serif", color: subText }}>
                    {ticket.eventDate} · {ticket.venue}
                  </p>
                </div>
              </div>
              {ticket.ticketType === 'VIP' && (
                <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-1 rounded-md flex-shrink-0"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: 'rgba(250,200,60,0.12)',
                    ...glassEdge(isDark),
                    color: '#fac83c',
                  }}>
                  VIP
                </span>
              )}

              </div>
            </motion.div>
          ))
          )}
        </div>
      </div>

    </div>
  );
}
