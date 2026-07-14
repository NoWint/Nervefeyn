# /ar — 长线自主研究循环

**Date:** 2026-07-14
**Status:** Design — awaiting user review
**Scope:** 新增 `/ar` slash command + 对应 skill。神经/CS 数据源扩展不在本 spec 范围,后续独立 brainstorm。

## 1. 动机与定位

### 1.1 问题

现有研究命令各有定位但都是**单次执行**或**有界循环**:

| 命令 | 定位 | 局限 |
|------|------|------|
| `/deepresearch` | 深度调查,产出带引用的简报 | 单次,不迭代 |
| `/lit` | 文献综述 | 单次,不追踪进展 |
| `/autoresearch` | **有界**实验循环,优化单一 metric | bounded,需预设收敛判据,不适 open-ended 探索 |
| `/review` | 内部研究批评 | 单次,不驱动循环 |

用户需要一种**长线、open-ended、自主驱动**的研究模式:给定宽泛研究主题后,agent 自主规划子目标、收集证据、审查、迭代,期间自动调用上述子命令,并在关键节点接受审批。类似"自主博士生日记"。

### 1.2 /ar 的定位

`/ar <topic>` 启动一个 **plan 驱动的阶段循环**:

- **Open-ended**:不预设收敛判据,子目标树动态演进
- **自主编排**:每轮根据证据需求自动派发 `/deepresearch`、`/lit`、`/autoresearch`、`/review` 或直接 `researcher` subagent
- **混合审批**:默认 `reviewer` subagent 每轮自批,仅在 FATAL 问题或方向漂移时暂停问人;启动参数 `--approve` 可调粒度
- **可暂停恢复**:plan artifact 即检查点,中断后 `/ar <slug>` 恢复

### 1.3 与 /autoresearch 的区别

| 维度 | /autoresearch | /ar |
|------|---------------|-----|
| 目标 | 优化单一可量化 metric | 探索宽泛研究主题 |
| 收敛 | 预设收敛判据或 maxIterations | 无预设收敛,用户或子目标收敛时停止 |
| 循环驱动 | 编辑→基准→对比→保留/回滚 | 选子目标→收集证据→审查→更新 plan |
| 子命令编排 | 不调用其他研究命令 | 每轮可派发 /deepresearch、/lit 等 |
| 审批 | 启动前确认一次 | 每轮 reviewer 自批 + 关键点人工 |
| 典型时长 | 分钟到小时 | 小时到天(可跨会话恢复) |

## 2. 架构

### 2.1 核心循环

```
/ar <topic>
  → 生成 slug + 初始 plan(outputs/.plans/<slug>-ar.md)
  → [用户确认方向]
  → 循环 {
      1. 选当前最高优先级未完成子目标
      2. 判断所需证据类型 → 派发子命令或 researcher subagent
      3. 收集证据到 <slug>-round-N-*.md
      4. reviewer subagent 审查本轮(对抗性 critique)
         - 无 FATAL → 更新 plan → 继续
         - FATAL 或方向漂移 → 暂停,展示给用户审批
      5. 每 K 轮(K 默认 3)verifier subagent 清理 citation
    }
  → 用户停止或所有子目标收敛 → writer subagent 综合最终简报 + provenance
```

### 2.2 组件

| 组件 | 职责 | 复用 |
|------|------|------|
| 主 agent | 规划、编排、综合、交付 | 复用 deepresearch 的主 agent 模式 |
| Plan artifact | 外化工作记忆,记录子目标树+任务账本+验证日志+决策日志 | 复用 outputs/.plans/ 约定 |
| Researcher subagent | 每轮证据收集 | 复用 .feynman/agents/researcher.md |
| Reviewer subagent | 每轮对抗性审查,决定继续/暂停 | 复用 .feynman/agents/reviewer.md |
| Verifier subagent | 每 K 轮引用清理 | 复用 .feynman/agents/verifier.md |
| Writer subagent | 最终综合简报 | 复用 .feynman/agents/writer.md |
| Lab notebook | CHANGELOG.md 每轮追加 | 复用现有 lab notebook 约定 |

### 2.3 子命令编排

主 agent 在第 2 步根据证据需求选择派发方式:

| 证据需求 | 派发方式 | 适用场景 |
|---------|---------|---------|
| 深度调查某子问题 | `/deepresearch <sub-topic>` | 需要带引用的详尽简报 |
| 文献综述某方向 | `/lit <lab-or-topic>` | 追踪某实验室/主题的论文 |
| 有界实验验证假设 | `/autoresearch <hypothesis>` | 子目标可量化时跑实验循环 |
| 内部批评某 artifact | `/review <artifact>` | 审查已有草稿/代码 |
| 直接证据收集 | `researcher` subagent | 上述命令过重时的轻量收集 |

**编排原则:** 主 agent 不内联执行子命令的工作流,而是通过 `subagent` 工具以文件交接方式调用。子命令产出的 artifact 路径记录在 plan 的任务账本中。

## 3. 命令接口

### 3.1 prompt 文件

`prompts/ar.md`,frontmatter:

```yaml
---
description: 长线自主研究循环——自主规划子目标、自动调用研究技能、每轮审批、可跨会话恢复。
args: <topic>
section: Research Workflows
topLevelCli: true
---
```

### 3.2 用法

```
/ar <topic>                  # 启动新研究
/ar <slug>                   # 恢复已有研究
/ar <slug> --approve each    # 恢复并切换审批粒度
/ar off                      # 停止当前循环,保留数据
/ar status                   # 查看当前循环状态
```

### 3.3 启动参数

| 参数 | 默认 | 值 | 说明 |
|------|------|----|------|
| `--approve` | `critical` | `each`/`stage`/`critical`/`never` | 审批粒度 |
| `--max-rounds` | `50` | 正整数 | 硬性轮数上限,防止无限循环 |
| `--verify-every` | `3` | 正整数 | 每 K 轮运行 verifier |

**审批粒度含义:**
- `each` — 每轮后暂停等用户批准
- `stage` — 每个子目标完成后暂停
- `critical` — 仅 FATAL 问题或方向漂移时暂停(reviewer 自批其余)
- `never` — 完全自主,仅完成/阻塞/达到 max-rounds 时汇报

### 3.4 skill 文件

`skills/ar/SKILL.md`:

```yaml
---
name: ar
description: Long-running autonomous research loop that plans sub-goals, auto-dispatches research skills (/deepresearch, /lit, /autoresearch, /review), reviews each round, and accepts approval at configurable checkpoints. Use when the user asks for open-ended long-form research, autonomous investigation, or a "self-driving researcher" over hours to days.
---
```

## 4. 循环阶段详解

### 4.1 启动(第 0 轮)

1. 从主题派生 slug(小写、连字符、≤5 词,加 `-ar` 后缀避免与 deepresearch 冲突)
2. 创建 `outputs/.plans/<slug>-ar.md`,初始内容:
   - 研究主题与关键问题
   - 初始子目标树(3-7 个一级子目标)
   - 任务账本(空)
   - 验证日志(空)
   - 决策日志(空)
   - 循环参数(approve/max-rounds/verify-every)
3. 简要总结 plan,请求用户确认方向
4. 用户确认后进入循环

### 4.2 每轮(第 N 轮,N ≥ 1)

**阶段 A — 选子目标:**
- 读取 plan,选当前最高优先级、未完成的叶子子目标
- 若所有子目标完成 → 进入收敛阶段(4.3)
- 若无未完成子目标但用户未叫停 → 询问是否扩展新方向或结束

**阶段 B — 派发证据收集:**
- 根据子目标性质选择派发方式(见 2.3 表)
- 通过 `subagent` 工具调用,`failFast: false`,基于文件交接
- 证据写入 `outputs/.drafts/<slug>-round-N-<type>.md`
- 在 plan 任务账本记录:轮次、子目标、派发方式、产出文件、状态

**阶段 C — 审查:**
- 调用 `reviewer` subagent 审查本轮证据与 plan 进展
- reviewer 输出 FATAL / MAJOR / MINOR 分级
- 判定:
  - 无 FATAL 且 `--approve=critical` → 自动继续,MAJOR 记入 Open Questions
  - 有 FATAL 或方向漂移 → 暂停,展示 reviewer 发现 + 下一步选项,等用户决定
  - `--approve=each` → 无论 reviewer 结果都暂停等用户
  - `--approve=stage` → 仅当当前子目标完成时暂停

**阶段 D — 更新 plan:**
- 标记完成的子目标
- 根据 reviewer 发现新增/调整子目标(子目标树动态演进)
- 在决策日志记录本轮关键决策与方向调整
- 每 K 轮(N % verify-every == 0)调用 `verifier` 清理累积证据的引用

**阶段 E — 检查终止:**
- N ≥ max-rounds → 暂停,询问用户是否继续(可追加轮数)
- 用户发送 `/ar off` → 停止
- 否则 → 进入下一轮

### 4.3 收敛

当所有子目标完成或用户叫停:

1. 调用 `writer` subagent,读取所有 `<slug>-round-*.md` 证据文件 + plan
2. writer 综合为最终简报,写入 `outputs/.drafts/<slug>-ar-draft.md`
3. 调用 `verifier` 添加行内引用 → `outputs/.drafts/<slug>-ar-cited.md`
4. 调用 `reviewer` 做最终对抗性审查
5. 交付到 `outputs/<slug>.md` + `<slug>.provenance.md`
6. 在 CHANGELOG.md 追加最终条目

## 5. Plan artifact 结构

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
| 2 | G1.2 | researcher | <slug>-round-2-research.md | done |

## 验证日志
- Round 3: verifier pass — 12 citations verified, 2 dead links removed
- Round 5: reviewer FATAL — unsupported claim in section 3, fixed

## 决策日志
- Round 2: pivoted from G1 to G2 — G1 evidence insufficient, G2 more tractable
- Round 4: expanded G3 — new sub-question emerged from round 3 findings

## Open Questions
- [Q1] (MAJOR from round 3) ...
```

## 6. 文件命名与输出

| 文件 | 路径 | 说明 |
|------|------|------|
| Plan | `outputs/.plans/<slug>-ar.md` | 外化工作记忆,跨会话恢复 |
| 每轮证据 | `outputs/.drafts/<slug>-round-N-<type>.md` | type = deepresearch/lit/autoresearch/research/review |
| 引用后证据 | `outputs/.drafts/<slug>-round-N-cited.md` | verifier 产出 |
| 最终草稿 | `outputs/.drafts/<slug>-ar-draft.md` | writer 产出 |
| 最终引用稿 | `outputs/.drafts/<slug>-ar-cited.md` | verifier 产出 |
| 最终输出 | `outputs/<slug>.md` | 交付 |
| Provenance | `outputs/<slug>.provenance.md` | 来源核算与验证状态 |

slug 加 `-ar` 后缀避免与 `/deepresearch` 同主题冲突。

## 7. Provenance 与 verification

### 7.1 Provenance sidecar

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

### 7.2 Verification 状态

遵循 `src/research/contracts.ts` 的 `VerificationState` 枚举:`not_checked` / `inferred` / `partial` / `verified` / `blocked` / `failed`。

provenance 中的 `Verification` 字段映射:
- 所有 citation 经 verifier 验证 + reviewer 无 FATAL → `PASS`
- 有 MAJOR 未解决 → `PASS WITH NOTES`
- verifier 无法完成或 reviewer FATAL 未修复 → `BLOCKED`

## 8. 恢复机制

`/ar <slug>` 恢复时:

1. 读取 `outputs/.plans/<slug>-ar.md`
2. 从 plan 的 `Current round` + 任务账本确定恢复点
3. 向用户展示:已完成轮数、当前子目标、上次 reviewer 发现
4. 询问:继续 / 调整方向 / 结束并综合
5. 用户确认后从下一轮继续

plan artifact 是唯一的恢复依据。若 plan 丢失,无法恢复,需重新启动。

## 9. 安全边界与降级

### 9.1 硬性约束

- **max-rounds 上限**:默认 50,防止无限循环消耗资源
- **子命令不递归调用 /ar**:/ar 派发的子命令不得再派发 /ar,避免无限递归
- **failFast: false**:所有 subagent 调用不因单个任务失败而终止整个循环
- **基于文件交接**:subagent 产出写磁盘,主 agent 读取,不倒回大量中间结果

### 9.2 降级模式

- **subagent 工具不可用** → 主 agent 自己执行证据收集(降级为单 agent 模式,记录在 plan)
- **某轮证据收集全失败** → 记录 blocked,reviewer 标记,询问用户是否调整方向
- **verifier 失败** → 该轮跳过引用清理,在下一轮重试,provenance 标记 `partial`
- **reviewer 失败** → 该轮强制暂停等人工审批(降级为 `--approve=each`)

### 9.3 AGENTS.md 功能范围合规

`/ar` 直接服务以下核心研究工作:
- 发现相关论文、代码、数据集或既有工作(通过派发 researcher/deepresearch)
- 阅读、抽取并理解论文内容(通过派发 lit/researcher)
- 对证据、方法、可复现性或引用结构进行排名(通过 reviewer)
- 将声明与来源核对(通过 verifier)
- 将研究综合为可审计的 artifact(writer 综合 + provenance)
- 提升研究循环的速度、可观测性、provenance 或可靠性(整个 /ar 循环)

## 10. 实现清单

### 10.1 新增文件

| 文件 | 内容 |
|------|------|
| `prompts/ar.md` | /ar slash command 的完整工作流 prompt |
| `skills/ar/SKILL.md` | /ar 技能描述 |

### 10.2 修改文件

| 文件 | 修改 |
|------|------|
| `CHANGELOG.md` | 追加 /ar 设计与实现条目 |

### 10.3 不修改

- `.feynman/agents/*.md` — 四个 subagent 复用现有定义,不修改
- `extensions/research-tools.ts` — /ar 是 prompt 命令,不需要 extension 注册
- `metadata/commands.mjs` — `readPromptSpecs()` 自动扫描 `prompts/` 目录,无需手动注册
- `src/` — 无 TypeScript 代码变更,/ar 纯 prompt 驱动

### 10.4 测试

- 类型检查:`npx tsc --noEmit`(应无新增错误)
- 冒烟测试:`npx tsx src/index.ts --help` 确认 /ar 出现在命令列表
- 手动测试:在真正终端运行 `/ar <topic>` 验证循环启动、plan 生成、用户确认、第一轮执行

## 11. 开放问题

- [Q1] /ar 是否需要 workbench web 界面可视化循环状态?暂不在本 spec 范围,后续视使用体验决定。
- [Q2] 是否需要 `/ar pause` / `/ar resume` 显式命令?当前设计用 `/ar <slug>` 恢复 + `/ar off` 停止,可能足够。
- [Q3] 跨会话恢复时,若 Pi 上下文已丢失,主 agent 如何重建对 plan 的理解?依赖重新读取 plan artifact + CHANGELOG。
