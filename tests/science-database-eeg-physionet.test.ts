import assert from "node:assert/strict";
import { test } from "node:test";

import { searchPhysioNet } from "../extensions/research-tools/science-database-eeg-physionet.js";

test("searchPhysioNet matches by keyword case-insensitively", async () => {
	const result = await searchPhysioNet({ query: "SLEEP" });
	const record = result as Record<string, unknown>;
	assert.equal(record.source, "physionet");
	const results = record.results as unknown[];
	assert.ok(results.length >= 1, "should find sleep-related datasets");
	const first = results[0] as Record<string, unknown>;
	assert.equal(first.source, "physionet");
	assert.match(first.title as string, /sleep/i);
	assert.ok(first.url as string);
});

test("searchPhysioNet matches seizure keyword", async () => {
	const result = await searchPhysioNet({ query: "seizure" });
	const results = (result as Record<string, unknown>).results as unknown[];
	assert.ok(results.length >= 1);
	const first = results[0] as Record<string, unknown>;
	assert.match((first.title as string) + " " + (first.description as string), /seizure|epilep/i);
});

test("searchPhysioNet returns empty for non-matching query", async () => {
	const result = await searchPhysioNet({ query: "xyzzynonexistent" });
	const results = (result as Record<string, unknown>).results as unknown[];
	assert.equal(results.length, 0);
});

test("searchPhysioNet throws on empty query", async () => {
	await assert.rejects(() => searchPhysioNet({ query: "  " }), /non-empty query/);
});
