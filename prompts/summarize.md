---
description: 使用 RLM 模式总结研究来源、论文、报告、仓库 README、本地制品或 PDF——来源存于磁盘,绝不原始注入上下文。
args: <source> [--window-size <chars>] [--overlap <chars>] [--tier1-threshold <chars>] [--tier2-threshold <chars>]
section: Research Workflows
topLevelCli: true
---
## 工具纪律(先阅读)

工具名称是字面量。仅使用当前工具集中可见的工具。

- 使用 `web_search` 搜索;不要调用 `search_web`、`google_search`、`google:search`、`search_google` 或 `WebSearch`。
- 使用 `fetch_content` 抓取 URL;不要调用裸 `fetch`、`WebFetch`、`read_url_content`,也不要将数组作为 `url` 传入。当工具支持时,使用 `urls` 传入多个 URL。
- 当存在可见的 nervefeyn alpha 工具(如 `alpha_search`)时使用它们。如需 shell 访问,调用 `nervefeyn alpha ...`;不要调用用户全局的裸 `alpha` 二进制。
- 要向用户提问,直接写纯聊天文本并等待下一条用户消息。不要调用 `ask_user_question`、`ask_user`、`ask_followup_question` 或 `user_choice`。
- 不要将 `Task` 用作 agent 调度器。仅当存在可见的 `subagent` 工具时使用它。
- 如果工具返回 `Tool not found` 或 `Invalid URL`,不要重试同一个无效调用。映射到规范的可见工具与合法参数,或将该能力记录为 blocked。

总结以下研究来源:$@

从来源文件名或 URL 域名派生一个短 slug(小写、连字符、无填充词,≤5 个词——例如 `attention-is-all-you-need`)。本次运行的所有文件使用该 slug。

## 为何使用 RLM 模式

标准总结会将整篇文档注入上下文。超过约 15k token 后,随着窗口填满,早期内容会退化(context rot)。此工作流将文档作为外部变量保留在磁盘上,只读取有界窗口——因此上下文压力与窗口大小成正比,而非与文档大小成正比。

Tier 1(低于 Tier-1 阈值)是一个刻意的例外:对短输入而言直接注入是安全的,而窗口化读取会增加不必要的摩擦。

## 运行时旋钮(上下文窗口控制)

同时支持内联 flag 与环境变量,以便用户按运行或全局调整上下文窗口行为。

- `--window-size <chars>` 或 `FEYNMAN_SUMMARIZE_WINDOW_CHARS`(默认:`6000`)
- `--overlap <chars>` 或 `FEYNMAN_SUMMARIZE_OVERLAP_CHARS`(默认:`500`)
- `--tier1-threshold <chars>` 或 `FEYNMAN_SUMMARIZE_TIER1_THRESHOLD`(默认:`8000`)
- `--tier2-threshold <chars>` 或 `FEYNMAN_SUMMARIZE_TIER2_THRESHOLD`(默认:`60000`)

规则:
- 内联 flag 覆盖环境变量。
- 验证 `window-size > overlap` 且 `tier1-threshold < tier2-threshold`;若非法,停下并报告一个清晰的配置错误。
- 每次运行记录一次解析后的值:`[summarize] config window=<w> overlap=<o> tier1=<t1> tier2=<t2>`。

---

## 第 1 步 — 抓取、验证、测量

在任何 tier 逻辑之前运行所有守卫。此处的失败代价低;Tier-3 中途的失败代价不低。

- **GitHub 仓库 URL**(`https://github.com/owner/repo`——恰好 4 个斜杠):改为抓取原始 README。先试 `https://raw.githubusercontent.com/{owner}/{repo}/main/README.md`,再试 `/master/README.md`。仓库 HTML 页面并非用户想要总结的文档。
- **远程 URL**:用 `curl -sL -o outputs/.notes/<slug>-raw.txt <url>` 抓取到磁盘。不要使用 fetch_content——其返回值直接进入上下文,绕过 RLM 外部变量原则。
- **本地文件或 PDF**:复制或提取到 `outputs/.notes/<slug>-raw.txt`。对于 PDF,先通过 `pdftotext` 或等价工具提取文本再测量。
- **空或失败的抓取**:若抓取后文件 < 50 字节,停下并向用户报错——不要继续到 tier 选择。
- **二进制内容**:若文件 > 1 KB 但可读文本字符 < 100,停下并告诉用户内容看起来是二进制或未提取。
- **已存在输出**:若 `outputs/<slug>-summary.md` 已存在,询问用户是覆盖还是使用不同 slug。确认前不要继续。

测量解码后的文本字符数(非字节——UTF-8 多字节字符会被多算)。记录:`[summarize] source=<source> slug=<slug> chars=<count>`

---

## 第 2 步 — 选择 tier

| Chars | Tier | 策略 |
|---|---|---|
| < `<tier1-threshold>` | 1 | 直接读取——完整内容进入上下文(对短输入安全) |
| `<tier1-threshold>` – `<tier2-threshold>` | 2 | RLM-lite——窗口化 bash 提取,渐进式笔记写入磁盘 |
| > `<tier2-threshold>` | 3 | 完整 RLM——bash 分块 + 并行 researcher subagent |

记录:`[summarize] tier=<N> chars=<count>`

---

## Tier 1 — 直接读取

完整读取 `outputs/.notes/<slug>-raw.txt`。直接使用输出格式总结。写入 `outputs/<slug>-summary.md`。

---

## Tier 2 — RLM-lite 窗口化读取

文档保留在磁盘上。通过 bash 提取 `<window-size>` 字符的窗口:

```python
# WHY f.seek/f.read: the read tool uses line offsets, not char offsets.
# For exact char-boundary windowing across arbitrary text, bash is required.
with open("outputs/.notes/<slug>-raw.txt", encoding="utf-8") as f:
    f.seek(n * <window-size>)
    window = f.read(<window-size>)
```

对每个窗口:
1. 提取关键论断与证据。
2. 在读取下一个窗口前追加到 `outputs/.notes/<slug>-notes.md`。这是检查点:若会话被中断,已处理的窗口会留存。
3. 记录:`[summarize] window <N>/<total> done`

将 `outputs/.notes/<slug>-notes.md` 综合为 `outputs/<slug>-summary.md`。

---

## Tier 3 — 完整 RLM 并行分块

每个分块获得一个全新的 researcher subagent 上下文窗口——context rot 不可能发生,因为没有 subagent 会看到超过 `<window-size>` 字符。

为何 overlap 重要:学术论文包含跨越分块边界的多句论证。配置的 overlap 确保跨边界论断至少完整出现在一个相邻分块中。

### 3a. 对文档分块

```python
import os
os.makedirs("outputs/.notes", exist_ok=True)

with open("outputs/.notes/<slug>-raw.txt", encoding="utf-8") as f:
    text = f.read()

chunk_size, overlap = <window-size>, <overlap>
chunks, i = [], 0
while i < len(text):
    chunks.append(text[i : i + chunk_size])
    i += chunk_size - overlap

for n, chunk in enumerate(chunks):
    # Zero-pad index so files sort correctly (chunk-002 before chunk-010)
    with open(f"outputs/.notes/<slug>-chunk-{n:03d}.txt", "w", encoding="utf-8") as f:
        f.write(chunk)

print(f"[summarize] chunks={len(chunks)} chunk_size={chunk_size} overlap={overlap}")
```

### 3b. 生成前确认

简要总结:"来源约 ~<chars> 字符 -> <N> 个分块 -> <N> 个 researcher subagent。继续进行分块 pass。"然后自动继续。除非用户明确要求在启动前审查,否则不要请求确认或等待继续响应。

### 3c. 派发 researcher subagent

```json
{
  "tasks": [{
    "agent": "researcher",
    "task": "Read ONLY `outputs/.notes/<slug>-chunk-NNN.txt`. Extract: (1) key claims, (2) methodology or technical approach, (3) cited evidence. Do NOT use web_search or fetch external URLs — this is single-source summarization. If a claim appears to start or end mid-sentence at the file boundary, mark it BOUNDARY PARTIAL. Write to `outputs/.notes/<slug>-summary-chunk-NNN.md`.",
    "output": "outputs/.notes/<slug>-summary-chunk-NNN.md"
  }],
  "concurrency": 4,
  "failFast": false
}
```

### 3d. 聚合

所有 subagent 返回后,验证每个预期的 `outputs/.notes/<slug>-summary-chunk-NNN.md` 都存在。记录任何缺失的分块索引——它们将出现在输出的 Coverage gaps 章节中。不要因部分覆盖而中止;带缺口的局部总结比没有总结更有用。

综合时:
- **去重**:多个分块中的同一论断视为一个论断——保留最完整的表述。
- **解决边界冲突**:对相邻分块的矛盾,优先采用有更多支撑上下文的版本。
- **移除 BOUNDARY PARTIAL 标记**(当相邻分块中存在完整版本时)。

写入 `outputs/<slug>-summary.md`。

---

## 输出格式

所有 tier 在 `outputs/<slug>-summary.md` 产出同一制品:

```markdown
# Summary: [document title or source filename]

**Source:** [URL or file path]
**Date:** [YYYY-MM-DD]
**Tier:** [1 / 2 (N windows) / 3 (N chunks)]

## Key Claims
[3-7 most important assertions, each as a bullet]

## Field Context
[Where the source positions itself, which prior work or research line it claims to extend, and what remains source-inferred rather than externally checked. Do not invent author/lab background; use `/lit` for a corpus-level view.]

## Technical Hinges
[2-4 contributions or decisions that the source turns on, ranked by originality and importance. For each hinge, name the contrast with prior work when the source gives enough evidence.]

## Methodology From Primitives
[Approach, dataset, evidence type, evaluation, baselines, and failure modes explained from first principles. Omit only when the source has no methodology or evidence section.]

## Limitations
[What the source explicitly flags as weak, incomplete, or out of scope]

## Follow-up Questions
[3 questions that would change the next research decision, grounded in the source's discussion, limitations, results, or open problems]

## Verdict
[One paragraph: what this document establishes, its credibility, who should read it]

## Sources
1. [Title or filename] — [URL or file path]

## Coverage gaps *(Tier 3 only — omit if all chunks succeeded)*
[Missing chunk indices and their approximate byte ranges]
```

停止前,在磁盘上验证 `outputs/<slug>-summary.md` 存在。

Sources 仅包含在第 1 步中确认可达的单一来源。不需要 verifier subagent——没有从记忆中构造的 URL 需要验证。
