---
title: ML 训练配方
description: 找到由论文、数据集、文档和代码支撑的、可实现的排序 ML 训练配方。
section: Workflows
order: 6
---

recipe 工作流把一个训练或微调目标转化为一组排序的可实现配方。它面向这样的 ML 工程问题:有用的答案不只是"有哪些论文?",而是"我该先试哪个数据集、方法、超参数、代码路径和检查?"。

该工作流借鉴了 Hugging Face 开源 [`ml-intern`](https://github.com/huggingface/ml-intern) 仓库的有用想法:让 ML 研究输出呈配方形状、可直接实现。Nervefeyn 把实现保留在 Pi 提示词、内置技能和只读 Hub 检视工具的原生形态中,而非复制 `ml-intern` 的运行时循环或前端。

## 用法

在 REPL 中:

```
/recipe "为数学推理微调一个小模型"
```

在 CLI 中:

```bash
nervefeyn recipe "为数学推理微调一个小模型"
```

你可以把 `/recipe` 用于这样的任务:选择 SFT 数据集、复现基准设置、选择实用训练方法,或把论文转化为实现计划。

## 工作原理

工作流先把计划写入 `outputs/.plans/<slug>-recipe.md`,然后自动继续。它从论文、网络来源、仓库、官方文档和 Hugging Face Hub 元数据采集证据。

对每个候选,Nervefeyn 把报告的结果与产生它的配方关联:数据集、划分/schema、方法、超参数、算力假设、基准和实现代码。这条"结果到配方"的链接是核心输出。一篇报告了强结果但未暴露可用数据、代码或足够配置细节的论文,会被标记为风险,而非视为立即可运行。

## Hugging Face 接地

当某个候选使用 Hugging Face 数据集或仓库时,researcher 可以直接检视它:

- `hf_dataset_info` 检查数据集元数据、标签、访问状态、card 数据、features 和 splits。
- `hf_repo_files` 列出 model、dataset 和 Space 仓库中的文件。
- `hf_repo_read_file` 读取小型文本文件,如数据集 card、配置、示例和脚本。

这些工具默认使用公开 Hub 端点,在存在 `HF_TOKEN` 或 `HUGGINGFACE_HUB_TOKEN` 时用于私有或受限资源。

## 输出格式

最终产物写入 `outputs/<slug>-recipe.md`,溯源 sidecar 在 `outputs/<slug>-recipe.provenance.md`。

简报包含:

- **推荐** —— 首先尝试的那一个配方及原因
- **排序配方表** —— 候选配方,含论文/来源、结果、数据集、方法、超参数、算力、代码/文档和验证状态
- **数据集笔记** —— schema、划分、大小、许可/访问约束和未检查的缺口
- **实现计划** —— 跑 top 配方的最小步骤
- **已知缺口** —— 缺失代码、不可访问数据、不清晰超参数、基准不匹配或未验证假设
- **来源** —— 每篇使用的论文、仓库、数据集和文档页面的 URL

Nervefeyn 精确使用 `verified`、`unverified`、`blocked` 和 `inferred` 标签。除非检查实际支撑该主张,否则不应称某配方为 state of the art、已复现或生产就绪。
