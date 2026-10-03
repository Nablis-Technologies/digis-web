import { Money } from '@/lib/money';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { useTheme } from '@/app/components/ThemeContext';
import { MapPin } from 'lucide-react';

export interface ResaleGroupCardData {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  image: string;
  count: number;
  minPrice: number;
}

export function ResaleEventCard({ group, onClick }: { group: ResaleGroupCardData; onClick: () => void }) {
  const { isDark } = useTheme();
  const { rgb } = useImageColor(group.image);
  const price = Money.fromMinor(group.minPrice, 'ETB').format();

  if (!group.image) {
    return (
      <div
        onClick={onClick}
        className="relative cursor-pointer rounded-[24px] overflow-hidden flex items-end p-5"
        style={{ aspectRatio: '343/429', background: 'linear-gradient(135deg, #23252d, #101115)' }}
      >
        <p
          className="text-[18px] font-light text-white leading-snug"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
        >
          {group.eventName}
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer rounded-[24px] overflow-hidden flex flex-col group"
      style={{ background: isDark ? '#101010' : '#fff', boxShadow: isDark ? 'none' : '0 8px 30px rgba(0,0,0,0.06)' }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '343/429' }}>
        <img src={group.image} alt={group.eventName} loading="lazy" decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.2) 100%)' }} />
        <span className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full text-[9px] tracking-[1.5px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: '#fff', fontWeight: 600 }}>
          Resale · {group.count} {group.count === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>
      <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2">
        <h3 className="text-[14px] tracking-[-0.2px] leading-[1.2] line-clamp-1"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#0a0a0a', fontWeight: 500 }}>
          {group.eventName}
        </h3>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={2} style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} />
          <span className="text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }}>
            {group.city || group.venue}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a', fontWeight: 600 }}>
            {price}
          </span>
          <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
            {group.eventDate}
          </span>
        </div>
      </div>
      <div className="absolute inset-0 rounded-[24px] pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }} />
    </div>
  );
}