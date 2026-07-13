import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
	getMissingConfiguredPackages,
	resolveAdjacentNpmCommand,
	seedBundledWorkspacePackages,
} from "../src/pi/package-ops.js";

function createBundledWorkspace(
	appRoot: string,
	packageNames: string[],
	dependenciesByPackage: Record<string, Record<string, string>> = {},
): void {
	for (const packageName of packageNames) {
		const packageDir = resolve(appRoot, ".feynman", "npm", "node_modules", packageName);
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(
			join(packageDir, "package.json"),
			JSON.stringify({ name: packageName, version: "1.0.0", dependencies: dependenciesByPackage[packageName] }, null, 2) + "\n",
			"utf8",
		);
	}
}

function writeSettings(agentDir: string, settings: Record<string, unknown>): void {
	mkdirSync(agentDir, { recursive: true });
	writeFileSync(resolve(agentDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n", "utf8");
}

test("Pi runtime fallback version follows the bundled Pi runtime version", async () => {
	const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string> };
	const version = manifest.dependencies?.["@earendil-works/pi-coding-agent"];
	assert.match(version ?? "", /^\d+\.\d+\.\d+$/);
	const packageOpsSource = readFileSync(resolve(process.cwd(), "src", "pi", "package-ops.ts"), "utf8");
	const runtimeWorkspaceSource = readFileSync(resolve(process.cwd(), "scripts", "prepare-runtime-workspace.mjs"), "utf8");

	assert.match(packageOpsSource, new RegExp(`PI_RUNTIME_FALLBACK_VERSION = "${version}"`));
	assert.match(runtimeWorkspaceSource, new RegExp(`PI_RUNTIME_FALLBACK_VERSION = "${version}"`));
});

test("prepare runtime workspace hash tracks every imported patch file", async () => {
	const runtimeWorkspaceSource = readFileSync(resolve(process.cwd(), "scripts", "prepare-runtime-workspace.mjs"), "utf8");
	const importedPatchFiles = [...runtimeWorkspaceSource.matchAll(/from "\.\/lib\/([^"]+\.mjs)"/g)].map((match) => match[1]);
	const hashedPatchFiles = [...runtimeWorkspaceSource.matchAll(/resolve\(appRoot, "scripts", "lib", "([^"]+\.mjs)"\)/g)].map((match) => match[1]);

	assert.match(runtimeWorkspaceSource, /resolve\(appRoot, "scripts", "prepare-runtime-workspace\.mjs"\)/);
	assert.ok(importedPatchFiles.length > 0);
	for (const patchFile of importedPatchFiles) {
		assert.ok(hashedPatchFiles.includes(patchFile), `${patchFile} must be included in the runtime input hash`);
	}
	for (const patchFile of hashedPatchFiles) {
		assert.equal(existsSync(resolve(process.cwd(), "scripts", "lib", patchFile)), true, `${patchFile} must exist`);
	}
});

test("prepare runtime workspace pins audited transitive runtime overrides", async () => {
	const runtimeWorkspaceSource = readFileSync(resolve(process.cwd(), "scripts", "prepare-runtime-workspace.mjs"), "utf8");

	assert.match(runtimeWorkspaceSource, /"@mozilla\/readability": "0\.6\.0"/);
	assert.match(runtimeWorkspaceSource, /"@opentelemetry\/sdk-node": "0\.219\.0"/);
	assert.match(runtimeWorkspaceSource, /"@opentelemetry\/resources": "2\.8\.0"/);
	assert.match(runtimeWorkspaceSource, /overrides: RUNTIME_PACKAGE_OVERRIDES/);
});

test("prepare runtime workspace links legacy Pi aliases instead of installing duplicates", async () => {
	const runtimeWorkspaceSource = readFileSync(resolve(process.cwd(), "scripts", "prepare-runtime-workspace.mjs"), "utf8");

	assert.match(runtimeWorkspaceSource, /function linkLegacyPiRuntimeAliases/);
	assert.match(runtimeWorkspaceSource, /symlinkSync\(relative\(dirname\(linkPath\), targetPath\), linkPath/);
	assert.doesNotMatch(runtimeWorkspaceSource, /packageSpecs\.push\(`\$\{legacyName\}@npm:/);
});

test("resolveAdjacentNpmCommand uses npm-cli.js on Windows when it is bundled beside Node", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-windows-npm-"));
	const nodePath = resolve(root, "node.exe");
	const npmCliPath = resolve(root, "node_modules", "npm", "bin", "npm-cli.js");
	mkdirSync(resolve(root, "node_modules", "npm", "bin"), { recursive: true });
	writeFileSync(nodePath, "", "utf8");
	writeFileSync(npmCliPath, "", "utf8");
	writeFileSync(resolve(root, "npm.cmd"), "", "utf8");

	assert.deepEqual(resolveAdjacentNpmCommand(nodePath, "win32"), {
		command: nodePath,
		args: [npmCliPath],
	});
});

test("resolveAdjacentNpmCommand falls back to npm.cmd with a shell on Windows", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-windows-npm-cmd-"));
	const nodePath = resolve(root, "node.exe");
	const npmCmdPath = resolve(root, "npm.cmd");
	writeFileSync(nodePath, "", "utf8");
	writeFileSync(npmCmdPath, "", "utf8");

	assert.deepEqual(resolveAdjacentNpmCommand(nodePath, "win32"), {
		command: npmCmdPath,
		args: [],
		shell: true,
	});
});

test("seedBundledWorkspacePackages links bundled packages into the Feynman npm prefix", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const agentDir = resolve(homeRoot, "agent");
	mkdirSync(agentDir, { recursive: true });

	createBundledWorkspace(appRoot, ["pi-subagents", "@samfp/pi-memory"]);

	const seeded = seedBundledWorkspacePackages(agentDir, appRoot, [
		"npm:pi-subagents",
		"npm:@samfp/pi-memory",
	]);

	assert.deepEqual(seeded.sort(), ["npm:@samfp/pi-memory", "npm:pi-subagents"]);
	const globalRoot = resolve(homeRoot, "npm-global", "lib", "node_modules");
	assert.equal(existsSync(resolve(globalRoot, "pi-subagents", "package.json")), true);
	assert.equal(existsSync(resolve(globalRoot, "@samfp", "pi-memory", "package.json")), true);
});

test("seedBundledWorkspacePackages preserves existing installed packages", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const agentDir = resolve(homeRoot, "agent");
	const existingPackageDir = resolve(homeRoot, "npm-global", "lib", "node_modules", "pi-subagents");

	mkdirSync(agentDir, { recursive: true });
	createBundledWorkspace(appRoot, ["pi-subagents"]);
	mkdirSync(existingPackageDir, { recursive: true });
	writeFileSync(resolve(existingPackageDir, "package.json"), '{"name":"pi-subagents","version":"user"}\n', "utf8");

	const seeded = seedBundledWorkspacePackages(agentDir, appRoot, ["npm:pi-subagents"]);

	assert.deepEqual(seeded, []);
	assert.equal(readFileSync(resolve(existingPackageDir, "package.json"), "utf8"), '{"name":"pi-subagents","version":"user"}\n');
	assert.equal(lstatSync(existingPackageDir).isSymbolicLink(), false);
});

test("seedBundledWorkspacePackages treats copied bundled packages as satisfied", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const agentDir = resolve(homeRoot, "agent");
	const bundledPackageDir = resolve(appRoot, ".feynman", "npm", "node_modules", "pi-subagents");
	const existingPackageDir = resolve(homeRoot, "npm-global", "lib", "node_modules", "pi-subagents");

	mkdirSync(agentDir, { recursive: true });
	createBundledWorkspace(appRoot, ["pi-subagents"]);
	cpSync(bundledPackageDir, existingPackageDir, { recursive: true });

	const seeded = seedBundledWorkspacePackages(agentDir, appRoot, ["npm:pi-subagents"]);

	assert.deepEqual(seeded, ["npm:pi-subagents"]);
	assert.equal(lstatSync(existingPackageDir).isSymbolicLink(), false);
});

test("getMissingConfiguredPackages seeds bundled packages before reporting missing startup packages", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const workingDir = resolve(homeRoot, "project");
	const agentDir = resolve(homeRoot, "agent");
	mkdirSync(workingDir, { recursive: true });
	createBundledWorkspace(appRoot, ["pi-subagents"]);
	writeSettings(agentDir, {
		packages: ["npm:pi-subagents"],
	});

	const result = getMissingConfiguredPackages(workingDir, agentDir, appRoot);

	assert.deepEqual(result.missing, []);
	assert.equal(existsSync(resolve(homeRoot, "npm-global", "lib", "node_modules", "pi-subagents", "package.json")), true);
});

test("seedBundledWorkspacePackages repairs broken existing bundled packages", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const agentDir = resolve(homeRoot, "agent");
	const existingPackageDir = resolve(homeRoot, "npm-global", "lib", "node_modules", "pi-markdown-preview");

	mkdirSync(agentDir, { recursive: true });
	createBundledWorkspace(appRoot, ["pi-markdown-preview", "puppeteer-core"], {
		"pi-markdown-preview": { "puppeteer-core": "^24.0.0" },
	});
	mkdirSync(existingPackageDir, { recursive: true });
	writeFileSync(
		resolve(existingPackageDir, "package.json"),
		JSON.stringify({ name: "pi-markdown-preview", version: "broken", dependencies: { "puppeteer-core": "^24.0.0" } }) + "\n",
		"utf8",
	);

	const seeded = seedBundledWorkspacePackages(agentDir, appRoot, ["npm:pi-markdown-preview"]);

	assert.deepEqual(seeded, ["npm:pi-markdown-preview"]);
	assert.equal(lstatSync(existingPackageDir).isSymbolicLink(), true);
	assert.equal(lstatSync(resolve(homeRoot, "npm-global", "lib", "node_modules", "puppeteer-core")).isSymbolicLink(), true);
	assert.equal(
		readFileSync(resolve(existingPackageDir, "package.json"), "utf8").includes('"version": "1.0.0"'),
		true,
	);
});

test("seedBundledWorkspacePackages prunes stale links from previous bundled runtimes", async () => {
	const appRoot = mkdtempSync(join(tmpdir(), "feynman-bundle-"));
	const homeRoot = mkdtempSync(join(tmpdir(), "feynman-home-"));
	const agentDir = resolve(homeRoot, "agent");
	const globalRoot = resolve(homeRoot, "npm-global", "lib", "node_modules");
	const stalePackagePath = resolve(globalRoot, "@opentelemetry", "api");
	const externalPackagePath = resolve(globalRoot, "@external", "kept");
	const externalTarget = resolve(homeRoot, "external", "kept");

	mkdirSync(agentDir, { recursive: true });
	mkdirSync(resolve(globalRoot, "@opentelemetry"), { recursive: true });
	mkdirSync(resolve(globalRoot, "@external"), { recursive: true });
	mkdirSync(externalTarget, { recursive: true });
	createBundledWorkspace(appRoot, ["pi-subagents"]);
	symlinkSync(resolve(appRoot, ".feynman", "npm", "node_modules", "@opentelemetry", "api"), stalePackagePath, "dir");
	symlinkSync(externalTarget, externalPackagePath, "dir");

	const seeded = seedBundledWorkspacePackages(agentDir, appRoot, ["npm:pi-subagents"]);

	assert.deepEqual(seeded, ["npm:pi-subagents"]);
	assert.equal(existsSync(stalePackagePath), false);
	assert.equal(existsSync(resolve(globalRoot, "@opentelemetry")), false);
	assert.equal(lstatSync(externalPackagePath).isSymbolicLink(), true);
});
