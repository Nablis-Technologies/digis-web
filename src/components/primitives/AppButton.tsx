import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { Button as PrimitiveButton } from "@/components/ui/button";

type HitArea = "36" | "40" | "44";
type AccessibleContent =
  | { children: ReactNode; ariaLabel?: string; "aria-label"?: string }
  | { children?: never; ariaLabel: string; "aria-label"?: string }
  | { children?: never; ariaLabel?: string; "aria-label": string };

export type AppButtonProps = Omit<HTMLMotionProps<"button">, "children" | "aria-label"> &
  AccessibleContent & {
    /** Applies a hit area only when a caller explicitly opts in. */
    hitArea?: HitArea;
    loading?: boolean;
    className?: string;
  };

const hitAreaClasses: Record<HitArea, string> = {
  "36": "size-9",
  "40": "size-10",
  "44": "size-11",
};

/**
 * Structural button wrapper. It composes the shared shadcn primitive for
 * semantics and focus handling, while deliberately leaving colour, radius,
 * spacing, and motion entirely under each call site's existing markup.
 */
export function AppButton({
  children,
  className = "",
  hitArea,
  loading = false,
  disabled,
  ariaLabel,
  "aria-label": ariaLabelAttribute,
  ...props
}: AppButtonProps) {
  const label = ariaLabel ?? ariaLabelAttribute;
  const content = loading ? (
    <>
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      {children ? <span>{children}</span> : <span>Loading…</span>}
    </>
  ) : children;

  return (
    <PrimitiveButton
      asChild
      unstyled
      // `className` is intentionally last so a call site's current visual
      // classes win over the structural focus-ring behavior above.
      className={`${hitArea ? hitAreaClasses[hitArea] : ""} ${className}`}
    >
      <motion.button
        {...props}
        aria-label={label}
        disabled={disabled || loading}
      >
        {content}
      </motion.button>
    </PrimitiveButton>
  );
}

/** Legacy export retained for existing external consumers. */
export { AppButton as Button };
