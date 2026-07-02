#!/usr/bin/env python3
"""jira provider — create an issue via the Jira Cloud REST API v3. Standard library only.

Config (env): JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY.
Options: dry_run.
"""
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from lib.render import render_markdown  # noqa: E402

_TYPE = {"bug": "Bug", "feature": "Story", "chore": "Task", "epic": "Epic", "spike": "Task"}
_PRIO = {"low": "Low", "med": "Medium", "high": "High"}


def _adf(body: str) -> dict:
    """Minimal ADF: one paragraph node per non-empty line of the rendered body."""
    return {
        "type": "doc", "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": line}]}
                    for line in body.splitlines() if line.strip()],
    }


def _payload(ticket: dict, project: str) -> dict:
    body = render_markdown(ticket, include_title=False)
    return {"fields": {
        "project": {"key": project},
        "summary": ticket.get("title", ""),
        "issuetype": {"name": _TYPE.get(ticket.get("type"), "Task")},
        "priority": {"name": _PRIO.get(ticket.get("priority"), "Medium")},
        "labels": [l.replace(" ", "-") for l in (ticket.get("labels") or [])],
        "description": _adf(body),
    }}


def _require(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"{name} not set")
    return v


def _get(url: str, headers: dict):
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _search_dup(base: str, headers: dict, project: str, title: str) -> str | None:
    safe = title.replace('"', "")
    jql = f'project={project} AND summary~"{safe}" AND statusCategory != Done'
    q = urllib.parse.urlencode({"jql": jql, "maxResults": 5, "fields": "summary"})
    try:
        data = _get(f"{base}/rest/api/3/search?{q}", headers)
    except urllib.error.HTTPError:
        return None
    for issue in data.get("issues") or []:
        if issue.get("fields", {}).get("summary") == title:
            return issue.get("key")
    return None


def emit(ticket: dict, opts: dict) -> dict:
    title = (ticket.get("title") or "").strip()
    if not title:
        raise RuntimeError("ticket has no title")

    if opts.get("dry_run"):
        base = os.environ.get("JIRA_BASE_URL", "<JIRA_BASE_URL>")
        payload = _payload(ticket, os.environ.get("JIRA_PROJECT_KEY", "<JIRA_PROJECT_KEY>"))
        return {"preview": f"[jira dry-run] POST {base}/rest/api/3/issue\n"
                + json.dumps(payload, indent=2, ensure_ascii=False)}

    base = _require("JIRA_BASE_URL").rstrip("/")
    email = _require("JIRA_EMAIL")
    token = _require("JIRA_API_TOKEN")
    project = _require("JIRA_PROJECT_KEY")
    auth = base64.b64encode(f"{email}:{token}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}",
               "Content-Type": "application/json", "Accept": "application/json"}

    dup = _search_dup(base, headers, project, title)
    if dup:
        sys.stderr.write(
            f"jira: an open issue with this summary already exists: {base}/browse/{dup} (skipping create)\n")
        return {"provider": "jira", "ref": dup, "url": f"{base}/browse/{dup}", "deduped": True}

    data = json.dumps(_payload(ticket, project)).encode()
    req = urllib.request.Request(f"{base}/rest/api/3/issue", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            out = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"jira create failed ({e.code}): {e.read().decode()[:500]}")
    key = out.get("key")
    if not key:
        raise RuntimeError(f"jira create returned no key: {out}")
    return {"provider": "jira", "ref": key, "url": f"{base}/browse/{key}"}
