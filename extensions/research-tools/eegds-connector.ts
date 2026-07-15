// extensions/research-tools/eegds-connector.ts
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, basename, resolve as resolvePath, relative as relativePath } from "node:path";
import { randomUUID } from "node:crypto";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { readWorkbenchSettings, type EegdsSettings, EEGDS_DEFAULT_SETTINGS } from "../../src/workbench/settings-store.js";

export type EegdsAction =
	| "health_check"
	| "analyze"
	| "neurolink_dashboard"
	| "neurolink_last_analysis"
	| "neurolink_recent_eeg"
	| "batch_analyze"
	| "batch_progress"
	| "batch_report"
	| "realtime_status"
	| "realtime_start"
	| "realtime_stop";

export type EegdsProvenanceVerification = "verified" | "unverified" | "blocked" | "inferred";

export type EegdsProvenanceEntry = {
	timestamp: string;
	action: EegdsAction;
	endpoint: string;
	params: Record<string, unknown>;
	summary?: Record<string, unknown>;
	verification: EegdsProvenanceVerification;
	sourceFile?: string;
	resultFile?: string;
	error?: string;
	notes?: string;
};

export type EegdsError = {
	ok: false;
	error: string;
	message: string;
};

export type EegdsOk<T extends Record<string, unknown>> = { ok: true } & T;

export type EegdsResult = EegdsError | EegdsOk<Record<string, unknown>>;

// Settings loader — env vars override settings-store, which overrides defaults.
export function loadEegdsSettings(): EegdsSettings {
	const fromStore = (() => {
		try {
			return readWorkbenchSettings(process.cwd()).eegds;
		} catch {
			return EEGDS_DEFAULT_SETTINGS;
		}
	})();
	const envUrl = process.env.NERVEFEYN_EEGDS_URL?.trim();
	const envTimeout = process.env.NERVEFEYN_EEGDS_TIMEOUT_MS?.trim();
	const parsedTimeout = envTimeout && Number.isFinite(Number(envTimeout)) ? Number(envTimeout) : undefined;
	return {
		baseUrl: envUrl ?? fromStore.baseUrl,
		timeoutMs: parsedTimeout ?? fromStore.timeoutMs,
		batchPollIntervalMs: fromStore.batchPollIntervalMs,
		batchMaxPollMs: fromStore.batchMaxPollMs,
		autoHealthCheck: fromStore.autoHealthCheck,
	};
}

// Health check cache — 5min TTL, module-level.
let healthCache: { ok: true; checkedAtMs: number } | { ok: false; checkedAtMs: number; error: string } | null = null;
const HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;

export function resetEegdsHealthCache(): void {
	healthCache = null;
}

const EEGDS_STARTUP_HINT = "Start it via `bash /Users/xiatian/Desktop/EEG-Science/start.command` or set NERVEFEYN_EEGDS_URL.";

async function eegdsFetch(url: URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
	const timeoutMs = init.timeoutMs ?? loadEegdsSettings().timeoutMs;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export async function eegdsHealthCheck(opts: { timeoutMs?: number; force?: boolean } = {}): Promise<{ ok: true; baseUrl: string; latencyMs: number } | EegdsError> {
	const settings = loadEegdsSettings();
	const now = Date.now();
	if (!opts.force && healthCache && now - healthCache.checkedAtMs < HEALTH_CACHE_TTL_MS) {
		if (healthCache.ok) {
			return { ok: true, baseUrl: settings.baseUrl, latencyMs: 0 };
		}
		return { ok: false, error: "eegds_not_running", message: `EEGDataScience not reachable at ${settings.baseUrl}. ${EEGDS_STARTUP_HINT}` };
	}
	const timeoutMs = opts.timeoutMs ?? 2_000;
	const url = new URL("/api/neurolink/status", settings.baseUrl);
	const start = Date.now();
	try {
		const response = await eegdsFetch(url, { method: "GET", timeoutMs });
		if (!response.ok) {
			healthCache = { ok: false, checkedAtMs: now, error: `HTTP ${response.status}` };
			return { ok: false, error: "eegds_not_running", message: `EEGDataScience at ${settings.baseUrl} returned HTTP ${response.status}. ${EEGDS_STARTUP_HINT}` };
		}
		healthCache = { ok: true, checkedAtMs: now };
		return { ok: true, baseUrl: settings.baseUrl, latencyMs: Date.now() - start };
	} catch (err) {
		const isAbort = err instanceof DOMException && err.name === "AbortError";
		healthCache = { ok: false, checkedAtMs: now, error: isAbort ? "timeout" : "unreachable" };
		if (isAbort) {
			return { ok: false, error: "eegds_timeout", message: `Health check to ${url.toString()} timed out after ${timeoutMs}ms` };
		}
		return { ok: false, error: "eegds_not_running", message: `EEGDataScience not reachable at ${settings.baseUrl}. ${EEGDS_STARTUP_HINT}` };
	}
}

// Internal helper: ensure auto health check passes before running an action.
async function ensureHealthy(): Promise<EegdsError | null> {
	const settings = loadEegdsSettings();
	if (!settings.autoHealthCheck) return null;
	const check = await eegdsHealthCheck();
	if (!check.ok) return check;
	return null;
}

function normalizeSlug(slug: string | undefined): string {
	const clean = (slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
	return clean || "eegds-default";
}

function ensureDir(path: string): void {
	if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function workspaceRoot(): string {
	return process.cwd();
}

export function validateWorkspaceFile(filepath: string): { ok: true; absPath: string } | EegdsError {
	const root = realpathSync(workspaceRoot());
	const abs = resolvePath(root, filepath);
	// Normalize symlinks on abs: the file may not exist yet, so fall back to the
	// realpath of its parent dir + basename. This keeps workspace-root comparisons
	// correct on macOS where tmpdir() is symlinked (/var → /private/var).
	let realAbs = abs;
	try {
		realAbs = realpathSync(abs);
	} catch {
		try {
			realAbs = resolvePath(realpathSync(dirname(abs)), basename(abs));
		} catch {
			realAbs = abs;
		}
	}
	const rel = relativePath(root, realAbs);
	if (rel.startsWith("..") || rel.includes("\0")) {
		return { ok: false, error: "file_outside_workspace", message: `File ${filepath} outside workspace (security)` };
	}
	if (!existsSync(realAbs)) {
		return { ok: false, error: "file_not_found", message: `File ${filepath} not found in workspace` };
	}
	return { ok: true, absPath: realAbs };
}

export function writeEegdsResultFile(slug: string, filename: string, content: string | Uint8Array | Record<string, unknown>): string {
	const safe = normalizeSlug(slug);
	const dir = resolvePath(workspaceRoot(), "outputs", safe);
	ensureDir(dir);
	const target = resolvePath(dir, filename);
	const data = typeof content === "string" || content instanceof Uint8Array ? content : JSON.stringify(content, null, 2);
	writeFileSync(target, data);
	return `outputs/${safe}/${filename}`;
}

export function appendEegdsProvenance(slug: string, entry: EegdsProvenanceEntry): void {
	const safe = normalizeSlug(slug);
	const dir = resolvePath(workspaceRoot(), "outputs");
	ensureDir(dir);
	const sidecar = resolvePath(dir, `${safe}.provenance.md`);
	const header = existsSync(sidecar) ? "" : `# EEGDataScience Provenance — ${safe}\n\n`;
	const lines: string[] = [];
	lines.push(`## ${entry.timestamp} — ${entry.action}`);
	lines.push(`- endpoint: ${entry.endpoint}`);
	lines.push(`- params: ${JSON.stringify(entry.params)}`);
	if (entry.sourceFile) lines.push(`- source_file: ${entry.sourceFile}`);
	if (entry.resultFile) lines.push(`- result_file: ${entry.resultFile}`);
	if (entry.summary) lines.push(`- summary: ${JSON.stringify(entry.summary)}`);
	lines.push(`- verification: ${entry.verification}`);
	if (entry.error) lines.push(`- error: ${entry.error}`);
	if (entry.notes) lines.push(`- notes: ${entry.notes}`);
	lines.push("");
	appendFileSync(sidecar, `${header}${lines.join("\n")}\n`);
}

function localIsoTimestamp(): string {
	const d = new Date();
	const offsetMs = d.getTimezoneOffset() * 60_000;
	const local = new Date(d.getTime() - offsetMs);
	const tz = d.getTimezoneOffset() <= 0 ? `+${String(-d.getTimezoneOffset() / 60).padStart(2, "0")}:00` : `-${String(d.getTimezoneOffset() / 60).padStart(2, "0")}:00`;
	return local.toISOString().replace("T", "T").replace(/\.\d{3}Z$/, "") + tz;
}
