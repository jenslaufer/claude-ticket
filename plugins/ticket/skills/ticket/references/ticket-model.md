# Canonical Ticket Model

The single, platform-neutral representation of a ticket. The **generator** produces it; every
**provider adapter** consumes it. Neither side knows about the other — this schema is the contract.

## JSON schema (informal)

```jsonc
{
  "title":   "string, imperative, ≤ 72 chars, no trailing period",   // required
  "type":    "bug | feature | chore | epic | spike",                 // required
  "context": "string (markdown). The why: problem, who is affected, current vs. desired behaviour.", // required
  "repro": {                     // bugs only; omit otherwise
    "steps":    ["ordered step", "..."],
    "expected": "what should happen",
    "actual":   "what happens instead"
  },
  "scope": {
    "in":  ["specific deliverable", "..."],        // required, ≥ 1
    "out": ["explicit non-goal / no-go", "..."]     // required, ≥ 1 — silence is ambiguity
  },
  "acceptance": [                 // required, ≥ 1 — binary, testable
    { "given": "precondition", "when": "action", "then": "observable outcome" }
  ],
  "verification": ["concrete check or command that proves it's done", "..."], // required, ≥ 1
  "priority": "low | med | high", // required
  "estimate": "free text appetite, e.g. 'a few hours', '2 days', '3 pts'",    // optional
  "labels":   ["kebab-case-tag", "..."],           // optional
  "assignee": "handle or null",                     // optional
  "links": {                       // optional; each value a system-native ref or url
    "parent":     "epic/parent ref or null",
    "blocks":     ["ref", "..."],
    "blocked_by": ["ref", "..."],
    "related":    ["ref", "..."]
  },
  "notes": "string or null — implementation hints for the executor (agent-internal). Not a spec." // optional
}
```

## Field rules

- **Required:** `title`, `type`, `context`, `scope.in`, `scope.out`, `acceptance`, `verification`, `priority`.
- **`title`** — one imperative line. "Add password reset via email link", not "Password reset" or "We should maybe add…".
- **`type`** — pick one. `epic` is allowed: a ticket may legitimately be large. Do **not** force atomicity.
- **`repro`** — include **only** for `type: bug`. A bug without repro steps is not ready.
- **`scope.out`** — the highest-leverage field. What must NOT be done. Silence is permission; exclude explicitly.
- **`acceptance`** — Given/When/Then, each independently checkable. Outcome, not method.
- **`verification`** — how someone confirms completion: a command, a test, a manual check with expected output.
- **`notes`** — the place for agent-execution hints (files, branch, approach). Kept out of the spec body proper so the ticket stays about *what*, not *how*.

## Principles (inherited from precise task-spec practice)

- One clear outcome. If you cannot write the `title` as a single imperative done-sentence, the ticket isn't ready.
- End state over method. Describe *done*, not *how*.
- Constraints separated from requirements. `scope.in` (must do) and `scope.out` (must not do) are different axes.
- Precision ≠ length. Every field earns its place; cut anything that doesn't reduce ambiguity.
- Name things concretely. Real endpoints, real screens, real files — not "the relevant parts".

## Minimal valid example

```json
{
  "title": "Add password reset via email link",
  "type": "feature",
  "context": "Users who forget their password have no self-service recovery and must email support. This blocks sign-ins and creates support load.",
  "scope": {
    "in": ["\"Forgot password\" link on the login screen", "Time-limited signed reset token sent by email", "Reset form that sets a new password"],
    "out": ["SMS/2FA recovery", "Account lockout policy changes", "Password strength rule changes"]
  },
  "acceptance": [
    { "given": "a registered user on the login screen", "when": "they request a reset for their email", "then": "they receive an email with a link valid for 60 minutes" },
    { "given": "a valid, unexpired reset link", "when": "the user submits a new password", "then": "the password is updated and they are signed in" },
    { "given": "an expired or reused reset link", "when": "the user opens it", "then": "they see an error and can request a new one" }
  ],
  "verification": [
    "Automated test: request reset -> follow token -> new password works, old password rejected",
    "Manual: expired token shows the error path"
  ],
  "priority": "high",
  "estimate": "2 days",
  "labels": ["auth", "backend", "frontend"],
  "links": { "parent": null, "blocks": [], "blocked_by": [], "related": [] }
}
```
