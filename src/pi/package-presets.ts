import type { PackageSource } from "@earendil-works/pi-coding-agent";

export const CORE_PACKAGE_SOURCES = [
	"npm:@companion-ai/alpha-hub",
	"npm:pi-subagents",
	"npm:pi-btw",
	"npm:pi-docparser",
	"npm:pi-web-access",
	"npm:pi-otel",
] as const;

const LEGACY_CORE_PACKAGE_SOURCES = [
	"npm:@companion-ai/alpha-hub",
	"npm:pi-subagents",
	"npm:pi-btw",
	"npm:pi-docparser",
	"npm:pi-web-access",
	"npm:pi-markdown-preview",
	"npm:@walterra/pi-charts",
	"npm:pi-mermaid",
	"npm:@aliou/pi-processes",
	"npm:pi-zotero",
	"npm:@kaiserlich-dev/pi-session-search",
	"npm:pi-schedule-prompt",
	"npm:@samfp/pi-memory",
	"npm:@tmustier/pi-ralph-wiggum",
] as const;

const LEGACY_TELEMETRY_CORE_PACKAGE_SOURCES = [
	...LEGACY_CORE_PACKAGE_SOURCES,
	"npm:@devkade/pi-opentelemetry",
] as const;

const LEGACY_CORE_WITH_PI_OTEL_PACKAGE_SOURCES = [
	...LEGACY_CORE_PACKAGE_SOURCES,
	"npm:pi-otel",
] as const;

const LEGACY_TELEMETRY_WITH_PI_OTEL_PACKAGE_SOURCES = [
	...LEGACY_CORE_WITH_PI_OTEL_PACKAGE_SOURCES,
	"npm:@devkade/pi-opentelemetry",
] as const;

export const NATIVE_PACKAGE_SOURCES = [
	"npm:@kaiserlich-dev/pi-session-search",
] as const;

const CORE_PACKAGE_UPDATE_ALIASES: Record<string, string> = {
	hindsight: "npm:@luxusai/pi-hindsight",
	"pi-hindsight": "npm:@luxusai/pi-hindsight",
	memory: "npm:@samfp/pi-memory",
	"pi-memory": "npm:@samfp/pi-memory",
	"session-search": "npm:@kaiserlich-dev/pi-session-search",
	"pi-session-search": "npm:@kaiserlich-dev/pi-session-search",
};

const REMOVED_OPTIONAL_PACKAGE_TARGETS = new Set([
	"all-extras",
	"generative-ui",
	"pi-generative-ui",
	"ui",
]);

export const MAX_NATIVE_PACKAGE_NODE_MAJOR = 22;

type OptionalPackagePreset = {
	description: string;
	sources: readonly string[];
	platforms?: readonly NodeJS.Platform[];
	maxNodeMajor?: number;
};

export const OPTIONAL_PACKAGE_PRESETS = {
	memory: {
		description: "Research-session preference and correction memory.",
		sources: ["npm:@samfp/pi-memory"],
	},
	hindsight: {
		description: "Hindsight-backed research continuity memory.",
		sources: ["npm:@luxusai/pi-hindsight"],
	},
	"session-search": {
		description: "Indexed recall for prior research session transcripts.",
		sources: ["npm:@kaiserlich-dev/pi-session-search"],
		maxNodeMajor: MAX_NATIVE_PACKAGE_NODE_MAJOR,
	},
} as const;

export type OptionalPackagePresetName = keyof typeof OPTIONAL_PACKAGE_PRESETS;
export type OptionalPackagePresetAlias = OptionalPackagePresetName;

const LEGACY_DEFAULT_PACKAGE_SETS = [
	[
		...CORE_PACKAGE_SOURCES,
		"npm:pi-generative-ui",
	],
	[
		...CORE_PACKAGE_SOURCES,
		"npm:@devkade/pi-opentelemetry",
	],
	[
		...CORE_PACKAGE_SOURCES,
		"npm:@devkade/pi-opentelemetry",
		"npm:pi-generative-ui",
	],
	[
		...LEGACY_TELEMETRY_CORE_PACKAGE_SOURCES,
	],
	[
		...LEGACY_TELEMETRY_CORE_PACKAGE_SOURCES,
		"npm:pi-generative-ui",
	],
	[
		...LEGACY_CORE_WITH_PI_OTEL_PACKAGE_SOURCES,
	],
	[
		...LEGACY_CORE_WITH_PI_OTEL_PACKAGE_SOURCES,
		"npm:pi-generative-ui",
	],
	[
		...LEGACY_TELEMETRY_WITH_PI_OTEL_PACKAGE_SOURCES,
	],
	[
		...LEGACY_TELEMETRY_WITH_PI_OTEL_PACKAGE_SOURCES,
		"npm:pi-generative-ui",
	],
	[
		...LEGACY_CORE_PACKAGE_SOURCES,
	],
	[
		...LEGACY_CORE_PACKAGE_SOURCES,
		"npm:pi-generative-ui",
	],
] as const;

const LEGACY_DEFAULT_PACKAGE_SOURCES = [
	...CORE_PACKAGE_SOURCES,
	"npm:pi-generative-ui",
] as const;

function arraysMatchAsSets(left: readonly string[], right: readonly string[]): boolean {
	if (left.length !== right.length) {
		return false;
	}

	const rightSet = new Set(right);
	return left.every((entry) => rightSet.has(entry));
}

export function shouldPruneLegacyDefaultPackages(packages: PackageSource[] | undefined): boolean {
	if (!Array.isArray(packages)) {
		return false;
	}
	if (packages.some((entry) => typeof entry !== "string")) {
		return false;
	}
	return LEGACY_DEFAULT_PACKAGE_SETS.some((legacySources) =>
		arraysMatchAsSets(packages as string[], legacySources),
	) || arraysMatchAsSets(packages as string[], LEGACY_DEFAULT_PACKAGE_SOURCES);
}

function parseNodeMajor(version: string): number {
	const [major = "0"] = version.replace(/^v/, "").split(".");
	return Number.parseInt(major, 10) || 0;
}

export function supportsNativePackageSources(version = process.versions.node): boolean {
	return parseNodeMajor(version) <= MAX_NATIVE_PACKAGE_NODE_MAJOR;
}

export function filterPackageSourcesForCurrentNode<T extends string>(sources: readonly T[], version = process.versions.node): T[] {
	if (supportsNativePackageSources(version)) {
		return [...sources];
	}

	const blocked = new Set<string>(NATIVE_PACKAGE_SOURCES);
	return sources.filter((source) => !blocked.has(source));
}

export function normalizeOptionalPackagePresetName(name: string): OptionalPackagePresetName | undefined {
	const normalized = name.trim().toLowerCase();
	return normalized in OPTIONAL_PACKAGE_PRESETS ? (normalized as OptionalPackagePresetName) : undefined;
}

export function isRemovedOptionalPackageTarget(name: string): boolean {
	const normalized = name.trim().toLowerCase().replace(/^npm:/, "");
	return REMOVED_OPTIONAL_PACKAGE_TARGETS.has(normalized);
}

export function isOptionalPackagePresetSupported(
	name: OptionalPackagePresetName,
	platform: NodeJS.Platform = process.platform,
	version = process.versions.node,
): boolean {
	const preset = OPTIONAL_PACKAGE_PRESETS[name] as OptionalPackagePreset;
	const platforms = preset.platforms;
	const maxNodeMajor = preset.maxNodeMajor;
	return (!platforms || platforms.includes(platform)) && (!maxNodeMajor || parseNodeMajor(version) <= maxNodeMajor);
}

export function getOptionalPackagePresetSources(
	name: string,
	platform: NodeJS.Platform = process.platform,
	version = process.versions.node,
): string[] | undefined {
	const normalized = normalizeOptionalPackagePresetName(name);
	if (!normalized) return undefined;

	if (!isOptionalPackagePresetSupported(normalized, platform, version)) return undefined;
	return [...OPTIONAL_PACKAGE_PRESETS[normalized].sources];
}

export function listOptionalPackagePresets(platform?: NodeJS.Platform, version = process.versions.node): Array<{
	name: OptionalPackagePresetName;
	description: string;
	sources: string[];
}> {
	const currentPlatform = platform ?? process.platform;
	return Object.entries(OPTIONAL_PACKAGE_PRESETS).filter(([name]) =>
		isOptionalPackagePresetSupported(name as OptionalPackagePresetName, currentPlatform, version),
	).map(([name, preset]) => ({
		name: name as OptionalPackagePresetName,
		description: preset.description,
		sources: [...preset.sources],
	}));
}

export function listOptionalPackagePresetInstallTargets(platform?: NodeJS.Platform, version = process.versions.node): string[] {
	const names = listOptionalPackagePresets(platform, version).map((preset) => preset.name);
	return names;
}

export function resolvePackageUpdateSources(name: string, platform: NodeJS.Platform = process.platform): string[] {
	const trimmed = name.trim();
	if (!trimmed) return [];
	if (isRemovedOptionalPackageTarget(trimmed)) {
		throw new Error(`Removed optional package target: ${trimmed}. Use \`nervefeyn packages list\` and install only the research-continuity presets you need.`);
	}
	if (trimmed.startsWith("npm:") || trimmed.startsWith("github:") || trimmed.startsWith("file:")) {
		return [trimmed];
	}

	const normalized = trimmed.toLowerCase();
	const coreSource = CORE_PACKAGE_UPDATE_ALIASES[normalized];
	if (coreSource) return [coreSource];

	const optionalSources = getOptionalPackagePresetSources(normalized, platform);
	return optionalSources ?? [trimmed];
}
