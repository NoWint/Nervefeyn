---
title: CLI 命令
description: 所有 Nervefeyn CLI 命令与参数的完整参考。
section: Reference
order: 1
---

本页覆盖 Nervefeyn 专用 CLI 命令与参数。`nervefeyn deepresearch` 等工作流命令也在[斜杠命令](/docs/reference/slash-commands)参考中列出,因为它们直接映射到 REPL 斜杠命令。

## 核心命令

| 命令 | 说明 |
| --- | --- |
| `nervefeyn` | 启动交互式 REPL |
| `nervefeyn chat [prompt]` | 显式启动聊天,可选传入初始提示 |
| `nervefeyn help` | 显示 CLI 帮助 |
| `nervefeyn setup` | 运行引导式设置向导 |
| `nervefeyn setup preview` | 安装或验证预览依赖 |
| `nervefeyn doctor` | 诊断配置、认证、Pi 运行时和预览依赖 |
| `nervefeyn status` | 显示当前设置摘要(模型、认证、包) |
| `nervefeyn serve` | 启动本地科研工作台,提供项目、Pi 聊天、Nervefeyn Bio Tools、笔记本、算力、产物预览、溯源、设置和引导上下文 |
| `nervefeyn rank "topic"` | 为决定先读哪篇而对论文排序,带透明的引用、方法、可复现性和溯源证据 |
| `nervefeyn paper <id-or-title>` | 为单篇论文解析合法的全文访问候选,并可选获取来源特定文本 |

## 科研工作台

`nervefeyn serve` 启动一个本地带认证的 Web 应用,面向需要控制平面而非仅终端会话的研究运行。它暴露项目、会话、Pi 驱动的聊天、Nervefeyn Bio Tools(用于精确 OpenAlex/arXiv 文献工作流、试验、Grants.gov 机会检索、FDA 监管数据、精确 gnomAD/CADD/ClinVar/dbSNP 变异工作流、GTEx/PanglaoDB 表达工作流、MyGene/OLS/QuickGO/UniProt/Reactome/KEGG 基因与本体工作流、精确 Ensembl 基因组工作流、精确 UCSC Genome Browser 工作流、精确 ENCODE/JASPAR/UniBind 调控工作流、精确 InterPro/Pfam/Human Protein Atlas/STRING 蛋白注释工作流、精确 Antibody Registry 试剂工作流、精确 Rfam RNA 工作流、精确 ArrayExpress/GEO/MetaboLights/MGnify/PRIDE 组学归档工作流)以及生物数据库、附件、产物、音视频/电子表格/笔记本/LaTeX/科研预览(包括 KET/RXN/CDXML/CXSMILES 化学草图)、版本、血缘、执行日志、验证检查、笔记本、算力清单、专家、技能、连接器、记忆分类、权限、存储和凭据可用性。

使用 `nervefeyn serve --no-auth` 进行可信的仅本地会话,应在不带启动令牌的纯 `http://127.0.0.1:<port>/` URL 打开。在把自己的机器之外暴露服务器时,使用默认带令牌 URL。

工作台为 Nervefeyn 自有。它使用 Nervefeyn Bio Tools 和 Nervefeyn 自有的工作区/设置记录;它不需要为基本产品行为安装另一个本地应用。Nervefeyn Bio Tools 包括精确 OpenAlex 作品检索/详情、引用、参考、作者检索/详情、期刊元数据、精确 arXiv 检索与批量论文获取、PubMed 元数据、PMID/PMCID/DOI 转换、相关文章链接、引文匹配、版权/许可检查、PMC 全文路由、ClinicalTrials.gov NCT 详情记录、资助方特定项目、入组资格筛选、研究者/联系发现、终点摘要、Grants.gov Search2 机会查询、精确 Antibody Registry 检索/详情/目录/统计工作流、ChEMBL 化合物/药物/ADMET/生物活性/机制/靶点工作流、精确 gnomAD 短变异/SV/线粒体变异工作流、CADD 变异/位置/范围评分、直接 ClinVar 检索/登录号/rsID 工作流、dbSNP rsID/区域工作流、GTEx 数据集/组织/样本/基因/表达/eQTL 工作流、PanglaoDB 标记基因与基因到细胞类型工作流、Ensembl 查询/交叉引用/VEP/同源/序列/重叠区域获取、UCSC track/染色体/track 数据/保守性/TFBS 获取、精确 ENCODE 实验/生物样本/文件检索与详情工作流、精确 JASPAR 矩阵/版本/目录工作流、精确 UniBind 数据集与区域 TFBS 工作流、精确 GWAS Catalog 关联/研究/性状/SNP 工作流、精确 eQTL Catalogue 数据集与关联工作流、PheWeb/FinnGen PheWAS 工作流、精确 Rfam RNA 家族元数据/登录号/比对/模型/树/区域/结构/检索工作流、精确 ArrayExpress 实验/文件/样本工作流、GEO series 检索/详情、MetaboLights 研究/文件工作流、MGnify 研究/分析工作流、PRIDE 项目/蛋白证据工作流、精确 InterPro/Pfam 结构域结构、条目、clan 和 family 成员工作流、Human Protein Atlas 基因/检索工作流、STRING 映射/网络/相似性工作流、MyGene 批量查询、OLS 本体目录/检索/词条查询、QuickGO 注释、UniProt 条目获取、Reactome 通路映射、KEGG 条目/检索/链接/ID 转换工作流,以及更丰富的 bioRxiv/medRxiv DOI 查询、日期/分类预印本窗口、已发表-预印本链接、资助方/ROR 查询和使用/内容统计。详见[科研工作台指南](/docs/getting-started/workbench)。

## 论文访问命令

| 命令 | 说明 |
| --- | --- |
| `nervefeyn paper 10.7717/peerj.4375` | 解析 OpenAlex、DOI、出版商/仓库和 Europe PMC 访问候选 |
| `nervefeyn paper pmid:29456894` | 通过精确 OpenAlex PMID/PMCID 元数据和 Europe PMC 候选解析 PubMed/PMC 索引论文 |
| `nervefeyn paper 2309.08600 --fetch-full-text` | 在可用时通过来源特定 API 获取文本并写出有界访问产物 |
| `nervefeyn paper "paper title" --json` | 按标题检索 OpenAlex 并打印机器可读的访问摘要 |

论文访问写入 `<slug>-paper-access.md` 和 `<slug>-paper-access.json`。它记录来自 OpenAlex、DOI、PMID/PMCID、arXiv/alphaXiv 和 Europe PMC 的访问候选。它不绕过付费墙,也不把原始全文正文写入产物。

## PaperRank 命令

| 命令 | 说明 |
| --- | --- |
| `nervefeyn rank "topic"` | 获取 OpenAlex 作品并为某主题排序论文 |
| `nervefeyn rank "topic" --limit 20` | 限制候选论文数量 |
| `nervefeyn rank "topic" --expand-citations 2` | 在打分图谱声望前,把被引和引用作品加入本地图谱 |
| `nervefeyn rank "topic" --full-text-top 3` | 为顶部候选取回来源特定全文,加入章节感知 rubric 证据并重新打分 |
| `nervefeyn rank "topic" --critique-top 5` | 为排序最高的论文写出研究评审优势、关切和后续问题 |
| `nervefeyn rank "topic" --preference-file preferences.json` | 对照研究者阅读顺序偏好评估排序一致率 |
| `nervefeyn rank "topic" --reproduction-notes reproduction-notes.json` | 把已完成复现结果与计划复现检查分开记录 |
| `nervefeyn rank "topic" --synthesis-top 7` | 选择多少排序论文进入有界模型综合 packet |
| `nervefeyn rank "topic" --synthesize` | 请推荐的可用非 Pro 研究模型写出 `<slug>-model-synthesis.md` 并打印所选模型 |
| `nervefeyn rank "topic" --synthesize --model provider/model` | 用显式非 Pro 模型为该命令运行模型综合 |
| `nervefeyn rank "topic" --synthesize --synthesis-model provider/model` | 用显式非 Pro 模型运行模型综合,不修改聊天模型标志 |
| `nervefeyn rank "topic" --output-dir outputs` | 选择产物写入位置 |
| `nervefeyn rank "topic" --json` | 写完产物后打印紧凑 JSON 摘要 |

PaperRank 默认写出排序简报、规范化论文/分数 JSONL、分数审计、引文/字段上下文、图谱浏览器、排序敏感性数据和溯源。可选标志添加研究评审、经验偏好校准、已完成复现笔记、来源特定全文富集、引文邻域扩展或模型综合。CLI 输出、JSON 摘要、生成综合和溯源会记录所选模型以及它来自推荐路径还是显式覆盖。分数把主题相关性、引用影响力、本地图谱声望、引用速度、方法筛选和可复现性筛选项分开。分数审计解释每篇论文的权重、贡献演算、可见证据、缺失分项、rubric 缺口、字段角色和评审状态。偏好文件和复现笔记被视为外部证据;未提供时,PaperRank 把这些检查标记为未提供,且不写出额外校准或复现文件。综合 packet 与提示是有界模型输入,省略原始全文,仅在请求综合时写出。图谱浏览器是检视视图,不嵌入原始全文正文。

## 模型管理

| 命令 | 说明 |
| --- | --- |
| `nervefeyn model list` | 列出 Pi 认证存储中的可用模型 |
| `nervefeyn model login [id]` | 用 OAuth 或 API 密钥设置认证某模型提供商 |
| `nervefeyn model logout [id]` | 清除某模型提供商的已存认证 |
| `nervefeyn model set <provider/model>` | 为所有会话设置默认非 Pro 模型 |

这些命令管理你的模型提供商配置。`model set` 命令用新默认值更新 `~/.nervefeyn/agent/settings.json`。它接受 `provider/model-name` 或 `provider:model-name`;先运行 `nervefeyn model list`,从输出中选择一个非 Pro 模型 ID。运行 `nervefeyn model login google` 或 `nervefeyn model login amazon-bedrock` 会直接进入相关 API 密钥设置流程,无需交互式选择器。

## AlphaXiv 命令

| 命令 | 说明 |
| --- | --- |
| `nervefeyn alpha login` | 登录 alphaXiv |
| `nervefeyn alpha logout` | 清除 alphaXiv 认证 |
| `nervefeyn alpha status` | 检查 alphaXiv 认证状态 |
| `nervefeyn alpha search "query"` | 通过 Nervefeyn 内置 alphaXiv 客户端检索论文 |
| `nervefeyn alpha get <id-or-url>` | 获取论文内容和本地批注 |
| `nervefeyn alpha ask <id-or-url> "question"` | 就某论文提问 |
| `nervefeyn alpha code <github-url> [path]` | 检视论文仓库 |
| `nervefeyn alpha annotate ...` | 读取、写入、列出或清除本地论文笔记 |

AlphaXiv 认证使 Nervefeyn 能够检索并获取论文、访问讨论线程并拉取引用元数据。使用 `nervefeyn alpha ...` 进行 shell 访问,让 Nervefeyn 运行其内置的打过补丁的 alphaXiv 客户端。

## 包管理

| 命令 | 说明 |
| --- | --- |
| `nervefeyn packages list` | 列出受支持的可选研究包及其安装状态 |
| `nervefeyn packages install <preset>` | 安装一个可选包预设 |
| `nervefeyn update [package]` | 更新已安装的包,或按名更新某个具体包 |

使用 `nervefeyn packages list` 查看你的平台上有哪些可选研究连续性包可用、哪些已安装。默认安装只在核心中保留研究必备能力,包括主研究代理忙碌时用于引导的 `/btw` 侧边对话。当某个可选预设直接支撑某个活跃研究工作流时,逐个安装。

## 工具命令

| 命令 | 说明 |
| --- | --- |
| `nervefeyn search status` | 显示 Pi 网络访问状态和配置路径 |

## REPL 热键

在交互式 REPL 中,使用 `/hotkeys` 显示实时键盘映射。默认推理控制为:

| 热键 | 动作 |
| --- | --- |
| `Shift+Tab` | 循环切换思考/推理级别 |
| `Ctrl+T` | 切换思考块可见性 |

## 工作流命令

所有研究工作流斜杠命令都可以直接从 CLI 调用:

```bash
nervefeyn deepresearch "topic"
nervefeyn lit "topic-or-lab"
nervefeyn review artifact.md
nervefeyn audit 2401.12345
nervefeyn replicate "claim"
nervefeyn recipe "fine-tune a small model for math reasoning"
nervefeyn compare "topic"
nervefeyn draft "topic"
```

这等价于启动 REPL 并输入对应斜杠命令。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--prompt "<text>"` | 运行一次提示后退出(一次性模式) |
| `--model <provider/model|provider:model>` | 为该会话强制指定某个非 Pro 模型 |
| `--thinking <level>` | 设置思考级别:`off`、`minimal`、`low`、`medium`、`high`、`xhigh` |
| `--cwd <path>` | 设置所有文件操作的工作目录 |
| `--session-dir <path>` | 设置会话存储目录 |
| `--new-session` | 开启一个新的持久化会话 |
| `--alpha-login` | 登录 alphaXiv 后退出 |
| `--alpha-logout` | 清除 alphaXiv 认证后退出 |
| `--alpha-status` | 显示 alphaXiv 认证状态后退出 |
| `--doctor` | `nervefeyn doctor` 的别名 |
| `--setup-preview` | `nervefeyn setup preview` 的别名 |
