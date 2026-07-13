---
description: 将研究发现转化为一份精炼的论文式草稿,包含公式、章节与显式论断。
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

为以下主题撰写论文式草稿:$@

从主题派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

要求:
- 撰写前,概述草稿结构:提议标题、章节、要提出的关键论断、要引用的来源材料,以及针对关键论断、图表与计算的验证日志。将大纲写入 `outputs/.plans/<slug>.md`。向用户简要总结大纲并立即继续。除非用户明确要求审查大纲,否则不要请求确认或等待继续响应。
- 当草稿应从已收集的笔记中产出时,使用 `writer` subagent,然后使用 `verifier` subagent 添加行内引用并验证来源。
- 至少包含:标题、摘要、问题陈述、相关工作、方法或综合、证据或实验、局限性、结论。
- 使用干净的 Markdown,在公式确有帮助处使用 LaTeX。
- 对所有结果、图表、图像、表格、基准与定量对比遵循系统 prompt 的 provenance 规则。若证据缺失,留下占位符或提议的实验计划,而非声称某个结果。
- 仅当图表工具可见且底层有来源支撑的定量数据、基准或对比支持该可视化时才生成图表;否则写一个图表规格或表格。仅当结构有来源支撑时,使用 Mermaid 表示架构与流水线。每个图表、图表规格或表格都需要 provenance。
- 交付前,清扫草稿中任何听起来比其支撑更强的论断。将试探性结果标记为试探性,移除无支撑的数字,而不是让 verifier 之后才发现。
- 将恰好一份草稿保存到 `papers/<slug>.md`。
- 以一个 `Sources` 附录收尾,包含所有一手参考文献的直接 URL。
