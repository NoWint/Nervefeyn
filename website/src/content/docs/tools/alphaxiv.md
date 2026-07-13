---
title: AlphaXiv
description: 通过 AlphaXiv 集成检索并获取学术论文。
section: Tools
order: 1
---

AlphaXiv 是 Nervefeyn 中主要的学术论文检索与获取工具。它提供对大量研究论文、讨论线程、引用元数据的访问,并在可用时提供来源特定的论文文本。researcher 代理把 AlphaXiv 作为学术内容的主要来源。

## 认证

AlphaXiv 需要认证。在初始设置时或随时配置:

```bash
nervefeyn alpha login
```

检查认证状态:

```bash
nervefeyn alpha status
```

## 它提供什么

AlphaXiv 让 Nervefeyn 获得若干支撑研究工作流的能力:

- **论文检索** —— 按主题、作者、关键词或 arXiv ID 查找论文(`nervefeyn alpha search`)
- **论文内容获取** —— 取回 alphaXiv 提供的论文内容或来源特定文本(若可用)(`nervefeyn alpha get`)
- **章节聚焦提取(代理工具)** —— 代理内的 `alpha_get_paper` 支持 `section` 与 `sections` 过滤,可在可用时获取摘要、引言、方法、实验、结果、讨论、局限和结论
- **论文问答** —— 就论文内容提出定向问题(`nervefeyn alpha ask`)
- **代码检视** —— 读取论文链接的 GitHub 仓库中的文件(`nervefeyn alpha code`)
- **批注** —— 跨会话对论文的持久本地笔记(`nervefeyn alpha annotate`)

## 如何被使用

Nervefeyn 内置 `alpha-research` 技能,教代理使用 Nervefeyn 的 alphaXiv 工具进行论文操作。researcher 代理在深度研究、文献综述和内部研究评审等工作流中使用它们。当你提供 arXiv ID(如 `2401.12345`)时,代理通过 `nervefeyn alpha get` 取回论文。

你也可以直接从终端使用 Nervefeyn 内置的 alphaXiv 客户端:

```bash
nervefeyn alpha search "scaling laws"
nervefeyn alpha get 2401.12345
nervefeyn alpha ask 2401.12345 "他们用了什么优化器?"
nervefeyn alpha code https://github.com/org/repo src/model.py
```

## 配置

认证状态由内置 alphaXiv 客户端管理,与 Nervefeyn 自身的主目录分开持久化。Nervefeyn 把运行时状态存放在 `~/.nervefeyn`;alphaXiv 登录状态可在卸载时从 `~/.ahub` 单独移除。除登录外无需额外配置。

## 不使用 AlphaXiv 时

如果你选择不认证 AlphaXiv,Nervefeyn 仍可工作,但学术检索能力会减弱。它会回退到网络检索来发现论文,对知名工作有效,但会缺失 AlphaXiv 引用元数据、讨论线程和来源特定论文文本(若可用)。对于严肃研究工作流,强烈推荐认证 AlphaXiv。
