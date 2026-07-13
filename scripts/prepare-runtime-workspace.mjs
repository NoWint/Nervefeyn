import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { patchPiAgentCoreSource } from "./lib/pi-agent-core-patch.mjs";
import { patchPiExtensionLoaderSource } from "./lib/pi-extension-loader-patch.mjs";
import { patchPiEditorSource, patchPiInteractiveThemeSource, patchPiTuiSource } from "./lib/pi-tui-patch.mjs";
import { PI_WEB_ACCESS_PATCH_TARGETS, patchPiWebAccessSource } from "./lib/pi-web-access-patch.mjs";
import { PI_SUBAGENTS_PATCH_TARGETS, patchPiSubagentsSource, stripPiSubagentBuiltinModelSource } from "./lib/pi-subagents-patch.mjs";
import { PI_OTEL_PATCH_TARGETS, patchPiOtelSource } from "./lib/pi-otel-patch.mjs";
import { PI_SESSION_SEARCH_PATCH_TARGETS, patchPiSessionSearchSource } from "./lib/pi-session-search-patch.mjs";
import { patchAlphaHubSearchSource } from "./lib/alpha-hub-search-patch.mjs";

const appRoot = resolve(import.meta.dirname, "..");
const settingsPath = resolve(appRoot, ".feynman", "settings.json");
const packageJsonPath = resolve(appRoot, "package.json");
const packageLockPath = resolve(appRoot, "package-lock.json");
const feynmanDir = resolve(appRoot, ".feynman");
const workspaceDir = resolve(appRoot, ".feynman", "npm");
const workspaceNodeModulesDir = resolve(workspaceDir, "node_modules");
const manifestPath = resolve(workspaceDir, ".runtime-manifest.json");
const workspacePackageJsonPath = resolve(workspaceDir, "package.json");
const workspaceNpmConfigPath = resolve(workspaceDir, ".npmrc");
const workspaceArchivePath = resolve(feynmanDir, "runtime-workspace.tgz");
const PRUNE_VERSION = 8;
const PI_RUNTIME_FALLBACK_VERSION = "0.80.3";
const RUNTIME_PACKAGE_OVERRIDES = {
	"@mozilla/readability": "0.6.0",
	"@opentelemetry/core": "2.8.0",
	"@opentelemetry/exporter-logs-otlp-grpc": "0.219.0",
	"@opentelemetry/exporter-logs-otlp-http": "0.219.0",
	"@opentelemetry/exporter-logs-otlp-proto": "0.219.0",
	"@opentelemetry/exporter-metrics-otlp-grpc": "0.219.0",
	"@opentelemetry/exporter-metrics-otlp-http": "0.219.0",
	"@opentelemetry/exporter-metrics-otlp-proto": "0.219.0",
	"@opentelemetry/exporter-prometheus": "0.219.0",
	"@opentelemetry/exporter-trace-otlp-grpc": "0.219.0",
	"@opentelemetry/exporter-trace-otlp-http": "0.219.0",
	"@opentelemetry/exporter-trace-otlp-proto": "0.219.0",
	"@opentelemetry/exporter-zipkin": "2.8.0",
	"@opentelemetry/instrumentation": "0.219.0",
	"@opentelemetry/otlp-exporter-base": "0.219.0",
	"@opentelemetry/otlp-grpc-exporter-base": "0.219.0",
	"@opentelemetry/otlp-transformer": "0.219.0",
	"@opentelemetry/propagator-b3": "2.8.0",
	"@opentelemetry/propagator-jaeger": "2.8.0",
	"@opentelemetry/resources": "2.8.0",
	"@opentelemetry/sdk-logs": "0.219.0",
	"@opentelemetry/sdk-metrics": "2.8.0",
	"@opentelemetry/sdk-node": "0.219.0",
	"@opentelemetry/sdk-trace-base": "2.8.0",
	"@opentelemetry/sdk-trace-node": "2.8.0",
};
const PINNED_RUNTIME_PACKAGES = [
	"@earendil-works/pi-agent-core",
	"@earendil-works/pi-ai",
	"@earendil-works/pi-coding-agent",
	"@earendil-works/pi-tui",
	"typebox",
];
const LEGACY_PI_RUNTIME_PACKAGE_ALIASES = {
	"@mariozechner/pi-agent-core": "@earendil-works/pi-agent-core",
	"@mariozechner/pi-ai": "@earendil-works/pi-ai",
	"@mariozechner/pi-coding-agent": "@earendil-works/pi-coding-agent",
	"@mariozechner/pi-tui": "@earendil-works/pi-tui",
};
const NATIVE_PACKAGE_SPECS = new Set([
	"@kaiserlich-dev/pi-session-search",
]);

function supportsNativePackageSources(version = process.versions.node) {
	const [major = "0"] = version.replace(/^v/, "").split(".");
	return (Number.parseInt(major, 10) || 0) <= 22;
}

function parsePackageName(spec) {
	const match = spec.match(/^(@?[^@]+(?:\/[^@]+)?)(?:@.+)?$/);
	return match?.[1] ?? spec;
}

function filterUnsupportedPackageSpecs(packageSpecs) {
	if (supportsNativePackageSources()) return packageSpecs;
	return packageSpecs.filter((spec) => !NATIVE_PACKAGE_SPECS.has(parsePackageName(spec)));
}

function readPackageSpecs() {
	const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
	const packageSpecs = Array.isArray(settings.packages)
		? settings.packages
			.filter((value) => typeof value === "string" && value.startsWith("npm:"))
			.map((value) => value.slice(4))
		: [];

	for (const packageName of PINNED_RUNTIME_PACKAGES) {
		const version = readLockedPackageVersion(packageName);
		if (version) {
			packageSpecs.push(`${packageName}@${version}`);
		}
	}
	return filterUnsupportedPackageSpecs(Array.from(new Set(packageSpecs)));
}

function readLockedPackageVersion(packageName) {
	if (!existsSync(packageLockPath)) {
		return undefined;
	}
	try {
		const lockfile = JSON.parse(readFileSync(packageLockPath, "utf8"));
		const entry = lockfile.packages?.[`node_modules/${packageName}`];
		return typeof entry?.version === "string" ? entry.version : undefined;
	} catch {
		return undefined;
	}
}

function arraysMatch(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hashFile(path) {
	if (!existsSync(path)) {
		return null;
	}
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function getRuntimeInputHash() {
	const hash = createHash("sha256");
	for (const path of [
		resolve(appRoot, "scripts", "prepare-runtime-workspace.mjs"),
		packageJsonPath,
		packageLockPath,
		settingsPath,
		resolve(appRoot, "scripts", "lib", "pi-agent-core-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-extension-loader-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-tui-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-web-access-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-subagents-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-otel-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "pi-session-search-patch.mjs"),
		resolve(appRoot, "scripts", "lib", "alpha-hub-search-patch.mjs"),
	]) {
		hash.update(path);
		hash.update("\0");
		hash.update(hashFile(path) ?? "missing");
		hash.update("\0");
	}
	return hash.digest("hex");
}

function workspaceIsCurrent(packageSpecs) {
	if (!existsSync(manifestPath) || !existsSync(workspaceNodeModulesDir)) {
		return false;
	}

	try {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		if (!Array.isArray(manifest.packageSpecs) || !arraysMatch(manifest.packageSpecs, packageSpecs)) {
			return false;
		}
		if (manifest.runtimeInputHash !== getRuntimeInputHash()) {
			return false;
		}
		if (
			manifest.nodeAbi !== process.versions.modules ||
			manifest.platform !== process.platform ||
			manifest.arch !== process.arch ||
			manifest.pruneVersion !== PRUNE_VERSION
		) {
			return false;
		}

		return packageSpecs.every((spec) => existsSync(resolve(workspaceNodeModulesDir, parsePackageName(spec))));
	} catch {
		return false;
	}
}

function writeWorkspacePackageJson() {
	writeFileSync(
		workspacePackageJsonPath,
		JSON.stringify(
			{
				name: "feynman-runtime",
				private: true,
				overrides: RUNTIME_PACKAGE_OVERRIDES,
			},
			null,
			2,
		) + "\n",
		"utf8",
	);
	writeFileSync(workspaceNpmConfigPath, "", "utf8");
}

function childNpmInstallEnv() {
	return {
		...process.env,
		// `npm pack --dry-run` exports dry-run config to lifecycle scripts. The
		// vendored runtime workspace must still install real node_modules so the
		// publish artifact can be validated without poisoning the archive.
		npm_config_dry_run: "false",
		NPM_CONFIG_DRY_RUN: "false",
		npm_config_userconfig: workspaceNpmConfigPath,
		NPM_CONFIG_USERCONFIG: workspaceNpmConfigPath,
	};
}

function prepareWorkspace(packageSpecs) {
	rmSync(workspaceDir, { recursive: true, force: true });
	mkdirSync(workspaceDir, { recursive: true });
	writeWorkspacePackageJson();

	if (packageSpecs.length === 0) {
		return;
	}

	const result = spawnSync(
		process.env.npm_execpath ? process.execPath : "npm",
		process.env.npm_execpath
			? [process.env.npm_execpath, "install", "--prefer-online", "--no-audit", "--no-fund", "--no-dry-run", "--legacy-peer-deps", "--loglevel", "error", "--prefix", workspaceDir, ...packageSpecs]
			: ["install", "--prefer-online", "--no-audit", "--no-fund", "--no-dry-run", "--legacy-peer-deps", "--loglevel", "error", "--prefix", workspaceDir, ...packageSpecs],
		{ stdio: "inherit", env: childNpmInstallEnv() },
	);
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function writeManifest(packageSpecs) {
	writeFileSync(
		manifestPath,
		JSON.stringify(
			{
				packageSpecs,
				runtimeInputHash: getRuntimeInputHash(),
				generatedAt: new Date().toISOString(),
				nodeAbi: process.versions.modules,
				nodeVersion: process.version,
				platform: process.platform,
				arch: process.arch,
				pruneVersion: PRUNE_VERSION,
			},
			null,
			2,
		) + "\n",
		"utf8",
	);
}

function pruneWorkspace() {
	const result = spawnSync(process.execPath, [resolve(appRoot, "scripts", "prune-runtime-deps.mjs"), workspaceDir], {
		stdio: "inherit",
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function linkDirectory(linkPath, targetPath) {
	try {
		if (existsSync(linkPath) && lstatSync(linkPath).isSymbolicLink()) {
			if (resolve(dirname(linkPath), readlinkSync(linkPath)) === targetPath) {
				return;
			}
			rmSync(linkPath, { force: true });
		}
	} catch {}

	if (existsSync(linkPath)) {
		return;
	}

	mkdirSync(dirname(linkPath), { recursive: true });
	try {
		symlinkSync(relative(dirname(linkPath), targetPath), linkPath, process.platform === "win32" ? "junction" : "dir");
	} catch {
		if (!existsSync(linkPath)) {
			cpSync(targetPath, linkPath, { recursive: true });
		}
	}
}

function linkLegacyPiRuntimeAliases() {
	for (const [legacyName, currentName] of Object.entries(LEGACY_PI_RUNTIME_PACKAGE_ALIASES)) {
		const currentPath = resolve(workspaceNodeModulesDir, currentName);
		if (!existsSync(currentPath)) {
			continue;
		}
		linkDirectory(resolve(workspaceNodeModulesDir, legacyName), currentPath);
	}
}

function patchBundledPiSubagents() {
	const piSubagentsRoot = resolve(workspaceNodeModulesDir, "pi-subagents");
	if (!existsSync(piSubagentsRoot)) {
		return false;
	}

	let changed = false;
	for (const relativePath of PI_SUBAGENTS_PATCH_TARGETS) {
		const entryPath = resolve(piSubagentsRoot, relativePath);
		if (!existsSync(entryPath)) continue;

		const source = readFileSync(entryPath, "utf8");
		const patched = patchPiSubagentsSource(relativePath, source);
		if (patched === source) continue;
		writeFileSync(entryPath, patched, "utf8");
		changed = true;
	}

	const agentsRoot = resolve(piSubagentsRoot, "agents");
	if (!existsSync(agentsRoot)) {
		return changed;
	}

	for (const entry of readdirSync(agentsRoot, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		const entryPath = resolve(agentsRoot, entry.name);
		const source = readFileSync(entryPath, "utf8");
		const patched = stripPiSubagentBuiltinModelSource(source);
		if (patched === source) continue;
		writeFileSync(entryPath, patched, "utf8");
		changed = true;
	}
	return changed;
}

function patchScopedPiWorkspaceFile(packageName, relativePath, patchSource) {
	let changed = false;
	for (const scope of ["@earendil-works", "@mariozechner"]) {
		const filePath = resolve(workspaceNodeModulesDir, scope, packageName, ...relativePath.split("/"));
		if (!existsSync(filePath)) continue;
		const source = readFileSync(filePath, "utf8");
		const patched = patchSource(source);
		if (patched === source) continue;
		writeFileSync(filePath, patched, "utf8");
		changed = true;
	}
	return changed;
}

function patchPiCodingAgentPackageJsonSource(source) {
	const pkg = JSON.parse(source);
	const piConfig = typeof pkg.piConfig === "object" && pkg.piConfig !== null ? pkg.piConfig : {};
	if (piConfig.name === "feynman" && piConfig.configDir === ".feynman") {
		return source;
	}
	pkg.piConfig = {
		...piConfig,
		name: "feynman",
		configDir: ".feynman",
	};
	return JSON.stringify(pkg, null, 2) + "\n";
}

function patchBundledPiCodingAgentPackageJson() {
	return patchScopedPiWorkspaceFile("pi-coding-agent", "package.json", patchPiCodingAgentPackageJsonSource);
}

function patchBundledPiAgentCore() {
	return patchScopedPiWorkspaceFile("pi-agent-core", "dist/agent-loop.js", patchPiAgentCoreSource);
}

function patchBundledPiTui() {
	let changed = false;
	changed = patchScopedPiWorkspaceFile("pi-tui", "dist/tui.js", patchPiTuiSource) || changed;
	changed = patchScopedPiWorkspaceFile("pi-tui", "dist/components/editor.js", patchPiEditorSource) || changed;
	return changed;
}

function patchBundledPiExtensionLoader() {
	return patchScopedPiWorkspaceFile("pi-coding-agent", "dist/core/extensions/loader.js", patchPiExtensionLoaderSource);
}

function patchBundledPiInteractiveTheme() {
	return patchScopedPiWorkspaceFile("pi-coding-agent", "dist/modes/interactive/theme/theme.js", patchPiInteractiveThemeSource);
}

function patchBundledPiWebAccess() {
	const piWebAccessRoot = resolve(workspaceNodeModulesDir, "pi-web-access");
	if (!existsSync(piWebAccessRoot)) {
		return false;
	}

	let changed = false;
	for (const relativePath of PI_WEB_ACCESS_PATCH_TARGETS) {
		const entryPath = resolve(piWebAccessRoot, relativePath);
		if (!existsSync(entryPath)) continue;

		const source = readFileSync(entryPath, "utf8");
		const patched = patchPiWebAccessSource(relativePath, source);
		if (patched === source) continue;
		writeFileSync(entryPath, patched, "utf8");
		changed = true;
	}
	return changed;
}

function patchBundledPiOtel() {
	const piOtelRoot = resolve(workspaceNodeModulesDir, "pi-otel");
	if (!existsSync(piOtelRoot)) {
		return false;
	}

	let changed = false;
	for (const relativePath of PI_OTEL_PATCH_TARGETS) {
		const entryPath = resolve(piOtelRoot, relativePath);
		if (!existsSync(entryPath)) continue;

		const source = readFileSync(entryPath, "utf8");
		const patched = patchPiOtelSource(relativePath, source);
		if (patched === source) continue;
		writeFileSync(entryPath, patched, "utf8");
		changed = true;
	}
	return changed;
}

function patchBundledPiSessionSearch() {
	const sessionSearchRoot = resolve(workspaceNodeModulesDir, "@kaiserlich-dev", "pi-session-search");
	if (!existsSync(sessionSearchRoot)) {
		return false;
	}

	let changed = false;
	for (const relativePath of PI_SESSION_SEARCH_PATCH_TARGETS) {
		const entryPath = resolve(sessionSearchRoot, relativePath);
		if (!existsSync(entryPath)) continue;

		const source = readFileSync(entryPath, "utf8");
		const patched = patchPiSessionSearchSource(relativePath, source);
		if (patched === source) continue;
		writeFileSync(entryPath, patched, "utf8");
		changed = true;
	}
	return changed;
}

function patchBundledAlphaHub() {
	const alphaxivPath = resolve(workspaceNodeModulesDir, "@companion-ai", "alpha-hub", "src", "lib", "alphaxiv.js");
	if (!existsSync(alphaxivPath)) {
		return false;
	}

	const source = readFileSync(alphaxivPath, "utf8");
	const patched = patchAlphaHubSearchSource(source);
	if (patched === source) {
		return false;
	}
	writeFileSync(alphaxivPath, patched, "utf8");
	return true;
}

function patchBundledRuntime() {
	let changed = false;
	changed = patchBundledPiCodingAgentPackageJson() || changed;
	changed = patchBundledPiAgentCore() || changed;
	changed = patchBundledPiExtensionLoader() || changed;
	changed = patchBundledPiInteractiveTheme() || changed;
	changed = patchBundledPiTui() || changed;
	changed = patchBundledPiWebAccess() || changed;
	changed = patchBundledPiSubagents() || changed;
	changed = patchBundledPiOtel() || changed;
	changed = patchBundledPiSessionSearch() || changed;
	changed = patchBundledAlphaHub() || changed;
	return changed;
}

function archiveIsCurrent() {
	if (!existsSync(workspaceArchivePath) || !existsSync(manifestPath)) {
		return false;
	}

	return statSync(workspaceArchivePath).mtimeMs >= statSync(manifestPath).mtimeMs;
}

function createWorkspaceArchive() {
	rmSync(workspaceArchivePath, { force: true });

	const result = spawnSync("tar", ["-czf", workspaceArchivePath, "-C", feynmanDir, "npm"], {
		stdio: "inherit",
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const packageSpecs = readPackageSpecs();

if (workspaceIsCurrent(packageSpecs)) {
	console.log("[feynman] vendored runtime workspace already up to date");
	linkLegacyPiRuntimeAliases();
	if (patchBundledRuntime()) {
		writeManifest(packageSpecs);
		console.log("[feynman] patched bundled Pi runtime");
	}
	if (archiveIsCurrent()) {
		process.exit(0);
	}
	console.log("[feynman] refreshing runtime workspace archive...");
	createWorkspaceArchive();
	console.log("[feynman] runtime workspace archive ready");
	process.exit(0);
}

	console.log("[feynman] preparing vendored runtime workspace...");
	prepareWorkspace(packageSpecs);
	pruneWorkspace();
	linkLegacyPiRuntimeAliases();
	patchBundledRuntime();
	writeManifest(packageSpecs);
createWorkspaceArchive();
console.log("[feynman] vendored runtime workspace ready");
