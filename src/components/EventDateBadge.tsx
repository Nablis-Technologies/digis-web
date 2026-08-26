/**
 * Image-colour adaptive date container for event imagery.
 * The stacked month/day construction stays square while its fills inherit each
 * event card's existing accent hue.
 */
export function EventDateBadge({ date, accentRgb, size = "regular", tone = "standard", className = "" }: {
  date: string;
  accentRgb: string;
  size?: "regular" | "featured";
  tone?: "standard" | "featured";
  className?: string;
}) {
  const parsed = new Date(date);
  const fallback = date.match(/([A-Za-z]+)\s+(\d{1,2})/);
  const day = Number.isNaN(parsed.getTime()) ? (fallback?.[2]?.padStart(2, "0") ?? "--") : String(parsed.getDate()).padStart(2, "0");
  const month = Number.isNaN(parsed.getTime()) ? (fallback?.[1]?.slice(0, 3).toUpperCase() ?? "---") : parsed.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const dimensions = size === "featured" ? "w-8 h-8" : "w-11 h-11";
  const daySize = size === "featured" ? "text-[14px]" : "text-[19px]";
  const featured = tone === "featured";
  const header = featured ? `linear-gradient(rgba(7,10,14,0.39), rgba(7,10,14,0.39)), rgba(${accentRgb},0.35)` : `linear-gradient(rgba(255,255,255,0.90), rgba(255,255,255,0.90)), rgba(${accentRgb},0.14)`;
  const body = featured ? `linear-gradient(rgba(7,10,14,0.24), rgba(7,10,14,0.24)), rgba(${accentRgb},0.45)` : `linear-gradient(rgba(255,255,255,0.74), rgba(255,255,255,0.74)), rgba(${accentRgb},0.20)`;

  return (
    <div className={`${dimensions} overflow-hidden rounded-[10px] ${className}`} style={{ border: featured ? "1px solid transparent" : "none", background: featured ? `rgba(${accentRgb},0.32)` : "rgba(255,255,255,0.78)", boxShadow: featured ? "none" : "0 6px 16px rgba(0,0,0,0.16)" }}>
      <div className="h-[38%] flex items-center justify-center py-0" style={{ background: header, borderBottom: "none" }}>
        <span className="text-[8px] tracking-[1px] uppercase translate-y-[1px]" style={{ fontFamily: "'Inter', sans-serif", color: featured ? "rgba(255,255,255,0.66)" : "rgba(10,10,10,0.58)", fontWeight: 800 }}>{month}</span>
      </div>
      <div className="h-[62%] flex items-center justify-center" style={{ background: body }}>
        <span className={`leading-none -translate-y-[2px] ${daySize} text-[18px]`} style={{ fontFamily: "'Inter', sans-serif", color: featured ? "#fff" : "#111214", fontWeight: 800 }}>{day}</span>
      </div>
    </div>
  );
}
