import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { patchPiRuntimeNodeModules } from "../src/pi/runtime-patches.js";

const SOURCE = `
async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {
    const tool = currentContext.tools?.find((t) => t.name === toolCall.name);
    if (!tool) {
        return {
            kind: "immediate",
            result: createErrorToolResult(\`Tool \${toolCall.name} not found\`),
            isError: true,
        };
    }
    try {
        const preparedToolCall = prepareToolCallArguments(tool, toolCall);
        const validatedArgs = validateToolArguments(tool, preparedToolCall);
        if (config.beforeToolCall) {
            const beforeResult = await config.beforeToolCall({
                assistantMessage,
                toolCall,
                args: validatedArgs,
                context: currentContext,
            }, signal);
        }
        return {
            kind: "prepared",
            toolCall,
            tool,
            args: validatedArgs,
        };
    }
    catch (error) {
        return {
            kind: "immediate",
            result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
            isError: true,
        };
    }
}
`;

const TUI_SOURCE = `
        const renderEnd = Math.min(lastChanged, newLines.length - 1);
        for (let i = firstChanged; i <= renderEnd; i++) {
            if (i > firstChanged)
                buffer += "\\r\\n";
            buffer += "\\x1b[2K"; // Clear current line
            const line = newLines[i];
            const isImage = isImageLine(line);
            if (!isImage && visibleWidth(line) > width) {
                // Log all lines to crash file for debugging
                const crashLogPath = path.join(os.homedir(), ".pi", "agent", "pi-crash.log");
                const crashData = [
                    \`Crash at \${new Date().toISOString()}\`,
                    \`Terminal width: \${width}\`,
                    \`Line \${i} visible width: \${visibleWidth(line)}\`,
                    "",
                    "=== All rendered lines ===",
                    ...newLines.map((l, idx) => \`[\${idx}] (w=\${visibleWidth(l)}) \${l}\`),
                    "",
                ].join("\\n");
                fs.mkdirSync(path.dirname(crashLogPath), { recursive: true });
                fs.writeFileSync(crashLogPath, crashData);
                // Clean up terminal state before throwing
                this.stop();
                const errorMsg = [
                    \`Rendered line \${i} exceeds terminal width (\${visibleWidth(line)} > \${width}).\`,
                    "",
                    "This is likely caused by a custom TUI component not truncating its output.",
                    "Use visibleWidth() to measure and truncateToWidth() to truncate lines.",
                    "",
                    \`Debug log written to: \${crashLogPath}\`,
                ].join("\\n");
                throw new Error(errorMsg);
            }
            buffer += line;
        }
`;

const EDITOR_SOURCE = `
import { getSegmenter, isPunctuationChar, isWhitespaceChar, truncateToWidth, visibleWidth } from "../utils.js";

export class Editor {
    render(width) {
        const layoutLines = this.layoutText(width);
        return layoutLines.map((line) => line.text);
    }
    handleInput(data) {
        return data;
    }
}
`;

const THEME_SOURCE = `
export function getEditorTheme() {
    return {
        borderColor: (text) => theme.fg("borderMuted", text),
        selectList: getSelectListTheme(),
    };
}
export function getSettingsListTheme() {
    return {};
}
`;

const PI_OTEL_CONFIG_SOURCE = `    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        merged?.endpoint ??
        "http://127.0.0.1:4317";
    const protocol = normalizeProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? merged?.protocol);
    const headers = {
        ...(merged?.headers ?? {}),
        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    };`;

const SESSION_SEARCH_INDEXER_SOURCE = `
export async function indexAllSessions() {
    const sessionsDir = path.join(os.homedir(), ".pi", "agent", "sessions");
    const files = findSessionFiles(sessionsDir);
    return files.length;
}
`;

const ALPHA_SEARCH_SOURCE = `
function getErrorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

async function getValidToken() {
  return null;
}

async function callTool(name, args) {
  return { name, args };
}

export async function searchByEmbedding(query) {
  return await callTool('embedding_similarity_search', { query });
}

export async function searchByKeyword(query) {
  return await callTool('full_text_papers_search', { query });
}

export async function agenticSearch(query) {
  return await callTool('agentic_paper_retrieval', { query });
}
`;

const WEB_ACCESS_INDEX_SOURCE = `
import { join } from "node:path";
import { homedir } from "node:os";
const WEB_SEARCH_CONFIG_PATH = join(homedir(), ".pi", "web-search.json");
function saveConfig() {
    const dir = join(homedir(), ".pi");
}
async function execute(params, configWorkflow, ctx) {
    const workflow = resolveWorkflow(params.workflow ?? configWorkflow, ctx?.hasUI !== false);
}
pi.registerCommand("search", { description: "Browse stored web search results" });
`;

const SUBAGENT_PI_SPAWN_SOURCE = `
export interface PiSpawnDeps {
	execPath?: string;
	argv1?: string;
}

export function resolveWindowsPiCliScript(deps: PiSpawnDeps = {}): string | undefined {
	const existsSync = deps.existsSync ?? fs.existsSync;
	const argv1 = deps.argv1 ?? process.argv[1];

	if (argv1) {
		const argvPath = normalizePath(argv1);
		if (isRunnableNodeScript(argvPath, existsSync)) {
			return argvPath;
		}
	}
}
`;

test("patchPiRuntimeNodeModules patches installed Pi runtime files", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-runtime-patches-"));
	const agentLoopPath = join(appRoot, "node_modules", "@earendil-works", "pi-agent-core", "dist", "agent-loop.js");
	const tuiPath = join(appRoot, "node_modules", "@earendil-works", "pi-tui", "dist", "tui.js");
	const editorPath = join(appRoot, "node_modules", "@earendil-works", "pi-tui", "dist", "components", "editor.js");
	const themePath = join(appRoot, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "modes", "interactive", "theme", "theme.js");
	const packageJsonPath = join(appRoot, "node_modules", "@earendil-works", "pi-coding-agent", "package.json");
	const alphaSearchPath = join(appRoot, "node_modules", "@companion-ai", "alpha-hub", "src", "lib", "alphaxiv.js");
	const sessionSearchPath = join(appRoot, "node_modules", "@kaiserlich-dev", "pi-session-search", "extensions", "indexer.ts");
	await mkdir(dirname(agentLoopPath), { recursive: true });
	await mkdir(dirname(tuiPath), { recursive: true });
	await mkdir(dirname(editorPath), { recursive: true });
	await mkdir(dirname(themePath), { recursive: true });
	await mkdir(dirname(packageJsonPath), { recursive: true });
	await mkdir(dirname(alphaSearchPath), { recursive: true });
	await mkdir(dirname(sessionSearchPath), { recursive: true });
	writeFileSync(agentLoopPath, SOURCE, "utf8");
	writeFileSync(tuiPath, TUI_SOURCE, "utf8");
	writeFileSync(editorPath, EDITOR_SOURCE, "utf8");
	writeFileSync(themePath, THEME_SOURCE, "utf8");
	writeFileSync(
		packageJsonPath,
		JSON.stringify({ name: "@earendil-works/pi-coding-agent", piConfig: { configDir: ".pi" } }, null, 2) + "\n",
		"utf8",
	);
	writeFileSync(alphaSearchPath, ALPHA_SEARCH_SOURCE, "utf8");
	writeFileSync(sessionSearchPath, SESSION_SEARCH_INDEXER_SOURCE, "utf8");

	assert.equal(patchPiRuntimeNodeModules(appRoot), true);

	const patched = readFileSync(agentLoopPath, "utf8");
	assert.match(patched, /function normalizeFeynmanToolAlias/);
	assert.match(patched, /\["google:search", "web_search"\]/);
	assert.match(patched, /\["search_web", "web_search"\]/);
	assert.match(patched, /\["fetch", "fetch_content"\]/);
	assert.match(patched, /prepareToolCallArguments\(tool, effectiveToolCall\)/);
	const patchedTui = readFileSync(tuiPath, "utf8");
	assert.match(patchedTui, /line = sliceByColumn\(line, 0, width, true\)/);
	assert.doesNotMatch(patchedTui, /throw new Error\(errorMsg\)/);
	assert.match(readFileSync(editorPath, "utf8"), /displayText = styleInput\(before\) \+ marker \+ styleInput\(after\)/);
	assert.match(readFileSync(themePath, "utf8"), /input: \(text\) => theme\.fg\("text", text\)/);
	const patchedPackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { piConfig?: Record<string, unknown> };
	assert.equal(patchedPackageJson.piConfig?.name, "feynman");
	assert.equal(patchedPackageJson.piConfig?.configDir, ".feynman");
	assert.match(readFileSync(alphaSearchPath, "utf8"), /async function searchRestFast/);
	assert.match(readFileSync(sessionSearchPath, "utf8"), /process\.env\.FEYNMAN_SESSION_DIR/);
	assert.equal(patchPiRuntimeNodeModules(appRoot), false);
});

test("patchPiRuntimeNodeModules patches the vendored runtime workspace", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-workspace-runtime-patches-"));
	const agentLoopPath = join(appRoot, ".feynman", "npm", "node_modules", "@mariozechner", "pi-agent-core", "dist", "agent-loop.js");
	const tuiPath = join(appRoot, ".feynman", "npm", "node_modules", "@mariozechner", "pi-tui", "dist", "tui.js");
	const editorPath = join(appRoot, ".feynman", "npm", "node_modules", "@mariozechner", "pi-tui", "dist", "components", "editor.js");
	const themePath = join(appRoot, ".feynman", "npm", "node_modules", "@mariozechner", "pi-coding-agent", "dist", "modes", "interactive", "theme", "theme.js");
	const packageJsonPath = join(appRoot, ".feynman", "npm", "node_modules", "@mariozechner", "pi-coding-agent", "package.json");
	const webAccessPath = join(appRoot, ".feynman", "npm", "node_modules", "pi-web-access", "index.ts");
	const subagentSpawnPath = join(appRoot, ".feynman", "npm", "node_modules", "pi-subagents", "src", "runs", "shared", "pi-spawn.ts");
	const piOtelConfigPath = join(appRoot, ".feynman", "npm", "node_modules", "pi-otel", "dist", "config.js");
	const sessionSearchPath = join(appRoot, ".feynman", "npm", "node_modules", "@kaiserlich-dev", "pi-session-search", "extensions", "indexer.ts");
	await mkdir(dirname(agentLoopPath), { recursive: true });
	await mkdir(dirname(tuiPath), { recursive: true });
	await mkdir(dirname(editorPath), { recursive: true });
	await mkdir(dirname(themePath), { recursive: true });
	await mkdir(dirname(packageJsonPath), { recursive: true });
	await mkdir(dirname(webAccessPath), { recursive: true });
	await mkdir(dirname(subagentSpawnPath), { recursive: true });
	await mkdir(dirname(piOtelConfigPath), { recursive: true });
	await mkdir(dirname(sessionSearchPath), { recursive: true });
	writeFileSync(agentLoopPath, SOURCE, "utf8");
	writeFileSync(tuiPath, TUI_SOURCE, "utf8");
	writeFileSync(editorPath, EDITOR_SOURCE, "utf8");
	writeFileSync(themePath, THEME_SOURCE, "utf8");
	writeFileSync(
		packageJsonPath,
		JSON.stringify({ name: "@mariozechner/pi-coding-agent", piConfig: { configDir: ".pi" } }, null, 2) + "\n",
		"utf8",
	);
	writeFileSync(webAccessPath, WEB_ACCESS_INDEX_SOURCE, "utf8");
	writeFileSync(subagentSpawnPath, SUBAGENT_PI_SPAWN_SOURCE, "utf8");
	writeFileSync(piOtelConfigPath, PI_OTEL_CONFIG_SOURCE, "utf8");
	writeFileSync(sessionSearchPath, SESSION_SEARCH_INDEXER_SOURCE, "utf8");

	assert.equal(patchPiRuntimeNodeModules(appRoot), true);

	assert.match(readFileSync(agentLoopPath, "utf8"), /function normalizeFeynmanToolAlias/);
	assert.match(readFileSync(tuiPath, "utf8"), /line = sliceByColumn\(line, 0, width, true\)/);
	assert.match(readFileSync(editorPath, "utf8"), /displayText = styleInput\(before\) \+ marker \+ styleInput\(after\)/);
	assert.match(readFileSync(themePath, "utf8"), /input: \(text\) => theme\.fg\("text", text\)/);
	const patchedPackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { piConfig?: Record<string, unknown> };
	assert.equal(patchedPackageJson.piConfig?.name, "feynman");
	assert.equal(patchedPackageJson.piConfig?.configDir, ".feynman");
	assert.match(readFileSync(webAccessPath, "utf8"), /params\.workflow \?\? configWorkflow \?\? "none"/);
	assert.match(readFileSync(webAccessPath, "utf8"), /pi\.registerCommand\("web-results"/);
	assert.match(readFileSync(subagentSpawnPath, "utf8"), /process\.env\.FEYNMAN_PI_CLI_PATH/);
	assert.match(readFileSync(subagentSpawnPath, "utf8"), /\targv2\?: string;/);
	assert.match(readFileSync(subagentSpawnPath, "utf8"), /path\.basename\(argvPath\) !== "pi-cli-wrapper\.js"/);
	assert.match(readFileSync(piOtelConfigPath, "utf8"), /process\.env\.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT \?\?/);
	assert.match(readFileSync(piOtelConfigPath, "utf8"), /process\.env\.OTEL_EXPORTER_OTLP_TRACES_HEADERS/);
	assert.match(readFileSync(sessionSearchPath, "utf8"), /process\.env\.FEYNMAN_SESSION_DIR/);
	assert.equal(patchPiRuntimeNodeModules(appRoot), false);
});

test("patchPiRuntimeNodeModules patches Feynman user and Pi agent package roots", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-user-runtime-patches-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-user-runtime-home-"));
	const agentDir = join(homeRoot, ".feynman", "agent");
	const globalSpawnPath = join(
		homeRoot,
		".feynman",
		"npm-global",
		"lib",
		"node_modules",
		"pi-subagents",
		"src",
		"runs",
		"shared",
		"pi-spawn.ts",
	);
	const agentSpawnPath = join(
		agentDir,
		"npm",
		"node_modules",
		"pi-subagents",
		"src",
		"runs",
		"shared",
		"pi-spawn.ts",
	);
	const globalOtelConfigPath = join(
		homeRoot,
		".feynman",
		"npm-global",
		"lib",
		"node_modules",
		"pi-otel",
		"dist",
		"config.js",
	);
	const agentOtelConfigPath = join(agentDir, "npm", "node_modules", "pi-otel", "dist", "config.js");
	const globalSessionSearchPath = join(
		homeRoot,
		".feynman",
		"npm-global",
		"lib",
		"node_modules",
		"@kaiserlich-dev",
		"pi-session-search",
		"extensions",
		"indexer.ts",
	);
	const agentSessionSearchPath = join(
		agentDir,
		"npm",
		"node_modules",
		"@kaiserlich-dev",
		"pi-session-search",
		"extensions",
		"indexer.ts",
	);
	await mkdir(dirname(globalSpawnPath), { recursive: true });
	await mkdir(dirname(agentSpawnPath), { recursive: true });
	await mkdir(dirname(globalOtelConfigPath), { recursive: true });
	await mkdir(dirname(agentOtelConfigPath), { recursive: true });
	await mkdir(dirname(globalSessionSearchPath), { recursive: true });
	await mkdir(dirname(agentSessionSearchPath), { recursive: true });
	writeFileSync(globalSpawnPath, SUBAGENT_PI_SPAWN_SOURCE, "utf8");
	writeFileSync(agentSpawnPath, SUBAGENT_PI_SPAWN_SOURCE, "utf8");
	writeFileSync(globalOtelConfigPath, PI_OTEL_CONFIG_SOURCE, "utf8");
	writeFileSync(agentOtelConfigPath, PI_OTEL_CONFIG_SOURCE, "utf8");
	writeFileSync(globalSessionSearchPath, SESSION_SEARCH_INDEXER_SOURCE, "utf8");
	writeFileSync(agentSessionSearchPath, SESSION_SEARCH_INDEXER_SOURCE, "utf8");

	assert.equal(patchPiRuntimeNodeModules(appRoot, agentDir), true);

	for (const spawnPath of [globalSpawnPath, agentSpawnPath]) {
		const source = readFileSync(spawnPath, "utf8");
		assert.match(source, /process\.env\.FEYNMAN_PI_CLI_PATH/);
		assert.match(source, /\targv2\?: string;/);
		assert.match(source, /wrapperPiCliPath/);
	}
	for (const configPath of [globalOtelConfigPath, agentOtelConfigPath]) {
		const source = readFileSync(configPath, "utf8");
		assert.match(source, /process\.env\.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT \?\?/);
		assert.match(source, /process\.env\.OTEL_EXPORTER_OTLP_TRACES_HEADERS/);
	}
	for (const indexerPath of [globalSessionSearchPath, agentSessionSearchPath]) {
		const source = readFileSync(indexerPath, "utf8");
		assert.match(source, /process\.env\.FEYNMAN_SESSION_DIR/);
		assert.match(source, /process\.env\.PI_SESSION_DIR/);
	}
	assert.equal(patchPiRuntimeNodeModules(appRoot, agentDir), false);
});

test("patchPiRuntimeNodeModules is a no-op when Pi agent-core is absent", () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-runtime-patches-missing-"));

	assert.equal(patchPiRuntimeNodeModules(appRoot), false);
});
