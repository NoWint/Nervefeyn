---
description: 创建研究 watch 基线,当调度工具可见时可选地创建已调度的后续。
args: <topic>
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

为以下主题创建研究 watch 基线:$@

从 watch 主题派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

要求:
- 开始前,概述 watch plan:要监控什么、哪些信号重要、什么算作有意义的变更,以及请求或合理的检查频率。将 plan 写入 `outputs/.plans/<slug>.md`。向用户简要总结 plan 并立即继续。除非用户明确要求审查 plan,否则不要请求确认或等待继续响应。
- 以该主题的基线扫描开始。
- 仅当 `schedule_prompt` 工具在当前工具集中可见时,使用它创建周期性或延迟的后续。
- 若 `schedule_prompt` 不可见,不要声称已调度周期性 watch。在 plan 与基线制品中记录 `Scheduling: BLOCKED - schedule_prompt not available`,然后给出用户稍后可运行以刷新 watch 的确切命令或 prompt。
- 将恰好一个基线制品保存到 `outputs/<slug>-baseline.md`。
- 以一个 `Sources` 章节收尾,包含所用每个来源的直接 URL。
