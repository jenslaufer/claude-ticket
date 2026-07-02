// github provider — file the Canonical Ticket Model as a GitHub issue via the `gh` CLI.
// Config: an authenticated `gh` CLI (`gh auth status`). No secrets read from disk.
// Options: dryRun, repo (OWNER/NAME), noLabels.
'use strict';
const { spawnSync } = require('child_process');
const { renderMarkdown } = require('../lib/render.js');

function labelsFor(t) {
  return [`type:${t.type || 'task'}`, `priority:${t.priority || 'med'}`, ...(t.labels || [])];
}

function gh(args, input) {
  return spawnSync('gh', args, { input, encoding: 'utf8', windowsHide: true });
}

// Dedupe via the plain list API, not --search: GitHub's search index lags behind
// issue creation by seconds to minutes, so a just-filed duplicate would slip through.
// The list endpoint is real-time; exact-title matching happens client-side.
function listIssues(repo) {
  const args = ['issue', 'list', '--state', 'open', '--limit', '100',
                '--json', 'number,title,url'];
  if (repo) args.push('--repo', repo);
  const r = gh(args);
  if (r.error || r.status !== 0) return [];
  try { return JSON.parse(r.stdout || '[]'); } catch { return []; }
}

async function emit(ticket, opts) {
  const title = (ticket.title || '').trim();
  if (!title) throw new Error('ticket has no title');

  const body = renderMarkdown(ticket, { includeTitle: false });
  const labels = opts.noLabels ? [] : labelsFor(ticket);

  if (opts.dryRun) {
    const preview = [
      '[github dry-run] gh issue create',
      `  repo:     ${opts.repo || '<current repo>'}`,
      `  title:    ${title}`,
      `  labels:   ${labelsFor(ticket).join(' ')}`,
      `  assignee: ${ticket.assignee || '<none>'}`,
      '--- body ---',
      body,
    ];
    return { preview: preview.join('\n') };
  }

  const probe = gh(['--version']);
  if (probe.error) throw new Error('gh CLI not found on PATH');

  const dup = listIssues(opts.repo).find((i) => i.title === title);
  if (dup) {
    process.stderr.write(
      `github: an open issue with this title already exists: ${dup.url} (skipping create)\n`);
    return { provider: 'github', ref: String(dup.number), url: dup.url, deduped: true };
  }

  const create = (withLabels) => {
    const args = ['issue', 'create'];
    if (opts.repo) args.push('--repo', opts.repo);
    args.push('--title', title, '--body-file', '-');
    if (withLabels) for (const l of labels) args.push('--label', l);
    if (ticket.assignee) args.push('--assignee', ticket.assignee);
    return gh(args, body);
  };

  let r = create(labels.length > 0);
  if (r.status !== 0 && labels.length && /label/i.test(r.stderr || '')) {
    process.stderr.write(
      'github: some labels do not exist in the repo; retrying without labels ' +
      '(type/priority stay in the body)\n');
    r = create(false);
  }
  if (r.error) throw new Error(`gh failed to run: ${r.error.message}`);
  if (r.status !== 0) throw new Error((r.stderr || '').trim() || 'gh issue create failed');

  const lines = r.stdout.trim().split('\n');
  const url = lines[lines.length - 1].trim();
  const m = url.match(/(\d+)\s*$/);
  return { provider: 'github', ref: m ? m[1] : '', url };
}

module.exports = { emit };
