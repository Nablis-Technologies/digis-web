# 0001 — Money is integer cents everywhere

All monetary values in this frontend are integer cents paired with an ISO-4217 currency, wrapped in the `Money` value object (`src/lib/money.ts`), mirroring the backend's `Core::Money`. Convert to display units only via `money.format()`. This matches the backend wire format (`*_minor`), avoids floating-point drift, and keeps both sides on identical invariants. Considered and rejected: floats (drift), raw decimals (ambiguous unit), server-only conversion (leaks unit confusion into every render site).
