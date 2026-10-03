import { useRef, useState } from "react";
import { formatPhoneInput, groupPhone, phoneDigits, toE164 } from "@/lib/phone";

/**
 * Caret-preserving phone input behaviour.
 *
 * The field shows a grouped value (e.g. `09 11 223 344`) and reports the
 * unformatted digits to `onChange`, so validation and submission keep seeing a
 * clean value. Pasting `+251…` folds the dial prefix away. The caller can call
 * `toE164()` on submit to get `+<dial><digits>`.
 *
 * Usage:
 *   const ph = usePhoneInput(value, onChange, 'ET', '251');
 *   <input type="tel" inputMode="tel" value={ph.display}
 *          onChange={ph.handleChange} onFocus={ph.onFocus} onBlur={ph.onBlur} />
 */
export function usePhoneInput(
  value: string,
  onChange: (v: string) => void,
  countryCode = "ET",
  dial = "251",
) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // The stored `value` is digits (occasionally with a leading `+`, or an email
  // in identifier-fields). Display the local digits grouped; emails verbatim.
  const display = value.includes("@") ? value : groupPhone(localDigits(value, dial), countryCode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    // Fields that double as an email identifier: never strip an email.
    if (el.value.includes("@")) {
      onChange(el.value);
      return;
    }
    const { caret } = formatPhoneInput(el.value, el.selectionStart ?? el.value.length, countryCode);
    // Store E.164 (`+<dial><digits>`), so every consumer — validation regexes,
    // backend calls — sees a complete number while the field shows it grouped.
    onChange(toE164(el.value, dial));
    requestAnimationFrame(() => {
      if (ref.current && ref.current.selectionStart !== caret) {
        ref.current.setSelectionRange(caret, caret);
      }
    });
  };

  return {
    ref,
    focused,
    display,
    handleChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    toE164: () => (value.includes("@") ? value : toE164(value, dial)),
  };
}

/** Local significant digits, dropping a leading `+<dial>` / `<dial>` prefix. */
function localDigits(value: string, dial: string): string {
  const v = value.trim();
  if (v.startsWith("+")) {
    const d = phoneDigits(v);
    return d.startsWith(dial) ? d.slice(dial.length) : d;
  }
  return phoneDigits(v);
}
