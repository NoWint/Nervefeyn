---
title: Web Search
description: Web search routing, configuration, and usage within Feynman.
section: Tools
order: 2
---

Feynman's web search tool retrieves current information from the web during research workflows. It supports multiple simultaneous queries, domain filtering, recency filtering, and optional provider-available page-text retrieval. The researcher agent uses web search alongside AlphaXiv to gather evidence from non-academic sources like blog posts, documentation, news, and code repositories.

## Routing modes

Feynman supports three web search backends. You can configure which one to use or let Feynman choose automatically:

| Mode | Description |
| --- | --- |
| `auto` | Prefer Exa when configured, then Perplexity, then Gemini API |
| `perplexity` | Force Perplexity Sonar for all web searches |
| `exa` | Force Exa for all web searches |
| `gemini` | Force Gemini API grounding |

## Default behavior

The default path does not read Chromium or Chrome cookies and does not request macOS Keychain access. In `auto` mode, Feynman uses API-backed search providers when they are configured: Exa first, then Perplexity, then Gemini API.

Configure an explicit API key for Exa, Perplexity, or Gemini in `~/.feynman/web-search.json` before running source-heavy workflows like `/deepresearch`.

## Configuration

Check the current search configuration:

```bash
feynman search status
```

Edit `~/.feynman/web-search.json` to configure the backend:

```json
{
  "provider": "auto",
  "searchProvider": "auto",
  "exaApiKey": "exa_...",
  "perplexityApiKey": "pplx-...",
  "geminiApiKey": "AIza..."
}
```

Set `provider` and `searchProvider` to `auto`, `exa`, `perplexity`, or `gemini`. When using `auto`, Feynman prefers Exa if a key is present, then Perplexity, then Gemini API. You can also run `feynman search set <provider> [api-key]` to write this file.

Gemini Web browser-cookie access is disabled by default. To opt into that legacy fallback, add `"geminiBrowser": true` to `~/.feynman/web-search.json`. On macOS, that can trigger a Keychain prompt from the browser's cookie store, so API keys are the recommended route.

## Search features

The web search tool supports several capabilities that the researcher agent leverages automatically:

- **Multiple queries** -- Send 2-4 varied-angle queries simultaneously for broader coverage of a topic
- **Domain filtering** -- Restrict results to specific domains like `arxiv.org`, `github.com`, or `nature.com`
- **Recency filtering** -- Filter results by date, useful for fast-moving topics where only recent work matters
- **Page text retrieval** -- Fetch provider-available page text for the most important results rather than relying only on snippets

## When it runs

Web search is used automatically by researcher agents during workflows. You do not need to invoke it directly. The researcher decides when to use web search versus paper search based on the topic and source availability. Academic topics lean toward AlphaXiv; engineering and applied topics lean toward web search.
