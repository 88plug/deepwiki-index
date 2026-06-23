# deepwiki-index

**Make the "Ask DeepWiki" badge actually resolve — hands-free.** A skill that
indexes a public repo's DeepWiki autonomously (no human clicking), using the
verified trigger plus a trusted browser so the reCAPTCHA passes silently.

[![plugin-validate](https://github.com/88plug/deepwiki-index/actions/workflows/plugin-validate.yml/badge.svg)](https://github.com/88plug/deepwiki-index/actions/workflows/plugin-validate.yml)
[![License: FSL-1.1-ALv2](https://img.shields.io/badge/license-FSL--1.1--ALv2-blue?style=flat)](https://github.com/88plug/deepwiki-index/blob/main/LICENSE.md)
[![Docs](https://img.shields.io/badge/docs-online-blue?style=flat)](https://88plug.github.io/deepwiki-index)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-8A2BE2?style=flat)](https://github.com/88plug/claude-code-plugins)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/88plug/deepwiki-index)

## Install

```sh
/plugin marketplace add 88plug/claude-code-plugins
/plugin install deepwiki-index@88plug
```

## What it does

Once installed, the agent will **index a public repo's DeepWiki automatically**
after you publish it or add the badge — and when you ask it to "index the wiki."
It does not stop to ask permission.

It encodes the verified mechanics so it never has to re-research them:

- **Trigger:** `POST https://api.devin.ai/ada/index_public_repo?repo_name=<o/r>&email_to_notify=<email>&recaptcha_token=<tok>`
- **Status:** `GET https://api.devin.ai/ada/public_repo_indexing_status?repo_name=<o/r>`
- The token is **mandatory** and is **reCAPTCHA v2-invisible** — a *trusted*
  browser mints it with no challenge; datacenter/headless contexts get an image
  challenge (which the skill will not solve).

!!! note
    After the first index, DeepWiki re-crawls on its own — this is a one-time
    step per repo, not a per-commit job.

## Manual / batch use

```sh
npm i -D playwright && npx playwright install chromium
# current repo:
node scripts/index-deepwiki.mjs
# a batch (best with your real profile so the captcha is silent):
CHROME_USER_DATA_DIR="$HOME/.config/google-chrome" REPO=all node scripts/index-deepwiki.mjs
```

## Development

```sh
python3 .ci/validate_plugin.py .
bash tests/smoke.sh
```

## License

[FSL-1.1-ALv2](https://github.com/88plug/deepwiki-index/blob/main/LICENSE.md).
See the [changelog](https://github.com/88plug/deepwiki-index/blob/main/CHANGELOG.md).
