import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  ArrowLeft, Moon, Sun, Bell, Mail, Phone, Ticket, ArrowUpDown,
  Globe, CreditCard, Languages, Shield, Lock, Eye, FileText, HelpCircle,
  ChevronRight, LogOut, User, BadgeCheck, Sparkles, Pencil, Check, Loader2,
  X, AlertCircle, KeyRound, ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { flatAvatarColor } from '@/lib/utils/avatarColor';
import { CancelBtn, Divider, EditField, PickerList, Row, SaveBtn, Section, SettingsSheet, ThemeSwitch, Toggle, ValuePill } from '@/features/profile/components/SettingsPrimitives';
import { SettingsAccountCard } from '@/features/profile/components/SettingsAccountCard';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

interface SettingsViewProps {
  onBack: () => void;
  onRequestAuth?: () => void;
}

export function SettingsView({ onBack, onRequestAuth }: SettingsViewProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();

  // Toggles
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [resaleAlerts, setResaleAlerts] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);

  // Preferences
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('ETB (Br)');
  const [region, setRegion] = useState('Ethiopia');

  // Security
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  // Sheet state — which bottom sheet is open
  type Sheet = 'none' | 'changePassword' | 'language' | 'currency' | 'region' | '2fa' | 'help' | 'terms' | 'privacy';
  const [sheet, setSheet] = useState<Sheet>('none');

  // Change-password form state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const openSheet = (s: Sheet) => setSheet(s);
  const closeSheet = () => {
    setSheet('none');
    setPwCurrent(''); setPwNew(''); setPwConfirm(''); setPwError(''); setPwSaving(false); setPwSaved(false);
  };

  const handleChangePassword = async () => {
    if (!pwCurrent.trim()) { setPwError('Enter your current password.'); return; }
    if (pwNew.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwNew !== pwConfirm) { setPwError('Passwords don\'t match.'); return; }
    setPwError(''); setPwSaving(true);
    await new Promise(r => setTimeout(r, 900)); // simulated API call
    setPwSaving(false); setPwSaved(true);
    setTimeout(closeSheet, 1400);
  };

  const avatarColor = flatAvatarColor(user?.name || user?.email || 'Digis');
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
        avatarColor={avatarColor}
        isAuthenticated={isAuthenticated}
        user={user}
        accentText={accentText}
        subtle={subtle}
        onRequestAuth={onRequestAuth}
      />

      {/* Appearance */}
      <Section title="Appearance" isDark={isDark}>
        <Row
          icon={isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          label="Theme" hint={isDark ? 'Dark' : 'Light'} isDark={isDark}
          right={<ThemeSwitch isDark={isDark} checked={isDark} onToggle={toggleTheme} />}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" isDark={isDark}>
        <Row icon={<Bell className="w-4 h-4" />} label="Push notifications" isDark={isDark}
          right={<Toggle checked={pushNotifs} onChange={() => setPushNotifs(v => !v)} isDark={isDark} />} />
        <Divider isDark={isDark} />
        <Row icon={<Mail className="w-4 h-4" />} label="Email updates" isDark={isDark}
          right={<Toggle checked={emailNotifs} onChange={() => setEmailNotifs(v => !v)} isDark={isDark} />} />
        <Divider isDark={isDark} />
        <Row icon={<Ticket className="w-4 h-4" />} label="Event reminders" hint="Before doors open" isDark={isDark}
          right={<Toggle checked={eventReminders} onChange={() => setEventReminders(v => !v)} isDark={isDark} />} />
        <Divider isDark={isDark} />
        <Row icon={<ArrowUpDown className="w-4 h-4" />} label="Resale alerts" hint="When prices drop" isDark={isDark}
          right={<Toggle checked={resaleAlerts} onChange={() => setResaleAlerts(v => !v)} isDark={isDark} />} />
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
        <Row icon={<Lock className="w-4 h-4" />} label="Change password" isDark={isDark}
          right={<ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: subtle }} />} clickable onClick={() => openSheet('changePassword')} />
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
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-pointer mb-6"
          style={{
            background: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'}`,
            color: '#ef4444', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
          Sign out
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

            {/* ── Change password ── */}
            {sheet === 'changePassword' && (
              <SettingsSheet key="pw" title="Change password" onClose={closeSheet} isDark={isDark} brand={brand} cardBorder={cardBorder}>
                {pwSaved ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-4 gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                      <Check className="w-6 h-6" strokeWidth={2.5} style={{ color: '#10b981' }} />
                    </div>
                    <p className="text-[15px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: heading, fontWeight: 300 }}>Password updated</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <EditField icon={<Lock className="w-4 h-4" />} type="password" placeholder="Current password" value={pwCurrent} onChange={setPwCurrent} isDark={isDark} />
                    <EditField icon={<KeyRound className="w-4 h-4" />} type="password" placeholder="New password (min 8 chars)" value={pwNew} onChange={setPwNew} isDark={isDark} />
                    <EditField icon={<ShieldCheck className="w-4 h-4" />} type="password" placeholder="Confirm new password" value={pwConfirm} onChange={setPwConfirm} isDark={isDark} />
                    <AnimatePresence>
                      {pwError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-[12px] flex items-center gap-1.5" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                          <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} /> {pwError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <div className="flex gap-2 pt-1">
                      <CancelBtn onClick={closeSheet} isDark={isDark} value={value} cardBorder={cardBorder} />
                      <SaveBtn onClick={handleChangePassword} saving={pwSaving} isDark={isDark} />
                    </div>
                  </div>
                )}
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
                    style={{ background: twoFaEnabled ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${twoFaEnabled ? 'rgba(52,211,153,0.3)' : cardBorder}` }}>
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
                      background: twoFaEnabled ? 'rgba(239,68,68,0.1)' : (isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a'),
                      color: twoFaEnabled ? '#ef4444' : (isDark ? '#000' : '#fff'),
                      border: twoFaEnabled ? '1px solid rgba(239,68,68,0.25)' : 'none',
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

