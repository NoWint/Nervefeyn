---
title: 配置
description: 了解 Nervefeyn 的配置文件与环境变量。
section: Getting Started
order: 4
---

Nervefeyn 把用户级配置和状态存放在 `~/.nervefeyn/` 下。该目录在首次运行时创建,包含当前本地 org 清单、Pi 代理配置、模型设置、认证状态、会话历史、org 作用域的工作台应用数据、网络检索路由、memory 状态、命令 shim 以及已安装的用户包。

## 目录结构

```
~/.nervefeyn/
├── active-org.json      # 当前本地 Nervefeyn org 选择
├── orgs/
│   └── <org_uuid>/
│       ├── nervefeyn-workbench.db  # org 级 SQLite 镜像,记录工作台核心数据
│       └── workbench/
│           ├── workspaces.json  # 当前 org 的工作区索引
│           └── workspaces/      # 按工作区存放项目、会话、设置、上传、快照和算力日志
├── agent/
│   ├── settings.json   # 核心模型与运行时配置
│   ├── auth.json       # 提供商认证元数据与 API 密钥引用
│   ├── agents/         # 同步的内置子代理提示词
│   ├── skills/         # 同步的内置技能
│   └── themes/         # 同步的 Nervefeyn/Pi 主题文件
├── sessions/           # 持久化的对话历史
├── workbench/           # 旧版 pre-org 工作台位置,首次访问时会被复制迁移
├── memory/             # Nervefeyn 记忆存储
├── web-search.json     # 网络检索路由配置
├── npm-global/         # 用户作用域可选 Pi 包
├── bin/                # 子代理使用的 Nervefeyn 命令 shim
└── .state/             # 引导与遥测状态
```

`agent/settings.json` 是主配置文件,由 `nervefeyn setup` 创建,也可手动编辑。典型配置如下:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "<non-pro-model-id-from-model-list>",
  "defaultThinkingLevel": "medium"
}
```

## 模型配置

`defaultProvider` 与 `defaultModel` 字段决定你在不带 `--model` 启动 Nervefeyn 时使用的模型。可通过 CLI 修改:

```bash
nervefeyn model list
nervefeyn model set <provider>/<non-pro-model-id>
```

查看已配置的全部模型:

```bash
nervefeyn model list
```

`nervefeyn model list` 只显示已认证/已配置的提供商。若只看到 OpenAI 模型,通常说明目前只配置了 OpenAI 认证。

要添加其他提供商,先完成认证:

```bash
nervefeyn model login anthropic
nervefeyn model login google
nervefeyn model login amazon-bedrock
```

再切换默认模型:

```bash
nervefeyn model list
nervefeyn model set <provider>/<non-pro-model-id>
```

`model set` 命令同时接受 `provider/model` 与 `provider:model` 两种格式。Nervefeyn 在此处和 `--model` 中都会拒绝 Pro 类模型 ID;请为默认值和按会话覆盖选择非 Pro 模型。`nervefeyn model login google` 会直接进入 API 密钥流程,而 `nervefeyn model login amazon-bedrock` 会校验 Pi 用于 Bedrock 访问的 AWS 凭据链。

## 网络检索配置

研究工作流使用 `~/.nervefeyn/web-search.json` 进行网络检索路由。默认 `auto` 路由只使用基于 API 的提供商:Exa、然后 Perplexity、然后 Gemini API。它不会读取 Chromium 或 Chrome 的 cookie,因此不应触发 macOS 钥匙串提示。

示例:

```json
{
  "provider": "auto",
  "searchProvider": "auto",
  "exaApiKey": "exa_...",
  "perplexityApiKey": "pplx-...",
  "geminiApiKey": "AIza..."
}
```

Gemini 浏览器 cookie 访问默认关闭。若要启用,在 `web-search.json` 中设置 `"geminiBrowser": true`;对 `/deepresearch` 推荐使用基于 API 的检索。

## 子代理模型覆盖

Nervefeyn 的内置子代理默认继承主非 Pro 默认模型,除非你显式覆盖。在 REPL 中运行:

```bash
/nervefeyn-model
```

会打开一个交互式选择器,你可以:

- 修改会话环境的主非 Pro 默认模型
- 为某个内置子代理(如 `researcher`、`reviewer`、`writer` 或 `verifier`)单独指定不同的非 Pro 模型

按子代理的覆盖会以 `model:` frontmatter 字段持久化到 `~/.nervefeyn/agent/agents/` 下同步的代理文件中。删除该字段后,子代理会再次继承主非 Pro 默认模型。

## 思考级别

`thinkingLevel` 字段控制模型在回复前进行多少推理。可用级别为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`。更高级别会产出更细致的分析,代价是延迟和 token 用量。可按会话覆盖:

```bash
nervefeyn --thinking high
```

## 环境变量

Nervefeyn 会读取以下环境变量,它们的优先级高于 `settings.json`:

| 变量 | 说明 |
| --- | --- |
| `FEYNMAN_MODEL` | 用非 Pro 模型覆盖默认模型 |
| `FEYNMAN_HOME` | 覆盖用于创建 `.nervefeyn` 的父目录(默认父目录:`~`) |
| `FEYNMAN_WORKBENCH_HOME` | 覆盖工作台应用数据根目录;否则 Nervefeyn 使用 `~/.nervefeyn/orgs/<org_uuid>/workbench` |
| `FEYNMAN_THINKING` | 覆盖思考级别 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `OPENAI_API_KEY` | OpenAI API 密钥 |
| `GEMINI_API_KEY` | Google Gemini API 密钥 |
| `AWS_PROFILE` | Amazon Bedrock 首选 AWS profile |
| `TAVILY_API_KEY` | Tavily 网络检索 API 密钥 |
| `SERPER_API_KEY` | Serper 网络检索 API 密钥 |
| `FEYNMAN_TELEMETRY` | 设为 `off` 可禁用 Nervefeyn 分析、日志和追踪 |
| `FEYNMAN_POSTHOG_HOST` | 覆盖 PostHog 上报主机 |
| `FEYNMAN_POSTHOG_PROJECT_ID` | 覆盖遥测元数据中使用的 PostHog 项目 ID |
| `FEYNMAN_POSTHOG_KEY` | 覆盖 PostHog 项目令牌 |
| `PI_OTEL_CAPTURE_CONTENT` | 控制 Pi 运行时 span 内容捕获。Nervefeyn 默认设为 `metadata_only` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Pi 运行时追踪端点。Nervefeyn 默认设为 PostHog AI Observability |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Nervefeyn CLI 日志端点。Nervefeyn 默认设为 PostHog Logs |

## 可观测性

启用遥测时,Nervefeyn 会向已配置的 PostHog 项目发送三路有界遥测流:

- 来自 CLI 的产品分析事件(通过 PostHog SDK)
- 通过 PostHog Logs(`/i/v1/logs`)上报的 CLI 日志
- CLI 与 Pi 运行时的 OpenTelemetry span

CLI 的通用 span 使用 PostHog 分布式追踪(`/i/v1/traces`);可在 HogQL 中从 `posthog.trace_spans` 查询。Pi 运行时的 LLM/工具 span 使用 PostHog AI Observability(`/i/v0/ai/otel`);可在 AI Observability traces UI 查看,或作为 `$ai_*` 事件在 `events` 中查询其元数据。较大的 AI 属性在 PostHog 的 AI 事件保留窗口内位于 `posthog.ai_events`。请勿直接查询裸 `traces`、`spans` 或 `trace_spans` 表名;PostHog 把分布式追踪 span 注册为 `posthog.trace_spans`。

Nervefeyn 设置 `PI_OTEL_CAPTURE_CONTENT=metadata_only`,因此 Pi span 只携带模型、工具、时序、计数和状态元数据,不包含提示词文本或工具 payload 正文。设置 `FEYNMAN_TELEMETRY=off` 可禁用分析、日志和追踪;在该模式下,Nervefeyn 还会在启动 Pi 前清除继承的 OTLP/PostHog 环境变量。

## 会话存储

每段对话都以 JSON 文件持久化在 `~/.nervefeyn/sessions/` 下。要开启全新会话:

```bash
nervefeyn --new-session
```

将会话指向其他目录(便于按项目隔离会话):

```bash
nervefeyn --session-dir ~/myproject/.nervefeyn/sessions
```

## 诊断

运行 `nervefeyn doctor` 可校验配置是否有效、检查所有已配置提供商的认证状态,并检测缺失的可选依赖。doctor 命令会输出一份清单,显示哪些正常、哪些需要处理。
