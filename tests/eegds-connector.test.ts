import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { loadEegdsSettings, resetEegdsHealthCache } from "../extensions/research-tools/eegds-connector.js";

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
