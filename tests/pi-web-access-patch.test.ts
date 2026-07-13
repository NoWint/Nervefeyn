import test from "node:test";
import assert from "node:assert/strict";

import { patchPiWebAccessSource } from "../scripts/lib/pi-web-access-patch.mjs";

test("patchPiWebAccessSource rewrites legacy Pi web-search config paths", () => {
	const input = [
		'import { join } from "node:path";',
		'import { homedir } from "node:os";',
		'const CONFIG_PATH = join(homedir(), ".pi", "web-search.json");',
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("perplexity.ts", input);

	assert.match(patched, /FEYNMAN_WEB_SEARCH_CONFIG/);
	assert.match(patched, /PI_WEB_SEARCH_CONFIG/);
});

test("patchPiWebAccessSource updates index.ts directory handling", () => {
	const input = [
		'import { existsSync, mkdirSync } from "node:fs";',
		'import { join } from "node:path";',
		'import { homedir } from "node:os";',
		'const WEB_SEARCH_CONFIG_PATH = join(homedir(), ".pi", "web-search.json");',
		'const dir = join(homedir(), ".pi");',
		'pi.registerCommand("search", { description: "Browse stored web search results" });',
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("index.ts", input);

	assert.match(patched, /import \{ dirname, join \} from "node:path";/);
	assert.match(patched, /const dir = dirname\(WEB_SEARCH_CONFIG_PATH\);/);
	assert.match(patched, /pi\.registerCommand\("web-results",/);
	assert.doesNotMatch(patched, /pi\.registerCommand\("search",/);
});

test("patchPiWebAccessSource defaults workflow to none for index.ts without disabling explicit summary-review", () => {
	const input = [
		'function resolveWorkflow(input: unknown, hasUI: boolean): WebSearchWorkflow {',
		'\tif (!hasUI) return "none";',
		'\tif (typeof input === "string" && input.trim().toLowerCase() === "none") return "none";',
		'\treturn "summary-review";',
		'}',
		'const configWorkflow = loadConfigForExtensionInit().workflow;',
		'const workflow = resolveWorkflow(params.workflow ?? configWorkflow, ctx?.hasUI !== false);',
		'workflow: Type.Optional(',
		'\tStringEnum(["none", "summary-review"], {',
		'\t\tdescription: "Search workflow mode: none = no curator, summary-review = open curator with auto summary draft (default)",',
		'\t}),',
		'),',
		'const description = "Provider auto-selects: Exa (direct API with key, MCP fallback without), else Perplexity (needs key), else Gemini API (needs key), else Gemini Web (needs a supported Chromium-based browser login).";',
		'const message = "Gemini Web is unavailable. Sign into gemini.google.com in a supported Chromium-based browser.";',
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("index.ts", input);

	assert.match(patched, /params\.workflow \?\? configWorkflow \?\? "none"/);
	assert.match(patched, /return "summary-review";/);
	assert.match(patched, /summary-review = open curator with auto summary draft \(opt-in\)/);
	assert.match(patched, /browser-cookie fallback is disabled unless web-search\.json sets geminiBrowser to true/);
	assert.match(patched, /Set \\"geminiBrowser\\": true in web-search\.json/);
});

test("patchPiWebAccessSource disables Gemini Web cookie access by default", () => {
	const input = [
		"interface GeminiWebConfig {",
		"\tchromeProfile?: string;",
		"}",
		"let raw: { chromeProfile?: unknown };",
		"cachedConfig = {",
		"\t\tchromeProfile: normalizeChromeProfile(raw.chromeProfile),",
		"\t};",
		"function normalizeChromeProfile(value: unknown): string | undefined {",
		'\tif (typeof value !== "string") return undefined;',
		"\tconst normalized = value.trim();",
		"\treturn normalized.length > 0 ? normalized : undefined;",
		"}",
		"function getChromeProfileFromConfig(): string | undefined {",
		"\treturn loadConfig().chromeProfile;",
		"}",
		"export async function isGeminiWebAvailable(chromeProfile?: string): Promise<CookieMap | null> {",
		"\tconst result = await getGoogleCookies({",
		"\t\tprofile: normalizeChromeProfile(chromeProfile) ?? getChromeProfileFromConfig(),",
		"\t\trequiredCookies: REQUIRED_COOKIES,",
		"\t});",
		"\tif (!result) return null;",
		"\treturn result.cookies;",
		"}",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("gemini-web.ts", input);

	assert.match(patched, /geminiBrowser\?: boolean/);
	assert.match(patched, /normalizeBooleanFlag\(raw\.geminiBrowser \?\? raw\.allowBrowserAuth \?\? raw\.browserAuth\)/);
	assert.match(patched, /if \(!config\.geminiBrowser\) return null/);
	assert.doesNotMatch(patched, /getChromeProfileFromConfig\(\)/);
});

test("patchPiWebAccessSource keeps Gemini Web config opt-in across current upstream aliases", () => {
	const input = [
		'import { existsSync, readFileSync } from "node:fs";',
		'import { homedir } from "node:os";',
		'import { join } from "node:path";',
		'const CONFIG_PATH = join(homedir(), ".pi", "web-search.json");',
		"interface GeminiWebConfig {",
		"\tchromeProfile?: string;",
		"\tallowBrowserCookies?: boolean;",
		"}",
		"function loadConfig(): GeminiWebConfig {",
		'\tlet raw: { chromeProfile?: unknown; allowBrowserCookies?: unknown };',
		"\ttry {",
		'\t\traw = JSON.parse(rawText) as { chromeProfile?: unknown; allowBrowserCookies?: unknown };',
		"\t} catch {}",
		"\tcachedConfig = {",
		"\t\tchromeProfile: normalizeChromeProfile(raw.chromeProfile),",
		"\t\tallowBrowserCookies: raw.allowBrowserCookies === true,",
		"\t};",
		"\treturn cachedConfig;",
		"}",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("gemini-web-config.ts", input);

	assert.match(patched, /process\.env\.FEYNMAN_WEB_SEARCH_CONFIG/);
	assert.match(patched, /geminiBrowser\?: boolean/);
	assert.match(patched, /allowBrowserAuth\?: boolean/);
	assert.match(patched, /browserAuth\?: boolean/);
	assert.match(patched, /function normalizeBooleanFlag/);
	assert.match(patched, /normalizeBooleanFlag\(raw\.allowBrowserCookies\) \|\| normalizeBooleanFlag\(raw\.geminiBrowser\)/);
});

test("patchPiWebAccessSource changes Gemini search browser fallback messaging to opt-in", () => {
	const input = [
		'throw new Error("Gemini search unavailable. Either:\\n" +',
		'\t"  1. Set GEMINI_API_KEY in ~/.pi/web-search.json\\n" +',
		'\t"  2. Sign into gemini.google.com in a supported Chromium-based browser"',
		");",
		'throw new Error("No search provider available. Either:\\n" +',
		'\t"  1. Set perplexityApiKey in ~/.pi/web-search.json\\n" +',
		'\t"  4. Sign into gemini.google.com in a supported Chromium-based browser"',
		");",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("gemini-search.ts", input);

	assert.doesNotMatch(patched, /Sign into gemini\.google\.com/);
	assert.match(patched, /Opt into Gemini Web browser-cookie access/);
	assert.match(patched, /\\"geminiBrowser\\": true/);
});

test("patchPiWebAccessSource is idempotent", () => {
	const input = [
		'import { join } from "node:path";',
		'import { homedir } from "node:os";',
		'const CONFIG_PATH = join(homedir(), ".pi", "web-search.json");',
		"",
	].join("\n");

	const once = patchPiWebAccessSource("perplexity.ts", input);
	const twice = patchPiWebAccessSource("perplexity.ts", once);

	assert.equal(twice, once);
});

test("patchPiWebAccessSource cancels a clobbered parallel curate session in index.ts", () => {
	const input = [
		"\t\t\t\tconst onAbort = () => closeCurator();",
		"\t\t\t\tpendingCurate = pc;",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("index.ts", input);

	assert.match(patched, /cancelPendingCurate\(\);\n\t\t\t\tpendingCurate = pc;/);

	const twice = patchPiWebAccessSource("index.ts", patched);
	assert.equal(twice, patched);
});

test("patchPiWebAccessSource bounds web_search query calls with a deadline in index.ts", () => {
	const input = [
		"const MAX_INLINE_CONTENT = 30000; // Content returned directly to agent",
		"",
		"async function run() {",
		"\t\t\t\t\tconst { answer, results, inlineContent, provider } = await search(queryList[qi], {",
		"\t\t\t\t\t\tprovider: requestedProvider,",
		"\t\t\t\t\t});",
		"\t\t\t\tconst { answer, results, inlineContent, provider } = await search(query, {",
		"\t\t\t\t\tprovider: resolvedProvider,",
		"\t\t\t\t});",
		"}",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("index.ts", input);

	assert.match(patched, /const SEARCH_CALL_TIMEOUT_MS = 90000;/);
	assert.match(patched, /async function searchWithDeadline\(/);
	assert.match(patched, /await searchWithDeadline\(queryList\[qi\], \{/);
	assert.match(patched, /await searchWithDeadline\(query, \{/);
	assert.doesNotMatch(patched, /await search\(/);

	const twice = patchPiWebAccessSource("index.ts", patched);
	assert.equal(twice, patched);
});

test("patchPiWebAccessSource enforces a curator browser-connect deadline in curator-server.ts", () => {
	const input = [
		"const STALE_THRESHOLD_MS = 30000;",
		"const WATCHDOG_INTERVAL_MS = 5000;",
		"",
		"\t\t\twatchdog = setInterval(() => {",
		"\t\t\t\tif (completed || !browserConnected) return;",
		"\t\t\t\tif (Date.now() - lastHeartbeatAt <= STALE_THRESHOLD_MS) return;",
		"\t\t\t\tif (!markCompleted()) return;",
		'\t\t\t\tsetImmediate(() => callbacks.onCancel("stale"));',
		"\t\t\t}, WATCHDOG_INTERVAL_MS);",
		"",
	].join("\n");

	const patched = patchPiWebAccessSource("curator-server.ts", input);

	assert.match(patched, /const BROWSER_CONNECT_TIMEOUT_MS = 120000;/);
	assert.match(patched, /const serverStartedAt = Date\.now\(\);/);
	assert.match(patched, /Date\.now\(\) - serverStartedAt <= BROWSER_CONNECT_TIMEOUT_MS/);
	assert.doesNotMatch(patched, /if \(completed \|\| !browserConnected\) return;/);

	const twice = patchPiWebAccessSource("curator-server.ts", patched);
	assert.equal(twice, patched);
});
