# Remaining document work and guest account claim consistency

User authorized age/coverage display, Featured label/filter, legacy profile
completion prompt and Save to my account code/password consistency. Browser/API
seam already agreed; retain backend product boundary. No new backend decisions.

Implement in vertical slices: truthful age metadata; coverage-preserving festival
classification; real placement labels and server featured filter; legacy prompt
using existing name-edit route; shared auth OTP/password fields for guest ticket
claim including six-digit validation, resend and pending behavior. Verify browser
outcomes, existing regression gate, typecheck/units/build and bounded desktop /
mobile visual inspection. Preserve prior uncommitted work and #76 restriction.

## Outcome — 2026-11-01

Completed all selected consumer tasks. Shared AuthFormFields supplies OTP and
password UI to AuthModal and ClaimGuestSheet. Six-digit validation, associated
server errors, resend, focus containment/restoration, password visibility and
pending guards are covered at browser/API boundaries. Claim retries retain
in-memory proof and stable request identity; post-claim sign-in retries skip
verification/claim. No secret proof is persisted by this change.

Age metadata is truthful; authoritative date coverage overrides ticket names,
including empty all-event scope and partial multi-date offers. Real placement
labels and Featured only server filtering handle success and retry. Legacy
profiles use the existing name editor and clear the completion prompt after save.

Validation: 67 browser/API regressions, 259 units, TypeScript and production build
passed. Eight live auth/discovery checks passed. A stale-response race in the
category test was fixed by awaiting its exact Sports response, checking every
returned category and a rendered result; strict narrowing remains asserted.
Both final Standards and Spec reviews were clear. Review findings around partial
coverage and claim/sign-in retry behavior were fixed before the final gate.

Visual evidence: claim-dark-desktop.png, claim-light-desktop.png,
claim-dark-mobile.png, claim-light-mobile.png in this directory. Desktop 1280x900
and mobile 390x844 were inspected. The bounded design audit reported advisory
items, no blockers. Controlled HTTP tests certify claim recovery; live SMS delivery
was not tested. No backend product edits. #76 still blocks live gift acceptance;
earlier real payment acceptance was not repeated for this UI-only slice.
