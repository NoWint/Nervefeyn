import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { loadEegdsSettings, resetEegdsHealthCache, eegdsHealthCheck } from "../extensions/research-tools/eegds-connector.js";

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
