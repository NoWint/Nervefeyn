---
title: 预览
description: 在预览命令可用时预览生成的研究产物。
section: Tools
order: 5
---

预览支持是可选的。当某个实时预览包暴露 `/preview` 时,Nervefeyn 可以把生成的产物渲染为 HTML 或 PDF 文档,并在浏览器或 PDF 查看器中打开。当该命令不可用时,使用 `nervefeyn setup preview` 验证渲染依赖,并直接使用 `pandoc` 等 shell 工具或浏览器。

## 用法

在 REPL 中,当 `/preview` 可见时预览最近的产物:

```
/preview
```

当该命令存在时,你也可以预览具体文件:

```
/preview outputs/scaling-laws-brief.md
```

## 依赖

Markdown 转 HTML 和 Markdown 转 PDF 渲染需要 `pandoc`。验证或安装该依赖:

```bash
nervefeyn setup preview
```

在带 Homebrew 的 macOS 上,设置命令会尝试自动安装 pandoc。在 Linux 上,它会在你的包管理器中检查 pandoc。若自动安装不成功,请从 [pandoc.org](https://pandoc.org/installing.html) 手动安装,并重新运行 `nervefeyn setup preview` 验证。

## 支持的格式

当预览命令可用时,它们处理三种输出格式:

- **Markdown** —— 当实时预览命令支持时,渲染为带 KaTeX 数学支持、语法高亮代码块和清晰排版的 HTML
- **HTML** —— 直接在默认浏览器中打开,无转换步骤
- **PDF** —— 通过 pandoc 以 LaTeX 渲染生成,适合分享或打印

## 工作原理

渲染流水线取决于你的 Pi 会话中可用的实时预览命令。对于 Markdown 文件,它应转换为 HTML 或 PDF,带可读排版和渲染的数学公式。如果没有可见预览命令,运行 `pandoc input.md -o output.html` 或 `pandoc input.md -o output.pdf`,然后直接打开结果。

对于含大量数学符号的文档(研究草稿中常见),预览路径旨在渲染常见内联数学(`$...$`)、展示数学(`$$...$$`)、表格、引用列表和嵌套块引用(当实时预览命令或 shell 渲染器支持时)。

## 自定义

预览输出应保留研究文档结构,如标题层级、代码块、表格、数学公式、引用列表和块引用。具体样式取决于所用的预览包或 shell 渲染器。
