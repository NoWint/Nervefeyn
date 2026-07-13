---
description: 撰写持久会话日志,记录已完成的工作、发现、开放问题与下一步。
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

为当前研究工作撰写一份会话日志。

要求:
- 总结本次会话所做的工作。
- 捕获最有力的发现或决策。
- 列出开放问题、未解决的风险与具体的下一步。
- 引用写入 `notes/`、`outputs/`、`experiments/` 或 `papers/` 的任何重要制品。
- 若有任何外部论断重要,包含直接的来源 URL。
- 将日志以 markdown 保存到 `notes/`,使用以日期为导向的文件名。
