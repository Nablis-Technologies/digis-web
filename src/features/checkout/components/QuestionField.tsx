import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import type { CustomQuestion } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge, glassField } from '@/lib/ui/glass';

function CustomDropdown({
  value, options, placeholder, onChange, onOpenChange, hasError, isDark,
}: {
  value: string; options: string[]; placeholder: string;
  onChange: (v: string) => void; onOpenChange?: (open: boolean) => void;
  hasError?: boolean; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const menuBg = isDark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)';

  const setOpenState = (next: boolean) => { setOpen(next); onOpenChange?.(next); };

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenState(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenState(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative rounded-xl overflow-hidden" style={glassField(isDark)}>
        <GlassReflection isDark={isDark} edgeState={hasError ? 'error' : open ? 'focus' : undefined} />
        <AppButton
          type="button"
          onClick={() => setOpenState(!open)}
          className="relative z-10 w-full pl-4 pr-10 py-3 outline-none transition-all text-left cursor-pointer flex items-center"
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: '14px',
            color: value ? textPrimary : textDim,
          }}
        >
          {value || placeholder}
        </AppButton>
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" style={{ color: open ? accent : textDim }} strokeWidth={2} />
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-0 right-0 z-30 mt-2 p-1.5 rounded-xl overflow-hidden origin-top"
            style={{
              background: menuBg,
              backdropFilter: 'blur(24px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
              boxShadow: isDark
                ? '0 16px 40px rgba(0,0,0,0.5)'
                : '0 16px 40px rgba(26,26,46,0.12)',
            }}
          >
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 max-h-[220px] overflow-y-auto scrollbar-hide">
              {options.map((opt) => {
                const active = value === opt;
                return (
                  <AppButton
                    key={opt}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => { onChange(opt); setOpenState(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-colors"
                    style={{
                      background: active
                        ? (isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.12)')
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,46,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span className="text-[13px]"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: active ? accent : textPrimary,
                        fontWeight: active ? 500 : 400,
                      }}>
                      {opt}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} style={{ color: accent }} />}
                  </AppButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuestionField({ question, value, error, onChange, isDark }: {
  question: CustomQuestion; value: any; error?: string;
  onChange: (v: any) => void; isDark: boolean;
}) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const hasError = !!error;
  const [focused, setFocused] = useState(false);

  const labelBlock = (
    <div className="flex items-baseline justify-between mb-2 ml-1 gap-2">
      <label className="text-[10px] tracking-[1.5px] uppercase"
        style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
        {question.label}
        {question.required && <span className="ml-1" style={{ color: '#f87171' }}>*</span>}
      </label>
      {question.helper && (
        <span className="text-[10px] truncate"
          style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {question.helper}
        </span>
      )}
    </div>
  );

  return (
    <div>
      {labelBlock}

      {question.type === 'text' && (
        <div className="relative rounded-xl overflow-hidden" style={glassField(isDark)}>
          <GlassReflection isDark={isDark} edgeState={hasError ? 'error' : focused ? 'focus' : undefined} />
          <AppInput
            type="text" value={value || ''} maxLength={question.maxLength}
            placeholder={question.placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            className="relative z-10 w-full px-4 py-3 outline-none transition-all"
            style={{
              fontFamily: "'Inter', sans-serif", fontSize: '14px',
              color: textPrimary,
            }}
          />
        </div>
      )}

      {question.type === 'textarea' && (
        <div className="relative rounded-xl overflow-hidden" style={glassField(isDark)}>
          <GlassReflection isDark={isDark} edgeState={hasError ? 'error' : focused ? 'focus' : undefined} />
          <AppTextArea
            value={value || ''} maxLength={question.maxLength}
            placeholder={question.placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            rows={3}
            className="relative z-10 w-full px-4 py-3 outline-none transition-all resize-none"
            style={{
              fontFamily: "'Inter', sans-serif", fontSize: '14px',
              color: textPrimary,
            }}
          />
        </div>
      )}

      {(question.type === 'select' || question.type === 'radio') && (
        <CustomDropdown
          value={value || ''}
          options={question.options || []}
          placeholder={question.placeholder || 'Select an option'}
          onChange={onChange}
          onOpenChange={setFocused}
          hasError={hasError}
          isDark={isDark}
        />
      )}

      {question.type === 'checkbox' && (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => {
            const arr: string[] = Array.isArray(value) ? value : [];
            const active = arr.includes(opt);
            const wide = opt.length > 18;
            return (
              <AppButton key={opt} type="button"
                onClick={() => onChange(active ? arr.filter((v) => v !== opt) : [...arr, opt])}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left cursor-pointer transition-all ${wide ? 'w-full' : ''}`}
                style={{
                  background: active
                    ? (isDark ? 'rgba(217,255,0,0.08)' : 'rgba(214,249,5,0.08)')
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)'),
                  ...glassEdge(isDark),
                }}>
                <span className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    boxShadow: `0 0 0 1.5px ${active ? accent : textDim}`,
                    background: active ? accent : 'transparent',
                  }}>
                  {active && <Check className="w-3 h-3" strokeWidth={3} style={{ color: '#0a0a0a' }} />}
                </span>
                <span className="text-[13px] whitespace-nowrap"
                  style={{ fontFamily: "'Inter', sans-serif", color: textPrimary }}>
                  {opt}
                </span>
              </AppButton>
            );
          })}
        </div>
      )}

      {question.type === 'textarea' && question.maxLength && (
        <div className="text-right text-[10px] mt-1 mr-1"
          style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {(value?.length || 0)}/{question.maxLength}
        </div>
      )}

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

