import { motion, AnimatePresence } from 'motion/react';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

interface FilterPanelProps {
  open: boolean;
  isDark: boolean;
  /** Distinct ticket-type names from the live browse data. */
  typeOptions: string[];
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onReset: () => void;
}

export function FilterPanel({
  open, isDark, typeOptions, typeFilter, setTypeFilter, onReset,
}: FilterPanelProps) {
  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const Chip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <AppButton whileTap={{ scale: 0.95 }} onClick={onClick}
      className="px-3 py-1.5 rounded-full cursor-pointer text-[11px] tracking-[0.3px]"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: active ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.08)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
        border: `1px solid ${active ? (isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.2)') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}`,
        color: active ? accent : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'),
      }}>
      {label}
    </AppButton>
  );
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden p-4 space-y-4"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 space-y-4">
            <div>
              <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Ticket Type
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={typeFilter === 'all'} label="All" onClick={() => setTypeFilter('all')} />
                {typeOptions.map((t) => (
                  <Chip key={t} active={typeFilter === t} label={t} onClick={() => setTypeFilter(t)} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end">
              <AppButton onClick={onReset}
                className="text-[11px] cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Reset
              </AppButton>
            </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
