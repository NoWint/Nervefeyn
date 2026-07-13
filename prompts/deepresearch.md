---
description: 针对某个主题进行详尽、来源丰富的调查,并产出带行内引用的持久研究简报。
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

为以下主题开展深度研究:$@

这是一次执行请求,而非解释或实现工作流说明的请求。
执行工作流。不要通过描述协议来回答,不要解释这些说明,也不要重述协议。你的首批动作应当是创建目录并写入 plan 制品的工具调用。

## 必需制品

从主题派生一个短 slug:小写、连字符、无填充词,至多 5 个词。

每次运行必须在磁盘上留下这些文件:
- `outputs/.plans/<slug>.md`
- `outputs/.drafts/<slug>-draft.md`
- `outputs/.drafts/<slug>-cited.md`
- `outputs/<slug>.md` 或 `papers/<slug>.md`
- `outputs/<slug>.provenance.md` 或 `papers/<slug>.provenance.md`

在用户批准 plan 后,如果任何能力失败,以降级模式继续,仍要写入 blocked 或部分最终产出与 provenance sidecar。在 plan 批准后绝不要以仅聊天输出收尾。在 plan 批准后绝不要仅以聊天中的解释收尾。当验证无法完成时使用 `Verification: BLOCKED`。

## 第 1 步:Plan

立即创建 `outputs/.plans/<slug>.md`。plan 必须包含:
- 关键问题
- 所需证据
- 规模决策
- 任务账本
- 验证日志
- 决策日志

在 plan 中分配 owner 之前做出规模决策。如果主题是狭义的"什么是 X"式解释,plan 必须仅使用 lead 自有的直接搜索任务;不要在任务账本中分配 researcher subagent。

如果 `memory_remember` 工具可用,使用 key `deepresearch.<slug>.plan` 保存 plan。如果不可用,继续无需它。

写入 plan 后,在收集证据前停下并请求明确确认。简要总结 plan 并询问:

`是否按此深度研究 plan 继续?回复 "yes" 继续,或告诉我需要修改什么。`

在用户确认之前,不要运行搜索、抓取来源、生成 subagent、起草、引用、审查或交付最终制品。如果用户要求修改,先更新 `outputs/.plans/<slug>.md`,再次请求确认。

## 第 2 步:规模

对以下情况使用直接搜索:
- 单一事实或狭义问题,包括"什么是 X"式解释
- 你能用 3-10 次工具调用完成的工作

对于"什么是 X"式解释主题,除非用户明确要求全面覆盖、当前格局、基准测试或生产部署,否则绝对不要生成 researcher subagent。
不要将简单的解释膨胀为多 agent 调研。

仅当分解明显有帮助时使用 subagent:
- 2-3 个项目的直接对比:2 个 `researcher` subagent
- 广泛调研或多维主题:3-4 个 `researcher` subagent
- 复杂的多领域研究:4-6 个 `researcher` subagent

## 第 3 步:收集证据

仅使用当前工具集中可见的工具名称。对于网络搜索,调用 `web_search`;绝不调用 `google:search`、`google_search` 或 `search_google`。

在此工作流中避免易崩溃的 PDF 解析。不要调用 `alpha_get_paper`,也不要抓取 `.pdf` URL,除非用户明确要求 PDF 提取。优先使用论文元数据、摘要、HTML 页面、官方文档与网络片段。如果仅存在 PDF,从搜索元数据中引用 PDF URL,并将全文 PDF 解析标记为 blocked,而不是抓取它。

如果选择了直接搜索:
- 完全跳过 researcher 生成。
- 自己搜索并抓取来源。
- 在起草前使用多个搜索词/角度。直接模式研究最少 3 个不同查询,涵盖定义/历史、机制/公式,以及(相关时)当前用法/对比。
- 将使用的确切搜索词记录到 `outputs/.drafts/<slug>-research-direct.md`。
- 将笔记写入 `outputs/.drafts/<slug>-research-direct.md`。
- 继续进入综合。

如果选择了 subagent:
- 先写每 researcher 的简报,例如 `outputs/.plans/<slug>-T1.md`。
- 保持 `subagent` 工具调用 JSON 小巧且合法。
- 不要在 `subagent` JSON 中放置多段说明。
- 仅使用受支持的 `subagent` key。不要添加 `artifacts` 等额外 key,除非工具 schema 明确暴露它们。
- 始终设置 `failFast: false`。
- 不要在 subagent 任务中点名确切工具命令,除非这些工具名称在当前工具集中可见。
- 优先使用宽泛指引,如"使用论文搜索和网络搜索";如果 PDF 解析器或论文抓取失败,researcher 必须从元数据、摘要与网络来源继续,并将 PDF 解析标记为 blocked。

示例形态:

```json
{
  "tasks": [
    { "agent": "researcher", "task": "Read outputs/.plans/<slug>-T1.md and write <slug>-research-web.md.", "output": "<slug>-research-web.md" },
    { "agent": "researcher", "task": "Read outputs/.plans/<slug>-T2.md and write <slug>-research-papers.md.", "output": "<slug>-research-papers.md" }
  ],
  "concurrency": 4,
  "failFast": false
}
```

收集证据后,更新 plan 账本与验证日志。如果研究失败,确切记录失败内容,并以 blocked 或部分草稿继续。

## 第 4 步:起草

自己撰写报告。不要委托综合。

保存到 `outputs/.drafts/<slug>-draft.md`。

包含:
- 执行摘要
- 按问题/主题组织的研究发现
- 有证据支撑的注意事项与分歧
- 开放问题
- 不得编造来源、结果、图表、基准、图像、图表或表格

引用前,清扫草稿:
- 每个关键论断、数字、图表、表格或基准必须映射到一个来源 URL、研究笔记、原始制品路径或命令/脚本输出。
- 移除或降级无支撑的论断。
- 将推断标记为推断。

## 第 5 步:引用

如果选择了直接搜索/无 researcher subagent:
- 自己做引用。
- 用可用的抓取/搜索工具验证可达的 HTML/文档 URL。
- 将 `outputs/.drafts/<slug>-draft.md` 复制或改写为 `outputs/.drafts/<slug>-cited.md`,带行内引用与 Sources 章节。
- 对简单的直接搜索运行,不要生成 `verifier` subagent。

如果使用了 researcher subagent,在草稿存在后运行 `verifier` agent。此步骤是强制的,必须在任何 reviewer 运行前完成。不要在同一个并行 `subagent` 调用中同时运行 `verifier` 和 `reviewer`。

使用此形态:

```json
{
  "agent": "verifier",
  "task": "Add inline citations to outputs/.drafts/<slug>-draft.md using the research files as source material. Verify every URL. Write the complete cited brief to outputs/.drafts/<slug>-cited.md.",
  "output": "outputs/.drafts/<slug>-cited.md"
}
```

verifier 返回后,在磁盘上验证 `outputs/.drafts/<slug>-cited.md` 存在。如果 verifier 写到了别处,找到该引用文件并将其移动或复制到 `outputs/.drafts/<slug>-cited.md`。

## 第 6 步:审查

如果选择了直接搜索/无 researcher subagent:
- 自己审查引用后的草稿。
- 写入 `outputs/.drafts/<slug>-verification.md`,包含 FATAL / MAJOR / MINOR 发现以及所执行的检查。
- 交付前修复 FATAL 问题。
- 对简单的直接搜索运行,不要生成 `reviewer` subagent。

如果使用了 researcher subagent,仅在 `outputs/.drafts/<slug>-cited.md` 存在后,对其运行 `reviewer` agent。

使用此形态:

```json
{
  "agent": "reviewer",
  "task": "Verify outputs/.drafts/<slug>-cited.md. Flag unsupported claims, logical gaps, single-source critical claims, and overstated confidence. This is a verification pass, not a peer review.",
  "output": "<slug>-verification.md"
}
```

如果 reviewer 标记 FATAL 问题,交付前修复它们并再跑一轮审查。在 Open Questions 中记录 MAJOR 问题。接受 MINOR 问题。

应用 reviewer 修复时,不要发起一个包含大量替换的巨大 `edit` 工具调用。仅对 1-3 个简单修正使用小的局部 edit。对于章节重写、表格重写或超过 3 处实质性修复,读取引用草稿并将修正后的完整文件写入 `outputs/.drafts/<slug>-revised.md`。

应用 reviewer、verifier、audit 或 PI 风格修复后,在声称修复落地前运行一次显式的磁盘上验证。使用 `rg`、`grep`、`diff`、`wc`、`stat` 或定向读取,证明旧的无支撑措辞已消失且替换措辞存在。如果 `edit` 或 `write` 工具调用失败,不要将修复描述为已应用;在 plan/provenance 中记录失败,用更小的 edit 或完整修正文件重试,并再次验证。provenance 仅在此编辑后验证通过时才可声称某问题已修复。

最终候选是 `outputs/.drafts/<slug>-revised.md`(若存在);否则是 `outputs/.drafts/<slug>-cited.md`。

## 第 7 步:交付

将最终候选复制到:
- `papers/<slug>.md`(论文式草稿)
- `outputs/<slug>.md`(其他一切)

在其旁写入 provenance 作为 `<slug>.provenance.md`:

```markdown
# Provenance: [topic]

- **Date:** [date]
- **Rounds:** [number of research rounds]
- **Sources consulted:** [count and/or list]
- **Sources accepted:** [count and/or list]
- **Sources rejected:** [dead, unverifiable, or removed]
- **Verification:** [PASS / PASS WITH NOTES / BLOCKED]
- **Plan:** outputs/.plans/<slug>.md
- **Research files:** [files used]
```

回复前,在磁盘上验证所有必需制品存在。如果验证无法完成,设置 `Verification: BLOCKED` 或 `PASS WITH NOTES` 并列出缺失的检查。

回复前,还要验证 provenance 中声称的任何修复都反映在最终候选中。如果某个修复移除了某个短语、数字、来源或论断,对被移除内容运行定向 `rg`/`grep` 检查,并对修正后内容运行第二次检查。除非这些命令或读取成功,否则不要声称"所有补丁已应用"、"所有检查通过"或"已修复"。

最终回复应简洁:链接最终文件、provenance 文件以及任何 blocked 检查。
