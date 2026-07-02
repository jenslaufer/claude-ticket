'use strict';
// Live-create paths of the network providers, driven by dependency-free stubs:
// - github.js talks to a fake `gh` (tests/fixtures/bin prepended to PATH, GH_STUB config)
// - gitlab.js / jira.js get a canned fetch via NODE_OPTIONS=--require fetch-stub.cjs
// No test opens a real network connection; an unmatched fetch route throws.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EMIT = path.join(__dirname, '..', 'plugins', 'ticket', 'skills', 'ticket', 'scripts', 'ticket_emit.js');
const STUB_BIN = path.join(__dirname, 'fixtures', 'bin');
const FETCH_STUB = path.join(__dirname, 'fixtures', 'fetch-stub.cjs');

const TITLE = 'Add CSV export to the report page';
const TICKET = JSON.stringify({
  title: TITLE,
  type: 'feature',
  context: 'Users copy tables by hand today.',
  scope: { in: ['Export button'], out: ['PDF export'] },
  acceptance: [{ given: 'a filtered report', when: 'export is clicked', then: 'a CSV downloads' }],
  verification: ['Manual: export once'],
  priority: 'med',
  labels: ['reports'],
});

// cwd is a temp dir, never the repo: if a stub is ever bypassed and the real gh runs,
// it has no repo context and fails instead of filing a real issue.
function run(args, env) {
  return spawnSync('node', [EMIT, ...args],
    { input: TICKET, encoding: 'utf8', cwd: os.tmpdir(), env: { ...process.env, ...env } });
}

function runGithub(ghStub, extraEnv = {}) {
  return run(['--provider', 'github'], {
    PATH: `${STUB_BIN}${path.delimiter}${process.env.PATH}`,
    GH_STUB: JSON.stringify(ghStub),
    ...extraEnv,
  });
}

function runWithFetch(provider, routes, env) {
  return run(['--provider', provider], {
    NODE_OPTIONS: `--require ${FETCH_STUB}`,
    FETCH_STUB: JSON.stringify(routes),
    ...env,
  });
}

const GITLAB_ENV = { GITLAB_TOKEN: 't0k', GITLAB_PROJECT: 'group/repo', GITLAB_BASE_URL: 'http://stub.local' };
const JIRA_ENV = { JIRA_BASE_URL: 'http://stub.local', JIRA_EMAIL: 'a@b.c', JIRA_API_TOKEN: 't0k', JIRA_PROJECT_KEY: 'ABC' };

// --- github (gh CLI stub) ---

test('github: create success returns ref parsed from the issue URL', () => {
  const r = runGithub({ list: [], createUrl: 'https://github.com/o/r/issues/42' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout),
    { provider: 'github', ref: '42', url: 'https://github.com/o/r/issues/42' });
});

test('github: dedupe hit returns the existing issue, no create', () => {
  const r = runGithub({
    list: [{ number: 7, title: TITLE, url: 'https://github.com/o/r/issues/7' }],
    failCreate: 'create must not be called',
  });
  assert.equal(r.status, 0, r.stderr);
  const res = JSON.parse(r.stdout);
  assert.equal(res.deduped, true);
  assert.equal(res.ref, '7');
  assert.match(r.stderr, /already exists/);
});

test('github: label error triggers retry without labels', () => {
  const r = runGithub({ list: [], failLabels: true, createUrl: 'https://github.com/o/r/issues/43' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /retrying without labels/);
  assert.equal(JSON.parse(r.stdout).ref, '43');
});

test('github: non-label create failure fails closed with gh stderr', () => {
  const r = runGithub({ list: [], failCreate: 'GraphQL: something exploded' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /something exploded/);
});

test('github: missing gh binary fails closed', () => {
  // A temp bin dir holding ONLY a node symlink: the emitter can spawn, gh cannot resolve.
  // (node's own dir is unusable here — on most systems it also contains the real gh.)
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-bin-'));
  fs.symlinkSync(process.execPath, path.join(bin, 'node'));
  const r = run(['--provider', 'github'], { PATH: bin });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /gh CLI not found on PATH/);
});

// --- gitlab (fetch stub) ---

test('gitlab: create success returns iid and web_url', () => {
  const r = runWithFetch('gitlab', [
    { method: 'GET', url: '/api/v4/projects/group%2Frepo/issues?', status: 200, body: [] },
    { method: 'POST', url: '/api/v4/projects/group%2Frepo/issues', status: 201,
      body: { iid: 12, web_url: 'http://stub.local/group/repo/-/issues/12' } },
  ], GITLAB_ENV);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout),
    { provider: 'gitlab', ref: '12', url: 'http://stub.local/group/repo/-/issues/12' });
});

test('gitlab: dedupe hit returns the existing issue, no create route needed', () => {
  const r = runWithFetch('gitlab', [
    { method: 'GET', url: '/issues?', status: 200,
      body: [{ iid: 5, title: TITLE, web_url: 'http://stub.local/group/repo/-/issues/5' }] },
  ], GITLAB_ENV);
  assert.equal(r.status, 0, r.stderr);
  const res = JSON.parse(r.stdout);
  assert.equal(res.deduped, true);
  assert.equal(res.ref, '5');
});

test('gitlab: HTTP error fails closed with status code', () => {
  const r = runWithFetch('gitlab', [
    { method: 'GET', url: '/issues?', status: 200, body: [] },
    { method: 'POST', url: '/issues', status: 500, body: { message: 'boom' } },
  ], GITLAB_ENV);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /gitlab create failed \(500\)/);
});

test('gitlab: success response without iid fails closed', () => {
  const r = runWithFetch('gitlab', [
    { method: 'GET', url: '/issues?', status: 200, body: [] },
    { method: 'POST', url: '/issues', status: 201, body: {} },
  ], GITLAB_ENV);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /returned no iid/);
});

// --- jira (fetch stub) ---

test('jira: create success returns key and browse URL', () => {
  const r = runWithFetch('jira', [
    { method: 'GET', url: '/rest/api/3/search', status: 200, body: { issues: [] } },
    { method: 'POST', url: '/rest/api/3/issue', status: 201, body: { key: 'ABC-9' } },
  ], JIRA_ENV);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout),
    { provider: 'jira', ref: 'ABC-9', url: 'http://stub.local/browse/ABC-9' });
});

test('jira: dedupe hit on exact summary returns the existing issue', () => {
  const r = runWithFetch('jira', [
    { method: 'GET', url: '/rest/api/3/search', status: 200,
      body: { issues: [{ key: 'ABC-3', fields: { summary: TITLE } }] } },
  ], JIRA_ENV);
  assert.equal(r.status, 0, r.stderr);
  const res = JSON.parse(r.stdout);
  assert.equal(res.deduped, true);
  assert.equal(res.ref, 'ABC-3');
});

test('jira: HTTP error fails closed with status code', () => {
  const r = runWithFetch('jira', [
    { method: 'GET', url: '/rest/api/3/search', status: 200, body: { issues: [] } },
    { method: 'POST', url: '/rest/api/3/issue', status: 400, body: { errors: {} } },
  ], JIRA_ENV);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /jira create failed \(400\)/);
});

test('jira: success response without key fails closed', () => {
  const r = runWithFetch('jira', [
    { method: 'GET', url: '/rest/api/3/search', status: 200, body: { issues: [] } },
    { method: 'POST', url: '/rest/api/3/issue', status: 201, body: {} },
  ], JIRA_ENV);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /returned no key/);
});
