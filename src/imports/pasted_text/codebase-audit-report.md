Act as a senior frontend architect performing a pre-integration codebase audit. This is a React app currently running on mock data; Rails API integration has not started yet. The goal of this audit is twofold: (1) map current architecture, reuse, and redundancy so we can refactor before integration, and (2) assess how ready the codebase is to have real endpoints "dropped in" with minimal rework.
Do not just describe what components do — evaluate how they do it, flag inconsistency between similar components, and give concrete alternatives/best practices for each finding, citing exact file/component names as evidence. Use tables where useful, same format as: Pattern | Location | Current Approach | Issue | Recommendation.
Cover the following sections in full:
1. Component Inventory & Reuse Audit
List every modal/sheet/dialog/dropdown/popover component, same as prior audits, but this time explicitly diff their implementations against each other: which ones duplicate backdrop, scroll-lock, animation, or responsive-shell logic almost identically?
Identify any existing generic primitives in the repo (dialog, drawer, popover, tooltip, dropdown-menu, context-menu, sonner, or any shadcn/ui or Radix primitives) and confirm: are they actually used anywhere, or scaffolded and ignored? For each unused primitive, note which custom components could be migrated onto it with minimal behavior change.
Flag components that appear to be near-duplicates of each other (e.g. list vs. profile sheets, transfer vs. gift dialogs) and assess whether they should share a common base/hook rather than being copy-pasted.
2. Data Layer & Mock Data Architecture
This is the priority section given the upcoming Rails integration.
How is mock data currently defined and consumed? Is it colocated with components, in a central /mocks or /fixtures directory, or scattered inline?
Is there any abstraction between "a component needs data" and "here is the mock data" — e.g. a service/repository layer, custom hooks (useEvents, useTicket, etc.), or is mock data imported and used directly in components?
Is there a single HTTP client wrapper (fetch/axios instance) anywhere, even if unused, or does every component/hook assume its own data source?
Is React Query, SWR, RTK Query, or any server-state library present? If not, flag this explicitly as the single highest-leverage addition before Rails integration — explain why (caching, loading/error states, request dedup, optimistic updates, and — critically — a clean seam where mock fetchers get swapped for real fetchers without touching component code).
Are there TypeScript interfaces/types for domain entities (Event, Ticket, Listing, Organizer, User, PayoutMethod, etc.) defined independently of the mock data shape, or is mock data shape being used as the de facto type? Flag risk: if types are inferred from mocks, real Rails JSON (snake_case, different nesting, null handling) will silently break things without a defined contract.
Is there any environment-based config (.env, base URL switching) already scaffolded, even if pointing nowhere yet?
3. API-Readiness Checklist
Explicitly answer each of these as ready / partially ready / not ready, with evidence:
Can the mock data source be swapped for a real fetch call by changing one file/hook per entity, or would it require touching many components?
Is loading state handled consistently (skeleton/spinner patterns) or ad hoc per component?
Is error state handled consistently, or does each component assume happy-path mock data?
Is pagination/infinite scroll anywhere in discovery/feed views, and if so, is it designed assuming client-side mock arrays (which will break against real paginated endpoints)?
Are mutations (checkout, extras, answers, resale listing, payout methods, RSVP) currently just mutating local/mock state? Map each one to what will need to become a real POST/PATCH/DELETE, and note which ones need optimistic UI vs. wait-for-response.
Is there any assumption of synchronous/instant response baked into UI (e.g. modal auto-closes after a fixed timeout rather than after a promise resolves)? Flag every instance — these will break or feel broken against real network latency.
4. State Management Architecture
Map what's local component state vs. context vs. any global store (Zustand/Redux/Jotai/etc. if present).
Is auth state (from AuthModal) held in a single source of truth accessible app-wide, or reconstructed per-component?
Is there any state that's currently duplicated in multiple places (e.g. "does the user own this ticket" checked independently in multiple components)?
5. Styling & Design System Consistency
Is there a shared design token system (Tailwind config, CSS variables) or are values (colors, spacing, blur/backdrop values, animation durations) hardcoded per component?
Are the "glass"/blur effects and spring animations implemented via a shared utility/class, or reimplemented per overlay? (Given ~20 overlay components, this is likely a major duplication source.)
6. Form Handling & Validation
Is there a shared form library (react-hook-form, Formik, or none)? Are checkout, ticket answers, settings, and auth forms validated consistently, or does each roll its own?
7. Routing & Code Splitting
Route structure overview.
Are modals/sheets route-driven (deep-linkable, e.g. /event/123?modal=checkout) or purely client-state-driven (won't survive refresh/back-button)? Flag implications for shareable links and browser back behavior, especially for checkout.
Is there any lazy-loading/code-splitting for heavy routes or large dialogs (checkout, payment)?
8. Accessibility
Focus trapping, Escape handling, aria-* roles, and return-focus-on-close: audit presence/absence across all overlay components (expect this to mirror prior findings — confirm and quantify).
9. Naming, File Structure & Conventions
Is there a consistent folder structure (feature-based vs. type-based)? Any inconsistent naming patterns between similar components?
10. Testing
What test coverage exists (unit/component/e2e)? Is anything testing mock-data-dependent behavior that will need updating once real data lands?
Output Format
Deliver as:
An executive summary (5-8 bullets, highest-impact findings first, especially anything blocking a clean Rails swap-in)
The detailed section-by-section tables above
A prioritized action list, ordered by "must fix before backend integration" vs. "nice to have / can do in parallel"