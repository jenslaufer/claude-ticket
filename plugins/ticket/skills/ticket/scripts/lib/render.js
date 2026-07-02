// Shared Markdown renderer for the Canonical Ticket Model. Node built-ins only.
'use strict';

function metaLine(t) {
  const parts = [`\`${t.type || 'task'}\``, `priority: \`${t.priority || 'med'}\``];
  const labels = t.labels || [];
  if (labels.length) parts.push(labels.map((l) => `\`${l}\``).join(' '));
  if (t.assignee) parts.push(`assignee: @${t.assignee}`);
  if (t.estimate) parts.push(`estimate: ${t.estimate}`);
  return parts.join(' · ');
}

function renderMarkdown(t, { includeTitle = true } = {}) {
  const L = [];
  if (includeTitle) L.push(`# ${t.title || ''}`, '');
  L.push(metaLine(t), '');
  L.push('## Context', '', t.context || '', '');

  if (t.repro) {
    L.push('## Reproduction', '');
    const steps = t.repro.steps || [];
    steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    if (steps.length) L.push('');
    L.push(`- **Expected:** ${t.repro.expected || ''}`,
           `- **Actual:** ${t.repro.actual || ''}`, '');
  }

  const scope = t.scope || {};
  L.push('## Scope', '');
  (scope.in || []).forEach((x) => L.push(`- ${x}`));
  L.push('', '## Out of scope', '');
  (scope.out || []).forEach((x) => L.push(`- ${x}`));
  L.push('');

  L.push('## Acceptance criteria', '');
  (t.acceptance || []).forEach((a) =>
    L.push(`- [ ] Given ${a.given || ''}, when ${a.when || ''}, then ${a.then || ''}`));
  L.push('');

  L.push('## Verification', '');
  (t.verification || []).forEach((v) => L.push(`- [ ] ${v}`));
  L.push('');

  const links = t.links || {};
  const blocks = links.blocks || [];
  const blockedBy = links.blocked_by || [];
  const related = links.related || [];
  if (links.parent || blocks.length || blockedBy.length || related.length) {
    L.push('## Links', '');
    if (links.parent) L.push(`- Parent: ${links.parent}`);
    if (blocks.length) L.push(`- Blocks: ${blocks.join(', ')}`);
    if (blockedBy.length) L.push(`- Blocked by: ${blockedBy.join(', ')}`);
    if (related.length) L.push(`- Related: ${related.join(', ')}`);
    L.push('');
  }

  if (t.notes) L.push('## Notes', '', t.notes);

  return L.join('\n').replace(/\s+$/, '') + '\n';
}

module.exports = { renderMarkdown };
