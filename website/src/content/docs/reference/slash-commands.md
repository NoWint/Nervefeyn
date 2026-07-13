---
title: 斜杠命令
description: REPL 斜杠命令的完整参考。
section: Reference
order: 2
---

斜杠命令在 Nervefeyn REPL 中可用。它们映射到研究工作流、研究会话工具和设置工具。在 REPL 中输入 `/help` 查看 Nervefeyn 的 curated 实时命令列表。

## 研究工作流

| 命令 | 说明 |
| --- | --- |
| `/deepresearch <topic>` | 运行彻底的、来源密集的调查,产出带内联引用的研究简报 |
| `/lit <topic-or-lab>` | 运行结构化文献综述,含共识、分歧、开放问题和实验室/PI 语料库模式 |
| `/review <artifact>` | 运行内部研究评审,产出分级严重度反馈和内联批注 |
| `/audit <item>` | 把论文主张与其公开代码库对照,识别不匹配和可复现性风险 |
| `/replicate <paper>` | 为论文、主张或基准规划复现工作流;仅在选定环境后执行 |
| `/recipe <task-or-paper>` | 找到由论文、数据集、文档和代码支撑的、可实现的排序 ML 训练配方 |
| `/compare <topic>` | 对比多个来源,产出一致/分歧矩阵 |
| `/draft <topic>` | 从研究发现生成论文式草稿 |
| `/autoresearch <idea>` | 启动一个有界研究实验循环,针对基准迭代优化 |
| `/watch <topic>` | 创建研究 watch 基线,并可选调度后续检查 |

这些是研究运行中你使用的主要命令。当委派有帮助时,工作流提示可以通过 Pi 的 `subagent` 工具调用专门代理(researcher、reviewer、writer、verifier);狭窄任务仍由主代理承担。ML 配方和复现运行在为实现计划接地时,可以检视 Hugging Face 数据集元数据、仓库文件和小型 Hub 文件。

## 项目与会话

| 命令 | 说明 |
| --- | --- |
| `/log` | 写入持久会话日志,含已完成工作、发现、开放问题和下一步 |
| `/jobs` | 检视可见的研究运行进程/调度器状态以及持久 watch 或实验产物 |
| `/help` | 显示分组的 Nervefeyn 命令,并用所选命令预填编辑器 |
| `/nervefeyn-model` | 打开非 Pro 模型选择器,用于主默认模型和按子代理覆盖 |
| `/init` | 为新的研究项目引导 `AGENTS.md` 和会话日志目录 |
| `/outputs` | 浏览所有研究产物(论文、输出、实验、笔记) |
| `/btw <question>` | 在主研究代理忙碌时提问侧边问题,并在需要时把结果交回 |
| `/search` | 检索历史研究会话记录,寻找过往研究和发现 |

会话管理命令帮助你组织正在进行的工作。`/log` 命令在研究会话结束时尤其有用,可记录完成了什么、还剩什么。

`/nervefeyn-model` 命令打开一个交互式选择器,你可以修改主非 Pro 默认模型,或为某个内置子代理(如 `researcher`、`reviewer`、`writer` 或 `verifier`)单独指定不同的非 Pro 模型。

## 从 CLI 运行工作流

所有研究工作流斜杠命令也可以直接从命令行运行:

```bash
nervefeyn deepresearch "topic"
nervefeyn lit "topic"
nervefeyn review artifact.md
nervefeyn audit 2401.12345
nervefeyn replicate "claim"
nervefeyn recipe "fine-tune a small model for math reasoning"
nervefeyn compare "topic"
nervefeyn draft "topic"
```

这等价于启动 REPL 并输入斜杠命令。CLI 形式适合脚本和自动化。

`/recipe` 工作流见 [ML 训练配方](/docs/workflows/recipe),配方和复现运行使用的数据集与仓库检视工具见 [Hugging Face Hub](/docs/tools/hugging-face)。
