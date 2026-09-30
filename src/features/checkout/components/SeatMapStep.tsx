import { motion } from 'motion/react';
import type { SeatSection, SelectedSeat } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';
import { Money } from '@/lib/money';

interface SeatMapStepProps {
  sections: SeatSection[];
  stageLabel?: string;
  basePrice: number;
  selectedSeats: SelectedSeat[];
  toggleSeat: (seat: SelectedSeat) => void;
  maxSeats: number;
  /** When set, the tier requires exactly this many seats (e.g. a couples ticket). */
  requiredSeats?: number;
  isDark: boolean;
}

/** Parse the trailing number off a seat id like "A12" → 12. */
function seatNumber(id: string) {
  const m = id.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

export function SeatMapStep({ sections, stageLabel = 'STAGE', basePrice, selectedSeats, toggleSeat, maxSeats, requiredSeats, isDark }: SeatMapStepProps) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const selectedSeat = isDark ? '#b9ca58' : '#6d7f16';
  const selectedIds = new Set(selectedSeats.map((s) => s.id));
  const atMax = selectedSeats.length >= maxSeats;

  // Purposeful but low-saturation state colors are carried through both the map and its legend.
  const seatStates = {
    available: {
      background: isDark ? 'rgba(116, 141, 161, 0.20)' : 'rgba(97, 121, 141, 0.13)',
      border: isDark ? 'rgba(160, 181, 197, 0.48)' : 'rgba(80, 104, 124, 0.38)',
      color: isDark ? '#c4d0da' : '#4c6477',
    },
    selected: {
      background: selectedSeat,
      border: isDark ? '#d0dc8c' : '#6d7f16',
      color: isDark ? '#151b09' : '#ffffff',
    },
    taken: {
      background: isDark ? 'rgba(137, 91, 105, 0.20)' : 'rgba(147, 95, 111, 0.12)',
      border: isDark ? 'rgba(178, 123, 141, 0.35)' : 'rgba(143, 93, 108, 0.30)',
      color: isDark ? '#b6939f' : '#89616d',
    },
  };

  return (
    <div>
      {/* Stage / screen orientation bar */}
      <div className="flex flex-col items-center mb-5">
        <div className="w-3/4 h-8 rounded-b-[40px] flex items-center justify-center"
          style={{ background: isDark ? 'rgba(214,249,5,0.08)' : 'rgba(214,249,5,0.12)', border: `1px solid ${isDark ? 'rgba(214,249,5,0.2)' : 'rgba(214,249,5,0.25)'}`, borderTop: 'none' }}>
          <span className="text-[10px] tracking-[4px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#5a6b00' }}>
            {stageLabel}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex flex-col gap-6 min-w-min items-center">
          {sections.map((section) => (
            <div key={section.id} className="w-full">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
                  {section.name}
                </p>
                <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                  {Money.fromMinor(basePrice, "ETB").format()}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 items-center">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-1.5">
                    <span className="w-4 text-center text-[9px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                      {row.label}
                    </span>
                    {row.seats.map((seat, i) => {
                      if (!seat) return <span key={`gap-${i}`} className="w-6" aria-hidden />;
                      const sold = seat.status === 'sold';
                      const selected = selectedIds.has(seat.id);
                      const num = seatNumber(seat.id);
                      return (
                        <AppButton
                          key={seat.id}
                          whileTap={{ scale: sold ? 1 : 0.85 }}
                          disabled={sold || (atMax && !selected)}
                          onClick={() => toggleSeat({ id: seat.id, section: section.name, row: row.label, seat: num })}
                          aria-label={`${section.name} row ${row.label} seat ${num}${sold ? ' (unavailable)' : ''}`}
                          aria-pressed={selected}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] disabled:cursor-not-allowed transition-colors"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            background: sold ? seatStates.taken.background : selected ? seatStates.selected.background : seatStates.available.background,
                            border: `1px solid ${sold ? seatStates.taken.border : selected ? seatStates.selected.border : seatStates.available.border}`,
                            color: sold ? seatStates.taken.color : selected ? seatStates.selected.color : seatStates.available.color,
                            opacity: sold ? 0.7 : (atMax && !selected) ? 0.4 : 1,
                          }}>
                          {num}
                        </AppButton>
                      );
                    })}
                    <span className="w-4" aria-hidden />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <LegendDot label="Available" swatch={{ background: seatStates.available.background, border: `1px solid ${seatStates.available.border}` }} labelColor={seatStates.available.color} />
        <LegendDot label="Selected" swatch={{ background: seatStates.selected.background, border: `1px solid ${seatStates.selected.border}` }} labelColor={isDark ? '#cddc83' : '#617314'} />
        <LegendDot label="Taken" swatch={{ background: seatStates.taken.background, border: `1px solid ${seatStates.taken.border}` }} labelColor={seatStates.taken.color} />
      </div>

      {/* Selection summary */}
      <div className="relative mt-5 rounded-2xl overflow-hidden p-4"
        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(26,26,46,0.02)' }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
            {selectedSeats.length === 0 ? (requiredSeats ? `Select ${requiredSeats} seats` : 'Select your seats') : `${selectedSeats.length} of ${maxSeats} selected`}
          </p>
          {selectedSeats.length > 0 && (
            <p className="text-[12px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              ETB {Money.fromMinor(basePrice * selectedSeats.length, "ETB").formatNumber()}
            </p>
          )}
        </div>
        {selectedSeats.length === 0 ? (
          <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
            Tap any open seat above. {requiredSeats ? `This ticket requires ${requiredSeats} seats.` : `You can pick up to ${maxSeats}.`}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedSeats.map((s) => (
              <AppButton key={s.id} onClick={() => toggleSeat(s)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.15)', ...glassEdge(isDark) }}>
                <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#f4ff66' : '#3a4600' }}>
                  {s.row}{s.seat}
                </span>
                <span className="text-[11px] leading-none" style={{ color: isDark ? '#f4ff66' : '#3a4600' }}>×</span>
              </AppButton>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ label, swatch, labelColor }: { label: string; swatch: React.CSSProperties; labelColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded-[4px]" style={swatch} />
      <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: labelColor }}>{label}</span>
    </div>
  );
}
