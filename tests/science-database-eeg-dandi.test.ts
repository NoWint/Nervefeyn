import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { searchDandi } from "../extensions/research-tools/science-database-eeg-dandi.js";

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

test("searchDandi returns standardized EEG dataset results", async () => {
	const requests: string[] = [];
	globalThis.fetch = async (input) => {
		const url = new URL(String(input));
		requests.push(url.toString());
		assert.equal(url.origin, "https://api.dandiarchive.org");
		assert.equal(url.pathname, "/api/datasets/");
		assert.equal(url.searchParams.get("search"), "memory task");
		return jsonResponse({
			results: [{
				identifier: "000409",
				name: "Working Memory EEG",
				description: "EEG during working memory task",
				license: "CC-BY-4.0",
				version: { contact: "Jane Doe", doi: "10.48324/dandi.000409/0.230101.1234" },
			}],
		});
	};

	const result = await searchDandi({ query: "memory task" });
	const record = result as Record<string, unknown>;
	assert.equal(record.source, "dandi");
	const results = record.results as unknown[];
	assert.equal(results.length, 1);
	const first = results[0] as Record<string, unknown>;
	assert.equal(first.datasetId, "dandi:000409");
	assert.equal(first.title, "Working Memory EEG");
	assert.equal(first.license, "CC-BY-4.0");
	assert.match(first.url as string, /dandiarchive\.org\/dandiset\/000409/);
	assert.equal(first.doi, "10.48324/dandi.000409/0.230101.1234");
	assert.equal(first.source, "dandi");
	assert.equal(requests.length, 1);
});

test("searchDandi throws on empty query", async () => {
	await assert.rejects(() => searchDandi({ query: "" }), /non-empty query/);
});
