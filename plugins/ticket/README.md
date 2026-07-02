# ticket

A Claude Code plugin that turns a rough idea into a precise, well-scoped ticket — and files it
into a real ticketing system through a pluggable provider layer.

Coding agents made writing code cheap. The expensive part moved upstream: deciding *what* to build,
precisely enough that an agent (or a human) can execute without guessing. A vague ticket used to be
buffered by a developer who asked questions. An agent executes the ambiguity. This plugin makes the
ticket the specification.

## What it does

```
rough idea
   │
   ▼
Generator ──► Canonical Ticket Model (platform-neutral JSON)
   │              title · type · context · repro · scope in/out ·
   │              acceptance (Given/When/Then) · verification · priority · labels · links
   ├── optional: --critic quality gate (10-metric rubric, loop until it passes)
   ▼
Provider layer ──► markdown │ github │ jira │ <your adapter>
```

The generator knows nothing about ticket systems. The adapters know nothing about ticket writing.
The Canonical Ticket Model is the contract between them.

## Install

```
/plugin marketplace add jenslaufer/claude-ticket
/plugin install ticket@jenslaufer
```

## Use

```
/ticket users should be able to reset their password by email
/ticket file this as a GitHub issue in myorg/myrepo: rate limiting for the public API
/ticket --provider jira --critic checkout crashes when the cart is empty
/ticket --provider github --dry-run add CSV export to the report page
```

- Default provider is `markdown` (no configuration, prints/writes the ticket).
- `--dry-run` shows the exact payload without writing anything external.
- `--critic` runs the ticket through a mechanical 10-metric quality rubric and fixes what fails.
- External writes (GitHub/Jira) are always previewed before filing.

## Provider configuration

| Provider | Needs |
|---|---|
| `markdown` | nothing |
| `github` | an authenticated [GitHub CLI](https://cli.github.com/) (`gh auth login`) |
| `jira` | env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` |

## Add your own ticket system

One Python file: `skills/ticket/scripts/providers/<name>.py` exposing
`emit(ticket: dict, opts: dict) -> dict`. Standard library only. The dispatcher discovers it by
filename — no core change. Contract and worked examples:
[`skills/ticket/references/adapters.md`](skills/ticket/references/adapters.md).

## Requirements

- Python 3.10+ on PATH (standard library only — no pip installs)
- Works on Linux, macOS, and Windows

## License

MIT
