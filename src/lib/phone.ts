/**
 * Phone-number entry helpers.
 *
 * Best-practice phone UX: let the user type freely, never block keystrokes, and
 * show a *grouped* value while focusing. These helpers are presentation-only —
 * they never decide validity (the backend does) and they never change what is
 * submitted beyond normalising to E.164-ish digits.
 */

/** Digits of a value, ignoring the leading `+` and all separators. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Group the significant digits for display. For Ethiopian numbers we show the
 * familiar `09 11 223 344` two-digit grouping; other numbers fall back to
 * common 3-3-4-ish grouping. Formatting is applied to the *local* part only
 * (after the country dial code is stripped) so the caret stays predictable.
 */
export function groupPhone(local: string, countryCode = "ET"): string {
  const d = phoneDigits(local);
  if (!d) return "";
  if (countryCode === "ET") {
    // 09 / 07 prefix (2) + 2 + 3 + 3
    const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 7), d.slice(7, 10)];
    return parts.filter(Boolean).join(" ");
  }
  // Generic grouping: 3 then 3 then the rest in 4s.
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10), d.slice(10, 14)];
  return parts.filter(Boolean).join(" ");
}

/**
 * Strip a value the user may paste that already carries an international
 * prefix (`+251...` or a bare `251...`) down to its local significant digits —
 * without ever touching the country selector's dial code.
 */
export function stripDial(value: string, dial: string): string {
  const d = phoneDigits(value);
  if (d.startsWith(dial)) return d.slice(dial.length);
  // A local number written with the trunk `0` (e.g. 09...) drops it for grouping.
  return d;
}

/**
 * Normalise a local value + dial into E.164-ish `+<dial><digits>`, dropping a
 * leading trunk `0`. Already-international input is returned as-is. Email input
 * (the field doubles as an identifier in some flows) passes through untouched.
 */
export function toE164(value: string, dial: string): string {
  const v = value.trim();
  if (!v || v.includes("@")) return v;
  if (v.startsWith("+")) return `+${phoneDigits(v)}`;
  const local = stripDial(v, dial).replace(/^0+/, "");
  return `+${dial}${local}`;
}

/**
 * A caret-preserving formatter. Given the next raw input string and the current
 * caret position (index into the *formatted* string), returns the value to set
 * and where to place the caret. Digits only, grouped for display.
 */
export function formatPhoneInput(
  raw: string,
  caret: number,
  countryCode = "ET",
): { value: string; caret: number } {
  const digitsBeforeCaret = phoneDigits(raw.slice(0, caret)).length;
  const formatted = groupPhone(raw, countryCode);
  if (digitsBeforeCaret === 0) return { value: formatted, caret: 0 };
  // Walk the formatted string until we've passed `digitsBeforeCaret` digits.
  let seen = 0;
  let pos = formatted.length;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === digitsBeforeCaret) {
      pos = i + 1;
      break;
    }
  }
  return { value: formatted, caret: pos };
}
