---
title: 安装
description: 在 macOS、Linux 或 Windows 上通过 curl 或 npm 安装 Nervefeyn。
section: Getting Started
order: 1
---

Nervefeyn 可以作为独立运行时 bundle 安装,也可以作为 npm 包安装。对大多数用户来说,独立安装器是最简单的路径,因为它会下载预构建的原生 bundle,无需任何外部运行时依赖。

## 一行命令安装器(推荐)

在 **macOS 或 Linux** 上,打开终端并执行:

```bash
curl -fsSL https://nervefeyn.dev/install | bash
```

安装器会自动检测你的操作系统和架构。macOS 上同时支持 Intel 和 Apple Silicon,Linux 上支持 x64 与 arm64。启动器会被安装到 `~/.local/bin`,内置运行时会解压到 `~/.local/share/nervefeyn`,并在需要时更新你的 `PATH`。

如果你之前通过包管理器安装过 Nervefeyn,在使用 curl 安装后仍然看到本地 Node.js 报错,很可能是 shell 仍优先解析旧的全局二进制。运行 `which -a nervefeyn`,再执行 `hash -r`,或直接用 `~/.local/bin/nervefeyn` 启动独立 shim。

在 **Windows** 上,以管理员身份打开 PowerShell 并执行:

```powershell
irm https://nervefeyn.dev/install.ps1 | iex
```

这会将 Windows 运行时 bundle 安装到 `%LOCALAPPDATA%\Programs\nervefeyn`,把启动器加入你的用户 `PATH`,并可随时重新运行安装器进行更新。

## 备选:通过 npm 安装

如果你希望把 Nervefeyn 安装到现有的 Node.js 环境中,可改用 npm:

```bash
npm install -g @nowint/nervefeyn
```

这种方式使用你本地的 Node.js 运行时,而非内置独立运行时。它要求 Node.js 版本满足 Nervefeyn 当前的引擎范围:`>=22.19.0 <26`。

## 更新独立应用

要在 macOS、Linux 或 Windows 上更新独立 Nervefeyn 应用,重新运行你最初使用的安装器即可。这会用最新的 tagged 发布替换已下载的运行时 bundle。

`nervefeyn update` 与此不同:它更新的是 Nervefeyn 环境内已安装的 Pi 包,而非独立应用 bundle 本身。

如果你是通过 npm 安装的 Nervefeyn,请使用以下命令升级:

```bash
npm install -g @nowint/nervefeyn@latest
```

## 卸载

Nervefeyn 目前未提供独立的 `uninstall` 命令。请直接删除独立启动器和运行时 bundle;若想同时清除设置、工作台应用状态、会话及已安装包状态,可一并删除 Nervefeyn 主目录。若还想清除 alphaXiv 登录状态,请删除 `~/.ahub`。

如果你是通过 npm 安装的 Nervefeyn,请用以下命令卸载:

```bash
npm uninstall -g @nowint/nervefeyn
```

在 macOS 或 Linux 上:

```bash
rm -f ~/.local/bin/nervefeyn
rm -rf ~/.local/share/nervefeyn
# 可选:删除设置、工作台状态、会话和已安装包状态
rm -rf ~/.nervefeyn
# 可选:删除 alphaXiv 登录状态
rm -rf ~/.ahub
```

在 Windows PowerShell 中:

```powershell
Remove-Item "$env:LOCALAPPDATA\\Programs\\nervefeyn" -Recurse -Force
# 可选:删除设置、工作台状态、会话和已安装包状态
Remove-Item "$HOME\\.nervefeyn" -Recurse -Force
# 可选:删除 alphaXiv 登录状态
Remove-Item "$HOME\\.ahub" -Recurse -Force
```

如果你曾手动把启动器目录加入 `PATH`,请一并移除该条目。

## 仅安装技能

如果你只想要 Nervefeyn 的研究技能,而不需要完整的终端运行时,可单独安装技能库。

安装到 Codex 用户级目录 `~/.codex/skills/nervefeyn`:

```bash
curl -fsSL https://nervefeyn.dev/install-skills | bash
```

也可以显式指定 Codex 目标:

```bash
curl -fsSL https://nervefeyn.dev/install-skills | bash -s -- --codex
```

安装到当前仓库下的 `.agents/skills/nervefeyn`(仓库本地 Claude/agent 安装):

```bash
curl -fsSL https://nervefeyn.dev/install-skills | bash -s -- --repo
```

安装到 OpenCode 项目本地目录 `.opencode/skills/nervefeyn`:

```bash
curl -fsSL https://nervefeyn.dev/install-skills | bash -s -- --opencode
```

在 Windows 上,将技能安装到你的 Codex 技能目录:

```powershell
irm https://nervefeyn.dev/install-skills.ps1 | iex
```

或显式指定 Codex 目标:

```powershell
& ([scriptblock]::Create((irm https://nervefeyn.dev/install-skills.ps1))) -Scope Codex
```

或安装为仓库本地:

```powershell
& ([scriptblock]::Create((irm https://nervefeyn.dev/install-skills.ps1))) -Scope Repo
```

或安装到 OpenCode 项目:

```powershell
& ([scriptblock]::Create((irm https://nervefeyn.dev/install-skills.ps1))) -Scope OpenCode
```

这些安装器会下载打包的 `skills/` 与 `prompts/` 目录,以及这些技能引用的仓库指导文件。它们不会安装 Nervefeyn 终端、内置 Node 运行时、登录态存储或 Pi 包。

## 固定版本

一行命令安装器默认指向最新的 tagged 发布。若要固定到某个具体版本,请显式传入:

```bash
curl -fsSL https://nervefeyn.dev/install | bash -s -- 0.2.31
```

在 Windows 上:

```powershell
& ([scriptblock]::Create((irm https://nervefeyn.dev/install.ps1))) -Version 0.2.31
```

## 安装后设置

安装完成后,运行引导式设置向导来配置模型提供商和 API 密钥:

```bash
nervefeyn setup
```

向导会带你选择一个非 Pro 默认模型、完成提供商认证,并可选安装研究连续性扩展(如 memory 或 session search)。详见[设置指南](/docs/getting-started/setup)。

## 验证安装

确认 Nervefeyn 已安装并可访问:

```bash
nervefeyn --version
```

如果能看到版本号,说明已就绪。随时可运行 `nervefeyn doctor` 来诊断配置问题、缺失依赖或认证异常。
