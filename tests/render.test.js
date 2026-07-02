'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderMarkdown } = require('../plugins/ticket/skills/ticket/scripts/lib/render.js');

const FEATURE = {
  title: 'Add password reset via email link',
  type: 'feature',
  context: 'Users cannot recover access on their own.',
  scope: { in: ['Reset link on login screen'], out: ['SMS recovery'] },
  acceptance: [{ given: 'a registered user', when: 'they request a reset', then: 'they get an email' }],
  verification: ['Automated test: reset flow end-to-end'],
  priority: 'high',
  estimate: '2 days',
  labels: ['auth'],
  links: { parent: 'EPIC-12', blocks: [], blocked_by: ['#41'], related: [] },
};

const BUG = {
  title: 'Login form loses input on validation error',
  type: 'bug',
  context: 'Form clears on error.',
  repro: { steps: ['Open /login', 'Submit wrong password'], expected: 'email kept', actual: 'email cleared' },
  scope: { in: ['Preserve email field'], out: ['Password persistence'] },
  acceptance: [{ given: 'a failed login', when: 'error shows', then: 'email is still filled' }],
  verification: ['Manual: fail a login'],
  priority: 'med',
};

test('renders all required sections for a feature', () => {
  const md = renderMarkdown(FEATURE);
  assert.match(md, /^# Add password reset via email link\n/);
  for (const h of ['## Context', '## Scope', '## Out of scope',
                   '## Acceptance criteria', '## Verification', '## Links']) {
    assert.ok(md.includes(h), `missing section: ${h}`);
  }
  assert.ok(md.includes('- [ ] Given a registered user, when they request a reset, then they get an email'));
  assert.ok(md.includes('- Parent: EPIC-12'));
  assert.ok(md.includes('- Blocked by: #41'));
  assert.ok(md.includes('`feature` · priority: `high` · `auth` · estimate: 2 days'));
});

test('renders repro block for bugs, ordered steps', () => {
  const md = renderMarkdown(BUG);
  assert.ok(md.includes('## Reproduction'));
  assert.ok(md.includes('1. Open /login'));
  assert.ok(md.includes('2. Submit wrong password'));
  assert.ok(md.includes('- **Expected:** email kept'));
  assert.ok(md.includes('- **Actual:** email cleared'));
});

test('omits repro, links, and notes when absent', () => {
  const md = renderMarkdown(FEATURE);
  assert.ok(!md.includes('## Reproduction'));
  assert.ok(!md.includes('## Notes'));
  const noLinks = renderMarkdown({ ...FEATURE, links: undefined });
  assert.ok(!noLinks.includes('## Links'));
});

test('includeTitle=false drops the H1 (for systems that carry the title separately)', () => {
  const md = renderMarkdown(FEATURE, { includeTitle: false });
  assert.ok(!md.startsWith('#'));
  assert.ok(md.includes('## Context'));
});

test('ends with exactly one trailing newline', () => {
  const md = renderMarkdown(FEATURE);
  assert.match(md, /[^\n]\n$/);
});
