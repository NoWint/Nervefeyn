import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { loadEegdsSettings, resetEegdsHealthCache, eegdsHealthCheck, appendEegdsProvenance, validateWorkspaceFile, writeEegdsResultFile, handleEegdsAction } from "../extensions/research-tools/eegds-connector.js";

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

// Test helpers used by multiple tests
function ensureTestDir(path: string): void {
	if (!existsSync(path)) mkdirSync(path, { recursive: true });
}
function writeTestFile(path: string, content: string): void {
	ensureTestDir(dirname(path));
	writeFileSync(path, content);
}
