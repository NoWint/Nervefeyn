# /ar 长线自主研究循环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/ar` slash command,实现 plan 驱动的长线自主研究循环,自动编排现有研究子命令,支持混合审批与跨会话恢复。

**Architecture:** 纯 prompt 驱动,无 TypeScript 代码变更。新建 `prompts/ar.md`(工作流 prompt)和 `skills/ar/SKILL.md`(技能描述)。复用现有四个 subagent(researcher/reviewer/verifier/writer)与 plan/provenance 基础设施。

**Tech Stack:** Pi prompt 系统(YAML frontmatter + markdown)、Pi subagent 工具、Pi skill 系统。

**Spec:** `docs/superpowers/specs/2026-07-14-ar-long-running-research-design.md`

---

## File Structure

| 文件 | 动作 | 职责 |
|------|------|------|
| `prompts/ar.md` | Create | /ar slash command 的完整工作流 prompt,包含工具纪律、循环阶段、plan 结构、恢复机制 |
| `skills/ar/SKILL.md` | Create | /ar 技能描述,声明何时激活 |
| `CHANGELOG.md` | Modify | 追加 /ar 设计与实现条目 |

不修改:`.feynman/agents/*.md`、`extensions/research-tools.ts`、`metadata/commands.mjs`、`src/`。

---

### Task 1: 创建 /ar prompt 文件

**Files:**
- Create: `prompts/ar.md`

- [ ] **Step 1: 创建 prompts/ar.md**

写入以下完整内容:

```markdown
---
description: 长线自主研究循环——自主规划子目标、自动调用研究技能、每轮审批、可跨会话恢复。
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

为以下主题启动一个长线自主研究循环:$@

这是一次执行请求,而非解释或实现工作流说明的请求。执行工作流。不要通过描述协议来回答,不要解释这些说明,也不要重述协议。

## 命令形态

- `/ar <topic>` — 启动新研究
- `/ar <slug>` — 恢复已有研究(读取 `outputs/.plans/<slug>-ar.md`)
- `/ar off` — 停止当前循环,保留数据
- `/ar status` — 查看当前循环状态

## 参数解析

从 `$@` 解析参数:
- `--approve <each|stage|critical|never>` — 审批粒度,默认 `critical`
- `--max-rounds <N>` — 硬性轮数上限,默认 `50`
- `--verify-every <K>` — 每 K 轮运行 verifier,默认 `3`
- 其余文本作为研究主题(新启动)或 slug(恢复)

## 第 0 步:启动

如果 `$@` 是 `off`,停止当前循环:将 plan 状态改为 `paused`,回复已停止。
如果 `$@` 是 `status`,读取当前 plan(若存在),回复:轮次、当前子目标、上次 reviewer 发现。
如果 `outputs/.plans/<slug>-ar.md` 已存在且 `$@` 匹配其 slug,进入恢复流程(第 8 步)。

否则,启动新研究:

1. 从主题派生 slug:小写、连字符、无填充词,≤5 词,加 `-ar` 后缀(如 `neural-codec-pricing-ar`)。
2. 立即创建 `outputs/.plans/<slug>-ar.md`,初始内容:
   - 研究主题与关键问题(3-5 个)
   - 初始子目标树(3-7 个一级子目标,标注优先级 high/medium/low)
   - 任务账本(空表)
   - 验证日志(空)
   - 决策日志(空)
   - 循环参数(approve/max-rounds/verify-every)
   - Current round: 0
3. 简要总结 plan(关键问题 + 子目标树),请求用户确认方向:

`是否按此研究 plan 继续?回复 "yes" 继续,或告诉我需要修改什么。`

在用户确认之前,不要运行搜索、抓取来源、生成 subagent 或收集证据。

## 循环参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `--approve` | `critical` | `each`=每轮暂停;`stage`=每子目标完成暂停;`critical`=仅 FATAL/漂移暂停;`never`=纯自主 |
| `--max-rounds` | `50` | 硬性轮数上限 |
| `--verify-every` | `3` | 每 K 轮运行 verifier 清理引用 |

## 循环(第 N 轮,N ≥ 1)

用户确认后,进入循环。每轮执行以下阶段:

### 阶段 A — 选子目标

读取 `outputs/.plans/<slug>-ar.md`,选当前最高优先级、未完成的叶子子目标。
- 若所有子目标完成 → 进入收敛阶段(第 7 步)
- 若无未完成子目标但用户未叫停 → 询问是否扩展新方向或结束

### 阶段 B — 派发证据收集

根据子目标性质选择派发方式:

| 证据需求 | 派发方式 | 适用场景 |
|---------|---------|---------|
| 深度调查某子问题 | `researcher` subagent,任务描述中指示运行 `/deepresearch <sub-topic>` | 需要带引用的详尽简报 |
| 文献综述某方向 | `researcher` subagent,任务描述中指示运行 `/lit <lab-or-topic>` | 追踪某实验室/主题的论文 |
| 有界实验验证假设 | `researcher` subagent,任务描述中指示运行 `/autoresearch <hypothesis>` | 子目标可量化时跑实验循环 |
| 内部批评某 artifact | `reviewer` subagent,审查已有草稿/代码 | 审查已有产出 |
| 直接证据收集 | `researcher` subagent | 上述命令过重时的轻量收集 |

通过 `subagent` 工具调用,`failFast: false`,基于文件交接。保持 `subagent` 工具调用 JSON 小巧且合法。仅使用受支持的 `subagent` key。

证据写入 `outputs/.drafts/<slug>-round-N-<type>.md`(type = deepresearch/lit/autoresearch/research/review)。

在 plan 任务账本记录:轮次、子目标、派发方式、产出文件、状态。

如果 `subagent` 工具不可用,主 agent 自己执行证据收集(降级为单 agent 模式,在 plan 中记录)。

### 阶段 C — 审查

调用 `reviewer` subagent 审查本轮证据与 plan 进展。使用此形态:

```json
{
  "agent": "reviewer",
  "task": "Review outputs/.drafts/<slug>-round-N-*.md against the plan in outputs/.plans/<slug>-ar.md. Flag unsupported claims, logical gaps, direction drift, and overstated confidence. Output FATAL/MAJOR/MINOR findings.",
  "output": "<slug>-round-N-review.md"
}
```

reviewer 输出 FATAL / MAJOR / MINOR 分级。判定:

- 无 FATAL 且 `--approve=critical` → 自动继续,MAJOR 记入 plan 的 Open Questions
- 有 FATAL 或方向漂移 → 暂停,展示 reviewer 发现 + 下一步选项,等用户决定
- `--approve=each` → 无论 reviewer 结果都暂停等用户
- `--approve=stage` → 仅当当前子目标完成时暂停
- `--approve=never` → 无论结果都继续,FATAL 记入 plan 并在下一轮优先处理

如果 `reviewer` 失败,该轮强制暂停等人工审批(降级为 `--approve=each`)。

### 阶段 D — 更新 plan

- 标记完成的子目标(在子目标树中改为 `[x]`,附注完成轮次)
- 根据 reviewer 发现新增/调整子目标(子目标树动态演进)
- 在决策日志记录本轮关键决策与方向调整
- 更新 Current round 为 N
- 每 K 轮(N % verify-every == 0)调用 `verifier` subagent 清理累积证据的引用:

```json
{
  "agent": "verifier",
  "task": "Add inline citations to outputs/.drafts/<slug>-round-N-*.md using the research files as source material. Verify every URL.",
  "output": "<slug>-round-N-cited.md"
}
```

如果 `verifier` 失败,该轮跳过引用清理,在下一轮重试,provenance 标记 `partial`。

在 `CHANGELOG.md` 追加简洁条目:轮次、子目标、关键发现、reviewer 结论、下一步。

### 阶段 E — 检查终止

- N ≥ max-rounds → 暂停,询问用户是否继续(可追加轮数)
- 用户发送 `/ar off` → 停止,进入收敛
- 否则 → 进入下一轮(N+1)

## 第 7 步:收敛

当所有子目标完成或用户叫停:

1. 调用 `writer` subagent,读取所有 `<slug>-round-*.md` 证据文件 + plan:

```json
{
  "agent": "writer",
  "task": "Read all outputs/.drafts/<slug>-round-*.md files and outputs/.plans/<slug>-ar.md. Synthesize a comprehensive research brief covering all sub-goals, key findings, open questions, and evidence. Write to outputs/.drafts/<slug>-ar-draft.md.",
  "output": "outputs/.drafts/<slug>-ar-draft.md"
}
```

2. 调用 `verifier` 添加行内引用:

```json
{
  "agent": "verifier",
  "task": "Add inline citations to outputs/.drafts/<slug>-ar-draft.md using the round files as source material. Verify every URL. Write to outputs/.drafts/<slug>-ar-cited.md.",
  "output": "outputs/.drafts/<slug>-ar-cited.md"
}
```

3. 调用 `reviewer` 做最终对抗性审查:

```json
{
  "agent": "reviewer",
  "task": "Final verification of outputs/.drafts/<slug>-ar-cited.md. Flag unsupported claims, logical gaps, single-source critical claims, and overstated confidence.",
  "output": "<slug>-ar-final-review.md"
}
```

修复 FATAL 问题后再跑一轮审查。MAJOR 记入 Open Questions。

4. 将最终候选复制到 `outputs/<slug>.md`。
5. 写入 provenance sidecar `outputs/<slug>.provenance.md`:

```markdown
# Provenance: [topic] (/ar)

- **Date:** [date]
- **Workflow:** /ar (long-running autonomous research)
- **Rounds:** [N]
- **Sub-goals completed:** [count]
- **Sub-commands dispatched:** [/deepresearch x2, /lit x1, researcher x5, ...]
- **Sources consulted:** [count]
- **Sources accepted:** [count]
- **Sources rejected:** [dead/unverifiable]
- **Verification:** [PASS / PASS WITH NOTES / BLOCKED]
- **Plan:** outputs/.plans/<slug>-ar.md
- **Round files:** [list]
- **Final review:** [FATAL count, MAJOR count, MINOR count]
```

6. 在 `CHANGELOG.md` 追加最终条目。
7. 回复前,在磁盘上验证所有必需制品存在。

## 第 8 步:恢复

`/ar <slug>` 恢复时:

1. 读取 `outputs/.plans/<slug>-ar.md`
2. 从 plan 的 Current round + 任务账本确定恢复点
3. 向用户展示:已完成轮数、当前子目标、上次 reviewer 发现
4. 询问:继续 / 调整方向 / 结束并综合
5. 用户确认后从下一轮继续

plan artifact 是唯一的恢复依据。若 plan 丢失,无法恢复,告知用户需重新启动。

## 硬性约束

- **子命令不递归调用 /ar**:/ar 派发的子命令不得再派发 /ar,避免无限递归
- **failFast: false**:所有 subagent 调用不因单个任务失败而终止整个循环
- **基于文件交接**:subagent 产出写磁盘,主 agent 读取,不倒回大量中间结果
- **不编造**:不得编造来源、结果、图表、基准、图像、图表或表格

## 降级模式

- `subagent` 工具不可用 → 主 agent 自己执行证据收集,在 plan 中记录降级
- 某轮证据收集全失败 → 记录 blocked,reviewer 标记,询问用户是否调整方向
- `verifier` 失败 → 该轮跳过引用清理,provenance 标记 `partial`
- `reviewer` 失败 → 该轮强制暂停等人工审批

## Plan artifact 格式

`outputs/.plans/<slug>-ar.md`:

```markdown
# /ar Plan: [topic]

- **Slug:** <slug>
- **Started:** [ISO date]
- **Status:** active | paused | completed | blocked
- **Parameters:** approve=critical, max-rounds=50, verify-every=3
- **Current round:** N

## 关键问题
1. ...
2. ...

## 子目标树
- [ ] G1: [子目标] (priority: high)
  - [ ] G1.1: [子任务]
  - [x] G1.2: [子任务] (completed round 3)
- [ ] G2: [子目标] (priority: medium)

## 任务账本
| Round | Sub-goal | Dispatch | Output | Status |
|-------|----------|----------|--------|--------|
| 1 | G1.1 | /deepresearch | <slug>-round-1-deepresearch.md | done |

## 验证日志
- Round 3: verifier pass — 12 citations verified, 2 dead links removed

## 决策日志
- Round 2: pivoted from G1 to G2 — G1 evidence insufficient

## Open Questions
- [Q1] (MAJOR from round 3) ...
```
```

- [ ] **Step 2: 验证文件已创建**

Run: `test -f prompts/ar.md && head -5 prompts/ar.md`
Expected: 输出 frontmatter 的前 5 行,包含 `description:` 和 `args: <topic>`

- [ ] **Step 3: Commit**

```bash
git add prompts/ar.md
git commit -m "feat: add /ar long-running autonomous research prompt

Plan-driven stage loop: auto-dispatches /deepresearch, /lit,
/autoresearch, /review per round via subagent. Reviewer self-approves
with configurable human checkpoints (--approve each|stage|critical|never).
Resumable via plan artifact."
```

---

### Task 2: 创建 /ar skill 文件

**Files:**
- Create: `skills/ar/SKILL.md`

- [ ] **Step 1: 创建 skills/ar/SKILL.md**

写入以下完整内容:

```markdown
---
name: ar
description: Long-running autonomous research loop that plans sub-goals, auto-dispatches research skills (/deepresearch, /lit, /autoresearch, /review), reviews each round, and accepts approval at configurable checkpoints. Use when the user asks for open-ended long-form research, autonomous investigation, or a "self-driving researcher" over hours to days.
---

# /ar — Long-running Autonomous Research

Run the `/ar` workflow. The slash command expands the full workflow instructions in the active session; do not try to read a relative prompt-template path from the installed skill directory.

`/ar <topic>` starts a plan-driven stage loop:
- Generates a plan artifact (`outputs/.plans/<slug>-ar.md`) with a sub-goal tree
- Each round: selects a sub-goal, dispatches evidence collection (via `researcher` subagent running `/deepresearch`, `/lit`, `/autoresearch`, or direct research), runs `reviewer` for adversarial critique, updates the plan
- Configurable approval: `--approve each|stage|critical|never` (default: `critical` — reviewer self-approves, pauses only on FATAL or direction drift)
- Resumable: `/ar <slug>` reads the plan artifact and continues from the last round
- Every K rounds (default 3), `verifier` cleans up citations
- On convergence: `writer` synthesizes final brief, `verifier` adds citations, `reviewer` does final pass, provenance sidecar written

Session files: `outputs/.plans/<slug>-ar.md`, `outputs/.drafts/<slug>-round-N-*.md`, `outputs/<slug>.md`, `outputs/<slug>.provenance.md`

Distinct from `/autoresearch` (bounded single-metric optimization loop) — `/ar` is open-ended, multi-goal, and orchestrates other research commands.
```

- [ ] **Step 2: 验证文件已创建**

Run: `test -f skills/ar/SKILL.md && head -4 skills/ar/SKILL.md`
Expected: 输出 frontmatter,包含 `name: ar` 和 `description:`

- [ ] **Step 3: Commit**

```bash
git add skills/ar/SKILL.md
git commit -m "feat: add /ar skill description

Declares when /ar activates: open-ended long-form research,
autonomous investigation, self-driving researcher over hours to days."
```

---

### Task 3: 冒烟测试与 CHANGELOG 更新

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 类型检查(确认无回归)**

Run: `npx tsc --noEmit --pretty`
Expected: 无新增错误(exit code 0)

- [ ] **Step 2: 验证 prompt 被 Pi 自动发现**

Run: `node -e "const {readPromptSpecs}=require('./metadata/commands.mjs'); const specs=readPromptSpecs('.'); const ar=specs.find(s=>s.name==='ar'); console.log(ar? 'FOUND: '+ar.description : 'NOT FOUND'); console.log('Total prompts:', specs.length)"`
Expected: `FOUND: 长线自主研究循环...` 和 `Total prompts: 14`(原 13 + 新增 /ar)

- [ ] **Step 3: 更新 CHANGELOG.md**

在 `CHANGELOG.md` 顶部(最新条目之前或之后,遵循文件现有时间顺序)追加:

```markdown
## 2026-07-14 — /ar 长线自主研究循环

**Objective:** 新增 `/ar` slash command,实现 plan 驱动的长线自主研究循环。

**Changed:**
- 新增 `prompts/ar.md` — 完整工作流 prompt(启动→循环→收敛→恢复)
- 新增 `skills/ar/SKILL.md` — 技能描述
- `/ar` 自动编排 `/deepresearch`、`/lit`、`/autoresearch`、`/review`,每轮 reviewer 审查
- 支持 `--approve each|stage|critical|never` 审批粒度
- 可跨会话恢复:plan artifact 即检查点

**Verified:** `unverified` — 待终端手动测试 `/ar <topic>` 验证循环启动

**Next:** 在真正终端测试 /ar 循环;神经/CS 数据源扩展作为独立 spec
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: log /ar long-running research command in changelog"
```

---

## Self-Review

**Spec coverage:**
- §1 动机与定位 → prompt 文件的描述与定位覆盖
- §2 架构(核心循环、组件、子命令编排)→ prompt 第 0 步 + 循环阶段 A-E 覆盖
- §3 命令接口(用法、参数)→ prompt 命令形态 + 参数解析覆盖
- §4 循环阶段详解 → prompt 循环阶段 A-E + 收敛覆盖
- §5 Plan artifact 结构 → prompt Plan artifact 格式覆盖
- §6 文件命名与输出 → prompt 中 slug 派生 + 证据文件命名覆盖
- §7 Provenance 与 verification → prompt 第 7 步 provenance sidecar 覆盖
- §8 恢复机制 → prompt 第 8 步覆盖
- §9 安全边界与降级 → prompt 硬性约束 + 降级模式覆盖
- §10 实现清单 → Task 1-3 覆盖
- §3.4 skill 文件 → Task 2 覆盖

**Placeholder scan:** 无 TBD/TODO。prompt 内容完整,包含所有阶段的具体指令和 subagent 调用 JSON 形态。

**Type consistency:** slug 命名一致(`<slug>-ar`)。文件路径模式一致(`outputs/.plans/<slug>-ar.md`、`outputs/.drafts/<slug>-round-N-*.md`)。subagent 调用形态与 deepresearch.md/autoresearch.md 一致。
