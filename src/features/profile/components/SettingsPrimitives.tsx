import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, Loader2, Moon, Sun, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AppButton } from '@/components/primitives/AppButton';
import { Switch } from '@/components/ui/switch';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';

/* ─── 6-box OTP input ─── */
export function OtpInput({ value, onChange, isDark }: { value: string; onChange: (v: string) => void; isDark: boolean }) {
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(raw);
  };
  return (
    <div className="relative flex justify-center gap-2">
      {/* Invisible full-width input overlay */}
      <AppInput
        type="tel"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-text"
        autoFocus
      />
      {digits.map((d, i) => (
        <div
          key={i}
          className="w-10 h-12 rounded-xl flex items-center justify-center text-[20px]"
          style={{
            fontFamily: "'Zalando Sans Expanded', sans-serif",
            fontWeight: 600,
            color: isDark ? '#fff' : '#0a0a0a',
            background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.9)',
            border: `1.5px solid ${
              d
                ? isDark ? 'rgba(217,255,0,0.55)' : 'rgba(180,210,0,0.7)'
                : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
            }`,
            boxShadow: d
              ? `0 0 0 3px ${isDark ? 'rgba(217,255,0,0.12)' : 'rgba(214,249,5,0.15)'}`
              : 'none',
          }}
        >
          {d || <span style={{ opacity: 0.2 }}>·</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Shared sub-button primitives ─── */
export function CancelBtn({ onClick, isDark, value, cardBorder, label = 'Cancel' }: {
  onClick: () => void; isDark: boolean; value: string; cardBorder: string; label?: string;
}) {
  return (
    <AppButton
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer"
      style={{
        background: 'transparent', border: `1px solid ${cardBorder}`,
        color: value, fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
      }}
    >
      <X className="w-3.5 h-3.5" strokeWidth={2} /> {label}
    </AppButton>
  );
}

export function SaveBtn({ onClick, saving, isDark }: { onClick: () => void; saving: boolean; isDark: boolean }) {
  return (
    <AppButton
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={saving}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
      style={{
        background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
        color: isDark ? '#000' : '#fff', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
      }}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Save</>}
    </AppButton>
  );
}

/* ─── Building blocks ─── */
export function Section({ title, isDark, children }: { title: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
      <h2
        className="text-[11px] tracking-[2px] uppercase mb-2.5 ml-1"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.5)' }}
      >
        {title}
      </h2>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function Divider({ isDark }: { isDark: boolean }) {
  return <div className="h-px ml-[52px]" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />;
}

export function Row({ icon, label, hint, right, isDark, clickable, onClick }: {
  icon: React.ReactNode; label: string; hint?: string; right?: React.ReactNode; isDark: boolean; clickable?: boolean; onClick?: () => void;
}) {
  const heading = isDark ? '#fff' : '#0a0a0a';
  const subtle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${clickable ? 'cursor-pointer active:opacity-70' : ''}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.65)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: heading }}>{label}</p>
        {hint && <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>{hint}</p>}
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

export function EditField({ icon, type = 'text', placeholder, value, onChange, isDark }: {
  icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void; isDark: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const dim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all"
      style={{
        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${focused ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(180,210,0,0.7)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
      }}
    >
      <span style={{ color: focused ? (isDark ? '#d6f905' : '#5a6b00') : dim }}>{icon}</span>
      <AppInput
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent outline-none text-[14px]"
        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}
      />
    </div>
  );
}

export function ValuePill({ value, isDark }: { value: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
        {value}
      </span>
      <ChevronRight className="w-4 h-4" strokeWidth={1.75} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }} />
    </div>
  );
}

export function Toggle({ checked, onChange, isDark }: { checked: boolean; onChange: () => void; isDark: boolean }) {
  return (
    <Switch checked={checked} onCheckedChange={onChange} unstyled aria-label="Toggle setting" className="relative rounded-full cursor-pointer transition-colors duration-300"
      style={{ width: 44, height: 26, background: checked ? (isDark ? '#d6f905' : '#0a0a0a') : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)') }}
      thumbClassName="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-[transform,background-color] duration-300 data-[state=unchecked]:translate-x-[3px] data-[state=checked]:translate-x-[21px] dark:data-[state=checked]:bg-[#0a0a0a]" />
  );
}

export function ThemeSwitch({ checked, onToggle, isDark }: { checked: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <AppButton onClick={onToggle} className="relative rounded-full cursor-pointer flex items-center transition-colors duration-300"
      style={{
        width: 64, height: 30,
        background: isDark ? 'rgba(217,255,0,0.15)' : 'rgba(0,0,0,0.06)',
        border: `1px solid ${isDark ? 'rgba(217,255,0,0.25)' : 'rgba(0,0,0,0.08)'}`,
      }}
      aria-pressed={checked}>
      <motion.div className="absolute rounded-full flex items-center justify-center"
        style={{ width: 24, height: 24, background: isDark ? '#d6f905' : '#0a0a0a' }}
        animate={{ left: checked ? 3 : 37 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}>
        {checked
          ? <Moon className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: '#0a0a0a' }} />
          : <Sun className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: '#fff' }} />}
      </motion.div>
    </AppButton>
  );
}

/* ─── Reusable bottom sheet wrapper ─── */
export function SettingsSheet({ title, onClose, isDark, brand, cardBorder, children }: {
  title: string; onClose: () => void; isDark: boolean; brand: string; cardBorder: string; children: React.ReactNode;
}) {
  const heading = isDark ? '#fff' : '#0a0a0a';
  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed bottom-0 left-0 right-0 z-[120] px-4 pb-10 pt-2 max-w-lg mx-auto"
    >
      <div
        className="relative rounded-[24px] overflow-hidden px-5 pt-6 pb-5"
        style={{
          background: isDark ? 'rgba(18,18,22,0.96)' : 'rgba(255,255,255,0.98)',
          border: `1px solid ${cardBorder}`,
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          boxShadow: isDark ? '0 -20px 60px rgba(0,0,0,0.6)' : '0 -16px 48px rgba(20,18,40,0.16)',
        }}
      >
        {/* Handle */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
          style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[17px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: heading }}>{title}</p>
          <AppButton whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <X className="w-4 h-4" strokeWidth={2} style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} />
          </AppButton>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Picker list (language / currency / region) ─── */
export function PickerList({ options, selected, onSelect, isDark }: {
  options: string[]; selected: string; onSelect: (v: string) => void; isDark: boolean;
}) {
  const heading = isDark ? '#fff' : '#0a0a0a';
  const brand = '#d6f905';
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-hide">
      {options.map(opt => {
        const active = opt === selected;
        return (
          <AppButton
            key={opt}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt)}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl cursor-pointer text-left"
            style={{
              background: active ? (isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.14)') : 'transparent',
              border: `1px solid ${active ? (isDark ? 'rgba(214,249,5,0.3)' : 'rgba(180,210,0,0.5)') : 'transparent'}`,
            }}
          >
            <span className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: active ? 600 : 400, color: heading }}>{opt}</span>
            {active && <Check className="w-4 h-4" strokeWidth={2.5} style={{ color: isDark ? brand : '#5a7500' }} />}
          </AppButton>
        );
      })}
    </div>
  );
}
