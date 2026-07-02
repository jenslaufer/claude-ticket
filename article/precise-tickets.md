# Your coding agent is only as good as your ticket

We automated the cheap part.

Coding agents write functions, tests, whole features. The code that used to take a day now takes
minutes. But watch what happens before the agent starts: someone types two vague sentences into a
prompt and hopes.

That step — turning an idea into a precise piece of work — was never automated. It was never even
respected. I spent years in software teams and I can count the genuinely precise tickets I received
on one hand. "Improve the export" was a normal Tuesday.

## Vague tickets used to be survivable

Here's the thing: vague tickets mostly worked, because a human sat on the other side.

A developer reads "improve the export", frowns, and walks over to ask what's actually broken. They
fill the gaps with domain knowledge, taste, and memory of the last three export bugs. The ambiguity
gets absorbed by a person before it becomes code.

An agent doesn't frown. It picks one plausible interpretation and executes it — fast, confidently,
five hundred lines deep. Ambiguity a human would have absorbed ships as a defect.

So the leverage flipped. The ticket is no longer a note that precedes the real spec. **The ticket is
the spec.** It's the last place where intent exists in writing before something acts on it.

## What a precise ticket looks like

Precision is not length. A precise ticket answers a fixed set of questions and stops:

- **One imperative title.** "Add password reset via email link." If you can't write this sentence,
  the work isn't ready.
- **Context.** What's broken, who's affected, why now.
- **Scope — in AND out.** The out-list is the highest-leverage field on the whole ticket. Silence is
  permission; an agent reads an unstated boundary as an invitation.
- **Acceptance criteria.** Given/When/Then, each one binary. Outcome, not method.
- **Verification.** The command or check that proves it's done.
- **Repro steps** for bugs. A bug report without expected-vs-actual is a rumor.

Nothing exotic. Teams have known this for decades. The difference is that the cost of skipping it
used to be a follow-up question. Now it's a wrong pull request.

## Separate the precision from the plumbing

There's a second trap: coupling the thinking to the tool. Ticket quality advice always seems to come
wrapped in a specific system — Jira rituals, GitHub templates. Then you switch tools and lose the
practice.

These are two different problems:

1. **Precision** — turning intent into an unambiguous, testable unit of work.
2. **Plumbing** — getting that unit into whatever system your team uses.

So I built the split into a tool. A generator turns a rough idea into a canonical, platform-neutral
ticket model: title, type, context, scope in/out, Given/When/Then acceptance, verification, priority,
links. It knows nothing about ticket systems. A thin adapter layer takes that model and files it —
GitHub Issues via the `gh` CLI, Jira via its REST API, or plain Markdown if you just want the text.
Adding a system means adding one file, not touching the core.

And because precision claims are cheap, the tool can grade itself: an optional critic scores every
ticket against a fixed rubric — title quality, scope boundaries, testable acceptance, executor
readiness — and loops until it passes. Not because a score is truth, but because a mechanical
checklist catches the ambiguity you stopped seeing.

## Try it

It's an agent plugin — host-agnostic, open source, MIT. In Claude Code:

```
/plugin marketplace add jenslaufer/agent-ticket
/plugin install ticket@jenslaufer

/ticket users should be able to reset their password by email
/ticket --provider github --critic rate limiting for the public API
```

In OpenAI Codex, the same plugin installs via
`codex plugin marketplace add jenslaufer/agent-ticket` and `codex plugin add ticket@jenslaufer` —
one repo, one skill, two hosts. The precision layer doesn't care which agent runs it, just as it
doesn't care which tracker it files into.

The repo is at [github.com/jenslaufer/agent-ticket](https://github.com/jenslaufer/agent-ticket).
Adapters are one JavaScript file each — if your team lives in Linear or GitLab, the contract is
documented and small.

The agents will keep getting better at writing code. The scarce skill is now upstream: saying what
you want, precisely enough that it survives execution. That was always the job. Now it's the whole
job.
