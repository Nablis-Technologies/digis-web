import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

interface FilterPanelProps {
  open: boolean;
  isDark: boolean;
  typeFilter: 'all' | 'VIP' | 'Regular';
  setTypeFilter: (v: 'all' | 'VIP' | 'Regular') => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  priceFilter: 'any' | 'belowFace' | 'atFace' | 'aboveFace';
  setPriceFilter: (v: 'any' | 'belowFace' | 'atFace' | 'aboveFace') => void;
  onReset: () => void;
}

export function FilterPanel({
  open, isDark, typeFilter, setTypeFilter, verifiedOnly, setVerifiedOnly,
  priceFilter, setPriceFilter, onReset,
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
          <div className="rounded-2xl p-4 space-y-4"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}>
            <div>
              <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Ticket Type
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={typeFilter === 'all'} label="All" onClick={() => setTypeFilter('all')} />
                <Chip active={typeFilter === 'VIP'} label="VIP" onClick={() => setTypeFilter('VIP')} />
                <Chip active={typeFilter === 'Regular'} label="Regular" onClick={() => setTypeFilter('Regular')} />
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Price vs Face Value
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={priceFilter === 'any'} label="Any" onClick={() => setPriceFilter('any')} />
                <Chip active={priceFilter === 'belowFace'} label="Below face" onClick={() => setPriceFilter('belowFace')} />
                <Chip active={priceFilter === 'atFace'} label="At face" onClick={() => setPriceFilter('atFace')} />
                <Chip active={priceFilter === 'aboveFace'} label="Above face" onClick={() => setPriceFilter('aboveFace')} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <AppButton onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="flex items-center gap-2 cursor-pointer">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{
                    background: verifiedOnly ? accent : 'transparent',
                    border: `1.5px solid ${verifiedOnly ? accent : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`,
                  }}>
                  {verifiedOnly && <Check className="w-3 h-3" style={{ color: '#0a0a0a' }} strokeWidth={3} />}
                </div>
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                  Verified sellers only
                </span>
              </AppButton>
              <AppButton onClick={onReset}
                className="text-[11px] cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Reset
              </AppButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Resale marketplace empty state ─── */
// Deterministic floating particles (price tags / coins drifting up).
