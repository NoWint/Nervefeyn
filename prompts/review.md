---
description: 进行一次内部研究批评,给出可能的反对意见、严重程度与具体修订计划。
args: <artifact>
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

审查此 AI 研究制品:$@

从制品名派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

这是一次执行请求,而非解释或实现工作流说明的请求。用工具与持久文件执行工作流。不要通过描述协议、说明你会做什么,或在 plan 后停下作答。

不要请求确认。向用户简要总结 plan 并立即继续,除非用户明确要求先审查 plan。

必需制品:
- Plan: `outputs/.plans/<slug>-review-plan.md`
- 证据笔记: `outputs/.drafts/<slug>-review-evidence.md`
- 最终审查: `outputs/<slug>-review.md`

工作流:
1. 创建 `outputs/.plans`、`outputs/.drafts` 与 `outputs`。
2. 将以下内容写入 `outputs/.plans/<slug>-review-plan.md`:
   - 制品标识符与来源类型(arXiv ID、URL、本地文件、PDF、Markdown 等)
   - 审查标准:新颖性、实证严谨性、基线、可复现性、论断有效性、图表、指标、相关工作、写作质量
   - 针对论断、图表、报告指标、数据/代码可用性与链接制品所需的验证检查
3. 立即继续。不要在规划后结束。
4. 检视制品:
   - 对于本地文件,直接读取或解析文件。
   - 对于 PDF,使用可用的 PDF/文档解析工具。若 PDF 解析失败,使用任何可用的回退提取,记录失败,仍产出 blocked 或部分审查制品。
   - 对于 arXiv ID 或 URL,直接抓取论文/来源并记录 URL。
   - 当链接的代码、数据集、补充材料或引用可达且实质影响审查时,检视它们。
5. 在写最终审查前,将证据笔记写入 `outputs/.drafts/<slug>-review-evidence.md`。包含引用/转述的论断、观察到的方法、报告的指标、基线对比、可复现性事实,以及每个检视过的来源路径或 URL。
6. 仅当 `subagent` 工具可用且制品足够大、能从委托中受益时,使用 `researcher` 与 `reviewer` subagent。若 subagent 不可用、失败或只会增加开销,直接做 lead 自有的审查。绝不要仅说某个 subagent 已生成;要么调用工具,要么自己继续。
7. 将恰好一份最终审查制品写入 `outputs/<slug>-review.md`,包含:
   - Summary Assessment
   - Strengths
   - Critical Issues
   - Major Issues
   - Minor Issues
   - Reproducibility and Verification
   - Inline Annotations(尽可能绑定到章节、论断、图表或表格)
   - Recommendation
   - Sources
8. 若制品无法解析或关键证据不可用,仍写入 `outputs/<slug>-review.md`。将受影响章节标记 `Verification: BLOCKED`,确切解释失败内容,并区分 blocked 检查与论文本身的实际弱点。
9. 回复前,在磁盘上验证 `outputs/<slug>-review.md` 存在。若不存在,立即作为一份 blocked 审查制品创建它并附失败原因。

绝不要以仅规划的聊天收尾。绝不要询问下一步做什么。除非 `outputs/<slug>-review.md` 存在,否则绝不要声称审查已完成。
