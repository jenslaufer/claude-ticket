#!/usr/bin/env python3
"""github provider — file the Canonical Ticket Model as a GitHub issue via the `gh` CLI.

Config: an authenticated `gh` CLI (`gh auth status`). No secrets read from disk.
Options: dry_run, repo (OWNER/NAME), no_labels.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from lib.render import render_markdown  # noqa: E402


def _labels(ticket: dict) -> list[str]:
    return [f"type:{ticket.get('type', 'task')}",
            f"priority:{ticket.get('priority', 'med')}"] + list(ticket.get("labels") or [])


def _list_issues(title: str, repo: str | None) -> list[dict]:
    cmd = ["gh", "issue", "list", "--search", f"{title} in:title", "--state", "open",
           "--limit", "10", "--json", "number,title,url"]
    if repo:
        cmd += ["--repo", repo]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return []
    try:
        return json.loads(r.stdout or "[]")
    except json.JSONDecodeError:
        return []


def emit(ticket: dict, opts: dict) -> dict:
    if not shutil.which("gh"):
        raise RuntimeError("gh CLI not found on PATH")
    title = (ticket.get("title") or "").strip()
    if not title:
        raise RuntimeError("ticket has no title")

    body = render_markdown(ticket, include_title=False)
    repo = opts.get("repo")
    labels = [] if opts.get("no_labels") else _labels(ticket)
    assignee = ticket.get("assignee")

    if opts.get("dry_run"):
        preview = [
            "[github dry-run] gh issue create",
            f"  repo:     {repo or '<current repo>'}",
            f"  title:    {title}",
            f"  labels:   {' '.join(_labels(ticket))}",
            f"  assignee: {assignee or '<none>'}",
            "--- body ---",
            body,
        ]
        return {"preview": "\n".join(preview)}

    dup = next((i for i in _list_issues(title, repo) if i.get("title") == title), None)
    if dup:
        sys.stderr.write(
            f"github: an open issue with this title already exists: {dup['url']} (skipping create)\n")
        return {"provider": "github", "ref": str(dup["number"]), "url": dup["url"], "deduped": True}

    def create(with_labels: bool) -> subprocess.CompletedProcess:
        cmd = ["gh", "issue", "create"]
        if repo:
            cmd += ["--repo", repo]
        cmd += ["--title", title, "--body-file", "-"]
        if with_labels:
            for l in labels:
                cmd += ["--label", l]
        if assignee:
            cmd += ["--assignee", assignee]
        return subprocess.run(cmd, input=body, capture_output=True, text=True)

    r = create(bool(labels))
    if r.returncode != 0 and labels and "label" in (r.stderr or "").lower():
        sys.stderr.write(
            "github: some labels do not exist in the repo; retrying without labels "
            "(type/priority stay in the body)\n")
        r = create(False)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "").strip() or "gh issue create failed")

    url = r.stdout.strip().splitlines()[-1].strip()
    m = re.search(r"(\d+)\s*$", url)
    return {"provider": "github", "ref": m.group(1) if m else "", "url": url}
