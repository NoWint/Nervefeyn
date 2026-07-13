---
title: 发布说明
description: Nervefeyn 发布的用户面变更日志。
section: Reference
order: 4
---

本页汇总近期 Nervefeyn 发布中的变更。GitHub release 使用仓库 `RELEASES.md` 文件中相同的版本特定说明。

## Unreleased

### 包栈

- 把 `pi-btw` 加入 Nervefeyn 默认 Pi 包栈,使 `/btw` 侧边对话在长时间研究轮次中可用,无需单独安装包。

### 科研工作台

- 把 `nervefeyn serve` 扩展为独立开放科研工作台界面,带 Nervefeyn 自有的项目/会话/帧状态、项目元数据、Pi 聊天、帧消息行、帧回填健康记录、Nervefeyn Bio Tools、笔记本、算力清单、产物、血缘、溯源、设置、记忆分类、引导意图上下文,以及脱敏后的凭据可用性台账。
- 新增 Nervefeyn 自有的 `~/.nervefeyn/active-org.json` 和 `~/.nervefeyn/orgs/<org_uuid>/` 应用主轴,使本地工作台拥有组织级 home 结构,而非扁平 scratch 目录。
- 在 `~/.nervefeyn/orgs/<org_uuid>/feynman-workbench.db` 处新增 Nervefeyn 自有的组织数据库,从本地工作台状态刷新,包含参考形态的 project、frame、message、artifact、artifact-version、execution、verification、memory、note、annotation、read-cursor、artifact-folder、compute-provider、MCP-grant、memory-category、routine-schedule、managed-endpoint 和 capability-setting 表。
- 在该数据库中为剩余 Nervefeyn 已在状态中拥有的参考形态工作台账加入了紧凑表封套,包括 agents、skills、credentials、OAuth tokens、events、notifications、session activity、claims、host logs、marketplace rows 和 archive rows。
- 组织数据库中的 compute-provider 行现在持久化 egress 策略和 Modal 环境字段,包括对现有本地数据库的就地升级。拆分的科学连接器附件、拆分的 MCP 授权以及自定义 MCP 资源标识符通过 Nervefeyn 自有的台账行镜像同步。
- 新增 Nervefeyn 自有的化学草图工具,在 `outputs/chemistry-sketches/` 下为本地 Ketcher 编辑器创建可编辑的 KET、Molfile、RXN 或 SMILES 产物,而不需要参考应用 MCP 运行时。
- KET、RXN、CDXML 和 CXSMILES 化学产物现在作为一等分子预览在工作台中打开。Nervefeyn 把这些扫描器格式标记为可预览文本产物,展示轻量化学元数据,把草图文件路由到本地 Ketcher 编辑器,并避免通过 RDKit 渲染 Ketcher 专有格式。
- 把应用拥有的工作台状态迁移到 `~/.nervefeyn/orgs/<org_uuid>/workbench/workspaces/<workspace-id>/`,包括工作台设置、聊天会话、上传、记忆、批注、OAuth 令牌引用、笔记本日志、Modal 作业脚本、托管 Python/R 环境、产物快照和云导出审计日志。首次访问时会把既有 home 级 `~/.nervefeyn/workbench` 记录和 checkout 本地 `.nervefeyn/workbench` 记录向前复制。
- 新增 Nervefeyn 自有的凭据与 setup-intent 状态,使工作台能展示哪些研究能力可用,而无需暴露原始密钥或在运行时要求另一个本地应用。
- 新增 Nervefeyn 自有的技能来源与许可同意台账,使工作台能审计其打包的科研技能包,而不依赖外部 marketplace 服务。
- 新增 Nervefeyn 自有的 watch 例行台账,使 `/watch` 计划和基线在工作台中作为真实的已调度或阻塞例行状态出现。
- 新增 Nervefeyn 自有的联系邮箱与凭据询问决策台账,使公开数据库联系同意和提供商凭据就绪状态可审计,而不暴露原始凭据值。
- 新增 Nervefeyn 自有的算力轮询租约行,使活跃算力作业和待终止作业暴露与科研工作台控制平面相同的单写者轮询守卫形态。
- 新增 Nervefeyn 自有的评审反馈行,使用户请求的 reviewer 轮次可按帧、类型、模型、响应 ID 和有界上下文快照审计。
- 新增 Nervefeyn 自有的帧行,使项目、聊天会话、产物运行和上传区通过本地状态暴露一等控制平面帧主轴。
- 新增 Nervefeyn 自有的项目元数据行,带本地 owner、创建/更新时间戳、上下文、记忆状态和 upload-frame 关联。
- 新增 Nervefeyn 自有的帧消息行,使持久化的聊天轮次可按帧 ID、消息索引、UUID、角色、状态和结构化消息 JSON 审计。
- 新增 Nervefeyn 自有的帧回填健康记录,使失败的历史帧导入可被追踪,而不会在干净工作区中虚构失败。
- 聊天产生的产物现在按快照/输出溯源附加到产生它的会话和项目,使 Run 和 Project 文件范围、表头指标、产物文件夹、版本和验证证据一致,即使文件 slug 与聊天帧 ID 不同。
- 文件现在为本地工作区产物、SSH/BYOC 算力主机以及派生自 Nervefeyn 自有算力与凭据状态的云存储桶显示主机选择器。
- HTML 报告预览现在支持沙箱 iframe 内的元素级批注,包括选择器/文本捕获、保存徽章,以及与文本、图片和 PDF 锚点相同的产物批注/精修路径。
- 产物笔记现在在工作台模态中打开,带目标上下文、既有笔记数、增/改/删控件、Cmd/Ctrl+Enter 保存、笔记预览和 Open artifact 导航,由 Nervefeyn 自有的目标-笔记台账支撑。
- 云存储现在从 Customize > Storage 打开工作台模态,展示凭据支撑的 S3/GCS/Azure/local 目标、已配置或缺失状态、目标详情、连接引用反馈、删除和 Credentials 导航动作。
- 产物云导出现在打开工作台模态,展示已配置和缺失的存储目标,允许用户选择目标路径,并通过 Nervefeyn 自有的云导出审计日志记录导出。
- 扩展 Nervefeyn Bio Tools,加入免登录的 KEGG `link:` 和 `conv:` 模式,用于批量通路/反应/数据库交叉链接和外部 ID 转换,包括缺失 ID 报告和端点溯源。
- 扩展 Nervefeyn Bio Tools,加入免登录的 PanglaoDB 支持,用于按细胞类型或基因符号策划的单细胞标记基因,包括规范标记过滤器、器官/物种上下文、别名和灵敏度/特异度评分。
- 扩展 Nervefeyn Bio Tools,加入免登录的公开数据源:AlphaFold DB 预测结构、ArrayExpress/BioStudies 功能基因组学研究、MGnify 宏基因组研究、JASPAR 转录因子矩阵和 MyGene.info 基因注释。
- 扩展 Nervefeyn Bio Tools,加入更丰富的免登录 PubMed 支持:文章元数据、PMID/PMCID/DOI 转换、相关文章和 PMC 链接、引文匹配、版权/许可检查,以及 PMC 全文路由(带分节片段)。
- 扩展 Nervefeyn Bio Tools,加入更丰富的免登录 ClinicalTrials.gov 支持:NCT 详情记录、资助方特定试验项目、入组资格筛选、研究者/联系发现和终点摘要。
- 扩展 Nervefeyn Bio Tools,加入更丰富的免登录 bioRxiv 和 medRxiv 支持:预印本 DOI 查询、日期/分类窗口、已发表-预印本链接、资助方/ROR 查询、bioRxiv 内容统计和服务器特定使用统计。
- 扩展 Nervefeyn Bio Tools,加入免登录的 EBI 结构与交互数据源:ChEBI 化合物和本体记录、Complex Portal 大分子复合物、IntAct 分子交互和 EMDB 冷冻电镜图谱元数据。
- 扩展 Nervefeyn Bio Tools,加入免登录的公开图谱与监管数据源:openFDA 药品标签、不良事件、召回、Drugs@FDA 申请、申请计数聚合、药理学类别、仿制药等效活性成分集合、Human Protein Atlas 基因/蛋白表达行和 eQTL Catalogue 变异-基因关联行。
- 扩展 Nervefeyn Bio Tools,加入更丰富的免登录 ChEMBL 支持:化合物名/SMILES 相似性和子结构搜索、药物适应症和警告、计算的 ADMET 性质、配体-靶点生物活性过滤、机制记录和靶点/基因搜索。
- 扩展 Nervefeyn Bio Tools,加入免登录的 GWAS Catalog 支持:策划的 SNP-性状关联、EFO 性状搜索、研究登录号、PMID、p 值、映射基因和血统/样本元数据。
- 扩展 Nervefeyn Bio Tools,加入精确的人类遗传学模式:GWAS Catalog 关联、性状、研究和 SNP 详情查询;eQTL Catalogue 数据集和数据集范围关联查询;以及 PheWeb/FinnGen 变异、基因、表型列表和表型搜索 PheWAS 工作流。
- 扩展 Nervefeyn Bio Tools,加入精确的文献模式:OpenAlex 作品搜索/详情、引用、参考、作者搜索/详情、期刊元数据,以及 arXiv 检索加批量论文获取。
- 扩展 Nervefeyn Bio Tools,加入精确的蛋白注释模式:InterPro/Pfam 结构域架构、条目搜索/详情、Pfam clan 和 family 成员查询、Human Protein Atlas 基因/搜索记录和 STRING 映射/网络/相似性工作流。
- 扩展 Nervefeyn Bio Tools,加入精确的研究资源模式:Antibody Registry 搜索/详情/目录/统计工作流,以及 Grants.gov Search2 机会查询(按关键词、机会号、ALN、机构、状态、资格、资助类别和资助工具)。
- 扩展 Nervefeyn Bio Tools,加入精确的 Rfam RNA 模式:家族元数据、登录号/ID 转换、种子比对、协方差模型、系统发育树、序列区域、PDB 结构映射和批量序列搜索。
- 扩展 Nervefeyn Bio Tools,加入精确的组学归档模式:ArrayExpress 实验/文件/样本、GEO series 搜索/详情、MetaboLights 研究/文件/数据文件、MGnify 研究/分析和 PRIDE 项目/蛋白证据工作流。
- 扩展 Nervefeyn Bio Tools,加入精确的调控模式:ENCODE 实验/生物样本/文件搜索与详情记录、JASPAR 矩阵/版本/目录工作流,以及通过 UCSC hub 数据的 UniBind 数据集加区域 TFBS 工作流。
- 扩展 Nervefeyn Bio Tools,加入精确的变异模式:gnomAD 短变异搜索/详情、基因变异、约束、区域变异、liftover、ClinVar 镜像变异、结构变异、线粒体变异、CADD 变异/位置/范围评分、直接 ClinVar 搜索/登录号/rsID 记录和 dbSNP rsID/区域查询。
- 扩展 Nervefeyn Bio Tools,加入免登录的 BioMart 支持:Ensembl mart 发现、数据集列表、通用属性、过滤器和通过 Nervefeyn 内置数据库搜索工具的有约束基因表获取。
- 扩展 Nervefeyn Bio Tools,加入免登录的 MetaboLights 支持:公开代谢组学研究元数据、MTBLS 登录号、测定上下文、研究文件夹文件和公开数据文件列表。
- 扩展 Nervefeyn Bio Tools,加入免登录的 UCSC Genome Browser 支持:组装发现、track 搜索、染色体大小、有界基因组区域 track 行、保守性评分摘要和 ENCODE TFBS 簇。
- 扩展 Nervefeyn Bio Tools,加入精确的基因组模式:Ensembl 查询、交叉引用、VEP 变异后果摘要、同源、序列和重叠区域获取,加上 UCSC `ucsc_list_tracks`、`ucsc_chrom_sizes`、`ucsc_track_data`、`ucsc_conservation` 和 `ucsc_tfbs_clusters` 查询名。
- 扩展 Nervefeyn Bio Tools,加入免登录的 UniBind 支持:直接 TF-DNA 交互数据集搜索、精确数据集模型元数据、BED/FASTA/plot 模型链接和 UCSC hub 支撑的 TFBS 区域行。
- 扩展 Nervefeyn Bio Tools,加入 Europe PMC 开放获取全文分节查询(支持 PMCID/PMID 输入),返回分节清单、有界片段、图/表/引用计数,以及明确的非开放获取或缺失全文状态,而不暴露原始 XML。
- 扩展 Nervefeyn Bio Tools,加入免登录的 ZINC 支持:按 ZINC ID 查询可购化合物、SMILES 精确或类似物搜索、供应商目录代码解析、随机筛选集采样和 3D tranche 仓库位置。
- 扩展 Nervefeyn Bio Tools,加入 PubChem 化合物搜索/详情、SMILES 相似性、生物测定摘要和 GHS 安全模式;ChEBI 搜索/实体/本体模式;BindingDB 靶点-配体和化合物-靶点模式;以及 Rhea 反应搜索/详情模式。
- 扩展 Nervefeyn Bio Tools,加入 CIViC 基因/变异/证据/断言/分子谱/疾病/疗法模式、ClinGen 有效性/剂量/可操作性/变异分类模式,以及 Open Targets 有界 GraphQL 兼容搜索加疾病-药物、疾病-靶点和药物封装模式。
- 扩展 Nervefeyn Bio Tools,加入 GTEx 数据集、组织-位点、样本、基因分辨率、表达、高表达基因和 eQTL 模式,加上精确的 PanglaoDB 标记基因、基因到细胞类型和 options 模式。
- 扩展 Nervefeyn Bio Tools,加入精确的基因/本体模式:MyGene 批量查询、OLS 本体目录/搜索/词条查询、QuickGO GO 注释、UniProt TSV/FASTA/TXT 条目获取、Reactome 通路映射和 KEGG 条目/搜索/链接/ID 转换工作流。
- 扩展 Nervefeyn Bio Tools,加入免登录的 CellGuide 支持:Cell Ontology 细胞类型查询、标记基因、组织出现和 CELLxGENE 来源集合。
- 扩展 Nervefeyn Bio Tools,加入免登录的 Antibody Registry 支持:抗体 RRID 搜索、目录号查询、供应商过滤、注册统计和按抗体详情记录。
- 扩展 Nervefeyn Bio Tools,加入凭据感知的 OpenAlex 支持:学术作品搜索、作品详情、DOI claimant 解析、入站引用、出站参考、作者、来源/期刊、OA 状态和速率限制诊断。
- 扩展 Nervefeyn Bio Tools,加入 cBioPortal 癌症模型对齐模式:研究搜索/详情、临床属性、按基因突变行、跨研究突变频率和离散 CNA 事件,加上 DepMap 参考名模式:模型列表/详情/搜索、基因搜索和 CRISPR 依赖行。
- 为音频、视频、XLSX 电子表格、Jupyter 笔记本和 LaTeX/TeX 产物新增原生工作台预览,与既有的报告、JSON、PDF、基因组、比对、分子、结构、树和张量查看器并列。

### 网站与文档

- 为独立工作台路径新增科研工作台指南、首页工作台区块、命令参考条目、设置说明和 README 措辞。
- 修正网站文档中 npm install 的 Node.js 范围,使其与包 engine 范围一致。

## v0.3.5 - 2026-06-28

### Pi 运行时

- 把内置 Pi 运行时包刷新到 `0.80.2`,恢复 `@earendil-works/pi-ai/compat` 入口点和扩展加载器别名,供 `pi-web-access` 等可选包使用(#183)。
- Nervefeyn 的包安装器现在先从当前规范的 `@earendil-works/*` 运行时包派生旧的 `@mariozechner/*` 别名版本,这样陈旧的旧包根不会在 `nervefeyn update` 期间种入旧 Pi peer 版本。
- 更新 Pi TUI 补丁器以适配当前上游溢出检查布局,使过宽的渲染行被裁剪而非崩溃会话渲染器。

### 验证

- 为当前 Pi TUI 溢出块、发布说明兼容性覆盖以及从当前运行时元数据派生旧 Pi 别名新增回归测试。

## v0.3.4 - 2026-06-12

### 研究

- 新增 `nervefeyn paper <id-or-title>`,用于跨 OpenAlex、DOI、arXiv/alphaXiv 和 Europe PMC 的单篇论文访问解析,带可选的来源特定文本获取和有界产物(省略原始全文正文)。
- 新增 `nervefeyn rank <topic>`,带 PaperRank 评分,用于先读分流:透明的引用/方法/可复现性证据、图谱上下文、可选 critique 或模型综合、有界 JSONL 输出和溯源。
- 新增 `--reproduction-notes`,使已完成的复现结果与计划的复现检查分开记录。提供复现笔记时,PaperRank 写出复现台账、笔记模板和复现计划;普通先读运行不把这些额外产物写入默认输出。

### 模型目录

- 修正研究模型选择,使推荐/默认模型路径、陈旧设置、模型列表和显式 CLI 覆盖都拒绝 Pro 级模型 ID,并使仅 OpenAI 安装停留在 Pi 暴露的最新可用非 Pro GPT 模型上。
- 新增 PaperRank 模型选择溯源,使 CLI 输出、JSON 输出、生成的综合 Markdown 和 rank 溯源都标明实际综合模型以及它来自推荐路径还是显式覆盖。
- 更新 setup/configuration 示例和 LiteLLM 回退提示,避免 GPT-4 时代和高端层默认值。

### Pi 运行时

- 把内置 Pi 运行时包刷新到 `0.79.10` 并更新生产依赖覆盖,使刷新后 `npm audit --omit=dev` 干净。这继承了 Pi 的 compaction-event 上下文、精确版本更新流程、嵌套仓库 `find` 修复和 OpenAI 兼容 `reasoning_details` 流式修复。
- 修复长斜杠工作流名溢出自定义表头时的会话重命名崩溃。表头工作流名现在在渲染描述前,在宽和窄布局中都被裁剪到其列宽。
- 移除旧的 `generative-ui`、`ui` 和 `all-extras` 可选包/更新目标。可选包现在保持逐一安装并聚焦研究连续性。

## v0.2.58 - 2026-05-16

### 可选包

- 新增 `hindsight` 可选预设,安装 `@luxusai/pi-hindsight`,为用户提供通往 Hindsight 支撑研究连续性记忆的一等路径,而无需加入默认安装。
- 新增 `hindsight` 和 `pi-hindsight` 更新别名,使 `nervefeyn update hindsight` 解析到同一包源。
- 更新包栈和 setup 文档,把 Hindsight 作为可选记忆面展示,并指出它需要 Hindsight 服务器或 Hindsight Cloud 账户。

### 验证

- 为新增可选预设、研究连续性包拷贝、移除的批量/UI 预设和更新别名新增回归覆盖。

## v0.2.57 - 2026-05-15

### 运行时可靠性

- 修复 macOS/iTerm profile 下交互式提示输入颜色,这些 profile 中键入的文本继承了黑色终端前景,与 Nervefeyn 的暗色编辑器背景冲突。
- 通过共享 Pi 补丁模块应用编辑器前景/背景补丁,使包本地安装和 vendored 运行时归档保持同步。

### 验证

- 为补丁过的 Pi 编辑器/主题源变换(包括幂等性)新增回归覆盖。

## v0.2.56 - 2026-05-13

### 安全

- 把 `protobufjs` 依赖覆盖从 `7.5.5` 更新到 `7.5.8`,它拉入打了补丁的 `@protobufjs/utf8` 发布,清除当前生产审计公告集。

### 验证

- 在覆盖刷新后重跑根生产审计,确认它报告零漏洞。

## v0.2.55 - 2026-05-13

### 模型目录

- 更新 Nervefeyn 的研究模型偏好顺序,使最新可用非 Pro OpenAI GPT 模型能被推荐、自动选择并排在较旧的 OpenAI GPT 模型之前。
- 当 Pi 直接暴露 Codex 时,把同样的最新可用非 Pro GPT 偏好应用到 OpenAI Codex。
- 更新首次运行/默认 setup 偏好,使仅 OpenAI 安装在可用时选择最新可用非 Pro OpenAI GPT 模型。

### 验证

- 为最新可用非 Pro OpenAI 推荐、模型排序和默认 setup 种子新增回归覆盖。

## v0.2.54 - 2026-05-11

### 运行时可靠性

- 修复把包依赖 hoist 到 Nervefeyn 包根之外的打包 npm 安装。Nervefeyn 现在在解析 Pi 时回退到其 vendored `.nervefeyn/npm` 运行时工作区,使 `nervefeyn doctor` 和提示启动能从干净的打包安装工作。
- 把运行时 node-module 补丁应用到包本地依赖和 vendored 运行时工作区两者。

### 验证

- 为打包安装 Pi 路径解析和 vendored 运行时补丁新增回归覆盖。
- 新增隔离的打包安装 E2E,把生成的 tarball 安装到干净的前缀/home 并从该安装启动 Nervefeyn。

## v0.2.53 - 2026-05-11

### 运行时可靠性

- 再次加固 alphaXiv 检索回退:若移除的 MCP 检索工具和 `discover_papers` 都不可用,`alpha search` 现在回退到公开 alphaXiv fast REST 检索端点。
- 给 Pi 扩展加载器打补丁,把 `@mariozechner/*` 和 `@earendil-works/*` Pi 运行时导入都别名到 Nervefeyn 已初始化的内置运行时,防止展开工具输出时的混合命名空间 TUI/主题崩溃。
- 把扩展加载器补丁应用到 vendored 运行时归档路径,不仅是本地开发 `node_modules` 路径。

### 验证

- 为升级旧 `discover_papers`-only alphaXiv 补丁和双命名空间 Pi 运行时别名新增回归覆盖。

## v0.2.52 - 2026-05-09

### 运行时可靠性

- 在包更新前种入内置运行时包,使缺失的未声明扩展依赖(如 `typebox`)在扩展加载前被修复。
- 当 Nervefeyn 必须直接运行 npm 时,把 Pi 的 `typebox` 运行时包放在已安装 Pi 包旁。
- 把新的 `@earendil-works/*` Pi 运行时包命名空间放在旧 `@mariozechner/*` 命名空间旁,使更新的 Pi 扩展(如 `pi-btw` 和 `pi-markdown-preview`)能加载。
- 给内置 alpha-hub 运行时中的 alphaXiv 检索打补丁,在 alphaXiv 不再暴露旧检索工具名时回退到更新的 `discover_papers` MCP 工具。
- 加固模型工具调用处理以应对常见别名错误:`search_web` 现在映射到 `web_search`,裸 `fetch` / `WebFetch` / `read_url_content` 映射到 `fetch_content`(数组 URL 被规范化)。
- 修复研究表头中的 Windows docker 探测,使 `cmd.exe` 不再因 Unix 专有 `/dev/null` 重定向发出本地化乱码。

### 工作流提示

- 为每个工作流提示加入共享的工具纪律块,使 lead 代理在工作流特定指令前看到规范工具名。

### 验证

- 为 alphaXiv 检索回退、Pi 工具别名规范化、内置运行时依赖安装和提示工具纪律新增回归覆盖。

## v0.2.51 - 2026-05-09

### 包管理器

- 加固 Pi 包安装与更新,使 peer-only Pi 运行时包被物化到 Nervefeyn 的 npm 前缀中已安装 Pi 包旁。
- 这防止可选或旧 Pi 包在扩展加载时失败,当它们导入 Nervefeyn 使用旧 peer 依赖模式时 npm 未安装的 Pi 运行时模块。

### 验证

- 为在 Pi npm 包旁安装 Pi 运行时 peer 新增包管理器覆盖。

## v0.2.50 - 2026-05-09

### 技能安装器

- 为独立技能安装新增显式 Codex 技能目标:macOS/Linux 上 `--codex`,Windows 上 `-Scope Codex`。
- 保持既有默认/用户安装行为兼容,同时记录 Codex、仓库本地 Claude/agent 和 OpenCode 目标路径。

### 验证

- 为 Codex 目标和目标特定文档新增安装器覆盖。

## v0.2.49 - 2026-05-07

### 网站

- 把网站构建栈更新到打过补丁的 Astro 6/Vite 7。
- 把文档内容集合迁移到 Astro 当前 content-layer 配置。

### 验证

- 网站构建、类型检查、lint 和生产审计通过。
- 网站升级后根构建、类型检查、完整测试、包 dry-run、原生 bundle 构建和生产审计通过。

## v0.2.48 - 2026-05-07

### 修复

- 恢复 Nervefeyn CLI 和 npm 包对 Node.js 24 的支持。
- 把默认 Pi 包集精简到核心 AI 研究必备:alphaXiv 访问、subagents、文档解析和网络访问。
- 把 memory 和 session search 移出默认安装路径,使可选包失败不会阻塞首次启动。
- 保持 session search 限制在 Node.js 22.x,因为其上游 sqlite 依赖仍依赖原生预构建覆盖。
- 把 TypeScript 工具链升级到 6.0 并为其显式 `rootDir` 要求更新构建配置。

### 文档

- 更新包栈、setup、install 和 session-search 文档,区分核心研究包与可选附加包。

### 验证

- 完整本地测试通过:157/157。
- 类型检查、根构建、网站构建、原生 bundle 构建、生产 `npm audit --omit=dev` 和包 dry-run 通过。
- 包 dry-run 验证内置运行时工作区默认排除 memory 和 session search。

## v0.2.47 - 2026-05-07

### 文档

- 澄清 Nervefeyn 的包、扩展和技能接线遵循 Pi 上游包模型。
- 从 README 和网站文档链接 Hugging Face Hub API 和环境变量文档。
- 澄清 Hugging Face 文件读取在下载前拒绝明显的模型权重、归档和数据集分片。

### 验证

- 收紧 Hugging Face 二进制文件拒绝回归测试。
- 完整本地测试通过:157/157。
- 类型检查、根构建、网站构建和生产 `npm audit --omit=dev` 通过。

## v0.2.46 - 2026-05-07

### 更新

- 新增 `/recipe` 工作流,用于由论文、数据集、文档、实现路径和验证状态支撑的排序 ML 训练配方。
- 新增只读 Hugging Face Hub 检视工具,用于数据集元数据、仓库文件列表和小文本文件读取。这些支持配方和复现接地,无需 Hub 写权限,并在下载前拒绝明显的权重/归档/分片读取。
- 更新 `/replicate`,使 ML 重目标在执行规划前执行一次配方抽取轮次。

### 文档

- 为 `/recipe` 工作流和 Hugging Face Hub 工具新增网站文档。
- 更新 README、quickstart、命令参考、代理文档、复现文档和包栈文档以覆盖新工作流和工具。

### 验证

- 为 Hugging Face 工具注册、端点格式化、认证头、文件列表限制、截断和二进制文件拒绝新增单元覆盖。
- 完整本地测试通过:157/157。
- 类型检查、根构建、网站构建、CLI 帮助和实时 Hugging Face 端点冒烟检查通过。

## v0.2.45 - 2026-05-07

### 更新

- 把内置 Pi 运行时包更新到 `@mariozechner/pi-ai@0.73.0` 和 `@mariozechner/pi-coding-agent@0.73.0`。
- 为 setup/onboarding 提示面把 `@clack/prompts` 更新到 `1.3.0`。

### 验证

- 完整本地测试通过:154/154。
- 类型检查、根构建、网站构建、`nervefeyn doctor` 和生产 `npm audit --omit=dev` 通过。
- JSONL RPC 冒烟通过,带 `get_state` 和一个返回 `FEYNMAN_RPC_OK` 的 `bash` 命令。
- 发布 CI 发布了 npm `0.2.45`,构建了所有原生 bundle,并创建了 GitHub release。

## v0.2.44 - 2026-05-06

### 修复

- 更新传递依赖覆盖 pin 到打过补丁的版本,使生产 `npm audit` 报告零漏洞。
- 这移除了 `basic-ftp`、`fast-xml-parser`、`hono` 和 `ip-address` 中的公告,同时把依赖变更限制在既有传递包。

### 验证

- 生产 `npm audit --omit=dev` 通过,零漏洞。
- 完整本地测试通过:154/154。
- 类型检查、根构建、网站构建和 `nervefeyn doctor` 通过。

## v0.2.43 - 2026-05-06

### 修复

- 在 Nervefeyn 写入网络检索提供商配置后,把 `.nervefeyn/web-search.json` 权限限制为仅用户(`0600`)。
- 这保护存储的网络检索 API 密钥(如 Exa、Perplexity 和 Gemini 密钥)免受宽松的本地 umask 影响。

### 验证

- 为保存的网络检索配置权限新增 POSIX 回归覆盖。
- 完整本地测试通过:154/154。
- 类型检查和构建通过。

## v0.2.42 - 2026-05-06

### 修复

- 通过把 Pi 的项目 npm 安装路径补丁为使用 peer 依赖兼容安装,修复带 `.nervefeyn/settings.json` 包条目的项目中的运行时 RPC 启动。
- 这防止项目范围包同步在 RPC 会话启动前在 `@aliou/pi-processes` 等包上失败。

### 验证

- 为嵌入式 Pi 包管理器补丁新增回归覆盖。
- 真实 `v0.2.41` 发布 RPC 测试复现了本发布修复的缺失项目包安装失败。

## v0.2.41 - 2026-05-06

### 修复

- 修复启动包种入,使拷贝的内置包被视为已满足,而非落入重复的全局 npm 安装。
- 在交互式 setup 报告缺失包前种入内置包,避免独立 bundle 已有运行时工作区时不必要的首次运行包提示。
- 把支持的 Node.js 运行时限制为 Node 20.19.x 到 Node 22.x,因为 sqlite 支撑的 Pi 包(如 session search)在 Node 24 下不可靠。
- 更新发布 CI 以用 Node 22 构建、测试、发布和打包原生 bundle。

### 文档

- 新增研究专用生物医学文献综述指南,带 PICO/PICOS 框架、证据类型分离、隐私边界和非临床建议措辞。
- 更新 npm install 文档以展示新的支持 Node engine 范围。

### 验证

- 完整本地测试通过:151/151。
- 类型检查和根构建通过。

## v0.2.40 - 2026-04-19

### 修复

- 修复本地模型网络检索失败,模型调用不存在的检索别名(如 `google:search`);Nervefeyn 现在在可用时把这些别名映射到 Pi 真实的 `web_search` 工具。
- 授予内置 researcher 和 verifier 代理访问 Pi web-access 工具(`web_search`、`fetch_content` 和 `get_search_content`),使其提示和允许工具匹配。
- 使 `nervefeyn doctor` 和 `nervefeyn search status` 明确显示 `web-search.json` 何时未创建以及如何初始化它。
- 不再把过期 OAuth 凭据视为已认证模型可用性,使 `doctor`、`model list` 和 onboarding 引导用户重新登录,而非在聊天中失败。
- 新增包工作区 setup 锁,使并发 Nervefeyn 调用在恢复 `.nervefeyn/npm` 时不竞争。

### 验证

- 完整本地测试通过:137/137。
- 类型检查、构建、vendored 运行时再生成、运行时归档检查、顺序 CLI 冒烟和并行 CLI 冒烟通过。

## v0.2.39 - 2026-04-19

### 修复

- 修复 TUI 选择的思考/推理努力持久化。Nervefeyn 不再在每次启动时传递隐式 `--thinking medium`,使 Pi 在 `Shift+Tab` 后保存的思考级别能在重启后存活。
- 显式 `--thinking <level>` 和 `FEYNMAN_THINKING=<level>` 仍覆盖该次启动的保存默认值。

### 验证

- 新增回归覆盖,验证 Nervefeyn 仅在显式配置时传递启动思考覆盖。
- 完整本地测试通过:126/126。
- 类型检查和构建通过。

## v0.2.38 - 2026-04-19

### 修复

- 修复 `nervefeyn update memory` 和 `nervefeyn update session-search`,使友好的核心包别名解析到正确的 npm 包源,并使用 Nervefeyn 的 npm 安装路径加 peer 依赖兼容标志。
- 修复 `nervefeyn summarize ... --window-size ...` 及相关 summarize 调优标志在标志出现在源位置参数之后时的情况。
- 修复 `nervefeyn setup preview`,使其真正运行预览依赖检查,与旧 `--setup-preview` 别名匹配。
- 使可选 `generative-ui` 安装/更新失败在 macOS 工具链(上游 `glimpseui` 无法编译)上优雅降级,而不输出数千行 Swift 编译器日志。
- 通过在实时流式工作期间冻结 Nervefeyn 表头的 Last Activity 快照(而非每次渲染都重算),减少 deepresearch TUI 重绘抖动。
- 修复通过损坏的已安装相对路径引用提示模板的内置技能。
- 修复嵌入式 Pi 补丁器,使重复的运行时准备不重复 TUI stdin 错误处理器。

### 文档

- 记录 `nervefeyn setup preview`。
- 记录既有 `Shift+Tab` 思考级别热键和 `/hotkeys` 发现路径。

### 验证

- 完整本地测试通过:124/124。
- 类型检查、构建和干净网站构建通过。
- 本地 CLI 矩阵通过,覆盖 help、doctor、status、model list/tier、search status/set、alpha status、setup preview、packages list/install 和包更新别名。
- 端到端工作流运行完成,覆盖 chat、summarize、review、compare、audit、draft、lit、带确认的 deepresearch、replicate、watch/jobs、log 和有界 autoresearch 循环。

## v0.2.37 - 2026-04-19

### 修复

- 加固 `/deepresearch` reviewer/audit 修复处理,使 Nervefeyn 仅在 edit/write 工具成功且显式磁盘检查证明旧的不支持内容已消失且修正内容存在后,才声称补丁已落地。
- 为失败编辑恢复新增溯源要求,使验证笔记不能在最终候选实际反映修复前把问题标记为已修复。
- 修正 MiniMax 模型偏好大小写,以匹配 Pi 暴露的模型 ID。

### 性能

- 在启动 Pi 前并行解析预览/运行时可执行文件,减少同步启动工作,同时保留 Windows、macOS 和 Linux 回退行为。

### 分支审查

- 扫描所有公开 fork 并选择性采用低风险启动/模型测试改进。拒绝了产品特定或臃肿的 fork 变更,如 Claude CLI bypass 模式、ValiChord、Overleaf 导出和外部 `parallel-cli` 依赖。

### 验证

- 完整本地测试通过:121/121。
- 类型检查、构建、本地 CLI doctor 和真实一次性启动冒烟测试通过。
- Fork 扫描比较了 676 个可访问 fork:666 个落后、2 个相同、8 个有唯一提交被检查。

## v0.2.36 - 2026-04-18

### 修复

- 加固 `/review`,使其写出持久计划、证据笔记和 `outputs/<slug>-review.md`,而非在规划/叙述响应后停止。
- 为无法解析的 PDF 或外部源新增阻塞评审回退行为,使失败抽取仍产生显式评审产物,带 `Verification: BLOCKED`。
- 修复 Nervefeyn 的 Pi 封装下的子代理子进程生成,使 writer/reviewer 子代理不再把 `--mode` 当作模块路径。
- 使可选包预设平台感知,使 Linux 用户不看到或尝试安装仅 macOS 的 `generative-ui` 包。
- 把发布说明条目加入网站文档侧边栏。

### 文档

- 更新研究评审文档以描述具体的输出文件和阻塞抽取行为。
- 更新包文档以澄清 memory 和 session search 是核心包,`generative-ui` 是上游仅 macOS。

### 验证

- 为 `/review` 持久产物契约新增回归覆盖。
- 为平台感知可选预设和 Nervefeyn 感知子代理生成新增回归覆盖。
- 发布前运行了真实的全局安装 review、package-list/install、subagent 和 extension-load 检查。

## v0.2.35 - 2026-04-18

### 修复

- 恢复 `/deepresearch` 确认门:工作流现在写出 `outputs/.plans/<slug>.md`,汇总计划,并在搜索、起草、引用或交付最终产物前等待显式用户批准。
- 更改顶层工作流调用,使 `nervefeyn deepresearch ...` 在真实终端中表现得像 REPL 工作流,而非强制一次性执行。
- 在 Pi 的 CLI 入口点周围新增 Nervefeyn 封装,使完成的 print 模式运行在 Pi 完成后干净退出。
- 收紧直接模式 `/deepresearch` 产物路径,使研究笔记和验证文件写到 `outputs/.drafts/` 下。

### 功能

- 新增聚焦分节的 `alpha_get_paper` 抽取,带 `section` / `sections` 过滤器,覆盖 abstract、introduction、methodology、experiments、results、discussion、limitations 和 conclusion。
- 新增可配置的 `/summarize` 上下文窗口控制,通过标志和 `FEYNMAN_SUMMARIZE_*` 环境变量。

### 文档

- 新增公开 `RELEASES.md` 和网站发布说明,使每个发布有可见的修复和功能历史。
- 更新深度研究文档以描述计划确认工作流和当前 PDF 安全行为。

### 验证

- 真实全局安装 REPL 测试:键入 `/deepresearch what is BM25`,验证批准前只有计划存在,然后回复 `yes` 并验证最终报告、溯源、草稿、引用草稿、研究笔记和验证产物。
- 完整本地测试通过:117/117。
- 类型检查、构建、网站构建、本地 pack 和本地全局安装检查通过。

## v0.2.34 - 2026-04-18

### 修复

- 收紧 `/deepresearch`,使直接模式研究在起草前必须使用至少三个不同检索词或角度。
- 要求直接模式 `/deepresearch` 在直接研究产物中记录确切检索词。
- 为多查询深度研究契约新增回归覆盖。

### 验证

- `/deepresearch what is BM25` 的真实 RPC 冒烟测试完成,并写出所需的计划、草稿、引用草稿、最终报告和溯源产物。
- 发布 CI 发布了 macOS arm64/x64、Linux x64 和 Windows x64 的 npm 和原生 bundle。

## v0.2.33 - 2026-04-18

### 修复

- 把 `/deepresearch` 从长协议式提示重写为较短执行清单,使本地模型不太可能回显指令而非执行工作。
- 使狭窄直接模式研究在不生成 verifier 或 reviewer 子代理的情况下完成。
- 除非显式请求 PDF 抽取,否则在 `/deepresearch` 中避免易崩溃的 PDF 解析器路径。

### 验证

- `/deepresearch what is BM25` 的真实 RPC 完成并带所需产物和 `agent_end`。
- 完整本地测试、类型检查、构建、审计、网站构建和 pack dry-run 在发布前通过。

## v0.2.32 - 2026-04-18

### 修复

- 修复 Pi 子代理并行输出传播,使顶层任务 `output` 路径被遵守。
- 为子代理输出交接行为新增前台和异步回归覆盖。
- 围绕持久产物和溯源加固深度研究提示。

## v0.2.31 - 2026-04-17

### 修复

- 修复 Nervefeyn 运行时认证环境传播,使启动的 Pi 会话能看到预期的模型提供商凭据。
- 在认证修复后重新验证 setup 和运行时启动路径。

## v0.2.30 - 2026-04-17

### 修复

- 修复运行时补丁层中的 Pi 子代理任务输出处理。
- 为多代理工作流保留内置研究代理文件交接。

## v0.2.29 - 2026-04-17

### 维护

- 更新内置 Pi 运行时包。
- 针对刷新的运行时包集重建原生发布产物。

## v0.2.28 - 2026-04-17

### 维护

- 移除运行时清理扩展膨胀,使内置运行时更接近上游 Pi 行为。
- 减少自定义扩展面,使研究代理更简单。

## v0.2.27 - 2026-04-17

### 修复

- 为工作流状态转换新增 Pi 事件守卫。
- 改进长时间运行研究操作周围的工作流状态追踪。

## v0.2.26 - 2026-04-17

### 修复

- 把研究上下文清理切换到 Pi 运行时钩子,而非额外的自定义运行时逻辑。
- 改进与上游 Pi 运行时行为的兼容性。

## v0.2.25 - 2026-04-17

### 修复

- 修复工作流延续和提供商 setup 缺口。
- 改进模型提供商配置的 setup 流程行为。

## v0.2.24 - 2026-04-16

### 修复

- 为核心 Pi 包链接内置运行时依赖。
- 处理已安装核心包的缺失依赖错误。

## v0.2.23 - 2026-04-16

### 功能

- 新增 LM Studio setup 支持,用于本地模型工作流。
- 新增阻塞研究产物处理,使中断的运行保留有用状态。

## v0.2.22 - 2026-04-16

### 功能

- 新增一等 LM Studio setup。
- 改进本地模型 onboarding 默认值。

## v0.2.21 - 2026-04-16

### 修复

- 修复扩展修复行为。
- 新增 Opus 4.7 模型覆盖。

## v0.2.20 - 2026-04-16

### 发布

- 在重复 npm 版本阻塞发布后恢复 publish 工作流行为。
- 原生 bundle 仍通过 GitHub release 可用。

## v0.2.19 - 2026-04-16

### 修复

- 在 npm 版本已存在时跳过发布发布。
- 防止重复 publish 尝试在 npm 发布成功后使流水线失败。

## v0.2.18 - 2026-04-16

### 发布

- 准备当前 npm 和原生 bundle 流水线使用的发布自动化基线。
