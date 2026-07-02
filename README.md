# agent-ticket

Agent-plugin marketplace with one plugin: **[ticket](plugins/ticket/)** — turn a rough idea
into a precise, well-scoped ticket and file it into a real ticketing system (GitHub Issues, Jira,
GitLab, Markdown) through a pluggable provider layer.

Host-agnostic: works in **Claude Code** and **OpenAI Codex** (and any Agent-Skills host).
The core is plain Node.js — no host-specific code paths.

## Install

Claude Code:

```
/plugin marketplace add jenslaufer/agent-ticket
/plugin install ticket@jenslaufer
```

Codex:

```
codex plugin marketplace add jenslaufer/agent-ticket
codex plugin add ticket@jenslaufer
```

## Why

Coding agents made writing code cheap. The bottleneck moved upstream: turning intent into a
specification precise enough to execute without guessing. Tickets are the entry point of that stage —
for humans and agents alike. This plugin treats the ticket as the specification and separates the
hard part (precision) from the plumbing (which ticket system it lands in).

Full documentation: [plugins/ticket/README.md](plugins/ticket/README.md)

## Development

```
node --test tests/*.test.js
```

No dependencies — the plugin and its tests use Node.js (>= 18) built-ins only.

## License

MIT
