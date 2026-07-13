---
title: 快速开始
description: 开始使用 Nervefeyn 进行论文检索、研究工作流和代码感知审阅。
section: Getting Started
order: 2
---

本指南假定你已[安装 Nervefeyn](/docs/getting-started/installation)并运行过 `nervefeyn setup`。若尚未完成,请先前往该页面。

## 启动 REPL

运行以下命令启动交互式会话:

```bash
nervefeyn
```

你会进入一个对话式 REPL,可以用自然语言提问、运行工作流、与代理交互。输入问题后按回车即可。

## 打开科研工作台

当一次研究运行需要把聊天、产物、笔记本、算力、设置和溯源放在一起时,使用工作台:

```bash
nervefeyn serve
```

该命令会启动一个本地带认证的 Web 应用,包含 Nervefeyn 项目、Pi 驱动的聊天、Nervefeyn Bio Tools、生成的产物、媒体/文档/科研预览、笔记本执行记录、算力清单以及验证状态。完整能力见[科研工作台指南](/docs/getting-started/workbench)。

## 运行一次性提示

如果你不想进入 REPL 而想快速得到答案,可使用 `--prompt` 参数:

```bash
nervefeyn --prompt "总结 Attention Is All You Need 的核心发现"
```

Nervefeyn 会处理提示、输出回答后退出。这在脚本化或把输出管道给其他工具时很有用。

## 启动深度研究会话

深度研究是旗舰工作流。当主题足够宽泛、可从委派中获益时,它会调用 researcher 代理去检索、阅读、交叉引用并综合学术论文与网络信息:

```bash
nervefeyn
> /deepresearch 当前大模型机制可解释性有哪些主要思路?
```

代理协作产出一份带引用、关键发现和开放问题的结构化研究报告。完整报告会保存到你的会话目录,供日后查阅。

## 查找 ML 训练配方

在应用型 ML 工作中,当你需要一个实用起点而非宽泛文献综述时,使用 `/recipe`:

```bash
nervefeyn recipe "为数学推理微调一个小模型"
```

Nervefeyn 会按结果质量与可行性对候选配方排序,尽可能检查数据集与实现路径,并把最终简报写入 `outputs/<slug>-recipe.md`。

## 处理文件

Nervefeyn 可以读写工作目录中的文件。把它指向某篇论文或代码库即可进行针对性分析:

```bash
nervefeyn --cwd ~/papers
> /review arxiv:2301.07041
```

你也可以在提示中直接引用本地文件,让 Nervefeyn 起草文档、审阅代码或对比多个来源。

## 探索斜杠命令

在 REPL 中输入 `/help` 可查看 Nervefeyn 的公开研究命令。每个命令对应一个工作流或工具,例如 `/deepresearch`、`/recipe`、`/review`、`/draft` 或 `/watch`。你也可以直接从 CLI 运行任意工作流:

```bash
nervefeyn deepresearch "用于蛋白质折叠的 transformer 架构"
```

 curated 公开命令清单见[斜杠命令参考](/docs/reference/slash-commands)。
