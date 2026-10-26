# Wallet registration answer viewing and editing

Status: ready-for-agent
Backend #50 is resolved; frontend mapping alone was previously overclaimed as complete.

Read the committed GET /registrations/:id/answers and POST
/registration_answers/:id/revise contracts. Add reachable wallet answer viewing
and corrections using served question metadata, per-answer editable and global
can_edit_answers, and the correction deadline. Preserve original-respondent
access control and field validation. Use the central client/idempotency header;
never infer edit eligibility from client time alone. Unsupported/erased answers
must remain absent. Cover the browser/API boundary when test seams are agreed.

2026-10-26: Browser/API boundary confirmed. Work paused for the user's payment
incident before implementation. Draft red test preserved in sibling
wallet-answers.spec.pending.ts, outside the runnable e2e suite. Resume TDD here.
