import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ModelRegistry, type PackageSource } from "@earendil-works/pi-coding-agent";

import { CORE_PACKAGE_SOURCES, filterPackageSourcesForCurrentNode, shouldPruneLegacyDefaultPackages } from "./package-presets.js";
import { choosePreferredModelRecord, getAvailableModelRecords, isProClassModelSpec } from "../model/catalog.js";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export function parseModelSpec(spec: string, modelRegistry: ModelRegistry) {
	const trimmed = spec.trim();
	const separator = trimmed.includes(":") ? ":" : trimmed.includes("/") ? "/" : null;
	if (!separator) {
		return undefined;
	}

	const [provider, ...rest] = trimmed.split(separator);
	const id = rest.join(separator);
	if (!provider || !id) {
		return undefined;
	}

	return modelRegistry.find(provider, id);
}

export function normalizeThinkingLevel(value: string | undefined): ThinkingLevel | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.toLowerCase();
	if (
		normalized === "off" ||
		normalized === "minimal" ||
		normalized === "low" ||
		normalized === "medium" ||
		normalized === "high" ||
		normalized === "xhigh"
	) {
		return normalized;
	}

	return undefined;
}

function filterConfiguredPackagesForCurrentNode(packages: PackageSource[] | undefined): PackageSource[] {
	if (!Array.isArray(packages)) {
		return [];
	}

	const filteredStringSources = new Set(filterPackageSourcesForCurrentNode(
		packages
			.map((entry) => (typeof entry === "string" ? entry : entry.source))
			.filter((entry): entry is string => typeof entry === "string"),
	));

	return packages.filter((entry) => {
		const source = typeof entry === "string" ? entry : entry.source;
		return filteredStringSources.has(source);
	});
}

export function readJson(path: string): Record<string, unknown> {
	if (!existsSync(path)) {
		return {};
	}

	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		if (process.env.FEYNMAN_DEBUG === "1") {
			process.stderr.write(
				`[feynman] warning: failed to parse ${path}, treating as empty (${error instanceof Error ? error.message : "unknown error"})\n`,
			);
		}
		return {};
	}
}

export function normalizeFeynmanSettings(
	settingsPath: string,
	bundledSettingsPath: string,
	defaultThinkingLevel: ThinkingLevel,
	authPath: string,
): void {
	let settings: Record<string, unknown> = {};

	if (existsSync(settingsPath)) {
		try {
			settings = JSON.parse(readFileSync(settingsPath, "utf8"));
		} catch {
			settings = {};
		}
	} else if (existsSync(bundledSettingsPath)) {
		try {
			settings = JSON.parse(readFileSync(bundledSettingsPath, "utf8"));
		} catch {
			settings = {};
		}
	}

	if (!settings.defaultThinkingLevel) {
		settings.defaultThinkingLevel = defaultThinkingLevel;
	}
	if (settings.editorPaddingX === undefined) {
		settings.editorPaddingX = 1;
	}
	settings.theme = "feynman";
	settings.quietStartup = true;
	settings.collapseChangelog = true;
	const supportedCorePackages = filterPackageSourcesForCurrentNode(CORE_PACKAGE_SOURCES);
	if (!Array.isArray(settings.packages) || settings.packages.length === 0) {
		settings.packages = supportedCorePackages;
	} else if (shouldPruneLegacyDefaultPackages(settings.packages as PackageSource[])) {
		settings.packages = supportedCorePackages;
	} else {
		settings.packages = filterConfiguredPackagesForCurrentNode(settings.packages as PackageSource[]);
	}

	const availableModels = getAvailableModelRecords(authPath).map((model) => ({
		provider: model.provider,
		id: model.id,
	}));
	const availableModelSpecs = new Set(availableModels.map((model) => `${model.provider}/${model.id}`));

	const defaultModelSpec = typeof settings.defaultProvider === "string" && typeof settings.defaultModel === "string"
		? `${settings.defaultProvider}/${settings.defaultModel}`
		: undefined;
	const defaultIsProClass = isProClassModelSpec(defaultModelSpec);
	const defaultUnavailable = Boolean(defaultModelSpec && !availableModelSpecs.has(defaultModelSpec));
	if ((!settings.defaultProvider || !settings.defaultModel || defaultIsProClass || defaultUnavailable) && availableModels.length > 0) {
		const preferredModel = choosePreferredModelRecord(availableModels);
		if (preferredModel) {
			settings.defaultProvider = preferredModel.provider;
			settings.defaultModel = preferredModel.id;
		}
	} else if (defaultIsProClass) {
		delete settings.defaultProvider;
		delete settings.defaultModel;
	}

	mkdirSync(dirname(settingsPath), { recursive: true });
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}
