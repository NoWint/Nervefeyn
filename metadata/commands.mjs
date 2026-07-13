import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function parseFrontmatter(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) return {};

	const frontmatter = {};
	for (const line of match[1].split("\n")) {
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		if (!key) continue;
		frontmatter[key] = value;
	}
	return frontmatter;
}

export function readPromptSpecs(appRoot) {
	const dir = resolve(appRoot, "prompts");
	return readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => {
			const text = readFileSync(resolve(dir, f), "utf8");
			const fm = parseFrontmatter(text);
			return {
				name: f.replace(/\.md$/, ""),
				description: fm.description ?? "",
				args: fm.args ?? "",
				section: fm.section ?? "Research Workflows",
				topLevelCli: fm.topLevelCli === "true",
			};
		});
}

export const extensionCommandSpecs = [
	{ name: "capabilities", args: "", section: "Project & Session", description: "展示已安装的包、发现入口及运行时能力计数。", publicDocs: true },
	{ name: "commands", args: "", section: "Project & Session", description: "浏览 nervefeyn 工作流、项目及已批准的实时运行时命令。", publicDocs: true },
	{ name: "help", args: "", section: "Project & Session", description: "显示分组的 nervefeyn 命令,并将选中的命令预填到编辑器。", publicDocs: true },
	{ name: "feynman-model", args: "", section: "Project & Session", description: "打开 nervefeyn 的非 Pro 模型菜单(主模型 + 各 subagent 覆盖)。", publicDocs: true },
	{ name: "init", args: "", section: "Project & Session", description: "为研究项目引导生成 AGENTS.md 与会话日志目录。", publicDocs: true },
	{ name: "outputs", args: "", section: "Project & Session", description: "浏览所有研究制品(论文、outputs、实验、笔记)。", publicDocs: true },
	{ name: "service-tier", args: "", section: "Project & Session", description: "查看或设置受支持模型的 provider service tier 覆盖值。", publicDocs: true },
	{ name: "tools", args: "", section: "Project & Session", description: "浏览公开研究工具及其来源与参数摘要。", publicDocs: true },
];

export const livePackageCommandGroups = [
	{
		title: "Agent 与委派",
		commands: [
			{ name: "agents", usage: "/agents" },
			{ name: "run", usage: "/run <agent> <task>" },
			{ name: "chain", usage: "/chain agent1 -> agent2" },
			{ name: "parallel", usage: "/parallel agent1 -> agent2" },
		],
	},
	{
		title: "实时包命令",
		commands: [
			{ name: "search", usage: "/search" },
			{ name: "preview", usage: "/preview" },
			{ name: "hotkeys", usage: "/hotkeys" },
			{ name: "new", usage: "/new" },
			{ name: "quit", usage: "/quit" },
			{ name: "exit", usage: "/exit" },
		],
	},
];

export function isPublicLivePackageCommandName(name) {
	return livePackageCommandGroups.some((group) => group.commands.some((command) => command.name === name));
}

export const livePackageToolGroups = [
	{
		title: "网络与来源检索",
		tools: [
			{ name: "web_search" },
			{ name: "fetch_content" },
			{ name: "get_search_content" },
			{ name: "code_search" },
		],
	},
	{
		title: "文档访问",
		tools: [
			{ name: "document_parse" },
			{ name: "document_search" },
			{ name: "document_screenshot" },
		],
	},
	{
		title: "Agent 与委派",
		tools: [
			{ name: "subagent" },
		],
	},
];

export function isPublicLivePackageToolName(name) {
	return livePackageToolGroups.some((group) => group.tools.some((tool) => tool.name === name));
}

export const cliCommandSections = [
	{
		title: "核心",
		commands: [
			{ usage: "nervefeyn", description: "启动交互式 REPL。" },
			{ usage: "nervefeyn chat [prompt]", description: "显式启动聊天,可附带初始 prompt。" },
			{ usage: "nervefeyn help", description: "显示 CLI 帮助。" },
			{ usage: "nervefeyn setup", description: "运行引导式配置向导。" },
			{ usage: "nervefeyn setup preview", description: "安装或校验预览依赖。" },
			{ usage: "nervefeyn doctor", description: "诊断配置、鉴权、Pi 运行时与预览依赖。" },
			{ usage: "nervefeyn status", description: "显示当前配置摘要。" },
			{ usage: "nervefeyn serve [--port N] [--no-open] [--no-auth]", description: "打开本地研究工作台,包含项目会话、应用内 Pi 聊天、可选的纯 localhost 模式,以及 nervefeyn Bio Tools:精确的 OpenAlex/arXiv 文献模式、PubMed 工作流、临床试验、Grants.gov 机会搜索、FDA 监管数据、ChEMBL 分子药理学、PubChem/ChEBI/BindingDB/Rhea 化学模式,精确的 gnomAD/CADD/ClinVar/dbSNP 变异模式,CIViC/ClinGen/Open Targets 临床基因组模式,GTEx/PanglaoDB 表达模式,MyGene/OLS/QuickGO/UniProt/Reactome/KEGG 基因与本体模式,精确的 Ensembl 和 UCSC 基因组模式,精确的 ENCODE/JASPAR/UniBind 调控模式,精确的 GWAS/eQTL/PheWeb 人类遗传模式,精确的 InterPro/Pfam/Human Protein Atlas/STRING 蛋白注释模式,精确的 Antibody Registry 试剂模式,精确的 Rfam RNA 模式,精确的 ArrayExpress/GEO/MetaboLights/MGnify/PRIDE 组学归档模式,Ketcher KET/RXN/CDXML/CXSMILES 化学制品,生物数据库、制品、来源记录与实验笔记本。" },
			{ usage: 'nervefeyn rank "topic" [--expand-citations N] [--full-text-top N] [--critique-top N] [--synthesize]', description: "对论文排序以决定先读哪些,提供透明的引用、方法、可复现性与来源证据。" },
			{ usage: "nervefeyn paper <doi|arxiv-id|openalex-id|pmid|pmcid|title> [--fetch-full-text]", description: "为单篇论文在 OpenAlex、arXiv/alphaXiv、DOI、PMID/PMCID 与 Europe PMC 之间解析合法全文访问候选,并可选地按来源抓取文本。" },
		],
	},
	{
		title: "模型管理",
		commands: [
			{ usage: "nervefeyn model list", description: "列出 Pi 鉴权存储中的可用模型。" },
			{ usage: "nervefeyn model login [id]", description: "通过 OAuth 或 API key 配置模型 provider 鉴权。" },
			{ usage: "nervefeyn model logout [id]", description: "清除某个模型 provider 的已存鉴权。" },
			{ usage: "nervefeyn model set <provider/model>", description: "设置默认的非 Pro 模型(也接受 provider:model)。" },
			{ usage: "nervefeyn model tier [value]", description: "查看或设置请求 service tier 覆盖值。" },
		],
	},
	{
		title: "AlphaXiv",
		commands: [
			{ usage: "nervefeyn alpha login", description: "登录 alphaXiv。" },
			{ usage: "nervefeyn alpha logout", description: "清除 alphaXiv 鉴权。" },
			{ usage: "nervefeyn alpha status", description: "查看 alphaXiv 鉴权状态。" },
			{ usage: 'nervefeyn alpha search "query"', description: "通过 nervefeyn 内置的 alphaXiv 客户端搜索论文。" },
			{ usage: "nervefeyn alpha get <id-or-url>", description: "获取论文内容与本地批注。" },
			{ usage: 'nervefeyn alpha ask <id-or-url> "question"', description: "就某篇论文提问。" },
			{ usage: "nervefeyn alpha code <github-url> [path]", description: "检视论文代码仓库。" },
			{ usage: "nervefeyn alpha annotate ...", description: "读取、写入、列出或清除本地论文笔记。" },
		],
	},
	{
		title: "工具",
		commands: [
			{ usage: "nervefeyn packages list", description: "展示核心与可选的 Pi 包预设。" },
			{ usage: "nervefeyn packages install <preset>", description: "按需安装可选包预设。" },
			{ usage: "nervefeyn search status", description: "显示 Pi 网络访问状态与配置路径。" },
			{ usage: "nervefeyn search set <provider> [api-key]", description: "设置网络搜索 provider,并可选择性保存其 API key。" },
			{ usage: "nervefeyn search clear", description: "将网络搜索 provider 重置为 auto,同时保留 API key。" },
			{ usage: "nervefeyn update [package]", description: "更新已安装的包,或更新指定包。" },
		],
	},
];

export const legacyFlags = [
	{ usage: '--prompt "<text>"', description: "运行单个 prompt 后退出。" },
	{ usage: "--alpha-login", description: "登录 alphaXiv 后退出。" },
	{ usage: "--alpha-logout", description: "清除 alphaXiv 鉴权后退出。" },
	{ usage: "--alpha-status", description: "显示 alphaXiv 鉴权状态后退出。" },
	{ usage: "--model <provider/model|provider:model>", description: "强制使用指定的非 Pro 模型。" },
	{ usage: "--service-tier <tier>", description: "为本次运行覆盖请求 service tier。" },
	{ usage: "--thinking <level>", description: "设置 thinking 级别:off | minimal | low | medium | high | xhigh。" },
	{ usage: "--cwd <path>", description: "设置工具的工作目录。" },
	{ usage: "--session-dir <path>", description: "设置会话存储目录。" },
	{ usage: "--new-session", description: "启动一个新的持久化会话。" },
	{ usage: "--doctor", description: "`nervefeyn doctor` 的别名。" },
	{ usage: "--setup-preview", description: "`nervefeyn setup preview` 的别名。" },
];

export const topLevelCommandNames = ["alpha", "chat", "doctor", "help", "model", "packages", "paper", "rank", "search", "serve", "setup", "status", "update"];

export function formatSlashUsage(command) {
	return `/${command.name}${command.args ? ` ${command.args}` : ""}`;
}

export function formatCliWorkflowUsage(command) {
	return `nervefeyn ${command.name}${command.args ? ` ${command.args}` : ""}`;
}

export function getExtensionCommandSpec(name) {
	return extensionCommandSpecs.find((command) => command.name === name);
}
