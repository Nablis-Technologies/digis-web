import { useEffect, useState } from 'react';

export function InlineCountdown({ expiresAt, accentColor, accentRgb }: { expiresAt: number; accentColor: string; accentRgb: string }) {
  const isDark = true;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, expiresAt - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const segs = [
    { v: days, l: 'd' },
    { v: hours, l: 'h' },
    { v: minutes, l: 'm' },
    { v: seconds, l: 's' },
  ];
  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      {segs.map((s, i) => (
        <span key={s.l} className="flex items-baseline gap-0.5 px-1.5 py-0.5 rounded-md tabular-nums"
          style={{
            background: `rgba(${accentRgb}, ${isDark ? '0.1' : '0.18'})`,
            border: `1px solid rgba(${accentRgb}, ${isDark ? '0.2' : '0.3'})`,
          }}>
          <span className="text-[11px] leading-none"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : 'rgba(0,0,0,0.85)', fontWeight: 300 }}>
            {pad(s.v)}
          </span>
          <span className="text-[8px] leading-none"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? `rgba(${accentRgb}, 0.65)` : 'rgba(0,0,0,0.5)' }}>
            {s.l}
          </span>
        </span>
      ))}
    </div>
  );
}
