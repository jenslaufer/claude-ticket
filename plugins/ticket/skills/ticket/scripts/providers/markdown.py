#!/usr/bin/env python3
"""markdown provider — render the Canonical Ticket Model to a Markdown ticket.

Config: none. The zero-dependency default and the reference renderer.
Options: dry_run, out (FILE). With `out` set (and not dry_run) the ticket is written to the
file and a {provider,ref,url} result is returned; otherwise the Markdown itself is the payload.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from lib.render import render_markdown  # noqa: E402


def emit(ticket: dict, opts: dict) -> dict:
    body = render_markdown(ticket, include_title=True)
    out = opts.get("out")
    if out and not opts.get("dry_run"):
        path = pathlib.Path(out)
        path.write_text(body, encoding="utf-8")
        return {"provider": "markdown", "ref": str(path), "url": path.resolve().as_uri()}
    return {"preview": body}
