import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { searchOpenNeuro } from "../extensions/research-tools/science-database-eeg-openneuro.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

test("searchOpenNeuro returns standardized EEG dataset results", async () => {
	const requests: string[] = [];
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		requests.push(url.toString());
		assert.equal(url.origin, "https://openneuro.org");
		assert.equal(url.pathname, "/api/datasets");
		assert.equal(url.searchParams.get("q"), "motor imagery");
		return jsonResponse({
			results: [{
				id: "ds003116",
				latestSnapshot: {
					description: {
						Name: "Motor Imagery EEG Dataset",
						Participants: 109,
						TaskName: "Motor Imagery",
					},
				},
				license: "CC0",
			}],
		});
	};

	const result = await searchOpenNeuro({ query: "motor imagery" });
	const record = result as Record<string, unknown>;
	assert.equal(record.source, "openneuro");
	const results = record.results as unknown[];
	assert.equal(results.length, 1);
	const first = results[0] as Record<string, unknown>;
	assert.equal(first.datasetId, "openneuro:ds003116");
	assert.equal(first.title, "Motor Imagery EEG Dataset");
	assert.equal(first.subjects, 109);
	assert.equal(first.modality, "EEG");
	assert.equal(first.license, "CC0");
	assert.equal(first.url, "https://openneuro.org/datasets/ds003116");
	assert.equal(first.source, "openneuro");
	assert.equal(requests.length, 1);
});

test("searchOpenNeuro respects limit parameter", async () => {
	globalThis.fetch = async () => jsonResponse({ results: [] });
	await searchOpenNeuro({ query: "resting state", limit: 15 });
});

test("searchOpenNeuro throws on empty query", async () => {
	await assert.rejects(() => searchOpenNeuro({ query: "   " }), /non-empty query/);
});
