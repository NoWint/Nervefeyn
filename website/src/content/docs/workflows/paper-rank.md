---
title: PaperRank
description: 用透明的引用、图谱、方法和可复现性分数对某主题的论文排序。
section: Workflows
order: 2
---

PaperRank 是 Nervefeyn 首个证据图谱研究工作流。它通过对某主题的论文排序并展示每篇论文得分的依据,帮助你决定先读哪篇。

## 用法

```bash
nervefeyn rank "mechanistic interpretability sparse autoencoders"
nervefeyn rank "scaling laws" --limit 20 --json
nervefeyn rank "scaling laws" --limit 20 --expand-citations 2 --json
nervefeyn rank "scaling laws" --limit 20 --full-text-top 3 --json
nervefeyn rank "scaling laws" --limit 20 --critique-top 5 --json
nervefeyn rank "scaling laws" --limit 20 --preference-file preferences.json --json
nervefeyn rank "scaling laws" --limit 20 --reproduction-notes reproduction-notes.json --json
nervefeyn rank "scaling laws" --limit 20 --synthesize --json
```

## 输出

每次运行会在 `outputs/` 下写入一个主题 slug:

- `<slug>-research-run.json` —— 类型化的运行清单,记录该运行的研究作业、来源、论文、工具、产物、验证状态、约束和下一步动作
- `<slug>-paper-rank.md` —— 可读的排序简报
- `<slug>-papers.jsonl` —— 规范化的论文记录
- `<slug>-scores.jsonl` —— 分项分数、证据和匹配的来源片段
- `<slug>-score-audit.md` —— 每篇论文的分数演算、归一化贡献权重、字段角色、证据缺口和来源摘录
- `<slug>-rank-sensitivity.json` —— 在均衡、影响力偏重、方法/可复现性偏重、前沿偏重和主题偏重等加权 profile 下的排序稳定性
- `<slug>-citation-graph.json` —— 本地种子/引文邻域图谱及 PageRank 式数值
- `<slug>-graph-explorer.html` —— 交互式引文图谱浏览器,含论文角色、分数、链接和本地引文边
- `<slug>-field-map.json` —— 本地主题/概念聚类,以及 foundation、frontier、bridge、methodology-anchor、reproducibility-anchor 角色
- `<slug>-critique.md` —— 使用 `--critique-top N` 时可选的研究评审
- `<slug>-score-calibration.json`、`<slug>-calibration-template.json` 和 `<slug>-calibration-guide.md` —— 提供 `--preference-file` 时可选的校准输出
- `<slug>-reproduction-ledger.json`、`<slug>-reproduction-notes-template.json` 和 `<slug>-replication-plan.md` —— 提供 `--reproduction-notes` 时可选的复现输出
- `<slug>-synthesis-packet.json` 和 `<slug>-synthesis-prompt.md` —— 使用 `--synthesize` 时可选的模型综合交接
- `<slug>-model-synthesis.md` —— 使用 `--synthesize` 且模型调用成功时可选的生成综合,含所选模型和选择来源
- `<slug>-rank.provenance.md` —— 来源账目、公式和验证注意事项

## 分数构成

`ReadFirstScore` 是对可用分项的加权平均:

- 30% 主题相关性
- 20% 引用影响力
- 20% 在存在本地引文边时的图谱声望
- 10% 引用速度
- 10% 方法质量
- 10% 可复现性

PaperRank 使用 OpenAlex 作品元数据获取被引次数、归一化引用百分位、参考文献、摘要、URL 和开放获取状态。图谱声望基于 `referenced_works` 边计算。默认情况下,该图谱由种子结果集构建。使用 `--expand-citations N` 可在计算 PageRank 式图谱声望前,为每篇种子论文添加最多 `N` 条出站被引作品和入站引用作品。排序输出仍只对种子论文评分;扩展论文作为图谱上下文记录在 `<slug>-citation-graph.json` 中,可在 `<slug>-graph-explorer.html` 中查看。当图谱没有本地引文边时,图谱声望被标记为不可用并从分数中排除,而非猜测。

方法和可复现性是基于元数据、摘要文本、URL 以及按需富集的全文的确定性筛选信号。使用 `--full-text-top N` 可为排名最高、且有可获取访问路径的候选取回特定来源的全文,提取规范论文章节,附加章节级论文正文片段,回答清单式 rubric 条目并重新打分。原始全文不写入 `papers.jsonl`;论文记录存储富集状态、访问候选、`fullTextLength` 和章节边界,而分数证据存储匹配的片段。

当找到某个标记时,分数 JSONL 会保留一条 `span`,含来源、字段、标记、字符偏移、章节名(若有)和上下文文本。分数 JSONL 还包含 rubric 回答,如对局限、可复现性路径、实验细节、统计显著性和算力资源的 `present`、`partial`、`missing` 或 `not_evaluated`。这些片段和 rubric 回答旨在展示为何注意力被引向某篇论文,而非替代主张验证或复现工作。

图谱浏览器默认生成,以便无需手工打开每个 JSONL 文件即可检视运行。它可以搜索/筛选种子与扩展节点,点击论文、查看本地引文链接、分数摘要、字段角色、评审判断和来源 URL。它不嵌入原始全文正文。

分数审计默认生成,用于回答直接的"为什么排在这里"问题。它展示每篇论文的分项分数、归一化权重、对最终分数的贡献、字段角色、评审状态、可见来源片段证据、缺失分项和待核 rubric 检查。它是 `<slug>-scores.jsonl` 的可读伴随物。

research-run 清单默认生成,作为运行的机器可读主线。它不是又一份排序输出;它记录本次运行如何走过 Nervefeyn 的研究循环:服务了哪些作业、使用了哪些来源和工具、产出了哪些产物、哪些论文仍缺完整验证、哪些下一步动作就绪、以及适用哪些约束。插件、MCP 和领域特定执行工作应附加到该清单,而非抓取个别报告文件。

rank-sensitivity 产物默认生成,展示排序顺序对所选权重的依赖程度。它在备选加权 profile 下重跑相同的分项信号,并记录每篇论文在各 profile 下的排名、分数范围、排名范围和稳定性标签。把稳定论文视为对这些受测假设稳健,把易变论文视为在把顺序视为决定性之前需要更细致的人工检查。

校准保持显式但不成为默认杂项。未提供 `--preference-file` 时,排序简报和溯源记录默认权重是一个透明的产品假设,而非拟合偏好。提供填好的偏好文件后,PaperRank 写出校准产物,接受 `rankedPaperIds` 和成对 `preferences`,评估偏好论文是否排在对比论文之前,并报告默认/profile 一致率。论文 ID 不在当前运行中的偏好被计为忽略,而非静默丢弃。

字段映射默认生成,展示运行的本地结构。它按 OpenAlex 主题和概念对种子与引文邻域论文聚类,然后为排序的种子论文分配 foundation、frontier、bridge、methodology anchor 和 reproducibility anchor 等角色。这些角色来自分数信号、本地引文度、图谱声望、时效性以及可见的方法/可复现性证据。它们是本地研究导航标签,而非领域的全局分类。

复现证据与排序分离。未提供 `--reproduction-notes` 时,PaperRank 在排序简报和溯源中记录未提供已完成的复现笔记。提供填好的笔记文件后,PaperRank 写出复现账本、笔记模板和复现计划。它接受笔记状态 `reproduced`、`partially_reproduced`、`failed` 和 `not_runnable`,以及中心主张、结果、指标、期望值、观测值、差异、代码/数据/环境提示、命令和检查日期。论文 ID 不在排序种子集中的笔记被计为忽略。账本记录外部提供的复现笔记;它不执行实验,也不嵌入原始全文。

使用 `--critique-top N` 可为排名最高的论文生成研究评审的优势、关切和后续问题。评审是确定性的,基于 PaperRank 证据:分项分数、警告、来源片段和章节感知的 rubric 回答。它是决定下一步验证什么的分诊辅助,而非外部评审决定。

使用 `--synthesize` 可生成有界的模型综合交接。该 packet 含排名、分项分数解释、字段角色、评审摘要、rubric 缺口、来源片段摘录和来源引用,但省略原始全文正文。使用 `--synthesis-top N` 选择多少排序论文进入该 packet。Nervefeyn 随后请推荐的可用非 Pro 研究模型基于该 packet 写出 `<slug>-model-synthesis.md`。传 `--synthesis-model provider/model` 或 `--model provider/model` 可为该运行选择其他非 Pro 模型。CLI 输出、生成综合、JSON 摘要和溯源会记录实际使用的模型,以及它来自推荐路径还是显式覆盖。生成综合对"先读什么"叙事和下一步动作有用,但确定性 packet、分数、字段映射和溯源仍是审计轨迹。

## 科学依据

PaperRank 把文献计量影响力与论文质量分开。引用网络影响力基于 PageRank 式文献计量(如 Eigenfactor)。引用扩展遵循 OpenAlex 引用字段和筛选:`referenced_works` 给出出站引用,而 `cites:<work>` 找到入站引用作品。字段映射聚类使用所获取论文的 OpenAlex 主题和概念。引用速度单独计算,因为终身被引数偏向旧论文。方法、可复现性、评审问题、排序敏感性、分数校准、已完成复现证据、字段角色和模型综合都与引用热度分开,因为 ML 论文清单关注实验细节、透明度、数据/代码访问、局限、统计显著性和算力资源。
