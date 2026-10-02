import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Mail, Phone, Shield, User } from 'lucide-react';
import type { ContactDetails } from '@/features/checkout/hooks/useCheckoutFlow';
import { SegmentedToggle } from '@/components/primitives/SegmentedToggle';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';

export function DetailsStep({
  name, setName, email, setEmail, phone, setPhone,
  contactMethod, setContactMethod, errors, setErrors,
  isDark,
}: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h3 className="text-[20px] font-light mb-1"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
          Where should we send your ticket?
        </h3>
        <p className="text-[12px]"
          style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
          We'll send a confirmation and receipt right away.
        </p>
      </div>

      <Field
        icon={<User className="w-4 h-4" />} label="Name" placeholder="Abebe Bekele"
        value={name} onChange={(v: string) => { setName(v); setErrors((e: any) => ({ ...e, name: undefined })); }}
        error={errors.name} isDark={isDark}
      />
      <div>
        <div className="flex items-baseline justify-between mb-2 ml-1">
          <label className="text-[10px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
            How should we reach you?
          </label>
        </div>
        {/* Email / Phone segmented toggle */}
        <SegmentedToggle
          className="mb-3"
          value={contactMethod}
          onValueChange={(method) => {
            setContactMethod(method);
            setErrors((e: any) => ({ ...e, email: undefined, phone: undefined }));
          }}
          options={[
            { value: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" strokeWidth={1.8} /> },
            { value: 'phone', label: 'Phone', icon: <Phone className="w-3.5 h-3.5" strokeWidth={1.8} /> },
          ]}
          isDark={isDark}
          ariaLabel="Preferred ticket contact method"
        />
        {contactMethod === 'email' ? (
          <Field
            icon={<Mail className="w-4 h-4" />} type="email" placeholder="you@example.com"
            value={email} onChange={(v: string) => { setEmail(v); setErrors((e: any) => ({ ...e, email: undefined })); }}
            error={errors.email} isDark={isDark}
          />
        ) : (
          <Field
            icon={<Phone className="w-4 h-4" />} type="tel" placeholder="+251 9 XX XXX XXX"
            value={phone} onChange={(v: string) => { setPhone(v); setErrors((e: any) => ({ ...e, phone: undefined })); }}
            error={errors.phone} isDark={isDark}
          />
        )}
      </div>

      <div className="relative flex items-start gap-2.5 rounded-xl overflow-hidden p-3.5 mt-2"
        style={{
          background: isDark ? 'rgba(217,255,0,0.06)' : 'rgba(214,249,5,0.05)',
        }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex items-start gap-2.5">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5}
          style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
        <p className="text-[11px] leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
          Your details are encrypted and used only for your ticket. We never share with third parties.
        </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, type = 'text', placeholder, value, onChange, error, isDark }: any) {
  const [focused, setFocused] = useState(false);
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const hasError = !!error;

  return (
    <div>
      {label && (
        <label className="text-[10px] tracking-[1.5px] uppercase mb-2 ml-1 block"
          style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim, transition: 'color 0.2s' }}>
          {icon}
        </div>
        <AppInput
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
            border: `1px solid ${hasError
              ? '#ef4444'
              : focused
                ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(214,249,5,0.4)')
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)')}`,
            color: textPrimary,
            boxShadow: focused && !hasError
              ? `0 0 0 4px ${isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.08)'}`
              : 'none',
          }}
        />
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1.5 mt-1.5 ml-1"
          >
            <AlertCircle className="w-3 h-3 text-red-400" strokeWidth={2} />
            <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
