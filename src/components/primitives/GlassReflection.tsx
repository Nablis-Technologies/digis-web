import { useTheme } from "@/app/components/ThemeContext";
import {
  glassEdgeReflection,
  glassFieldEdge,
  glassReflection,
  type GlassReflectionSettings,
} from "@/lib/ui/glass";

type GlassReflectionProps = {
  isDark?: boolean;
  tint?: "accent" | "danger";
  settings?: GlassReflectionSettings;
  /** Recolours the reflected hairline itself — no generic border is added. */
  edgeState?: "focus" | "error";
};

/**
 * Edge-only glass treatment for a `relative overflow-hidden` host.
 * Place it as the first child; keep interactive/content children at `z-10`.
 * `edgeState` lights the hairline lime (focus) / red (error).
 */
export function GlassReflection({ isDark: isDarkOverride, tint, settings, edgeState }: GlassReflectionProps) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkOverride ?? themeIsDark;

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={glassReflection(isDark, tint, settings)}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={edgeState ? glassFieldEdge(isDark, edgeState) : glassEdgeReflection(isDark, settings)}
      />
    </>
  );
}
