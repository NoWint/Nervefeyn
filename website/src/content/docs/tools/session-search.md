---
title: 会话检索
description: 检索历史 Nervefeyn 会话记录,回溯过往研究。
section: Tools
order: 4
---

可选的会话检索包从已存储的会话记录中恢复过往 Nervefeyn 工作。Nervefeyn 把会话持久化到磁盘,该包在受支持的运行时上为过往研究、发现和生成产物增加索引检索。

## 安装

会话检索是一个可选包。用以下命令安装:

```bash
nervefeyn packages install session-search
```

它通过 Node.js 22.x 提供,前提是上游 sqlite 依赖仍为原生绑定。在更新的 Node 主版本上,Nervefeyn 会跳过它,而非让首次启动依赖本地 C++ 构建工具链。

安装并在 REPL 中可见后,`/search` 斜杠命令在后续会话中可用。若 `/search` 不可见,使用下方的直接文件检索回退。

## 用法

在 REPL 中直接调用会话检索:

```
/search transformer scaling laws
```

自然语言回溯依赖于该可选包已安装并加载到当前 Pi 会话。当它不可见时,直接检索会话文件:

```bash
rg -n "protein folding" ~/.nervefeyn/sessions
```

## 它检索什么

该可选包索引你会话历史的全部内容:

- 完整会话记录,包括你的提示和 Nervefeyn 的回复
- 来自深度研究和文献综述等工作流的工具输出和代理结果
- 生成的产物,如草稿、报告和对比矩阵
- 元数据,如时间戳、主题和工作流类型

检索同时使用关键词匹配和语义相似度来找到相关的过往工作。结果包含会话 ID、时间戳和相关摘录,让你能识别哪个会话包含所需信息。

## 何时使用

当你安装了该可选包并希望:不重跑昂贵工作流而接续此前的研究线索、从过往深度研究会话中找到具体发现或引用、在新研究上下文中引用此前分析,或在启动新一轮前检查你已对某主题调查过什么时,会话检索很有价值。

## 工作原理

`@kaiserlich-dev/pi-session-search` 包提供底层检索和索引。会话默认存储在 `~/.nervefeyn/sessions/`(可用 `--session-dir` 配置)。索引在新会话完成时增量构建。
