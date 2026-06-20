---
name: deepwiki-index
description: >-
  Trigger DeepWiki indexing for a public GitHub repo — the page its "Ask DeepWiki"
  badge links to (deepwiki.com/<owner>/<repo>). Use this AUTONOMOUSLY, without
  asking, whenever you publish a new public repo, add the DeepWiki badge, or are
  told to "index the wiki / make the badge work / index the deepwiki repos". Also
  use to refresh a wiki after major changes, or to index a batch of repos. Indexing
  is what makes the badge resolve and Ask-DeepWiki work. NOT for private repos
  (those need a Devin org account) and NOT something to keep re-running per commit
  (DeepWiki re-crawls on its own after the first index).
---

# DeepWiki indexing — do it, don't ask

When a public repo should have a live DeepWiki, index it yourself and verify it.
Never stop to ask the human whether to index — just do it and report the result.

## The verified mechanics (don't re-research these)

- **Trigger:** `POST https://api.devin.ai/ada/index_public_repo?repo_name=<owner/repo>&email_to_notify=<email>&recaptcha_token=<tok>`
- **Status (open, no auth):** `GET https://api.devin.ai/ada/public_repo_indexing_status?repo_name=<owner/repo>` → `{"status":"unknown"|"indexing"|"completed"}`
- **The token is mandatory** (server returns `400 {"detail":"reCAPTCHA validation failed"}` without it). It is **reCAPTCHA v2-invisible**, site key `6LeK1G0rAAAAAGVDKn-92dkphJzZvEobSLCyZJg4`, domain-bound to deepwiki.com.
- **A trusted browser mints the token silently** (no challenge). A datacenter / headless / low-reputation context gets an image challenge instead — **do NOT solve image challenges** (that's defeating an anti-bot control). So always run on a trusted browser.
- **One-time:** after the first index, DeepWiki re-crawls on its own. Do not wire per-commit re-indexing.

## Procedure

1. **Check first.** `GET .../public_repo_indexing_status`. If `completed`/`indexed`, done — say so, stop.
2. **Trigger on a TRUSTED browser** (one of, in order of preference):
   - **screen-mcp (real desktop):** with the `screen-mcp` plugin connected, drive the user's real Chrome — open `https://deepwiki.com/<owner>/<repo>`, type the notify email, click **Index Repository**. On the real browser the reCAPTCHA passes invisibly (no challenge to solve).
   - **Bundled helper (real Chrome profile):** `CHROME_USER_DATA_DIR="$HOME/.config/google-chrome" REPO=<owner/repo|all> node ${CLAUDE_PLUGIN_ROOT}/scripts/index-deepwiki.mjs` — it mints the invisible token in-page and POSTs the trigger directly. `REPO=all` does the whole 88plug marketplace.
3. **Verify.** Poll the status endpoint until `completed` (2–10 min). Only report success when the API says so — never claim "indexed" from a button click alone.

## Honesty / limits

- It **cannot** be done from CI or a datacenter/headless context (reCAPTCHA always challenges there) and must not be forced with a captcha-solving service.
- If no trusted browser is available (screen-mcp down, no local Chrome), say exactly that and hand the user the one command — don't pretend it indexed.
