# EEGDataScience REST Connector — Nervefeyn 实验平台对接(子项目 A)

**Date:** 2026-07-15
**Status:** Design — awaiting user review
**Scope:** 为 Nervefeyn 新增 `eegds` Pi tool(单工具 + action 路由),对接 `/Users/xiatian/Desktop/EEG-Science` 的 EEGDataScience FastAPI 平台。覆盖 4 个 API 面(离线分析 / NeuroLink 状态 / 批量分析+报告 / BrainFlow 采集控制),结果落盘 + per-call Markdown provenance sidecar。完全新增,不修改现有生物医学/EEG 数据源能力。

## 1. 动机与定位

### 1.1 问题

用户的核心研究是「跨学科任务切换对心流状态的影响及 EEG 恢复时间量化研究」,实验平台是自建的 EEGDataScience(FastAPI app at `/Users/xiatian/Desktop/EEG-Science`)。该平台已具备完整分析管线(心流恢复/频谱/ERP/ERSP/地形图/Focus/伪迹/统计)、NeuroLink 实时 WebSocket 采集、BrainFlow 本地硬件采集、批量分析与报告导出。

Nervefeyn 昨日(2026-07-14)已新增**通用** EEG 支持:4 个数据源(OpenNeuro/DANDI/PhysioNet/TUH)+ `eeg-analysis` MNE skill + workbench 信号预览。但 Nervefeyn **无法访问用户的 EEGDataScience 平台**——agent 不能调用 `/api/analyze` 跑恢复时间分析、不能查 NeuroLink 当前心流状态、不能批量处理 `data/recordings/` 下的 NeuroLink CSV、不能控制 BrainFlow 采集。

这导致用户做研究时必须在 Nervefeyn(研究/文献侧)与 EEGDataScience(实验/分析侧)之间手动切换,实验结果无法进入 Nervefeyn 的研究上下文,无法被 `/lit` `/deepresearch` `/ar` 等研究命令消费,也无法生成带 provenance 的可审计 artifact。

### 1.2 子项目 A 的定位

本 spec 是「全链路研究闭环」4 个子项目中的第一个:

| 子项目 | 内容 | 状态 |
|---|---|---|
| **A(本 spec)** | EEGDataScience REST connector | 本 spec |
| B | eegds-flow-recovery skill(6 指标/4 条件/统计方法的 prompt 编码 + provenance 规范) | 后续独立 spec |
| C | 研究闭环编排(把 A+B 接入 `/lit` `/deepresearch` `/ar`,产 `papers/<slug>.md`) | 后续独立 spec |
| D | workbench NeuroLink 实时监测面(实时波形/心流状态/阶段可视化) | 后续独立 spec |

A 是闭环的基础:没有 API 接入,B/C/D 都无法落地。

### 1.3 与 AGENTS.md "为生存而战"原则的对齐

AGENTS.md 要求每个新功能直接改进至少一项核心研究工作。本 connector 服务的核心工作:

- **规划或运行复现与 research 实验** → `analyze` / `batch_analyze` 让 agent 能驱动 EEGDataScience 跑实验
- **将声明与来源、代码、数据或实验进行核对** → `analyze` 返回 recovery_time/band_powers 等,agent 可对照文献核对该实验结论
- **提升研究循环的速度、可观测性、provenance 或可靠性** → per-call provenance sidecar 让每次 API 调用可审计;`neurolink_dashboard` 让 agent 感知当前实验状态

### 1.4 非目标

明确不做(留后续 spec 或永远不做):
- eegds-flow-recovery skill(6 指标/4 条件/统计方法解读)→ 子项目 B
- 研究闭环编排(接入 `/lit` `/deepresearch` `/ar`)→ 子项目 C
- workbench 实时监测面(WS 推送、波形 Canvas)→ 子项目 D
- 修改 EEGDataScience 本身 → connector 只消费其 API
- 自动启动/停止 EEGDataScience 进程 → Nervefeyn 不管理外部进程
- EEGDataScience 版本探测 → 避免 API 漂移耦合
- auth/token 机制 → EEGDataScience 是单机桌面应用,无认证
- 实时 WebSocket 推送 → `neurolink_dashboard` 只提供快照,实时流留给 D
- 重写或包装现有的 4 个 EEG 数据源扩展 → 作用域不同(数据源是公开数据集检索,本 connector 是用户私有实验平台)

## 2. 架构

### 2.1 文件布局

```
extensions/research-tools/
├── eegds-connector.ts                # 新增:connector 主体(tool 注册 + action 路由 + HTTP + provenance writer)
├── shared.ts                          # 复用:fetchText / safeLimit 等既有 helpers
└── (现有 4 个 science-database-eeg-*.ts 不动)

extensions/research-tools.ts           # 修改:加 registerEegdsConnector(pi) 调用

src/workbench/
├── settings-store.ts                  # 修改:加 eegds namespace(baseUrl/timeoutMs/batchPollIntervalMs/batchMaxPollMs/autoHealthCheck)
└── capability-settings.ts             # 修改:把 EEGDataScience 暴露为一项 capability(workbench 可开关)

tests/
└── eegds-connector.test.ts            # 新增:15 个测试用例(mock fetch,无真实 EEGDataScience 依赖)

README.md / AGENTS.md / CHANGELOG.md   # 文档同步
```

### 2.2 模块边界

`eegds-connector.ts` 是自包含的 Pi extension tool,**不依赖**其他 EEG 扩展(4 个数据源、eeg-analysis skill、eeg-preview-renderer)。它只依赖:
- `extensions/research-tools/shared.ts` 的 HTTP helpers(沿用 `safeLimit` / `fetchText` / `REQUEST_TIMEOUT_MS` 模式)
- `src/workbench/settings-store.ts` 读取 `eegds` 配置
- Node 标准库(`path` / `fs` / `crypto` 用于文件路径校验与 SHA256)

文件规模预估:单文件 ~450 行(tool 注册 ~30 + action 路由 ~80 + 11 个 action handler ~200 + provenance writer ~60 + HTTP client wrapper ~40 + 类型定义 ~40)。超 600 行再拆 `eegds-shared.ts` + `eegds-actions.ts`。

### 2.3 数据流

**离线分析流(典型):**
```
用户: "用 EEGDataScience 分析 data/recordings/xxx.csv 的恢复时间"
  → 主 agent 调用 eegds tool,action=analyze,filepath="data/recordings/xxx.csv",slug="flow-recovery-s01"
  → connector:
    1. 健康检查(首次,5min 缓存):GET <baseUrl>/api/neurolink/status → 200 OK
    2. 校验 filepath 在 workspace 内 → resolve 后前缀校验通过
    3. 读文件,multipart POST /api/upload → 返回 {filepath, format, n_channels, fs}
    4. POST /api/analyze(hp/lp/notch/window_sec/tolerance 透传)→ 大 JSON
    5. 完整 JSON 写 outputs/flow-recovery-s01/eegds-results.json
    6. 提取摘要(recovery_time_sec/flow_index/band_powers/focus_avg/artifact_ratio)
    7. 追加 provenance 到 outputs/flow-recovery-s01.provenance.md
    8. 返回摘要 + results_file 路径给 agent
  → agent 综合摘要到研究简报,需要细节时 Read eegds-results.json
```

**批量分析流(异步):**
```
用户: "对 data/recordings/ 全部 CSV 跑批量分析"
  → agent 调 eegds(action=batch_analyze, files=[...], assignments=[...], slug="batch-20260715")
  → connector:
    1. 校验 files 与 assignments 长度一致
    2. POST /api/batch-analyze(multipart 多文件 + assignments JSON)
    3. 立即返回 {ok, batch_id, total, status:"running"}(不阻塞)
  → agent 调 eegds(action=batch_progress, batch_id=...) 轮询(2s 间隔)
    → 返回 {total, current, current_file, current_module, status, errors[]}
  → status="done" 后,agent 调 eegds(action=batch_report, batch_id=..., slug="batch-20260715")
    → connector GET /api/export-batch-report?batch_id= → ZIP 二进制
    → 写 outputs/batch-20260715/eegds-batch-report.zip
    → 返回 {ok, zip_file}
```

**NeuroLink 状态查询流:**
```
用户: "当前 NeuroLink 心流状态如何"
  → agent 调 eegds(action=neurolink_dashboard, slug="live-monitor")
  → connector GET <baseUrl>/api/neurolink/dashboard
  → 返回 {ok, connected, flow_state, flow_index, buffer_duration_sec, last_analysis{...}, auto_analysis{...}}
  → (无大数组,直接返回,不落盘)
```

## 3. Tool 表面与 Action 路由

### 3.1 Tool 注册

单 Pi tool `eegds`,参数 schema:

```typescript
type EegdsToolParams = {
  action: EegdsAction;          // 必传,路由用
  slug?: string;                // 可选,默认 "eegds-default",定位 outputs/<slug>/
  // action-specific 参数见下表
};

type EegdsAction =
  | "health_check"
  | "analyze"
  | "neurolink_dashboard"
  | "neurolink_last_analysis"
  | "neurolink_recent_eeg"
  | "batch_analyze"
  | "batch_progress"
  | "batch_report"
  | "realtime_status"
  | "realtime_start"
  | "realtime_stop";
```

### 3.2 Action 明细

| action | EEGDataScience endpoint | key params | return shape(摘要) |
|---|---|---|---|
| `health_check` | `GET /api/neurolink/status` | — | `{ok, baseUrl, latencyMs}` |
| `analyze` | `POST /api/upload` + `POST /api/analyze` | `filepath`(必传,workspace 内) \| `subject` `condition` `hp` `lp` `notch` `window_sec` `tolerance` | `{ok, recovery_time_sec, flow_index, band_powers{delta,theta,alpha,beta,gamma}, focus_avg, artifact_ratio, conditions, results_file}` |
| `neurolink_dashboard` | `GET /api/neurolink/dashboard` | — | `{ok, connected, flow_state, flow_index, buffer_duration_sec, last_analysis{has_results,timestamp,error}, auto_analysis{enabled,interval}}` |
| `neurolink_last_analysis` | `GET /api/neurolink/last-analysis` | — | `{ok, results_summary, timestamp, duration, error, running, results_file}` |
| `neurolink_recent_eeg` | `GET /api/neurolink/recent-eeg?n=` | `n_samples`(默认 1200,最大 5000) | `{ok, fs, n_samples, duration_sec, samples_file}` |
| `batch_analyze` | `POST /api/batch-analyze` | `files[]`(workspace 内路径数组) `assignments[]`(`{filename,subject,condition}`) | `{ok, batch_id, total, status:"running"}` |
| `batch_progress` | `GET /api/batch-progress/{batch_id}` | `batch_id` | `{ok, total, current, current_file, current_module, status, errors[]}` |
| `batch_report` | `GET /api/export-batch-report?batch_id=` | `batch_id` | `{ok, zip_file}` |
| `realtime_status` | `GET /api/realtime/status` | — | `{ok, state, board_name, fs, channels, n_clients, elapsed_sec, packets_lost}` |
| `realtime_start` | `POST /api/realtime/start` | `board_id`(`synthetic\|cyton\|daisy\|ganglion`) `serial_port?` `mac_address?` | `{ok, board_id, board_name, fs, channels, n_exg}` |
| `realtime_stop` | `POST /api/realtime/stop` | — | `{ok, elapsed_sec}` |

### 3.3 关键设计点

- **`analyze` 接受 `filepath` 而非文件内容** — agent 传 workspace 内路径,connector 读文件 multipart 上传到 EEGDataScience。避免 agent 把文件内容塞进 tool 参数污染上下文,也避免 base64 编码开销。
- **`realtime_start` 强制校验** — `board_id != "synthetic"` 时,connector 二次校验参数:`cyton`/`daisy` 要求 `serial_port`,`ganglion` 要求 `mac_address`。缺失则返回 `{ok:false, error:"missing_hardware_params"}` 不发请求(防止误触发硬件)。
- **大数组永远落地** — `neurolink_recent_eeg` 的 samples、`analyze` 的 viz_data/topomap_data、`batch_report` 的 ZIP 都写文件,return 里只放路径与摘要。严格遵守 AGENTS.md「优先采用基于文件的交接」。
- **slug 透传** — agent 调用时传 `slug` 参数(沿用 AGENTS.md `<slug>` 约定),connector 用它定位 `outputs/<slug>/` 目录与 `outputs/<slug>.provenance.md`。无 slug 时用 `eegds-default`。
- **`batch_analyze` 异步** — 立即返回 `batch_id`,不阻塞 agent。agent 用 `batch_progress` 轮询,`status="done"` 后用 `batch_report` 拉 ZIP。轮询节奏由 agent 决定(connector 不自动轮询)。

## 4. 结果落盘与 Provenance

### 4.1 文件落盘约定(遵循 AGENTS.md `<slug>` 命名)

```
outputs/<slug>/
├── eegds-results.json              # analyze 完整结果(viz_data/topomap_data/band_powers/focus_scores)
├── eegds-last-analysis.json        # neurolink_last_analysis 完整 results
├── eegds-recent-eeg.json           # neurolink_recent_eeg samples 数组
├── eegds-batch-report.zip          # batch_report ZIP
└── eegds-batch-progress.json       # 最后一次 batch_progress 快照

outputs/<slug>.provenance.md        # 单一 provenance sidecar,按时间追加
```

### 4.2 Provenance sidecar 格式(Markdown lab-notebook 风格,沿用 CHANGELOG.md 约定)

```markdown
# EEGDataScience Provenance — <slug>

## 2026-07-15T14:32:11+08:00 — analyze
- endpoint: POST /api/upload + POST /api/analyze
- params: {subject:"S01", condition:"AtoB", hp:1.0, lp:45.0, notch:50, window_sec:4, tolerance:0.05}
- source_file: data/recordings/NeuroLink_unknown_AtoA_20260714_135913.csv
- eegds_url: http://localhost:18765
- result_file: outputs/<slug>/eegds-results.json
- summary: {recovery_time_sec: 42.3, flow_index: 0.68, artifact_ratio: 0.07}
- verification: unverified
- notes: —

## 2026-07-15T14:35:02+08:00 — neurolink_dashboard
- endpoint: GET /api/neurolink/dashboard
- params: {}
- summary: {connected:true, flow_state:"entered", buffer_duration_sec:312.4}
- verification: inferred (实时数据,未离线复核)
```

### 4.3 Provenance 写入规则

- 每次 `eegds` tool 调用(无论成功/失败)追加一条记录到 `outputs/<slug>.provenance.md`
- 失败记录:`verification: blocked`,记 endpoint + error message + params
- `verification` 字段取值:`verified` / `unverified` / `blocked` / `inferred`,与 AGENTS.md 约定一致
- agent 不需要主动写 provenance — connector 在 tool 实现里自动追加
- sidecar 与 `outputs/<slug>/` 同级,便于 verifier subagent 按路径定位
- 时间戳用本地时区 ISO8601(如 `2026-07-15T14:32:11+08:00`)

### 4.4 返回给 agent 的摘要永远不含

- 完整 `viz_data` / `topomap_data` 数组(写 `results_file`)
- `samples` 原始数组(写 `samples_file`)
- ZIP 二进制(写 `zip_file`)
- 单个 channel 的逐点数据

## 5. Config 与 Health Check

### 5.1 Settings-store 配置(`src/workbench/settings-store.ts` 加 `eegds` namespace)

```typescript
type EegdsSettings = {
  baseUrl: string;             // 默认 "http://localhost:18765"
  timeoutMs: number;           // 默认 60_000(analyze 可达 40s)
  batchPollIntervalMs: number; // 默认 2_000(batch_progress 轮询间隔,仅作 suggestion,agent 自决)
  batchMaxPollMs: number;      // 默认 900_000(15 min 上限,超时返回当前进度)
  autoHealthCheck: boolean;    // 默认 true(首次调用前自动 ping)
};
```

### 5.2 配置来源优先级

1. workbench settings-store(`~/.feynman/orgs/<org>/workbench/settings.json` 的 `eegds` 字段)
2. 环境变量覆盖:`NERVEFEYN_EEGDS_URL`、`NERVEFEYN_EEGDS_TIMEOUT_MS`
3. 上述默认值

### 5.3 健康检查策略

- `autoHealthCheck: true` 时,connector 在**首次** tool 调用前懒检查一次:GET `<baseUrl>/api/neurolink/status`,2s 超时
- 检查失败 → 该次调用直接返回(不发实际请求):
  ```json
  {"ok":false,"error":"eegds_not_running","message":"EEGDataScience not reachable at http://localhost:18765. Start it via `bash /Users/xiatian/Desktop/EEG-Science/start.command` or set NERVEFEYN_EEGDS_URL."}
  ```
- 检查成功 → 缓存 5 分钟,期间不再检查
- `autoHealthCheck: false` 时,跳过检查,直接发请求(请求失败时返回同样的 `eegds_not_running` 错误,但带 HTTP 详情)
- 显式 `action: "health_check"` 永远执行实时检查(不读缓存),返回 `{ok, baseUrl, latencyMs}`

### 5.4 不做

- 不自动启动 EEGDataScience 进程(Nervefeyn 不管理外部进程,违反"AI 研究者"定位)
- 不做 EEGDataScience 版本探测(避免 API 漂移耦合,只用 `/api/neurolink/status` 这一个稳定端点探活)
- 不做 auth/token(EEGDataScience 是单机桌面应用,无认证)

## 6. 错误处理

### 6.1 错误分类与响应(所有错误都写 provenance `verification: blocked`)

| 场景 | error code | HTTP 行为 | agent 可读 message |
|---|---|---|---|
| EEGDataScience 未启动 | `eegds_not_running` | 不发请求(健康检查失败) | "EEGDataScience not reachable at `<baseUrl>`. Start via `bash /Users/xiatian/Desktop/EEG-Science/start.command` or set NERVEFEYN_EEGDS_URL" |
| 请求超时 | `eegds_timeout` | AbortController 触发 | "Request to `<endpoint>` timed out after `<timeoutMs>`ms" |
| HTTP 4xx/5xx | `eegds_http_error` | 读 response body | "EEGDataScience returned `<status>`: `<body>`" |
| `analyze` 文件不存在 | `file_not_found` | 不发请求 | "File `<path>` not found in workspace" |
| `analyze` 文件不在 workspace 内 | `file_outside_workspace` | 不发请求 | "File `<path>` outside workspace (security)" |
| `realtime_start` 硬件参数缺失 | `missing_hardware_params` | 不发请求 | "board_id=`<board>` requires `<serial_port|mac_address>`" |
| `batch_analyze` files/assignments 长度不匹配 | `batch_assignment_mismatch` | 不发请求 | "files count (`<n>`) != assignments count (`<m>`)" |
| `batch_progress` batch_id 不存在 | `batch_not_found` | EEGDataScience 返回 404 | "batch_id `<id>` not found" |
| 响应 JSON 解析失败 | `eegds_parse_error` | — | "Failed to parse EEGDataScience response: `<snippet>`" |

### 6.2 安全约束

- `analyze` / `batch_analyze` 的 `filepath` / `files[]` 必须在 Nervefeyn workspace 内(防 agent 传 `/etc/passwd` 之类),用 `path.resolve` + workspace root 前缀校验
- 不接受 URL 作为 filepath(只接受本地路径)
- `realtime_start` 非 synthetic 板卡要求确认参数(已在 §3.3 定义)
- multipart 上传时,文件 Content-Type 用 `application/octet-stream`,不执行 EEGDataScience 返回的任何内容

## 7. 测试策略

### 7.1 单元测试(`tests/eegds-connector.test.ts`)

沿用 `tests/science-database-arxiv.test.ts` 的 mock fetch 模式,不依赖真实 EEGDataScience:

| # | 测试 | 覆盖 |
|---|---|---|
| 1 | `health_check` 成功 | 返回 `{ok, baseUrl, latencyMs}`,5min 缓存生效 |
| 2 | `health_check` 失败 | `eegds_not_running` 错误,message 含 start.command 提示 |
| 3 | `health_check` 超时 | 2s 超时触发 `eegds_timeout` |
| 4 | `analyze` 成功 | multipart 上传、参数透传、摘要提取、results.json 落盘、provenance 追加 |
| 5 | `analyze` 文件不存在 | `file_not_found` 错误 |
| 6 | `analyze` 文件超出 workspace | `file_outside_workspace` 错误 |
| 7 | `analyze` EEGDataScience 返回 500 | `eegds_http_error` 错误 |
| 8 | `neurolink_dashboard` 成功 | 字段提取、`connected:false` 时正确返回 |
| 9 | `neurolink_recent_eeg` 大数组落盘 | samples 写文件、return 只含路径 |
| 10 | `batch_analyze` 异步返回 | 立即返回 batch_id、不阻塞 |
| 11 | `batch_progress` 三态 | running / done / failed 正确解析 |
| 12 | `batch_report` ZIP 落盘 | 二进制写文件、return zip_file 路径 |
| 13 | `realtime_start` synthetic 成功 | 最小参数路径 |
| 14 | `realtime_start` cyton 缺 serial_port | `missing_hardware_params` 错误 |
| 15 | provenance sidecar 追加 | 多次调用后 sidecar 有多条记录、verification 字段正确、slug 缺失时默认 `eegds-default` |

### 7.2 手动验证(实现后)

1. 启动 EEGDataScience:`bash /Users/xiatian/Desktop/EEG-Science/start.command`
2. `nervefeyn "用 EEGDataScience 分析 data/recordings/NeuroLink_unknown_AtoA_20260714_135913.csv 的恢复时间"`
3. 验证:
   - agent 调用 `eegds` tool(action=analyze)
   - `outputs/<slug>/eegds-results.json` 生成,含 viz_data/topomap_data
   - `outputs/<slug>.provenance.md` 追加一条 `analyze` 记录,verification=unverified
   - agent 返回的摘要含 recovery_time_sec / band_powers / focus_avg
4. 关闭 EEGDataScience,再跑同样命令,验证 `eegds_not_running` 错误 message 含 start.command 提示

## 8. 文档同步

### 8.1 README.md

**第 6 行简介补充:**
> 开源 AI 研究代理 — 生物医学与神经计算研究工作台。基于 Pi 运行时,内置论文搜索、文献综述、多代理深度调查、有界实验循环与长线自主研究;EEG 数据集检索(OpenNeuro/DANDI/PhysioNet/TUH)、MNE 信号处理与时频/群体统计、workbench 时域/频谱/拓扑预览;**EEGDataScience 实验平台对接(REST connector:离线分析/NeuroLink 状态/批量报告/BrainFlow 采集控制)**。

**"Skills 与工具" 段加 **Nervefeyn EEGDataScience Connector** 子段(放在 "Nervefeyn Neural Tools" 之后):**
> - **Nervefeyn EEGDataScience Connector** — 对接用户 EEGDataScience FastAPI 平台的 `eegds` tool,11 个 action:离线分析(`analyze`,上传 CSV 跑 5 模块全管线,返回 recovery_time/band_powers/focus 摘要)、NeuroLink 状态查询(`neurolink_dashboard`/`neurolink_last_analysis`/`neurolink_recent_eeg`)、批量分析与报告导出(`batch_analyze`/`batch_progress`/`batch_report`,异步轮询+ZIP 落盘)、BrainFlow 采集控制(`realtime_status`/`realtime_start`/`realtime_stop`,硬件参数校验)。结果落盘到 `outputs/<slug>/`,每次调用追加 provenance 到 `outputs/<slug>.provenance.md`。配置项:`eegds.baseUrl`(默认 `http://localhost:18765`)、`eegds.timeoutMs`、`eegds.autoHealthCheck`。

**"你输入什么 → 会发生什么" 段加示例:**
```
$ nervefeyn "用 EEGDataScience 分析 data/recordings/NeuroLink_unknown_AtoA_20260714_135913.csv 的恢复时间"
→ 调 eegds(action=analyze),上传文件,跑 5 模块全管线,返回 recovery_time/band_powers/focus 摘要
  完整结果落 outputs/<slug>/eegds-results.json + provenance sidecar
```

### 8.2 AGENTS.md

**"功能范围" 段(第 31–46 行)在 EEG/神经计算条目后加一项:**
> - EEGDataScience 实验平台对接:REST connector(`eegds` tool,11 action)调用 EEGDataScience 离线分析/NeuroLink 状态/批量报告/BrainFlow 采集,结果落盘 + per-call Markdown provenance sidecar

### 8.3 CHANGELOG.md

按 lab notebook 约定追加:
```
## 2026-07-15
- slug: eegds-connector
- 新增 EEGDataScience REST connector(eegds tool,11 action:health_check/analyze/neurolink_*/batch_*/realtime_*)
- 服务于:运行复现实验 + 声明核对(子项目 A,全链路研究闭环第一跳)
- 验证:unverified(待实现 + 测试通过后转 verified)
- 下一步:实现 plan → 编码 → npm test 全绿;子项目 B(eegds-flow-recovery skill)独立 spec
```

## 9. 实现顺序与依赖

建议实现顺序(每步可独立验证):

1. **类型定义与配置(§5)** — `EegdsSettings` / `EegdsAction` / `EegdsToolParams` 类型 + settings-store 接入
2. **HTTP client wrapper + 健康检查(§5.3)** — `eegdsFetch` 函数(带 timeout/AbortController)+ `healthCheck`(带 5min 缓存)
3. **provenance writer(§4.3)** — `appendProvenance(slug, entry)` 函数
4. **11 个 action handler(§3.2)** — 从 `health_check` 开始,逐步加 `analyze` / `neurolink_*` / `batch_*` / `realtime_*`
5. **tool 注册(§3.1)** — `registerEegdsConnector(pi)` + action 路由
6. **测试(§7.1)** — 15 个测试用例,与 action handler 同步写
7. **文档同步(§8)** — README/AGENTS.md/CHANGELOG.md

步骤 1-3 可并行;步骤 4 依赖 1-3;步骤 5 依赖 4;步骤 6 与 4-5 同步;步骤 7 在代码完成后统一更新。

## 10. 验证标准

| 验证项 | 标准 |
|---|---|
| TypeScript 类型检查 | `npm run typecheck` 通过 |
| 单元测试 | `npm test` 全绿(含 15 个新测试用例) |
| 构建 | `npm run build` 通过 |
| connector 注册 | `npm run dev` 启动后 `eegds` tool 出现在 Pi tool 列表 |
| 离线分析手动验证 | 启动 EEGDataScience,`nervefeyn "用 EEGDataScience 分析 data/recordings/*.csv 的恢复时间"` 返回摘要 + 落盘 + provenance |
| 错误降级验证 | 关闭 EEGDataScience,同样命令返回 `eegds_not_running` 错误,message 含 start.command 提示 |
| 硬件安全验证 | `nervefeyn "启动 Cyton 采集"`(缺 serial_port)返回 `missing_hardware_params` 不发请求 |
| 文档同步 | README 第 6 行含 "EEGDataScience";AGENTS.md "功能范围" 含 EEGDataScience 条目;CHANGELOG 有 eegds-connector 条目 |

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| EEGDataScience API 变更导致解析失败 | 沿用 mock fetch 测试,不依赖真实 API;API 变更只影响一个 action handler;provenance 记录原始 endpoint 便于追溯 |
| EEGDataScience 未启动 | 健康检查 + 明确错误 message(含 start.command 提示);`autoHealthCheck:false` 时降级为请求失败带 HTTP 详情 |
| `analyze` 大文件上传耗时 | 60s timeout 默认;agent 可在 slug 命名上区分多次调用;provenance 记录耗时 |
| batch 长时间运行(16 文件 × 40s ≈ 10min) | 异步设计,agent 轮询 `batch_progress`,不阻塞;`batchMaxPollMs` 15min 上限,超时返回当前进度 |
| agent 传 workspace 外路径 | `path.resolve` + workspace root 前缀校验,`file_outside_workspace` 错误 |
| `realtime_start` 误触发硬件 | 非 synthetic 板卡强制校验 `serial_port`/`mac_address`;`missing_hardware_params` 错误不发请求 |
| NeuroLink CSV 格式与 EEGDataScience 期望不符 | connector 不解析 CSV,只透传给 EEGDataScience;格式错误由 EEGDataScience 返回 `eegds_http_error`,message 含其原始报错 |
| 与上游 companion-inc/feynman 的 diff 增大 | 这是 fork 的预期方向;connector 作为独立文件易于合并冲突解决 |
| settings-store schema 变更 | `eegds` namespace 独立,字段加默认值,向后兼容 |

## 12. 范围边界

### 12.1 包含

- `eegds` Pi tool,11 个 action(health_check/analyze/neurolink_dashboard/neurolink_last_analysis/neurolink_recent_eeg/batch_analyze/batch_progress/batch_report/realtime_status/realtime_start/realtime_stop)
- settings-store `eegds` namespace 配置(baseUrl/timeoutMs/batchPollIntervalMs/batchMaxPollMs/autoHealthCheck)
- per-call Markdown provenance sidecar(单一追加式,`outputs/<slug>.provenance.md`)
- 文件落盘约定(`outputs/<slug>/eegds-*.json|zip`)
- 15 个单元测试 + 手动验证
- README/AGENTS.md/CHANGELOG.md 同步

### 12.2 不包含(留后续 spec)

- **B: eegds-flow-recovery skill** — 6 指标(Theta/Alpha 比值、Alpha/Beta/Gamma 能量、谱熵、认知负载)/4 条件(A→A/A→B/A→C/B→C)/恢复时间定义(±5% 容差,30s 连续窗口)/统计方法(配对 t 检验、重复测量 ANOVA、cluster-based permutation)的 prompt 编码。connector 只调 API 返回数据,不教 agent 怎么解读;解读知识在 B。
- **C: 研究闭环编排** — 把 connector + skill 接入 `/lit` `/deepresearch` `/ar`,编排「文献→实验→分析→provenance→论文草稿」闭环,产 `papers/<slug>.md`。connector 只提供数据接入,不编排研究流程。
- **D: workbench NeuroLink 监测面** — 实时波形/心流状态/阶段的可视化 surface(WS 推送、Canvas 滚动)。connector 只提供 `neurolink_dashboard` 状态查询(快照),不做实时 WS 推送。
- 修改 EEGDataScience 本身(它是独立项目,connector 只消费它的 API)
- EEGDataScience 进程管理(不自动启动/停止)
- 实时 WebSocket 推送(`neurolink_dashboard` 是快照查询,实时流留给 D)
- EEGDataScience 版本探测与 API 兼容矩阵
- auth/token 机制(EEGDataScience 单机无认证)
