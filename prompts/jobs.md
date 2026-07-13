---
description: 检视可见的研究运行状态、可用的已调度研究后续,以及持久 watch 制品。
section: Project & Session
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

检视本项目的活跃研究工作。

要求:
- 仅当 `process` 工具可见且用户在询问研究运行状态时,使用 `process` 工具的 `list` action;否则记录 `Process state: BLOCKED - process tool not available`。
- 仅当调度工具可见时使用它;否则记录 `Schedule state: BLOCKED - scheduling tool not available`。
- 检视 `outputs/.plans/`、`outputs/`、`experiments/` 与 `notes/` 中的持久状态,查找 watch 基线、autoresearch 日志、复现运行与近期研究制品。
- 总结:
  - 若 process 工具可见,活跃研究运行的后台进程
  - 若调度工具可见,排队或周期性的研究 watch
  - 磁盘上找到的持久 watch/autoresearch/复现 制品
  - 需要关注的失败
  - 若用户想要日志或详细状态,下一步应运行的具体命令
- 保持简洁、可操作。
