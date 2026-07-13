# Nervefeyn 品牌改造与 Workbench UI 设计

- **日期**:2026-07-13
- **状态**:已批准,待实施
- **作者**:NoWint
- **范围**:子项目 B(品牌改造)+ C(Workbench UI)合并实施;子项目 A(神经/CS 数据源扩展)延后

## 背景与目标

基于 Feynman(`@companion-ai/feynman@0.3.5`,MIT License)fork 出 Nervefeyn,定位为通用研究代理 + 神经科学默认配置。本 spec 覆盖:

1. **品牌改造** — Feynman → Nervefeyn,作者署名,GPLv3 合规,用户面简体中文
2. **Workbench UI** — 基于 BonjourPrism 深色终端设计系统重写 Workbench

## 实现方法

**方法 A:轻量 fork + 硬编码替换**(已选)

直接在 fork 上做字符串与组件替换。品牌信息硬编码,不走 i18n。不追求与上游 companion-inc/feynman 长期合并。

**选择理由**:
- 新独立仓库(NoWint/Nervefeyn),不追求与上游同步
- 用户面中文化,不需要多语言
- YAGNI:不为假想未来需求引入抽象层
- GPLv3 合规只需保留原 MIT 版权声明

---

## 第 1 节:品牌身份与法律合规

### 品牌身份

| 字段 | 值 |
|---|---|
| 项目名 | `Nervefeyn` |
| 副标题 | 神经计算研究工作台 |
| 定位 | 通用研究代理 + 神经科学默认配置 |
| 包名 | `@nervefeyn/nervefeyn`(原 `@companion-ai/feynman`) |
| 二进制名 | `nervefeyn`(原 `feynman`) |
| 仓库 | `github.com/NoWint/Nervefeyn` |
| License | GPLv3 |

### 作者署名规则

所有用户面位置(README、CLI `--version`、Workbench 侧边栏底部、package.json)统一显示:

```
Nervefeyn © 2026 NoWint (github.com/NoWint)
基于 Feynman © companion-inc (github.com/companion-inc/feynman)
```

- **原作者**:companion-inc + GitHub 链接 `github.com/companion-inc/feynman`
- **Nervefeyn 作者**:NoWint + GitHub 链接 `github.com/NoWint`
- Feynman 原 MIT License 保留在 `NOTICE` 文件中(GPLv3 合规要求)

### 法律合规

- **GPLv3 兼容性**:原 Feynman 是 MIT,MIT 代码可合并到 GPLv3 项目,但必须保留原 MIT 版权声明与许可证文本
- **NOTICE 文件**(新建):包含 Nervefeyn GPLv3 版权声明 + Feynman 原 MIT 版权声明(companion-inc)+ 第三方依赖许可证引用
- **LICENSE 文件**:替换为 GPLv3 全文,原 MIT 文本移入 `LICENSES/feynman-mit.txt`

### 品牌字符串替换清单

| 原值 | 新值 |
|---|---|
| `Feynman` | `Nervefeyn` |
| `feynman` | `nervefeyn` |
| `@companion-ai/feynman` | `@nervefeyn/nervefeyn` |
| `companion-inc/feynman` | `NoWint/Nervefeyn` |
| `companion-inc`(署名处) | `NoWint` + 原作者链接 |

**例外**:原作者署名处的 `companion-inc` 和 `feynman` 保留(合规要求);`.feynman/` 目录名保留(降低 Pi 运行时路径硬编码风险)。

---

## 第 2 节:中文化范围

### 原则

用户面全中文化,代码标识符保留英文。方法 A 硬编码策略,不引入 i18n 框架。

### 中文化矩阵

| 类别 | 中文化 | 保留英文 | 说明 |
|---|---|---|---|
| CLI 输出 | ✅ | — | 用户直接阅读 |
| Workbench UI | ✅ | — | 用户直接阅读 |
| Slash command 描述 | ✅ | 命令名保留英文 | `/deepresearch` 不变,描述中文化 |
| Prompts(`.feynman/agents/*.md`, `prompts/*.md`) | ✅ | — | 子代理行为指令中文化 |
| README / docs / website | ✅ | — | 文档全中文化 |
| CHANGELOG | ✅ | — | 实验笔记本中文化 |
| 代码标识符 | — | ✅ | `researcher`/`verifier`/`PaperRank` 等不变 |
| 代码注释 | — | ✅ | 保留英文,降低合并冲突 |
| 配置 key | — | ✅ | `name`/`version` 的 key 不变,value 中文化 |
| 技术术语 | — | ✅ | `EEG`/`fMRI`/`DANDI`/`Pi`/`MCP` 等保留 |
| 品牌名 | — | ✅ | `Nervefeyn`/`NoWint`/`companion-inc` 不翻译 |

### 关键决策

1. `AGENTS.md`:中文化(仓库级 agent 契约,用户面)
2. `.feynman/SYSTEM.md`:中文化(Feynman system prompt,用户面)
3. `metadata/commands.mjs`:命令描述中文化,保留命令名与配置 key
4. `website/`:全中文化
5. Slash command 名称保留英文:`/deepresearch`、`/lit`、`/verify` 等

### 不中文化

- `node_modules/`(第三方依赖)
- `*.ts`/`*.tsx`/`*.mjs` 代码逻辑与注释
- `package.json` 的 `dependencies`/`scripts` key
- `.gitignore`/`.editorconfig` 等纯配置文件

---

## 第 3 节:Workbench UI 设计系统

### 设计基调

BonjourPrism 深色终端 — Vercel 风格紧凑数字环境,锐角、1px 描边、暖金主色。参考 `/Users/xiatian/Desktop/UIs/bonjourprism-mockup.html`。

### 设计 Token

```css
:root {
  --bg: #0a0a0a; --bg2: #0e0e0e; --card: #141414; --muted: #1c1c1c;
  --fg: #fafafa; --mt: #a1a1a1; --mt2: #6b6b6b; --mt3: #4a4a4a;
  --primary: #d4a05a; --primary-fg: #1a1410;
  --secondary: #1c1c1c; --secondary-fg: #fafafa;
  --accent: #262626; --accent-fg: #fafafa;
  --input: #1f1f1f; --border: #1a1a1a; --border2: #161616;
  --success: #62d178; --warn: #eab308; --destructive: #ff6467; --info: #4a9eff;
  --font-sans: "Geist", -apple-system, "PingFang SC", system-ui, sans-serif;
  --font-mono: "Geist Mono", "SF Mono", ui-monospace, monospace;
}
```

### 字体策略

- **正文**:`Geist` + `PingFang SC` fallback
- **代码/数据/标签**:`Geist Mono`
- **字号基准**:13px,行高 1.4
- **标题**:14-24px,字重 600,字间距 -0.01em

### 视觉规则

1. 锐角:所有卡片、按钮、输入框 0 圆角
2. 1px 描边:`--border` 色统一,无阴影
3. 紧凑密度:padding 6-14px,gap 8-12px
4. 暖金强调:`--primary` 仅用于品牌点、CTA、激活状态、关键数据
5. 悬停反馈:边框变 `--primary` 或背景变 `--muted`,无位移
6. 等宽标签:状态/计数/时间用 `--font-mono`,大小写转换 + 字间距 0.06-0.1em

### 组件清单

| 组件 | 位置 | 说明 |
|---|---|---|
| `.brand` | 侧边栏顶部 | 暖金圆点 + Nervefeyn + 副标题 |
| `.cta` | 侧边栏 | 暖金"新建研究会话"按钮 |
| `.nav-it` | 侧边栏 | 导航项(工作台/会话/文献库/数据集/设置) |
| `.inst-it` | 侧边栏 | 置顶项目 + 最近会话列表 |
| `.user-pill` | 侧边栏底部 | NoWint 用户信息 + 模型状态 |
| `.view-tabs` | 顶栏 | 工作台/会话切换 pill |
| `.hero` | 工作台首页 | 项目标题 + 元信息 + 行动按钮 |
| `.np-card` | 工作台首页 | 神经数据预览卡(EEG/fMRI/连接体/Spike) |
| `.chat-hd` | 会话页 | 会话标题 + Pi 在线状态 |
| `.msg` | 会话页 | 消息(用户/助手,助手带 role 标签) |
| `.art-card` | 会话页 | 消息内嵌产物卡片 |
| `.composer` | 会话页 | 输入框 + tool pills + 发送 |
| `.art-col` | 会话页右侧 | 产物面板(列表 + 预览) |

### 与现有架构集成

- 现有 Workbench:React 19 + Vite 8,位于 `workbench/` 目录
- 方法 A 策略:重写 Workbench 主组件对齐 v3 mockup,复用现有 Pi 会话/消息/产物数据流
- CSS:提取为 `workbench/styles/design-system.css`,不引入 CSS-in-JS 或 Tailwind
- 字体:通过 `<link>` 加载 Geist(Google Fonts)

---

## 第 4 节:Workbench 页面结构与交互

### 整体布局

```
┌─────────┬──────────────────────────────────┐
│         │ 顶栏(view-tabs + 通知)          │
│ 侧边栏   ├──────────────────────────────────┤
│ 220px   │                                  │
│         │   主内容区(工作台 / 会话切换)    │
│         │                                  │
└─────────┴──────────────────────────────────┘
```

- `grid-template-columns: 220px 1fr`
- 全屏 `100vw × 100vh`,`overflow: hidden`

### 侧边栏(220px)

1. **品牌** — 暖金圆点 + `Nervefeyn` + `神经计算研究工作台`
2. **CTA** — 暖金"新建研究会话"按钮
3. **主导航** — 工作台 / 会话(12) / 文献库(347) / 数据集 / 设置
4. **置顶项目** — EEG 跨被试泛化(活跃)/ fMRI 解码模型(休眠)
5. **最近会话** — EEGNet 跨被试复现(2h)/ DANDI 数据集检索(1d)/ Spike sorting 调研(3d)/ NeuroAI 综述(1w)
6. **底部** — GLM-5.2 · Pi 0.80.3 状态 + NoWint 用户信息

### 顶栏(极简)

- 左:`view-tabs`(工作台/会话切换)
- 右:通知图标(带红点)
- 无搜索框、无 DANDI 状态、无用户头像

### 工作台首页(`#homeScreen`)

1. **Hero** — eyebrow + h1 + meta + 行动按钮(文献 / 继续研究)
2. **神经数据预览卡** — 4 列网格:
   - EEG · Fz-Cz(2.4s)— SVG 波形
   - fMRI · z=24(轴位)— 径向渐变切片
   - 连接体(84 区)— SVG 节点连线图
   - Spike raster(32 ch)— JS 生成 14×80 tick 矩阵

### 会话页(`#sessionScreen`)

`grid-template-columns: 1fr 320px` 双栏:

**左栏 chat-col**:
- `chat-hd` — 会话标题 + sub + Pi 在线状态 + 设置按钮
- `transcript` — 消息流(用户/助手,助手带 role 标签 + 产物卡片 + 内嵌预览)
- `composer` — textarea + tool pills + 附件 + 发送

**右栏 art-col**:
- `art-hd` — 本会话产物(6 个)
- `art-list` — 产物行(图标 + 名称 + 状态:已验证/待审/DANDI)
- `art-preview` — 选中产物大图预览

### 交互

1. 视图切换:`view-tabs` 与侧边栏 `nav-it[data-view]` 双向绑定
2. 产物选中:`art-row` 点击高亮,更新 `art-preview`
3. 消息 hover:显示复制/重新生成按钮
4. 新建会话:CTA → 跳转会话页 + 清空 transcript + composer 聚焦
5. 快捷键(预留):`Ctrl+N` 新建,`Ctrl+K` 命令面板

### 数据绑定

- 侧边栏最近会话 ← Pi session list
- 会话页 transcript ← Pi session messages(streaming)
- 产物面板 ← session artifacts(outputs/ papers/ experiments/)
- Pi 在线状态 ← Pi runtime status
- 模型状态 ← 当前 model + Pi version

---

## 第 5 节:实施范围与文件清单

### 品牌改造文件

**根配置**:
- `package.json` — name/version/bin/description/repo/author/license
- `LICENSE` — 替换为 GPLv3 全文
- `NOTICE`(新建)— 双版权声明
- `LICENSES/feynman-mit.txt`(新建)— 原 MIT 文本
- `README.md` — 全中文化 + 作者署名
- `AGENTS.md` — 中文化
- `CHANGELOG.md` — 中文化

**Feynman 系统**:
- `.feynman/SYSTEM.md` — 中文化
- `.feynman/agents/*.md` — 中文化 4 个子代理

**CLI 与命令**:
- `src/cli.ts` — 品牌字符串 + 帮助文本中文化
- `metadata/commands.mjs` — 命令描述中文化
- `prompts/*.md` — slash command prompts 中文化
- `bin/feynman.js` → `bin/nervefeyn.js`(重命名)

**文档**:
- `website/` — 全中文化
- `RELEASES.md` — 中文化

### Workbench UI 文件

**新增**:
- `workbench/styles/design-system.css` — CSS 变量 + 组件样式
- `workbench/components/Sidebar.tsx`
- `workbench/components/Topbar.tsx`
- `workbench/components/HomeScreen.tsx`
- `workbench/components/SessionScreen.tsx`
- `workbench/components/chat/` — Transcript, Message, Composer, ArtifactCard
- `workbench/components/neuro/` — EegPreview, FmriPreview, ConnectomePreview, SpikeRaster

**改造**:
- `workbench/App.tsx` — 主布局
- `workbench/index.html` — 加载 Geist 字体

### 不改动

- `node_modules/`
- `extensions/`(Bio Tools 连接器,仅描述中文化)
- `skills/`(逻辑不动,prompt 中文化)
- `scripts/`(除非路径引用变更)
- `.feynman/` 目录名(保留)

### 实施顺序

1. **Phase 1 — 品牌改造**(独立可交付)
   - package.json + LICENSE + NOTICE + bin 重命名
   - README + AGENTS + CHANGELOG 中文化
   - .feynman/ + prompts/ + metadata/ 中文化
   - src/cli.ts 品牌字符串
2. **Phase 2 — Workbench UI**(依赖 Phase 1 的包名)
   - design-system.css 提取
   - 侧边栏 + 顶栏组件
   - 工作台首页 + 会话页组件
   - 神经数据预览组件
   - 数据流绑定 Pi session/messages/artifacts
3. **Phase 3 — 验证**
   - 品牌字符串扫描(无残留 Feynman)
   - 中文化扫描(用户面全中文)
   - Workbench 视觉对照 v3 mockup
   - CLI + 子代理 + Bio Tools 功能回归

---

## 验证标准

### 品牌改造

- [ ] 全仓库无残留 `Feynman` 字符串(除原作者署名处)
- [ ] `package.json` name 为 `@nervefeyn/nervefeyn`,bin 为 `nervefeyn`
- [ ] `LICENSE` 为 GPLv3 全文
- [ ] `NOTICE` 包含双版权声明
- [ ] `bin/nervefeyn.js` 存在且可执行
- [ ] CLI `--version` 显示 Nervefeyn + NoWint + 原作者链接

### 中文化

- [ ] CLI 帮助文本全中文
- [ ] Workbench UI 文案全中文
- [ ] README/AGENTS/CHANGELOG 全中文
- [ ] .feynman/ + prompts/ 全中文
- [ ] 代码标识符保留英文(扫描确认)

### Workbench UI

- [ ] 视觉对照 v3 mockup 一致
- [ ] 侧边栏 220px,品牌 + CTA + 导航 + 项目 + 会话 + 底部
- [ ] 顶栏极简(view-tabs + 通知)
- [ ] 工作台首页:hero + 4 列神经数据预览
- [ ] 会话页:双栏 chat + artifact 面板
- [ ] 视图切换可交互
- [ ] Geist 字体加载成功

### 功能回归

- [ ] CLI 命令正常执行(`/deepresearch`, `/lit`, `/verify`)
- [ ] 4 个子代理可调用
- [ ] Bio Tools 连接器正常
- [ ] Workbench 可启动,数据流绑定 Pi

---

## 参考

- v3 mockup:`.superpowers/brainstorm/3647-1783946524/content/nervefeyn-workbench-v3.html`
- BonjourPrism 设计参考:`/Users/xiatian/Desktop/UIs/bonjourprism-mockup.html`
- 原 Feynman 仓库:`github.com/companion-inc/feynman`
- Nervefeyn 仓库:`github.com/NoWint/Nervefeyn`
- Pi 运行时:`@earendil-works/pi-coding-agent@0.80.3`
