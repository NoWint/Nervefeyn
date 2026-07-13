---
title: 论文访问
description: 为单篇论文解析合法的全文访问候选。
section: Workflows
order: 3
---

当你已有一个 DOI、arXiv ID、OpenAlex ID、PMID、PMCID 或标题,需要找到最佳合法访问路径时,使用 `nervefeyn paper`。

## 用法

```bash
nervefeyn paper 10.7717/peerj.4375
nervefeyn paper pmid:29456894
nervefeyn paper 2309.08600 --fetch-full-text
nervefeyn paper "The state of OA" --json
```

## 输出

每次运行写入:

- `<slug>-paper-access.md` —— 可读的访问报告,含标识符、候选和限制
- `<slug>-paper-access.json` —— 机器可读的论文元数据和访问候选

解析器使用 OpenAlex 主要来源、最佳开放获取以及所有已报告的位置元数据、DOI 链接、arXiv 论文对应的 arXiv/alphaX,以及存档开放获取 PMC 文章的 Europe PMC 全文 XML。它把 PDF 链接记录为访问候选,但不解析任意 PDF 或绕过付费墙。当 `--fetch-full-text` 成功时,产物只记录状态、来源、长度和章节元数据;不写入原始全文正文。
