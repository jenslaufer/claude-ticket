---
name: ticket
description: Turn a rough idea into a precise, well-scoped ticket and file it into a real ticketing system (GitHub Issues, Jira, or plain Markdown) through a pluggable provider layer. Use when the user wants to create, write, file, or push a ticket/issue — "create a ticket for X", "file this as a GitHub issue", "ticket anlegen", "issue erstellen". Supports --critic for a quality-gated loop and --dry-run for a no-write preview.
---

# ticket — precise tickets, filed into real systems

Two strictly separated layers:

1. **Generator** — turns a rough idea into a platform-neutral **Canonical Ticket Model** (JSON).
   It knows nothing about ticket systems.
2. **Provider layer** — `scripts/ticket_emit.py` dispatches the model to an adapter
   (`markdown`, `github`, `jira`, …). Adapters know nothing about ticket writing.

All scripts are Python 3 standard library only — no bash, jq, curl, or pip installs.

## Arguments

Parse these from the user's request / `$ARGUMENTS`; everything else is the ticket idea itself.

| Flag | Meaning |
|---|---|
| `--provider <name>` | Target system: `markdown` (default), `github`, `jira` |
| `--repo OWNER/NAME` | GitHub target repo (github provider only) |
| `--out FILE` | Write the markdown ticket to FILE (markdown provider only) |
| `--dry-run` | Render the exact payload/command, write nothing external |
| `--critic` | Quality-gate the ticket with the `ticket-critic` agent before filing |

If the user names a system without a flag ("file this in Jira", "as a GitHub issue"), map it to the
provider yourself. If no system is mentioned, use `markdown` and say so.

## Workflow (mandatory steps, in order)

1. **Read the references.** Read `references/ticket-model.md` and `references/generator.md` from this
   skill's directory. They define the schema and the writing rules — do not write a ticket from memory.

2. **Generate the Canonical Ticket Model.** Follow `generator.md`: identify the executor, state the
   done-sentence, find rabbit holes, ground names in the codebase when one is present (search it).
   Produce one JSON object. If a required field cannot be filled, ask the user **one** focused
   question instead of guessing — then continue.

3. **Quality gate (only with `--critic`).** Launch the `ticket-critic` agent (Agent tool) with the full
   ticket JSON as input. It returns `scores` (10 metrics, 0–100) and `feedback`.
   - If any metric < 70: fix exactly the flagged issues in the model, re-run the critic.
   - Repeat until all metrics ≥ 70 (max 3 rounds; then present the best version and the remaining
     feedback honestly).
   - Show the user the final score table.

4. **Preview before external writes.** For `github` and `jira` without an explicit `--dry-run`:
   run the emitter **with** `--dry-run` first, show the user the exact payload, and get their go-ahead
   before the real write. `markdown` needs no confirmation.

5. **Emit.** Save the model to a temp file, then:

   ```
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/ticket/scripts/ticket_emit.py" \
     --provider <name> [--dry-run] [--repo OWNER/NAME] [--out FILE] < ticket.json
   ```

   - Success prints one JSON line: `{"provider": "...", "ref": "...", "url": "..."}` — report the URL.
   - `"deduped": true` means an open ticket with the same title already exists; report it, don't refile.
   - Non-zero exit = real failure (message on stderr). Report it verbatim; never claim success.

6. **Report.** Show the ticket (or its URL), the provider used, and any assumptions you made
   (inferred type/priority, chosen provider).

## Provider configuration

| Provider | Needs |
|---|---|
| `markdown` | nothing |
| `github` | authenticated `gh` CLI (`gh auth status`) |
| `jira` | env: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` |

If a provider fails on missing config, relay the adapter's error and tell the user exactly which
variable or login is missing. Never invent credentials; never echo secrets.

## Adding a ticket system

One file: `scripts/providers/<name>.py` exposing `emit(ticket: dict, opts: dict) -> dict`.
See `references/adapters.md` for the contract. No core change needed — discovery is by filename.
