# Agents

`AGENTS.md` 是本 repo 中 agent 工作的 repo 级契约。

Pi subagent 的行为**不**在这里定义。内置 Pi subagent 的真正来源是 `.feynman/agents/*.md`,运行时会同步到 Pi agent 目录。如果需要修改 `researcher`、`reviewer`、`writer` 或 `verifier` 的行为,请编辑 `.feynman/agents/` 下对应的文件,而不是在这里重复这些 prompt。

## Pi subagents

Nervefeyn 内置四个研究 subagent:

- `researcher`
- `reviewer`
- `writer`
- `verifier`

它们定义在 `.feynman/agents/` 中,通过 Pi 的 `subagent` 工具调用。

## 这里应该写什么

让本文件聚焦于跨 agent 的 repo 约定:

- 输出位置与文件命名预期
- 长时间运行工作的 workspace 级延续性约定
- provenance 与 verification 要求
- 主 agent 与 subagent 之间的交接规则

**不要**在这里重述单个 agent 的 prompt 文本,除非存在适用于所有 agent 的 repo 级约束。

## 功能范围

Nervefeyn 必须保持简洁而有力。它是一个 AI 研究者,而不是一堆相邻的生产力工作流。

每个新功能在实现前都必须为生存而战。仅当某功能直接改进至少一项核心研究工作时,才保留或新增它:

- 发现相关论文、代码、数据集或既有工作
- 阅读、抽取并理解论文内容
- 对证据、方法、可复现性或引用结构进行排名
- 将声明与来源、代码、数据或实验进行核对
- 规划或运行复现与 research 实验
- 将研究综合为可审计的 artifact
- 当可视化会改变某个研究决策时,可视化研究结构
- 提升研究循环的速度、可观测性、provenance 或可靠性
- EEGDataScience 实验平台对接:REST connector(`eegds` tool,11 action)调用 EEGDataScience 离线分析/NeuroLink 状态/批量报告/BrainFlow 采集,结果落盘 + per-call Markdown provenance sidecar

默认拒绝相邻的产品方向。除非用户显式将其界定为某次具体活跃研究的支撑,否则 funding、proposal、sales、admin、通用写作与 project-management 工作流都不属于 Nervefeyn。

在新增 command、prompt、tool、extension、dashboard、文档页或 release-note 条目前,先说明它服务于哪项核心研究工作,以及现有最小的哪个 surface 可以承接它。如果价值不具体且不可测,就不要加。

## Pi 运行时变更

- Nervefeyn 包装 Pi。在修改 telemetry、tools、extensions、runtime package setup、model/prompt 交接或 child-process env 之前,先阅读已安装的 Pi 包版本、`node_modules/@earendil-works/pi-coding-agent/docs/` 与对应的 runtime 源码。
- 在编写本地 Pi extension 或 tool shim 之前,先在 Pi 包文档与 npm/GitHub 上搜索现有的 Pi extension 或 plugin;使用现有包、打补丁,或记录其失败原因,然后再增加 Nervefeyn 自有的实现。
- 在实际 Pi 启动路径验证之前,把父 CLI 的接线视为不完整:检查 `src/pi/launch.ts`、`scripts/prepare-runtime-workspace.mjs`、包配置 `pi.extensions`,以及启动命令传入的每个 extension 文件。
- 对于可观测性变更,验证 Pi 自身内部 session/agent/tool 生命周期覆盖,并确保 prompt、工具参数、论文文本与文件路径不进入 emitted telemetry。

## Workbench 控制面

- workbench 是 Pi 支撑的研究控制面。对于 chat、session、project 或 reference-product parity 工作,先阅读 Pi 的文档/运行时与参考 app 的实际行为再编码,然后将 UI 接到真实的 Pi/Nervefeyn session、message、streaming 或 resume 状态、文件、artifact、execution/provenance、compute、skills/MCP、memory 与 verification 状态,才能称该 surface 功能完整。
- 对于用户可见的 workbench parity 切片,完成度包含对外文档的 parity:当 `README.md`、`RELEASES.md`、`metadata/commands.mjs` 与 `website/` 文档/页面涉及被改动的 command、setup 流程、workbench 能力、connector 或 runtime 状态时,需同步更新。`CHANGELOG.md` 与 plan 文件仅作内部跟踪。

## 输出约定

- 研究输出放在 `outputs/`。
- 论文风格草稿放在 `papers/`。
- Session 日志放在 `notes/`。
- workspace 级 lab notebook 位于 `CHANGELOG.md`。
- 长时间运行工作流的 plan artifact 放在 `outputs/.plans/`。
- 中间研究 artifact 由 subagent 写入磁盘,由主 agent 读取。除非用户显式要求,否则不内联返回。
- 长时间运行的工作流应把 plan artifact 当作外化的工作记忆,而非静态大纲。在运行演进过程中,在其中维护任务状态与 verification 状态。
- 长时间运行或可恢复的工作流也应把 `CHANGELOG.md` 作为按时间排序的 lab notebook:改了什么、失败了什么、验证了什么、下一步该做什么。
- 对 trivial 的一次性任务,不要创建或更新 `CHANGELOG.md`。

## 文件命名

每个产出 artifact 的工作流都必须从主题派生一个短 **slug**(小写、连字符、无填充词、≤5 词,例如 `cloud-sandbox-pricing`)。一次运行中的所有文件都使用该 slug 作为前缀:

- Plan:`outputs/.plans/<slug>.md`
- 中间研究:`<slug>-research-web.md`、`<slug>-research-papers.md` 等
- 草稿:`outputs/.drafts/<slug>-draft.md`
- 已引用的简报:`<slug>-brief.md`
- Verification:`<slug>-verification.md`
- 最终输出:`outputs/<slug>.md` 或 `papers/<slug>.md`
- Provenance:`<slug>.provenance.md`(与最终输出同目录)

绝不使用 `research.md`、`draft.md`、`brief.md` 或 `summary.md` 这类通用名。并发运行之间不得冲突。

## Workspace changelog

- `CHANGELOG.md` 是 lab notebook,不是 release notes。
- 在恢复实质性工作前,若 `CHANGELOG.md` 已存在,先阅读它。
- 在取得有意义进展、失败尝试、重大验证结果或新 blocker 之后,追加简洁的条目。
- 每条都应识别当前活跃的 slug 或目标,并以建议的下一步结尾。
- 仅当 `verified`、`unverified`、`blocked` 或 `inferred` 标签与底层证据一致时,才使用它们诚实标注 verification 状态。

## Provenance 与 verification

- `/deepresearch` 与 `/lit` 的每个输出都必须附带 `.provenance.md` sidecar。
- Provenance sidecar 应记录来源核算与 verification 状态。
- 来源 verification 与引用清理属于 `verifier` 阶段,而不是交付后 ad hoc 编辑。
- 当工作流要求时,verification pass 应在交付前完成。
- 若工作流使用了 `verified`、`confirmed` 或 `checked` 等词,底层 artifact 应记录实际检查了什么以及如何检查。
- 对于量化或代码支撑的输出,保留支撑最终声明的原始 artifact 路径、脚本或日志。不要只依赖精修后的摘要。
- 绝不掩盖缺失的检查。当真实状态是 `blocked`、`unverified` 或 `inferred` 时,如实标注。

## 委派规则

- 主 agent 负责规划、委派、综合与交付。
- 当工作可被有意义地分解时使用 subagent;不要为 trivial 工作派生它们。
- 优先采用基于文件的交接,而非把大量中间结果倒回父上下文。
- 主 agent 负责协调任务完成。subagent 不得静默跳过分配的任务;被跳过或合并的任务必须记录在 plan artifact 中。
- 对于关键声明,综合后至少要求一次对抗性 verification pass。在交付前修复致命问题,或显式暴露它们。
