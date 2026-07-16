import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadEegdsSettings, resetEegdsHealthCache, eegdsHealthCheck, appendEegdsProvenance, validateWorkspaceFile, writeEegdsResultFile, handleEegdsAction, registerEegdsConnector } from "../extensions/research-tools/eegds-connector.js";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

const originalFetch = globalThis.fetch;
const originalEnvUrl = process.env.NERVEFEYN_EEGDS_URL;
const originalEnvTimeout = process.env.NERVEFEYN_EEGDS_TIMEOUT_MS;

beforeEach(() => {
	delete process.env.NERVEFEYN_EEGDS_URL;
	delete process.env.NERVEFEYN_EEGDS_TIMEOUT_MS;
	resetEegdsHealthCache();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalEnvUrl === undefined) delete process.env.NERVEFEYN_EEGDS_URL;
	else process.env.NERVEFEYN_EEGDS_URL = originalEnvUrl;
	if (originalEnvTimeout === undefined) delete process.env.NERVEFEYN_EEGDS_TIMEOUT_MS;
	else process.env.NERVEFEYN_EEGDS_TIMEOUT_MS = originalEnvTimeout;
	resetEegdsHealthCache();
});

test("loadEegdsSettings returns defaults when no settings file and no env", () => {
	const settings = loadEegdsSettings();
	assert.equal(settings.baseUrl, "http://localhost:18765");
	assert.equal(settings.timeoutMs, 60_000);
	assert.equal(settings.batchPollIntervalMs, 2_000);
	assert.equal(settings.batchMaxPollMs, 900_000);
	assert.equal(settings.autoHealthCheck, true);
});

test("loadEegdsSettings respects NERVEFEYN_EEGDS_URL env override", () => {
	process.env.NERVEFEYN_EEGDS_URL = "http://eegds.local:9000";
	const settings = loadEegdsSettings();
	assert.equal(settings.baseUrl, "http://eegds.local:9000");
});

test("loadEegdsSettings respects NERVEFEYN_EEGDS_TIMEOUT_MS env override", () => {
	process.env.NERVEFEYN_EEGDS_TIMEOUT_MS = "120000";
	const settings = loadEegdsSettings();
	assert.equal(settings.timeoutMs, 120_000);
});

test("eegdsHealthCheck returns ok with latencyMs when status endpoint 200", async () => {
	let called = 0;
	globalThis.fetch = async (input, init) => {
		called++;
		const url = new URL(String(input));
		assert.equal(url.origin, "http://localhost:18765");
		assert.equal(url.pathname, "/api/neurolink/status");
		return jsonResponse({ connected: false });
	};
	const result = await eegdsHealthCheck();
	assert.equal(result.ok, true);
	assert.equal(typeof result.latencyMs, "number");
	assert.equal(called, 1);
});

test("eegdsHealthCheck returns eegds_not_running on fetch reject", async () => {
	globalThis.fetch = async () => { throw new Error("ECONNREFUSED"); };
	const result = await eegdsHealthCheck();
	assert.equal(result.ok, false);
	assert.equal(result.error, "eegds_not_running");
	assert.match(result.message, /start\.command/);
});

test("eegdsHealthCheck 5min cache: second call within TTL does not fetch", async () => {
	let called = 0;
	globalThis.fetch = async () => { called++; return jsonResponse({ connected: false }); };
	await eegdsHealthCheck();
	await eegdsHealthCheck();
	assert.equal(called, 1);
});

test("eegdsHealthCheck 2s timeout fires eegds_timeout", async () => {
	globalThis.fetch = async (_input, init) => {
		const signal = (init as { signal?: AbortSignal } | undefined)?.signal;
		if (signal) {
			// Simulate abort firing after the 2s timeout window — emit a synthetic AbortError.
			return new Promise((_resolve, reject) => {
				const t = setTimeout(() => reject(new DOMException("aborted", "AbortError")), 50);
				signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("aborted", "AbortError")); });
			});
		}
		throw new Error("no signal");
	};
	const result = await eegdsHealthCheck({ timeoutMs: 20 });
	assert.equal(result.ok, false);
	assert.equal(result.error, "eegds_timeout");
});

test("appendEegdsProvenance creates sidecar and appends entries with local timezone", () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-prov-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		appendEegdsProvenance("flow-recovery-s01", {
			timestamp: "2026-07-15T14:32:11+08:00",
			action: "analyze",
			endpoint: "POST /api/analyze",
			params: { subject: "S01" },
			summary: { recovery_time_sec: 42.3 },
			verification: "unverified",
			resultFile: "outputs/flow-recovery-s01/eegds-results.json",
		});
		appendEegdsProvenance("flow-recovery-s01", {
			timestamp: "2026-07-15T14:35:02+08:00",
			action: "neurolink_dashboard",
			endpoint: "GET /api/neurolink/dashboard",
			params: {},
			summary: { connected: true },
			verification: "inferred",
		});
		const sidecar = join(dir, "outputs", "flow-recovery-s01.provenance.md");
		assert.equal(existsSync(sidecar), true);
		const text = readFileSync(sidecar, "utf8");
		assert.match(text, /# EEGDataScience Provenance — flow-recovery-s01/);
		assert.match(text, /## 2026-07-15T14:32:11\+08:00 — analyze/);
		assert.match(text, /## 2026-07-15T14:35:02\+08:00 — neurolink_dashboard/);
		assert.match(text, /verification: unverified/);
		assert.match(text, /verification: inferred/);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("appendEegdsProvenance uses default slug 'eegds-default' when slug is empty", () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-prov-default-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		appendEegdsProvenance("", {
			timestamp: "2026-07-15T14:32:11+08:00",
			action: "health_check",
			endpoint: "GET /api/neurolink/status",
			params: {},
			verification: "verified",
		});
		const sidecar = join(dir, "outputs", "eegds-default.provenance.md");
		assert.equal(existsSync(sidecar), true);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("validateWorkspaceFile rejects path outside workspace", () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-ws-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const outside = join(dir, "..", "..", "etc", "passwd");
		const result = validateWorkspaceFile(outside);
		assert.equal(result.ok, false);
		assert.equal(result.error, "file_outside_workspace");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("validateWorkspaceFile rejects non-existent file", () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-ws-2-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const result = validateWorkspaceFile(join(dir, "missing.csv"));
		assert.equal(result.ok, false);
		assert.equal(result.error, "file_not_found");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("writeEegdsResultFile writes JSON to outputs/<slug>/ and returns relative path", () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-write-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const rel = writeEegdsResultFile("batch-20260715", "eegds-batch-progress.json", { status: "done" });
		assert.equal(rel, "outputs/batch-20260715/eegds-batch-progress.json");
		const text = readFileSync(join(dir, rel), "utf8");
		assert.equal(JSON.parse(text).status, "done");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction health_check success returns ok with baseUrl and latencyMs", async () => {
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
		throw new Error("unexpected");
	};
	const result = await handleEegdsAction({ action: "health_check" });
	assert.equal(result.ok, true);
	assert.equal(result.baseUrl, "http://localhost:18765");
	assert.equal(typeof result.latencyMs, "number");
});

test("handleEegdsAction analyze success extracts summary and lands results.json + provenance", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-analyze-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		// Create the source CSV inside workspace
		const csvRel = "data/recordings/test.csv";
		const csvAbs = join(dir, csvRel);
		ensureTestDir(join(dir, "data/recordings"));
		writeTestFile(csvAbs, "time,ch1,ch2\n0,1,2\n");

		let uploadSeen = false;
		let analyzeSeen = false;
		globalThis.fetch = async (input, init) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
			if (url.pathname === "/api/upload") {
				uploadSeen = true;
				return jsonResponse({ filepath: "test.csv", format: "csv", n_channels: 2, fs: 120 });
			}
			if (url.pathname === "/api/analyze") {
				analyzeSeen = true;
				return jsonResponse({
					recovery_time_sec: 42.3,
					flow_index: 0.68,
					band_powers: { delta: 10, theta: 8, alpha: 12, beta: 6, gamma: 2 },
					focus_avg: 0.71,
					artifact_ratio: 0.07,
					conditions: ["AtoA"],
					viz_data: { huge: new Array(1000).fill(0) },
					topomap_data: { huge: new Array(800).fill(0) },
				});
			}
			throw new Error(`unexpected ${url.pathname}`);
		};
		const result = await handleEegdsAction({ action: "analyze", filepath: csvRel, slug: "flow-s01", subject: "S01", condition: "AtoA" });
		assert.equal(result.ok, true);
		assert.equal(uploadSeen, true);
		assert.equal(analyzeSeen, true);
		assert.equal(result.recovery_time_sec, 42.3);
		assert.equal(result.flow_index, 0.68);
		assert.equal(result.focus_avg, 0.71);
		assert.equal(result.artifact_ratio, 0.07);
		assert.equal(result.results_file, "outputs/flow-s01/eegds-results.json");
		assert.equal(existsSync(join(dir, result.results_file)), true);
		const sidecar = join(dir, "outputs", "flow-s01.provenance.md");
		assert.equal(existsSync(sidecar), true);
		assert.match(readFileSync(sidecar, "utf8"), /## .* — analyze/);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction analyze file_not_found", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-analyze-404-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		globalThis.fetch = async () => jsonResponse({ connected: false }); // only status endpoint called
		const result = await handleEegdsAction({ action: "analyze", filepath: "missing.csv" });
		assert.equal(result.ok, false);
		assert.equal(result.error, "file_not_found");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction analyze file_outside_workspace", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-analyze-outside-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		globalThis.fetch = async () => jsonResponse({ connected: false });
		const result = await handleEegdsAction({ action: "analyze", filepath: "../../etc/passwd" });
		assert.equal(result.ok, false);
		assert.equal(result.error, "file_outside_workspace");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction analyze eegds_http_error on 500", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-analyze-500-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const csvAbs = join(dir, "data.csv");
		writeTestFile(csvAbs, "time,ch1\n0,1\n");
		globalThis.fetch = async (input) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
			if (url.pathname === "/api/upload") return jsonResponse({ filepath: "data.csv", format: "csv", n_channels: 1, fs: 120 });
			if (url.pathname === "/api/analyze") return new Response("internal error", { status: 500 });
			throw new Error("unexpected");
		};
		const result = await handleEegdsAction({ action: "analyze", filepath: "data.csv" });
		assert.equal(result.ok, false);
		assert.equal(result.error, "eegds_http_error");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction neurolink_dashboard success with connected:false", async () => {
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
		if (url.pathname === "/api/neurolink/dashboard") return jsonResponse({ connected: false, flow_state: "idle", flow_index: 0, buffer_duration_sec: 0, last_analysis: { has_results: false }, auto_analysis: { enabled: false, interval: 0 } });
		throw new Error("unexpected");
	};
	const result = await handleEegdsAction({ action: "neurolink_dashboard", slug: "live" });
	assert.equal(result.ok, true);
	assert.equal(result.connected, false);
	assert.equal(result.flow_state, "idle");
});

test("handleEegdsAction neurolink_recent_eeg lands samples to file, return only path", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-recent-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const samples = new Array(1200).fill(0).map((_, i) => [i, i % 4]);
		globalThis.fetch = async (input) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
			if (url.pathname === "/api/neurolink/recent-eeg") return jsonResponse({ ok: true, fs: 120, n_samples: 1200, duration_sec: 10, samples });
			throw new Error("unexpected");
		};
		const result = await handleEegdsAction({ action: "neurolink_recent_eeg", slug: "recent", n_samples: 1200 });
		assert.equal(result.ok, true);
		assert.equal(result.fs, 120);
		assert.equal(result.n_samples, 1200);
		assert.equal(result.samples_file, "outputs/recent/eegds-recent-eeg.json");
		assert.equal(existsSync(join(dir, result.samples_file)), true);
		assert.equal((result as { samples?: unknown }).samples, undefined);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction batch_analyze returns immediately with batch_id, does not block", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-batch-start-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const f1 = join(dir, "data", "a.csv");
		const f2 = join(dir, "data", "b.csv");
		ensureTestDir(join(dir, "data"));
		writeTestFile(f1, "time,ch1\n0,1\n");
		writeTestFile(f2, "time,ch1\n0,1\n");
		globalThis.fetch = async (input) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
			if (url.pathname === "/api/batch-analyze") return jsonResponse({ ok: true, batch_id: "batch-001", total: 2, status: "running" });
			throw new Error("unexpected");
		};
		const result = await handleEegdsAction({
			action: "batch_analyze",
			slug: "batch-20260715",
			files: ["data/a.csv", "data/b.csv"],
			assignments: [
				{ filename: "a.csv", subject: "S01", condition: "AtoA" },
				{ filename: "b.csv", subject: "S01", condition: "AtoB" },
			],
		});
		assert.equal(result.ok, true);
		assert.equal(result.batch_id, "batch-001");
		assert.equal(result.total, 2);
		assert.equal(result.status, "running");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction batch_analyze rejects files/assignments length mismatch", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-batch-mismatch-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const result = await handleEegdsAction({
			action: "batch_analyze",
			files: ["a.csv"],
			assignments: [],
		});
		assert.equal(result.ok, false);
		assert.equal(result.error, "batch_assignment_mismatch");
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction batch_progress parses running / done / failed and lands snapshot", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-batch-progress-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const states: Array<{ status: string; current: number; total: number }> = [
			{ status: "running", current: 1, total: 3 },
			{ status: "done", current: 3, total: 3 },
		];
		for (const expected of states) {
			globalThis.fetch = async (input) => {
				const url = new URL(String(input));
				if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
				if (url.pathname.startsWith("/api/batch-progress/")) return jsonResponse({ ok: true, ...expected, current_file: "x.csv", current_module: "flow_recovery", errors: [] });
				throw new Error("unexpected");
			};
			const result = await handleEegdsAction({ action: "batch_progress", batch_id: "batch-001", slug: "batch-20260715" });
			assert.equal(result.ok, true);
			assert.equal(result.status, expected.status);
			assert.equal(result.current, expected.current);
			assert.equal(result.progress_file, "outputs/batch-20260715/eegds-batch-progress.json");
		}
		assert.equal(existsSync(join(dir, "outputs", "batch-20260715", "eegds-batch-progress.json")), true);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction batch_report lands ZIP binary to file", async () => {
	const dir = mkdtempSync(join(tmpdir(), "eegds-batch-zip-"));
	const origCwd = process.cwd();
	try {
		process.chdir(dir);
		const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
		globalThis.fetch = async (input) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
			if (url.pathname === "/api/export-batch-report") return new Response(zipBytes, { status: 200, headers: { "content-type": "application/zip" } });
			throw new Error("unexpected");
		};
		const result = await handleEegdsAction({ action: "batch_report", batch_id: "batch-001", slug: "batch-20260715" });
		assert.equal(result.ok, true);
		assert.equal(result.zip_file, "outputs/batch-20260715/eegds-batch-report.zip");
		assert.equal(existsSync(join(dir, result.zip_file)), true);
	} finally {
		process.chdir(origCwd);
		rmSync(dir, { recursive: true, force: true });
	}
});

test("handleEegdsAction realtime_start synthetic succeeds without hardware params", async () => {
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
		if (url.pathname === "/api/realtime/start") return jsonResponse({ ok: true, board_id: "synthetic", board_name: "Synthetic Board", fs: 250, channels: 8, n_exg: 8 });
		throw new Error("unexpected");
	};
	const result = await handleEegdsAction({ action: "realtime_start", board_id: "synthetic" });
	assert.equal(result.ok, true);
	assert.equal(result.board_id, "synthetic");
});

test("handleEegdsAction realtime_start cyton missing serial_port returns missing_hardware_params without HTTP", async () => {
	let realtimeCalled = false;
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
		if (url.pathname === "/api/realtime/start") { realtimeCalled = true; return jsonResponse({ ok: true }); }
		throw new Error("unexpected");
	};
	const result = await handleEegdsAction({ action: "realtime_start", board_id: "cyton" });
	assert.equal(result.ok, false);
	assert.equal(result.error, "missing_hardware_params");
	assert.equal(realtimeCalled, false);
});

// Test helpers used by multiple tests
function ensureTestDir(path: string): void {
	if (!existsSync(path)) mkdirSync(path, { recursive: true });
}
function writeTestFile(path: string, content: string): void {
	ensureTestDir(dirname(path));
	writeFileSync(path, content);
}

test("registerEegdsConnector registers a tool named 'feynman_eegds' with 11-action schema", () => {
	const registered: Array<{ name: string; parameters: unknown }> = [];
	const fakePi = {
		registerTool(tool: { name: string; parameters: unknown }) {
			registered.push({ name: tool.name, parameters: tool.parameters });
		},
		on() {},
	} as unknown as ExtensionAPI;
	registerEegdsConnector(fakePi);
	assert.equal(registered.length, 1);
	assert.equal(registered[0].name, "feynman_eegds");
	// Verify the action schema includes all 11 actions
	const params = registered[0].parameters as { properties: { action: { enum?: string[] } } };
	const actions = params.properties?.action?.enum ?? [];
	assert.equal(actions.length, 11);
	assert.ok(actions.includes("health_check"));
	assert.ok(actions.includes("analyze"));
	assert.ok(actions.includes("neurolink_dashboard"));
	assert.ok(actions.includes("neurolink_last_analysis"));
	assert.ok(actions.includes("neurolink_recent_eeg"));
	assert.ok(actions.includes("batch_analyze"));
	assert.ok(actions.includes("batch_progress"));
	assert.ok(actions.includes("batch_report"));
	assert.ok(actions.includes("realtime_status"));
	assert.ok(actions.includes("realtime_start"));
	assert.ok(actions.includes("realtime_stop"));
});

test("registerEegdsConnector execute routes to handleEegdsAction", async () => {
	const captured: { value: { name: string; execute: (id: string, params: Record<string, unknown>) => Promise<unknown> } | null } = { value: null };
	const fakePi = {
		registerTool(tool: { name: string; execute: (id: string, params: Record<string, unknown>) => Promise<unknown> }) {
			captured.value = { name: tool.name, execute: tool.execute };
		},
		on() {},
	} as unknown as ExtensionAPI;
	registerEegdsConnector(fakePi);
	assert.equal(captured.value?.name, "feynman_eegds");
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/neurolink/status") return jsonResponse({ connected: false });
		throw new Error("unexpected");
	};
	const result = await captured.value!.execute("call-1", { action: "health_check" });
	const r = result as { content: Array<{ type: string; text: string }>; details: Record<string, unknown> };
	assert.equal(r.content[0].type, "text");
	assert.equal(r.details.ok, true);
});
