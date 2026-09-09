import { motion } from 'motion/react';
import { Calendar, TrendingUp, Award, Sparkle, Sparkles, MapPin, Music, Mic2, Palette, Code2, Trophy, Flame, Settings, Share2, BadgeCheck, ChevronRight, Crown } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import type { UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
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

  // Real identity from the signed-in user; stats remain demo data for now.
  const displayName = authUser?.name?.trim() || 'Digis Member';
  const handle = authUser?.email
    ? '@' + authUser.email.split('@')[0]
    : authUser?.phone
      ? authUser.phone
      : '@digis.member';

  const user = {
    name: displayName,
    handle,
    avatarInitial: (displayName[0] || 'D').toUpperCase(),
    memberSince: '2025',
    location: 'Addis Ababa',
    tier: 'Gold',
    nextTier: 'Platinum',
    xp: 1820,
    xpToNext: 2500,
    eventsAttended: 18,
    totalSpent: 45000,
  };

  const xpProgress = Math.min(100, (user.xp / user.xpToNext) * 100);

  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const subText = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const mutedText = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#fff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const stats = [
    { icon: <Sparkle className="w-4 h-4" strokeWidth={1.75} />, label: 'Events', value: user.eventsAttended.toString(), sub: 'attended' },
    { icon: <Trophy className="w-4 h-4" strokeWidth={1.75} />, label: 'Streak', value: '7', sub: 'months active' },
    { icon: <MapPin className="w-4 h-4" strokeWidth={1.75} />, label: 'Top City', value: user.location, sub: 'home base' },
    { icon: <TrendingUp className="w-4 h-4" strokeWidth={1.75} />, label: 'Invested', value: `${(user.totalSpent / 1000).toFixed(0)}k`, sub: 'ETB total' },
  ];

  const achievements = [
    { icon: <Flame className="w-4 h-4" />, label: 'Trendsetter', desc: 'Booked 5 sold-out events', unlocked: true, color: '#fb923c' },
    { icon: <Crown className="w-4 h-4" />, label: 'VIP Status', desc: 'Reached Gold tier', unlocked: true, color: '#fac83c' },
    { icon: <Music className="w-4 h-4" />, label: 'Melomaniac', desc: '10+ music events', unlocked: true, color: '#d6f905' },
    { icon: <Sparkles className="w-4 h-4" />, label: 'Early Bird', desc: '3 early-bird tickets', unlocked: true, color: '#34d399' },
    { icon: <Sparkle className="w-4 h-4" />, label: 'Critic', desc: 'Leave 10 reviews', unlocked: false, color: '#fb923c' },
    { icon: <Trophy className="w-4 h-4" />, label: 'Centurion', desc: 'Attend 100 events', unlocked: false, color: '#d6f905' },
  ];

  const genres = [
    { icon: <Music className="w-3.5 h-3.5" />, name: 'Music', count: 9, color: '#d6f905' },
    { icon: <Mic2 className="w-3.5 h-3.5" />, name: 'Comedy', count: 4, color: '#fb923c' },
    { icon: <Palette className="w-3.5 h-3.5" />, name: 'Art', count: 3, color: '#d6f905' },
    { icon: <Code2 className="w-3.5 h-3.5" />, name: 'Tech', count: 2, color: '#fb923c' },
  ];
  const maxGenre = Math.max(...genres.map(g => g.count));

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
              style={{ border: `3px solid ${isDark ? '#0a0a0a' : '#f8f7fc'}` }}>
              <UserAvatar
                user={authUser}
                size={80}
                style={{ borderRadius: '50%' }}
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center"
              style={{ background: isDark ? '#0a0a0a' : '#f8f7fc' }}>
              <BadgeCheck className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: accent }} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] tracking-[-0.3px] leading-tight"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                {user.name}
              </h1>
              <span className="text-[10px] tracking-[1.2px] uppercase px-2 py-0.5 rounded-md flex items-center gap-1"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: 'rgba(250,200,60,0.12)',
                  border: '1px solid rgba(250,200,60,0.25)',
                  color: '#fac83c',
                }}>
                <Crown className="w-2.5 h-2.5" strokeWidth={2.5} />
                {user.tier}
              </span>
            </div>
            <p className="text-[12px] tracking-[0.3px] mt-0.5"
              style={{ fontFamily: "'Inter', sans-serif", color: subText }}>
              {user.handle} · Member since {user.memberSince}
            </p>
          </div>
        </motion.div>

        {/* Action buttons row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex gap-2 mt-4"
        >
          <AppButton
            className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl overflow-hidden text-[12px] tracking-[0.5px] transition-colors"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
              fontWeight: 500,
            }}
          >
            <GlassReflection isDark={isDark} />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
              Share profile
            </span>
          </AppButton>
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

      {/* Tier progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="px-4 sm:px-6 lg:px-8 mb-6"
      >
        <div className="relative rounded-2xl overflow-hidden p-4"
          style={{ background: cardBg, backdropFilter: 'blur(30px)' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2} />
              <span className="text-[10px] tracking-[1.8px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
                Progress to {user.nextTier}
              </span>
            </div>
            <span className="text-[11px] tabular-nums"
              style={{ fontFamily: "'Inter', sans-serif", color: subText }}>
              {user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${accent}, #d6f905)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] mt-2.5"
            style={{ fontFamily: "'Inter', sans-serif", color: mutedText }}>
            {user.xpToNext - user.xp} XP to unlock <span style={{ color: accent }}>Platinum</span> perks
          </p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-3 mb-8">
        {stats.map((stat, index) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + index * 0.05 }}
            className="relative rounded-2xl overflow-hidden p-4"
            style={{ background: cardBg }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-3" style={{ color: accent }}>
              {stat.icon}
              <span className="text-[10px] tracking-[1.5px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif" }}>
                {stat.label}
              </span>
            </div>
            <p className="text-[22px] leading-none mb-1"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
              {stat.value}
            </p>
            <p className="text-[10px] tracking-[0.3px]"
              style={{ fontFamily: "'Inter', sans-serif", color: mutedText }}>
              {stat.sub}
            </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Achievements */}
      <div className="mb-8">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between mb-4">
          <h2 className="text-[12px] tracking-[2px] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
            Achievements
          </h2>
          <span className="text-[10px] tracking-[0.5px]"
            style={{ fontFamily: "'Inter', sans-serif", color: mutedText }}>
            {achievements.filter(a => a.unlocked).length} / {achievements.length}
          </span>
        </div>
        <div className="overflow-x-auto md:overflow-x-visible scrollbar-hide">
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 px-4 sm:px-6 lg:px-8 pb-2 md:w-auto w-max">
            {achievements.map((ach, idx) => (
              <motion.div key={ach.label}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.04 }}
                className="w-32 md:w-auto flex-shrink-0 md:flex-shrink rounded-2xl p-3.5 relative overflow-hidden"
                style={{
                  background: ach.unlocked
                    ? (isDark ? 'rgba(255,255,255,0.04)' : '#fff')
                    : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${ach.unlocked ? `${ach.color}33` : cardBorder}`,
                  opacity: ach.unlocked ? 1 : 0.55,
                }}>
                {ach.unlocked && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(165deg, ${ach.color}14 0%, transparent 50%)` }} />
                )}
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                    style={{
                      background: ach.unlocked ? `${ach.color}1f` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      border: `1px solid ${ach.unlocked ? `${ach.color}40` : cardBorder}`,
                      color: ach.unlocked ? ach.color : mutedText,
                    }}>
                    {ach.icon}
                  </div>
                  <p className="text-[12px] mb-0.5 truncate"
                    style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 400 }}>
                    {ach.label}
                  </p>
                  <p className="text-[10px] leading-tight line-clamp-2"
                    style={{ fontFamily: "'Inter', sans-serif", color: mutedText }}>
                    {ach.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Genre breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="px-4 sm:px-6 lg:px-8 mb-8"
      >
        <h2 className="text-[12px] tracking-[2px] uppercase mb-4 px-1"
          style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
          Taste Breakdown
        </h2>
        <div className="relative rounded-2xl overflow-hidden p-5"
          style={{ background: cardBg }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10 space-y-3.5">
          {genres.map((g, i) => {
            const pct = (g.count / maxGenre) * 100;
            return (
              <div key={g.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2" style={{ color: g.color }}>
                    {g.icon}
                    <span className="text-[12px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
                      {g.name}
                    </span>
                  </div>
                  <span className="text-[11px] tabular-nums"
                    style={{ fontFamily: "'Inter', sans-serif", color: mutedText }}>
                    {g.count} events
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${g.color}88, ${g.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </motion.div>

      {/* Coming up */}
      <div className="px-5 mb-6">
        <h2 className="text-[12px] tracking-[2px] uppercase mb-4 px-1"
          style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
          Coming Up
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
              transition={{ delay: 0.55 + index * 0.06 }}
              whileHover={{ scale: 1.005 }}
              className="relative rounded-2xl overflow-hidden flex items-center gap-3 p-2.5 cursor-pointer"
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
                    border: '1px solid rgba(250,200,60,0.25)',
                    color: '#fac83c',
                  }}>
                  VIP
                </span>
              )}
              <ChevronRight className="w-4 h-4 flex-shrink-0"
                style={{ color: mutedText }} strokeWidth={1.75} />
              </div>
            </motion.div>
          ))
          )}
        </div>
      </div>

      {/* Share footer */}
      <div className="px-5">
        <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
          style={{
            background: isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a',
            color: isDark ? '#0a0a0a' : '#fff',
          }}>
          <Sparkles className="w-4 h-4" strokeWidth={2} />
          <span className="text-[13px] tracking-[0.3px]"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
            Share Your Year on Digis
          </span>
        </AppButton>
      </div>
    </div>
  );
}

function ActionIcon({ icon, isDark }: { icon: React.ReactNode; isDark: boolean }) {
  return (
    <AppButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
      className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
      style={{
        background: isDark ? 'rgba(8,8,8,0.5)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
        color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
      }}>
      {icon}
    </AppButton>
  );
}
