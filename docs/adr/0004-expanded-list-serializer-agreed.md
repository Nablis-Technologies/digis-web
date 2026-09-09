# 0004 — Public events list serializer expanded by backend dev

The backend dev agreed to expand `Events::Public::EventListSerializer` to include
`event_setting` (the JSONB config holding `featured`, `rating`, `tickets_left`),
so the discovery grid can render those per-card without N+1 detail fetches. The
frontend adapter already reads `event_setting.config`, so this is a backend-only
change — the mock fallback for those fields drops automatically once it lands.
Resolves BACKEND_GAPS.md #1.

**Status (2026-09-07):** fulfilled — the 17-key projection is live in
`EventSettingSerializer` on both list and detail (verified in serializer code +
live HTTP). Recorded as BACKEND_GAPS #1 resolved. Remaining work is frontend-only:
map the served-but-unmapped keys in `src/lib/events-adapter.ts`.
