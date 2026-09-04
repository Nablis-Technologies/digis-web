import { forwardRef, useId, type ReactNode } from "react";
import { Input as PrimitiveInput } from "@/components/ui/input";
import { Textarea as PrimitiveTextArea } from "@/components/ui/textarea";

type FieldChrome = { label?: ReactNode; helpText?: ReactNode; error?: ReactNode; icon?: ReactNode; wrapperClassName?: string; labelClassName?: string; iconClassName?: string; helpClassName?: string; errorClassName?: string; noFocusRing?: boolean };

function focusRing(noFocusRing?: boolean): string {
  return noFocusRing ? 'focus-visible:outline-none' : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
}

export const AppInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof PrimitiveInput> & FieldChrome>(function AppInput({ label, helpText, error, icon, wrapperClassName, labelClassName, iconClassName, helpClassName, errorClassName, noFocusRing, className = "", id, ...props }, ref) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const ring = focusRing(noFocusRing);
  const field = <div className={wrapperClassName}>{label ? <label htmlFor={inputId} className={labelClassName}>{label}</label> : null}<div className={icon ? "relative" : undefined}>{icon ? <span className={iconClassName}>{icon}</span> : null}<PrimitiveInput ref={ref} id={inputId} unstyled className={`${ring} ${className}`} aria-invalid={error ? true : props["aria-invalid"]} {...props} /></div>{helpText ? <p className={helpClassName}>{helpText}</p> : null}{error ? <p className={errorClassName}>{error}</p> : null}</div>;
  return wrapperClassName || label || helpText || error || icon ? field : <PrimitiveInput ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} />;
});

export const AppTextArea = forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof PrimitiveTextArea> & Omit<FieldChrome, "icon">>(function AppTextArea({ label, helpText, error, wrapperClassName, labelClassName, helpClassName, errorClassName, noFocusRing, className = "", id, ...props }, ref) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const ring = focusRing(noFocusRing);
  const field = <div className={wrapperClassName}>{label ? <label htmlFor={inputId} className={labelClassName}>{label}</label> : null}<PrimitiveTextArea ref={ref} id={inputId} unstyled className={`${ring} ${className}`} aria-invalid={error ? true : props["aria-invalid"]} {...props} />{helpText ? <p className={helpClassName}>{helpText}</p> : null}{error ? <p className={errorClassName}>{error}</p> : null}</div>;
  return wrapperClassName || label || helpText || error ? field : <PrimitiveTextArea ref={ref} id={inputId} unstyled className={`${ring} ${className}`} {...props} />;
});

/** Legacy names retained for consumers outside the feature tree. */
export { AppInput as Input, AppTextArea as TextArea };
