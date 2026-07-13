---
description: 将论文的论断与其公开代码库对比,识别不匹配、遗漏与可复现性风险。
args: <item>
section: Research Workflows
topLevelCli: true
---
## 工具纪律(先阅读)

工具名称是字面量。仅使用当前工具集中可见的工具。

- 使用 `web_search` 搜索;不要调用 `search_web`、`google_search`、`google:search`、`search_google` 或 `WebSearch`。
- 使用 `fetch_content` 抓取 URL;不要调用裸 `fetch`、`WebFetch`、`read_url_content`,也不要将数组作为 `url` 传入。当工具支持时,使用 `urls` 传入多个 URL。
- 当存在可见的 nervefeyn alpha 工具(如 `alpha_search`)时使用它们。如需 shell 访问,调用 `nervefeyn alpha ...`;不要调用用户全局的裸 `alpha` 二进制。
- 要向用户提问,直接写纯聊天文本并等待下一条用户消息。不要调用 `ask_user_question`、`ask_user`、`ask_followup_question` 或 `user_choice`。
- 不要将 `Task` 用作 agent 调度器。仅当存在可见的 `subagent` 工具时使用它。
- 如果工具返回 `Tool not found` 或 `Invalid URL`,不要重试同一个无效调用。映射到规范的可见工具与合法参数,或将该能力记录为 blocked。

对以下对象审计论文与代码库:$@

从审计目标派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

要求:
- 开始前,概述审计 plan:哪篇论文、哪个仓库、要检查哪些论断。将 plan 写入 `outputs/.plans/<slug>.md`。向用户简要总结 plan 并立即继续。除非用户明确要求审查 plan,否则不要请求确认或等待继续响应。
- 当审计非平凡时,使用 `researcher` subagent 收集证据,使用 `verifier` subagent 验证来源并添加行内引用。
- 将声称的方法、默认值、指标与数据处理与实际代码对比。
- 指出缺失的代码、不匹配、含糊的默认值与复现风险。
- 将恰好一个审计制品保存到 `outputs/<slug>-audit.md`。
- 以一个 `Sources` 章节收尾,包含论文与仓库 URL。
