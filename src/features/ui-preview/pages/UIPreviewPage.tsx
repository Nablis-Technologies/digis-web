import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Calendar, Clock, Copy, MapPin, Music2, RefreshCcw, Star, Users } from "lucide-react";
import { useTheme } from "@/app/components/ThemeContext";
import { AppButton } from "@/components/primitives/AppButton";
import { defaultGlassSurface, glassEdgeReflection, glassReflection, type GlassSurfaceSettings } from "@/lib/ui/glass";
import { InfoStrip } from "@/features/event-detail/components/InfoCards";
import { OrganizerCard, resolveOrganizers } from "@/features/event-detail/components/OrganizerSection";
import { TicketSelector } from "@/features/event-detail/components/TicketSelector";
import { VenueSection } from "@/features/event-detail/components/VenueMap";
import { resolveLineup } from "@/features/event-detail/components/LineupSection";
import type { Event } from "@/types";

type Controls = Required<GlassSurfaceSettings>;

const defaults: Controls = {
  ...defaultGlassSurface,
};

const previewEvent: Event = {
  id: "ui-preview-addis-vibes",
  name: "Addis Vibes: After Dark",
  date: "Saturday, October 18",
  time: "8:00 PM — Late",
  venue: "The Hub, Bole",
  city: "Addis Ababa",
  image: "",
  category: "Music",
  priceFromMinor: 85000,
  currency: "ETB",
  ticketsLeft: 143,
  ageRestriction: "18+",
  organizers: [
    { name: "Digis Events Co.", handle: "@digisevents", verified: true, followers: 12400, eventsHosted: 47, rating: 4.8, bio: "Curating memorable cultural and music experiences." },
    { name: "Habesha Sound", handle: "@habeshasound", verified: true, followers: 8200, eventsHosted: 31, rating: 4.7, bio: "Live music collective amplifying East African artists." },
  ],
  ticketTypes: [
    { name: "Early Bird", level: "LIMITED OFFER", priceMinor: 85000, originalPriceMinor: 120000, available: 35, isEarlyBird: true, totalCapacity: 100, features: [{ text: "Digital event ticket" }, { text: "Priority entry lane" }] },
    { name: "Standard Access", level: "ENTRY LEVEL", priceMinor: 120000, available: 150, features: [{ text: "Digital event ticket" }, { text: "General admission" }] },
    { name: "VIP Gold Access", level: "PREMIUM", priceMinor: 250000, available: 45, isPremium: true, features: [{ text: "Fast-track entry" }, { text: "Lounge access" }] },
  ],
};

function Range({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; suffix?: string }) {
  return <label className="block"><span className="mb-2 flex justify-between text-[11px] font-medium text-white/65"><span>{label}</span><output className="font-mono text-[10px] text-[#d6f905]">{step < 1 ? value.toFixed(3) : value}{suffix}</output></span><input className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#d6f905]" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function UIPreviewPage() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [controls, setControls] = useState<Controls>(defaults);
  const [copied, setCopied] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>("Early Bird");
  const update = (key: keyof Controls) => (value: number) => setControls((current) => ({ ...current, [key]: value }));
  const reflection: GlassSurfaceSettings = controls;
  const surface = { boxShadow: `0 ${controls.shadowY}px ${controls.shadowBlur}px ${controls.shadowSpread}px rgba(0,0,0,${controls.shadowOpacity})` };
  const Reflection = ({ tint }: { tint?: "accent" | "danger" }) => <><span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]" style={glassReflection(isDark, tint, reflection)} /><span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]" style={glassEdgeReflection(isDark, reflection)} /></>;
  const muted = isDark ? "rgba(247,247,243,.55)" : "rgba(23,22,28,.55)";
  const copy = async () => { await navigator.clipboard?.writeText(JSON.stringify(controls, null, 2)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };

  return <main className="min-h-screen px-5 py-7 sm:px-8 sm:py-10" style={{ background: isDark ? "#08090b" : "#f3f1f7", color: isDark ? "#f7f7f3" : "#17161c" }}>
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between"><AppButton onClick={() => navigate(-1)} className="flex items-center gap-2 text-[11px] uppercase tracking-[.12em]" style={{ color: muted }}><ArrowLeft className="size-4" /> Back</AppButton><AppButton onClick={toggleTheme} className="rounded-full bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold">{isDark ? "Light" : "Dark"} mode</AppButton></div>
      <header className="mt-8 max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#a8c500]">Digis · reflection calibration</p><h1 className="mt-3 text-[36px] font-light leading-[1.02] tracking-[-.025em] sm:text-[52px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Tune light, not borders.</h1><p className="mt-4 max-w-2xl text-[14px] leading-6" style={{ color: muted }}>The hairline is still here—just one quiet layer in a broader reflection. These controls only affect the overlay; they never replace a card’s own color, image, transparency, or blur.</p></header>

      <div className="mt-9 grid items-start gap-7 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="sticky top-5 rounded-[22px] bg-[#111217] p-5" style={surface}>
          <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-white">Reflection layers</p><p className="mt-1 text-[11px] leading-4 text-white/50">Start low; large panels need less edge light.</p></div><AppButton onClick={() => setControls(defaults)} ariaLabel="Reset controls" className="grid size-8 place-items-center rounded-full bg-white/8 text-white"><RefreshCcw className="size-3.5" /></AppButton></div>
          <div className="space-y-5"><Range label="Edge hairline" value={controls.hairlineOpacity} min={0} max={0.16} step={0.005} onChange={update("hairlineOpacity")} /><Range label="Hairline direction" value={controls.hairlineAngle} min={0} max={360} step={1} suffix="°" onChange={update("hairlineAngle")} /><Range label="Top fade light" value={controls.edgeOpacity} min={0} max={0.18} step={0.005} onChange={update("edgeOpacity")} /><Range label="Top light direction" value={controls.edgeAngle} min={0} max={360} step={1} suffix="°" onChange={update("edgeAngle")} /><Range label="Fade depth" value={controls.edgeFade} min={5} max={45} step={1} suffix="%" onChange={update("edgeFade")} /><div className="border-t border-white/8 pt-5"><Range label="Bloom strength" value={controls.poolOpacity} min={0} max={0.18} step={0.005} onChange={update("poolOpacity")} /><div className="mt-5"><Range label="Bloom width" value={controls.poolSize} min={25} max={150} step={1} suffix="%" onChange={update("poolSize")} /></div><div className="mt-5"><Range label="Bloom position X" value={controls.poolX} min={-20} max={100} step={1} suffix="%" onChange={update("poolX")} /></div><div className="mt-5"><Range label="Bloom position Y" value={controls.poolY} min={-80} max={100} step={1} suffix="%" onChange={update("poolY")} /></div><div className="mt-5"><Range label="Bloom height" value={controls.poolHeight} min={50} max={260} step={1} suffix="%" onChange={update("poolHeight")} /></div><div className="mt-5"><Range label="Light direction" value={controls.washAngle} min={0} max={360} step={1} suffix="°" onChange={update("washAngle")} /></div><div className="mt-5"><Range label="Directional wash" value={controls.washOpacity} min={0} max={0.1} step={0.002} onChange={update("washOpacity")} /></div></div><div className="border-t border-white/8 pt-5"><Range label="Shadow density" value={controls.shadowOpacity} min={0} max={0.8} step={0.02} onChange={update("shadowOpacity")} /><div className="mt-5"><Range label="Shadow offset" value={controls.shadowY} min={0} max={42} step={1} suffix="px" onChange={update("shadowY")} /></div><div className="mt-5"><Range label="Shadow blur" value={controls.shadowBlur} min={12} max={120} step={1} suffix="px" onChange={update("shadowBlur")} /></div><div className="mt-5"><Range label="Shadow spread" value={controls.shadowSpread} min={-60} max={12} step={1} suffix="px" onChange={update("shadowSpread")} /></div></div></div>
          <AppButton onClick={copy} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d6f905] px-3 py-2.5 text-[11px] font-bold text-black"><Copy className="size-3.5" />{copied ? "Copied — paste it here" : "Copy settings"}</AppButton>
        </aside>

        <section className="min-w-0 space-y-8">
          <div className="rounded-[28px] bg-[#111217] p-5 sm:p-7">
            <div className="relative z-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/48">Actual event-detail modules</p><h2 className="mt-2 text-[30px] font-light tracking-[-.02em] text-white" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{previewEvent.name}</h2><div className="mt-6"><InfoStrip rgb={[214, 249, 5]} reflectionSettings={reflection} items={[{ icon: <Calendar className="size-3.5" strokeWidth={1.75} />, label: "Date", value: previewEvent.date }, { icon: <Clock className="size-3.5" strokeWidth={1.75} />, label: "Time", value: previewEvent.time }, { icon: <MapPin className="size-3.5" strokeWidth={1.75} />, label: "Venue", value: previewEvent.venue }, { icon: <Users className="size-3.5" strokeWidth={1.75} />, label: "Age", value: previewEvent.ageRestriction || "Any age" }]} /></div></div>
          </div>
          <div><OrganizerCard organizers={resolveOrganizers(previewEvent)} isDark={isDark} compact reflectionSettings={reflection} /></div>
          <div><VenueSection venue={previewEvent.venue} isDark={isDark} reflectionSettings={reflection} /></div>
          <TicketSelector event={previewEvent} ticketTypes={previewEvent.ticketTypes || []} selectedTicketType={selectedTicketType} onSelectTicketType={setSelectedTicketType} isSoldOut={false} isDark={isDark} reflectionSettings={reflection} />
          <LineupDesignOptions isDark={isDark} reflection={reflection} />
        </section>
      </div>
    </div>
  </main>;
}

// Preview-only sample lineup — mock data lives here (a design preview page),
// never in the shared resolver.
const PREVIEW_LINEUP = [
  { name: 'Rophnan', handle: '@rophnan', role: 'Headliner', time: '11:00 PM', genre: 'Electronic', verified: true, followers: 184000, eventsPlayed: 72, rating: 4.9, bio: 'Pioneer of Ethio-electronic.', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 60%, #ec4899 100%)' },
  { name: 'Mikaya Behailu', handle: '@mikayabehailu', role: 'Support', time: '9:30 PM', genre: 'Soul', verified: true, followers: 62000, eventsPlayed: 38, rating: 4.7, bio: 'Soulful vocals.', gradient: 'linear-gradient(135deg, #d6f905 0%, #ec4899 100%)' },
  { name: 'DJ Henok', handle: '@djhenok', role: 'Opening Set', time: '8:00 PM', genre: 'House', verified: false, followers: 24000, eventsPlayed: 110, rating: 4.6, bio: 'Resident DJ.', gradient: 'linear-gradient(135deg, #06b6d4 0%, #d6f905 100%)' },
];

function LineupDesignOptions({ isDark, reflection }: { isDark: boolean; reflection: GlassSurfaceSettings }) {
  const artists = resolveLineup(PREVIEW_LINEUP).slice(0, 3);
  const ink = isDark ? "#fff" : "#111";
  const muted = isDark ? "rgba(255,255,255,.52)" : "rgba(0,0,0,.5)";
  const surface = isDark ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.68)";
  const Overlay = () => <><span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]" style={glassReflection(isDark, undefined, reflection)} /><span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]" style={glassEdgeReflection(isDark, reflection)} /></>;

  return <section className="pt-3">
    <div className="mb-4 flex items-end justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a8c500]">Lineup exploration</p><h2 className="mt-1 text-[26px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: ink }}>Three directions</h2></div>
      <span className="max-w-[190px] text-right text-[11px] leading-4" style={{ color: muted }}>Same artist data, different hierarchy.</span>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <article className="min-w-0"><OptionLabel number="01" title="Set cards" text="Poster-led · collection feel" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 grid grid-cols-3 gap-2">
            {artists.map((artist, index) => <div key={artist.name} className="min-w-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[16px]"><img className="h-full w-full object-cover" src={artist.image} alt={artist.name} /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" /><span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white">{artist.time}</span></div>
              <p className="mt-2 truncate text-[11px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[.12em]" style={{ color: index === 0 ? "#b9d600" : muted }}>{index === 0 ? "Headliner" : artist.genre}</p>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0"><OptionLabel number="02" title="Running order" text="Time-first · scannable" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-2" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10">
            {artists.map((artist, index) => <div key={artist.name} className="group flex items-center gap-3 rounded-[18px] px-3 py-3 transition-colors hover:bg-white/[.05]">
              <div className="w-[48px] shrink-0 text-[11px] font-semibold tracking-[.08em]" style={{ color: index === 0 ? "#d6f905" : muted }}>{artist.time}</div>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full"><img className="h-full w-full object-cover" src={artist.image} alt="" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><p className="mt-0.5 text-[10px] uppercase tracking-[.12em]" style={{ color: muted }}>{artist.role} · {artist.genre}</p></div>
              {index === 0 && <Star className="size-4 shrink-0 fill-[#d6f905] text-[#d6f905]" />}
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0"><OptionLabel number="03" title="Artist signals" text="Editorial · discovery-led" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 space-y-2">
            {artists.map((artist, index) => <div key={artist.name} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] p-2" style={{ background: index === 0 ? (isDark ? "rgba(214,249,5,.09)" : "rgba(214,249,5,.18)") : "rgba(255,255,255,.025)" }}>
              <div className="relative h-[38px] w-[38px] overflow-hidden rounded-[12px]"><img className="h-full w-full object-cover" src={artist.image} alt="" /></div>
              <div className="min-w-0"><div className="flex items-center gap-1"><p className="truncate text-[12px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p>{artist.verified && <span className="size-1.5 shrink-0 rounded-full bg-[#d6f905]" />}</div><p className="mt-0.5 truncate text-[10px]" style={{ color: muted }}>{artist.handle} · {artist.followers / 1000}k listeners</p></div>
              <div className="text-right"><p className="text-[11px] font-semibold" style={{ color: index === 0 ? "#d6f905" : ink }}>{artist.time}</p><p className="mt-0.5 text-[8px] uppercase tracking-[.12em]" style={{ color: muted }}>Live</p></div>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="04" title="Horizontal card stack" text="Scroll rail · card-led" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="flex w-[270px] shrink-0 snap-start items-center gap-3 rounded-[18px] p-2.5 sm:w-[300px]" style={{ background: index === 0 ? (isDark ? "rgba(214,249,5,.1)" : "rgba(214,249,5,.22)") : (isDark ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.5)"), boxShadow: isDark ? "0 10px 26px -20px rgba(0,0,0,.8)" : "0 10px 26px -20px rgba(0,0,0,.18)" }}>
              <div className="relative h-[68px] w-[60px] shrink-0 overflow-hidden rounded-[14px]"><img className="h-full w-full object-cover" src={artist.image} alt={artist.name} />{index === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#d6f905] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[.08em] text-black">Live</span>}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-[13px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p>{artist.verified && <span className="size-1.5 shrink-0 rounded-full bg-[#d6f905]" />}</div><p className="mt-1 text-[10px] uppercase tracking-[.1em]" style={{ color: muted }}>{artist.role} · {artist.genre}</p><p className="mt-1 text-[10px]" style={{ color: muted }}>{artist.followers / 1000}k listeners</p></div>
              <span className="self-start rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums" style={{ background: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)", color: index === 0 ? "#b8d600" : ink }}>{artist.time}</span>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="05" title="Backdrop stack" text="Image-forward · bold names" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="relative h-[145px] w-[240px] shrink-0 snap-start overflow-hidden rounded-[19px] sm:w-[280px]">
              <img className="absolute inset-0 h-full w-full object-cover" src={artist.image} alt={artist.name} /><div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/44 to-black/15" />
              <div className="absolute inset-x-0 bottom-0 p-4"><span className="mb-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-white backdrop-blur-md">{artist.role}</span><p className="truncate text-[19px] font-light text-white" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><div className="mt-1 flex items-center justify-between text-[10px] text-white/70"><span>{artist.genre}</span><span className="font-semibold text-[#e2ff3f]">{artist.time}</span></div></div>
              <span className="absolute right-3 top-3 text-[10px] font-bold text-white/75">0{index + 1}</span>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="06" title="Time capsule stack" text="Minimal · schedule-led" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="w-[225px] shrink-0 snap-start rounded-[18px] p-3.5 sm:w-[255px]" style={{ background: isDark ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.48)" }}>
              <div className="flex items-start justify-between"><span className="text-[24px] font-light leading-none" style={{ color: index === 0 ? "#d6f905" : ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.time}</span><span className="rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[.13em]" style={{ background: index === 0 ? "#d6f905" : (isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"), color: index === 0 ? "#000" : muted }}>{artist.role}</span></div>
              <div className="mt-5 flex items-center gap-2.5"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-full"><img className="h-full w-full object-cover" src={artist.image} alt={artist.name} /></div><div className="min-w-0"><p className="truncate text-[13px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><p className="mt-0.5 text-[10px]" style={{ color: muted }}>{artist.genre} · {artist.followers / 1000}k</p></div></div>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="07" title="Mini artist stack" text="Compact · multi-card view" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="flex w-[174px] shrink-0 snap-start items-center gap-2.5 rounded-[15px] p-2 sm:w-[190px]" style={{ background: index === 0 ? (isDark ? "rgba(214,249,5,.1)" : "rgba(214,249,5,.2)") : (isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.5)" ) }}>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[11px]"><img className="h-full w-full object-cover" src={artist.image} alt={artist.name} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-[11px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><p className="mt-0.5 truncate text-[9px] uppercase tracking-[.08em]" style={{ color: muted }}>{artist.genre}</p></div>
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: index === 0 ? "#b8d600" : muted }}>{artist.time}</span>
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="08" title="Portrait tiles" text="Visual · collection strip" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="relative h-[102px] w-[118px] shrink-0 snap-start overflow-hidden rounded-[16px] sm:w-[132px]">
              <img className="absolute inset-0 h-full w-full object-cover" src={artist.image} alt={artist.name} /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute inset-x-2.5 bottom-2.5"><p className="truncate text-[10px] text-white" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><span className="mt-1 inline-block text-[9px] font-semibold text-[#e4ff4a]">{artist.time}</span></div>{index === 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-[#d6f905] shadow-[0_0_10px_#d6f905]" />}
            </div>)}
          </div>
        </div>
      </article>

      <article className="min-w-0 xl:col-span-3"><OptionLabel number="09" title="Set chips" text="Ultra compact · text-first" muted={muted} />
        <div className="relative overflow-hidden rounded-[24px] p-3" style={{ background: surface, backdropFilter: "blur(28px)" }}><Overlay />
          <div className="relative z-10 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {artists.map((artist, index) => <div key={artist.name} className="flex w-[166px] shrink-0 snap-start items-center gap-2 rounded-full px-2 py-2 sm:w-[180px]" style={{ background: index === 0 ? (isDark ? "rgba(214,249,5,.12)" : "rgba(214,249,5,.23)") : (isDark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.56)") }}>
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full"><img className="h-full w-full object-cover" src={artist.image} alt={artist.name} /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px]" style={{ color: ink, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{artist.name}</p><p className="text-[8px] uppercase tracking-[.1em]" style={{ color: muted }}>{artist.role}</p></div><span className="text-[9px] font-semibold tabular-nums" style={{ color: index === 0 ? "#b8d600" : muted }}>{artist.time}</span>
            </div>)}
          </div>
        </div>
      </article>
    </div>
  </section>;
}

function OptionLabel({ number, title, text, muted }: { number: string; title: string; text: string; muted: string }) {
  return <div className="mb-2 flex items-baseline gap-2"><span className="text-[10px] font-bold tracking-[.12em] text-[#a8c500]">{number}</span><h3 className="text-[13px] font-medium">{title}</h3><span className="truncate text-[10px]" style={{ color: muted }}>{text}</span></div>;
}
