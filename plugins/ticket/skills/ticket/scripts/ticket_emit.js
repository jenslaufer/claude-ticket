#!/usr/bin/env node
// ticket-emit — dispatch a Canonical Ticket Model (JSON on stdin) to a provider adapter.
//
// Usage:
//   node ticket_emit.js --provider <name> [--dry-run] [--out FILE] [--repo O/N] [--no-labels] < ticket.json
//   node ticket_emit.js --list
//
// Providers live in ./providers/<name>.js and expose  async emit(ticket, opts) -> object.
// Add a ticket system by dropping a new file there — discovery is by filename, no core change.
//
// A provider returns either {preview: <text>} (printed as-is; used for --dry-run and the
// markdown renderer) or a result object {provider, ref, url, ...} (printed as one JSON line).
// Node >= 18 built-ins only — no npm installs.
'use strict';
const fs = require('fs');
const path = require('path');

const PROVIDERS_DIR = path.join(__dirname, 'providers');

function listProviders() {
  return fs.readdirSync(PROVIDERS_DIR)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    .map((f) => f.slice(0, -3))
    .sort();
}

function parseArgs(argv) {
  const opts = { dryRun: false, list: false, noLabels: false, provider: null, out: null, repo: null, extra: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--provider') opts.provider = argv[++i];
    else if (a.startsWith('--provider=')) opts.provider = a.slice(11);
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--no-labels') opts.noLabels = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a.startsWith('--out=')) opts.out = a.slice(6);
    else if (a === '--repo') opts.repo = argv[++i];
    else if (a.startsWith('--repo=')) opts.repo = a.slice(7);
    else opts.extra.push(a);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.list) {
    console.log(listProviders().join('\n'));
    return 0;
  }
  if (!opts.provider) {
    process.stderr.write('ticket-emit: --provider is required (try --list)\n');
    return 2;
  }
  if (!listProviders().includes(opts.provider)) {
    process.stderr.write(`ticket-emit: unknown provider '${opts.provider}' (try --list)\n`);
    return 2;
  }

  let ticket;
  try {
    ticket = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (e) {
    process.stderr.write(`ticket-emit: invalid ticket JSON on stdin: ${e.message}\n`);
    return 2;
  }

  const { emit } = require(path.join(PROVIDERS_DIR, `${opts.provider}.js`));
  let res;
  try {
    res = await emit(ticket, opts);
  } catch (e) {
    // adapters throw on any failure — fail closed, never fake success
    process.stderr.write(`${opts.provider}: ${e.message}\n`);
    return 1;
  }

  if (res && typeof res.preview === 'string') console.log(res.preview);
  else console.log(JSON.stringify(res));
  return 0;
}

main().then((code) => process.exit(code));
