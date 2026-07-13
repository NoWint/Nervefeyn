export const PI_WEB_ACCESS_PATCH_TARGETS = [
	"index.ts",
	"curator-server.ts",
	"exa.ts",
	"gemini-api.ts",
	"gemini-search.ts",
	"gemini-web-config.ts",
	"gemini-web.ts",
	"github-extract.ts",
	"perplexity.ts",
	"video-extract.ts",
	"youtube-extract.ts",
];

const LEGACY_CONFIG_EXPR = 'join(homedir(), ".pi", "web-search.json")';
const PATCHED_CONFIG_EXPR =
	'process.env.FEYNMAN_WEB_SEARCH_CONFIG ?? process.env.PI_WEB_SEARCH_CONFIG ?? join(homedir(), ".pi", "web-search.json")';

function patchGeminiWebSource(source) {
	let patched = source;
	let changed = false;

	if (!patched.includes("geminiBrowser?: boolean;")) {
		const original = ["interface GeminiWebConfig {", "\tchromeProfile?: string;", "}"].join("\n");
		const replacement = [
			"interface GeminiWebConfig {",
			"\tchromeProfile?: string;",
			"\tgeminiBrowser?: boolean;",
			"}",
		].join("\n");
		if (patched.includes(original)) {
			patched = patched.replace(original, replacement);
			changed = true;
		}
	}

	const rawTypeOriginal = "let raw: { chromeProfile?: unknown };";
	const rawTypePatched =
		"let raw: { chromeProfile?: unknown; geminiBrowser?: unknown; allowBrowserAuth?: unknown; browserAuth?: unknown };";
	if (patched.includes(rawTypeOriginal)) {
		patched = patched.replace(rawTypeOriginal, rawTypePatched);
		changed = true;
	}

	const configOriginal = ["cachedConfig = {", "\t\tchromeProfile: normalizeChromeProfile(raw.chromeProfile),", "\t};"].join("\n");
	const configPatched = [
		"cachedConfig = {",
		"\t\tchromeProfile: normalizeChromeProfile(raw.chromeProfile),",
		"\t\tgeminiBrowser: normalizeBooleanFlag(raw.geminiBrowser ?? raw.allowBrowserAuth ?? raw.browserAuth),",
		"\t};",
	].join("\n");
	if (patched.includes(configOriginal)) {
		patched = patched.replace(configOriginal, configPatched);
		changed = true;
	}

	if (!patched.includes("function normalizeBooleanFlag(")) {
		const anchor = [
			"function getChromeProfileFromConfig(): string | undefined {",
			"\treturn loadConfig().chromeProfile;",
			"}",
		].join("\n");
		const replacement = [
			"function normalizeBooleanFlag(value: unknown): boolean {",
			"\tif (value === true) return true;",
			'\tif (typeof value !== "string") return false;',
			"\tconst normalized = value.trim().toLowerCase();",
			'\treturn normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";',
			"}",
			"",
			anchor,
		].join("\n");
		if (patched.includes(anchor)) {
			patched = patched.replace(anchor, replacement);
			changed = true;
		}
	}

	const availabilityOriginal = [
		"export async function isGeminiWebAvailable(chromeProfile?: string): Promise<CookieMap | null> {",
		"\tconst result = await getGoogleCookies({",
		"\t\tprofile: normalizeChromeProfile(chromeProfile) ?? getChromeProfileFromConfig(),",
		"\t\trequiredCookies: REQUIRED_COOKIES,",
		"\t});",
		"\tif (!result) return null;",
		"\treturn result.cookies;",
		"}",
	].join("\n");
	const availabilityPatched = [
		"export async function isGeminiWebAvailable(chromeProfile?: string): Promise<CookieMap | null> {",
		"\tconst config = loadConfig();",
		"\tif (!config.geminiBrowser) return null;",
		"\tconst result = await getGoogleCookies({",
		"\t\tprofile: normalizeChromeProfile(chromeProfile) ?? config.chromeProfile,",
		"\t\trequiredCookies: REQUIRED_COOKIES,",
		"\t});",
		"\tif (!result) return null;",
		"\treturn result.cookies;",
		"}",
	].join("\n");
	if (patched.includes(availabilityOriginal)) {
		patched = patched.replace(availabilityOriginal, availabilityPatched);
		changed = true;
	}

	const profileHelper = [
		"function getChromeProfileFromConfig(): string | undefined {",
		"\treturn loadConfig().chromeProfile;",
		"}",
	].join("\n");
	if (patched.includes(profileHelper) && patched.includes("config.chromeProfile")) {
		patched = patched.replace(`${profileHelper}\n\n`, "").replace(`${profileHelper}\n`, "");
		changed = true;
	}

	return { source: patched, changed };
}

function patchGeminiWebConfigSource(source) {
	let patched = source;
	let changed = false;

	if (!patched.includes("geminiBrowser?: boolean;")) {
		const original = [
			"interface GeminiWebConfig {",
			"\tchromeProfile?: string;",
			"\tallowBrowserCookies?: boolean;",
			"}",
		].join("\n");
		const replacement = [
			"interface GeminiWebConfig {",
			"\tchromeProfile?: string;",
			"\tallowBrowserCookies?: boolean;",
			"\tgeminiBrowser?: boolean;",
			"\tallowBrowserAuth?: boolean;",
			"\tbrowserAuth?: boolean;",
			"}",
		].join("\n");
		if (patched.includes(original)) {
			patched = patched.replace(original, replacement);
			changed = true;
		}
	}

	const rawTypeOriginal = "let raw: { chromeProfile?: unknown; allowBrowserCookies?: unknown };";
	const rawTypePatched =
		"let raw: { chromeProfile?: unknown; allowBrowserCookies?: unknown; geminiBrowser?: unknown; allowBrowserAuth?: unknown; browserAuth?: unknown };";
	if (patched.includes(rawTypeOriginal)) {
		patched = patched.split(rawTypeOriginal).join(rawTypePatched);
		changed = true;
	}

	if (!patched.includes("function normalizeBooleanFlag(")) {
		const anchor = [
			"function loadConfig(): GeminiWebConfig {",
		].join("\n");
		const replacement = [
			"function normalizeBooleanFlag(value: unknown): boolean {",
			"\tif (value === true) return true;",
			'\tif (typeof value !== "string") return false;',
			"\tconst normalized = value.trim().toLowerCase();",
			'\treturn normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";',
			"}",
			"",
			anchor,
		].join("\n");
		if (patched.includes(anchor)) {
			patched = patched.replace(anchor, replacement);
			changed = true;
		}
	}

	const configOriginal = "\t\tallowBrowserCookies: raw.allowBrowserCookies === true,";
	const configPatched =
		"\t\tallowBrowserCookies: normalizeBooleanFlag(raw.allowBrowserCookies) || normalizeBooleanFlag(raw.geminiBrowser) || normalizeBooleanFlag(raw.allowBrowserAuth) || normalizeBooleanFlag(raw.browserAuth),";
	if (patched.includes(configOriginal)) {
		patched = patched.replace(configOriginal, configPatched);
		changed = true;
	}

	return { source: patched, changed };
}

// Issue #169: parallel web_search toolCalls could hang the whole batch forever.
// Three holes, all of which must be closed so execute() always yields a result:
// 1. A parallel call that claims the curate slot while a sibling awaits its
//    bootstrap silently overwrites `pendingCurate`; the loser's promise never
//    resolves, and pi-agent-core's Promise.all then withholds every toolResult.
// 2. No deadline bounds a single search() call, so one wedged provider/page
//    fetch blocks all sibling queries in the batch.
const SEARCH_DEADLINE_HELPER = [
	"const SEARCH_CALL_TIMEOUT_MS = 90000;",
	"",
	"async function searchWithDeadline(query: string, options: Parameters<typeof search>[1]): ReturnType<typeof search> {",
	"\tlet deadlineTimer: ReturnType<typeof setTimeout> | undefined;",
	"\tconst deadline = new Promise<never>((_, reject) => {",
	"\t\tdeadlineTimer = setTimeout(",
	"\t\t\t() => reject(new Error(`web_search timed out after ${SEARCH_CALL_TIMEOUT_MS / 1000}s: \"${query}\"`)),",
	"\t\t\tSEARCH_CALL_TIMEOUT_MS,",
	"\t\t);",
	"\t\tdeadlineTimer.unref?.();",
	"\t});",
	"\ttry {",
	"\t\treturn await Promise.race([search(query, options), deadline]);",
	"\t} finally {",
	"\t\tclearTimeout(deadlineTimer);",
	"\t}",
	"}",
].join("\n");

function patchWebSearchHangSource(source) {
	let patched = source;
	let changed = false;

	const assignOriginal = ["\t\t\t\tconst onAbort = () => closeCurator();", "\t\t\t\tpendingCurate = pc;"].join("\n");
	const assignPatched = [
		"\t\t\t\tconst onAbort = () => closeCurator();",
		"\t\t\t\tcancelPendingCurate();",
		"\t\t\t\tpendingCurate = pc;",
	].join("\n");
	if (patched.includes(assignOriginal)) {
		patched = patched.replace(assignOriginal, assignPatched);
		changed = true;
	}

	const helperAnchor = "const MAX_INLINE_CONTENT = 30000; // Content returned directly to agent";
	if (!patched.includes("function searchWithDeadline(") && patched.includes(helperAnchor)) {
		patched = patched.replace(helperAnchor, `${SEARCH_DEADLINE_HELPER}\n\n${helperAnchor}`);
		changed = true;
	}

	for (const callOriginal of [
		"const { answer, results, inlineContent, provider } = await search(queryList[qi], {",
		"const { answer, results, inlineContent, provider } = await search(query, {",
	]) {
		const callPatched = callOriginal.replace("await search(", "await searchWithDeadline(");
		if (patched.includes(callOriginal)) {
			patched = patched.split(callOriginal).join(callPatched);
			changed = true;
		}
	}

	return { source: patched, changed };
}

// Issue #169 (hole 3): the curator watchdog skips sessions whose browser never
// connected, so a curate session whose page never opens (headless/tmux/SSH, or
// a clobbered parallel session) waits forever. Enforce a connect deadline.
function patchCuratorWatchdogSource(source) {
	let patched = source;
	let changed = false;

	const constAnchor = "const WATCHDOG_INTERVAL_MS = 5000;";
	if (!patched.includes("BROWSER_CONNECT_TIMEOUT_MS") && patched.includes(constAnchor)) {
		patched = patched.replace(constAnchor, `${constAnchor}\nconst BROWSER_CONNECT_TIMEOUT_MS = 120000;`);
		changed = true;
	}

	const watchdogOriginal = [
		"\t\t\twatchdog = setInterval(() => {",
		"\t\t\t\tif (completed || !browserConnected) return;",
		"\t\t\t\tif (Date.now() - lastHeartbeatAt <= STALE_THRESHOLD_MS) return;",
	].join("\n");
	const watchdogPatched = [
		"\t\t\tconst serverStartedAt = Date.now();",
		"\t\t\twatchdog = setInterval(() => {",
		"\t\t\t\tif (completed) return;",
		"\t\t\t\tif (!browserConnected) {",
		"\t\t\t\t\tif (Date.now() - serverStartedAt <= BROWSER_CONNECT_TIMEOUT_MS) return;",
		"\t\t\t\t} else if (Date.now() - lastHeartbeatAt <= STALE_THRESHOLD_MS) return;",
	].join("\n");
	if (patched.includes(watchdogOriginal)) {
		patched = patched.replace(watchdogOriginal, watchdogPatched);
		changed = true;
	}

	return { source: patched, changed };
}

export function patchPiWebAccessSource(relativePath, source) {
	let patched = source;
	let changed = false;

	if (!patched.includes(PATCHED_CONFIG_EXPR)) {
		patched = patched.split(LEGACY_CONFIG_EXPR).join(PATCHED_CONFIG_EXPR);
		changed = patched !== source;
	}

	if (relativePath === "index.ts") {
		const workflowDefaultOriginal = 'const workflow = resolveWorkflow(params.workflow ?? configWorkflow, ctx?.hasUI !== false);';
		const workflowDefaultPatched = 'const workflow = resolveWorkflow(params.workflow ?? configWorkflow ?? "none", ctx?.hasUI !== false);';
		if (patched.includes(workflowDefaultOriginal)) {
			patched = patched.replace(workflowDefaultOriginal, workflowDefaultPatched);
			changed = true;
		}
		if (patched.includes('summary-review = open curator with auto summary draft (default)')) {
			patched = patched.replace(
				'summary-review = open curator with auto summary draft (default)',
				'summary-review = open curator with auto summary draft (opt-in)',
			);
			changed = true;
		}
		if (patched.includes("else Gemini API (needs key), else Gemini Web (needs a supported Chromium-based browser login).")) {
			patched = patched.replace(
				"else Gemini API (needs key), else Gemini Web (needs a supported Chromium-based browser login).",
				"else Gemini API (needs key). Gemini Web browser-cookie fallback is disabled unless web-search.json sets geminiBrowser to true.",
			);
			changed = true;
		}
		if (patched.includes("Gemini Web is unavailable. Sign into gemini.google.com in a supported Chromium-based browser.")) {
			patched = patched.replace(
				"Gemini Web is unavailable. Sign into gemini.google.com in a supported Chromium-based browser.",
				'Gemini Web is disabled. Set \\"geminiBrowser\\": true in web-search.json to opt into browser-cookie access.',
			);
			changed = true;
		}
		if (patched.includes('Set "geminiBrowser": true in web-search.json')) {
			patched = patched.replace(
				/Set "geminiBrowser": true in web-search\.json/g,
				'Set \\"geminiBrowser\\": true in web-search.json',
			);
			changed = true;
		}
	}

	if (relativePath === "index.ts" && changed) {
		patched = patched.replace('import { join } from "node:path";', 'import { dirname, join } from "node:path";');
		patched = patched.replace('const dir = join(homedir(), ".pi");', "const dir = dirname(WEB_SEARCH_CONFIG_PATH);");
	}

	if (relativePath === "index.ts" && patched.includes('pi.registerCommand("search",')) {
		patched = patched.replace('pi.registerCommand("search",', 'pi.registerCommand("web-results",');
		changed = true;
	}

	if (relativePath === "index.ts") {
		const searchHangPatch = patchWebSearchHangSource(patched);
		patched = searchHangPatch.source;
		changed = changed || searchHangPatch.changed;
	}

	if (relativePath === "curator-server.ts") {
		const watchdogPatch = patchCuratorWatchdogSource(patched);
		patched = watchdogPatch.source;
		changed = changed || watchdogPatch.changed;
	}

	if (relativePath === "gemini-web.ts") {
		const geminiPatch = patchGeminiWebSource(patched);
		patched = geminiPatch.source;
		changed = changed || geminiPatch.changed;
	}

	if (relativePath === "gemini-web-config.ts") {
		const geminiPatch = patchGeminiWebConfigSource(patched);
		patched = geminiPatch.source;
		changed = changed || geminiPatch.changed;
	}

	if (relativePath === "gemini-search.ts") {
		if (patched.includes("  2. Sign into gemini.google.com in a supported Chromium-based browser")) {
			patched = patched.replace(
				"  2. Sign into gemini.google.com in a supported Chromium-based browser",
				'  2. Opt into Gemini Web browser-cookie access by setting \\"geminiBrowser\\": true in web-search.json',
			);
			changed = true;
		}
		if (patched.includes("  4. Sign into gemini.google.com in a supported Chromium-based browser")) {
			patched = patched.replace(
				"  4. Sign into gemini.google.com in a supported Chromium-based browser",
				'  4. Opt into Gemini Web browser-cookie access by setting \\"geminiBrowser\\": true in web-search.json',
			);
			changed = true;
		}
		if (patched.includes('setting "geminiBrowser": true in web-search.json')) {
			patched = patched.replace(
				/setting "geminiBrowser": true in web-search\.json/g,
				'setting \\"geminiBrowser\\": true in web-search.json',
			);
			changed = true;
		}
	}

	return patched;
}
