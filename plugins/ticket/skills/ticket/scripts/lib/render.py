"""Shared Markdown renderer for the Canonical Ticket Model. Standard library only."""
from __future__ import annotations


def _meta_line(t: dict) -> str:
    parts = [f"`{t.get('type', 'task')}`", f"priority: `{t.get('priority', 'med')}`"]
    labels = t.get("labels") or []
    if labels:
        parts.append(" ".join(f"`{l}`" for l in labels))
    if t.get("assignee"):
        parts.append(f"assignee: @{t['assignee']}")
    if t.get("estimate"):
        parts.append(f"estimate: {t['estimate']}")
    return " · ".join(parts)


def render_markdown(t: dict, include_title: bool = True) -> str:
    """Render a Canonical Ticket Model dict to a Markdown ticket string."""
    L: list[str] = []
    if include_title:
        L += [f"# {t.get('title', '')}", ""]
    L += [_meta_line(t), ""]
    L += ["## Context", "", t.get("context", ""), ""]

    repro = t.get("repro")
    if repro:
        L += ["## Reproduction", ""]
        steps = repro.get("steps") or []
        L += [f"{i}. {s}" for i, s in enumerate(steps, 1)]
        if steps:
            L.append("")
        L += [f"- **Expected:** {repro.get('expected', '')}",
              f"- **Actual:** {repro.get('actual', '')}", ""]

    scope = t.get("scope") or {}
    L += ["## Scope", ""]
    L += [f"- {x}" for x in (scope.get("in") or [])]
    L += ["", "## Out of scope", ""]
    L += [f"- {x}" for x in (scope.get("out") or [])]
    L += [""]

    L += ["## Acceptance criteria", ""]
    L += [f"- [ ] Given {a.get('given', '')}, when {a.get('when', '')}, then {a.get('then', '')}"
          for a in (t.get("acceptance") or [])]
    L += [""]

    L += ["## Verification", ""]
    L += [f"- [ ] {v}" for v in (t.get("verification") or [])]
    L += [""]

    links = t.get("links") or {}
    parent = links.get("parent")
    blocks = links.get("blocks") or []
    blocked_by = links.get("blocked_by") or []
    related = links.get("related") or []
    if parent or blocks or blocked_by or related:
        L += ["## Links", ""]
        if parent:
            L.append(f"- Parent: {parent}")
        if blocks:
            L.append(f"- Blocks: {', '.join(blocks)}")
        if blocked_by:
            L.append(f"- Blocked by: {', '.join(blocked_by)}")
        if related:
            L.append(f"- Related: {', '.join(related)}")
        L += [""]

    notes = t.get("notes")
    if notes:
        L += ["## Notes", "", notes]

    return "\n".join(L).rstrip() + "\n"
