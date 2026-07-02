# Your coding agent is only as good as your ticket

We automated the cheap part. Agents write the code in minutes. The step before — turning an idea
into precise work — is still two vague lines and hope.

Vague tickets used to be survivable: a developer would frown, walk over, ask. An agent doesn't
frown. It picks one plausible interpretation and executes it, five hundred lines deep.

The ticket is the spec now. So I built **ticket-forge**. You type:

```
/ticket users should be able to delete their own account
```

You get:

> **Let users delete their own account**
> `feature` · priority: `high` · `gdpr` · estimate: 2-3 days
>
> **Context** — Leaving users must email support and wait. Frustrating, support load, and a GDPR
> risk: deletion requests must be honored without undue delay.
>
> **Scope** — Delete action in account settings behind a confirmation step · hard-delete personal
> data, anonymize shared rows · confirmation email.
>
> **Out of scope** — Data export before deletion (separate ticket) · admin-initiated deletion ·
> soft-delete / grace-period restore.
>
> **Acceptance** —
> - [ ] Given a signed-in user, when they confirm deletion, then they are signed out and can no
>   longer log in
> - [ ] Given a deleted account, when its data is looked up, then personal data is gone and shared
>   records are anonymized
>
> **Verification** — Automated test: delete → login rejected, personal rows gone. Manual:
> confirmation email arrives.

Look at the out-of-scope list. That's where the three-day rabbit holes live — named and excluded
before anyone burns a day on them.

Filed straight into GitHub Issues, Jira, or GitLab. Works in Claude Code and OpenAI Codex.
Open source, MIT.

This is the ticket I wish someone had handed me back when I was the developer.

Want the plugin? Drop **ticket-forge** in the comments and I'll send you the link.
