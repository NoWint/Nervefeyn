# Nervefeyn 品牌改造与 Workbench UI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Feynman fork 改造为 Nervefeyn,完成品牌替换、GPLv3 合规、用户面中文化,并基于 BonjourPrism 深色设计系统重写 Workbench UI。

**Architecture:** 方法 A(轻量 fork + 硬编码替换)。品牌字符串全仓库替换,用户面中文化,Workbench UI 基于 v3 mockup 重写。不引入 i18n 框架,不追求与上游合并。

**Tech Stack:** TypeScript ESM, Node 22.19+, React 19, Vite 8, Pi 0.80.3, alphaXiv 0.1.3, Geist 字体

**Spec:** `docs/superpowers/specs/2026-07-13-nervefeyn-branding-workbench-design.md`

---

## 文件结构概览

### 品牌改造涉及
- 根配置:`package.json`, `LICENSE`, `NOTICE`(新), `LICENSES/feynman-mit.txt`(新), `bin/feynman.js` → `bin/nervefeyn.js`
- 文档:`README.md`, `AGENTS.md`, `CHANGELOG.md`, `RELEASES.md`, `CONTRIBUTING.md`
- 系统:`.feynman/SYSTEM.md`, `.feynman/agents/*.md`, `.feynman/themes/feynman.json`
- CLI:`src/cli.ts`, `src/index.ts`, `src/config/paths.ts`, `src/pi/settings.ts`, `src/system/self-update.ts`
- 命令:`metadata/commands.mjs`, `metadata/commands.d.mts`, `prompts/*.md`(13 个)
- 安装脚本:`scripts/install/install.sh`, `scripts/install/install.ps1`
- 网站:`website/` 全部

### Workbench UI 涉及
- `workbench-web/index.html` — 标题 + 字体加载
- `workbench-web/src/main.tsx` — 主组件(重写)
- `workbench-web/src/styles.css` — 替换为 design-system.css
- `workbench-web/src/routes.ts` — 路由
- 新增组件目录:`workbench-web/src/components/`

### 不改动
- `node_modules/`, `extensions/`(代码层), `skills/`(逻辑层), `scripts/lib/`(patch 脚本)
- 代码标识符(函数名/变量名/类名保留英文,如 `ensureFeynmanHome` 不改)
- `.feynman/` 目录名(保留)

---

## Phase 1:品牌改造与法律合规

### Task 1.1:GPLv3 License 与 NOTICE 文件

**Files:**
- Modify: `LICENSE`
- Create: `NOTICE`
- Create: `LICENSES/feynman-mit.txt`

- [ ] **Step 1: 备份原 MIT License**

Read `LICENSE` 当前内容(MIT, Copyright (c) 2026 Companion, Inc.)。

- [ ] **Step 2: 创建 LICENSES/feynman-mit.txt**

将原 MIT License 全文复制到 `LICENSES/feynman-mit.txt`。

- [ ] **Step 3: 替换 LICENSE 为 GPLv3**

下载 GPLv3 全文(https://www.gnu.org/licenses/gpl-3.0.txt)写入 `LICENSE`。版权行:
```
Nervefeyn - 神经计算研究工作台
Copyright (C) 2026 NoWint (github.com/NoWint)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
...
```

- [ ] **Step 4: 创建 NOTICE 文件**

```
Nervefeyn
Copyright (C) 2026 NoWint (https://github.com/NoWint)

This project is licensed under the GNU General Public License v3 (GPLv3).
See LICENSE for the full license text.

=== Third-Party Notices ===

Feynman (original work)
Copyright (c) 2026 Companion, Inc.
Licensed under the MIT License.
See LICENSES/feynman-mit.txt for the full license text.
Source: https://github.com/companion-inc/feynman

Pi Coding Agent (@earendil-works/pi-coding-agent)
Licensed under its respective license.
Source: https://github.com/earendil-works/pi-coding-agent

alphaXiv (@companion-ai/alpha-hub)
Licensed under its respective license.
Source: https://github.com/companion-ai/alpha-hub
```

- [ ] **Step 5: 验证**

Run: `head -5 LICENSE && echo "---" && cat NOTICE && echo "---" && cat LICENSES/feynman-mit.txt | head -3`
Expected: GPLv3 header + NOTICE 双版权 + MIT 原文

- [ ] **Step 6: Commit**

```bash
git add LICENSE NOTICE LICENSES/
git commit -m "license: switch to GPLv3, preserve original MIT in NOTICE"
```

---

### Task 1.2:package.json 品牌替换

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 替换品牌字段**

修改 `package.json`:
- `"name": "@companion-ai/feynman"` → `"@nervefeyn/nervefeyn"`
- `"description": "Research-first CLI agent built on Pi and alphaXiv"` → `"基于 Pi 与 alphaXiv 的研究优先 CLI 代理"`
- `"license": "MIT"` → `"GPL-3.0-only"`
- `"bin": { "feynman": "bin/feynman.js" }` → `{ "nervefeyn": "bin/nervefeyn.js" }`
- `"repository.url": "git+https://github.com/companion-inc/feynman.git"` → `"git+https://github.com/NoWint/Nervefeyn.git"`
- `"homepage": "https://github.com/companion-inc/feynman#readme"` → `"https://github.com/NoWint/Nervefeyn#readme"`
- `"bugs.url": "https://github.com/companion-inc/feynman/issues"` → `"https://github.com/NoWint/Nervefeyn/issues"`
- `"author": ""` → `"NoWint (https://github.com/NoWint)"`
- `"start:dist": "node ./bin/feynman.js"` → `"node ./bin/nervefeyn.js"`
- `"keywords"` 数组加入 `"neuroscience"`

- [ ] **Step 2: 验证**

Run: `node -e "const p=require('./package.json'); console.log(p.name, p.license, p.bin, p.author)"`
Expected: `@nervefeyn/nervefeyn GPL-3.0-only { nervefeyn: 'bin/nervefeyn.js' } NoWint (https://github.com/NoWint)`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "brand: rename package to @nervefeyn/nervefeyn, GPLv3, NoWint author"
```

---

### Task 1.3:bin 重命名

**Files:**
- Rename: `bin/feynman.js` → `bin/nervefeyn.js`
- Modify: `bin/nervefeyn.js`

- [ ] **Step 1: 重命名文件**

```bash
git mv bin/feynman.js bin/nervefeyn.js
```

- [ ] **Step 2: 替换文件内品牌字符串**

在 `bin/nervefeyn.js` 中:
- `"feynman supports Node.js"` → `"nervefeyn 支持 Node.js"`
- `"This newer Node release is not supported yet."` → `"此 Node 版本暂不支持。"`
- `"Install a supported Node.js release from"` → `"从以下地址安装受支持的 Node.js 版本:"`
- `"Switch to a supported Node release with"` → `"切换到受支持的 Node 版本:"`
- `"irm https://feynman.is/install.ps1 | iex"` → `"irm https://nervefeyn.dev/install.ps1 | iex"`(预留域名)
- `"curl -fsSL https://feynman.is/install | bash"` → `"curl -fsSL https://nervefeyn.dev/install | bash"`

- [ ] **Step 3: 验证可执行**

Run: `node bin/nervefeyn.js --help 2>&1 | head -5`
Expected: 不报错(或正常加载 CLI)

- [ ] **Step 4: Commit**

```bash
git add bin/nervefeyn.js
git rm bin/feynman.js 2>/dev/null; true
git commit -m "brand: rename bin/feynman.js to bin/nervefeyn.js, localize messages"
```

---

### Task 1.4:用户面文档中文化(README, AGENTS, CHANGELOG, RELEASES, CONTRIBUTING)

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`
- Modify: `RELEASES.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: README.md 中文化**

将 `README.md` 全文中文化。关键替换:
- 标题 `Feynman` → `Nervefeyn`
- 所有英文描述翻译为中文
- CLI 示例 `feynman` → `nervefeyn`
- 保留代码块中的命令名(如果 slash command 保留英文)
- 添加作者署名块:
```
Nervefeyn © 2026 NoWint (github.com/NoWint)
基于 Feynman © companion-inc (github.com/companion-inc/feynman)
```

- [ ] **Step 2: AGENTS.md 中文化**

将 `AGENTS.md` 全文中文化(已在 workspace rules 中,直接编辑)。保留代码标识符英文(如 `outputs/`, `papers/`, `.feynman/agents/`)。

- [ ] **Step 3: CHANGELOG.md 中文化**

将 `CHANGELOG.md` 现有英文条目翻译为中文(保留日期与 slug)。在顶部添加新条目:
```
## 2026-07-13 Nervefeyn 品牌改造
- 从 Feynman fork 为 Nervefeyn,GPLv3,用户面中文化
- Workbench UI 基于 BonjourPrism 深色设计系统重写
- 下一步:Phase 2 Workbench UI 实施
```

- [ ] **Step 4: RELEASES.md 中文化**

将 `RELEASES.md` 全文中文化。

- [ ] **Step 5: CONTRIBUTING.md 中文化**

将 `CONTRIBUTING.md` 全文中文化。

- [ ] **Step 6: Commit**

```bash
git add README.md AGENTS.md CHANGELOG.md RELEASES.md CONTRIBUTING.md
git commit -m "docs: localize user-facing docs to Chinese, add Nervefeyn branding"
```

---

### Task 1.5:Feynman 系统文件中文化

**Files:**
- Modify: `.feynman/SYSTEM.md`
- Modify: `.feynman/agents/researcher.md`
- Modify: `.feynman/agents/reviewer.md`
- Modify: `.feynman/agents/writer.md`
- Modify: `.feynman/agents/verifier.md`

- [ ] **Step 1: SYSTEM.md 中文化**

将 `.feynman/SYSTEM.md` 全文中文化。关键替换:
- `Feynman` → `Nervefeyn`
- 所有英文指令翻译为中文
- 保留路径标识符:`outputs/`, `papers/`, `notes/`, `experiments/`
- 保留子代理名称英文:`researcher`, `reviewer`, `writer`, `verifier`

- [ ] **Step 2: 4 个子代理 prompt 中文化**

逐个中文化:
- `.feynman/agents/researcher.md`
- `.feynman/agents/reviewer.md`
- `.feynman/agents/writer.md`
- `.feynman/agents/verifier.md`

保留代码标识符与工具名英文。

- [ ] **Step 3: Commit**

```bash
git add .feynman/SYSTEM.md .feynman/agents/
git commit -m "system: localize Feynman system prompt and 4 subagents to Chinese"
```

---

### Task 1.6:CLI 品牌字符串与中文化

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `src/config/paths.ts`(仅用户面字符串)
- Modify: `src/pi/settings.ts`(仅用户面字符串)
- Modify: `src/system/self-update.ts`(仅用户面字符串)
- Modify: `src/ui/terminal.ts`

- [ ] **Step 1: 扫描所有用户面字符串**

Run: `grep -rn "feynman\|Feynman" src/ --include="*.ts" | grep -v "node_modules" | grep -v "\.test\." > /tmp/feynman-strings.txt && wc -l /tmp/feynman-strings.txt`

- [ ] **Step 2: 分类处理**

将扫描结果分为:
- **用户面字符串**(console.log/console.error/帮助文本/错误消息)— 中文化 + 品牌替换
- **代码标识符**(函数名/变量名/类名/路径)— 保留英文
- **注释** — 保留英文

- [ ] **Step 3: 替换用户面字符串**

在 `src/cli.ts` 中,替换所有用户面字符串:
- `"feynman setup"` → `"nervefeyn setup"`(命令示例)
- `"feynman doctor"` → `"nervefeyn doctor"`
- `"feynman model"` → `"nervefeyn model"`
- `"feynman search status"` → `"nervefeyn search status"`
- `"Use \`feynman setup\` first"` → `"首次使用请运行 \`nervefeyn setup\`"`
- `"feynman alpha terminated"` → `"nervefeyn alpha 进程终止"`
- `"Usage: feynman model set"` → `"用法:nervefeyn model set"`

注意:保留函数名如 `handleModelCommand`、`ensureFeynmanHome`、`getFeynmanAgentDir`(代码标识符)。

- [ ] **Step 4: 替换其他源文件用户面字符串**

按需替换 `src/index.ts`、`src/config/paths.ts`、`src/pi/settings.ts`、`src/system/self-update.ts`、`src/ui/terminal.ts` 中的用户面字符串。

- [ ] **Step 5: 验证构建**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: 无类型错误

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "cli: replace brand strings and localize user-facing messages"
```

---

### Task 1.7:命令元数据与 prompts 中文化

**Files:**
- Modify: `metadata/commands.mjs`
- Modify: `metadata/commands.d.mts`
- Modify: `prompts/*.md`(13 个文件)

- [ ] **Step 1: commands.mjs 中文化**

将 `metadata/commands.mjs` 中所有命令描述中文化。保留命令名英文(`/deepresearch`, `/lit`, `/verify` 等)。

- [ ] **Step 2: commands.d.mts 同步**

同步类型定义文件。

- [ ] **Step 3: prompts/*.md 中文化**

逐个中文化 13 个 prompt 文件:
- `prompts/deepresearch.md`, `prompts/lit.md`, `prompts/verify.md`, `prompts/audit.md`, `prompts/autoresearch.md`, `prompts/compare.md`, `prompts/draft.md`, `prompts/jobs.md`, `prompts/log.md`, `prompts/recipe.md`, `prompts/replicate.md`, `prompts/review.md`, `prompts/summarize.md`, `prompts/watch.md`

保留 slash command 名称英文,内容中文化。

- [ ] **Step 4: Commit**

```bash
git add metadata/ prompts/
git commit -m "commands: localize command metadata and 13 slash command prompts"
```

---

### Task 1.8:安装脚本与网站中文化

**Files:**
- Modify: `scripts/install/install.sh`
- Modify: `scripts/install/install.ps1`
- Modify: `website/`(全部)

- [ ] **Step 1: 安装脚本中文化**

替换 `scripts/install/install.sh` 与 `install.ps1` 中的品牌字符串与用户面消息。

- [ ] **Step 2: website/ 中文化**

将 `website/` 目录下所有内容中文化。包括 `astro.config.mjs`、`README.md`、以及任何页面内容。

- [ ] **Step 3: Commit**

```bash
git add scripts/install/ website/
git commit -m "install+web: localize install scripts and website to Chinese"
```

---

### Task 1.9:Phase 1 验证

- [ ] **Step 1: 品牌字符串扫描**

Run: `grep -rn "companion-ai/feynman\|companion-inc/feynman" --include="*.ts" --include="*.mjs" --include="*.md" --include="*.json" . | grep -v node_modules | grep -v NOTICE | grep -v LICENSES | grep -v "github.com/companion-inc"`

Expected: 无输出(或仅 NOTICE/LICENSES 中的合规引用)

- [ ] **Step 2: 用户面中文化扫描**

抽查 CLI 帮助:
Run: `npx tsx src/index.ts --help 2>&1 | head -20`
Expected: 中文输出

- [ ] **Step 3: 功能回归**

Run: `npm test -- --test-concurrency=1 2>&1 | tail -20`
Expected: 测试通过(或仅有与品牌字符串无关的已知失败)

- [ ] **Step 4: Commit 验证记录**

```bash
git commit --allow-empty -m "verify: Phase 1 brand replacement and localization complete"
```

---

## Phase 2:Workbench UI 重写

### Task 2.1:design-system.css 提取

**Files:**
- Create: `workbench-web/src/design-system.css`

- [ ] **Step 1: 从 v3 mockup 提取 CSS**

Read `.superpowers/brainstorm/3647-1783946524/content/nervefeyn-workbench-v3.html`,提取所有 CSS 到 `workbench-web/src/design-system.css`。

包含:
- `:root` CSS 变量(bg/fg/primary/border/font 等)
- 全局重置(`* { box-sizing }`, `html, body`)
- 侧边栏样式(`.sb`, `.brand`, `.cta`, `.nav-it`, `.inst-it`, `.user-pill`, `.sb-foot`)
- 顶栏样式(`.topbar`, `.view-tabs`, `.icon-btn`)
- 工作台首页样式(`.hero`, `.btn`, `.card`, `.np-card`, `.eeg-mini`, `.fmri-mini`, `.conn-mini`, `.raster-mini`)
- 会话页样式(`.chat-col`, `.chat-hd`, `.transcript`, `.msg`, `.art-card`, `.composer`, `.art-col`, `.art-list`, `.art-preview`)

- [ ] **Step 2: 替换 styles.css**

将 `workbench-web/src/styles.css` 的 import 替换为 `design-system.css`(或在 main.tsx 中直接 import)。

- [ ] **Step 3: Commit**

```bash
git add workbench-web/src/design-system.css
git commit -m "workbench: extract BonjourPrism design system CSS from v3 mockup"
```

---

### Task 2.2:index.html 更新

**Files:**
- Modify: `workbench-web/index.html`

- [ ] **Step 1: 更新标题与字体**

```html
<!doctype html>
<html lang="zh-CN">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Nervefeyn · 神经计算研究工作台</title>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/main.tsx"></script>
	</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add workbench-web/index.html
git commit -m "workbench: update index.html with Nervefeyn title and Geist fonts"
```

---

### Task 2.3:Workbench 主组件重写

**Files:**
- Modify: `workbench-web/src/main.tsx`(大改)

- [ ] **Step 1: 重写 App 布局**

基于 v3 mockup,重写 `main.tsx` 的根组件为:
```tsx
function App() {
  const [view, setView] = useState<"home" | "session">("session");
  return (
    <div className="app">
      <Sidebar view={view} onViewChange={setView} />
      <main className="main">
        <Topbar view={view} onViewChange={setView} />
        <div className="content">
          {view === "home" ? <HomeScreen /> : <SessionScreen />}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 实现 Sidebar 组件**

实现品牌区 + CTA + 导航 + 置顶项目 + 最近会话 + 底部状态(对照 v3 mockup 的 `.sb` 部分)。

- [ ] **Step 3: 实现 Topbar 组件**

极简顶栏:view-tabs(工作台/会话)+ 通知图标。

- [ ] **Step 4: 实现 HomeScreen 组件**

Hero + 4 列神经数据预览卡(EEG SVG / fMRI 径向渐变 / 连接体 SVG / Spike raster JS 生成)。

- [ ] **Step 5: 实现 SessionScreen 组件**

双栏布局:chat-col(transcript + composer)+ art-col(产物列表 + 预览)。

- [ ] **Step 6: 绑定 Pi 数据流**

复用现有 `workbench-web/src/` 中的数据流(stream.ts, artifacts.ts, composer.ts, chat.ts 等),绑定到新 UI 组件。

- [ ] **Step 7: 视图切换交互**

实现 view-tabs 与 sidebar nav-it 的双向绑定。

- [ ] **Step 8: 验证构建**

Run: `npm run build:workbench-web 2>&1 | tail -10`
Expected: 构建成功

- [ ] **Step 9: Commit**

```bash
git add workbench-web/src/
git commit -m "workbench: rewrite main UI with BonjourPrism design system (v3 mockup)"
```

---

### Task 2.4:神经数据预览组件

**Files:**
- Create: `workbench-web/src/components/neuro/EegPreview.tsx`
- Create: `workbench-web/src/components/neuro/FmriPreview.tsx`
- Create: `workbench-web/src/components/neuro/ConnectomePreview.tsx`
- Create: `workbench-web/src/components/neuro/SpikeRaster.tsx`

- [ ] **Step 1: 实现 4 个神经数据预览组件**

从 v3 mockup 提取 SVG/JS 逻辑,转为 React 组件:
- `EegPreview`:SVG path 波形
- `FmriPreview`:径向渐变切片
- `ConnectomePreview`:SVG 节点连线
- `SpikeRaster`:JS 生成 14×80 tick 矩阵(useEffect + Math.random)

- [ ] **Step 2: 集成到 HomeScreen**

在 HomeScreen 的 `.neuro-preview` 网格中使用这 4 个组件。

- [ ] **Step 3: Commit**

```bash
git add workbench-web/src/components/neuro/
git commit -m "workbench: add 4 neuro data preview components (EEG/fMRI/connectome/spike)"
```

---

### Task 2.5:Phase 2 验证

- [ ] **Step 1: 构建验证**

Run: `npm run build:workbench-web 2>&1 | tail -10`
Expected: 成功

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck:workbench-web 2>&1 | tail -10`
Expected: 无错误

- [ ] **Step 3: 视觉对照**

启动 workbench dev server,对照 v3 mockup 检查:
- 侧边栏 220px
- 顶栏极简
- 工作台首页 hero + 4 列预览
- 会话页双栏
- 视图切换可交互

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "verify: Phase 2 Workbench UI rewrite complete"
```

---

## Phase 3:最终验证与交付

### Task 3.1:全仓库品牌扫描

- [ ] **Step 1: 扫描残留 Feynman 字符串**

```bash
grep -rn "Feynman\|feynman" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.md" --include="*.json" --include="*.html" --include="*.css" . \
  | grep -v node_modules \
  | grep -v NOTICE \
  | grep -v LICENSES \
  | grep -v ".superpowers/" \
  | grep -v "docs/superpowers/" \
  | grep -v "github.com/companion-inc" \
  | grep -v "ensureFeynman\|getFeynman\|FeynmanHome\|FeynmanAgent\|FeynmanSettings\|FeynmanVersion\|FeynmanUpgrade\|feynmanSettingsPath\|feynmanAuthPath\|feynmanAgentDir"
```

Expected: 无输出,或仅代码标识符(函数名/变量名,保留英文)

- [ ] **Step 2: 扫描残留 companion-ai**

```bash
grep -rn "companion-ai" --include="*.ts" --include="*.json" . | grep -v node_modules | grep -v NOTICE
```

Expected: 仅 `@companion-ai/alpha-hub` 依赖引用(保留,因为是真实依赖)

---

### Task 3.2:功能回归测试

- [ ] **Step 1: 运行测试套件**

Run: `npm test 2>&1 | tail -30`
Expected: 通过(或仅有与品牌字符串断言相关的失败,需更新测试 fixture)

- [ ] **Step 2: 修复失败的测试**

如有测试因品牌字符串替换而失败,更新测试断言。

- [ ] **Step 3: CLI 冒烟测试**

```bash
npx tsx src/index.ts --version
npx tsx src/index.ts --help
```

Expected: 显示 Nervefeyn + NoWint + 中文

---

### Task 3.3:CHANGELOG 最终条目

- [ ] **Step 1: 更新 CHANGELOG**

在 `CHANGELOG.md` 添加最终条目:
```
## 2026-07-13 Nervefeyn 品牌改造与 Workbench UI 完成
- verified: GPLv3 License + NOTICE 双版权合规
- verified: 全仓库品牌替换(无残留 Feynman 用户面字符串)
- verified: 用户面中文化(CLI/Workbench/docs/prompts)
- verified: Workbench UI 基于 BonjourPrism 深色设计系统重写
- verified: CLI + 子代理 + Bio Tools 功能回归通过
- 下一步:子项目 A(神经/CS 数据源扩展)单独 brainstorm
```

- [ ] **Step 2: Final commit**

```bash
git add CHANGELOG.md
git commit -m "release: Nervefeyn brand replacement and Workbench UI rewrite complete"
```

---

## 自审记录

**Spec coverage:**
- 第 1 节品牌身份 → Task 1.1-1.3 ✅
- 第 1 节法律合规 → Task 1.1 ✅
- 第 2 节中文化范围 → Task 1.4-1.8 ✅
- 第 3 节设计系统 → Task 2.1 ✅
- 第 4 节页面结构 → Task 2.2-2.4 ✅
- 第 5 节文件清单 → 全覆盖 ✅

**Placeholder scan:** 无 TBD/TODO,每个 step 有明确指令。

**Type consistency:** 组件名一致(Sidebar/Topbar/HomeScreen/SessionScreen)。
