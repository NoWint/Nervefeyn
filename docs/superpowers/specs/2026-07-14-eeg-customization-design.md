# EEG 定制 — Nervefeyn 神经计算扩展(学科定制 #1)

**Date:** 2026-07-14
**Status:** Design — awaiting user review
**Scope:** 为 Nervefeyn 新增 EEG/神经计算研究能力:4 个 EEG 数据源、MNE-Python 分析 skill、workbench 信号预览 surface。完全新增,不修改现有生物医学能力。后续神经科学(Allen Brain/ModelDB/NeuroMorpho)与计算机科学(OpenReview/DBLP/Papers with Code)各自独立 spec。

## 1. 动机与定位

### 1.1 问题

Nervefeyn 当前深度聚焦生物医学/分子生物学/化学:`extensions/research-tools/` 下 50+ 个 `science-database-*.ts` 覆盖 PubMed/ChEMBL/gnomAD/GTEx/UniProt/cBioPortal/COSMIC 等,`skills/` 主要是 alphafold2/boltz/esmfold2/proteinmpnn 这类结构生物学工具。但 README 第 6 行已写"神经计算研究工作台",与实际能力存在定位矛盾。

用户研究工作流(已确认):
1. **文献驱动的 EEG 综合研究** — 读 EEG 论文、找数据集、复现方法、对比结果
2. **EEG 信号处理与分析** — MNE-Python 工作流:预处理、ERP/频谱、时频、群体统计

现有 Nervefeyn 能部分支撑工作流 1(通用论文搜索已覆盖 EEG 文献),但缺失 EEG 数据集检索;完全不能支撑工作流 2(无 MNE 工作流指南,无信号预览)。

### 1.2 EEG 定制的定位

本 spec 在不破坏现有生物医学能力的前提下,新增三块 EEG 能力:

| 块 | 服务于 | 与现有系统的关系 |
|---|---|---|
| 数据源扩展 | 工作流 1 — 找数据 | 沿用 `science-database-arxiv.ts` 模式,接入现有 `science-databases.ts` 路由 |
| eeg-analysis skill | 工作流 2 — 信号处理 | 新增 skill,与 `compute-env-setup`/`docker`/`modal-compute` 协同 |
| workbench 信号预览 | 工作流 2 — 可视化与检查 | 类比现有 Ketcher 化学 sketcher / sequence 预览 |

### 1.3 与 AGENTS.md "为生存而战"原则的对齐

AGENTS.md 要求"每个新功能都必须为生存而战,仅当某功能直接改进至少一项核心研究工作时才新增"。本 spec 每块改动都直接服务用户已确认的两项研究工作:

- 数据源扩展 → 工作流 1 的"找数据集"环节(此前需跳出 Nervefeyn 手动查 OpenNeuro)
- eeg-analysis skill → 工作流 2 的全流程(此前 Nervefeyn 无法指导 MNE 调用)
- 信号预览 → 工作流 2 的"检查中间结果"环节(此前需在 workbench 与外部查看器间反复切换)

### 1.4 非目标

明确不做:
- 神经科学(Allen Brain Atlas/ModelDB/NeuroMorpho/NeuroElectro)→ 独立 spec
- 计算机科学(OpenReview/DBLP/Papers with Code)→ 独立 spec
- 移除任何现有生物医学数据库或 skills → 违反"完全保留"决策
- `/eeg` slash command → 用户决定不加,可用自然语言或 `/ar` 触发
- `neuroscience-analyst` subagent → 避免与现有 4 个 subagent 职责重叠
- EEG 源定位、功能连接 → skill B 级范围不含(后续可选)

## 2. 架构

### 2.1 总体组件

```
extensions/research-tools/
├── science-database-eeg-shared.ts        # 共享 types + helpers(沿用 shared.ts 模式)
├── science-database-eeg-openneuro.ts     # OpenNeuro REST API
├── science-database-eeg-dandi.ts         # DANDI API
├── science-database-eeg-physionet.ts     # PhysioNet 数据集索引
├── science-database-eeg-tuh.ts           # TUH EEG Corpus
├── science-databases.ts                  # 注册 4 个新 source ID
└── science-database-specialty.ts         # SpecialtyScienceDatabaseSource 加 4 个新值

skills/eeg-analysis/
└── SKILL.md                              # MNE-Python 工作流 prompt

src/workbench/
├── file-types.ts                         # 加 .edf/.bdf/.fif/.set/.vhdr/.cnt 识别
├── eeg-preview-renderer.ts               # 调 Python 后端生成预览图(新增)
└── (现有预览路由扩展)                    # 加 eeg-preview 路由

tests/
├── science-database-eeg-openneuro.test.ts
├── science-database-eeg-dandi.test.ts
├── science-database-eeg-physionet.test.ts
├── science-database-eeg-tuh.test.ts
└── workbench-eeg-preview.test.ts

README.md / AGENTS.md / CHANGELOG.md      # 定位与文档同步
```

### 2.2 数据流

**数据源检索流(工作流 1):**
```
用户: "find EEG motor imagery datasets on OpenNeuro"
  → 主 agent 调用 science_database_search 工具,source="openneuro"
  → science-databases.ts 路由到 science-database-eeg-openneuro.ts
  → fetch OpenNeuro API → 标准化为 EegDatasetResult[]
  → 返回给 agent,综合到研究简报
```

**EEG 分析流(工作流 2):**
```
用户: "preprocess this EDF and compute alpha band power"
  → 主 agent 加载 eeg-analysis skill
  → skill 指导生成 Python 脚本(MNE 调用)
  → 通过 docker / modal-compute / 本地 Python 执行
  → 输出 figures/*.png + tables/*.csv + processed/*.fif
  → 写入 outputs/<slug>/
  → 生成 .provenance.md sidecar(MNE 版本、参数、随机种子)
```

**信号预览流(workbench):**
```
用户在 workbench 上传 .edf 文件
  → file-types.ts 识别为 EEG 信号
  → eeg-preview-renderer.ts 调用 Python(后端,缓存命中检查)
    → 缓存命中:直接返回 ~/.feynman/.../eeg-previews/<hash>.png
    → 未命中:运行 MNE 生成时域/PSD/topo/tfr PNG → 写缓存 → 返回
  → workbench 显示 4 张预览图
  → Python/MNE 缺失:显示 "Install MNE to preview" 提示(不报错)
```

## 3. 数据源扩展

### 3.1 共享结构(extensions/research-tools/science-database-eeg-shared.ts)

```typescript
export type EegModality = "EEG" | "MEG" | "iEEG" | "fMRI" | "mixed";

export type EegDatasetResult = {
  datasetId: string;          // 数据集唯一 ID(source-prefixed,如 "openneuro:ds003116")
  title: string;
  description?: string;
  modality: EegModality;
  subjects?: number;
  samplingRate?: number;      // Hz
  sessions?: number;
  tasks?: string[];           // motor imagery / resting state / ERP / seizure...
  ageRange?: { min?: number; max?: number };
  license?: string;           // CC0 / CC-BY / PDDL / Open Data Commons...
  url: string;                // 数据集主页(可访问)
  doi?: string;
  citation?: string;
  source: "openneuro" | "dandi" | "physionet" | "tuheeg";
};

export type EegSearchParams = {
  query: string;
  modality?: EegModality;
  tasks?: string[];
  limit?: number;             // 默认 5,最大 20
  sort?: "pub_date" | "relevance" | "subjects";
};
```

沿用 `science-database-arxiv.ts` 的 `safeLimit`、`cleanQuery`、`fetchText`、`REQUEST_TIMEOUT_MS = 25_000` 等约定。

### 3.2 OpenNeuro(extensions/research-tools/science-database-eeg-openneuro.ts)

**API:** `https://openneuro.org/api/crn/datasets` (GraphQL `query` 实际可用 `GET /api/datasets?public=true&q=<query>`)

**实现要点:**
- 查询参数:`q`(关键词)、`modality`(EEG/MEG/iEEG)、`limit`
- 解析 `results` 数组,提取 `id`(如 `ds003116`)、`latestSnapshot.description.Name`、`latestSnapshot.description.Participants`、`latestSnapshot.description.TaskName` 等 BIDS 字段
- URL: `https://openneuro.org/datasets/<id>`
- 默认按 relevance 排序

**Source ID:** `"openneuro"`(注册到 `SCIENCE_DATABASE_SOURCE_IDS` 与 `SpecialtyScienceDatabaseSource`)

### 3.3 DANDI(extensions/research-tools/science-database-eeg-dandi.ts)

**API:** `https://api.dandiarchive.org/api/datasets/`(`GET /api/datasets/?search=<q>&limit=<n>`)

**实现要点:**
- DANDI 是 NIH BRAIN Initiative 数据档案,覆盖 EEG/MEG/电生理/钙成像
- 查询参数:`search`、`limit`
- 解析 `results` 数组,提取 `identifier`(DANDI ID,如 `000409`)、`name`、`description`、`license`、`version: contact` 等
- URL: `https://dandiarchive.org/dandiset/<id>/<version>`
- DOI 与 citation 从 `manifest` 字段提取(若存在)

**Source ID:** `"dandi"`

### 3.4 PhysioNet(extensions/research-tools/science-database-eeg-physionet.ts)

**特殊处理:** PhysioNet 无统一 REST API,数据集列表是静态 HTML 页面。实现策略:

- 维护一份内置的 EEG 相关数据集静态清单(覆盖经典集:`chbmit`、`sleep-edf`、`eegmmidb` BCI2000、`capslpdb`、`slpdb`、`n1-2-eog` 等)
- 每个数据集条目预先填充:`datasetId`、`title`、`subjects`、`samplingRate`、`tasks`、`license`、`url`、`citation`
- 查询时按关键词在 title/description/tasks 上做大小写不敏感匹配
- 优点:不依赖网络,稳定
- 缺点:数据集清单需定期手动更新(在 CHANGELOG 中标注)

**Source ID:** `"physionet"`

### 3.5 TUH EEG Corpus(extensions/research-tools/science-database-eeg-tuh.ts)

**实现要点:**
- TUH EEG Corpus 是 Temple University 公开 EEG 库,包含多个子集:`tuh_eeg`、`tuh_eeg_abnormal`、`tuh_eeg_artifact`、`tuh_eeg_seizure`、`tuh_eeg_label`、`tuh_eeg_awake`、`tuh_eeg_sleep`
- 维护子集清单(类似 PhysioNet 的静态列表模式,因为 NEDC 页面无 search API)
- 每个子集条目:`datasetId`(如 `tuh-eeg-seizure`)、`title`、`subjects`、`sessions`、`samplingRate`、`tasks`、`license`、`url`、`citation`
- 查询时按关键词匹配子集名/描述

**Source ID:** `"tuheeg"`

### 3.6 路由接入

修改 `extensions/research-tools/science-databases.ts`:
- `SCIENCE_DATABASE_SOURCE_IDS` 数组加 `"openneuro"`、`"dandi"`、`"physionet"`、`"tuheeg"`
- `ScienceDatabaseSearchParams.source` 类型扩展
- 主搜索路由根据 `source` 分发到对应 `searchOpenNeuro/searchDandi/searchPhysionet/searchTuhEeg`

修改 `extensions/research-tools/science-database-specialty.ts`:
- `SpecialtyScienceDatabaseSource` 类型加上述 4 个值
- `isSpecialtyScienceDatabaseSource` 与 `searchSpecialtyScienceDatabase` 同步扩展

### 3.7 测试

| 测试文件 | 覆盖 |
|---|---|
| `tests/science-database-eeg-openneuro.test.ts` | query 解析、API 响应 mock、BIDS 字段提取、limit 边界 |
| `tests/science-database-eeg-dandi.test.ts` | query 解析、API 响应 mock、DANDI ID 格式、DOI 提取 |
| `tests/science-database-eeg-physionet.test.ts` | 静态清单匹配、关键词大小写不敏感、子集筛选 |
| `tests/science-database-eeg-tuh.test.ts` | 7 个子集的查询路由、子集 ID 格式 |

每个测试沿用 `tests/science-database-arxiv.test.ts` 的 mock fetch + 验证标准化结构模式。

## 4. eeg-analysis skill

### 4.1 文件位置

`skills/eeg-analysis/SKILL.md`

### 4.2 SKILL.md 内容范围

**frontmatter:** 沿用其他 skill 的格式(`name`、`description`、`when_to_use` 等)。

**MNE-Python 工作流指南(覆盖 B 级范围):**

#### 4.2.1 预处理
- **加载:** `mne.io.read_raw_edf/bdf/fif/eeglab/brainvision/cnt`(根据扩展名选择)
- **重参考:** `raw.set_eeg_reference(ref_channels='average'/'laplacian'/[])`
- **滤波:** `raw.filter(l_freq=0.5, h_freq=45)` + `raw.notch_filter(freqs=[50, 60])`
- **降采样:** `raw.resample(sfreq=200)`(在 ICA 之后避免伪迹混叠)
- **ICA 去伪迹:**
  ```python
  from mne.preprocessing import ICA, create_eog_epoch
  ica = ICA(n_components=15, method='fastica', random_state=42)
  ica.fit(raw.copy().filter(l_freq=1, h_freq=None))
  eog_epochs = create_eog_epoch(raw)
  eog_indices, eog_scores = ica.find_bads_eog(eog_epochs)
  ica.exclude = eog_indices
  raw_clean = ica.apply(raw.copy())
  ```
- **bad channels:** `raw.info['bads']` 手动或自动标记(`mne.preprocessing.peak_detection`)

#### 4.2.2 时域分析(ERP/ERF)
- **Events:** `mne.make_fixed_length_events` 或从 STIM channel 提取
- **Epoching:** `mne.Epochs(raw, events, event_id, tmin=-0.2, tmax=0.8, baseline=(None, 0))`
- **ERP:** `evoked = epochs.average()`
- **可视化:** `evoked.plot_joint()`(波形 + 拓扑)

#### 4.2.3 频域分析
- **PSD:** `raw.compute_psd(method='welch', fmin=0.5, fmax=45)` 或 `mne.time_frequency.psd_array_welch`
- **频带能量:**
  ```python
  bands = {'delta': (1, 4), 'theta': (4, 8), 'alpha': (8, 13),
           'beta': (13, 30), 'gamma': (30, 45)}
  psd = raw.compute_psd()
  band_power = {name: psd.copy().pick(...).get_data(fmin=fmin, fmax=fmax).mean() 
                for name, (fmin, fmax) in bands.items()}
  ```

#### 4.2.4 时频分析
- **STFT:** `mne.time_frequency.stft`
- **Morlet 小波:** `mne.time_frequency.tfr_morlet`
- **Hilbert 包络:** `raw.copy().filter(fmin, fmax).apply_hilbert(envelope=True)`

#### 4.2.5 群体统计
- **Cluster-based permutation:**
  ```python
  from mne.stats import spatio_temporal_cluster_test
  T_obs, clusters, p_values, _ = spatio_temporal_cluster_test(
      [condition_a_epochs, condition_b_epochs],
      n_permutations=1000, tail=0, threshold=None,
      adjacency=mne.channels.find_ch_adjacency(epochs.info, 'eeg'))
  ```
- **TFCE:** `mne.stats.threshold_free_cluster_enhancement`
- **多重比较校正:** `mne.stats.fdr_correction` / Bonferroni

### 4.3 执行环境

**默认假设:** 用户本地已装 Python ≥ 3.10 + `pip install mne mne[hdf5]`。skill 在 SKILL.md 顶部说明这一点,并提供 setup 命令。

**重型分析(可选):**
- Docker:引用现有 `docker` skill,提供 Dockerfile 模板基于 `mne/mne-python:latest`
- Modal:引用 `modal-compute` skill,提供远程执行示例
- RunPod:引用 `runpod-compute` skill,用于 GPU 加速(ICA、源定位)

**不引入新 compute skill** — 复用现有 4 个(`compute-env-setup`/`docker`/`modal-compute`/`runpod-compute`)。

### 4.4 输出约定(遵循 AGENTS.md)

- 图:`outputs/<slug>/figures/*.png`
- 表:`outputs/<slug>/tables/*.csv`
- 处理后数据:`outputs/<slug>/processed/*.fif`
- Provenance sidecar:`outputs/<slug>.provenance.md` — 记录:
  - MNE 版本、Python 版本、操作系统
  - 关键参数(滤波频带、ICA components、随机种子)
  - 原始数据来源(数据集 ID + URL)
  - 执行环境(本地 / Docker / Modal)
  - Verification 状态(unverified / verified)

### 4.5 测试

`tests/skill-eeg-analysis.test.ts`(若项目有 skill frontmatter 验证机制):
- 验证 SKILL.md frontmatter 完整
- 验证 skill 可被 Pi runtime 检测到

(若项目无 skill 单测机制,跳过此测试,改为手动验证 `npm run dev` 启动后 skill 出现在列表中。)

## 5. workbench 信号预览 surface

### 5.1 文件识别(扩展 src/workbench/file-types.ts)

| 扩展名 | 格式 | MNE reader | 备注 |
|---|---|---|---|
| `.edf` | European Data Format | `read_raw_edf` | 最常见 |
| `.bdf` | Biosemi | `read_raw_bdf` | 24-bit |
| `.fif` | MNE native | `read_raw_fif` | MNE 推荐 |
| `.set` + `.fdt` | EEGLAB | `read_raw_eeglab` | 双文件 |
| `.vhdr` + `.eeg` + `.vmrk` | BrainVision | `read_raw_brainvision` | 三文件 |
| `.cnt` | Neuroscan | `read_raw_cnt` | 旧格式 |

文件识别时:
- `.set`、`.vhdr` 需检查配套文件存在(`.fdt`、`.eeg`、`.vmrk`),缺失时降级为"无法预览,缺少配套文件"
- 单文件扩展名(.edf/.bdf/.fif/.cnt)直接预览

### 5.2 预览内容

后端预生成 4 张 PNG(不在浏览器跑 MNE):

1. **时域波形** — 各 channel 时间序列,前 30 秒,downsample 到 1000 pts/channel,grid 显示前 30 个 channel
2. **PSD** — 各 channel 频谱叠加(0.5–100 Hz),log scale
3. **Topography** — alpha(8–13 Hz)与 beta(13–30 Hz)频带拓扑分布(需 channel positions;无 positions 时跳过此图并标注)
4. **时频图** — 默认 Cz channel 的 time-frequency map(Morlet,1–45 Hz)

### 5.3 实现策略

**关键原则:** 后端生成,前端显示,缓存优先。

新增 `src/workbench/eeg-preview-renderer.ts`:
- `async function renderEegPreview(filePath: string): Promise<{ waveform: string, psd: string, topo?: string, tfr: string }>`
- 返回 4 张 PNG 的 workbench 资源 URL

**缓存机制:**
- 缓存目录:`~/.feynman/orgs/<org>/workbench/eeg-previews/<sha256(file)>/`
- 缓存键:文件内容 SHA256(避免源文件修改后预览过期)
- 命中:直接返回缓存 URL(毫秒级)
- 未命中:运行 Python(MNE)生成 4 张 PNG → 写缓存 → 返回 URL

**Python 后端:**
- 复用 `src/workbench/notebook-execution.ts` 的 Jupyter kernel 机制(若可用)
- 或新增独立的 Python 子进程调用脚本(`scripts/eeg-preview.mjs`)
- Python 脚本读 `.edf` 等文件,生成 4 张 PNG,stdout 输出 JSON 路径

**优雅降级:**
- Python 缺失 → 返回 `{ error: "python_not_found", message: "Install Python ≥ 3.10 to preview EEG signals" }`
- MNE 缺失 → 返回 `{ error: "mne_not_found", message: "Run: pip install mne" }`
- 文件损坏 → 返回 `{ error: "parse_failed", message: "<MNE error>" }`
- 前端在所有错误情况下显示提示卡片而非崩溃

### 5.4 workbench 路由

扩展现有 workbench artifact preview 路由(在 `src/workbench/server.ts` 或对应位置):
- 路径:`GET /api/preview/eeg?path=<file_path>`
- 响应:JSON,包含 4 张图的资源 URL 或错误信息
- 权限:与现有 artifact 预览一致(本地文件需在 workspace 内)

### 5.5 测试

`tests/workbench-eeg-preview.test.ts`:
- 文件扩展名识别(`.edf`、`.bdf`、`.fif`、`.set`+`.fdt`、`.vhdr`+配套、`.cnt`)
- 配套文件缺失时的降级提示
- 缓存命中路径(返回已有 URL)
- 缓存未命中路径(触发 Python 生成,用 mock)
- Python 缺失时的错误响应
- MNE 缺失时的错误响应
- 文件损坏时的错误响应
- 拓扑图无 positions 时的跳过逻辑

## 6. README / AGENTS.md / CHANGELOG.md 调整

### 6.1 README.md

**第 6 行简介改为:**
> 开源 AI 研究代理 — 生物医学与神经计算研究工作台。基于 Pi 运行时,内置论文搜索、文献综述、多代理深度调查、有界实验循环与长线自主研究;EEG 数据集检索(OpenNeuro/DANDI/PhysioNet/TUH)、MNE 信号处理与时频/群体统计、workbench 时域/频谱/拓扑预览。

**"Skills 与工具" 段新增子段 **Nervefeyn Neural Tools**(放在 "Nervefeyn Bio Tools" 之后):**

> - **Nervefeyn Neural Tools** — Nervefeyn 自有的 EEG/神经计算 connector 目录,覆盖 OpenNeuro 数据集搜索(关键词/modality/tasks 过滤,BIDS 元数据提取)、DANDI 数据档案搜索(DANDI ID、DOI、citation)、PhysioNet 经典 EEG 数据集索引(chb-mit/sleep-edf/eegmmidb 等)、TUH EEG Corpus 子集检索(7 个子集:standard/abnormal/artifact/seizure/label/awake/sleep),以及 eeg-analysis skill(MNE-Python 工作流:预处理/ICA、ERP、PSD/频带能量、时频、cluster-based 群体统计)

**"你输入什么 → 会发生什么" 段加示例:**

```
$ nervefeyn "find EEG motor imagery datasets on OpenNeuro"
→ 检索 OpenNeuro/DANDI/PhysioNet/TUH,返回标准化数据集列表(modality/subjects/samplingRate/license/url)

$ nervefeyn "preprocess this EDF and compute alpha band power"
→ 加载 eeg-analysis skill,生成 MNE 脚本,产出 figures/*.png + tables/*.csv + .provenance.md
```

### 6.2 AGENTS.md

**"功能范围" 段(第 31–46 行)在末尾加一项:**

> - EEG/神经计算研究:OpenNeuro/DANDI/PhysioNet/TUH 数据集检索、MNE 信号处理(预处理/ERP/PSD/时频/cluster-based 群体统计)、workbench 时域/频谱/拓扑/时频预览

### 6.3 CHANGELOG.md

按 lab notebook 约定追加一条:

```
## 2026-07-14
- slug: eeg-customization
- 新增 EEG/神经计算研究能力(4 个数据源 + eeg-analysis skill + workbench 信号预览)
- 服务于:文献驱动 EEG 综合研究 + EEG 信号处理分析
- 验证:unverified(待实现 + 测试通过后转 verified)
- 下一步:实现 plan → 编码 → npm test 全绿
```

## 7. 实现顺序与依赖

建议实现顺序(每步可独立验证):

1. **数据源扩展(§ 3)** — 4 个 `science-database-eeg-*.ts` + 路由接入 + 4 个测试
2. **eeg-analysis skill(§ 4)** — SKILL.md(纯 prompt,无代码依赖)
3. **workbench 信号预览(§ 5)** — file-types 扩展 + renderer + 路由 + 测试
4. **文档同步(§ 6)** — README/AGENTS.md/CHANGELOG.md

步骤 1 与 2 可并行(无依赖);步骤 3 依赖步骤 2 的 MNE 知识(预览复用 MNE);步骤 4 在所有代码完成后统一更新。

## 8. 验证标准

| 验证项 | 标准 |
|---|---|
| TypeScript 类型检查 | `npm run typecheck` 通过 |
| 单元测试 | `npm test` 全绿(含 5 个新测试文件) |
| 构建 | `npm run build` 通过 |
| 数据源手动验证 | `nervefeyn "find EEG motor imagery datasets"` 触发 OpenNeuro/PhysioNet 检索并返回标准化结果 |
| skill 手动验证 | `npm run dev` 启动后 `eeg-analysis` 出现在 skill 列表 |
| 预览手动验证 | workbench 上传 `.edf` 文件,显示时域/PSD/topo/tfr 预览图 |
| 优雅降级验证 | Python 或 MNE 缺失时,workbench 显示提示而非崩溃 |
| 文档同步 | README 第 6 行包含 "神经计算";AGENTS.md "功能范围" 包含 EEG;CHANGELOG 有 eeg-customization 条目 |

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| OpenNeuro/DANDI API 变更导致解析失败 | 沿用现有 `fetchText` + try/catch + 标准化结构,API 变更只影响一个文件;测试用 mock 而非真实 API |
| PhysioNet/TUH 静态清单过时 | 在 CHANGELOG 标注清单更新时间;提供手动更新流程(读 NEDC 页面 → 更新清单) |
| MNE 在 workbench 后端不可用 | 优雅降级设计(§ 5.3),显示提示而非崩溃;缓存命中时不依赖 Python |
| 信号预览生成耗时(大文件) | 缓存机制 + downsample(时域 1000 pts/channel)+ 30s 窗口;大文件首预览可能慢,后续缓存命中 |
| 用户无 Python 环境 | eeg-analysis skill 仅是 prompt,用户可在 Modal/Docker 远程跑;预览功能降级为提示 |
| 与上游 companion-inc/feynman 的 diff 增大 | 这是 fork 的预期方向;后续 rebase 时 EEG 文件作为独立目录易于合并冲突解决 |

## 10. 范围边界

**包含:**
- 4 个 EEG 数据源(OpenNeuro/DANDI/PhysioNet/TUH)
- eeg-analysis skill(MNE 预处理/ERP/PSD/时频/群体统计)
- workbench EDF/BDF/FIF/SET/VHDR/CNT 信号预览(时域/PSD/topo/tfr)
- README/AGENTS.md/CHANGELOG.md 同步

**不包含(后续独立 spec):**
- 神经科学:Allen Brain Atlas、ModelDB、NeuroMorpho、NeuroElectro、Human Connectome Project
- 计算机科学:OpenReview、DBLP、Papers with Code、Semantic Scholar API
- EEG 高级:源定位、功能连接、EEG 解码/BCI/深度学习(若用户后续需要)
- 临床 EEG 专科:癫痫 spike 检测、睡眠分期专用 skill
- `/eeg` slash command 与 `neuroscience-analyst` subagent
