import type { Event } from "@/types";
import { useTheme } from "@/app/components/ThemeContext";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "./EmptyState";

export function EventGrid({
  events,
  onSelectEvent,
  selectedCategory = "All",
  searchQuery,
  onReset,
}: {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  selectedCategory?: string;
  searchQuery?: string;
  onReset?: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <>
      {/* Events Section */}
      <div className="px-4 sm:px-6 lg:px-8 mb-5">
        <div className="flex items-center justify-between">
          <h2
            className="text-[13px] tracking-[2px] uppercase"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark
                ? "rgba(244,255,128,0.8)"
                : "rgba(0,0,0,0.7)",
            }}
          >
            Upcoming
          </h2>
          <span
            className="text-[11px] tracking-[1px]"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark
                ? "rgba(255,255,255,0.5)"
                : "rgba(0,0,0,0.4)",
            }}
          >
            {events.length} events
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onReset={onReset ?? (() => {})}
        />
      ) : (
        <>
          {/* Mobile: Vertical stack */}
          <div className="md:hidden px-4 space-y-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onSelectEvent(event)}
              />
            ))}
          </div>

          {/* Tablet/Desktop: Grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 px-4 sm:px-6 lg:px-10 xl:px-12 max-w-[1600px] mx-auto">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onSelectEvent(event)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
