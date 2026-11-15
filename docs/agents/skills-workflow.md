# Skills & workflow — how this project uses the agent skills

> Living doc (2026-09-05). The skills are installed globally in opencode
> (`~/.agents/skills/`, 37 skills — the full Matt Pocock suite). Applies to
> both `digis-web` and `digis_backend`. Invocation: **slash-only** skills need
> the human to type `/name`; **model-invocable** skills the agent loads on its
> own when the situation matches.

## The main flow

The suite is built around one chain, plus two on-ramps and a vocabulary layer:

```
grill-with-docs → to-spec → to-tickets → implement → code-review
```

| Skill | Job | Invocation |
| --- | --- | --- |
| `/grill-with-docs` | Interview → sharpens plan, writes ADRs + `CONTEXT.md` | slash-only |
| `/to-spec` | Turn the conversation into a spec (problem, stories, decisions, **testing seams**, out-of-scope) → `.scratch/<feature>/spec.md` | slash-only |
| `/to-tickets` | Split the spec into vertical tracer-bullet tickets with blocking edges → `.scratch/<feature>/issues/NN-*.md` | slash-only |
| `/implement` | Build the tickets one fresh-context at a time, driving `tdd` at the pre-agreed seam, full suite at the end | slash-only |
| `/code-review` | Two parallel sub-agents: **Standards** (repo conventions + Fowler smells) and **Spec** (matches the spec?), reported side-by-side | model-invocable |

On-ramps: `/triage` (incoming issues/PRs → roles → agent briefs) and
`/diagnosing-bugs` (hard bugs: tight red-capable feedback loop before any
hypothesis).

Vocabulary layer (model-invocable, use constantly): `codebase-design`
(module/depth/seam/leverage), `domain-modeling` (glossary + ADRs), `grilling`
(the interview primitive `/grill-with-docs` and `/triage` drive internally).

## The one-chain workflow (features)

This is the highest-leverage change for `digis-web`. Instead of building ad hoc:

1. **`/grill-with-docs`** — any feature with 3+ steps or a design decision.
   It interviews you (via `grilling`), writes ADRs + sharpens `CONTEXT.md`.
2. **`/to-spec`** — synthesizes what you discussed into a spec and publishes to
   `.scratch/<feature>/spec.md`. It also pins the **seam** you'll test at.
3. **`/to-tickets`** — slices the spec into vertical tracer-bullet tickets under
   `.scratch/<feature>/issues/NN-*.md`, each with its blocking edges,
   blocker-first.
4. **`/implement`** — builds the tickets, driving `/tdd` (red-green at the
   pre-agreed seam), typechecking + single tests as it goes, full suite at the
   end.
5. **`/code-review`** — two parallel sub-agents: **Standards** and **Spec**.
   Reports side-by-side, never merged.

**Why the chain matters:** `code-review`'s Spec axis needs the spec `to-spec`
produced, and `tdd` refuses to invent seams mid-build — the seam comes from the
spec. Skip the front of the chain and the back half degrades into self-review.

## The two on-ramps

- **`/triage`** — `docs/BACKEND_GAPS.md` is exactly a triage queue. Use it for
  work that *arrives* (bug reports, PRs), not work you generate. Moves issues
  through `needs-triage → ready-for-agent / ready-for-human / wontfix`, writes
  agent briefs, keeps a `.out-of-scope/` KB.
- **`/diagnosing-bugs`** — hard bugs. Build the tight red-capable feedback
  loop *before* hypothesizing (the Chapa env bug was a textbook case), then a
  regression test at a correct seam.

## Standalone skills worth reaching for

| Skill | Use when | Invocation |
| --- | --- | --- |
| `prototype` | "Does this state/logic feel right?" or "what should this UI look like?" — throwaway code that answers a design question | model-invocable |
| `research` | Delegate reading legwork (docs/API facts) to a background agent against primary sources | model-invocable |
| `wizard` | A human-only procedure (provision keys, walk a dashboard, set CI secrets) → generates an interactive script | model-invocable |
| `resolving-merge-conflicts` | Mid-merge/rebase conflict, resolved by intent | model-invocable |
| `/handoff` | Branch a side task out mid-phase to a portable file in the OS temp dir | slash-only |
| `writing-for-agents` | Editing AGENTS.md / skills / docs agents consume — use the pointer + hierarchy + leading-words levers | model-invocable |
| `/wayfinder` | Only for foggy multi-session greenfield efforts | slash-only |
| `/to-questionnaire` | The knowledge lives in someone else's head, not yours | slash-only |

**Not for this project:** `/wayfinder` (no greenfield fog here right now),
`/teach` (multi-session learning), `/setup-matt-pocock-skills` (already
configured on the frontend; backend intentionally left alone).

## Autonomous operation (default for the agent)

These model-invocable skills the agent should load **on its own**, without being
told, whenever the situation matches — not just when the human asks:

- **`code-review`** — before every commit / after finishing a slice, from a
  fresh review mindset: Standards + Spec against the repo's conventions and any
  originating spec/issue. This is the single biggest win.
- **`tdd`** — when building a feature or fixing a bug test-first, at a seam
  agreed in the spec (red-green loop, integration-style tests, mock only at
  system boundaries).
- **`codebase-design`** — when designing or improving a module's interface,
  choosing where a seam goes, or judging a module's depth.
- **`domain-modeling`** — when a term is fuzzy/overloaded, a decision
  crystallizes (offer an ADR when it's hard-to-reverse + surprising), or
  `CONTEXT.md` needs updating inline.
- **`grilling`** — when a plan/design needs stress-testing before building, in
  rounds with the agent finding facts and the human making decisions.
- **`diagnosing-bugs`** — the moment something is reported broken/throwing/
  failing/slow: build the red-capable feedback loop, reproduce, minimise,
  hypothesise, fix + regression test.
- **`writing-for-agents`** — any edit to AGENTS.md, skills, or docs agents
  consume.

**Slash-only skills cannot be self-invoked** by the agent. The agent should
still *follow their process* when appropriate — e.g. when a feature is being
planned, run the grilling/domain-modeling vocabulary, draft the `.scratch/`
spec + tickets, run the red-green build, then hand the human `/code-review`
(or just run the two-axis review directly since it's model-invocable). If a
slash-only step genuinely needs the human's `Continue`, say so explicitly.

## Project conventions (how the skills map onto this repo)

- `.scratch/` is the skill tracker of record (`docs/agents/issue-tracker.md`),
  currently empty — it fills when `/to-tickets` or `/triage` publish to it.
  Don't create files there manually.
- `INTEGRATION_STATUS.md` stays the repo-owned session memory; `/handoff`
  files are only for mid-session branch-outs.
- `CONTEXT.md` vocabulary + `docs/adr/` must be respected (and updated inline
  by `domain-modeling`) — they're the shared language.
- Backend keeps its own conventions (`docs/superpowers/plans|specs`,
  `tasks/lessons.md`, RuboCop + `rails test`); the skills layer on top without
  replacing them.

## Verified state (2026-09-05)

- 37 skills installed globally (`~/.agents/skills/`), all frontmatter valid.
- Frontend skills config complete: CONTEXT.md, docs/adr/ (0001–0006),
  docs/agents/{issue-tracker,domain,triage-labels}.md, AGENTS.md block.
- Tier-accent work (ADR-0006) + live-Chapa env wiring both documented in
  INTEGRATION_STATUS.md.