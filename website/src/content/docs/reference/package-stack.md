---
title: 包栈
description: Nervefeyn 内置的核心与可选 Pi 包。
section: Reference
order: 3
---

Nervefeyn 基于 Pi 运行时构建,使用 curated Pi 包提供能力。包通过 `nervefeyn packages` 命令管理,配置在 `~/.nervefeyn/agent/settings.json` 中。

Nervefeyn 还内置一个本地研究扩展,注册项目专用工具,如 AlphaXiv 包装、Nervefeyn 命令和只读 Hugging Face Hub 检视。这些扩展工具与 Nervefeyn 本身一起打包,而非作为独立 Pi 包安装。Pi 运行时可观测性由内置 `pi-otel` 包提供,通过追踪专用 OTLP 变量指向 PostHog AI Observability,默认配置为仅元数据 span。CLI span 使用 PostHog 分布式追踪,可从 `posthog.trace_spans` 查询;Pi LLM/工具 span 出现在 AI Observability 中并作为 `$ai_*` 事件。

本页遵循 Pi 上游文档中的 [packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md)、[extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) 和 [skills](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)。Nervefeyn 在该模型之上添加自己的包预设和内置研究扩展。

## 核心包

这些在每次 Nervefeyn 安装时默认安装。它们为研究工作流提供基础,同时仍让 Pi 拥有底层运行时、RPC 传输、提供商模型和包加载器。

| 包 | 用途 |
| --- | --- |
| `@companion-ai/alpha-hub` | 用于论文和作者工作流的直接 alphaXiv 工具 |
| `pi-subagents` | 用于文献采集和任务分解的并行代理生成。支撑多代理工作流 |
| `pi-btw` | 主研究代理忙碌时的侧边对话,包括 `/btw` 后续和交回主线程 |
| `pi-docparser` | 解析 PDF、Office 文档、电子表格和图片以提取内容 |
| `pi-web-access` | 网络浏览、GitHub 访问、PDF 获取和媒体检索 |
| `pi-otel` | 为 Pi 会话、模型调用、轮次和工具使用提供 OpenTelemetry span,导出时不包含提示或工具 payload 内容 |

运行 `nervefeyn update` 时这些包会一起更新。你无需单独安装它们。

## 内置研究扩展

| 工具组 | 用途 |
| --- | --- |
| AlphaXiv 工具 | 检索论文、获取论文报告、就论文提问、阅读链接代码、管理批注 |
| Hugging Face Hub 工具 | 检视数据集元数据、features、划分、访问状态和 model、dataset、Space 仓库中的小文件 |
| Nervefeyn 命令 | `/help`、`/outputs`、`/init`、`/nervefeyn-model`、`/service-tier` 和发现助手 |

## 可选包

按需用 `nervefeyn packages install <preset>` 安装。它们用并非每个用户都需要的能力扩展 Nervefeyn。

| 包 | 预设 | 用途 |
| --- | --- | --- |
| `@samfp/pi-memory` | `memory` | Pi 管理的偏好与纠错记忆,用于研究会话连续性 |
| `@luxusai/pi-hindsight` | `hindsight` | 基于 Hindsight 的研究连续性记忆。需要 Hindsight 服务器或 Hindsight Cloud 账户 |
| `@kaiserlich-dev/pi-session-search` | `session-search` | 对历史研究会话记录的索引召回。因其 sqlite 依赖为原生绑定,通过 Node.js 22.x 提供 |

## 安装与管理包

列出受支持的可选研究包及其安装状态:

```bash
nervefeyn packages list
```

安装某个具体可选预设:

```bash
nervefeyn packages install session-search
```

## 更新包

把所有已安装包更新到最新版本:

```bash
nervefeyn update
```

更新某个具体包:

```bash
nervefeyn update pi-subagents
```

不带参数运行 `nervefeyn update` 会更新所有内容。传入具体包名则只更新那一个。更新是安全的,会保留你的配置。

该命令更新 Nervefeyn 环境内的 Pi 包。要升级独立 Nervefeyn 应用本身,请重新运行[安装指南](/docs/getting-started/installation)中的安装器。
