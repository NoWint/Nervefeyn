---
description: 使用论文搜索与一手来源综合,对某个主题、实验室、PI 或作者进行文献综述。
args: <topic-or-lab-or-author>
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

将以下主题、实验室、PI 或作者作为文献综述来调研:$@

从主题派生一个短 slug(小写、连字符、无填充词,≤5 个词)。本次运行的所有文件使用该 slug。

## 工作流

1. **Plan** — 概述范围:关键问题、要搜索的来源类型(论文、网络、仓库)、时间段、预期章节,以及一个小任务账本加验证日志。当输入看起来命名的是一个实验室、PI、作者、机构实验室页面或作者主页时,将综述作为发表成果语料综述来运行:先找到实验室/作者身份,收集可达的发表列表,然后在该语料上映射研究轨迹。将 plan 写入 `outputs/.plans/<slug>.md`。向用户简要总结 plan 并立即继续。除非用户明确要求审查 plan,否则不要请求确认或等待继续响应。
   - 稍后更新 plan 账本时,保持编辑小巧且合法。如果 `edit` 工具调用因 JSON 解析错误失败,或替换需要嵌入大段 markdown 块,改用文件写入工具重写完整修正后的 plan 文件,然后继续进入最终制品/provenance 验证。
2. **收集** — 当调研范围足够宽、能从委托的论文筛选中受益时,使用 `researcher` subagent。对于狭义主题,直接搜索。researcher 产出写入 `<slug>-research-*.md`。对于发表成果语料综述,lead agent 负责身份解析,并在委托轨迹综合前写入 `notes/<slug>-publications.md`,包含可达的标题、年份、会议/期刊、URL/DOI 与缺口。优先使用实验室发表页面、作者主页、arXiv/OpenReview/Semantic Scholar 页面,以及暴露稳定来源 URL 的论文搜索结果。不要静默跳过已分配的问题;将它们标记为 `done`、`blocked` 或 `superseded`。
3. **综合** — 区分共识、分歧与开放问题。对于发表成果语料综述,还要识别 3-5 条研究轨迹以及最改变语料方向的 3-5 篇论文;按对比性原创性、方法论强度以及与先前工作的关系来排序,而非仅按作者声望。有用时提出具体的后续实验或延伸阅读。仅当图表工具可见且数据有来源支撑时才生成图表;否则纳入图表规格或对比表。当结构有来源支撑且会改变读者的研究决策时,使用 Mermaid 图表示分类、方法流水线或实验室轨迹图。输出限于研究证据、来源覆盖与下一步研究决策;不要从文献综述运行中创建非研究运营制品。
4. **引用** — 生成 `verifier` agent 为草稿添加行内引用并验证每个来源 URL。
5. **验证** — 生成 `reviewer` agent 检查引用后草稿是否存在无支撑论断、逻辑漏洞、僵尸章节与单一来源的关键发现。交付前修复 FATAL 问题。在 Open Questions 中记录 MAJOR 问题。如果发现 FATAL 问题,修复后再跑一轮验证。
6. **交付** — 将最终文献综述保存到 `outputs/<slug>.md`。在其旁写入 provenance 记录 `outputs/<slug>.provenance.md`,列出:日期、查阅 vs. 接受 vs. 拒绝的来源、验证状态,以及使用的中间研究文件;对于发表成果语料综述,包含发表日志路径与未解决的语料缺口。停止前,在磁盘上验证两个文件都存在;不要仅停留在中间引用草稿。
