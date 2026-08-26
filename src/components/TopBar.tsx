import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Bell, Settings, LogOut, HelpCircle, Globe, Ticket, Tag, Sparkles, Calendar, Search, User, LogIn, Send } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { NAV_ITEMS } from '@/components/Navigation';
import { UserAvatar } from '@/components/UserAvatar';
import { useNotifications, notificationsStore } from '@/services/notifications.service';
import type { NotificationType } from '@/types/notification';
import { AppButton } from '@/components/primitives/AppButton';

interface TopBarProps {
  currentView?: string;
  onNavigate?: (view: 'discover' | 'tickets' | 'profile' | 'resale' | 'settings') => void;
  hidden?: boolean;
  showSearchButton?: boolean;
  onSearchClick?: () => void;
  onRequestAuth?: (mode: 'signin' | 'signup') => void;
}

const NOTIF_ICON: Record<NotificationType, typeof Ticket> = {
  ticket: Ticket,
  transfer: Send,
  price: Tag,
  event: Calendar,
  promo: Sparkles,
};

export function TopBar({ currentView, onNavigate, hidden = false, showSearchButton = false, onSearchClick, onRequestAuth }: TopBarProps = {}) {
  const [openMenu, setOpenMenu] = useState<'none' | 'notif' | 'profile'>('none');
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();

  const profileName = user?.name || 'Guest';
  const profileContact = user?.email || user?.phone || 'Browsing as guest';
  const openAuth = (mode: 'signin' | 'signup') => { setOpenMenu('none'); onRequestAuth?.(mode); };
  const wrapRef = useRef<HTMLDivElement>(null);
  const mobileWrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (openMenu === 'none') return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideDesktop = wrapRef.current?.contains(t);
      const insideMobile = mobileWrapRef.current?.contains(t);
      if (!insideDesktop && !insideMobile) setOpenMenu('none');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  // Simulated real-time incoming notification
  useEffect(() => {
    const t = setTimeout(() => {
      notificationsStore.push({
        type: 'price',
        title: 'New resale listing',
        body: 'A standard ticket for Tibeb Sounds is now available.',
      });
    }, 18000);
    return () => clearTimeout(t);
  }, []);

  const accent = isDark ? '#d6f905' : '#d6f905';
  // Foreground accent for text/icons — lime is illegible on the light panel, so use dark ink.
  const accentFg = isDark ? '#d6f905' : '#0a0a0a';
  const accentSoft = isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.08)';
  const accentBorder = isDark ? 'rgba(214,249,5,0.3)' : 'rgba(214,249,5,0.18)';

  const markAllRead = () => notificationsStore.markAllRead();

  const panelStyle = {
    background: isDark
      ? 'linear-gradient(165deg, rgba(28,28,28,0.95), rgba(16,16,16,0.98))'
      : 'linear-gradient(165deg, rgba(255,255,255,0.97), rgba(248,247,252,0.99))',
    backdropFilter: 'blur(60px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(60px) saturate(1.5)',
    border: `1px solid ${isDark ? 'rgba(214,249,5,0.15)' : 'rgba(0,0,0,0.08)'}`,
    boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.1)',
  };

  const triggers = (
    <>
      {/* Bell button */}
        <AppButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpenMenu(openMenu === 'notif' ? 'none' : 'notif')}
          className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors box-border"
          style={{
            background: openMenu === 'notif' ? accentSoft : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${openMenu === 'notif' ? accentBorder : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          aria-label="Notifications"
        >
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -12, 10, -6, 4, 0] } : { rotate: 0 }}
            transition={{ duration: 1.2, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 4 }}
          >
            <Bell className="w-[17px] h-[17px]" strokeWidth={1.75} style={{ color: isDark ? '#f4ff66' : '#0a0a0a' }} />
          </motion.div>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center"
              style={{
                background: '#ef4444',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontSize: '9.5px',
                fontWeight: 600,
                lineHeight: 1,
                boxShadow: '0 0 0 2px ' + (isDark ? '#0a0a0a' : '#fafafa'),
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AppButton>

        {/* Profile avatar — photo or initials when signed in, generic icon as guest */}
        <AppButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpenMenu(openMenu === 'profile' ? 'none' : 'profile')}
          className="relative w-10 h-10 rounded-full flex items-center justify-center box-border overflow-hidden"
          style={{
            border: `1px solid ${openMenu === 'profile' ? accentBorder : (isAuthenticated ? 'transparent' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'))}`,
            background: isAuthenticated ? 'transparent' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
            transition: 'border-color 0.25s ease',
          }}
          aria-label="Profile"
        >
          {isAuthenticated && user ? (
            <UserAvatar user={user} size={40} style={{ borderRadius: '50%' }} />
          ) : (
            <User className="w-[17px] h-[17px]" strokeWidth={1.75} style={{ color: isDark ? '#f4ff66' : '#0a0a0a' }} />
          )}
        </AppButton>
    </>
  );

  const menus = (
    <>
      {/* Notifications panel */}
      <AnimatePresence>
        {openMenu === 'notif' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-12 right-0 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
            style={panelStyle}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${isDark ? 'rgba(214,249,5,0.1)' : 'rgba(0,0,0,0.05)'}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}
                >
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] tracking-[0.5px]"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      background: accentSoft,
                      color: accentFg,
                      border: `1px solid ${accentBorder}`,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <AppButton
                  onClick={markAllRead}
                  className="text-[11px] tracking-[0.5px] transition-opacity hover:opacity-70"
                  style={{ fontFamily: "'Inter', sans-serif", color: accentFg }}
                >
                  Mark all read
                </AppButton>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto scrollbar-hide py-1">
              {notifications.length === 0 && (
                <div
                  className="px-4 py-10 text-center text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                >
                  You're all caught up.
                </div>
              )}
              {notifications.map((n) => {
                const Icon = NOTIF_ICON[n.type];
                return (
                  <AppButton
                    key={n.id}
                    onClick={() => {
                      notificationsStore.markRead(n.id);
                      if (n.link) {
                        setOpenMenu('none');
                        navigate(n.link);
                      }
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 transition-colors text-left"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: accentSoft,
                        border: `1px solid ${accentBorder}`,
                      }}
                    >
                      <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} style={{ color: accentFg }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-[12.5px] truncate"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
                          }}
                        >
                          {n.title}
                        </span>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accentFg }} />}
                      </div>
                      <p
                        className="text-[11.5px] leading-snug mb-1 line-clamp-2"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {n.body}
                      </p>
                      <span
                        className="text-[10px] tracking-[0.5px] uppercase"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                        }}
                      >
                        {n.time}
                      </span>
                    </div>
                  </AppButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile dropdown */}
      <AnimatePresence>
        {openMenu === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-12 right-0 w-64 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
            style={panelStyle}
          >
            <div
              className="p-4 pb-3 flex items-center gap-3"
              style={{ borderBottom: `1px solid ${isDark ? 'rgba(214,249,5,0.1)' : 'rgba(0,0,0,0.05)'}` }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: !isAuthenticated ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent' }}>
                {isAuthenticated && user ? (
                  <UserAvatar user={user} size={40} style={{ borderRadius: '50%' }} />
                ) : (
                  <User className="w-[18px] h-[18px]" strokeWidth={1.75} style={{ color: isDark ? '#f4ff66' : '#0a0a0a' }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-light truncate" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  {isAuthenticated ? profileName : 'Welcome'}
                </p>
                <p
                  className="text-[11px] truncate"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                >
                  {profileContact}
                </p>
              </div>
            </div>

            {/* Signed-out: single log in / create account button */}
            {!isAuthenticated && (
              <div className="p-2 pb-0">
                <AppButton
                  onClick={() => openAuth('signin')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer"
                  style={{
                    background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                    color: isDark ? '#000' : '#fff',
                    fontFamily: "'Inter', sans-serif", fontSize: '12.5px', fontWeight: 600,
                  }}
                >
                  <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                  Log in
                </AppButton>
              </div>
            )}

            <div className="p-2">
              <div
                className="relative grid grid-cols-2 p-1 rounded-xl"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                }}
              >
                <motion.div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg"
                  animate={{ left: isDark ? '4px' : 'calc(50% + 0px)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  style={{
                    background: isDark ? '#1a1a1a' : '#fff',
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <AppButton
                  onClick={() => { if (!isDark) toggleTheme(); }}
                  className="relative z-10 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: isDark ? '#d6f905' : 'rgba(0,0,0,0.5)' }} />
                  <span
                    className="text-[12px] tracking-[0.3px]"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: isDark ? 600 : 500, color: isDark ? '#fff' : 'rgba(0,0,0,0.6)' }}
                  >
                    Dark
                  </span>
                </AppButton>
                <AppButton
                  onClick={() => { if (isDark) toggleTheme(); }}
                  className="relative z-10 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: !isDark ? '#0a0a0a' : 'rgba(255,255,255,0.5)' }} />
                  <span
                    className="text-[12px] tracking-[0.3px]"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: !isDark ? 600 : 500, color: !isDark ? '#0a0a0a' : 'rgba(255,255,255,0.6)' }}
                  >
                    Light
                  </span>
                </AppButton>
              </div>

              <div className="my-1.5 h-px mx-2" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />

              
              {[
                { icon: <Globe className="w-4 h-4" strokeWidth={1.5} />, label: 'Language', action: () => setOpenMenu('none') },
                { icon: <Settings className="w-4 h-4" strokeWidth={1.5} />, label: 'Settings', action: () => { setOpenMenu('none'); onNavigate?.('settings'); } },
                { icon: <HelpCircle className="w-4 h-4" strokeWidth={1.5} />, label: 'Help & Support', action: () => setOpenMenu('none') },
              ].map((item) => (
                <AppButton
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: isDark ? 'rgba(214,249,5,0.6)' : 'rgba(0,0,0,0.5)' }}>{item.icon}</span>
                    <span
                      className="text-[13px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                    >
                      {item.label}
                    </span>
                  </div>
                </AppButton>
              ))}

              {isAuthenticated && (
                <>
                  <div className="my-1.5 h-px mx-2" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
                  <AppButton
                    onClick={() => { signOut(); setOpenMenu('none'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-red-500/[0.06]"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} style={{ color: 'rgba(239,68,68,0.6)' }} />
                    <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(239,68,68,0.7)' }}>
                      Log out
                    </span>
                  </AppButton>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Desktop / tablet: layout spacer to reserve the fixed bar's height */}
      <div className="hidden md:block h-[72px]" aria-hidden />

      {/* Desktop / tablet: full fixed top bar */}
      <motion.div
        className="hidden md:block fixed top-0 left-0 right-0 z-[30]"
        animate={{ y: hidden ? '-100%' : '0%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        data-hidden={hidden}
        style={{
          background: isDark
            ? 'rgba(10,10,12,0.52)'
            : 'rgba(245,243,252,0.56)',
          backdropFilter: 'blur(48px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(48px) saturate(1.8)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
          boxShadow: isDark
            ? 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)'
            : 'inset 0 -1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(20,18,40,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6 relative" ref={wrapRef}>
          {/* Brand */}
          <AppButton
            onClick={() => onNavigate?.('discover')}
            className="flex items-center gap-1 flex-shrink-0 group leading-none"
          >
            <svg viewBox="0 0 1000 1000" className="w-8 h-8 block" fill={isDark ? accent : '#0a0a0a'}>
              <path d="M481.88,355.78v142.38c-46.95-6.63-89.03-20.18-126.27-40.59-43.22-23.76-78.63-55.56-106.26-95.49-7.6-10.97-14.62-22.59-21.08-34.81-19.52-37.09-32.65-79-39.35-125.65h161.2c4.05,22.52,10.15,42.5,18.25,60.06,16.46,35.55,40.87,61.77,73.22,78.58,7.03,3.65,14.4,6.9,22.15,9.71,5.83,2.16,11.89,4.1,18.15,5.81Z"/>
              <rect x="482.05" y="196.36" width="325.96" height="160.48"/>
              <path d="M801.18,817.1h-161.33c-4.02-21.15-9.93-40.07-17.6-56.71-16.46-35.58-40.87-61.8-73.22-78.6-32.38-16.76-72.3-25.18-119.72-25.18h-81.21v-137.52h89.73c15.1,0,29.79.6,44.04,1.79,9.41.77,18.64,1.81,27.68,3.13,46.63,6.65,88.44,20.18,125.48,40.49,55.09,30.26,97.52,73.71,127.32,130.27,19.07,36.22,32,76.96,38.83,122.32Z"/>
              <rect x="187.65" y="656.64" width="160.46" height="160.46"/>
            </svg>
            <span
              className="text-[15px] leading-none tracking-[-0.3px] inline-block"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: isDark ? '#fff' : '#0a0a0a', transform: 'translateY(1px)' }}
            >
              Digis
            </span>
          </AppButton>

          {/* Center slot — nav pills always visible */}
          {currentView && onNavigate && (
            <nav className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = currentView === id;
                return (
                  <AppButton
                    key={id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onNavigate(id)}
                    className="relative flex items-center gap-2 px-3.5 lg:px-4 py-2 rounded-full transition-colors"
                    style={{
                      background: active
                        ? (isDark ? 'rgba(214,249,5,0.14)' : '#d6f905')
                        : 'transparent',
                      border: `1px solid ${active && isDark ? 'rgba(214,249,5,0.35)' : 'transparent'}`,
                      backdropFilter: active && isDark ? 'blur(12px)' : 'none',
                      WebkitBackdropFilter: active && isDark ? 'blur(12px)' : 'none',
                      color: active
                        ? (isDark ? accent : '#000')
                        : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'),
                      boxShadow: active
                        ? (isDark ? 'inset 0 1px 0 rgba(214,249,5,0.18)' : '0 4px 14px rgba(180,210,0,0.35)')
                        : 'none',
                    }}
                  >
                    <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
                    <span
                      className="text-[12px] tracking-[0.5px] hidden lg:inline"
                      style={{ fontFamily: "'Inter', sans-serif", fontWeight: active ? 600 : 500 }}
                    >
                      {label}
                    </span>
                  </AppButton>
                );
              })}
            </nav>
          )}

          {/* Right cluster */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            <AnimatePresence initial={false}>
              {showSearchButton && (
                <AppButton
                  key="searchbtn"
                  initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: -8 }}
                  animate={{ opacity: 1, scale: 1, width: 40, marginRight: 0 }}
                  exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: -8 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={onSearchClick}
                  className="relative h-10 rounded-full flex items-center justify-center box-border overflow-hidden"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                  aria-label="Search events"
                >
                  <Search className="w-[17px] h-[17px]" strokeWidth={1.75} style={{ color: isDark ? '#f4ff66' : '#0a0a0a' }} />
                </AppButton>
              )}
            </AnimatePresence>
            {!isAuthenticated && (
              <AppButton
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => openAuth('signin')}
                className="flex items-center gap-2 h-10 px-4 rounded-full cursor-pointer flex-shrink-0"
                style={{
                  background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                  color: isDark ? '#000' : '#fff',
                  fontFamily: "'Inter', sans-serif", fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.3px',
                }}
              >
                <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                Log in
              </AppButton>
            )}
            {triggers}
            {menus}
          </div>
        </div>
      </motion.div>

      {/* Mobile: floating bell + avatar — pt matches the discover hero brand row so they align */}
      <div className="md:hidden absolute top-0 right-0 z-[30] pt-6 pr-4" ref={mobileWrapRef}>
        <div className="flex items-center gap-2 relative">
          {triggers}
          {menus}
        </div>
      </div>
    </>
  );
}
