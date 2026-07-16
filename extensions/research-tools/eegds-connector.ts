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

type EegdsActionParams = {
	action: EegdsAction;
	slug?: string;
	filepath?: string;
	subject?: string;
	condition?: string;
	hp?: number;
	lp?: number;
	notch?: number;
	window_sec?: number;
	tolerance?: number;
	n_samples?: number;
	files?: string[];
	assignments?: Array<{ filename: string; subject: string; condition: string }>;
	batch_id?: string;
	board_id?: "synthetic" | "cyton" | "daisy" | "ganglion";
	serial_port?: string;
	mac_address?: string;
};

async function parseJsonSafe(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		const text = await response.text().catch(() => "");
		throw new Error(`Failed to parse EEGDataScience response: ${text.slice(0, 200)}`);
	}
}

async function handleHealthCheck(_params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const check = await eegdsHealthCheck({ force: true });
	if (!check.ok) {
		appendEegdsProvenance(slug, {
			timestamp: localIsoTimestamp(),
			action: "health_check",
			endpoint: "GET /api/neurolink/status",
			params: {},
			verification: "blocked",
			error: check.error,
		});
		return check;
	}
	appendEegdsProvenance(slug, {
		timestamp: localIsoTimestamp(),
		action: "health_check",
		endpoint: "GET /api/neurolink/status",
		params: {},
		summary: { baseUrl: check.baseUrl, latencyMs: check.latencyMs },
		verification: "verified",
	});
	return { ok: true, baseUrl: check.baseUrl, latencyMs: check.latencyMs };
}

async function handleAnalyze(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const filepath = params.filepath;
	if (!filepath) {
		return { ok: false, error: "eegds_http_error", message: "analyze requires filepath" };
	}
	const validation = validateWorkspaceFile(filepath);
	if (!validation.ok) {
		appendEegdsProvenance(slug, {
			timestamp: localIsoTimestamp(),
			action: "analyze",
			endpoint: "POST /api/upload + POST /api/analyze",
			params: { filepath },
			verification: "blocked",
			error: validation.error,
		});
		return validation;
	}
	const healthErr = await ensureHealthy();
	if (healthErr) {
		appendEegdsProvenance(slug, {
			timestamp: localIsoTimestamp(),
			action: "analyze",
			endpoint: "POST /api/upload + POST /api/analyze",
			params: { filepath },
			verification: "blocked",
			error: healthErr.error,
		});
		return healthErr;
	}
	const fileBuffer = readFileSync(validation.absPath);
	// 1) multipart upload
	const uploadBoundary = `eegds-${randomUUID()}`;
	const uploadBody = new Uint8Array([
		...new TextEncoder().encode(`--${uploadBoundary}\r\nContent-Disposition: form-data; name="file"; filename="${resolvePath(filepath).split("/").pop()}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
		...fileBuffer,
		...new TextEncoder().encode(`\r\n--${uploadBoundary}--\r\n`),
	]);
	const uploadUrl = new URL("/api/upload", settings.baseUrl);
	const uploadRes = await eegdsFetch(uploadUrl, {
		method: "POST",
		headers: { "content-type": `multipart/form-data; boundary=${uploadBoundary}` },
		body: uploadBody,
	});
	if (!uploadRes.ok) {
		const body = await uploadRes.text().catch(() => "");
		const err = { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${uploadRes.status}: ${body.slice(0, 200)}` } as EegdsError;
		appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "analyze", endpoint: "POST /api/upload", params: { filepath }, verification: "blocked", error: err.message });
		return err;
	}
	const uploadJson = await parseJsonSafe(uploadRes) as Record<string, unknown>;
	// 2) POST /api/analyze with filters + upload metadata
	const analyzeBody = {
		filepath: uploadJson.filepath ?? resolvePath(filepath).split("/").pop(),
		format: uploadJson.format,
		subject: params.subject,
		condition: params.condition,
		hp: params.hp,
		lp: params.lp,
		notch: params.notch,
		window_sec: params.window_sec,
		tolerance: params.tolerance,
	};
	const analyzeUrl = new URL("/api/analyze", settings.baseUrl);
	const analyzeRes = await eegdsFetch(analyzeUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(analyzeBody),
	});
	if (!analyzeRes.ok) {
		const body = await analyzeRes.text().catch(() => "");
		const err = { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${analyzeRes.status}: ${body.slice(0, 200)}` } as EegdsError;
		appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "analyze", endpoint: "POST /api/analyze", params: analyzeBody, verification: "blocked", error: err.message });
		return err;
	}
	const raw = await parseJsonSafe(analyzeRes) as Record<string, unknown>;
	const resultsFile = writeEegdsResultFile(slug, "eegds-results.json", JSON.stringify(raw, null, 2));
	const bandPowers = (raw.band_powers ?? {}) as Record<string, number>;
	const summary: Record<string, unknown> = {
		recovery_time_sec: raw.recovery_time_sec,
		flow_index: raw.flow_index,
		band_powers: {
			delta: bandPowers.delta,
			theta: bandPowers.theta,
			alpha: bandPowers.alpha,
			beta: bandPowers.beta,
			gamma: bandPowers.gamma,
		},
		focus_avg: raw.focus_avg,
		artifact_ratio: raw.artifact_ratio,
		conditions: raw.conditions,
		results_file: resultsFile,
	};
	appendEegdsProvenance(slug, {
		timestamp: localIsoTimestamp(),
		action: "analyze",
		endpoint: "POST /api/upload + POST /api/analyze",
		params: analyzeBody,
		sourceFile: filepath,
		resultFile: resultsFile,
		summary,
		verification: "unverified",
	});
	return { ok: true, ...summary };
}

async function handleNeurolinkDashboard(_params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/neurolink/dashboard", settings.baseUrl);
	const res = await eegdsFetch(url, { method: "GET" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const summary: Record<string, unknown> = {
		connected: raw.connected,
		flow_state: raw.flow_state,
		flow_index: raw.flow_index,
		buffer_duration_sec: raw.buffer_duration_sec,
		last_analysis: raw.last_analysis,
		auto_analysis: raw.auto_analysis,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "neurolink_dashboard", endpoint: "GET /api/neurolink/dashboard", params: {}, summary, verification: "inferred" });
	return { ok: true, ...summary };
}

async function handleNeurolinkLastAnalysis(_params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/neurolink/last-analysis", settings.baseUrl);
	const res = await eegdsFetch(url, { method: "GET" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const resultsFile = writeEegdsResultFile(slug, "eegds-last-analysis.json", JSON.stringify(raw, null, 2));
	const summary: Record<string, unknown> = {
		results_summary: raw.results_summary ?? raw.summary,
		timestamp: raw.timestamp,
		duration: raw.duration,
		error: raw.error,
		running: raw.running,
		results_file: resultsFile,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "neurolink_last_analysis", endpoint: "GET /api/neurolink/last-analysis", params: {}, summary, verification: "inferred", resultFile: resultsFile });
	return { ok: true, ...summary };
}

async function handleNeurolinkRecentEeg(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const nSamples = Math.max(1, Math.min(params.n_samples ?? 1200, 5000));
	const url = new URL("/api/neurolink/recent-eeg", settings.baseUrl);
	url.searchParams.set("n", String(nSamples));
	const res = await eegdsFetch(url, { method: "GET" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const samplesFile = writeEegdsResultFile(slug, "eegds-recent-eeg.json", JSON.stringify(raw, null, 2));
	const summary: Record<string, unknown> = {
		fs: raw.fs,
		n_samples: raw.n_samples,
		duration_sec: raw.duration_sec,
		samples_file: samplesFile,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "neurolink_recent_eeg", endpoint: `GET /api/neurolink/recent-eeg?n=${nSamples}`, params: { n_samples: nSamples }, summary, verification: "inferred", resultFile: samplesFile });
	return { ok: true, ...summary };
}

async function handleBatchAnalyze(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const files = params.files ?? [];
	const assignments = params.assignments ?? [];
	if (files.length !== assignments.length) {
		const err: EegdsError = { ok: false, error: "batch_assignment_mismatch", message: `files count (${files.length}) != assignments count (${assignments.length})` };
		appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "batch_analyze", endpoint: "POST /api/batch-analyze", params: { files, assignments }, verification: "blocked", error: err.message });
		return err;
	}
	// Validate all files in workspace
	for (const f of files) {
		const v = validateWorkspaceFile(f);
		if (!v.ok) {
			appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "batch_analyze", endpoint: "POST /api/batch-analyze", params: { files, assignments }, verification: "blocked", error: v.error });
			return v;
		}
	}
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	// Build multipart with all files + assignments JSON
	const boundary = `eegds-${randomUUID()}`;
	const parts: Uint8Array[] = [];
	for (let i = 0; i < files.length; i++) {
		const abs = (validateWorkspaceFile(files[i]) as { ok: true; absPath: string }).absPath;
		const buf = readFileSync(abs);
		const filename = resolvePath(files[i]).split("/").pop() ?? `file-${i}`;
		parts.push(new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
		parts.push(buf);
		parts.push(new TextEncoder().encode("\r\n"));
	}
	parts.push(new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="assignments"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(assignments)}\r\n`));
	parts.push(new TextEncoder().encode(`--${boundary}--\r\n`));
	const totalLen = parts.reduce((n, p) => n + p.length, 0);
	const body = new Uint8Array(totalLen);
	let offset = 0;
	for (const p of parts) { body.set(p, offset); offset += p.length; }
	const url = new URL("/api/batch-analyze", settings.baseUrl);
	const res = await eegdsFetch(url, {
		method: "POST",
		headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
		body,
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${text.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const summary: Record<string, unknown> = {
		batch_id: raw.batch_id,
		total: raw.total,
		status: raw.status ?? "running",
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "batch_analyze", endpoint: "POST /api/batch-analyze", params: { files, assignments }, summary, verification: "unverified" });
	return { ok: true, ...summary };
}

async function handleBatchProgress(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const batchId = params.batch_id;
	if (!batchId) return { ok: false, error: "eegds_http_error", message: "batch_progress requires batch_id" };
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL(`/api/batch-progress/${encodeURIComponent(batchId)}`, settings.baseUrl);
	const res = await eegdsFetch(url, { method: "GET" });
	if (res.status === 404) return { ok: false, error: "batch_not_found", message: `batch_id ${batchId} not found` };
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	// Spec §4.1: write a batch_progress snapshot to outputs/<slug>/eegds-batch-progress.json
	const progressFile = writeEegdsResultFile(slug, "eegds-batch-progress.json", JSON.stringify(raw, null, 2));
	const summary: Record<string, unknown> = {
		total: raw.total,
		current: raw.current,
		current_file: raw.current_file,
		current_module: raw.current_module,
		status: raw.status,
		errors: raw.errors ?? [],
		progress_file: progressFile,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "batch_progress", endpoint: `GET /api/batch-progress/${batchId}`, params: { batch_id: batchId }, summary, verification: "inferred", resultFile: progressFile });
	return { ok: true, ...summary };
}

async function handleBatchReport(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const batchId = params.batch_id;
	if (!batchId) return { ok: false, error: "eegds_http_error", message: "batch_report requires batch_id" };
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/export-batch-report", settings.baseUrl);
	url.searchParams.set("batch_id", batchId);
	const res = await eegdsFetch(url, { method: "GET" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const zipBytes = new Uint8Array(await res.arrayBuffer());
	const zipFile = writeEegdsResultFile(slug, "eegds-batch-report.zip", zipBytes);
	const summary: Record<string, unknown> = { zip_file: zipFile, batch_id: batchId };
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "batch_report", endpoint: `GET /api/export-batch-report?batch_id=${batchId}`, params: { batch_id: batchId }, summary, verification: "unverified", resultFile: zipFile });
	return { ok: true, ...summary };
}

async function handleRealtimeStatus(_params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/realtime/status", settings.baseUrl);
	const res = await eegdsFetch(url, { method: "GET" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const summary: Record<string, unknown> = {
		state: raw.state,
		board_name: raw.board_name,
		fs: raw.fs,
		channels: raw.channels,
		n_clients: raw.n_clients,
		elapsed_sec: raw.elapsed_sec,
		packets_lost: raw.packets_lost,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "realtime_status", endpoint: "GET /api/realtime/status", params: {}, summary, verification: "inferred" });
	return { ok: true, ...summary };
}

async function handleRealtimeStart(params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const boardId = params.board_id;
	if (!boardId) return { ok: false, error: "eegds_http_error", message: "realtime_start requires board_id" };
	if (boardId !== "synthetic") {
		if (boardId === "ganglion" && !params.mac_address) {
			const err: EegdsError = { ok: false, error: "missing_hardware_params", message: `board_id=${boardId} requires mac_address` };
			appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "realtime_start", endpoint: "POST /api/realtime/start", params: { board_id: boardId }, verification: "blocked", error: err.message });
			return err;
		}
		if ((boardId === "cyton" || boardId === "daisy") && !params.serial_port) {
			const err: EegdsError = { ok: false, error: "missing_hardware_params", message: `board_id=${boardId} requires serial_port` };
			appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "realtime_start", endpoint: "POST /api/realtime/start", params: { board_id: boardId }, verification: "blocked", error: err.message });
			return err;
		}
	}
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/realtime/start", settings.baseUrl);
	const res = await eegdsFetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ board_id: boardId, serial_port: params.serial_port, mac_address: params.mac_address }),
	});
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const summary: Record<string, unknown> = {
		board_id: raw.board_id,
		board_name: raw.board_name,
		fs: raw.fs,
		channels: raw.channels,
		n_exg: raw.n_exg,
	};
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "realtime_start", endpoint: "POST /api/realtime/start", params: { board_id: boardId }, summary, verification: "unverified" });
	return { ok: true, ...summary };
}

async function handleRealtimeStop(_params: EegdsActionParams, slug: string): Promise<EegdsResult> {
	const settings = loadEegdsSettings();
	const healthErr = await ensureHealthy();
	if (healthErr) return healthErr;
	const url = new URL("/api/realtime/stop", settings.baseUrl);
	const res = await eegdsFetch(url, { method: "POST" });
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		return { ok: false, error: "eegds_http_error", message: `EEGDataScience returned ${res.status}: ${body.slice(0, 200)}` };
	}
	const raw = await parseJsonSafe(res) as Record<string, unknown>;
	const summary: Record<string, unknown> = { elapsed_sec: raw.elapsed_sec };
	appendEegdsProvenance(slug, { timestamp: localIsoTimestamp(), action: "realtime_stop", endpoint: "POST /api/realtime/stop", params: {}, summary, verification: "unverified" });
	return { ok: true, ...summary };
}

export async function handleEegdsAction(params: EegdsActionParams): Promise<EegdsResult> {
	const slug = params.slug ?? "";
	try {
		switch (params.action) {
			case "health_check": return await handleHealthCheck(params, slug);
			case "analyze": return await handleAnalyze(params, slug);
			case "neurolink_dashboard": return await handleNeurolinkDashboard(params, slug);
			case "neurolink_last_analysis": return await handleNeurolinkLastAnalysis(params, slug);
			case "neurolink_recent_eeg": return await handleNeurolinkRecentEeg(params, slug);
			case "batch_analyze": return await handleBatchAnalyze(params, slug);
			case "batch_progress": return await handleBatchProgress(params, slug);
			case "batch_report": return await handleBatchReport(params, slug);
			case "realtime_status": return await handleRealtimeStatus(params, slug);
			case "realtime_start": return await handleRealtimeStart(params, slug);
			case "realtime_stop": return await handleRealtimeStop(params, slug);
			default: return { ok: false, error: "eegds_http_error", message: `Unknown action: ${params.action}` };
		}
	} catch (err) {
		// parseJsonSafe throws Error("Failed to parse EEGDataScience response: <snippet>") — convert to eegds_parse_error.
		const message = err instanceof Error ? err.message : String(err);
		if (message.startsWith("Failed to parse EEGDataScience response")) {
			return { ok: false, error: "eegds_parse_error", message };
		}
		return { ok: false, error: "eegds_http_error", message };
	}
}
