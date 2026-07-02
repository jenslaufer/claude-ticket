#!/usr/bin/env python3
"""ticket-emit — dispatch a Canonical Ticket Model (JSON on stdin) to a provider adapter.

Usage:
    python3 ticket_emit.py --provider <name> [--dry-run] [--out FILE] [--repo O/N] [--no-labels] < ticket.json
    python3 ticket_emit.py --list

Providers live in ./providers/<name>.py and expose  emit(ticket: dict, opts: dict) -> dict.
Add a ticket system by dropping a new file there — discovery is by filename, no core change.

A provider returns either {"preview": <text>} (printed as-is; used for --dry-run and the
markdown renderer) or a result dict {"provider","ref","url", ...} (printed as one JSON line).
Standard library only — no third-party dependencies.
"""
import argparse
import importlib
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PROVIDERS_DIR = HERE / "providers"
sys.path.insert(0, str(HERE))


def list_providers() -> list[str]:
    return sorted(p.stem for p in PROVIDERS_DIR.glob("*.py") if not p.stem.startswith("_"))


def main() -> int:
    parser = argparse.ArgumentParser(prog="ticket-emit", description=__doc__.splitlines()[0])
    parser.add_argument("--provider")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--out")
    parser.add_argument("--repo")
    parser.add_argument("--no-labels", action="store_true")
    args, extra = parser.parse_known_args()

    if args.list:
        print("\n".join(list_providers()))
        return 0
    if not args.provider:
        sys.stderr.write("ticket-emit: --provider is required (try --list)\n")
        return 2
    if args.provider not in list_providers():
        sys.stderr.write(f"ticket-emit: unknown provider '{args.provider}' (try --list)\n")
        return 2

    try:
        ticket = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"ticket-emit: invalid ticket JSON on stdin: {e}\n")
        return 2

    mod = importlib.import_module(f"providers.{args.provider}")
    opts = {"dry_run": args.dry_run, "out": args.out, "repo": args.repo,
            "no_labels": args.no_labels, "extra": extra}
    try:
        res = mod.emit(ticket, opts)
    except Exception as e:  # adapters raise on any failure — fail closed, never fake success
        sys.stderr.write(f"{args.provider}: {e}\n")
        return 1

    if "preview" in res:
        print(res["preview"])
    else:
        print(json.dumps(res))
    return 0


if __name__ == "__main__":
    sys.exit(main())
