// markdown provider — render the Canonical Ticket Model to a Markdown ticket.
// Config: none. The zero-dependency default and the reference renderer.
// Options: dryRun, out (FILE). With `out` set (and not dryRun) the ticket is written to the
// file and a {provider,ref,url} result is returned; otherwise the Markdown itself is the payload.
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { renderMarkdown } = require('../lib/render.js');

async function emit(ticket, opts) {
  const body = renderMarkdown(ticket, { includeTitle: true });
  if (opts.out && !opts.dryRun) {
    fs.writeFileSync(opts.out, body, 'utf8');
    const abs = path.resolve(opts.out);
    return { provider: 'markdown', ref: abs, url: pathToFileURL(abs).href };
  }
  return { preview: body };
}

async function check() {
  return { ok: true, detail: 'no configuration required' };
}

module.exports = { emit, check };
