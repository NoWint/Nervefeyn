import assert from "node:assert/strict";
import { test } from "node:test";

import { searchTuhEeg } from "../extensions/research-tools/science-database-eeg-tuh.js";

test("searchTuhEeg matches seizure subset", async () => {
	const result = await searchTuhEeg({ query: "seizure" });
	const record = result as Record<string, unknown>;
	assert.equal(record.source, "tuheeg");
	const results = record.results as unknown[];
	assert.ok(results.length >= 1);
	const first = results[0] as Record<string, unknown>;
	assert.equal(first.source, "tuheeg");
	assert.match(first.datasetId as string, /tuh-eeg-seizure/);
});

test("searchTuhEeg matches abnormal subset", async () => {
	const result = await searchTuhEeg({ query: "abnormal" });
	const results = (result as Record<string, unknown>).results as unknown[];
	assert.ok(results.length >= 1);
	assert.match((results[0] as Record<string, unknown>).datasetId as string, /tuh-eeg-abnormal/);
});

test("searchTuhEeg returns multiple subsets for broad query 'eeg'", async () => {
	const result = await searchTuhEeg({ query: "eeg" });
	const results = (result as Record<string, unknown>).results as unknown[];
	assert.ok(results.length >= 5, "should match most TUH subsets");
});

test("searchTuhEeg throws on empty query", async () => {
	await assert.rejects(() => searchTuhEeg({ query: "" }), /non-empty query/);
});
