import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "@/app/components/ThemeContext";
import { CATEGORIES, hexToRgba, readableCategoryRgb } from "@/lib/categoryColors";
import { AppButton } from '@/components/primitives/AppButton';

export function CategoryFilter({
  selectedCategory,
  onChange,
}: {
  selectedCategory: string;
  onChange: (category: string) => void;
}) {
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll indicator state
  const [scrollable, setScrollable] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 scroll position

  // Drag-to-scroll state (kept in refs so listeners stay stable)
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollable(max > 4);
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.max(
      drag.current.moved,
      Math.abs(dx),
    );
    if (drag.current.moved > 4 && !isDragging)
      setIsDragging(true);
    el.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
    // Clear the dragging flag on the next tick so the click handler can read it.
    setTimeout(() => setIsDragging(false), 0);
  };

  const handleSelect = (name: string) => {
    if (drag.current.moved > 4) return; // ignore clicks that were really drags
    onChange(name);
  };



  // Matches the route canvas exactly; the body token is not the rendered page color.
  const pageBackground = isDark ? "#0c0c0c" : "#f8f7fc";



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="mb-4 lg:mb-8 relative"
    >
      {/* Soft edge fades signal that the category rail can be swiped without taking pill space. */}
      {scrollable && progress < 0.99 && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 sm:w-20 z-10"
          style={{ background: `linear-gradient(to left, ${pageBackground} 28%, transparent)` }}
        />
      )}
      {scrollable && progress > 0.01 && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-14 z-10"
          style={{ background: `linear-gradient(to right, ${pageBackground} 28%, transparent)` }}
        />
      )}

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide mx-4 sm:mx-6 lg:mx-8 pr-4 sm:pr-6 lg:pr-8 py-2 select-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: scrollable
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default",
          touchAction: "pan-x",
        }}
      >
        {CATEGORIES.map(({ name, Icon, hex: color }) => {
          const active = selectedCategory === name;
          // Same hue, pushed into a band that keeps icon/label legible per theme.
          const hue = readableCategoryRgb(name, isDark);

          const textColor = active
            ? `rgb(${hue})`
            : isDark
              ? "rgba(255,255,255,0.72)"
              : "rgba(0,0,0,0.62)";

          return (
            <AppButton
              key={name}
              onClick={() => handleSelect(name)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: isDragging ? 1 : 0.95 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 26,
              }}
              className="relative flex items-center gap-2 rounded-full px-4 py-2 whitespace-nowrap flex-shrink-0"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${hexToRgba(color, isDark ? 0.34 : 0.28)}, ${hexToRgba(color, isDark ? 0.1 : 0.08)})`
                  : isDark
                    ? `linear-gradient(135deg, ${hexToRgba(color, 0.1)}, ${hexToRgba(color, 0.025)})`
                    : `linear-gradient(135deg, ${hexToRgba(color, 0.09)}, ${hexToRgba(color, 0.03)})`,
                border: `1px solid ${active ? hexToRgba(color, isDark ? 0.6 : 0.5) : hexToRgba(color, isDark ? 0.22 : 0.2)}`,
                boxShadow: "none",
              }}
            >
              <Icon
                className="w-[16px] h-[16px] flex-shrink-0"
                strokeWidth={active ? 2.4 : 2.1}
                style={{
                  color: `rgba(${hue},${active ? 1 : 0.85})`,
                }}
              />
              <span
                className="text-[13px] tracking-[0.2px] transition-colors duration-200"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: active ? 600 : 500,
                  color: textColor,
                }}
              >
                {name}
              </span>
            </AppButton>
          );
        })}
      </div>
    </motion.div>
  );
}
