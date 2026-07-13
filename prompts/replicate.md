---
description: 为某篇论文、论断或基准规划复现工作流;仅在明确选择环境后执行。
args: <paper>
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

为以下对象设计复现 plan:$@

## 工作流

1. **提取** — 使用 `researcher` subagent 从目标论文与任何链接的代码中拉取实现细节。如果 `CHANGELOG.md` 存在,在规划或恢复前阅读最近的相关条目。
2. **配方 pass** — 对于 ML 训练、微调、基准或数据密集型目标,在执行规划前进行一次配方提取。将每个声称的结果与产生它的确切数据集、方法、超参数、算力假设、指标与代码路径关联。可能时验证数据集可用性/schema,并将未检查的细节标记为 `unverified`,而非假设它们可用。
3. **Plan** — 确定所需的代码、数据集、指标与环境。明确说明哪些已验证、哪些是推断、哪些仍缺失,以及将用哪些检查或测试预言来决定复现是否成功。
4. **环境** — 运行任何东西前,询问用户在哪里执行:
   - **Local** — 在当前工作目录运行
   - **虚拟环境** — 先创建一个隔离的 venv/conda 环境
   - **Docker** — 在隔离的 Docker 容器内运行实验代码
   - **Modal** — 在 Modal 的 serverless GPU 基础设施上运行。编写 Modal 装饰的 Python 脚本并用 `modal run <script.py>` 执行。最适合不需要持久状态的突发 GPU 作业。需要 `modal` CLI(`pip install modal && modal setup`)。
   - **RunPod** — 在 RunPod 上配置一个 GPU pod 并通过 SSH 执行。使用 `runpodctl` 创建 pod、传输文件并管理生命周期。最适合长时间运行的实验或需要 SSH 访问与持久存储时。需要 `runpodctl` CLI 与 `RUNPOD_API_KEY`。
   - **仅规划** — 产出复现 plan 而不执行
5. **执行** — 若用户选择了执行环境,在其中实现并运行复现步骤。将笔记、脚本、原始输出与结果以可复现的布局保存到磁盘。除非计划的检查确实通过,否则不要称结果已复现。
6. **日志** — 对于多步或可恢复的复现工作,在有意义的进展、失败尝试、重大验证结果之后以及停止前,向 `CHANGELOG.md` 追加简洁条目。记录活跃目标、变更了什么、检查了什么以及下一步。
7. **报告** — 以一个 `Sources` 章节收尾,包含论文、数据集、文档与仓库 URL。

未先确认执行环境,不要安装包、运行训练或执行实验。
