---
description: 有界研究实验循环——尝试假设、测量基准证据、保留有效的、丢弃无效的,反复迭代。
args: <idea>
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

为以下目标启动一个 autoresearch 优化循环:$@

此命令使用本会话中可见的工具运行一个有界的前台研究实验循环。

## 第 1 步:收集

如果 `autoresearch.md` 与 `autoresearch.jsonl` 已存在,询问用户是想恢复还是重新开始。
如果 `CHANGELOG.md` 存在,恢复前阅读最近的相关条目。

否则,在做任何其他事之前,向用户收集以下信息:
- 要优化什么(模型准确率、检索质量、训练 loss、消融得分、评估延迟等)
- 要运行的基准命令
- 指标名称、单位与方向(越低/越高越好)
- 纳入变更范围的文件
- 最大迭代次数(默认:20)

## 第 2 步:环境

询问用户在哪里运行:
- **Local** — 在当前工作目录运行
- **新 git 分支** — 创建一个分支以保持 main 干净
- **虚拟环境** — 先创建一个隔离的 venv/conda 环境
- **Docker** — 在隔离的 Docker 容器内运行实验代码
- **Modal** — 在 Modal 的 serverless GPU 基础设施上运行。编写 Modal 装饰的脚本并用 `modal run` 执行。最适合迭代间无持久状态的 GPU 密集型基准。需要 `modal` CLI。
- **RunPod** — 通过 `runpodctl` 配置一个 GPU pod 并通过 SSH 在其上运行迭代。最适合需要持久状态、大数据集或迭代间 SSH 访问的实验。需要 `runpodctl` CLI。

没有明确答复不要继续。

## 第 3 步:确认

开始前向用户呈现完整 plan:

```
Optimization target: [metric] ([direction])
Benchmark command:   [command]
Files in scope:      [files]
Environment:         [chosen environment]
Max iterations:      [N]
```

请求用户确认。没有明确批准不要开始循环。

## 第 4 步:运行

初始化会话:创建 `autoresearch.md`、`autoresearch.jsonl`、`autoresearch.sh`,运行基线,并开始循环。

每次迭代:编辑 -> 运行基准 -> 记录基准结果、证据与决策 -> 与基线对比 -> 保留变更、回滚或记录失败假设 -> 重复。除非被中断或达到 `maxIterations`,否则不要停止。
在基线之后以及有意义的迭代里程碑之后,向 `CHANGELOG.md` 追加一条简洁条目,总结变更了什么、观察到什么指标结果、什么失败了以及下一步。

## 可选工具

仅当这些工具在当前工具集中可见时使用:

- `init_experiment` — 一次性会话配置(name、metric、unit、direction)
- `run_experiment` — 运行基准命令,捕获输出与 wall-clock 时间
- `log_experiment` — 在 autoresearch 日志中记录基准结果、证据与决策

## 子命令

- `/autoresearch <text>` — 启动或恢复循环
- `/autoresearch off` — 停止循环,保留数据
- `/autoresearch clear` — 删除所有状态并重新开始
