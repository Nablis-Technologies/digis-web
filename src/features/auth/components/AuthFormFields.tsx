import { useId, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { FieldError } from '@/components/primitives/FieldError';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassField } from '@/lib/ui/glass';

interface AuthFieldProps { value: string; onChange: (value: string) => void; isDark: boolean; error?: string; disabled?: boolean; autoFocus?: boolean; onEnter?: () => void }

export function PasswordField({ value, onChange, isDark, placeholder, label, autoComplete, onEnter, error, disabled }: AuthFieldProps & { placeholder: string; label?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const id = useId();
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  return <div>
    <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all overflow-hidden" style={glassField(isDark, { error: !!error, focused })}>
      <GlassReflection isDark={isDark} />
      <span className="relative z-10" style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim }}><Lock className="w-4 h-4" /></span>
      <AppInput id={id} type={show ? 'text' : 'password'} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} autoComplete={autoComplete} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="relative z-10 min-w-0 flex-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: isDark ? '#fff' : '#1a1a1a', background: 'transparent' }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={event => { if (event.key === 'Enter' && !disabled) onEnter?.(); }} />
      <AppButton type="button" disabled={disabled} aria-label={`${show ? 'Hide' : 'Show'} ${(label ?? placeholder).toLowerCase()}`} onClick={() => setShow(previous => !previous)} className="relative z-10 min-w-9 min-h-9 flex items-center justify-center flex-shrink-0" style={{ color: textDim }}>{show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}</AppButton>
    </div>
    {error && <div id={`${id}-error`}><FieldError error={error} /></div>}
  </div>;
}

export function OtpCodeField({ value, onChange, isDark, onEnter, error, disabled, autoFocus }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  return <div>
    <div className="relative flex items-center justify-center px-4 py-3 rounded-xl transition-all overflow-hidden" style={glassField(isDark, { error: !!error, focused })}>
      <GlassReflection isDark={isDark} />
      <AppInput id={id} autoFocus={autoFocus} type="text" inputMode="numeric" autoComplete="one-time-code" disabled={disabled} maxLength={6} value={value} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" className="relative z-10 text-center font-mono text-[22px] tracking-[8px] outline-none w-full bg-transparent" style={{ color: isDark ? '#fff' : '#111' }} aria-label="Verification code" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={event => { if (event.key === 'Enter' && !disabled) onEnter?.(); }} />
    </div>
    {error && <div id={`${id}-error`}><FieldError error={error} /></div>}
  </div>;
}
