# 贡献 Nervefeyn

Nervefeyn 是一个研究优先的 CLI,基于 Pi 与 alphaXiv 构建。本指南面向为 repo 贡献代码、prompt、skill、文档、安装器或工作流行为的人与 agent。

## 快速链接

- GitHub:https://github.com/companion-inc/feynman
- 文档:https://feynman.is/docs
- Repo agent 契约:[AGENTS.md](AGENTS.md)
- Issues:https://github.com/companion-inc/feynman/issues

## 什么放在哪里

- CLI/runtime 代码:`src/`
- 内置 prompt 模板:`prompts/`
- 内置 Pi skill:`skills/`
- 内置 Pi subagent prompt:`.feynman/agents/`
- 文档站点:`website/`
- Build/release 脚本:`scripts/`
- 生成的研究 artifact:`outputs/`、`papers/`、`notes/`

如需修改内置 subagent 行为,编辑 `.feynman/agents/*.md`。不要在 `AGENTS.md` 中重复该行为。

## 开 PR 之前

1. 从最新 `main` 开始。
2. 本地开发使用 Node.js `24.x`。支持的 runtime 范围是 Node.js `22.19.0` 到 `25.x`;`.nvmrc` pin 了首选本地版本,而 `package.json`、`website/package.json` 与 runtime version guard 定义了更宽的支持范围。可选的 session-search 包仍限定在 Node.js `22.x`,因为其 sqlite 依赖在更新的 Node 主版本上不能可靠安装。
3. 从 repo 根目录安装依赖:

```bash
nvm use || nvm install
npm install
```

4. 在请求 review 前运行必需检查:

```bash
npm test
npm run typecheck
npm run build
```

5. 如果改动了文档站点,还须验证 website:

```bash
cd website
npm install
npm run build
```

6. 保持 PR 聚焦。不要把无关清理与真实改动混在一起。
7. 行为变更时新增或更新测试。
8. 用户面工作流变更时同步更新文档、prompt 或 skill。

## 贡献规则

- Bug、文档修复、安装器修复与聚焦的工作流改进是好的 PR。
- 大功能变更应先开 issue 或具体的实现讨论再落代码。
- 避免 refactor-only PR,除非为解锁真实修复所必需或 maintainer 要求。
- 不要在未在 PR 中文档化原因的情况下静默改变 release 行为、安装器行为或 runtime 默认值。
- 文档、注释、prompt、UI 文案与示例使用简体中文(代码标识符保留英文)。
- 不要新增以营销、背书或将用户引向第三方产品/服务为主要目的的内置 prompt、skill 或文档。产品集成必须以用户面效用为依据,并以中立语言书写。

## Repo 特定检查

### Prompt 与 skill 变更

- 新工作流通常位于 `prompts/*.md`。
- 新可复用能力通常位于 `skills/<name>/SKILL.md`。
- 保持 skill 文件简洁。详细操作规则仅在需要时放进 prompt 或聚焦的 reference 文件。
- 如果新工作流应可从 CLI 调用,确保其 prompt frontmatter 包含正确的元数据,并能在正常 prompt 发现路径下工作。

### Agent 与 artifact 约定

- `AGENTS.md` 是 workspace 约定、交接、provenance 与输出命名的 repo 级契约。
- 长时间运行研究流应把 plan artifact 写入 `outputs/.plans/`,并在工作实质性时把 `CHANGELOG.md` 作为 lab notebook。
- 对 trivial 的一次性变更,不要更新 `CHANGELOG.md`。

### Release 与版本纪律

- curl 安装器与 release 文档指向 tagged release,而非 `main` 上的任意 commit。
- 如果在 tag 后发布用户可见修复,不要让 repo 处于 `main` 与最新 release 宣称同一版本字符串但行为不同的状态。
- 改动 release 敏感行为时,检查跨以下文件的版本故事:
  - `.nvmrc`
  - `package.json`
  - `website/package.json`
  - `scripts/check-node-version.mjs`
  - `README.md` 与 `website/src/content/docs/getting-started/installation.md` 中的安装文档

## AI 辅助贡献

AI 辅助 PR 没问题。贡献者仍需对 diff 负责。

- 理解你提交的代码。
- 自己跑本地检查,不要假设生成的代码正确。
- 在 PR 描述中提供足够上下文,让 reviewer 能快速理解改动。
- 如果 agent 更新了 prompt 或 skill,验证指令与 repo 实际行为一致。

## Review 期望

- 说明改了什么以及为什么。
- 指出权衡、后续工作与有意未处理的部分。
- UI 改动附截图。
- 在再次请求 review 前解决你已处理的 review 评论。

## 适合新手的领域

有用的贡献通常落在以下领域之一:

- 安装与升级可靠性
- 研究工作流质量
- 模型/provider setup 易用性
- 文档清晰度
- 预览与导出稳定性
- 打包与 release 卫生
