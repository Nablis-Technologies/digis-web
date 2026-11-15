# Complete profile names and avatar refresh

Status: selected name/profile UI complete; avatar URL lifetime follow-up separate

Update 2026-11-01: required name editing/signup and avatar refresh were wired in
earlier slices; the legacy completion prompt now opens the existing editor and
disappears after a successful save. `e2e/profile-handoff.spec.ts` passes all five
cases. Full cleanup of previously cached avatar object URLs was not certified by
this slice; retain that lifetime concern as a separate frontend follow-up.

Follow the current backend plus User Profile and Fixes handoffs. Replace signup
name splitting with separate required first/last inputs and the Given Name /
Father's Name bilingual labels supplied by the handoff. Enforce the served
100-character limit per name and Unicode handling; associate labels and backend
errors with each field. Settings must not label the required last name optional
or silently duplicate names. Add the legacy profile completion prompt.

Invalidate/revalidate authenticated avatar blobs after successful replacement,
removal and account changes; revoke no-longer-used object URLs. Preserve ETag/304,
authenticated binary reads, multipart uploads and central idempotency behavior.
Do not change backend naming or identity rules.
