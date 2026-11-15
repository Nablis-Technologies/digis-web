import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Moon, Sun, Bell, Mail, Phone,
  Globe, CreditCard, Languages, Shield, Lock, Eye, FileText, HelpCircle,
  ChevronRight, LogOut, User, BadgeCheck, Sparkles, Pencil, Loader2,
  X, ShieldCheck, Camera, Trash2,
} from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import {
  fetchNotificationPreferences, channelPreferences, updateChannelPreference,
  type NotificationChannel, type ChannelPreferences,
} from '@/lib/notifications';
import { Divider, PickerList, Row, Section, SettingsSheet, ThemeSwitch, Toggle, ValuePill, EditField } from '@/features/profile/components/SettingsPrimitives';
import { SettingsAccountCard } from '@/features/profile/components/SettingsAccountCard';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassEdge } from '@/lib/ui/glass';

interface SettingsViewProps {
  onBack: () => void;
  onRequestAuth?: () => void;
}

export function SettingsView({ onBack, onRequestAuth }: SettingsViewProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();

  // Notification channel preferences — the backend stores a category × channel
  // matrix (GET/PATCH /notification_preferences); each toggle writes every
  // category on its channel. Fetched only while signed in (the endpoint is
  // authenticated), and never faked: load/save failures are surfaced.
  const [channelPrefs, setChannelPrefs] = useState<ChannelPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [savingChannel, setSavingChannel] = useState<NotificationChannel | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) { setChannelPrefs(null); return; }
    setPrefsLoading(true);
    setPrefsError(null);
    try {
      setChannelPrefs(channelPreferences(await fetchNotificationPreferences()));
    } catch {
      setChannelPrefs(null);
      setPrefsError('Couldn’t load your notification settings.');
    } finally {
      setPrefsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const toggleChannel = async (channel: NotificationChannel) => {
    if (!channelPrefs || savingChannel) return;
    setSavingChannel(channel);
    setPrefsError(null);
    try {
      // Reflect the change only once the server confirms it.
      setChannelPrefs(channelPreferences(await updateChannelPreference(channel, !channelPrefs[channel])));
    } catch {
      setPrefsError('Couldn’t save your notification settings. Please try again.');
    } finally {
      setSavingChannel(null);
    }
  };

  // Toggles
  const [publicProfile, setPublicProfile] = useState(true);

  // Preferences
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('ETB (Br)');
  const [region, setRegion] = useState('Ethiopia');

  // Security
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  // Profile editing state (G-14 & G-47)
  const { updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);

  // Sheet state — which bottom sheet is open
  type Sheet = 'none' | 'profile' | 'language' | 'currency' | 'region' | '2fa' | 'help' | 'terms' | 'privacy';
  const [sheet, setSheet] = useState<Sheet>('none');

  const openSheet = (s: Sheet) => {
    if (s === 'profile') {
      const parts = (user?.name || '').trim().split(' ');
      const rawFirst = user?.profile?.first_name ?? parts[0] ?? '';
      const rawLast = user?.profile?.last_name ?? parts.slice(1).join(' ') ?? '';
      setEditFirstName(rawFirst);
      setEditLastName(rawLast === rawFirst ? '' : rawLast);
      setProfileError(null);
    }
    setSheet(s);
  };
  const closeSheet = () => {
    setProfileError(null);
    setSheet('none');
  };

  const handleSaveProfile = async () => {
    const trimmedFirst = editFirstName.trim();
    const trimmedLast = editLastName.trim();
    if (!trimmedFirst) {
      setProfileError('Please enter your name.');
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    const res = await updateProfile({
      first_name: trimmedFirst,
      last_name: trimmedLast || trimmedFirst,
    });
    setProfileSaving(false);
    if (res.ok) {
      closeSheet();
    } else {
      setProfileError(res.error || 'Could not update profile names.');
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Avatar image must be under 5 MB.');
      return;
    }
    setAvatarUploading(true);
    setProfileError(null);
    const res = await uploadAvatar(file);
    setAvatarUploading(false);
    if (!res.ok) {
      setProfileError(res.error || 'Could not upload avatar image.');
    }
    // Reset file input value
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setAvatarRemoving(true);
    setProfileError(null);
    const res = await removeAvatar();
    setAvatarRemoving(false);
    if (!res.ok) {
      setProfileError(res.error || 'Could not remove avatar.');
    }
  };

  const brand = '#d6f905';
  const cardBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.7)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const heading = isDark ? '#fff' : '#0a0a0a';
  const subtle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const value = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
  const accentText = isDark ? brand : '#5a6b00';

  return (
    <div className="min-h-screen pb-28 lg:pb-12 px-5 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 lg:pt-10 mb-7">
        <AppButton
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ background: cardBg }}
        >
          <GlassReflection isDark={isDark} />
          <span className="relative z-10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} style={{ color: value }} />
          </span>
        </AppButton>
        <h1
          className="text-[28px] lg:text-[34px] font-light tracking-[-0.5px]"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: heading }}
        >
          Settings
        </h1>
      </div>

      <SettingsAccountCard
        isDark={isDark}
        cardBorder={cardBorder}
        cardBg={cardBg}
        value={value}
        heading={heading}
        isAuthenticated={isAuthenticated}
        user={user}
        accentText={accentText}
        subtle={subtle}
        onRequestAuth={onRequestAuth}
        onEditProfile={() => openSheet('profile')}
      />

      {/* Appearance */}
      <Section title="Appearance" isDark={isDark}>
        <Row
          icon={isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          label="Theme" hint={isDark ? 'Dark' : 'Light'} isDark={isDark}
          right={<ThemeSwitch isDark={isDark} checked={isDark} onToggle={toggleTheme} />}
        />
      </Section>

      {/* Notifications — per-channel preferences from GET/PATCH
          /notification_preferences. The backend stores one row per category ×
          channel; each toggle writes every category on its channel. */}
      <Section title="Notifications" isDark={isDark}>
        {prefsError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
              {prefsError}
            </span>
            <AppButton
              onClick={() => void loadPreferences()}
              className="text-[12px] underline cursor-pointer flex-shrink-0"
              style={{ fontFamily: "'Inter', sans-serif", color: accentText }}
            >
              Retry
            </AppButton>
          </div>
        )}
        <Row icon={<Bell className="w-4 h-4" />} label="Push notifications" hint="In-app alerts" isDark={isDark}
          right={<Toggle checked={channelPrefs?.in_app ?? true} onChange={() => void toggleChannel('in_app')}
            disabled={!isAuthenticated || channelPrefs === null || savingChannel !== null} isDark={isDark} />} />
        <Divider isDark={isDark} />
        <Row icon={<Mail className="w-4 h-4" />} label="Email updates" hint="To your account email" isDark={isDark}
          right={<Toggle checked={channelPrefs?.email ?? true} onChange={() => void toggleChannel('email')}
            disabled={!isAuthenticated || channelPrefs === null || savingChannel !== null} isDark={isDark} />} />
        <Divider isDark={isDark} />
        <Row icon={<Phone className="w-4 h-4" />} label="Text messages" hint="SMS to your phone" isDark={isDark}
          right={<Toggle checked={channelPrefs?.sms ?? true} onChange={() => void toggleChannel('sms')}
            disabled={!isAuthenticated || channelPrefs === null || savingChannel !== null} isDark={isDark} />} />
        {!isAuthenticated && (
          <p className="px-4 pt-2 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
            Sign in to manage your notification settings.
          </p>
        )}
      </Section>

      {/* Preferences */}
      <Section title="Preferences" isDark={isDark}>
        <Row icon={<Languages className="w-4 h-4" />} label="Language" isDark={isDark}
          right={<ValuePill value={language} isDark={isDark} />} clickable onClick={() => openSheet('language')} />
        <Divider isDark={isDark} />
        <Row icon={<CreditCard className="w-4 h-4" />} label="Currency" isDark={isDark}
          right={<ValuePill value={currency} isDark={isDark} />} clickable onClick={() => openSheet('currency')} />
        <Divider isDark={isDark} />
        <Row icon={<Globe className="w-4 h-4" />} label="Region" isDark={isDark}
          right={<ValuePill value={region} isDark={isDark} />} clickable onClick={() => openSheet('region')} />
      </Section>

      {/* Privacy & security */}
      <Section title="Privacy & Security" isDark={isDark}>
        <Row icon={<Eye className="w-4 h-4" />} label="Public profile" hint="Let others find you" isDark={isDark}
          right={<Toggle checked={publicProfile} onChange={() => setPublicProfile(v => !v)} isDark={isDark} />} />
        <Divider isDark={isDark} />
        {/* No self-service password endpoint yet (BACKEND_GAPS #8-deferred), so
            this is surfaced as unavailable rather than a fake success. */}
        <Row icon={<Lock className="w-4 h-4" />} label="Change password" hint="Coming soon" isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle, opacity: 0.4 }} />} />
        <Divider isDark={isDark} />
        <Row icon={<Shield className="w-4 h-4" />} label="Two-factor authentication" hint={twoFaEnabled ? 'On' : 'Off'} isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle }} />} clickable onClick={() => openSheet('2fa')} />
      </Section>

      {/* Support */}
      <Section title="Support" isDark={isDark}>
        <Row icon={<HelpCircle className="w-4 h-4" />} label="Help center" isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle }} />} clickable onClick={() => openSheet('help')} />
        <Divider isDark={isDark} />
        <Row icon={<FileText className="w-4 h-4" />} label="Terms of service" isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle }} />} clickable onClick={() => openSheet('terms')} />
        <Divider isDark={isDark} />
        <Row icon={<Shield className="w-4 h-4" />} label="Privacy policy" isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle }} />} clickable onClick={() => openSheet('privacy')} />
      </Section>

      {/* Sign out */}
      {isAuthenticated && (
        <AppButton
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (signingOut) return;
            setSigningOut(true);
            void signOut().finally(() => setSigningOut(false));
          }}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-pointer mb-6 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            ...glassControl(isDark, 'danger'),
            color: '#ef4444', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </AppButton>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2} style={{ color: accentText }} />
          <span className="text-[13px]"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 600, color: heading }}>
            Digis
          </span>
        </div>
        <span className="text-[10px] tracking-[1px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
          Version 1.0.0 · Made in Addis
        </span>
      </div>

      {/* ── Bottom sheets ── */}
      <AnimatePresence>
        {sheet !== 'none' && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[100]"
              style={{ background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(20,18,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              onClick={closeSheet}
            />

            {/* ── Profile Editor (G-14 & G-47) ── */}
            {sheet === 'profile' && (
              <SettingsSheet key="profile" title="Edit Profile" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                <div className="space-y-4">
                  {/* Avatar section */}
                  <div className="flex items-center gap-4 py-1">
                    <UserAvatar user={user} size={64} />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarFileChange}
                            disabled={avatarUploading || avatarRemoving}
                          />
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-opacity"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              color: heading,
                              fontFamily: "'Inter', sans-serif",
                              opacity: avatarUploading ? 0.6 : 1,
                            }}
                          >
                            {avatarUploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                            {avatarUploading ? 'Uploading…' : 'Change photo'}
                          </span>
                        </label>
                        {user?.profile?.avatar_url && (
                          <AppButton
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRemoveAvatar}
                            disabled={avatarUploading || avatarRemoving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium cursor-pointer"
                            style={{
                              background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                              color: '#ef4444',
                              fontFamily: "'Inter', sans-serif",
                              opacity: avatarRemoving ? 0.6 : 1,
                            }}
                          >
                            {avatarRemoving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            {avatarRemoving ? 'Removing…' : 'Remove'}
                          </AppButton>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                        JPEG, PNG, or WebP. Max 5 MB.
                      </p>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] mb-1 font-medium tracking-wide uppercase" style={{ color: subtle, fontFamily: "'Inter', sans-serif" }}>
                        First Name
                      </label>
                      <EditField
                        icon={<User className="w-4 h-4" />}
                        placeholder="First name"
                        value={editFirstName}
                        onChange={setEditFirstName}
                        isDark={isDark}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] mb-1 font-medium tracking-wide uppercase" style={{ color: subtle, fontFamily: "'Inter', sans-serif" }}>
                        Last Name <span className="opacity-60 normal-case font-normal">(optional)</span>
                      </label>
                      <EditField
                        icon={<User className="w-4 h-4" />}
                        placeholder="Last name (optional)"
                        value={editLastName}
                        onChange={setEditLastName}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  {/* Error feedback */}
                  {profileError && (
                    <div
                      className="p-3 rounded-xl text-[12px] leading-snug"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {profileError}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2">
                    <AppButton
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="w-full py-3 rounded-2xl cursor-pointer text-[13px] flex items-center justify-center gap-2 font-semibold"
                      style={{
                        background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                        color: isDark ? '#000' : '#fff',
                        fontFamily: "'Inter', sans-serif",
                        opacity: profileSaving ? 0.7 : 1,
                      }}
                    >
                      {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </AppButton>
                  </div>
                </div>
              </SettingsSheet>
            )}

            {/* ── Language picker ── */}
            {sheet === 'language' && (
              <SettingsSheet key="lang" title="Language" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                <PickerList
                  options={['English', 'Amharic (አማርኛ)', 'Oromo (Afaan Oromoo)', 'Somali', 'Tigrinya (ትግርኛ)', 'Arabic', 'French']}
                  selected={language}
                  onSelect={(v) => { setLanguage(v); closeSheet(); }}
                  isDark={isDark}
                />
              </SettingsSheet>
            )}

            {/* ── Currency picker ── */}
            {sheet === 'currency' && (
              <SettingsSheet key="cur" title="Currency" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                <PickerList
                  options={['ETB (Br)', 'USD ($)', 'EUR (€)', 'GBP (£)', 'AED (د.إ)', 'SAR (﷼)']}
                  selected={currency}
                  onSelect={(v) => { setCurrency(v); closeSheet(); }}
                  isDark={isDark}
                />
              </SettingsSheet>
            )}

            {/* ── Region picker ── */}
            {sheet === 'region' && (
              <SettingsSheet key="reg" title="Region" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                <PickerList
                  options={['Ethiopia', 'United States', 'United Kingdom', 'UAE', 'Saudi Arabia', 'Kenya', 'South Africa', 'Germany', 'France']}
                  selected={region}
                  onSelect={(v) => { setRegion(v); closeSheet(); }}
                  isDark={isDark}
                />
              </SettingsSheet>
            )}

            {/* ── 2FA ── */}
            {sheet === '2fa' && (
              <SettingsSheet key="2fa" title="Two-factor authentication" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                <div className="flex flex-col items-center text-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: twoFaEnabled ? 'rgba(52,211,153,0.12)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'), ...glassEdge(isDark) }}>
                    <ShieldCheck className="w-7 h-7" strokeWidth={1.75} style={{ color: twoFaEnabled ? '#10b981' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') }} />
                  </div>
                  <div>
                    <p className="text-[16px] font-light mb-1" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: heading }}>
                      {twoFaEnabled ? '2FA is enabled' : 'Add an extra layer of security'}
                    </p>
                    <p className="text-[13px] leading-relaxed max-w-[280px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                      {twoFaEnabled
                        ? 'Your account is protected with two-factor authentication.'
                        : 'Protect your account with a verification code each time you sign in.'}
                    </p>
                  </div>
                  <AppButton
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setTwoFaEnabled(v => !v); closeSheet(); }}
                    className="w-full py-3 rounded-2xl cursor-pointer text-[13px]"
                    style={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      ...(twoFaEnabled
                        ? glassControl(isDark, 'danger')
                        : { background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a' }),
                      color: twoFaEnabled ? '#ef4444' : (isDark ? '#000' : '#fff'),
                    }}
                  >
                    {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </AppButton>
                </div>
              </SettingsSheet>
            )}

            {/* ── Help / Terms / Privacy ── */}
            {(sheet === 'help' || sheet === 'terms' || sheet === 'privacy') && (
              <SettingsSheet
                key={sheet}
                title={sheet === 'help' ? 'Help Center' : sheet === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}
              >
                <div className="space-y-4 text-[13px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                  {sheet === 'help' && <>
                    <p>Have a question? Reach our support team and we'll get back to you within 24 hours.</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Email support', value: 'support@digis.et' },
                        { label: 'WhatsApp', value: '+251 91 234 5678' },
                        { label: 'Hours', value: 'Mon–Sat, 8 AM – 8 PM EAT' },
                      ].map(({ label, value }) => (
                        <div key={label} className="relative flex items-center justify-between p-3 rounded-xl overflow-hidden"
                          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <GlassReflection isDark={isDark} />
                          <div className="relative z-10 flex items-center justify-between w-full">
                            <span style={{ color: heading, fontWeight: 500 }}>{label}</span>
                            <span>{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>}
                  {sheet === 'terms' && <>
                    <p style={{ color: heading, fontWeight: 500 }}>Last updated: June 2026</p>
                    <p>By using Digis, you agree to our terms. You must be 13+ to use the platform. Tickets are non-refundable unless the event is cancelled. Resale is permitted only at or below the original face value plus applicable fees.</p>
                    <p>Digis reserves the right to cancel accounts that violate our community guidelines, including fraudulent ticket activity.</p>
                    <p>For the full terms, visit <span style={{ color: isDark ? brand : '#5a7500', fontWeight: 600 }}>digis.et/terms</span></p>
                  </>}
                  {sheet === 'privacy' && <>
                    <p style={{ color: heading, fontWeight: 500 }}>Last updated: June 2026</p>
                    <p>Digis collects only what's necessary to operate the platform: your name, email, phone, and purchase history. We never sell your data to third parties.</p>
                    <p>Ticket purchases are processed via secure, PCI-compliant payment providers. We store no raw card data.</p>
                    <p>For the full policy, visit <span style={{ color: isDark ? brand : '#5a7500', fontWeight: 600 }}>digis.et/privacy</span></p>
                  </>}
                </div>
              </SettingsSheet>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

