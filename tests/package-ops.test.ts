import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
	installPackageSources,
	updateConfiguredPackages,
} from "../src/pi/package-ops.js";

function createInstalledGlobalPackage(homeRoot: string, packageName: string, version = "1.0.0"): void {
	const packageDir = resolve(homeRoot, "npm-global", "lib", "node_modules", packageName);
	mkdirSync(packageDir, { recursive: true });
	writeFileSync(
		join(packageDir, "package.json"),
		JSON.stringify({ name: packageName, version }, null, 2) + "\n",
		"utf8",
	);
}

function writeSettings(agentDir: string, settings: Record<string, unknown>): void {
	mkdirSync(agentDir, { recursive: true });
	writeFileSync(resolve(agentDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n", "utf8");
}

function getRootPiRuntimeVersion(): string {
	const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
		dependencies?: Record<string, string>;
	};
	const version = manifest.dependencies?.["@earendil-works/pi-coding-agent"];
	assert.ok(version);
	return version;
}

function writeFakeNpmScript(root: string, body: string): string {
	const scriptPath = resolve(root, "fake-npm.mjs");
	writeFileSync(scriptPath, body, "utf8");
	return scriptPath;
}

const SESSION_SEARCH_UPSTREAM_INDEXER = `
export async function indexAllSessions() {
    const sessionsDir = path.join(os.homedir(), ".pi", "agent", "sessions");
    const files = findSessionFiles(sessionsDir);
    return files.length;
}
`;

function getSessionSearchIndexerPath(homeRoot: string): string {
	return resolve(homeRoot, "npm-global", "lib", "node_modules", "@kaiserlich-dev", "pi-session-search", "extensions", "indexer.ts");
}

function writeFakeSessionSearchNpmScript(root: string, logPath?: string): string {
	return writeFakeNpmScript(root, [
		`import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";`,
		`import { resolve } from "node:path";`,
		`const args = process.argv.slice(2);`,
		`if (args.length === 2 && args[0] === "root" && args[1] === "-g") {`,
		`  console.log(resolve(${JSON.stringify(root)}, "npm-global", "lib", "node_modules"));`,
		`  process.exit(0);`,
		`}`,
		logPath ? `appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n", "utf8");` : "",
		`const prefixIndex = args.indexOf("--prefix");`,
		`const prefix = prefixIndex >= 0 ? args[prefixIndex + 1] : resolve(${JSON.stringify(root)}, "npm-global");`,
		`const packageRoot = resolve(prefix, "lib", "node_modules", "@kaiserlich-dev", "pi-session-search");`,
		`mkdirSync(resolve(packageRoot, "extensions"), { recursive: true });`,
		`writeFileSync(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@kaiserlich-dev/pi-session-search", version: "1.1.3" }, null, 2) + "\\n", "utf8");`,
		`writeFileSync(resolve(packageRoot, "extensions", "indexer.ts"), ${JSON.stringify(SESSION_SEARCH_UPSTREAM_INDEXER)}, "utf8");`,
		"process.exit(0);",
	].filter(Boolean).join("\n"));
}

test("installPackageSources filters noisy npm chatter but preserves meaningful output", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`console.log("npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead");`,
		'console.log("changed 343 packages in 9s");',
		'console.log("59 packages are looking for funding");',
		'console.log("run `npm fund` for details");',
		'console.error("visible stderr line");',
		'console.log("visible stdout line");',
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	let stdout = "";
	let stderr = "";
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);
	(process.stdout.write as unknown as (chunk: string | Uint8Array) => boolean) = ((chunk: string | Uint8Array) => {
		stdout += chunk.toString();
		return true;
	}) as typeof process.stdout.write;
	(process.stderr.write as unknown as (chunk: string | Uint8Array) => boolean) = ((chunk: string | Uint8Array) => {
		stderr += chunk.toString();
		return true;
	}) as typeof process.stderr.write;

	try {
		const result = await installPackageSources(workingDir, agentDir, ["npm:test-visible-package"]);
		assert.deepEqual(result.installed, ["npm:test-visible-package"]);
		assert.deepEqual(result.skipped, []);
	} finally {
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
	}

	const combined = `${stdout}\n${stderr}`;
	assert.match(combined, /visible stdout line/);
	assert.match(combined, /visible stderr line/);
	assert.doesNotMatch(combined, /node-domexception/);
	assert.doesNotMatch(combined, /changed 343 packages/);
	assert.doesNotMatch(combined, /packages are looking for funding/);
	assert.doesNotMatch(combined, /npm fund/);
});

test("installPackageSources skips native packages on unsupported Node majors before invoking npm", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const markerPath = resolve(root, "npm-invoked.txt");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { writeFileSync } from "node:fs";`,
		`writeFileSync(${JSON.stringify(markerPath)}, "invoked\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	const originalVersion = process.versions.node;
	Object.defineProperty(process.versions, "node", { value: "24.0.0", configurable: true });
	try {
		const result = await installPackageSources(workingDir, agentDir, ["npm:@kaiserlich-dev/pi-session-search"]);
		assert.deepEqual(result.installed, []);
		assert.deepEqual(result.skipped, ["npm:@kaiserlich-dev/pi-session-search"]);
		assert.equal(existsSync(markerPath), false);
	} finally {
		Object.defineProperty(process.versions, "node", { value: originalVersion, configurable: true });
	}
});

test("installPackageSources disables inherited npm dry-run config for child installs", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const markerPath = resolve(root, "install-env-ok.txt");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { writeFileSync } from "node:fs";`,
		`if (process.env.npm_config_dry_run !== "false" || process.env.NPM_CONFIG_DRY_RUN !== "false") process.exit(42);`,
		`writeFileSync(${JSON.stringify(markerPath)}, "ok\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	const originalLower = process.env.npm_config_dry_run;
	const originalUpper = process.env.NPM_CONFIG_DRY_RUN;
	process.env.npm_config_dry_run = "true";
	process.env.NPM_CONFIG_DRY_RUN = "true";
	try {
		const result = await installPackageSources(workingDir, agentDir, ["npm:test-package"]);
		assert.deepEqual(result.installed, ["npm:test-package"]);
		assert.equal(existsSync(markerPath), true);
	} finally {
		if (originalLower === undefined) {
			delete process.env.npm_config_dry_run;
		} else {
			process.env.npm_config_dry_run = originalLower;
		}
		if (originalUpper === undefined) {
			delete process.env.NPM_CONFIG_DRY_RUN;
		} else {
			process.env.NPM_CONFIG_DRY_RUN = originalUpper;
		}
	}
});

test("installPackageSources installs Pi runtime peers beside Pi packages", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { appendFileSync } from "node:fs";`,
		`appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(process.argv.slice(2)) + "\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	const result = await installPackageSources(workingDir, agentDir, ["npm:@luxusai/pi-hindsight"]);

	assert.deepEqual(result.installed, ["npm:@luxusai/pi-hindsight"]);
	const invocations = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]);
	assert.equal(invocations.length, 1);
	const invocation = invocations[0] ?? [];
	assert.ok(invocation.includes("@luxusai/pi-hindsight"));
	assert.ok(invocation.some((entry) => /^@mariozechner\/pi-coding-agent@/.test(entry)));
	assert.ok(invocation.some((entry) => /^@mariozechner\/pi-ai@/.test(entry)));
	assert.ok(invocation.some((entry) => /^@mariozechner\/pi-tui@/.test(entry)));
	assert.ok(invocation.some((entry) => /^@earendil-works\/pi-coding-agent@/.test(entry)));
	assert.ok(invocation.some((entry) => /^@earendil-works\/pi-ai@/.test(entry)));
	assert.ok(invocation.some((entry) => /^@earendil-works\/pi-tui@/.test(entry)));
	assert.ok(invocation.some((entry) => /^typebox@/.test(entry)));
	const piRuntimeVersion = getRootPiRuntimeVersion();
	assert.ok(invocation.includes(`@earendil-works/pi-agent-core@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@earendil-works/pi-ai@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@earendil-works/pi-coding-agent@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@earendil-works/pi-tui@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@mariozechner/pi-agent-core@npm:@earendil-works/pi-agent-core@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@mariozechner/pi-ai@npm:@earendil-works/pi-ai@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@mariozechner/pi-coding-agent@npm:@earendil-works/pi-coding-agent@${piRuntimeVersion}`));
	assert.ok(invocation.includes(`@mariozechner/pi-tui@npm:@earendil-works/pi-tui@${piRuntimeVersion}`));
});

test("installPackageSources derives legacy Pi aliases from current runtime peers", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { appendFileSync } from "node:fs";`,
		`appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(process.argv.slice(2)) + "\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	const appRoot = resolve(import.meta.dirname ?? __dirname, "..");
	const bundledRoot = resolve(appRoot, ".feynman", "npm", "node_modules");
	const legacyPackages = {
		"@mariozechner/pi-agent-core": "@earendil-works/pi-agent-core",
		"@mariozechner/pi-coding-agent": "@earendil-works/pi-coding-agent",
		"@mariozechner/pi-ai": "@earendil-works/pi-ai",
		"@mariozechner/pi-tui": "@earendil-works/pi-tui",
	};

	const createdPaths: string[] = [];
	try {
		for (const [dirName, realName] of Object.entries(legacyPackages)) {
			const packageRoot = resolve(bundledRoot, dirName);
			mkdirSync(packageRoot, { recursive: true });
			createdPaths.push(packageRoot);
			writeFileSync(
				resolve(packageRoot, "package.json"),
				JSON.stringify({ name: realName, version: "0.79.1" }, null, 2) + "\n",
				"utf8",
			);
		}

		const result = await installPackageSources(workingDir, agentDir, ["npm:@luxusai/pi-hindsight"]);

		assert.deepEqual(result.installed, ["npm:@luxusai/pi-hindsight"]);
		const invocation = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[])[0] ?? [];
		const piRuntimeVersion = getRootPiRuntimeVersion();
		assert.ok(invocation.includes(`@mariozechner/pi-agent-core@npm:@earendil-works/pi-agent-core@${piRuntimeVersion}`));
		assert.ok(invocation.includes(`@mariozechner/pi-coding-agent@npm:@earendil-works/pi-coding-agent@${piRuntimeVersion}`));
		assert.ok(invocation.includes(`@mariozechner/pi-ai@npm:@earendil-works/pi-ai@${piRuntimeVersion}`));
		assert.ok(invocation.includes(`@mariozechner/pi-tui@npm:@earendil-works/pi-tui@${piRuntimeVersion}`));
	} finally {
		for (const packageRoot of createdPaths) {
			rmSync(packageRoot, { recursive: true, force: true });
		}
		rmSync(resolve(bundledRoot, "@mariozechner"), { recursive: true, force: true });
	}
});

test("installPackageSources patches installed Pi packages before returning", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeSessionSearchNpmScript(root);
	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
	});

	const originalVersion = process.versions.node;
	Object.defineProperty(process.versions, "node", { value: "22.17.0", configurable: true });
	try {
		const result = await installPackageSources(workingDir, agentDir, ["npm:@kaiserlich-dev/pi-session-search"]);
		assert.deepEqual(result.installed, ["npm:@kaiserlich-dev/pi-session-search"]);
		assert.deepEqual(result.skipped, []);
	} finally {
		Object.defineProperty(process.versions, "node", { value: originalVersion, configurable: true });
	}

	const patched = readFileSync(getSessionSearchIndexerPath(root), "utf8");
	assert.match(patched, /FEYNMAN_SESSION_DIR/);
	assert.doesNotMatch(patched, /const sessionsDir = path\.join\(os\.homedir\(\), "\.pi", "agent", "sessions"\)/);
});

test("updateConfiguredPackages batches multiple npm updates into a single install per scope", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { appendFileSync } from "node:fs";`,
		`import { resolve } from "node:path";`,
		`const args = process.argv.slice(2);`,
		`if (args.length === 2 && args[0] === "root" && args[1] === "-g") {`,
		`  console.log(resolve(${JSON.stringify(root)}, "npm-global", "lib", "node_modules"));`,
		`  process.exit(0);`,
		`}`,
		`if (args.length >= 4 && args[0] === "view" && args[2] === "version" && args[3] === "--json") {`,
		`  console.log(JSON.stringify("2.0.0"));`,
		`  process.exit(0);`,
		`}`,
		`appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
		packages: ["npm:test-one", "npm:test-two"],
	});
	createInstalledGlobalPackage(root, "test-one", "1.0.0");
	createInstalledGlobalPackage(root, "test-two", "1.0.0");

	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () => ({
		ok: true,
		json: async () => ({ version: "2.0.0" }),
	})) as unknown as typeof fetch;

	try {
		const result = await updateConfiguredPackages(workingDir, agentDir);
		assert.deepEqual(result.skipped, []);
		assert.deepEqual(result.updated.sort(), ["npm:test-one", "npm:test-two"]);
	} finally {
		globalThis.fetch = originalFetch;
	}

	const invocations = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]);
	assert.equal(invocations.length, 1);
	assert.ok(invocations[0]?.includes("install"));
	assert.ok(invocations[0]?.includes("test-one@latest"));
	assert.ok(invocations[0]?.includes("test-two@latest"));
});

test("updateConfiguredPackages updates a specific npm package through the npm install path", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { appendFileSync } from "node:fs";`,
		`import { resolve } from "node:path";`,
		`const args = process.argv.slice(2);`,
		`if (args.length === 2 && args[0] === "root" && args[1] === "-g") {`,
		`  console.log(resolve(${JSON.stringify(root)}, "npm-global", "lib", "node_modules"));`,
		`  process.exit(0);`,
		`}`,
		`appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
		packages: ["npm:@samfp/pi-memory"],
	});
	createInstalledGlobalPackage(root, "@samfp/pi-memory", "1.0.0");

	const result = await updateConfiguredPackages(workingDir, agentDir, "npm:@samfp/pi-memory");

	assert.deepEqual(result.skipped, []);
	assert.deepEqual(result.updated, ["npm:@samfp/pi-memory"]);

	const invocations = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]);
	assert.equal(invocations.length, 1);
	assert.ok(invocations[0]?.includes("install"));
	assert.ok(invocations[0]?.includes("--legacy-peer-deps"));
	assert.ok(invocations[0]?.includes("@samfp/pi-memory@latest"));
});

test("updateConfiguredPackages patches updated Pi package roots before returning", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeSessionSearchNpmScript(root, logPath);
	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
		packages: ["npm:@kaiserlich-dev/pi-session-search"],
	});
	createInstalledGlobalPackage(root, "@kaiserlich-dev/pi-session-search", "1.0.0");

	const originalVersion = process.versions.node;
	Object.defineProperty(process.versions, "node", { value: "22.17.0", configurable: true });
	try {
		const result = await updateConfiguredPackages(workingDir, agentDir, "npm:@kaiserlich-dev/pi-session-search");
		assert.deepEqual(result.skipped, []);
		assert.deepEqual(result.updated, ["npm:@kaiserlich-dev/pi-session-search"]);
	} finally {
		Object.defineProperty(process.versions, "node", { value: originalVersion, configurable: true });
	}

	const invocations = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]);
	assert.equal(invocations.length, 1);
	assert.ok(invocations[0]?.includes("@kaiserlich-dev/pi-session-search@latest"));
	const patched = readFileSync(getSessionSearchIndexerPath(root), "utf8");
	assert.match(patched, /FEYNMAN_SESSION_DIR/);
	assert.doesNotMatch(patched, /const sessionsDir = path\.join\(os\.homedir\(\), "\.pi", "agent", "sessions"\)/);
});

test("updateConfiguredPackages skips native package updates on unsupported Node majors", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-package-ops-"));
	const workingDir = resolve(root, "project");
	const agentDir = resolve(root, "agent");
	const logPath = resolve(root, "npm-invocations.jsonl");
	mkdirSync(workingDir, { recursive: true });

	const scriptPath = writeFakeNpmScript(root, [
		`import { appendFileSync } from "node:fs";`,
		`import { resolve } from "node:path";`,
		`const args = process.argv.slice(2);`,
		`if (args.length === 2 && args[0] === "root" && args[1] === "-g") {`,
		`  console.log(resolve(${JSON.stringify(root)}, "npm-global", "lib", "node_modules"));`,
		`  process.exit(0);`,
		`}`,
		`if (args.length >= 4 && args[0] === "view" && args[2] === "version" && args[3] === "--json") {`,
		`  console.log(JSON.stringify("2.0.0"));`,
		`  process.exit(0);`,
		`}`,
		`appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n", "utf8");`,
		"process.exit(0);",
	].join("\n"));

	writeSettings(agentDir, {
		npmCommand: [process.execPath, scriptPath],
		packages: ["npm:@kaiserlich-dev/pi-session-search", "npm:test-regular"],
	});
	createInstalledGlobalPackage(root, "@kaiserlich-dev/pi-session-search", "1.0.0");
	createInstalledGlobalPackage(root, "test-regular", "1.0.0");

	const originalFetch = globalThis.fetch;
	const originalVersion = process.versions.node;
	globalThis.fetch = (async () => ({
		ok: true,
		json: async () => ({ version: "2.0.0" }),
	})) as unknown as typeof fetch;
	Object.defineProperty(process.versions, "node", { value: "24.0.0", configurable: true });

	try {
		const result = await updateConfiguredPackages(workingDir, agentDir);
		assert.deepEqual(result.updated, ["npm:test-regular"]);
		assert.deepEqual(result.skipped, ["npm:@kaiserlich-dev/pi-session-search"]);
	} finally {
		globalThis.fetch = originalFetch;
		Object.defineProperty(process.versions, "node", { value: originalVersion, configurable: true });
	}

	const invocations = existsSync(logPath)
		? readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as string[])
		: [];
	assert.equal(invocations.length, 1);
	assert.ok(invocations[0]?.includes("test-regular@latest"));
	assert.ok(!invocations[0]?.some((entry) => entry.includes("pi-session-search")));
});
