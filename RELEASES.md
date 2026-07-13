# Release Notes

本文件是 Nervefeyn 的对外发布历史。条目面向用户:改了什么、为什么重要、升级后用户应做什么。

GitHub release notes 从本文件对应的 `## vX.Y.Z` 章节生成。

## Unreleased

### Package Stack

- 将 `pi-btw` 加入 Nervefeyn 默认 Pi 包栈,使 `/btw` 旁路对话在长时间运行的研究 turn 中可用,无需单独安装包。

### Science Workbench

- 将 `nervefeyn serve` 扩展为独立开放科学 workbench surface,带 Nervefeyn 自有的 project/session/frame 状态、project 元数据、Pi chat、frame message 行、frame backfill health 记录、Nervefeyn Bio Tools、notebooks、compute 清单、artifact、lineage、provenance、settings、memory 类别、onboarding intent 上下文,以及 redacted 凭证可用性 ledger。
- 新增 `nervefeyn serve --no-auth`,在可信本地测试时使用普通 localhost URL,同时保留默认的 tokenized 本地 URL 可用。
- 拉平 workbench chat composer 与 activity-card 状态颜色,使 focused、running、approval 与 failed-fetch 状态留在绿色 Nervefeyn surface 内,而不是渲染成暖色圆角 accent。
- 新增 Nervefeyn 自有的 `~/.feynman/active-org.json` 与 `~/.feynman/orgs/<org_uuid>/` app 主干,使本地 workbench 拥有 org 范围的家结构,而不是扁平的 scratch 目录。
- 新增 Nervefeyn 自有的 org 数据库 `~/.feynman/orgs/<org_uuid>/feynman-workbench.db`,从本地 workbench 状态刷新,带 reference 形状的项目、frame、message、artifact、artifact-version、execution、verification、memory、note、annotation、read-cursor、artifact-folder、compute-provider、MCP-grant、memory-category、routine-schedule、managed-endpoint 与 capability-setting 表。
- 在该数据库中加入紧凑表 envelope,覆盖 Nervefeyn 已在状态中拥有的其余 reference 形状 workbench ledger,包括 agents、skills、credentials、OAuth token、events、notifications、session activity、claims、host log、marketplace 行与 archive 行。
- org 数据库中的 compute-provider 行现在持久化 egress 策略与 Modal 环境字段,包括对既有本地数据库的就地升级。Split science connector 附件、split MCP grant 与自定义 MCP resource identifier 通过 Nervefeyn 自有的 ledger 行镜像。
- 新增 Nervefeyn 自有的化学 sketcher 工具,可在 `outputs/chemistry-sketches/` 下创建可编辑的 KET、Molfile、RXN 或 SMILES artifact,供本地 Ketcher 编辑器使用,而无需依赖参考 app 的 MCP 运行时。
- KET、RXN、CDXML 与 CXSMILES 化学 artifact 现在作为一等 molecule 预览在 workbench 中打开。Nervefeyn 把这些 scanner 格式标记为可预览的文本 artifact,显示轻量化学元数据,把 sketch 文件路由到本地 Ketcher 编辑器,并避免尝试通过 RDKit 渲染仅 Ketcher 支持的格式。
- 将 app 自有的 workbench 状态迁入 `~/.feynman/orgs/<org_uuid>/workbench/workspaces/<workspace-id>/`,包括 workbench 设置、chat session、upload、memory、annotation、OAuth token 引用、notebook 日志、Modal 作业脚本、托管 Python/R 环境、artifact 快照与 cloud-export 审计日志。既有家级 `~/.feynman/workbench` 记录与 checkout-local `.feynman/workbench` 记录在首次访问时被前向复制。
- 新增 Nervefeyn 自有的凭证与 setup-intent 状态,使 workbench 能展示哪些研究能力可用,而无需暴露原始 secret,或在运行时依赖另一个本地 app。
- 新增 Nervefeyn 自有的 skill source 与 license-assent ledger,使 workbench 能审计其内置科学 skill pack,而不依赖外部 marketplace 服务。
- 新增 Nervefeyn 自有的 watch routine ledger,使 `/watch` plan 与 baseline 在 workbench 中以诚实的定时或 blocked routine 状态出现。
- 新增 Nervefeyn 自有的 contact-email 与 credential-ask 决策 ledger,使公开数据库联系同意与 provider 凭证就绪状态可审计,而无需暴露原始凭证值。
- 新增 Nervefeyn 自有的 compute poller lease 行,使活动 compute 作业与待终止作业暴露与 science workbench 控制面相同的单写者 polling guard 形状。
- 新增 Nervefeyn 自有的 review feedback 行,使用户请求的 reviewer pass 可按 frame、type、model、response id 与有界上下文快照审计。
- 新增 Nervefeyn 自有的 frame 行,使 project、chat session、artifact run 与 upload 区域通过本地状态暴露一等控制面 frame 主干。
- 新增 Nervefeyn 自有的 project 元数据行,带本地 owner、created/updated 时间戳、context、memory 状态与 upload-frame 关联。
- 新增 Nervefeyn 自有的 frame message 行,使持久化 chat turn 可按 frame id、message index、UUID、role、status 与结构化 message JSON 审计。
- 新增 Nervefeyn 自有的 frame backfill health 记录,使失败的历史 frame import 可被追踪,而不会在干净 workspace 中凭空造出失败。
- Chat 产出的 artifact 现在按 snapshot/output provenance 附加到产生它的 session 与 project,使 Run 与 Project 文件作用域、header 指标、artifact 文件夹、版本与 verification 证据一致,即便文件 slug 与 chat frame id 不同。
- Files 现在为本地工作区 artifact、SSH/BYOC compute 主机与云 bucket 显示 host 选择器,这些都从 Nervefeyn 自有的 compute 与凭证状态派生。
- HTML report 预览现在支持在 sandboxed iframe 内做 element 级注释,包括 selector/text 捕获、已保存 badge,以及与文本、图片、PDF anchor 相同的 artifact annotation/refinement 路径。
- Artifact Notes 现在在 workbench modal 中打开,带目标上下文、现有 note 计数、添加/编辑/删除控件、Cmd/Ctrl+Enter 保存、note 预览与 Open artifact 导航,由 Nervefeyn 自有的 target-note ledger 支撑。
- Cloud 存储现在可从 Customize > Storage 打开 workbench modal,显示凭证支撑的 S3/GCS/Azure/local 目标、已配置或缺失状态、目标详情、connection-reference 反馈、删除与 Credentials 导航操作。
- Artifact Cloud 导出现在打开 workbench modal,显示已配置与缺失的存储目标,让用户选择目的地路径,并通过 Nervefeyn 自有的 cloud-export 审计日志记录导出。
- 扩展 Nervefeyn Bio Tools,新增免登录 KEGG `link:` 与 `conv:` 模式,用于批量 pathway/reaction/database 交叉链接与外部 ID 转换,包括 missing-ID 报告与 endpoint provenance。
- 扩展 Nervefeyn Bio Tools,新增免登录 PanglaoDB 支持,按 cell type 或 gene symbol 获取策展的单细胞 marker gene,包括 canonical-marker 过滤、organ/species 上下文、nickname 与 sensitivity/specificity 分数。
- 扩展 Nervefeyn Bio Tools,新增免登录公开来源:AlphaFold DB 预测结构、ArrayExpress/BioStudies functional-genomics 研究、MGnify metagenomics 研究、JASPAR 转录因子矩阵与 MyGene.info 基因注释。
- 扩展 Nervefeyn Bio Tools,新增更丰富的免登录 PubMed 支持:文章元数据、PMID/PMCID/DOI 转换、related-article 与 PMC 链接、citation 匹配、版权/license 检查,以及带界 section snippet 的 PMC 全文路由。
- 扩展 Nervefeyn Bio Tools,新增更丰富的免登录 ClinicalTrials.gov 支持:NCT detail 记录、sponsor 特定试验项目、eligibility 过滤、investigator/contact 发现与 endpoint 摘要。
- 扩展 Nervefeyn Bio Tools,新增更丰富的免登录 bioRxiv 与 medRxiv 支持:preprint DOI 查找、日期/类别窗口、published-preprint 链接、funder/ROR 查找、bioRxiv 内容统计与 server 特定使用统计。
- 扩展 Nervefeyn Bio Tools,新增免登录 EBI 结构与相互作用来源:ChEBI compound 与 ontology 记录、Complex Portal 大分子复合物、IntAct 分子相互作用与 EMDB cryo-EM map 元数据。
- 扩展 Nervefeyn Bio Tools,新增免登录公开 atlas 与监管来源:openFDA 药品标签、不良事件、召回、Drugs@FDA 申请、申请计数聚合、药理类别、generic-equivalent active-ingredient 集合、Human Protein Atlas gene/protein expression 行与 eQTL Catalogue variant-gene association 行。
- 扩展 Nervefeyn Bio Tools,新增更丰富的免登录 ChEMBL 支持:compound name/SMILES 相似性与子结构搜索、药物适应症与警告、计算的 ADMET 属性、ligand-target bioactivity 过滤、mechanism 记录与 target/gene 搜索。
- 扩展 Nervefeyn Bio Tools,新增免登录 GWAS Catalog 支持:策展的 SNP-trait association、EFO trait 搜索、study accession、PMID、p-value、mapped gene 与 ancestry/sample 元数据。
- 扩展 Nervefeyn Bio Tools,新增精确 human-genetics 模式:GWAS Catalog association、trait、study 与 SNP detail 查询;eQTL Catalogue dataset 与 dataset 范围 association 查询;以及 PheWeb/FinnGen variant、gene、phenotype-listing 与 phenotype-search PheWAS 工作流。
- 扩展 Nervefeyn Bio Tools,新增精确文献模式:OpenAlex work 搜索/detail、citation、reference、author 搜索/detail、venue 元数据,以及 arXiv 搜索加批量论文检索。
- 扩展 Nervefeyn Bio Tools,新增精确 protein-annotation 模式:InterPro/Pfam domain architecture、entry 搜索/detail、Pfam clan 与 family member 查找、Human Protein Atlas gene/search 记录,以及 STRING mapping/network/similarity 工作流。
- 扩展 Nervefeyn Bio Tools,新增精确 research-resource 模式:Antibody Registry search/detail/catalog/stat 工作流,以及 Grants.gov Search2 opportunity 查找(按 keyword、opportunity number、ALN、agency、status、eligibility、funding category 与 funding instrument)。
- 扩展 Nervefeyn Bio Tools,新增精确 Rfam RNA 模式:family 元数据、accession/id 转换、seed alignment、covariance model、phylogenetic tree、sequence region、PDB structure mapping 与批量 sequence 搜索。
- 扩展 Nervefeyn Bio Tools,新增精确 omics-archive 模式:ArrayExpress experiment/file/sample、GEO series 搜索/detail、MetaboLights study/file/data file、MGnify study/analysis 与 PRIDE project/protein-evidence 工作流。
- 扩展 Nervefeyn Bio Tools,新增精确 regulation 模式:ENCODE experiment/biosample/file 搜索与 detail 记录、JASPAR matrix/version/catalog 工作流,以及通过 UCSC hub 数据的 UniBind dataset 与 regional TFBS 工作流。
- 扩展 Nervefeyn Bio Tools,新增精确 variant 模式:gnomAD short variant 搜索/detail、gene variant、constraint、region variant、liftover、ClinVar mirror variant、structural variant、mitochondrial variant、CADD variant/position/range 分数、direct ClinVar search/accession/rsID 记录,以及 dbSNP rsID/region 查找。
- 扩展 Nervefeyn Bio Tools,新增免登录 BioMart 支持:Ensembl mart 发现、dataset 列表、常用 attribute、filter,以及通过 Nervefeyn 内置数据库搜索工具的有界 gene 表检索。
- 扩展 Nervefeyn Bio Tools,新增免登录 MetaboLights 支持:公开 metabolomics 研究元数据、MTBLS accession、assay 上下文、study-folder 文件与公开 data-file 列表。
- 扩展 Nervefeyn Bio Tools,新增免登录 UCSC Genome Browser 支持:assembly 发现、track 搜索、chromosome 大小、有界基因组区域 track 行、conservation 分数摘要,以及 ENCODE TFBS cluster。
- 扩展 Nervefeyn Bio Tools,新增精确 genome 模式:Ensembl lookup、xref、VEP variant consequence 摘要、homology、sequence 与 overlap-region 检索,以及 UCSC `ucsc_list_tracks`、`ucsc_chrom_sizes`、`ucsc_track_data`、`ucsc_conservation` 与 `ucsc_tfbs_clusters` 查询名。
- 扩展 Nervefeyn Bio Tools,新增免登录 UniBind 支持:直接 TF-DNA 相互作用 dataset 搜索、精确 dataset model 元数据、BED/FASTA/plot model 链接,以及 UCSC hub 支撑的 TFBS region 行。
- 扩展 Nervefeyn Bio Tools,新增 Europe PMC 开放访问全文 section 查找(针对 PMCID/PMID 输入),返回 section 清单、有界 snippet、figure/table/reference 计数,以及显式的 not-open-access 或 missing-full-text 状态,而不暴露原始 XML。
- 扩展 Nervefeyn Bio Tools,新增免登录 ZINC 支持:按 ZINC ID 查找可购买 compound、SMILES exact 或 analog 搜索、supplier catalog-code 解析、随机 screening-set 采样,以及 3D tranche repository 位置。
- 扩展 Nervefeyn Bio Tools,新增 PubChem compound 搜索/detail、SMILES 相似性、bioassay 摘要与 GHS safety 模式;ChEBI search/entity/ontology 模式;BindingDB target-ligand 与 compound-target 模式;以及 Rhea reaction 搜索/detail 模式。
- 扩展 Nervefeyn Bio Tools,新增 CIViC gene/variant/evidence/assertion/molecular-profile/disease/therapy 模式、ClinGen validity/dosage/actionability/variant-classification 模式,以及 Open Targets 有界 GraphQL 兼容搜索加 disease-drug、disease-target 与 drug wrapper 模式。
- 扩展 Nervefeyn Bio Tools,新增 GTEx dataset、tissue-site、sample、gene-resolution、expression、top-expressed-gene 与 eQTL 模式,加上精确 PanglaoDB marker-gene、gene-to-cell-type 与 options 模式。
- 扩展 Nervefeyn Bio Tools,新增精确 genes/ontologies 模式:MyGene query-many 查找、OLS ontology catalogue/search/term 查找、QuickGO GO 注释、UniProt TSV/FASTA/TXT entry 检索、Reactome pathway mapping,以及 KEGG entry/search/link/ID-conversion 工作流。
- 扩展 Nervefeyn Bio Tools,新增免登录 CellGuide 支持:Cell Ontology cell-type 查找、marker gene、tissue occurrence 与 CELLxGENE 来源 collection。
- 扩展 Nervefeyn Bio Tools,新增免登录 Antibody Registry 支持:antibody RRID 搜索、catalog-number 查找、vendor 过滤、registry 统计与 per-antibody detail 记录。
- 扩展 Nervefeyn Bio Tools,新增凭证感知 OpenAlex 支持:学术 work 搜索、work detail、DOI claimant 解析、incoming citation、outgoing reference、author、source/venue、OA 状态与 rate-limit 诊断。
- 扩展 Nervefeyn Bio Tools,新增 cBioPortal cancer-model parity 模式:study 搜索/detail、clinical attribute、per-gene mutation 行、cross-study mutation 频率与离散 CNA 事件,加上 DepMap reference-name 模式:model listing/detail/search、gene 搜索与 CRISPR dependency 行。
- 为音频、视频、XLSX 电子表格、Jupyter notebook 与 LaTeX/TeX artifact 新增原生 workbench 预览,与既有 report、JSON、PDF、genome、alignment、molecule、structure、tree 与 tensor 查看器并列。

### Website and Docs

- 在 website、命令参考、setup 指南、release notes 与 README 中加入 workbench 文档,使对外产品描述与本地 workbench surface 一致。
- 修正 website 文档中的 npm install Node.js 版本范围,使其与 package engine 范围一致。

## v0.3.5 - 2026-06-28

### Pi Runtime

- 在所有四个包(`pi-coding-agent`、`pi-agent-core`、`pi-ai`、`pi-tui`)上,把内置 Pi 运行时从 `0.79.10` 刷新到 `0.80.2`。这恢复了 `@earendil-works/pi-ai/compat` entrypoint 与可选包(如 `pi-web-access`)使用的 loader alias,修复了 #183 报告的 extension-load 失败。
- Nervefeyn 的包安装器现在先从当前规范 `@earendil-works/*` 运行时包派生 legacy `@mariozechner/*` alias 版本,使陈旧的 legacy 包根不能在 `nervefeyn update` 期间播种旧 Pi peer 版本。
- 更新 Pi TUI patcher 以适配当前上游 overflow-check 布局,使过宽的渲染行被裁剪而不是导致 session renderer 崩溃。

### Validation

- 为当前 Pi TUI overflow block、`@earendil-works/pi-ai/compat` release-note 边界,以及从当前 runtime 元数据派生 legacy Pi alias 增加了回归覆盖。
- 重建并检视了 vendored runtime workspace,使打包 archive 包含 Pi `0.80.2`、`@earendil-works/pi-ai/dist/compat.js` 与当前/legacy `/compat` extension-loader alias。

## v0.3.4 - 2026-06-12

### Research

- 新增 `nervefeyn paper <id-or-title>` 用于单篇论文访问解析。它写入 Markdown 与 JSON access 报告,记录来自 OpenAlex、DOI、PMID/PMCID、arXiv/alphaXiv 与 Europe PMC 的合法候选,并可用 `--fetch-full-text` 抓取源特定文本,同时保持原始全文 body 不进入 artifact。
- 新增 `nervefeyn rank <topic>`,首个 PaperRank 工作流。它抓取 OpenAlex 论文元数据,以透明的 topical fit、citation influence、graph prestige、citation velocity、methodology evidence 与 reproducibility evidence 分数对候选进行排序,用于 read-first triage,并在 `outputs/` 下写入可审计 artifact。
- PaperRank 的核心用户任务是 read-order triage:用排名简报、每篇论文分数审计、JSONL 数据、本地 citation/field 结构与 provenance 回答"我应该先读哪篇,为什么?"。
- 新增与该任务绑定的 research-loop artifact:默认提供 ranked brief、score audit、JSONL score/data、rank-sensitivity 检查、本地 citation graph/explorer、field map 与 provenance。可选 flag 新增 citation-neighborhood 扩展、源特定全文丰富、研究 critique、实证偏好校准模板、reproduction-evidence ledger/template/replication plan,或有界 model synthesis。
- PaperRank 不声明已完成 replication 或同行评审。它将原始全文 body 排除在生成的 artifact 之外,为 synthesis 记录 model-selection provenance,并显式标注未校准或缺失的证据。

### Model Catalog

- 修复研究模型选择,使 recommended/default model 路径、陈旧设置、model list 与显式 CLI override 拒绝 Pro-class model ID,并使仅 OpenAI 安装停留在 Pi 暴露的最新非 Pro GPT 模型上。更新了 LiteLLM setup fallback 与 setup/configuration 文档,以避免 GPT-4 时代、陈旧与 premium-tier 默认值。
- 为 PaperRank synthesis 新增 model-selection provenance,使普通 CLI 输出、JSON 输出、生成的 synthesis Markdown 与 rank provenance 都指明实际 model 以及它是来自当前推荐路径还是显式 override。

### AlphaXiv

- 通过 `nervefeyn alpha ...` 加固基于 shell 的 alphaXiv 访问,使 Nervefeyn 在 agent bash session 中使用其内置 patched alphaXiv client,而不是陈旧的全局 `alpha` 或 `feynman` 二进制。

### Pi Runtime

- 在所有四个包(`pi-coding-agent`、`pi-agent-core`、`pi-ai`、`pi-tui`)上,把内置 Pi 运行时从 `0.79.1` 刷新到 `0.79.10`,并把 Nervefeyn 的打包 fallback/runtime-peer seeding 对齐到同一版本,使干净安装与内置 runtime 重建不再落后于最新发布的 Pi patch 线。这继承了 Pi 的 compaction-event 上下文、更安全的 exact-version 更新流程、nested-repo `find` 修复,以及 OpenAI 兼容的 `reasoning_details` streaming 修复。
- 更新 `hono`、`protobufjs`、`undici` 与 `ws` 的生产依赖 override,使 `npm audit --omit=dev` 在 Pi 刷新后干净。
- 修复了长 slash-workflow 名溢出自定义 header 时的 session 重命名崩溃。Header workflow 名现在在 wide 与 narrow 布局下都被裁剪到其列宽,再渲染 description。
- 移除了旧的 `generative-ui`、`ui` 与 `all-extras` 可选包/更新目标。可选包现在保持逐一、聚焦 research-continuity。

### Website

- 在依赖新鲜度扫描后,更新了 website 的 in-range 陈旧包集合(`@tailwindcss/vite`、`tailwindcss`、`lucide-react` 与 `eslint`)。

### Validation

- 在版本刷新后重跑了完整的本地 validation 扫描:测试、typecheck、build、package dry-run、CLI version smoke、生产 audit 与 website build。

## v0.3.3 - 2026-06-12

### Windows

- 修复了剩余的 Windows subagent 启动失败:Pi 从其自身的 `<agentDir>/npm/node_modules` 包根加载 `pi-subagents`。0.3.2 修复补丁了 Nervefeyn 的内置 workspace 与 npm-global 副本,但 Pi 0.79 在 `FEYNMAN_HOME` 设置后会自动在活动 agent 目录下安装配置的包;那份新副本仍未打补丁,可能以 `--mode` 在 main-module 槽位 spawn Nervefeyn 的 wrapper。

### Validation

- 为 Nervefeyn 的用户 npm-global 包根与 Pi 的 agent-local npm 包根都新增了回归覆盖,使启动时 patch 现在检查 e2e run `27392984208` 中失败的确切 Windows 副本。

## v0.3.2 - 2026-06-11

### Subagents

- 修复了 subagent 启动失败 `userDir is not defined`。上游 pi-subagents 把目录处理移到 `getAgentDir()` 之后(原生尊重 `PI_CODING_AGENT_DIR`),因此 Nervefeyn 的启动时 patch 部分应用——重写了声明已不匹配的用法。Patcher 现在以事务方式应用分组编辑(用法重写只与其配对声明一起落地),就地修复已损坏的安装,并停止重写上游现已自行处理的部分。
- 修复了持续出现的 Windows `Cannot find module '...\--mode'` subagent 失败(#172)的真正根因:Pi 从 Nervefeyn 的 pinned npm prefix(`~/.feynman/npm-global/lib/node_modules`)解析 user-scope 包。当该副本是真实目录而非指向内置 workspace 的链接时(junction-creation fallback 或 `nervefeyn update` 重装),它从未被打补丁,因此无论 0.2.59–0.3.1 中发布的修复如何,未打补丁的 spawn 代码都会执行。该包根现在在两个启动 patcher 中都是一等 patch 目标。

### Validation

- 端到端工作流的 subagent smoke 现在要求子进程实际 relay 的输出(`RESULT=PONG`),而不仅是父进程的完成标记——之前的 pass 在工具调用失败、模型越过去叙述时可能是空的。已在干净 Linux 机器上通过驱动交互式 TUI 对话验证。

## v0.3.1 - 2026-06-11

### Windows

- 修复了 subagent 启动失败 `Cannot find module '...\--mode'`(#172)的再次复发。当 `FEYNMAN_PI_CLI_PATH` 在 subagent-spawning 进程内缺失或不可用时,Pi CLI resolver 可能回落到重新选择 Nervefeyn 的 wrapper 而不带 Pi main-module 参数。Resolver 现在从 wrapper 自身的启动参数派生真实 Pi CLI,wrapper 为其子进程自愈环境变量,使 spawn 不再依赖 env 传播。

### Validation

- 回归测试覆盖了全新与已 patch 的 resolver 形态、重复应用的 idempotency,以及 wrapper 的 env 自愈;由多 OS 端到端工作流(含 Windows subagent smoke)验证。

## v0.3.0 - 2026-06-11

### Pi Runtime 0.79(breaking:Node 最低版本)

- 在所有四个包(`pi-coding-agent`、`pi-agent-core`、`pi-ai`、`pi-tui`)上把 Pi 运行时从 0.74.2 升级到 0.79.1。继承自 Pi 0.75–0.79 的要点:`.pi` 资源的项目信任 prompt(headless 运行默认 untrusted,因此不会阻塞)、`--session-id` / `--exclude-tools` / `--approve` CLI flag、shrinkwrapped exact deps 的供应链强化发布、新内置 model(Claude Fable 5 with adaptive thinking、Claude Opus 4.8、MiniMax-M3、NVIDIA NIM provider),以及 IME 光标修复。
- **支持的 Node 现在是 22.19.0 到 25.x**(Pi 0.79 要求 ≥22.19;Node 20 已于 2026 年 4 月结束支持)。安装器内置 runtime 不受影响;Node 20/21 上的 npm 安装仍可在 0.2.x 线上工作。
- 更新 OAuth 登录流程以适配 Pi 的新的 device-code 与 selector callback,并重建 editor render patch 以匹配 pi-tui 的 Unicode 重构——包括一个 guard,在未来未知布局上保持 editor 不动,而不是产生破损渲染。
- 模型推荐现在会浮现最新的 catalog 条目(Claude Opus 4.8 on OpenCode Zen、MiniMax-M3)。

### Removed

- 删除 npm `--legacy-peer-deps` runtime patch——Pi 0.79 已在上游发布该行为。
- 移除未使用的 `dotenv` 依赖;`undici` 与 `@earendil-works/pi-agent-core`/`pi-tui` 现在直接声明,而不是依赖传递解析。

### Validation

- Node 22/24/25 上 192 个测试、typecheck、build 与 pack;Pi 0.79.1 上的 live smoke:alpha 搜索(10 条结果)、并行 `web_search` 含 `includeContent`、subagent 启动,以及对 patched editor 的直接 render-harness 检查(placeholder、text、narrow、unfocused)。端到端安装工作流现在也覆盖 Node 22。

## v0.2.61 - 2026-06-11

### Windows

- 修复了每次启动都失败的 bundled-package setup(#177、#170)。在真实 Windows runner 上运行发布的包发现两个根因:GNU tar(Git for Windows)把 workspace archive 的绝对 `C:\...` 路径当作远程主机规格("Cannot connect ... resolve failed"),而 npm fallback 在不带 shell 的情况下 spawn 裸 `npm`,Windows 以 EINVAL 拒绝。Archive 现在以相对路径解压,npm 通过 `npm-cli.js` 与运行中的 Node 可执行文件调用。

### Runtime Reliability

- 内置 workspace 的 alpha-hub 副本现在与包本地副本一样接收启动时 patch,使 #167 的搜索修复无论解析到哪个副本都生效。

### Validation

- 多 OS 端到端工作流现在在 Windows、Linux 与 macOS 上、Node 24 与 25 下验证安装、更新、patch 应用,以及 live model + subagent smoke。

## v0.2.60 - 2026-06-11

### Node Support

- Nervefeyn 现在支持 Node.js 25(#177)。完整测试套件与 live CLI 流程(launch、update、alpha 搜索、并行 web 搜索)在 Node 20、24 与 25 上验证;支持范围现在是 20.19.0 到 25.x。

### Runtime Reliability

- 修复了晦涩的 `Cannot convert argument to a ByteString because the character at index N has a value of M` 崩溃(#171)。当 `models.json` 中的自定义 provider 的 header 值或 API key 含有 U+00FF 以上的字符(如中文文本)时会触发——HTTP header 不能携带它们。Nervefeyn 现在会精确报告是哪个 provider 与 header 出错以及如何修复,而不是一个无归属的 undici 错误。

### Validation

- 新增多 OS 端到端安装工作流,在 Windows、Linux 与 macOS runner(Node 24 与 25)上运行发布的包:全局安装、version/update/package 流程、针对 subagent spawn(#172)与结构化搜索 parser(#167)修复的启动时 patch 断言,以及 live model 与 subagent smoke。

## v0.2.59 - 2026-06-11

### Research Tools

- 修复了 `alpha_search` 在每种模式都返回空结果(#167)。alphaXiv 搜索工具现在返回结构化 JSON 而不是旧的编号文本格式;结果 parser 同时理解两者,使 semantic/keyword/both/agentic/all 搜索再次返回真实论文。

### Runtime Reliability

- 修复了并行 `web_search` 调用永远挂起 session 的问题(#169)。一个并行调用可能静默 clobber 兄弟的 pending curator session,使其 promise 永远不解析并阻塞批中每个 toolResult;现在 loser 被干净取消。每个搜索查询还受 90s deadline 约束,以 per-query 错误呈现,而不是无止境的 "Working" 状态;永不连接的 curator 页面在 2 分钟后超时,而不是永远等待。
- 重新启动 `nervefeyn` 现在继续最近的 session 而不是从零开始(#168)。`--new-session`、一次性 prompt 与 RPC/JSON 启动仍从新会话开始。

### Windows

- 修复了 subagent 启动失败 `Cannot find module '...\--mode'`(#172)。把 pi-subagents 指向 Nervefeyn 的 Pi CLI 的 runtime patch 现在应用到包当前的 `src/` 布局。
- 修复了 `nervefeyn update` 失败 `spawn EINVAL`(#170)。包安装现在通过 `npm-cli.js` 与运行中的 Node 可执行文件调用 npm,而不是 spawn `npm.cmd`。

### Updates

- 在不支持的(过新的)Node 版本上安装新 Nervefeyn release 不再中止安装并静默把你钉在旧版本(#177)。Version gate 仍拒绝运行并解释该装什么,但包本身会更新,使你切换 Node 版本后修复已就位。
- `nervefeyn update` 现在会告诉你存在更新的 Nervefeyn CLI release,并打印适合你安装类型(npm 或 standalone)的精确升级命令。

### Validation

- 为结构化 alphaXiv 搜索 parser、web_search 挂起 patch 与 self-update 通知新增回归覆盖。Live 验证:所有五种 `alpha_search` 模式都返回结果,两个并行 `web_search` 调用(含 `includeContent: true`)完成并返回 toolResult。

## v0.2.58 - 2026-05-16

### Optional Packages

- 新增 `hindsight` 可选 preset,安装 `@luxusai/pi-hindsight`,为用户提供一等路径接入 Hindsight 支撑的 research-continuity memory,而不把它加入默认安装。
- 新增 `hindsight` 与 `pi-hindsight` update alias,使 `nervefeyn update hindsight` 解析到同一包源。
- 更新 package-stack 与 setup 文档,把 Hindsight 显示为可选 memory surface,并说明它需要 Hindsight 服务器或 Hindsight Cloud 账户。

### Validation

- 为新的可选 preset、research-continuity 包副本、移除的 bulk/UI preset 与 update alias 新增回归覆盖。

## v0.2.57 - 2026-05-15

### Runtime Reliability

- 修复 macOS/iTerm profile 下交互式 prompt 输入颜色:输入文本此前继承黑色终端前景,与 Nervefeyn 深色 editor 背景冲突。
- 通过共享 Pi patch 模块应用 editor 前景/背景 patch,使包本地安装与 vendored runtime archive 保持同步。

### Validation

- 为 patched Pi editor/theme source 转换新增回归覆盖,包括 idempotency。

## v0.2.56 - 2026-05-13

### Security

- 把 `protobufjs` 依赖 override 从 `7.5.5` 更新到 `7.5.8`,引入 patched `@protobufjs/utf8` release,清除当前生产 audit advisory 集合。

### Validation

- 在 override 刷新后重跑根生产 audit,确认它报告零漏洞。

## v0.2.55 - 2026-05-13

### Model Catalog

- 更新 Nervefeyn 的研究模型偏好顺序,使最新可用的非 Pro OpenAI GPT 模型可被推荐、自动选择并优先于旧 OpenAI GPT 模型展示。
- 对 OpenAI Codex 应用同样的最新可用非 Pro GPT 偏好(当 Pi 直接暴露 Codex 时)。
- 更新首次运行/默认 setup 偏好,使仅 OpenAI 安装在可用时选择最新可用的非 Pro OpenAI GPT 模型。

### Validation

- 为最新可用非 Pro OpenAI 推荐、模型排序与默认 setup seeding 新增回归覆盖。

## v0.2.54 - 2026-05-11

### Runtime Reliability

- 修复把包依赖 hoist 到 Nervefeyn 包根之外的 packed npm 安装。Nervefeyn 现在在解析 Pi 时回落到 vendored `.feynman/npm` runtime workspace,使 `nervefeyn doctor` 与 prompt 启动在干净 packed install 上工作。
- 把 runtime node-module patch 应用到包本地依赖与 vendored runtime workspace 两处。

### Validation

- 为 packed-install Pi 路径解析与 vendored runtime patching 新增回归覆盖。
- 新增隔离的 packed-install E2E:把生成的 tarball 安装到干净的 prefix/home,并从该安装启动 Nervefeyn。

## v0.2.53 - 2026-05-11

### Runtime Reliability

- 再次加固 alphaXiv 搜索 fallback:当被移除的 MCP 搜索工具与 `discover_papers` 都不可用时,`alpha search` 现在回落到公开 alphaXiv fast REST 搜索 endpoint。
- 给 Pi extension loader 打补丁,把 `@mariozechner/*` 与 `@earendil-works/*` 两种 Pi runtime import 都 alias 到 Nervefeyn 已初始化的内置 runtime,防止展开工具输出时出现 mixed-namespace TUI/theme 崩溃。
- 把 extension-loader patch 应用到 vendored runtime archive 路径,而不仅是本地开发 `node_modules` 路径。

### Validation

- 为升级旧的 `discover_papers`-only alphaXiv patch 与 dual-namespace Pi runtime aliasing 新增回归覆盖。

## v0.2.52 - 2026-05-09

### Runtime Reliability

- 在包更新前 seed 内置 runtime 包,使 `typebox` 等未声明的 extension 依赖在 extension load 之前被修复。
- 当 Nervefeyn 必须直接运行 npm 时,在已安装的 Pi 包旁加入 Pi 的 `typebox` runtime 包。
- 在 legacy `@mariozechner/*` namespace 旁加入新的 `@earendil-works/*` Pi runtime 包 namespace,使 `pi-btw` 与 `pi-markdown-preview` 等更新的 Pi extension 能加载。
- 给内置 alpha-hub runtime 中的 alphaXiv 搜索打补丁,在 alphaXiv 不再暴露旧搜索工具名时回落到更新的 `discover_papers` MCP 工具。
- 加固 model 工具调用处理以应对常见 alias 错误:`search_web` 现在映射到 `web_search`,裸 `fetch` / `WebFetch` / `read_url_content` 映射到 `fetch_content`,数组 URL 会被规范化。
- 修复研究 header 中的 Windows docker probe,使 `cmd.exe` 不再因 Unix 专用的 `/dev/null` 重定向输出本地化 mojibake。

### Workflow Prompts

- 给每个 workflow prompt 新增共享的 tool-discipline 块,使主 agent 在 workflow 特定指令之前看到规范工具名。

### Validation

- 为 alphaXiv 搜索 fallback、Pi 工具 alias 规范化、内置 runtime 依赖安装与 prompt tool discipline 新增回归覆盖。

## v0.2.51 - 2026-05-09

### Package Manager

- 加固 Pi 包安装与更新,使 peer-only Pi runtime 包被物化到 Nervefeyn 的 npm prefix 中已安装 Pi 包旁。
- 这防止可选或 legacy Pi 包在 extension load 时因 import Nervefeyn 使用 legacy peer dependency 模式而 npm 未安装的 Pi runtime 模块而失败。

### Validation

- 为在 Pi npm 包旁安装 Pi runtime peer 新增 package-manager 覆盖。

## v0.2.50 - 2026-05-09

### Skills Installer

- 为独立 skill 安装新增显式 Codex skills target:macOS/Linux 上的 `--codex` 与 Windows 上的 `-Scope Codex`。
- 在记录 Codex、repo-local Claude/agent 与 OpenCode 目标路径的同时,保持现有 default/user 安装行为兼容。

### Validation

- 为 Codex target 与 target 特定文档新增安装器覆盖。

## v0.2.49 - 2026-05-07

### Website

- 把 website build stack 更新到 patched Astro 6/Vite 7。
- 把 docs content collection 迁移到 Astro 当前的 content-layer config。

### Validation

- Website build、typecheck、lint 与生产 audit 通过。
- 在 website 升级后,root build、typecheck、完整测试、package dry-run、native bundle build 与生产 audit 通过。

## v0.2.48 - 2026-05-07

### Fixes

- 恢复 Nervefeyn CLI 与 npm 包对 Node.js 24 的支持。
- 把默认 Pi 包集合精简到核心 AI 研究必备:alphaXiv 访问、subagent、文档解析与 web 访问。
- 把 memory 与 session search 移出默认安装路径,使可选包失败不能阻塞首次启动。
- 把 session search 限制在 Node.js 22.x,因为其上游 sqlite 依赖仍依赖 native prebuild 覆盖。
- 把 TypeScript 工具链升级到 6.0,并为其显式 `rootDir` 要求更新 build config。

### Documentation

- 更新 package-stack、setup、install 与 session-search 文档,区分核心 researcher 包与可选附加。

### Validation

- 完整本地测试通过:157/157。
- Typecheck、root build、website build、native bundle build、生产 `npm audit --omit=dev` 与 package dry-run 通过。
- Package dry-run 验证内置 runtime workspace 默认排除 memory 与 session search。

## v0.2.47 - 2026-05-07

### Documentation

- 澄清 Nervefeyn 的包、extension 与 skill 接线遵循 Pi 的上游包模型。
- 从 README 与 website 文档链接 Hugging Face Hub API 与环境变量文档。
- 澄清 Hugging Face 文件读取在下载前拒绝明显的 model weight、archive 与 dataset shard。

### Validation

- 收紧 Hugging Face 二进制文件拒绝回归测试。
- 完整本地测试通过:157/157。
- Typecheck、root build、website build 与生产 `npm audit --omit=dev` 通过。

## v0.2.46 - 2026-05-07

### Updates

- 新增 `/recipe` 工作流,提供来自论文、数据集、文档、实现路径与 verification 状态的排名 ML 训练 recipe。
- 新增只读 Hugging Face Hub 检视工具,用于 dataset 元数据、repo 文件列表与小文本文件读取。这些支持 recipe 与 replication grounding 而不需要 Hub 写权限,并在下载前拒绝明显的 weight/archive/shard 读取。
- 更新 `/replicate`,使 ML 密集目标在执行规划前先做一轮 recipe 抽取。

### Documentation

- 为 `/recipe` 工作流与 Hugging Face Hub 工具新增 website 文档。
- 为新工作流与工具更新 README、quickstart、command reference、agent 文档、replication 文档与 package-stack 文档。

### Validation

- 为 Hugging Face 工具注册、endpoint 格式化、auth header、文件列表限制、截断与二进制文件拒绝新增单元覆盖。
- 完整本地测试通过:157/157。
- Typecheck、root build、website build、CLI help 与 live Hugging Face endpoint smoke 通过。

## v0.2.45 - 2026-05-07

### Updates

- 把内置 Pi runtime 包更新到 `@mariozechner/pi-ai@0.73.0` 与 `@mariozechner/pi-coding-agent@0.73.0`。
- 把 `@clack/prompts` 更新到 `1.3.0`,用于 setup/onboarding prompt surface。

### Validation

- 完整本地测试通过:154/154。
- Typecheck、root build、website build、`nervefeyn doctor` 与生产 `npm audit --omit=dev` 通过。
- JSONL RPC smoke 通过 `get_state` 与返回 `FEYNMAN_RPC_OK` 的 `bash` 命令。
- Release CI 发布了 npm `0.2.45`,构建了所有 native bundle,并创建了 GitHub release。

## v0.2.44 - 2026-05-06

### Fixes

- 把传递依赖 override pin 更新到 patched 版本,使生产 `npm audit` 报告零漏洞。
- 这清除了 `basic-ftp`、`fast-xml-parser`、`hono` 与 `ip-address` 中的 advisory,同时把依赖变更限定在既有传递包内。

### Validation

- 生产 `npm audit --omit=dev` 通过,零漏洞。
- 完整本地测试通过:154/154。
- Typecheck、root build、website build 与 `nervefeyn doctor` 通过。

## v0.2.43 - 2026-05-06

### Fixes

- 在 Nervefeyn 写入 web-search provider 配置后,把 `.feynman/web-search.json` 权限限制为 user-only(`0600`)。
- 这保护存储的 web-search API key(如 Exa、Perplexity 与 Gemini key)免受宽松本地 umask 影响。

### Validation

- 为保存的 web-search config 权限新增 POSIX 回归覆盖。
- 完整本地测试通过:154/154。
- Typecheck 与 build 通过。

## v0.2.42 - 2026-05-06

### Fixes

- 通过 patch Pi 的项目 npm install 路径使用 peer-dependency 兼容安装,修复了带 `.feynman/settings.json` 包条目的项目中的 runtime RPC 启动。
- 这防止 project-scoped 包同步在 RPC session 启动前在 `@aliou/pi-processes` 等包上失败。

### Validation

- 为 embedded Pi package-manager patch 新增回归覆盖。
- 真实 `v0.2.41` release RPC 测试复现了本 release 修复的缺失 project-package install 失败。

## v0.2.41 - 2026-05-06

### Fixes

- 修复启动包 seeding,使复制的内置包被视为已满足,而不是回落到重复的全局 npm 安装。
- 在交互式 setup 报告缺失包之前 seed 内置包,避免 standalone bundle 已有 runtime workspace 时不必要的首次运行包 prompt。
- 把支持的 Node.js runtime 限制到 Node 20.19.x 到 Node 22.x,因为 sqlite 支撑的 Pi 包(如 session search)在 Node 24 下不可靠。
- 更新 release CI 以用 Node 22 build、test、publish 与 package native bundle。

### Documentation

- 新增仅研究的生物医学文献综述指南,带 PICO/PICOS 框架、证据类型分离、隐私边界与非临床建议措辞。
- 更新 npm install 文档以显示新的支持 Node engine 范围。

### Validation

- 完整本地测试通过:151/151。
- Typecheck 与 root build 通过。

## v0.2.40 - 2026-04-19

### Fixes

- 修复本地模型 web 搜索失败:模型调用了不存在的搜索 alias 如 `google:search`;Nervefeyn 现在把这些 alias 映射到 Pi 的真实 `web_search` 工具(当可用时)。
- 给内置 researcher 与 verifier agent 授予 Pi web-access 工具(`web_search`、`fetch_content` 与 `get_search_content`)访问权,使其 prompt 与允许工具匹配。
- 让 `nervefeyn doctor` 与 `nervefeyn search status` 显式显示 `web-search.json` 何时未创建以及如何初始化。
- 不再把过期 OAuth 凭证视为已认证的模型可用性,使 `doctor`、`model list` 与 onboarding 引导用户重新登录,而不是稍后在 chat 中失败。
- 新增 package-workspace setup lock,使并发 Nervefeyn 调用不会在恢复 `.feynman/npm` 时竞争。

### Validation

- 完整本地测试通过:137/137。
- Typecheck、build、vendored runtime 重建、runtime archive 检视、顺序 CLI smoke 与并行 CLI smoke 通过。

## v0.2.39 - 2026-04-19

### Fixes

- 修复 TUI 选择的 thinking/reasoning effort 持久化。Nervefeyn 不再在每次启动时隐式传 `--thinking medium`,使 Pi 在 `Shift+Tab` 后保存的 thinking 级别能在重启后保留。
- 显式 `--thinking <level>` 与 `FEYNMAN_THINKING=<level>` 仍会 override 该次启动的保存默认值。

### Validation

- 新增回归覆盖:Nervefeyn 仅在显式配置时才传启动 thinking override。
- 完整本地测试通过:126/126。
- Typecheck 与 build 通过。

## v0.2.38 - 2026-04-19

### Fixes

- 修复 `nervefeyn update memory` 与 `nervefeyn update session-search`,使友好的核心包 alias 解析到正确的 npm 包源,并使用 Nervefeyn 的 npm install 路径加 peer-dependency 兼容 flag。
- 修复 `nervefeyn summarize ... --window-size ...` 与相关 summarize 调优 flag 在 flag 出现在源位置参数之后的情况。
- 修复 `nervefeyn setup preview`,使其真正运行 preview 依赖检查,与 legacy `--setup-preview` alias 一致。
- 让可选 `generative-ui` 安装/更新失败在 macOS 工具链(上游 `glimpseui` 无法编译)上干净降级,而不输出数千行 Swift 编译日志。
- 通过在 live streaming 期间冻结 Nervefeyn header 的 Last Activity 快照(而不是每次渲染都重算)减少 deepresearch TUI 重绘 churn。
- 修复引用 broken 已安装相对路径 prompt template 的内置 skill。
- 修复 embedded Pi patcher,使重复 runtime 准备不再重复 TUI stdin 错误处理器。

### Documentation

- 文档化 `nervefeyn setup preview`。
- 文档化既有的 `Shift+Tab` thinking-level 热键与 `/hotkeys` 发现路径。

### Validation

- 完整本地测试通过:124/124。
- Typecheck、build 与干净 website build 通过。
- 本地 CLI matrix 通过:help、doctor、status、model list/tier、search status/set、alpha status、setup preview、packages list/install 与 package update alias。
- 端到端工作流运行完成:chat、summarize、review、compare、audit、draft、lit、deepresearch(带确认)、replicate、watch/jobs、log 与有界 autoresearch 循环。

## v0.2.37 - 2026-04-19

### Fixes

- 加固 `/deepresearch` reviewer/audit 修复处理,使 Nervefeyn 仅在 edit/write 工具成功且显式 on-disk 检查证明旧的不支持内容已消失且修正内容存在后才声明 patch 已落地。
- 为失败 edit 恢复新增 provenance 要求,使 verification note 不能在最终候选实际反映修复之前标记 issue 已修复。
- 把 MiniMax 模型偏好大小写修正为匹配 Pi 暴露的 model ID。

### Performance

- 在启动 Pi 前并行解析 preview/runtime 可执行文件,减少同步启动工作,同时保留 Windows、macOS 与 Linux fallback 行为。

### Fork Review

- 扫描所有公开 fork,选择性地采纳低风险启动/模型测试改进。拒绝了产品特定或臃肿的 fork 改动,如 Claude CLI bypass 模式、ValiChord、Overleaf 导出与外部 `parallel-cli` 依赖。

### Validation

- 完整本地测试通过:121/121。
- Typecheck、build、本地 CLI doctor 与真实一次性启动 smoke 通过。
- Fork 扫描比较了 676 个可访问 fork:666 落后、2 相同、8 有唯一 commit 被检视。

## v0.2.36 - 2026-04-18

### Fixes

- 加固 `/review`,使其写入 durable plan、evidence note 与 `outputs/<slug>-review.md`,而不是停在 planning/narration 响应后。
- 为无法解析的 PDF 或外部来源新增 blocked-review fallback 行为,使失败抽取仍产出显式 review artifact,带 `Verification: BLOCKED`。
- 修复 Nervefeyn 的 Pi wrapper 下 subagent child-process spawn,使 writer/reviewer subagent 不再把 `--mode` 当作 module 路径。
- 让可选包 preset 平台感知,使 Linux 用户不会看到或尝试安装 macOS 专用的 `generative-ui` 包。
- 把 Release Notes 条目加入 website 文档侧栏。

### Documentation

- 更新研究 review 文档以描述具体的输出文件与 blocked-extraction 行为。
- 更新包文档以澄清 memory 与 session search 是核心包,`generative-ui` 上游仅 macOS。

### Validation

- 为 `/review` durable-artifact 合同新增回归覆盖。
- 为平台感知可选 preset 与 Nervefeyn 感知 subagent spawn 新增回归覆盖。
- Release 前运行了真实 installed-global review、package-list/install、subagent 与 extension-load 检查。

## v0.2.35 - 2026-04-18

### Fixes

- 恢复 `/deepresearch` 确认门:工作流现在写入 `outputs/.plans/<slug>.md`,总结 plan,等待用户显式批准后再搜索、起草、引用或交付最终 artifact。
- 改变顶层工作流调用,使 `nervefeyn deepresearch ...` 在真实终端里像 REPL 工作流一样行为,而不是强制一次性执行。
- 给 Pi 的 CLI entrypoint 加 Nervefeyn wrapper,使完成的 print-mode 运行在 Pi 结束后干净退出。
- 收紧 direct-mode `/deepresearch` artifact 路径,使研究 note 与 verification 文件写入 `outputs/.drafts/`。

### Features

- 新增 section 聚焦的 `alpha_get_paper` 抽取,带 `section` / `sections` 过滤器,覆盖 abstract、introduction、methodology、experiments、results、discussion、limitations 与 conclusion。
- 通过 flag 与 `FEYNMAN_SUMMARIZE_*` 环境变量新增可配置 `/summarize` 上下文窗口控制。

### Documentation

- 新增公开 `RELEASES.md` 与 website release notes,使每个 release 都有可见的修复与功能历史。
- 更新 deep research 文档以描述 plan-confirmation 工作流与当前 PDF-safety 行为。

### Validation

- 真实 installed-global REPL 测试:输入 `/deepresearch what is BM25`,验证批准前只有 plan 存在,然后回复 `yes` 并验证最终报告、provenance、草稿、cited draft、研究 note 与 verification artifact。
- 完整本地测试通过:117/117。
- Typecheck、build、website build、本地 pack 与本地全局安装检查通过。

## v0.2.34 - 2026-04-18

### Fixes

- 收紧 `/deepresearch`,使 direct-mode 研究在起草前必须使用至少三个不同的搜索词或角度。
- 要求 direct-mode `/deepresearch` 在 direct 研究 artifact 中记录确切的搜索词。
- 为多查询 deep research 合同新增回归覆盖。

### Validation

- `/deepresearch what is BM25` 的真实 RPC smoke 测试完成并写入所需的 plan、草稿、cited draft、最终报告与 provenance artifact。
- Release CI 发布了 macOS arm64/x64、Linux x64 与 Windows x64 的 npm 与 native bundle。

## v0.2.33 - 2026-04-18

### Fixes

- 把 `/deepresearch` 从冗长的 protocol 风格 prompt 重写为更短的执行 checklist,使本地模型更不容易 echo 指令而不是干活。
- 让窄的 direct-mode 研究在不 spawn verifier 或 reviewer subagent 的情况下完成。
- 除非显式请求 PDF 抽取,否则避免 `/deepresearch` 中易崩溃的 PDF parser 路径。

### Validation

- `/deepresearch what is BM25` 的真实 RPC 完成并写入所需 artifact 与 `agent_end`。
- 完整本地测试、typecheck、build、audit、website build 与 pack dry-run 在 release 前通过。

## v0.2.32 - 2026-04-18

### Fixes

- 修复 Pi subagent 并行输出传播,使顶层任务 `output` 路径被尊重。
- 为 subagent 输出交接行为新增前台与异步回归覆盖。
- 围绕 durable artifact 与 provenance 加固 deep research prompt。

## v0.2.31 - 2026-04-17

### Fixes

- 修复 Nervefeyn runtime auth 环境传播,使启动的 Pi session 能看到期望的 model provider 凭证。
- 在 auth 修复后重新验证 setup 与 runtime 启动路径。

## v0.2.30 - 2026-04-17

### Fixes

- 修复 runtime patch 层中的 Pi subagent 任务输出处理。
- 为多代理工作流保留内置 research-agent 文件交接。

## v0.2.29 - 2026-04-17

### Maintenance

- 更新内置 Pi runtime 包。
- 针对刷新的 runtime 包集合重建 native release artifact。

## v0.2.28 - 2026-04-17

### Maintenance

- 移除 runtime hygiene extension 臃肿,让内置 runtime 更接近上游 Pi 行为。
- 减少自定义 extension surface,使研究 agent 更简洁。

## v0.2.27 - 2026-04-17

### Fixes

- 为 workflow 状态转换新增 Pi event guard。
- 改进长时间运行研究操作周围的 workflow 状态跟踪。

## v0.2.26 - 2026-04-17

### Fixes

- 把研究 context hygiene 切换到 Pi runtime hook,而不是额外的自定义 runtime 逻辑。
- 改进与上游 Pi runtime 行为的兼容性。

## v0.2.25 - 2026-04-17

### Fixes

- 修复 workflow 续作与 provider setup 缺口。
- 改进 model-provider 配置的 setup 流程行为。

## v0.2.24 - 2026-04-16

### Fixes

- 链接核心 Pi 包的内置 runtime 依赖。
- 解决已安装核心包的缺失依赖错误。

## v0.2.23 - 2026-04-16

### Features

- 为本地模型工作流新增 LM Studio setup 支持。
- 新增 blocked-research artifact 处理,使中断的运行保留有用状态。

## v0.2.22 - 2026-04-16

### Features

- 新增一等 LM Studio setup。
- 改进本地模型 onboarding 默认值。

## v0.2.21 - 2026-04-16

### Fixes

- 修复 extension 修复行为。
- 新增 Opus 4.7 模型 overlay。

## v0.2.20 - 2026-04-16

### Release

- 在重复 npm 版本阻塞 release 后恢复 publish workflow 行为。
- Native bundle 通过 GitHub release 持续可用。

## v0.2.19 - 2026-04-16

### Fixes

- 当 npm 版本已存在时跳过 release 发布。
- 防止 npm 发布成功后重复 publish 尝试失败 pipeline。

## v0.2.18 - 2026-04-16

### Release

- 准备当前 npm 与 native-bundle pipeline 使用的 release 自动化 baseline。
