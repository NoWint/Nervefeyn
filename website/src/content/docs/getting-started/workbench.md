---
title: 科研工作台
description: 运行本地 Nervefeyn 科研工作台,获得聊天、产物、笔记本、算力、溯源和设置状态。
section: Getting Started
order: 3
---

科研工作台是 `nervefeyn serve` 背后的本地应用。它为 Nervefeyn 提供一个浏览器化的研究控制平面,同时把应用自有的设置、会话、上传、快照、记忆、OAuth 令牌和算力日志存放在 `~/.nervefeyn/orgs/<org_uuid>/workbench/workspaces/<workspace-id>/` 下。它还会刷新一份 org 级 SQLite 镜像 `~/.nervefeyn/orgs/<org_uuid>/nervefeyn-workbench.db`,用于核心项目、frame、消息、产物、执行、验证、记忆、笔记、批注、读游标、产物文件夹、算力提供商、MCP 授权、记忆分类、例行调度、托管端点和能力设置记录,以及对 Nervefeyn 已在状态中拥有的其余引用型工作台账本的紧凑表信封。算力提供商行包含出口策略和 Modal 环境字段,既有本地数据库会就地升级,连接器账本包含拆分的科学附件、拆分的 MCP 授权和自定义 MCP 资源标识符。研究产物仍是 `outputs/`、`papers/` 和 `notes/` 下的普通工作区文件。

```bash
nervefeyn serve
```

该命令启动一个本地服务器,打印一个带认证的 localhost URL 并打开工作台。该 URL 令牌仅属于该服务器进程。若用于可信本地测试,可运行 `nervefeyn serve --no-auth` 以打印不带令牌的纯 localhost URL。

## 工作台包含什么

- **项目与会话** —— 创建项目、打开已有研究会话、继续 Pi 驱动的聊天,并把项目元数据、frame 行、frame 消息行、frame 回填健康行和运行状态绑定到该工作区。
- **引导上下文** —— 采集领域、目标、工作流、数据工具、瓶颈、权限、所选首个任务、建议专家、建议种子工作流和连接器选择。
- **Nervefeyn Bio Tools** —— 使用 Nervefeyn 自有的科学连接器进行文献检索、精确的 OpenAlex 作品/引用/参考/作者/期刊工作流、精确的 arXiv 检索与批量论文获取、PubMed 文章元数据、PMID/PMCID/DOI 转换、相关文章链接、引文匹配、版权/许可检查、PMC 全文路由、bioRxiv/medRxiv DOI 查询、日期/分类预印本窗口、已发表-预印本链接、资助方/ROR 查询、预印本使用/内容统计、Europe PMC 开放获取全文章节、引文图、作者、期刊、OA 状态、ClinicalTrials.gov 试验检索、NCT 详情记录、资助方项目、入组资格筛选、研究者记录、终点摘要、Grants.gov Search2 机会查询、FDA 标签、不良事件、召回、Drugs@FDA 申请、申请计数、药理分类、仿药等效活性成分集合、ChEMBL 化合物检索、药物适应症与警告、计算的 ADMET 属性、生物活性行、机制、靶点记录、PubChem 化合物/检索/相似性/生物活性/安全性工作流、ChEBI 实体/本体工作流、BindingDB 靶点/化合物工作流、Rhea 反应检索/详情工作流、可编辑 Ketcher 化学绘制种子、基因、BioMart、Ensembl 查询/交叉引用/VEP/同源/序列/重叠工作流、MyGene 批量查询、OLS 本体目录/检索/词条查询、QuickGO 注释、UniProt 条目获取、Reactome 通路映射、CellGuide、PanglaoDB 标记基因与基因到细胞类型工作流、精确 Antibody Registry 抗体/RRID/目录/统计工作流、试剂、细胞类型、代谢组学、基因组 track、UCSC 精确 track/染色体/保守性/TFBS 工作流、UniBind TF-DNA 结合、KEGG 条目/检索/链接/ID 转换工作流、InterPro/Pfam 精确结构域结构、条目、clan、family 蛋白/蛋白质组模式、Human Protein Atlas 精确基因/检索模式、STRING 精确 ID 映射、网络、相似性和最佳命中工作流、可购买 ZINC 化合物、精确 gnomAD/CADD/ClinVar/dbSNP 变异工作流、GWAS Catalog 精确关联/研究/性状/SNP 工作流、eQTL Catalogue 精确数据集与关联工作流、PheWeb/FinnGen PheWAS 工作流、GTEx 数据集/组织/样本/基因/表达/eQTL 工作流、组织/蛋白图谱、表达、蛋白,预测结构、结构、EM 图、复合物、相互作用,精确 ENCODE/JASPAR/UniBind 调控工作流(实验、生物样本、文件、矩阵、物种/分类/集合/发布、数据集和区域 TFBS),精确 ArrayExpress/GEO/MetaboLights/MGnify/PRIDE 组学归档工作流(实验、样本、文件、分析、项目和蛋白证据),宏基因组、通路、化学本体、化学、结合、反应,精确 Rfam RNA 家族元数据/登录号/比对/模型/树/区域/结构/检索工作流,cBioPortal 研究/详情/突变频率/突变/CNA/临床属性工作流,DepMap 模型/基因/依赖工作流,CIViC 基因/变异/证据/断言/画像/疾病/治疗工作流,ClinGen 有效性/剂量/可操作性/分类工作流,Open Targets 疾病-药物/疾病-靶点/药物/检索工作流,癌症策展、癌症组学、人类遗传学和靶点发现工作。
- **产物与预览** —— 在一个产物面板中浏览 outputs、papers、notes、plans、数据集、生成报告、JSON/JSONL、CSV、PDF、图片、音频、视频、XLSX 工作簿、Jupyter 笔记本、LaTeX、KET/RXN/CDXML/CXSMILES/Molfile/SDF/SMILES 化学产物、蛋白、比对、基因组、变异、树、张量和已保存快照。文件暴露本地工作区产物、SSH/BYOC 算力主机和来自 Nervefeyn 自有主机与凭据状态的云存储桶。HTML 报告支持在沙箱预览中进行元素级批注,捕获选择器/文本并把已保存徽章附加到产物批注账本。Pi 聊天写入的产物即便文件名使用了不同的 slug,也会通过快照/输出溯源保持与产生它的运行和项目关联。产物笔记打开面向目标的编辑和预览弹窗,由 Nervefeyn 的目标笔记账本支撑;Customize > Storage 打开云凭据弹窗;Cloud export 打开目标与目的地弹窗并附带自有审计日志。
- **版本与血缘** —— 查看产物版本、校验和、生产者记录、上下游链接、批注和执行证据。
- **笔记本与算力** —— 运行本地 Python、R 和 Bash 单元、查看持久化会话内核、审阅笔记本执行日志、追踪已配置的算力提供商和作业。
- **设置与资源** —— 查看专家、技能、frame 记录、frame 消息记录、frame 回填健康记录、watch 例行记录、技能来源/许可记录、设置决策记录、评审反馈记录、算力轮询租约记录、Pi 命令、连接器、记忆分类、权限、算力、网络、存储、凭据、用量和通用运行时状态。
- **脱敏凭据状态** —— 查看哪些提供商凭据已通过设置、环境变量或 Pi 认证存储配置,且不暴露原始值。

## 独立边界

工作台不需要安装另一个本地应用。其可见连接器是 Nervefeyn 自有资源(如 Nervefeyn Bio Tools),其持久应用记录存放在 Nervefeyn 当前本地 org 下的 `~/.nervefeyn/orgs/<org_uuid>/workbench` 以及自有 org 数据库 `~/.nervefeyn/orgs/<org_uuid>/nervefeyn-workbench.db` 中,而生成的研究产物保留在当前工作区。

仅用于调试的引用检视可由开发者通过显式环境配置启用,但常规的引导、聊天、设置、连接器、产物、笔记本、算力、记忆和溯源路径均为 Nervefeyn 自有。

## 设置状态

首次运行的工作台引导会创建一个 Nervefeyn 项目和会话、选择合适的专家、记录所选设置范围、推荐种子工作流,并存入源自用户自身研究上下文的意图声明。这些意图声明让后续会话能够理解用户的设置选择,而无需硬编码对某参考产品的依赖。

技能来源行和许可同意行是 Nervefeyn 自有本地技能包的审计记录,并非对外部市场服务的依赖。

Watch 例行行是 `/watch` 计划和基线的审计记录。当调度工具不可用时,它们会以 blocked 原因保持禁用状态,工作台不会假装存在某个周期性作业。

设置决策行记录公开科研 API 联系邮箱同意和提供商凭据就绪情况。联系邮箱行使用已配置的 NCBI/Entrez/Crossref mailto 环境变量,凭据询问行则来自脱敏后的提供商可用性,而不存储原始密钥值。

项目行暴露 Nervefeyn 的持久项目主线:本地所有者 ID、创建和更新时间戳、上下文文本、是否启用记忆、上传 frame ID、运行 slug、产物路径、会话计数和产物计数。

评审反馈行是用户请求的 reviewer 通过记录的审计记录。它们以 frame、用户和反馈类型为键,并存入有界上下文,如被评审的产物路径和 reviewer 响应 ID。

Frame 行是 Nervefeyn 自有聊天会话、产物运行和项目上传区的控制平面记录。它们暴露根 frame ID、项目 ID、代理/委派名、状态、有界输入/输出/上下文 JSON、模型与算力设置、产物引用、时间戳,以及通过本地状态表达的来源所有权。

Frame 消息行是持久化聊天轮次的审计记录。它们派生自 Nervefeyn 会话文件,通过本地工作台状态暴露 frame ID、消息索引、UUID、角色、状态、时间戳和结构化消息 JSON。

Frame 回填健康行在干净工作区中为空,仅当 Nervefeyn 自身状态记录到一次历史 frame 导入失败时才出现。它们暴露 frame ID、失败计数、终态、原因和更新时间戳,不依赖另一个本地应用。

算力轮询租约行是活跃算力作业和待处理算力终止的当前审计记录。它们镜像单写者轮询守护的形状,在没有算力轮询工作时消失。

凭据行是可用性记录,而非密钥转储。它们指向 Nervefeyn 设置、提供商环境变量或 Pi 认证存储,只存储脱敏引用。

## 输出位置

工作台与 CLI 遵循相同的输出约定:

- 研究产物放入 `outputs/`
- 论文式草稿放入 `papers/`
- 会话笔记放入 `notes/`
- 长运行计划放入 `outputs/.plans/`
- 按时间顺序的实验笔记本是 `CHANGELOG.md`

生成报告和溯源文件仍是普通工作区文件,因此可以从应用、终端、编辑器或 git 中查看。

工作台控制平面记录(如聊天会话 JSON、设置、记忆行、批注、OAuth 令牌引用、上传、笔记本执行日志、Modal 作业脚本、托管 Python/R 环境、产物快照和云导出审计日志)存放在 `~/.nervefeyn/orgs/<org_uuid>/workbench/workspaces/<workspace-id>/` 下。被服务的工作台还会刷新 `~/.nervefeyn/orgs/<org_uuid>/nervefeyn-workbench.db`,它镜像项目、frame、frame 消息、产物、产物版本、执行日志、验证检查、记忆和笔记的核心表,以及批注、frame 读游标、产物文件夹、算力提供商、MCP 工具授权、记忆分类、例行调度、托管端点和能力设置的控制平面表。该数据库还包含 Nervefeyn 其他自有引用型账本(如代理、技能、凭据、OAuth 令牌、事件、通知、会话活动、声明、主机日志、市场行和归档行)的物理表信封。既有的 home 级 `~/.nervefeyn/workbench` 记录和 checkout 本地 `.nervefeyn/workbench` 记录会在首次访问时被复制到该应用数据位置。
