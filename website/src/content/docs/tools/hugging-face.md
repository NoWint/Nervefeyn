---
title: Hugging Face Hub
description: 在研究工作流中检视 Hugging Face 数据集和仓库文件。
section: Tools
order: 3
---

Nervefeyn 包含只读的 Hugging Face Hub 工具,用于为 ML 配方和复现计划接地。它们帮助 researcher 核实某个数据集或仓库是否真的暴露了实现所需的文件、划分、schema 和 card 元数据。

这些工具基于 Hugging Face 公开 [Hub API 端点文档](https://huggingface.co/docs/hub/api)。认证遵循 [`huggingface_hub`](https://huggingface.co/docs/huggingface_hub/main/en/package_reference/environment_variables) 文档中的 `HF_TOKEN` 环境变量;Nervefeyn 也接受 `HUGGINGFACE_HUB_TOKEN` 以兼容既有 shell。

## 认证

公开 Hub 资源无需配置即可使用。对于私有或受限资源,在启动 Nervefeyn 前在 shell 中设置访问令牌:

```bash
export HF_TOKEN=hf_...
```

Nervefeyn 也会检查 `HUGGINGFACE_HUB_TOKEN`。工具会把存在的令牌随 Hub 请求发送。

## 工具

researcher 代理可以自动使用这些工具:

| 工具 | 用途 |
| --- | --- |
| `hf_dataset_info` | 检视数据集元数据、标签、访问状态、card 数据、features、划分、下载量、点赞数和同级文件 |
| `hf_repo_files` | 在读取大文件前列出 model、dataset 或 Space 仓库中的文件 |
| `hf_repo_read_file` | 从 Hub 仓库读取小型文本文件,如 `README.md`、配置、示例和脚本 |

文件读取器默认会截断输出,且仅面向文本文件。它不是权重下载器或数据集批量读取器。它会在下载前拒绝明显的模型权重文件、归档和数据集分片,如 `.safetensors`、`.bin`、`.gguf`、`.parquet`、`.zip` 和 `.tar`。

## 用在哪里

`/recipe` 工作流使用 Hugging Face Hub 检视来验证数据集可用性和 schema,再推荐训练配方。`/replicate` 工作流对 ML 密集型论文和基准主张使用相同检查。

例如,使用某聊天 SFT 数据集的配方应在称其可用前,验证该数据集具有 `messages`、`text` 或 prompt/completion 式 schema。若 Nervefeyn 无法检查该 schema,最终产物应把数据集标记为 `unverified` 或 `blocked`。

## 边界

这些工具是只读的。它们不创建仓库、上传文件、启动作业或管理私有数据。若某实验需要在 Hugging Face 基础设施上执行,Nervefeyn 应将其记录为后续实现决策,而非静默尝试。
