---
title: 网络检索
description: Nervefeyn 内的网络检索路由、配置与用法。
section: Tools
order: 2
---

Nervefeyn 的网络检索工具在研究工作流中从网络获取当前信息。它支持多个并发查询、域名过滤、时效过滤,以及可选的提供商可用页面文本获取。researcher 代理把网络检索与 AlphaXiv 一起使用,从博客、文档、新闻和代码仓库等非学术来源采集证据。

## 路由模式

Nervefeyn 支持三种网络检索后端。你可以配置使用哪一个,或让 Nervefeyn 自动选择:

| 模式 | 说明 |
| --- | --- |
| `auto` | 已配置时优先 Exa,然后 Perplexity,然后 Gemini API |
| `perplexity` | 所有网络检索强制使用 Perplexity Sonar |
| `exa` | 所有网络检索强制使用 Exa |
| `gemini` | 强制使用 Gemini API grounding |

## 默认行为

默认路径不读取 Chromium 或 Chrome 的 cookie,也不请求 macOS 钥匙串访问。在 `auto` 模式下,Nervefeyn 在已配置时使用基于 API 的检索提供商:先 Exa,然后 Perplexity,然后 Gemini API。

在跑 `/deepresearch` 等来源密集型工作流前,请在 `~/.nervefeyn/web-search.json` 中为 Exa、Perplexity 或 Gemini 配置显式 API 密钥。

## 配置

检查当前检索配置:

```bash
nervefeyn search status
```

编辑 `~/.nervefeyn/web-search.json` 配置后端:

```json
{
  "provider": "auto",
  "searchProvider": "auto",
  "exaApiKey": "exa_...",
  "perplexityApiKey": "pplx-...",
  "geminiApiKey": "AIza..."
}
```

把 `provider` 和 `searchProvider` 设为 `auto`、`exa`、`perplexity` 或 `gemini`。使用 `auto` 时,Nervefeyn 在存在密钥时优先 Exa,然后 Perplexity,然后 Gemini API。你也可以运行 `nervefeyn search set <provider> [api-key]` 写入该文件。

Gemini Web 浏览器 cookie 访问默认关闭。要启用该旧回退,在 `~/.nervefeyn/web-search.json` 中加入 `"geminiBrowser": true`。在 macOS 上,这可能触发来自浏览器 cookie 存储的钥匙串提示,因此推荐使用 API 密钥。

## 检索功能

网络检索工具支持若干能力,researcher 代理会自动利用:

- **多查询** —— 同时发送 2-4 个不同角度的查询,获得更宽的主题覆盖
- **域名过滤** —— 把结果限制到特定域名,如 `arxiv.org`、`github.com` 或 `nature.com`
- **时效过滤** —— 按日期筛选结果,适合只有近期工作才重要的快速演进主题
- **页面文本获取** —— 为最重要的结果取回提供商可用的页面文本,而非只依赖片段

## 何时运行

网络检索由 researcher 代理在工作流中自动使用。你无需直接调用。researcher 根据主题和来源可用性决定何时使用网络检索还是论文检索。学术主题偏向 AlphaXiv;工程与应用主题偏向网络检索。
