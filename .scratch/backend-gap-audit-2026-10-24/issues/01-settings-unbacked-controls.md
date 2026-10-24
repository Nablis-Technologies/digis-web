# Make unsupported Settings controls honest

Status: ready-for-agent
Related backend gap: #48 (still open after the 2026-10-24 source audit).

`SettingsPage.tsx` currently lets a local `twoFaEnabled` toggle claim account
protection, without an enrollment/verification API. Language/currency/region and
public-profile controls are also local, with no persisted consumer preferences
contract. Notification-channel preferences are a distinct implemented backend
surface and must not be disabled as part of this cleanup.

Make unsupported controls unavailable or clearly reflect only an actual supported
local setting; remove false security/account-persistence confirmations. Do not
choose or implement backend 2FA/preferences behavior. Preserve account editing,
avatar, real notification preferences, theme and sign-out. Verify that no
click-through can claim 2FA is enabled without server confirmation.

This is a frontend follow-up discovered during the gap audit, not newly resolved
backend work and not another backend defect number.
