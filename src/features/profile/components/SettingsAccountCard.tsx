import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, BadgeCheck, Check, ChevronRight, KeyRound, Loader2, Mail, Pencil, Phone, ShieldCheck, User, X } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { CancelBtn, EditField, OtpInput, SaveBtn } from '@/features/profile/components/SettingsPrimitives';
import { AppButton } from '@/components/primitives/AppButton';

export function SettingsAccountCard(props: any) {
  const {
    isDark, cardBorder, cardBg, value, heading, avatarColor, isAuthenticated, user,
    step, savedFlash, pickPhoto, removePhoto, openEdit, accentText, subtle,
    formName, setFormName, formEmail, setFormEmail, formPhone, setFormPhone,
    formError, closeEdit, saving, saveInfo, setStep, setOtpError, proceedToPhone,
    otp, setOtp, otpError, verifyOtp, onRequestAuth,
  } = props;
  return (
<>
{/* Account card */}
<motion.div
  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
  className="relative overflow-hidden rounded-3xl mb-7"
  style={{
    background: isDark
      ? 'linear-gradient(150deg, rgba(217,255,0,0.08), rgba(255,255,255,0.02))'
      : 'linear-gradient(150deg, rgba(214,249,5,0.14), rgba(255,255,255,0.7))',
    border: `1px solid ${isDark ? 'rgba(217,255,0,0.18)' : 'rgba(214,249,5,0.35)'}`,
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  }}
>
  {isAuthenticated && user ? (
    <AnimatePresence mode="wait" initial={false}>
      {/* ── View mode ── */}
      {step === 'idle' && (
        <motion.div
          key="view"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="relative flex items-center gap-4 p-5"
        >
          {/* Tappable avatar — opens photo picker */}
          <AppButton onClick={pickPhoto} className="relative flex-shrink-0 cursor-pointer group">
            <UserAvatar user={user} size={56} />
            <div
              className="absolute inset-0 rounded-[18px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            >
              <Pencil className="w-4 h-4" strokeWidth={2} style={{ color: '#fff' }} />
            </div>
          </AppButton>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[15px] truncate"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: heading }}>
                {user.name}
              </p>
              <BadgeCheck className="w-4 h-4 flex-shrink-0" strokeWidth={2} style={{ color: accentText }} />
              <AnimatePresence>
                {savedFlash && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={3} /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-[12px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
              {user.email || user.phone || 'Digis member'}
            </p>
            {user.phone && (
              <p className="text-[11px] mt-0.5 truncate" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                {user.phone}
              </p>
            )}
            {/* Quick photo actions under name */}
            <div className="flex items-center gap-2 mt-1.5">
              <AppButton onClick={pickPhoto} className="text-[10px] cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: accentText }}>
                {user.photo ? 'Change photo' : '+ Add photo'}
              </AppButton>
              {user.photo && (
                <>
                  <span style={{ color: subtle, fontSize: 10 }}>·</span>
                  <AppButton onClick={removePhoto} className="text-[10px] cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: '#f87171' }}>
                    Remove
                  </AppButton>
                </>
              )}
            </div>
          </div>
          <AppButton
            whileTap={{ scale: 0.92 }}
            onClick={openEdit}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${cardBorder}` }}
          >
            <Pencil className="w-4 h-4" strokeWidth={1.75} style={{ color: value }} />
          </AppButton>
        </motion.div>
      )}

      {/* ── Edit: name + email ── */}
      {step === 'info' && (
        <motion.div
          key="edit-info"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="relative p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <AppButton onClick={pickPhoto} className="relative flex-shrink-0 cursor-pointer group">
              <UserAvatar user={user} size={40} />
              <div
                className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                <Pencil className="w-3 h-3" strokeWidth={2} style={{ color: '#fff' }} />
              </div>
            </AppButton>
            <div>
              <p className="text-[12px] tracking-[2px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: accentText }}>
                Edit profile
              </p>
              <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                Name &amp; email
              </p>
            </div>
            <AppButton onClick={closeEdit} className="ml-auto cursor-pointer"
              style={{ color: subtle }}>
              <X className="w-4.5 h-4.5" strokeWidth={2} />
            </AppButton>
          </div>

          <div className="space-y-2.5">
            <EditField icon={<User className="w-4 h-4" />} placeholder="Full name" value={formName} onChange={setFormName} isDark={isDark} />
            <EditField icon={<Mail className="w-4 h-4" />} type="email" placeholder="Email (optional)" value={formEmail} onChange={setFormEmail} isDark={isDark} />
          </div>

          {/* Phone row — tapping prompts OTP */}
          <AppButton
            onClick={() => { setStep('phone-entry'); setOtpError(''); }}
            className="w-full mt-2.5 flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer"
            style={{
              background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <Phone className="w-4 h-4 flex-shrink-0" style={{ color: subtle }} />
            <span className="flex-1 text-left text-[14px]"
              style={{ fontFamily: "'Inter', sans-serif", color: user?.phone ? value : subtle }}>
              {user?.phone || 'Add phone number'}
            </span>
            <div className="flex items-center gap-1"
              style={{ color: accentText, fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 600 }}>
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
              OTP required
            </div>
          </AppButton>

          <AnimatePresence>
            {formError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 mt-2.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: '#f87171' }} />
                <span className="text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{formError}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2.5 mt-4">
            <CancelBtn onClick={closeEdit} isDark={isDark} value={value} cardBorder={cardBorder} />
            <SaveBtn onClick={saveInfo} saving={saving} isDark={isDark} />
          </div>
        </motion.div>
      )}

      {/* ── Edit: phone entry ── */}
      {step === 'phone-entry' && (
        <motion.div
          key="edit-phone"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="relative p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} style={{ color: accentText }} />
            <p className="text-[13px] tracking-[1.5px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: accentText }}>
              Change phone number
            </p>
            <AppButton onClick={() => setStep('info')} className="ml-auto cursor-pointer" style={{ color: subtle }}>
              <X className="w-4 h-4" strokeWidth={2} />
            </AppButton>
          </div>
          <p className="text-[12px] leading-relaxed mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
            Enter your new number. We'll send a one-time code to verify it before saving.
          </p>
          <EditField
            icon={<Phone className="w-4 h-4" />}
            type="tel"
            placeholder="+251 9x xxx xxxx"
            value={formPhone}
            onChange={setFormPhone}
            isDark={isDark}
          />
          <div className="flex gap-2.5 mt-4">
            <CancelBtn onClick={() => setStep('info')} isDark={isDark} value={value} cardBorder={cardBorder} label="Back" />
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={proceedToPhone}
              disabled={!formPhone.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer disabled:opacity-40"
              style={{
                background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                color: isDark ? '#000' : '#fff', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
              }}
            >
              Send OTP
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </AppButton>
          </div>
        </motion.div>
      )}

      {/* ── Edit: OTP verification ── */}
      {step === 'phone-otp' && (
        <motion.div
          key="otp"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="relative p-5"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.15)',
                border: `1.5px solid ${isDark ? 'rgba(217,255,0,0.3)' : 'rgba(180,210,0,0.5)'}`,
              }}
            >
              <KeyRound className="w-5 h-5" strokeWidth={1.75} style={{ color: accentText }} />
            </div>
            <p className="text-[14px]"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: heading }}>
              Verify your number
            </p>
            <p className="text-[12px] mt-1 max-w-[260px]"
              style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
              Enter the 6-digit code sent to{' '}
              <span style={{ color: value, fontWeight: 600 }}>{formPhone}</span>
              {' '}(demo: <span style={{ color: accentText, fontWeight: 700 }}>123456</span>)
            </p>
          </div>

          {/* 6-box OTP input */}
          <OtpInput value={otp} onChange={setOtp} isDark={isDark} />

          <AnimatePresence>
            {otpError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-1.5 mt-3">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: '#f87171' }} />
                <span className="text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{otpError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2.5 mt-4">
            <CancelBtn onClick={() => setStep('phone-entry')} isDark={isDark} value={value} cardBorder={cardBorder} label="Back" />
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={verifyOtp}
              disabled={otp.length < 6 || saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer disabled:opacity-40"
              style={{
                background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                color: isDark ? '#000' : '#fff', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
              }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} /> Verify & save</>}
            </AppButton>
          </div>

          <AppButton
            onClick={() => setStep('phone-entry')}
            className="w-full mt-3 text-center text-[11px] cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif", color: subtle }}
          >
            Wrong number? <span style={{ color: accentText, fontWeight: 600 }}>Change it</span>
          </AppButton>
        </motion.div>
      )}
    </AnimatePresence>
  ) : (
    /* Guest card */
    <div className="relative flex items-center gap-4 p-5">
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
</>
  );
}
