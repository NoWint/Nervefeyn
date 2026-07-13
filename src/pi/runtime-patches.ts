import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { patchAlphaHubAuthSource } from "../../scripts/lib/alpha-hub-auth-patch.mjs";
import { patchAlphaHubSearchResultsSource, patchAlphaHubSearchSource } from "../../scripts/lib/alpha-hub-search-patch.mjs";
import { patchPiAgentCoreSource } from "../../scripts/lib/pi-agent-core-patch.mjs";
import { patchPiModelRegistrySource } from "../../scripts/lib/pi-model-registry-patch.mjs";
import { PI_OTEL_PATCH_TARGETS, patchPiOtelSource } from "../../scripts/lib/pi-otel-patch.mjs";
import { PI_SESSION_SEARCH_PATCH_TARGETS, patchPiSessionSearchSource } from "../../scripts/lib/pi-session-search-patch.mjs";
import { PI_SUBAGENTS_PATCH_TARGETS, patchPiSubagentsSource } from "../../scripts/lib/pi-subagents-patch.mjs";
import { patchPiEditorSource, patchPiInteractiveThemeSource, patchPiTuiSource } from "../../scripts/lib/pi-tui-patch.mjs";
import { PI_WEB_ACCESS_PATCH_TARGETS, patchPiWebAccessSource } from "../../scripts/lib/pi-web-access-patch.mjs";

function patchFileIfPresent(path: string, patchSource: (source: string) => string): boolean {
	if (!existsSync(path)) {
		return false;
	}
	const source = readFileSync(path, "utf8");
	const patched = patchSource(source);
	if (patched === source) {
		return false;
	}
	writeFileSync(path, patched, "utf8");
	return true;
}

function patchPackageFiles(
	nodeModulesPath: string,
	packageName: string,
	relativePaths: string[],
	patchSource: (relativePath: string, source: string) => string,
): boolean {
	let changed = false;
	for (const relativePath of relativePaths) {
		changed = patchFileIfPresent(
			resolve(nodeModulesPath, ...packageName.split("/"), ...relativePath.split("/")),
			(source) => patchSource(relativePath, source),
		) || changed;
	}
	return changed;
}

function patchScopedPiPackageFileIfPresent(
	nodeModulesPath: string,
	packageName: string,
	relativePath: string,
	patchSource: (source: string) => string,
): boolean {
	let changed = false;
	for (const scope of ["@earendil-works", "@mariozechner"]) {
		changed = patchFileIfPresent(
			resolve(nodeModulesPath, scope, packageName, ...relativePath.split("/")),
			patchSource,
		) || changed;
	}
	return changed;
}

function patchPiCodingAgentPackageJsonSource(source: string): string {
	const pkg = JSON.parse(source) as {
		piConfig?: Record<string, unknown>;
		[key: string]: unknown;
	};
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

export function patchPiRuntimeNodeModules(appRoot: string, feynmanAgentDir?: string): boolean {
	const nodeModuleRoots = [
		resolve(appRoot, "node_modules"),
		resolve(appRoot, ".feynman", "npm", "node_modules"),
	];
	if (feynmanAgentDir) {
		// Pi resolves user-scope packages from Feynman's pinned npm prefix. When
		// that copy is a real directory (junction-creation fallback or a
		// `feynman update` reinstall) instead of a link into the bundled
		// workspace, it must be patched too or unpatched sources execute.
		nodeModuleRoots.push(resolve(dirname(feynmanAgentDir), "npm-global", "lib", "node_modules"));
		// Pi's own package manager installs into <agentDir>/npm since Pi 0.75;
		// a startup self-install lands fresh unpatched sources there.
		nodeModuleRoots.push(resolve(feynmanAgentDir, "npm", "node_modules"));
	}
	let changed = false;
	for (const nodeModulesPath of nodeModuleRoots) {
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-coding-agent",
			"package.json",
			patchPiCodingAgentPackageJsonSource,
		) || changed;
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-agent-core",
			"dist/agent-loop.js",
			patchPiAgentCoreSource,
		) || changed;
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-tui",
			"dist/tui.js",
			patchPiTuiSource,
		) || changed;
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-tui",
			"dist/components/editor.js",
			patchPiEditorSource,
		) || changed;
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-coding-agent",
			"dist/modes/interactive/theme/theme.js",
			patchPiInteractiveThemeSource,
		) || changed;
		changed = patchScopedPiPackageFileIfPresent(
			nodeModulesPath,
			"pi-coding-agent",
			"dist/core/model-registry.js",
			patchPiModelRegistrySource,
		) || changed;
		changed = patchFileIfPresent(
			resolve(nodeModulesPath, "@companion-ai", "alpha-hub", "src", "lib", "auth.js"),
			patchAlphaHubAuthSource,
		) || changed;
		changed = patchFileIfPresent(
			resolve(nodeModulesPath, "@companion-ai", "alpha-hub", "src", "lib", "alphaxiv.js"),
			patchAlphaHubSearchSource,
		) || changed;
		changed = patchFileIfPresent(
			resolve(nodeModulesPath, "@companion-ai", "alpha-hub", "src", "lib", "index.js"),
			patchAlphaHubSearchResultsSource,
		) || changed;
		changed = patchPackageFiles(
			nodeModulesPath,
			"pi-web-access",
			PI_WEB_ACCESS_PATCH_TARGETS,
			patchPiWebAccessSource,
		) || changed;
		changed = patchPackageFiles(
			nodeModulesPath,
			"pi-subagents",
			PI_SUBAGENTS_PATCH_TARGETS,
			patchPiSubagentsSource,
		) || changed;
		changed = patchPackageFiles(
			nodeModulesPath,
			"pi-otel",
			PI_OTEL_PATCH_TARGETS,
			patchPiOtelSource,
		) || changed;
		changed = patchPackageFiles(
			nodeModulesPath,
			"@kaiserlich-dev/pi-session-search",
			PI_SESSION_SEARCH_PATCH_TARGETS,
			patchPiSessionSearchSource,
		) || changed;
	}
	return changed;
}
