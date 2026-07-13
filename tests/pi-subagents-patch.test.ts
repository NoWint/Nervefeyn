import test from "node:test";
import assert from "node:assert/strict";

import { PI_SUBAGENTS_PATCH_TARGETS, patchPiSubagentsSource, stripPiSubagentBuiltinModelSource } from "../scripts/lib/pi-subagents-patch.mjs";

function assertUserDirLoadsHaveDeclaration(source: string): void {
	for (const chunk of source.split(/\n(?=export function |function )/)) {
		if (!/load(?:Agents|Chains)FromDir\(userDir, "user"\)/.test(chunk)) continue;
		assert.match(chunk, /\bconst userDir\b/);
	}
}

const CASES = [
	{
		name: "index.ts config path",
		file: "index.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const configPath = path.join(os.homedir(), ".pi", "agent", "extensions", "subagent", "config.json");',
			"",
		].join("\n"),
		original: 'const configPath = path.join(os.homedir(), ".pi", "agent", "extensions", "subagent", "config.json");',
		expected: 'const configPath = path.join(resolvePiAgentDir(), "extensions", "subagent", "config.json");',
	},
	{
		name: "agents.ts user agents dir",
		file: "agents.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const userDir = path.join(os.homedir(), ".pi", "agent", "agents");',
			"",
		].join("\n"),
		original: 'const userDir = path.join(os.homedir(), ".pi", "agent", "agents");',
		expected: 'const userDir = path.join(resolvePiAgentDir(), "agents");',
	},
	{
		name: "artifacts.ts sessions dir",
		file: "artifacts.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const sessionsBase = path.join(os.homedir(), ".pi", "agent", "sessions");',
			"",
		].join("\n"),
		original: 'const sessionsBase = path.join(os.homedir(), ".pi", "agent", "sessions");',
		expected: 'const sessionsBase = path.join(resolvePiAgentDir(), "sessions");',
	},
	{
		name: "run-history.ts history file",
		file: "run-history.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const HISTORY_PATH = path.join(os.homedir(), ".pi", "agent", "run-history.jsonl");',
			"",
		].join("\n"),
		original: 'const HISTORY_PATH = path.join(os.homedir(), ".pi", "agent", "run-history.jsonl");',
		expected: 'const HISTORY_PATH = path.join(resolvePiAgentDir(), "run-history.jsonl");',
	},
	{
		name: "skills.ts agent dir",
		file: "skills.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const AGENT_DIR = path.join(os.homedir(), ".pi", "agent");',
			"",
		].join("\n"),
		original: 'const AGENT_DIR = path.join(os.homedir(), ".pi", "agent");',
		expected: "const AGENT_DIR = resolvePiAgentDir();",
	},
	{
		name: "chain-clarify.ts chain save dir",
		file: "chain-clarify.ts",
		input: [
			'import * as os from "node:os";',
			'import * as path from "node:path";',
			'const dir = path.join(os.homedir(), ".pi", "agent", "agents");',
			"",
		].join("\n"),
		original: 'const dir = path.join(os.homedir(), ".pi", "agent", "agents");',
		expected: 'const dir = path.join(resolvePiAgentDir(), "agents");',
	},
];

for (const scenario of CASES) {
	test(`patchPiSubagentsSource rewrites ${scenario.name}`, () => {
		const patched = patchPiSubagentsSource(scenario.file, scenario.input);

		assert.match(patched, /function resolvePiAgentDir\(\): string \{/);
		assert.match(patched, /process\.env\.FEYNMAN_CODING_AGENT_DIR\?\.trim\(\) \|\| process\.env\.PI_CODING_AGENT_DIR\?\.trim\(\)/);
		assert.ok(patched.includes(scenario.expected));
		assert.ok(!patched.includes(scenario.original));
	});
}

test("PI_SUBAGENTS_PATCH_TARGETS covers current pi-subagents source paths", () => {
	assert.deepEqual(
		[
			"src/extension/index.ts",
			"src/agents/agents.ts",
			"src/shared/artifacts.ts",
			"src/runs/shared/run-history.ts",
			"src/agents/skills.ts",
			"src/runs/foreground/chain-clarify.ts",
			"src/runs/shared/pi-spawn.ts",
			"src/runs/foreground/subagent-executor.ts",
			"src/extension/schemas.ts",
		].filter((entry) => !PI_SUBAGENTS_PATCH_TARGETS.includes(entry)),
		[],
	);
});

test("patchPiSubagentsSource rewrites current src paths", () => {
	const input = [
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		'const configPath = path.join(os.homedir(), ".pi", "agent", "extensions", "subagent", "config.json");',
		"",
	].join("\n");

	const patched = patchPiSubagentsSource("src/extension/index.ts", input);

	assert.match(patched, /function resolvePiAgentDir\(\): string \{/);
	assert.match(patched, /path\.join\(resolvePiAgentDir\(\), "extensions", "subagent", "config\.json"\)/);
});

test("patchPiSubagentsSource is idempotent", () => {
	const input = [
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		'const configPath = path.join(os.homedir(), ".pi", "agent", "extensions", "subagent", "config.json");',
		"",
	].join("\n");

	const once = patchPiSubagentsSource("index.ts", input);
	const twice = patchPiSubagentsSource("index.ts", once);

	assert.equal(twice, once);
});

test("patchPiSubagentsSource rewrites old agents.ts discovery paths transactionally", () => {
	const input = [
		'import * as fs from "node:fs";',
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		'export function discoverAgents(cwd: string, scope: AgentScope): AgentDiscoveryResult {',
		'\tconst userDirOld = path.join(os.homedir(), ".pi", "agent", "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst userAgentsOld = scope === "project" ? [] : loadAgentsFromDir(userDirOld, "user");',
		'\tconst userAgentsNew = scope === "project" ? [] : loadAgentsFromDir(userDirNew, "user");',
		'\tconst userAgents = [...userAgentsOld, ...userAgentsNew];',
		'}',
		'export function discoverAgentsAll(cwd: string) {',
		'\tconst userDirOld = path.join(os.homedir(), ".pi", "agent", "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst user = [',
		'\t\t...loadAgentsFromDir(userDirOld, "user"),',
		'\t\t...loadAgentsFromDir(userDirNew, "user"),',
		'\t];',
		'\tconst chains = [',
		'\t\t...loadChainsFromDir(userDirOld, "user"),',
		'\t\t...loadChainsFromDir(userDirNew, "user"),',
		'\t\t...(projectDir ? loadChainsFromDir(projectDir, "project") : []),',
		'\t];',
		'\tconst userDir = fs.existsSync(userDirNew) ? userDirNew : userDirOld;',
		'}',
	].join("\n");

	const patched = patchPiSubagentsSource("agents.ts", input);

	assert.match(patched, /function resolvePiAgentDir\(\): string \{/);
	assert.match(patched, /const userDir = path\.join\(resolvePiAgentDir\(\), "agents"\);/);
	assert.match(patched, /const userAgents = scope === "project" \? \[\] : loadAgentsFromDir\(userDir, "user"\);/);
	assert.equal((patched.match(/\bconst userDir\b/g) ?? []).length, 2);
	assertUserDirLoadsHaveDeclaration(patched);
	assert.ok(!patched.includes('loadAgentsFromDir(userDirOld, "user")'));
	assert.ok(!patched.includes('loadChainsFromDir(userDirNew, "user")'));
	assert.ok(!patched.includes('fs.existsSync(userDirNew) ? userDirNew : userDirOld'));
});

test("patchPiSubagentsSource leaves current getAgentDir agents.ts discovery paths native", () => {
	const input = [
		'import * as fs from "node:fs";',
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		'import { getAgentDir } from "../shared/utils.ts";',
		'export function discoverAgents(cwd: string, scope: AgentScope): AgentDiscoveryResult {',
		'\tconst userDirOld = path.join(getAgentDir(), "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst userAgentsOld = scope === "project" ? [] : loadAgentsFromDir(userDirOld, "user");',
		'\tconst userAgentsNew = scope === "project" ? [] : loadAgentsFromDir(userDirNew, "user");',
		'\tconst userAgents = [...userAgentsOld, ...userAgentsNew];',
		'}',
		'export function discoverAgentsAll(cwd: string) {',
		'\tconst userDirOld = path.join(getAgentDir(), "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst user = [',
		'\t\t...loadAgentsFromDir(userDirOld, "user"),',
		'\t\t...loadAgentsFromDir(userDirNew, "user"),',
		'\t];',
		'\tconst userDir = process.env.PI_CODING_AGENT_DIR ? userDirOld : fs.existsSync(userDirNew) ? userDirNew : userDirOld;',
		'\treturn { userDir };',
		'}',
	].join("\n");

	const patched = patchPiSubagentsSource("agents.ts", input);

	assert.equal(patched, input);
	assert.doesNotMatch(patched, /resolvePiAgentDir/);
	assertUserDirLoadsHaveDeclaration(patched);
});

test("patchPiSubagentsSource repairs current half-patched agents.ts userDir loads", () => {
	const input = [
		'import * as fs from "node:fs";',
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		'import { getAgentDir } from "../shared/utils.ts";',
		'export function discoverAgents(cwd: string, scope: AgentScope): AgentDiscoveryResult {',
		'\tconst userDirOld = path.join(getAgentDir(), "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst userAgents = scope === "project" ? [] : loadAgentsFromDir(userDir, "user");',
		'}',
		'export function discoverAgentsAll(cwd: string) {',
		'\tconst userDirOld = path.join(getAgentDir(), "agents");',
		'\tconst userDirNew = path.join(os.homedir(), ".agents");',
		'\tconst user = loadAgentsFromDir(userDir, "user");',
		'\tconst userDir = process.env.PI_CODING_AGENT_DIR ? userDirOld : fs.existsSync(userDirNew) ? userDirNew : userDirOld;',
		'\treturn { userDir };',
		'}',
	].join("\n");

	const patched = patchPiSubagentsSource("src/agents/agents.ts", input);

	assert.match(patched, /const userAgentsOld = scope === "project" \? \[\] : loadAgentsFromDir\(userDirOld, "user"\);/);
	assert.match(patched, /const userAgentsNew = scope === "project" \? \[\] : loadAgentsFromDir\(userDirNew, "user"\);/);
	assert.match(patched, /const user = \[\n\t\t\.\.\.loadAgentsFromDir\(userDirOld, "user"\),\n\t\t\.\.\.loadAgentsFromDir\(userDirNew, "user"\),\n\t\];/);
	assert.doesNotMatch(patched, /resolvePiAgentDir/);
	assertUserDirLoadsHaveDeclaration(patched);
});

test("patchPiSubagentsSource preserves output on top-level parallel tasks", () => {
	const input = [
		"interface TaskParam {",
		"\tagent: string;",
		"\ttask: string;",
		"\tcwd?: string;",
		"\tcount?: number;",
		"\tmodel?: string;",
		"\tskill?: string | string[] | boolean;",
		"}",
		"function run(params: { tasks: TaskParam[] }) {",
		"\tconst modelOverrides = params.tasks.map(() => undefined);",
		"\tconst skillOverrides = params.tasks.map(() => undefined);",
		"\tconst parallelTasks = params.tasks.map((task, index) => ({",
		"\t\tagent: task.agent,",
		"\t\ttask: params.context === \"fork\" ? wrapForkTask(task.task) : task.task,",
		"\t\tcwd: task.cwd,",
		"\t\t...(modelOverrides[index] ? { model: modelOverrides[index] } : {}),",
		"\t\t...(skillOverrides[index] !== undefined ? { skill: skillOverrides[index] } : {}),",
		"\t}));",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("subagent-executor.ts", input);

	assert.match(patched, /output\?: string \| false;/);
	assert.match(patched, /\n\t\toutput: task\.output,/);
	assert.doesNotMatch(patched, /resolvePiAgentDir/);
});

test("patchPiSubagentsSource preserves output in async parallel task handoff", () => {
	const input = [
		"interface TaskParam {",
		"\tagent: string;",
		"\ttask: string;",
		"\tcwd?: string;",
		"\tcount?: number;",
		"\tmodel?: string;",
		"\tskill?: string | string[] | boolean;",
		"}",
		"function run(tasks: TaskParam[]) {",
		"\tconst modelOverrides = tasks.map(() => undefined);",
		"\tconst skillOverrides = tasks.map(() => undefined);",
		"\tconst parallelTasks = tasks.map((t, i) => ({",
		"\t\tagent: t.agent,",
		"\t\ttask: params.context === \"fork\" ? wrapForkTask(taskTexts[i]!) : taskTexts[i]!,",
		"\t\tcwd: t.cwd,",
		"\t\t...(modelOverrides[i] ? { model: modelOverrides[i] } : {}),",
		"\t\t...(skillOverrides[i] !== undefined ? { skill: skillOverrides[i] } : {}),",
		"\t}));",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("subagent-executor.ts", input);

	assert.match(patched, /output\?: string \| false;/);
	assert.match(patched, /\n\t\toutput: t\.output,/);
});

test("patchPiSubagentsSource uses task output when resolving foreground parallel behavior", () => {
	const input = [
		"interface TaskParam {",
		"\tagent: string;",
		"\ttask: string;",
		"\tcwd?: string;",
		"\tcount?: number;",
		"\tmodel?: string;",
		"\tskill?: string | string[] | boolean;",
		"}",
		"async function run(tasks: TaskParam[]) {",
		"\tconst skillOverrides = tasks.map((t) => normalizeSkillInput(t.skill));",
		"\tif (params.clarify === true && ctx.hasUI) {",
		"\t\tconst behaviors = agentConfigs.map((c, i) =>",
		"\t\t\tresolveStepBehavior(c, { skills: skillOverrides[i] }),",
		"\t\t);",
		"\t}",
		"\tconst behaviors = agentConfigs.map((config) => resolveStepBehavior(config, {}));",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("subagent-executor.ts", input);

	assert.match(patched, /output\?: string \| false;/);
	assert.match(patched, /resolveStepBehavior\(c, \{ output: tasks\[i\]\?\.output, skills: skillOverrides\[i\] \}\)/);
	assert.match(patched, /resolveStepBehavior\(config, \{ output: tasks\[i\]\?\.output, skills: skillOverrides\[i\] \}\)/);
	assert.doesNotMatch(patched, /resolveStepBehavior\(config, \{\}\)/);
});

test("patchPiSubagentsSource passes foreground parallel output paths into runSync", () => {
	const input = [
		"interface TaskParam {",
		"\tagent: string;",
		"\ttask: string;",
		"\tcwd?: string;",
		"\tcount?: number;",
		"\tmodel?: string;",
		"\tskill?: string | string[] | boolean;",
		"}",
		"async function runForegroundParallelTasks(input: ForegroundParallelRunInput): Promise<SingleResult[]> {",
		"\treturn mapConcurrent(input.tasks, input.concurrencyLimit, async (task, index) => {",
		"\t\tconst overrideSkills = input.skillOverrides[index];",
		"\t\tconst effectiveSkills = overrideSkills === undefined ? input.behaviors[index]?.skills : overrideSkills;",
		"\t\tconst taskCwd = resolveParallelTaskCwd(task, input.paramsCwd, input.worktreeSetup, index);",
		"\t\treturn runSync(input.ctx.cwd, input.agents, task.agent, input.taskTexts[index]!, {",
		"\t\t\tcwd: taskCwd,",
		"\t\t\tsignal: input.signal,",
		"\t\t\tmaxOutput: input.maxOutput,",
		"\t\t\tmaxSubagentDepth: input.maxSubagentDepths[index],",
		"\t\t});",
		"\t});",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("subagent-executor.ts", input);

	assert.match(patched, /output\?: string \| false;/);
	assert.match(patched, /const outputPath = typeof input\.behaviors\[index\]\?\.output === "string"/);
	assert.match(patched, /const taskText = injectSingleOutputInstruction\(input\.taskTexts\[index\]!, outputPath\)/);
	assert.match(patched, /runSync\(input\.ctx\.cwd, input\.agents, task\.agent, taskText, \{/);
	assert.match(patched, /\n\t\t\toutputPath,/);
});

test("patchPiSubagentsSource documents output in top-level task schema", () => {
	const input = [
		"export const TaskItem = Type.Object({ ",
		"\tagent: Type.String(), ",
		"\ttask: Type.String(), ",
		"\tcwd: Type.Optional(Type.String()),",
		"\tcount: Type.Optional(Type.Integer({ minimum: 1, description: \"Repeat this parallel task N times with the same settings.\" })),",
		"\tmodel: Type.Optional(Type.String({ description: \"Override model for this task (e.g. 'openai/gpt-5')\" })),",
		"\tskill: Type.Optional(SkillOverride),",
		"});",
		"export const SubagentParams = Type.Object({",
		"\ttasks: Type.Optional(Type.Array(TaskItem, { description: \"PARALLEL mode: [{agent, task, count?}, ...]\" })),",
		"});",
	].join("\n");

	const patched = patchPiSubagentsSource("schemas.ts", input);

	assert.match(patched, /output: Type\.Optional\(Type\.Any/);
	assert.match(patched, /count\?, output\?/);
	assert.doesNotMatch(patched, /resolvePiAgentDir/);
});

test("patchPiSubagentsSource documents output in top-level parallel help", () => {
	const input = [
		'import * as os from "node:os";',
		'import * as path from "node:path";',
		"const help = `",
		"• PARALLEL: { tasks: [{agent,task,count?}, ...], concurrency?: number, worktree?: true } - concurrent execution (worktree: isolate each task in a git worktree)",
		"`;",
	].join("\n");

	const patched = patchPiSubagentsSource("index.ts", input);

	assert.match(patched, /output\?/);
	assert.match(patched, /per-task file target/);
	assert.doesNotMatch(patched, /function resolvePiAgentDir/);
});

test("patchPiSubagentsSource makes pi-spawn prefer the real Pi CLI over Feynman wrapper", () => {
	const input = [
		"export interface PiSpawnDeps {",
		"\texecPath?: string;",
		"\targv1?: string;",
		"}",
		"export function resolveWindowsPiCliScript(deps: PiSpawnDeps = {}): string | undefined {",
		"\tconst existsSync = deps.existsSync ?? fs.existsSync;",
		'\tconst readFileSync = deps.readFileSync ?? ((filePath, encoding) => fs.readFileSync(filePath, encoding));',
		"\tconst argv1 = deps.argv1 ?? process.argv[1];",
		"",
		"\tif (argv1) {",
		"\t\tconst argvPath = normalizePath(argv1);",
		"\t\tif (isRunnableNodeScript(argvPath, existsSync)) {",
		"\t\t\treturn argvPath;",
		"\t\t}",
		"\t}",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("src/runs/shared/pi-spawn.ts", input);

	assert.match(patched, /process\.env\.FEYNMAN_PI_CLI_PATH/);
	assert.match(patched, /\targv2\?: string;/);
	assert.match(patched, /path\.basename\(argvPath\) !== "pi-cli-wrapper\.js"/);
	assert.match(patched, /const argv2 = deps\.argv2 \?\? process\.argv\[2\]/);
	assert.match(patched, /path\.join\(path\.dirname\(normalizePath\(argv2\)\), "cli\.js"\)/);
	assert.doesNotMatch(patched, /resolvePiAgentDir/);
});

test("patchPiSubagentsSource upgrades old Feynman pi-spawn patch to derive cli.js from wrapper main arg", () => {
	const input = [
		"export interface PiSpawnDeps {",
		"\texecPath?: string;",
		"\targv1?: string;",
		"}",
		"export function resolveWindowsPiCliScript(deps: PiSpawnDeps = {}): string | undefined {",
		"\tconst existsSync = deps.existsSync ?? fs.existsSync;",
		'\tconst readFileSync = deps.readFileSync ?? ((filePath, encoding) => fs.readFileSync(filePath, encoding));',
		"\tconst argv1 = deps.argv1 ?? process.argv[1];",
		"\tconst feynmanPiCliPath = process.env.FEYNMAN_PI_CLI_PATH;",
		"\tif (feynmanPiCliPath) {",
		"\t\tconst cliPath = normalizePath(feynmanPiCliPath);",
		"\t\tif (isRunnableNodeScript(cliPath, existsSync)) return cliPath;",
		"\t}",
		"",
		"\tif (argv1) {",
		"\t\tconst argvPath = normalizePath(argv1);",
		'\t\tif (path.basename(argvPath) !== "pi-cli-wrapper.js" && isRunnableNodeScript(argvPath, existsSync)) {',
		"\t\t\treturn argvPath;",
		"\t\t}",
		"\t}",
		"}",
	].join("\n");

	const patched = patchPiSubagentsSource("src/runs/shared/pi-spawn.ts", input);

	assert.match(patched, /\targv2\?: string;/);
	assert.match(patched, /const argv2 = deps\.argv2 \?\? process\.argv\[2\]/);
	assert.match(patched, /path\.basename\(argvPath\) === "pi-cli-wrapper\.js" && argv2/);
	assert.match(patched, /path\.join\(path\.dirname\(normalizePath\(argv2\)\), "cli\.js"\)/);
});

test("stripPiSubagentBuiltinModelSource removes built-in model pins", () => {
	const input = [
		"---",
		"name: researcher",
		"description: Web researcher",
		"model: anthropic/claude-sonnet-4-6",
		"tools: read, web_search",
		"---",
		"",
		"Body",
	].join("\n");

	const patched = stripPiSubagentBuiltinModelSource(input);

	assert.ok(!patched.includes("model: anthropic/claude-sonnet-4-6"));
	assert.match(patched, /name: researcher/);
	assert.match(patched, /tools: read, web_search/);
});

test("pi-spawn patch is idempotent including the SpawnDeps argv2 member", () => {
	const input = [
		"interface SpawnDeps {",
		"\texecPath?: string;",
		"\targv1?: string;",
		"\texistsSync?: (filePath: string) => boolean;",
		"}",
		"",
		"\tconst argv1 = deps.argv1 ?? process.argv[1];",
		"",
		"\tif (argv1) {",
		"\t\tconst argvPath = normalizePath(argv1);",
		"\t\tif (isRunnableNodeScript(argvPath, existsSync)) {",
		"\t\t\treturn argvPath;",
		"\t\t}",
		"\t}",
		"",
	].join("\n");

	const once = patchPiSubagentsSource("src/runs/shared/pi-spawn.ts", input);
	const twice = patchPiSubagentsSource("src/runs/shared/pi-spawn.ts", once);

	assert.equal(twice, once);
	assert.equal((once.match(/argv2\?: string;/g) ?? []).length, 1);
	assert.match(once, /wrapperPiCliPath/);
});
