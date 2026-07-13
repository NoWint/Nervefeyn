---
description: 查找有论文、数据集、文档与代码支撑的、可实现的、已排序的 ML 训练配方。
args: <task-or-paper>
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

为以下任务查找可实现的 ML 训练配方:$@

从任务派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

这是一次执行请求,而非解释工作流的请求。立即继续。

## 必需制品

- `outputs/.plans/<slug>-recipe.md`
- `outputs/.drafts/<slug>-recipe-research.md`
- `outputs/<slug>-recipe.md`
- `outputs/<slug>-recipe.provenance.md`

## 工作流

1. **Plan** — 将目标任务、基准或期望行为、候选来源类型、可行性约束,以及一个任务账本写入 `outputs/.plans/<slug>-recipe.md`。写入 plan 后自动继续。
2. **研究** — 当任务需要广泛的论文/代码扫描时,使用 `researcher` subagent。对于狭义任务,直接收集证据。研究必须从结果证据出发,而非仅从示例脚本出发。
3. **配方提取** — 对每个有前景的方法,将观察到的结果与产生它的确切配方关联。一个有用的条目包含:论文或报告、基准/结果、数据集、训练方法、关键超参数、算力假设、实现代码路径,以及当前文档。
4. **数据集验证** — 检查每个数据集是否可用、暴露哪些 splits/columns,以及格式是否与方法匹配。当可用时,对 Hugging Face 数据集使用 `hf_dataset_info`。若 schema 或可用性未被直接检查,标记为 `unverified`;不要暗示它可用。
5. **实现落地** — 为所选训练路径寻找可运行的代码或官方文档。对相关的 Hugging Face Hub 仓库使用 `hf_repo_files` 与 `hf_repo_read_file`。优先使用当前的官方文档与活跃维护的仓库。可用时记录确切的文件路径、函数名、类名与命令模式。
6. **综合** — 先写 `outputs/.drafts/<slug>-recipe-research.md`,然后将一份简洁的最终排序简报提升为 `outputs/<slug>-recipe.md`。
7. **验证** — 对你排在第一的任何配方,在最终交付前验证关键来源 URL 与数据集/代码可用性。若某个来源、数据集或代码路径无法检查,仅以显式的 `blocked` 或 `unverified` 标签保留在简报中。
8. **Provenance** — 写入 `outputs/<slug>-recipe.provenance.md`,包含日期、查阅的来源、接受/拒绝的来源、验证状态与制品路径。

## 必需的最终形态

最终简报必须包含:

- **Recommendation:** 首选尝试的那一个配方及其原因。
- **Ranked recipe table:** 每个候选一行,包含论文/来源、结果、数据集、方法、超参数、算力、代码/文档与验证状态。
- **Dataset notes:** schema、split、大小、许可证/访问约束(当已检查时)。
- **Implementation plan:** 运行首选配方的最少步骤。
- **Known gaps:** 缺失的代码、不可访问的数据、不清晰的超参数,或基准不匹配。
- **Sources:** 所用每篇论文、仓库、数据集与文档页面的 URL。

除非底层检查证明了它,否则不要声称某个方法是最先进的、已复现的或生产可用的。精确使用 `verified`、`unverified`、`blocked` 与 `inferred`。
