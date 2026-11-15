# 0005 — Frontend fetch/cache/state architecture

One **deep module per backend domain** (`src/lib/*.ts`) is the single place a
backend flow is mirrored: it owns the endpoint contract, wire types,
request/response mapping, and the HTTP call itself (via `apiFetch`), exposing a
small domain interface (e.g. `orderModule.quote/createOrder/startPayment`).
Feature components and hooks call the module; the module calls `apiFetch`.
React Query is the sole server-state cache: reads via `useQuery` / paginated
lists via `useInfiniteQuery`, writes via `useMutation` + `invalidateQueries`
(refetch-after-mutate; **never** optimistic for money). 401s self-heal through
a transparent single-flight refresh interceptor inside `api.ts`. Mock data is
retained in the repo as reference material but **never executed at runtime**
(no `apiOrSeed`, no `useMock()` branches). Mutation/async failures surface via
a thin toast layer (sonner, mounted once at the app root, `toast.error()`
only); form validation stays inline.

_Considered:_ service-owns-HTTP (events pattern) — rejected because it splits
one backend contract across a service (HTTP) + module (mapping), creating two
shallow layers where the module already holds the wire types. One deep module
keeps contract knowledge in one place (locality) and keeps tests crossing one
interface (they already do: `order.test.ts`, `resale.test.ts`). Mock-as-runtime
fallback (`apiOrSeed`) was rejected because a network error should surface an
error state, never silently show fake data.

## Supporting decisions

- **Auth session single owner = a standalone session store** (`src/lib/session.ts`
  with `getSession/setSession/subscribe`, persisted to localStorage). `api.ts`
  (refresh interceptor) writes through it; `AuthContext` reads it via
  `useSyncExternalStore`. `api.ts` stays React-free; refresh writes become
  visible to the UI automatically. Rejected: query-cache owner (couples `api.ts`
  to React Query) and Context+localStorage (fragile storage-event).
- **Service shims are deleted.** After deep modules own HTTP, `resale.service.ts`
  / `events.service.ts` would be pure pass-throughs (shallow modules). Components
  import the module directly; the churn is mechanical and one-time.
- **Checkout quote stays a local effect** (`useCheckoutFlow`), not a `useQuery`:
  a quote is single-session, single-cart, expires in 10 min — caching it buys
  nothing and complicates the key. It goes through `orderModule.quote()` either
  way, so money stays server-authoritative.
- **Kept-but-unused mock files stay in place** (`src/lib/mock/`, seed arrays)
  as reference material, with a note that nothing imports them at runtime.
  Moving them would break test imports (`order.test.ts`, `resale.test.ts`).
- **Pagination is adopted now**: lists use `useInfiniteQuery` from the start
  (backend returns `{ data, pagination }`). `apiFetch` surfaces pagination meta
  so list services can expose `fetchPage(page)`.
- **Mutation/async failures surface via a thin toast layer** (sonner `<Toaster>`
  mounted once at the app root; `toast.error()` only). Form validation stays
  inline component state.
- **HTTP uses axios** (not native `fetch`). An axios instance replaces `api.ts`'s
  raw fetch: the 401→refresh→retry interceptor is a clean
  `responseInterceptor(null, handler)`, timeouts are built-in (`defaults.timeout`),
  and JSON parsing is automatic. The deep modules are unaffected — they call
  `apiFetch<T>(path, options) → T` and the axios instance sits behind it. The
  ~14KB dependency is justified by the simpler interceptor chain and one less
  manual pattern across the whole seam.
- **`apiFetch` return shape**: returns `{ data, pagination? }` when pagination is
  present (bare `data` otherwise), so paginated list modules read both from one
  seam.
- **Query keys**: uniform `[domain, entity, id?]` factories exported from each
  deep module (it owns the contract, so it owns the cache keys). `invalidateQueries`
  references these factories as the single source of truth.
- **Cache invalidation is explicit per mutation** in the calling hook, via a
  shared `invalidateKeys(qc, ...keys)` helper — cross-domain effects (e.g. a
  resale listing also invalidates the user's tickets) are visible at the call
  site, not hidden in a central map.
- **Error codes → user text via one `mapApiError(e)` helper** (`lib/errors.ts`),
  used by both the toast layer and inline form errors; falls back to the API's
  `error` message for unknown codes.
- **Per-domain `staleTime`** at the `useQuery` call site: public catalogs
  (events feed/detail) ~5 min, personal data (tickets, my listings) 0. Global
  `retry: false` + `refetchOnWindowFocus: false` stays.
- **AuthContext trimmed** to `user, isAuthenticated, signIn, signUp, signOut,
  updateProfile` (+ internal refresh via the session store). OTP/Google/
  check-account/password-reset methods and state are deleted; `AuthModal`
  collapses to identifier+password sign-in and direct sign-up with auto-login.
- **List modules expose `fetchPage({ page, perPage }) → { items, pagination }`**;
  components wire `useInfiniteQuery` with `getNextPageParam`. The module stays
  React-free; the hook pattern lives in the component. A shared hook is added
  only if three+ components need identical pagination.
