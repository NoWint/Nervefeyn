---
title: 设置
description: 走完引导式设置向导,完成 Nervefeyn 配置。
section: Getting Started
order: 3
---

`nervefeyn setup` 向导用于配置模型提供商、API 密钥及可选包。它在首次启动时自动运行,你也可以随时重新运行以更改配置。

## 运行设置

```bash
nervefeyn setup
```

向导会带你走过三个阶段:模型配置、认证、可选包安装。

## 阶段 1:模型选择

Nervefeyn 支持多个模型提供商。设置向导会列出可用提供商和模型,使用方向键选择你偏好的非 Pro 默认模型:

```
? Select your default model:
> provider:non-pro-model-from-your-list
  provider:another-non-pro-model
```

此处选择的非 Pro 模型会成为所有会话的默认模型。你可以用 `--model` 参数按会话覆盖,或之后通过 `nervefeyn model set <provider/model>` 或 `nervefeyn model set <provider:model>` 修改。Nervefeyn 会拒绝 Pro 类模型 ID 作为默认或显式选择;请选择非 Pro 模型。

## 阶段 2:认证

根据所选提供商,设置会提示你输入 API 密钥或引导你完成 OAuth 登录。对于支持 Pi OAuth 的提供商(如 Anthropic 和 OpenAI),Nervefeyn 会打开浏览器窗口完成登录流程。你的凭据会安全存储在 `~/.nervefeyn/` 下的 Pi 认证存储中。

对于 API 密钥类提供商,会直接提示你粘贴密钥:

```
? Enter your API key: sk-ant-...
```

密钥在静态存储时加密,且仅发送到提供商的 API 端点,不会发往其他任何地方。

### Amazon Bedrock

对于 Amazon Bedrock,请选择:

```text
Amazon Bedrock (AWS credential chain)
```

Nervefeyn 会校验 Pi 运行时所用的同一套 AWS 凭据链,包括 `AWS_PROFILE`、`~/.aws` 凭据/配置、SSO、ECS/IRSA 以及 EC2 实例角色。该校验通过后,Bedrock 模型即可在 `nervefeyn model list` 中出现,无需传统 API 密钥。

### 本地模型:LM Studio、LiteLLM、Ollama、vLLM

若要使用 LM Studio,先启动 LM Studio 本地服务器、加载模型、选择 API 密钥流程,然后选择:

```text
LM Studio (local OpenAI-compatible server)
```

默认设置为:

```text
Base URL: http://localhost:1234/v1
Authorization header: No
API key: lm-studio
```

Nervefeyn 会尝试读取 LM Studio 的 `/models` 端点并预填已加载的模型 ID。

对于 LiteLLM,启动代理、选择 API 密钥流程,然后选择:

```text
LiteLLM Proxy (OpenAI-compatible gateway)
```

默认设置为:

```text
Base URL: http://localhost:4000/v1
API mode: openai-completions
Master key: optional, read from LITELLM_MASTER_KEY
```

Nervefeyn 会尝试读取 LiteLLM 的 `/models` 端点并从代理配置预填模型 ID。

对于 Ollama、vLLM 或其他 OpenAI 兼容的本地服务器,选择:

```text
Custom provider (baseUrl + API key)
```

Ollama 的典型设置如下:

```text
API mode: openai-completions
Base URL: http://localhost:11434/v1
Authorization header: No
Model ids: llama3.1:8b
API key: local
```

保存该提供商后,运行:

```bash
nervefeyn model list
nervefeyn model set <provider>/<model-id>
```

确认本地模型可用并将其设为默认。

## 阶段 3:可选包

Nervefeyn 核心自带研究必备能力:alphaXiv 访问、网络访问、文档解析、子代理,以及主研究代理忙碌时的 `/btw` 侧边对话。在支持可选预设的平台上,向导可提供额外扩展:

- **memory** —— 用于研究会话连续性的偏好与纠错记忆
- **hindsight** —— 基于 Hindsight 的研究连续性记忆;需要 Hindsight 服务器或 Hindsight Cloud 账户
- **session-search** —— 对历史研究会话记录的索引召回。因其 sqlite 依赖为原生绑定,目前通过 Node.js 22.x 提供

你可以跳过此步,之后用 `nervefeyn packages install <preset>` 安装包。

## 工作台引导

`nervefeyn serve` 内置了科研工作台的本地引导流程。该流程会创建一个 Nervefeyn 项目和会话、采集领域与研究目标上下文、选择建议的专家、记录所选设置范围、推荐种子工作流,并在选中科学数据库访问时启用 Nervefeyn 自有的连接器(如 Nervefeyn Bio Tools)。

工作台引导会把设置意图和脱敏后的凭据可用性记录存入 Nervefeyn 自有状态。它不需要另一个本地应用,也不会在浏览器中暴露原始凭据值。

## 重新运行设置

配置存储在 `~/.nervefeyn/agent/settings.json`。重新运行 `nervefeyn setup` 会覆盖之前的设置。若只需修改某个具体值,可直接编辑该配置文件,或使用定向命令,如 `nervefeyn model set` 或 `nervefeyn alpha login`。
