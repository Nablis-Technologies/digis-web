import { forwardRef, useId, type ReactNode } from "react";
import { Input as PrimitiveInput } from "@/components/ui/input";
import { Textarea as PrimitiveTextArea } from "@/components/ui/textarea";

type FieldChrome = { label?: ReactNode; helpText?: ReactNode; error?: ReactNode; icon?: ReactNode; wrapperClassName?: string; labelClassName?: string; iconClassName?: string; helpClassName?: string; errorClassName?: string; focusRing?: boolean };

/** The focus ring is OPT-IN. Most inputs here render bare inside a host-provided
 *  bordered wrapper (Field/glass), where an inner ring paints a second box
 *  inside the wrapper. Pass `focusRing` only for a standalone input that has no
 *  such wrapper. */
function focusRing(focusRing?: boolean): string {
  return focusRing ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50' : 'focus-visible:outline-none';
}

export const AppInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof PrimitiveInput> & FieldChrome>(function AppInput({ label, helpText, error, icon, wrapperClassName, labelClassName, iconClassName, helpClassName, errorClassName, focusRing: showFocusRing, className = "", id, ...props }, ref) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const ring = focusRing(showFocusRing);
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props["aria-describedby"], helpId, errorId].filter(Boolean).join(' ') || undefined;
  const field = <div className={wrapperClassName}>{label ? <label htmlFor={inputId} className={labelClassName}>{label}</label> : null}<div className={icon ? "relative" : undefined}>{icon ? <span className={iconClassName}>{icon}</span> : null}<PrimitiveInput ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={describedBy} /></div>{helpText ? <p id={helpId} className={helpClassName}>{helpText}</p> : null}{error ? <p id={errorId} role="alert" className={errorClassName}>{error}</p> : null}</div>;
  return wrapperClassName || label || helpText || error || icon ? field : <PrimitiveInput ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} />;
});

export const AppTextArea = forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof PrimitiveTextArea> & Omit<FieldChrome, "icon">>(function AppTextArea({ label, helpText, error, wrapperClassName, labelClassName, helpClassName, errorClassName, focusRing: showFocusRing, className = "", id, ...props }, ref) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const ring = focusRing(showFocusRing);
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props["aria-describedby"], helpId, errorId].filter(Boolean).join(' ') || undefined;
  const field = <div className={wrapperClassName}>{label ? <label htmlFor={inputId} className={labelClassName}>{label}</label> : null}<PrimitiveTextArea ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={describedBy} />{helpText ? <p id={helpId} className={helpClassName}>{helpText}</p> : null}{error ? <p id={errorId} role="alert" className={errorClassName}>{error}</p> : null}</div>;
  return wrapperClassName || label || helpText || error ? field : <PrimitiveTextArea ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} />;
});

/** Legacy names retained for consumers outside the feature tree. */
export { AppInput as Input, AppTextArea as TextArea };
