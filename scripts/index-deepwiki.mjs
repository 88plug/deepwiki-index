#!/usr/bin/env node
/**
 * index-deepwiki.mjs — hands-free DeepWiki indexing for public GitHub repos.
 *
 * Verified mechanics:
 *   - Trigger: POST https://api.devin.ai/ada/index_public_repo
 *               ?repo_name=<o/r>&email_to_notify=<email>&recaptcha_token=<tok>
 *   - Status:  GET  https://api.devin.ai/ada/public_repo_indexing_status?repo_name=<o/r>
 *   - recaptcha_token is MANDATORY (no token => HTTP 400). It is reCAPTCHA v2
 *     INVISIBLE (site key below): a TRUSTED browser mints it with no challenge;
 *     datacenter/headless gets an image challenge, which this does NOT solve.
 *     => run on your machine, ideally with your real Chrome profile.
 *
 * Usage:
 *   node scripts/index-deepwiki.mjs                 # current git repo (origin)
 *   REPO=owner/name node scripts/index-deepwiki.mjs
 *   REPO=a/b,c/d node scripts/index-deepwiki.mjs
 *   REPO=all node scripts/index-deepwiki.mjs        # the 88plug marketplace set
 *   CHROME_USER_DATA_DIR="$HOME/.config/google-chrome" REPO=all node ...   # best
 *
 * Requires Playwright: npm i -D playwright && npx playwright install chromium
 */
import { execSync } from 'node:child_process';

const API = 'https://api.devin.ai';
const SITEKEY = '6LeK1G0rAAAAAGVDKn-92dkphJzZvEobSLCyZJg4';
const ALL = [
  'claude-code-plugins', 'searxng-mcp', 'total-recall', 'amnesia', 'deepwiki',
  'scientific-method', 'drive-remote-terminal', 'project-prospector', 'screen-mcp',
  'recover-from-false-positive', 'caveman-plus', 'use-latest-version-mcp', 'deepwiki-index',
].map((r) => `88plug/${r}`);

function currentRepo() {
  try {
    const u = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const m = u.match(/github\.com[:/]+([^/]+\/[^/.]+?)(?:\.git)?$/i);
    return m ? m[1] : null;
  } catch { return null; }
}

const arg = (process.env.REPO || '').trim();
const REPOS = arg.toLowerCase() === 'all' ? ALL
  : arg ? arg.split(',').map((s) => s.trim()).filter(Boolean)
  : [currentRepo()].filter(Boolean);
const EMAIL = process.env.EMAIL || 'notify@example.com';
const HEADLESS = process.env.HEADLESS === '1';
const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || '';
const PER_REPO_TIMEOUT_MS = parseInt(process.env.INDEX_TIMEOUT_MS || '720000', 10);
const DONE = new Set(['indexed', 'completed', 'complete', 'ready', 'success', 'done']);
const log = (...a) => console.log('[deepwiki]', ...a);

if (!REPOS.length) { console.error('No repo. Set REPO=owner/name (or run inside a git repo, or REPO=all).'); process.exit(2); }

async function statusOf(repo) {
  try {
    const r = await fetch(`${API}/ada/public_repo_indexing_status?repo_name=${encodeURIComponent(repo)}`, { headers: { accept: 'application/json' } });
    if (!r.ok) return `http_${r.status}`;
    return ((await r.json())?.status) || 'unknown';
  } catch (e) { return `error:${e.message}`; }
}

async function getToken(page) {
  return page.evaluate(({ sitekey, timeoutMs }) => new Promise((resolve) => {
    const done = (v) => resolve(v || null);
    const t = setTimeout(() => done(null), timeoutMs);
    const run = () => { try {
      const d = document.createElement('div'); d.style.display = 'none'; document.body.appendChild(d);
      const id = window.grecaptcha.render(d, { sitekey, size: 'invisible',
        callback: (tok) => { clearTimeout(t); done(tok); }, 'error-callback': () => { clearTimeout(t); done(null); } });
      window.grecaptcha.execute(id);
    } catch { clearTimeout(t); done(null); } };
    if (window.grecaptcha && window.grecaptcha.render) { window.grecaptcha.ready ? window.grecaptcha.ready(run) : run(); } else done(null);
  }), { sitekey: SITEKEY, timeoutMs: 25000 });
}

async function triggerOne(page, repo) {
  let s = await statusOf(repo);
  if (DONE.has(String(s).toLowerCase())) { log(`${repo}: already indexed`); return true; }
  log(`${repo}: loading deepwiki + minting invisible token…`);
  await page.goto(`https://deepwiki.com/${repo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const token = await getToken(page);
  if (token) {
    const res = await page.evaluate(async ({ api, repo, email, token }) => {
      const u = `${api}/ada/index_public_repo?repo_name=${encodeURIComponent(repo)}&email_to_notify=${encodeURIComponent(email)}&recaptcha_token=${encodeURIComponent(token)}`;
      const r = await fetch(u, { method: 'POST' }); return { status: r.status, body: await r.text().catch(() => '') };
    }, { api: API, repo, email: EMAIL, token });
    log(`${repo}: index_public_repo -> HTTP ${res.status} ${res.body.slice(0, 120)}`);
  } else {
    log(`${repo}: no silent token (untrusted/headless context). Falling back to the form…`);
    const email = page.getByRole('textbox', { name: /email/i });
    if (await email.count()) await email.fill(EMAIL).catch(() => {});
    const btn = page.getByRole('button', { name: /index repository/i });
    if (await btn.count()) await btn.click().catch(() => {});
  }
  const deadline = Date.now() + PER_REPO_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    s = await statusOf(repo); log(`${repo}: status=${s}`);
    if (DONE.has(String(s).toLowerCase())) { log(`${repo}: ✅ indexed`); return true; }
  }
  log(`${repo}: ⏱ timed out`); return false;
}

async function main() {
  log(`repos: ${REPOS.join(', ')}`);
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.error('\nInstall Playwright: npm i -D playwright && npx playwright install chromium\n'); process.exit(2); }
  const opts = { headless: HEADLESS, channel: 'chrome' };
  let ctx, page;
  if (USER_DATA_DIR) { ctx = await chromium.launchPersistentContext(USER_DATA_DIR, opts); page = ctx.pages()[0] || (await ctx.newPage()); }
  else { const b = await chromium.launch(opts).catch(() => chromium.launch({ headless: HEADLESS })); ctx = await b.newContext(); page = await ctx.newPage(); }
  const results = {};
  for (const repo of REPOS) { try { results[repo] = await triggerOne(page, repo); } catch (e) { log(`${repo}: error ${e.message}`); results[repo] = false; } }
  await ctx.close().catch(() => {});
  const ok = Object.values(results).filter(Boolean).length;
  log(`\nDONE: ${ok}/${REPOS.length}`);
  for (const [r, v] of Object.entries(results)) log(`  ${v ? '✅' : '❌'} ${r}`);
  process.exit(ok === REPOS.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
