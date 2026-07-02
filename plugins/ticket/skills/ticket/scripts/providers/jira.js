// jira provider — create an issue via the Jira Cloud REST API v3. Node built-ins only (fetch).
// Config (env): JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY.
// Options: dryRun.
'use strict';
const { renderMarkdown } = require('../lib/render.js');

const TYPE = { bug: 'Bug', feature: 'Story', chore: 'Task', epic: 'Epic', spike: 'Task' };
const PRIO = { low: 'Low', med: 'Medium', high: 'High' };

// Minimal ADF: one paragraph node per non-empty line of the rendered body.
function adf(body) {
  return {
    type: 'doc', version: 1,
    content: body.split('\n').filter((l) => l.trim())
      .map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l }] })),
  };
}

function payloadFor(ticket, project) {
  const body = renderMarkdown(ticket, { includeTitle: false });
  return { fields: {
    project: { key: project },
    summary: ticket.title || '',
    issuetype: { name: TYPE[ticket.type] || 'Task' },
    priority: { name: PRIO[ticket.priority] || 'Medium' },
    labels: (ticket.labels || []).map((l) => l.replace(/ /g, '-')),
    description: adf(body),
  } };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

async function searchDup(base, headers, project, title) {
  const jql = `project=${project} AND summary~"${title.replace(/"/g, '')}" AND statusCategory != Done`;
  const q = new URLSearchParams({ jql, maxResults: '5', fields: 'summary' });
  const resp = await fetch(`${base}/rest/api/3/search?${q}`, { headers });
  if (!resp.ok) return null;
  const data = await resp.json();
  const hit = (data.issues || []).find((i) => i.fields?.summary === title);
  return hit ? hit.key : null;
}

async function emit(ticket, opts) {
  const title = (ticket.title || '').trim();
  if (!title) throw new Error('ticket has no title');

  if (opts.dryRun) {
    const base = process.env.JIRA_BASE_URL || '<JIRA_BASE_URL>';
    const payload = payloadFor(ticket, process.env.JIRA_PROJECT_KEY || '<JIRA_PROJECT_KEY>');
    return { preview: `[jira dry-run] POST ${base}/rest/api/3/issue\n`
      + JSON.stringify(payload, null, 2) };
  }

  const base = requireEnv('JIRA_BASE_URL').replace(/\/+$/, '');
  const email = requireEnv('JIRA_EMAIL');
  const token = requireEnv('JIRA_API_TOKEN');
  const project = requireEnv('JIRA_PROJECT_KEY');
  const headers = {
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const dup = await searchDup(base, headers, project, title);
  if (dup) {
    process.stderr.write(
      `jira: an open issue with this summary already exists: ${base}/browse/${dup} (skipping create)\n`);
    return { provider: 'jira', ref: dup, url: `${base}/browse/${dup}`, deduped: true };
  }

  const resp = await fetch(`${base}/rest/api/3/issue`, {
    method: 'POST', headers, body: JSON.stringify(payloadFor(ticket, project)),
  });
  if (!resp.ok) {
    const text = (await resp.text()).slice(0, 500);
    throw new Error(`jira create failed (${resp.status}): ${text}`);
  }
  const out = await resp.json();
  if (!out.key) throw new Error(`jira create returned no key: ${JSON.stringify(out)}`);
  return { provider: 'jira', ref: out.key, url: `${base}/browse/${out.key}` };
}

module.exports = { emit };
