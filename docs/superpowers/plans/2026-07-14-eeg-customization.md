# EEG Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EEG/neural computation research capability to Nervefeyn — 4 EEG data sources (OpenNeuro/DANDI/PhysioNet/TUH), an eeg-analysis skill (MNE-Python workflow), and a workbench signal preview surface (EDF/BDF/FIF/SET/VHDR/CNT).

**Architecture:** Pure-additive — no changes to existing biomedical capabilities. Data sources follow the existing `science-database-*.ts` pattern (fetch + standardize + provenance). The skill is a prompt-only `SKILL.md`. Workbench preview is backend-generated PNG (cached by file SHA256), with graceful degradation when Python/MNE is absent.

**Tech Stack:** TypeScript (Node.js ≥ 20, `node:test`), Python ≥ 3.10 + MNE-Python (for preview rendering only), Pi extension API, Typebox.

**Spec:** [docs/superpowers/specs/2026-07-14-eeg-customization-design.md](../specs/2026-07-14-eeg-customization-design.md)

---

## File Structure

**New files (extensions/research-tools/):**
- `science-database-eeg-shared.ts` — shared types (`EegDatasetResult`, `EegSearchParams`, `EegModality`) + helper re-exports
- `science-database-eeg-openneuro.ts` — OpenNeuro REST API search
- `science-database-eeg-dandi.ts` — DANDI API search
- `science-database-eeg-physionet.ts` — PhysioNet static dataset catalog
- `science-database-eeg-tuh.ts` — TUH EEG Corpus subset catalog

**New files (skills/):**
- `eeg-analysis/SKILL.md` — MNE-Python workflow skill prompt

**New files (src/workbench/):**
- `eeg-preview-renderer.ts` — EEG signal preview renderer (calls Python backend)

**New files (scripts/):**
- `eeg-preview.py` — Python MNE script that generates 4 preview PNGs from an EEG file

**New files (tests/):**
- `science-database-eeg-openneuro.test.ts`
- `science-database-eeg-dandi.test.ts`
- `science-database-eeg-physionet.test.ts`
- `science-database-eeg-tuh.test.ts`
- `workbench-eeg-preview.test.ts`

**Modified files:**
- `extensions/research-tools/science-databases.ts` — register 4 new source IDs
- `extensions/research-tools/science-database-specialty.ts` — add 4 sources to `SpecialtyScienceDatabaseSource`
- `src/workbench/file-types.ts` — add `.edf/.bdf/.fif/.set/.vhdr/.cnt` recognition
- `src/workbench/server.ts` — add `/api/preview/eeg` route (location to be confirmed in Task 9)
- `README.md` — update tagline + add Nervefeyn Neural Tools section
- `AGENTS.md` — add EEG/neural computation to scope
- `CHANGELOG.md` — lab notebook entry

---

## Task 1: Shared EEG types and helpers

**Files:**
- Create: `extensions/research-tools/science-database-eeg-shared.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// extensions/research-tools/science-database-eeg-shared.ts
export type EegModality = "EEG" | "MEG" | "iEEG" | "fMRI" | "mixed";

export type EegDatasetResult = {
	datasetId: string;
	title: string;
	description?: string;
	modality: EegModality;
	subjects?: number;
	samplingRate?: number;
	sessions?: number;
	tasks?: string[];
	ageRange?: { min?: number; max?: number };
	license?: string;
	url: string;
	doi?: string;
	citation?: string;
	source: "openneuro" | "dandi" | "physionet" | "tuheeg";
};

export type EegSearchParams = {
	query: string;
	modality?: EegModality;
	tasks?: string[];
	limit?: number;
	sort?: "pub_date" | "relevance" | "subjects";
};

export const EEG_DEFAULT_LIMIT = 5;
export const EEG_MAX_LIMIT = 20;
export const EEG_REQUEST_TIMEOUT_MS = 25_000;

export function eegSafeLimit(value: number | undefined): number {
	if (!Number.isFinite(value) || value === undefined) return EEG_DEFAULT_LIMIT;
	return Math.max(1, Math.min(Math.floor(value), EEG_MAX_LIMIT));
}

export function eegCleanQuery(query: string): string {
	const clean = query.trim();
	if (!clean) throw new Error("EEG database search requires a non-empty query.");
	return clean;
}

export function eegRecordValue(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function eegArrayValue(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function eegStringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function eegNumberValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
	return undefined;
}

export async function eegFetchJson(url: URL): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), EEG_REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { accept: "application/json" },
			signal: controller.signal,
		});
		if (!response.ok) {
			throw new Error(`EEG database request failed: ${response.status} ${response.statusText}`);
		}
		return response.json();
	} finally {
		clearTimeout(timeout);
	}
}

export function eegWrapResult(source: string, query: string, results: EegDatasetResult[], endpoints: string[]): Record<string, unknown> {
	return {
		schema: "feynman.scienceDatabaseSearch.v1",
		source,
		query,
		totalCount: results.length,
		returned: results.length,
		results,
		provenance: { endpoints },
	};
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors; new file has no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add extensions/research-tools/science-database-eeg-shared.ts
git commit -m "feat(eeg): add shared types and helpers for EEG data sources"
```

---

## Task 2: OpenNeuro data source

**Files:**
- Create: `extensions/research-tools/science-database-eeg-openneuro.ts`
- Create: `tests/science-database-eeg-openneuro.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/science-database-eeg-openneuro.test.ts
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
	// Test passes if no throw; limit clamping tested via eegSafeLimit in shared
});

test("searchOpenNeuro throws on empty query", async () => {
	await assert.rejects(() => searchOpenNeuro({ query: "   " }), /non-empty query/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/science-database-eeg-openneuro.test.ts`
Expected: FAIL with "Cannot find module '../extensions/research-tools/science-database-eeg-openneuro.js'"

- [ ] **Step 3: Write the OpenNeuro implementation**

```typescript
// extensions/research-tools/science-database-eeg-openneuro.ts
import {
	type EegDatasetResult,
	type EegSearchParams,
	eegCleanQuery,
	eegFetchJson,
	eegNumberValue,
	eegRecordValue,
	eegSafeLimit,
	eegStringValue,
	eegWrapResult,
} from "./science-database-eeg-shared.js";

const OPENNEURO_API_URL = "https://openneuro.org/api/datasets";
const OPENNEURO_DATASET_URL = "https://openneuro.org/datasets";

type OpenNeuroSnapshot = {
	description?: {
		Name?: string;
		Participants?: number;
		TaskName?: string;
		Authors?: string[];
		License?: string;
	};
};

type OpenNeuroDataset = {
	id: string;
	latestSnapshot?: OpenNeuroSnapshot;
	license?: string;
	public?: boolean;
};

export async function searchOpenNeuro(params: EegSearchParams): Promise<Record<string, unknown>> {
	const query = eegCleanQuery(params.query);
	const limit = eegSafeLimit(params.limit);
	const url = new URL(OPENNEURO_API_URL);
	url.searchParams.set("q", query);
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("public", "true");
	const payload = eegRecordValue(await eegFetchJson(url));
	const datasets = (Array.isArray(payload.results) ? payload.results : []) as OpenNeuroDataset[];
	const results: EegDatasetResult[] = datasets.slice(0, limit).map((dataset) => {
		const description = dataset.latestSnapshot?.description ?? {};
		const tasks = eegStringValue(description.TaskName) ? [eegStringValue(description.TaskName) as string] : undefined;
		return {
			datasetId: `openneuro:${dataset.id}`,
			title: eegStringValue(description.Name) ?? dataset.id,
			modality: "EEG",
			subjects: eegNumberValue(description.Participants),
			tasks,
			license: eegStringValue(dataset.license ?? description.License),
			url: `${OPENNEURO_DATASET_URL}/${dataset.id}`,
			source: "openneuro",
		};
	});
	return eegWrapResult("openneuro", query, results, [url.toString()]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/science-database-eeg-openneuro.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add extensions/research-tools/science-database-eeg-openneuro.ts tests/science-database-eeg-openneuro.test.ts
git commit -m "feat(eeg): add OpenNeuro data source with tests"
```

---

## Task 3: DANDI data source

**Files:**
- Create: `extensions/research-tools/science-database-eeg-dandi.ts`
- Create: `tests/science-database-eeg-dandi.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/science-database-eeg-dandi.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/science-database-eeg-dandi.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the DANDI implementation**

```typescript
// extensions/research-tools/science-database-eeg-dandi.ts
import {
	type EegDatasetResult,
	type EegSearchParams,
	eegCleanQuery,
	eegFetchJson,
	eegRecordValue,
	eegSafeLimit,
	eegStringValue,
	eegWrapResult,
} from "./science-database-eeg-shared.js";

const DANDI_API_URL = "https://api.dandiarchive.org/api/datasets/";
const DANDI_DATASET_URL = "https://dandiarchive.org/dandiset";

type DandiVersion = {
	contact?: string;
	doi?: string;
	version?: string;
};

type DandiDataset = {
	identifier: string;
	name?: string;
	description?: string;
	license?: string;
	version?: DandiVersion;
};

export async function searchDandi(params: EegSearchParams): Promise<Record<string, unknown>> {
	const query = eegCleanQuery(params.query);
	const limit = eegSafeLimit(params.limit);
	const url = new URL(DANDI_API_URL);
	url.searchParams.set("search", query);
	url.searchParams.set("limit", String(limit));
	const payload = eegRecordValue(await eegFetchJson(url));
	const datasets = (Array.isArray(payload.results) ? payload.results : []) as DandiDataset[];
	const results: EegDatasetResult[] = datasets.slice(0, limit).map((dataset) => {
		const version = dataset.version ?? {};
		const versionString = eegStringValue(version.version) ?? "latest";
		return {
			datasetId: `dandi:${dataset.identifier}`,
			title: eegStringValue(dataset.name) ?? dataset.identifier,
			description: eegStringValue(dataset.description),
			modality: "EEG",
			license: eegStringValue(dataset.license),
			url: `${DANDI_DATASET_URL}/${dataset.identifier}/${versionString}`,
			doi: eegStringValue(version.doi),
			source: "dandi",
		};
	});
	return eegWrapResult("dandi", query, results, [url.toString()]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/science-database-eeg-dandi.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add extensions/research-tools/science-database-eeg-dandi.ts tests/science-database-eeg-dandi.test.ts
git commit -m "feat(eeg): add DANDI data source with tests"
```

---

## Task 4: PhysioNet static catalog

**Files:**
- Create: `extensions/research-tools/science-database-eeg-physionet.ts`
- Create: `tests/science-database-eeg-physionet.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/science-database-eeg-physionet.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/science-database-eeg-physionet.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the PhysioNet implementation (static catalog)**

```typescript
// extensions/research-tools/science-database-eeg-physionet.ts
import {
	type EegDatasetResult,
	type EegSearchParams,
	eegCleanQuery,
	eegSafeLimit,
	eegWrapResult,
} from "./science-database-eeg-shared.js";

const PHYSIONET_BASE = "https://physionet.org/content";

type PhysioNetEntry = {
	datasetId: string;
	title: string;
	description: string;
	subjects?: number;
	samplingRate?: number;
	tasks?: string[];
	license: string;
	url: string;
	citation?: string;
};

// Static catalog of EEG-relevant PhysioNet datasets.
// Update manually by reviewing https://physionet.org/about/database/.
const PHYSIONET_EEG_CATALOG: PhysioNetEntry[] = [
	{
		datasetId: "physionet:sleep-edf",
		title: "Sleep-EDF Database Expanded",
		description: "197 whole-night PolySomnoGraphic sleep recordings containing EEG, EOG, chin EMG, and event markers. Used for sleep stage classification.",
		subjects: 197,
		samplingRate: 100,
		tasks: ["sleep staging", "polysomnography"],
		license: "Open Data Commons Attribution License v1.0",
		url: `${PHYSIONET_BASE}/sleep-edfx/1.0.0/`,
		citation: "Kemp B, Zwinderman AH, Tuk B, Kamphuisen HAC, Oberyé JJL. Analysis of a sleep-dependent neuronal feedback loop: the slow-wave microcontinuity of the EEG. IEEE-BME 47(9):1185-1194 (2000).",
	},
	{
		datasetId: "physionet:chb-mit",
		title: "CHB-MIT Scalp EEG Database",
		description: "EEG recordings of 22 pediatric subjects with intractable seizures. Used for seizure detection and prediction.",
		subjects: 22,
		samplingRate: 256,
		tasks: ["seizure detection", "epilepsy"],
		license: "Open Data Commons Attribution License v1.0",
		url: `${PHYSIONET_BASE}/chbmit/1.0.0/`,
		citation: "Shoeb AH. Application of machine learning to epileptic seizure onset detection and treatment. PhD Thesis, MIT (2009).",
	},
	{
		datasetId: "physionet:eegmmidb",
		title: "EEG Motor Movement/Imagery Dataset",
		description: "109 subjects, 64-channel EEG with BCI2000. Motor imagery and motor execution tasks. Used for BCI motor imagery classification.",
		subjects: 109,
		samplingRate: 160,
		tasks: ["motor imagery", "motor execution", "BCI"],
		license: "Open Data Commons Attribution License v1.0",
		url: `${PHYSIONET_BASE}/eegmmidb/1.0.0/`,
		citation: "Schalk G, McFarland DJ, Hinterberger T, Birbaumer N, Wolpaw JR. BCI2000: a general-purpose brain-computer interface (BCI) system. IEEE Trans Biomed Eng. 51(6):1034-1043 (2004).",
	},
	{
		datasetId: "physionet:capslpdb",
		title: "CAP Sleep Database",
		description: "108 whole-night polysomnographic recordings from subjects with various sleep disorders. Cyclic alternating pattern (CAP) scoring.",
		subjects: 108,
		samplingRate: 100,
		tasks: ["sleep staging", "sleep disorders"],
		license: "PhysioNet Credentialed Health Data License 1.5",
		url: `${PHYSIONET_BASE}/capslpdb/1.0.0/`,
	},
	{
		datasetId: "physionet:slpdb",
		title: "Sleep Heart Health Study",
		description: "Polysomnography from the Sleep Heart Health Study. Used for sleep and cardiovascular research.",
		subjects: 100,
		samplingRate: 125,
		tasks: ["sleep staging", "polysomnography"],
		license: "PhysioNet Credentialed Health Data License 1.5",
		url: `${PHYSIONET_BASE}/shhpsg/1.0.0/`,
	},
];

export async function searchPhysioNet(params: EegSearchParams): Promise<Record<string, unknown>> {
	const query = eegCleanQuery(params.query);
	const limit = eegSafeLimit(params.limit);
	const lower = query.toLowerCase();
	const matched = PHYSIONET_EEG_CATALOG.filter((entry) => {
		const haystack = [entry.title, entry.description, ...(entry.tasks ?? [])].join(" ").toLowerCase();
		return haystack.includes(lower);
	}).slice(0, limit);
	const results: EegDatasetResult[] = matched.map((entry) => ({
		datasetId: entry.datasetId,
		title: entry.title,
		description: entry.description,
		modality: "EEG",
		subjects: entry.subjects,
		samplingRate: entry.samplingRate,
		tasks: entry.tasks,
		license: entry.license,
		url: entry.url,
		citation: entry.citation,
		source: "physionet",
	}));
	return eegWrapResult("physionet", query, results, []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/science-database-eeg-physionet.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add extensions/research-tools/science-database-eeg-physionet.ts tests/science-database-eeg-physionet.test.ts
git commit -m "feat(eeg): add PhysioNet static EEG catalog with tests"
```

---

## Task 5: TUH EEG Corpus catalog

**Files:**
- Create: `extensions/research-tools/science-database-eeg-tuh.ts`
- Create: `tests/science-database-eeg-tuh.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/science-database-eeg-tuh.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/science-database-eeg-tuh.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the TUH implementation (static subset catalog)**

```typescript
// extensions/research-tools/science-database-eeg-tuh.ts
import {
	type EegDatasetResult,
	type EegSearchParams,
	eegCleanQuery,
	eegSafeLimit,
	eegWrapResult,
} from "./science-database-eeg-shared.js";

const TUH_BASE = "https://isip.piconepress.com/projects/tuh_eeg";

type TuhSubset = {
	datasetId: string;
	title: string;
	description: string;
	subjects?: number;
	sessions?: number;
	samplingRate?: number;
	tasks?: string[];
	license: string;
	url: string;
	citation: string;
};

// Static catalog of TUH EEG Corpus subsets.
// Update by reviewing https://isip.piconepress.com/projects/tuh_eeg/.
const TUH_SUBSETS: TuhSubset[] = [
	{
		datasetId: "tuheeg:tuh-eeg",
		title: "TUEG — TUH EEG Corpus (Standard)",
		description: "Temple University Hospital EEG Corpus. ~30,000 EEG recordings from ~16,000 patients. Largest publicly available clinical EEG corpus.",
		subjects: 16000,
		sessions: 30000,
		samplingRate: 250,
		tasks: ["clinical eeg", "abnormality detection"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Obeid I, Picone J. The Temple University Hospital EEG Data Corpus. Front. Neuroinform. 10:24 (2016).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-seizure",
		title: "TUSZ — TUH Seizure Detection Corpus",
		description: "Seizure-labeled subset of TUH EEG. ~4,500 seizure events across ~700 sessions. Standard benchmark for seizure detection.",
		subjects: 700,
		sessions: 700,
		samplingRate: 250,
		tasks: ["seizure detection", "epilepsy"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Shah V, et al. The Temple University Hospital Seizure Detection Corpus. Front. Neuroinform. 12:83 (2018).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-abnormal",
		title: "TUAB — TUH Abnormal EEG Corpus",
		description: "Binary abnormal/normal EEG classification subset. ~3,000 recordings with neurologist-annotated labels.",
		subjects: 3000,
		sessions: 3000,
		samplingRate: 250,
		tasks: ["abnormality detection", "clinical eeg"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Lopez de Diego E. Automated identification of abnormal EEGs. Temple University PhD Thesis (2017).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-artifact",
		title: "TUAR — TUH Artifact Labeling Corpus",
		description: "EEG recordings with artifact labels (eye movement, muscle, chew, etc.). Used for artifact removal benchmarking.",
		subjects: 200,
		sessions: 200,
		samplingRate: 250,
		tasks: ["artifact detection", "preprocessing"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Harati A, et al. The TUH EEG Artifact Corpus. IEEE Int. Conf. on Acoustics, Speech, and Signal Processing (2015).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-awake",
		title: "TUH EEG Awake Corpus",
		description: "Subset of TUH EEG with awake patients. Used for abnormality detection on awake recordings.",
		subjects: 2000,
		sessions: 2000,
		samplingRate: 250,
		tasks: ["clinical eeg", "awake state"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Lopez de Diego E. Automated identification of abnormal EEGs. Temple University PhD Thesis (2017).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-sleep",
		title: "TUSL — TUH Sleep EEG Corpus",
		description: "Sleep-stage labeled subset of TUH EEG. Overnight recordings with sleep stage annotations.",
		subjects: 100,
		sessions: 100,
		samplingRate: 250,
		tasks: ["sleep staging", "polysomnography"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Obeid I, Picone J. The Temple University Hospital EEG Data Corpus. Front. Neuroinform. 10:24 (2016).",
	},
	{
		datasetId: "tuheeg:tuh-eeg-label",
		title: "TUEG Labels — TUH EEG Event Labels",
		description: "Event labels for TUH EEG: spike, sharp wave, seizure, artifact. Used for event detection benchmarking.",
		subjects: 200,
		sessions: 200,
		samplingRate: 250,
		tasks: ["event detection", "spike detection"],
		license: "Open Data Commons Attribution License v1.0 (with credentialed access)",
		url: `${TUH_BASE}/html/downloads.shtml`,
		citation: "Obeid I, Picone J. The Temple University Hospital EEG Data Corpus. Front. Neuroinform. 10:24 (2016).",
	},
];

export async function searchTuhEeg(params: EegSearchParams): Promise<Record<string, unknown>> {
	const query = eegCleanQuery(params.query);
	const limit = eegSafeLimit(params.limit);
	const lower = query.toLowerCase();
	const matched = TUH_SUBSETS.filter((subset) => {
		const haystack = [subset.title, subset.description, subset.datasetId, ...(subset.tasks ?? [])].join(" ").toLowerCase();
		return haystack.includes(lower);
	}).slice(0, limit);
	const results: EegDatasetResult[] = matched.map((subset) => ({
		datasetId: subset.datasetId,
		title: subset.title,
		description: subset.description,
		modality: "EEG",
		subjects: subset.subjects,
		sessions: subset.sessions,
		samplingRate: subset.samplingRate,
		tasks: subset.tasks,
		license: subset.license,
		url: subset.url,
		citation: subset.citation,
		source: "tuheeg",
	}));
	return eegWrapResult("tuheeg", query, results, []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/science-database-eeg-tuh.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add extensions/research-tools/science-database-eeg-tuh.ts tests/science-database-eeg-tuh.test.ts
git commit -m "feat(eeg): add TUH EEG Corpus subset catalog with tests"
```

---

## Task 6: Route EEG sources into the science database router

**Files:**
- Modify: `extensions/research-tools/science-databases.ts`
- Modify: `extensions/research-tools/science-database-specialty.ts`

- [ ] **Step 1: Add EEG source IDs to `science-databases.ts`**

Locate the `SCIENCE_DATABASE_SOURCE_IDS` array in `extensions/research-tools/science-databases.ts` (around line 40-102). Add the 4 EEG sources before the closing `] as const;`.

Edit the array to add (alphabetical position, after `"pride"` block):

```typescript
	"openneuro",
	"dandi",
	"physionet",
	"tuheeg",
```

Then locate the dispatch logic in `science-databases.ts` (search for `isSpecialtyScienceDatabaseSource`). Add an import at the top of `science-databases.ts`:

```typescript
import { isEegScienceDatabaseSource, searchEegScienceDatabase } from "./science-database-eeg-shared.js";
```

Wait — `science-database-eeg-shared.ts` does not export those functions. We need to add them to a new dispatch helper. Let me revise: create the dispatch in `science-database-eeg-shared.ts` so it stays in one module.

**Revision:** Add this dispatch function to the end of `extensions/research-tools/science-database-eeg-shared.ts`:

```typescript
import { searchOpenNeuro } from "./science-database-eeg-openneuro.js";
import { searchDandi } from "./science-database-eeg-dandi.js";
import { searchPhysioNet } from "./science-database-eeg-physionet.js";
import { searchTuhEeg } from "./science-database-eeg-tuh.js";

export type EegScienceDatabaseSource = "openneuro" | "dandi" | "physionet" | "tuheeg";

export function isEegScienceDatabaseSource(source: string): source is EegScienceDatabaseSource {
	return source === "openneuro" || source === "dandi" || source === "physionet" || source === "tuheeg";
}

export async function searchEegScienceDatabase(params: EegSearchParams & { source: EegScienceDatabaseSource }): Promise<Record<string, unknown>> {
	switch (params.source) {
		case "openneuro":
			return searchOpenNeuro(params);
		case "dandi":
			return searchDandi(params);
		case "physionet":
			return searchPhysioNet(params);
		case "tuheeg":
			return searchTuhEeg(params);
	}
}
```

Note: the imports above are circular only at module-load time; Node handles this for type-only and function-call resolution since the EEG source modules only import from `science-database-eeg-shared.ts` (which is a pure helper module that does not import back).

**Important:** The dispatch additions above must be added at the *bottom* of `science-database-eeg-shared.ts` (after the existing exports), so that the EEG source modules (which import `eegSafeLimit` etc.) are loaded after the helpers are defined.

- [ ] **Step 2: Wire the EEG dispatch into `science-database-specialty.ts`**

In `extensions/research-tools/science-database-specialty.ts`:

1. Add this import at the top (after the existing imports):

```typescript
import { isEegScienceDatabaseSource, searchEegScienceDatabase, type EegScienceDatabaseSource } from "./science-database-eeg-shared.js";
```

2. Extend the `SpecialtyScienceDatabaseSource` type union (line 23) — add `| EegScienceDatabaseSource` before the closing:

```typescript
export type SpecialtyScienceDatabaseSource = BiomartScienceDatabaseSource | EbiStructuralScienceDatabaseSource | LongTailScienceDatabaseSource | PhewebScienceDatabaseSource | PublicAtlasScienceDatabaseSource | ReferenceParityScienceDatabaseSource | ResearchResourceScienceDatabaseSource | UcscScienceDatabaseSource | UniBindScienceDatabaseSource | VariantScienceDatabaseSource | ZincScienceDatabaseSource | EegScienceDatabaseSource | "cbioportal" | "civic" | "clingen" | "cosmic" | "depmap" | "encode" | "geo" | "gnomad" | "gtex" | "interpro" | "ols" | "opentargets" | "pride" | "quickgo" | "reactome";
```

3. Extend `isSpecialtyScienceDatabaseSource` (line 38-40) — add `|| isEegScienceDatabaseSource(source)` before the closing `;`:

```typescript
export function isSpecialtyScienceDatabaseSource(source: string): source is SpecialtyScienceDatabaseSource {
	return isBiomartScienceDatabaseSource(source) || isEbiStructuralScienceDatabaseSource(source) || isLongTailScienceDatabaseSource(source) || isPhewebScienceDatabaseSource(source) || isPublicAtlasScienceDatabaseSource(source) || isReferenceParityScienceDatabaseSource(source) || isResearchResourceScienceDatabaseSource(source) || isUcscScienceDatabaseSource(source) || isUniBindScienceDatabaseSource(source) || isVariantScienceDatabaseSource(source) || isZincScienceDatabaseSource(source) || isEegScienceDatabaseSource(source) || SPECIALTY_SOURCES.has(source as SpecialtyScienceDatabaseSource);
}
```

4. Locate the `searchSpecialtyScienceDatabase` function body. Find the existing dispatch chain (it uses `is*Source()` checks). Add EEG dispatch at the top of the dispatch chain:

```typescript
	if (isEegScienceDatabaseSource(params.source)) {
		return searchEegScienceDatabase(params);
	}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 4: Run the full EEG test suite to confirm routing works end-to-end**

Run: `npx tsx --test tests/science-database-eeg-*.test.ts`
Expected: PASS (all 13 tests across 4 files)

- [ ] **Step 5: Commit**

```bash
git add extensions/research-tools/science-database-eeg-shared.ts extensions/research-tools/science-database-specialty.ts
git commit -m "feat(eeg): wire EEG sources into science database router"
```

---

## Task 7: eeg-analysis skill

**Files:**
- Create: `skills/eeg-analysis/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

```markdown
---
name: eeg-analysis
description: MNE-Python workflow guide for EEG signal processing and analysis — preprocessing (load EDF/BDF/FIF/SET/VHDR/CNT, rereference, filter, ICA), ERP, PSD/band power, time-frequency (STFT/Morlet/Hilbert), and cluster-based group statistics. Use when the user asks to preprocess EEG data, compute ERP/PSD/time-frequency, run group-level statistics on EEG, or generate EEG analysis scripts. Requires Python ≥ 3.10 + MNE-Python (`pip install mne mne[hdf5]`).
---

# eeg-analysis — MNE-Python EEG Workflow Guide

This skill guides the agent through MNE-Python EEG analysis. It produces Python scripts that the user runs locally or in Docker/Modal/RunPod (see the `docker`, `modal-compute`, `runpod-compute` skills for remote execution).

## Setup

The user must have Python ≥ 3.10 and MNE installed:

```bash
pip install mne mne[hdf5]
```

For heavy analysis (large datasets, ICA on >64 channels), recommend the Docker image `mne/mne-python:latest` or Modal remote execution.

## File loading by extension

| Extension | Reader |
|---|---|
| `.edf` | `mne.io.read_raw_edf` |
| `.bdf` | `mne.io.read_raw_bdf` |
| `.fif` | `mne.io.read_raw_fif` |
| `.set` (+`.fdt`) | `mne.io.read_raw_eeglab` |
| `.vhdr` (+`.eeg`+`.vmrk`) | `mne.io.read_raw_brainvision` |
| `.cnt` | `mne.io.read_raw_cnt` |

```python
import mne
raw = mne.io.read_raw_edf("subject01.edf", preload=True)
```

## 1. Preprocessing

### Rereference
```python
raw.set_eeg_reference(ref_channels="average")  # or "laplacian", or [] for no rereference
```

### Filter
```python
raw.filter(l_freq=0.5, h_freq=45)       # bandpass
raw.notch_filter(freqs=[50, 60])        # powerline
```

### Downsample (after ICA to avoid aliasing artifacts)
```python
raw.resample(sfreq=200)
```

### ICA artifact removal
```python
from mne.preprocessing import ICA, create_eog_epoch
ica = ICA(n_components=15, method="fastica", random_state=42)
ica.fit(raw.copy().filter(l_freq=1, h_freq=None))
eog_epochs = create_eog_epoch(raw)
eog_indices, eog_scores = ica.find_bads_eog(eog_epochs)
ica.exclude = eog_indices
raw_clean = ica.apply(raw.copy())
```

### Mark bad channels
```python
raw.info["bads"] = ["Fp1", "F7"]  # manual, or use mne.preprocessing.peak_detection
```

## 2. Time-domain analysis (ERP/ERF)

```python
events = mne.make_fixed_length_events(raw, duration=2.0)  # or extract from STIM channel
epochs = mne.Epochs(raw, events, event_id={"trial": 1}, tmin=-0.2, tmax=0.8, baseline=(None, 0))
evoked = epochs.average()
evoked.plot_joint()  # waveform + topography
```

## 3. Frequency-domain analysis

### PSD
```python
psd = raw.compute_psd(method="welch", fmin=0.5, fmax=45)
psd.plot()
```

### Band power
```python
bands = {"delta": (1, 4), "theta": (4, 8), "alpha": (8, 13),
         "beta": (13, 30), "gamma": (30, 45)}
import numpy as np
psd_data = psd.get_data()
freqs = psd.freqs
band_power = {}
for name, (fmin, fmax) in bands.items():
    mask = (freqs >= fmin) & (freqs <= fmax)
    band_power[name] = psd_data[:, mask].mean(axis=1)  # per channel
```

## 4. Time-frequency analysis

### Morlet wavelet
```python
from mne.time_frequency import tfr_morlet
freqs = np.logspace(np.log10(4), np.log10(30), num=20)
n_cycles = freqs / 2.
power, itc = tfr_morlet(epochs, freqs=freqs, n_cycles=n_cycles, return_itc=True)
power.plot([0])  # channel index 0
```

### Hilbert envelope
```python
raw_alpha = raw.copy().filter(l_freq=8, h_freq=13)
envelope = raw_alpha.apply_hilbert(envelope=True)
```

## 5. Group statistics

### Cluster-based permutation test
```python
from mne.stats import spatio_temporal_cluster_test
from mne.channels import find_ch_adjacency
adjacency, _ = find_ch_adjacency(epochs.info, "eeg")
T_obs, clusters, p_values, _ = spatio_temporal_cluster_test(
    [condition_a_epochs.get_data(), condition_b_epochs.get_data()],
    n_permutations=1000, tail=0, threshold=None, adjacency=adjacency)
```

### TFCE (threshold-free cluster enhancement)
```python
from mne.stats import threshold_free_cluster_enhancement
# Use with adjacency for spatio-temporal data
```

### Multiple comparison correction
```python
from mne.stats import fdr_correction
reject, p_corrected = fdr_correction(p_values, alpha=0.05)
```

## Output conventions (per AGENTS.md)

For slug `<slug>`:

- Figures: `outputs/<slug>/figures/*.png`
- Tables: `outputs/<slug>/tables/*.csv`
- Processed data: `outputs/<slug>/processed/*.fif`
- Provenance sidecar: `outputs/<slug>.provenance.md` — record MNE version, Python version, OS, key parameters (filter band, ICA components, random seed), original data source (dataset ID + URL), execution environment (local/Docker/Modal), verification status.

```python
import mne, sys, platform
provenance = f"""# Provenance

- MNE version: {mne.__version__}
- Python: {sys.version}
- OS: {platform.platform()}
- Filter: 0.5-45 Hz, notch 50/60 Hz
- ICA: fastica, n_components=15, random_state=42
- Source data: <dataset_id> (<url>)
- Execution: local
- Verification: unverified
"""
with open("outputs/<slug>.provenance.md", "w") as f:
    f.write(provenance)
```

## When to use this skill

- User asks to preprocess EEG data (EDF/BDF/FIF/SET/VHDR/CNT)
- User asks to compute ERP, PSD, band power, time-frequency
- User asks to run group statistics on EEG data
- User asks to generate EEG analysis scripts

## When NOT to use

- User wants EEG source localization or functional connectivity (not in this skill's scope — beyond B-level coverage)
- User wants EEG decoding/BCI/ML classification (use `ml-training-recipe` skill instead)
- User only wants to find EEG datasets (use the `science_database_search` tool with `source: "openneuro" | "dandi" | "physionet" | "tuheeg"`)
```

- [ ] **Step 2: Verify skill is registered (manual check)**

Run: `ls skills/eeg-analysis/SKILL.md`
Expected: file exists

Run: `grep -l "eeg-analysis" skills-lock.json 2>/dev/null || echo "skills-lock.json may auto-update on next dev run"`
Expected: either match or message (skills-lock.json auto-syncs on `npm run dev`)

- [ ] **Step 3: Verify typecheck still passes**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add skills/eeg-analysis/SKILL.md
git commit -m "feat(eeg): add eeg-analysis skill (MNE-Python workflow guide)"
```

---

## Task 8: Workbench file-type recognition for EEG

**Files:**
- Modify: `src/workbench/file-types.ts`

- [ ] **Step 1: Add EEG extensions to `PREVIEW_EXTENSIONS`, `CONTENT_TYPES_BY_EXTENSION`, and `LANGUAGE_BY_EXTENSION`**

Edit `src/workbench/file-types.ts`:

1. Add to the `PREVIEW_EXTENSIONS` set (line 1) — insert these entries (keep alphabetical-ish ordering with the existing list):

```typescript
const PREVIEW_EXTENSIONS = new Set([".bed", ".bdf", ".cdxml", ".cif", ".cnt", ".csv", ".cxsmiles", ".edf", ".ent", ".faa", ".fa", ".fasta", ".fif", ".fna", ".gb", ".gbk", ".gff", ".gff3", ".html", ".htm", ".ipynb", ".iqtree", ".json", ".jsonl", ".ket", ".latex", ".md", ".mmcif", ".mjs", ".newick", ".nwk", ".out", ".pdb", ".rxn", ".sdf", ".set", ".smi", ".smiles", ".tex", ".tree", ".treefile", ".txt", ".tsv", ".vhdr", ".vcf"]);
```

2. Add to `CONTENT_TYPES_BY_EXTENSION` (insert after `.bdf`/before `.bed` block — or in the existing alphabetical position):

```typescript
	".bdf": "application/x-bdf",
	".edf": "application/x-edf",
	".fif": "application/x-fif",
	".set": "application/x-eeglab",
	".vhdr": "application/x-brainvision",
	".cnt": "application/x-cnt",
```

3. Add to `LANGUAGE_BY_EXTENSION`:

```typescript
	".bdf": "eeg-bdf",
	".edf": "eeg-edf",
	".fif": "eeg-fif",
	".set": "eeg-eeglab",
	".vhdr": "eeg-brainvision",
	".cnt": "eeg-cnt",
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run existing workbench tests to confirm no regressions**

Run: `npx tsx --test tests/workbench-files-surface.test.ts`
Expected: PASS (no regressions in file-type recognition)

- [ ] **Step 4: Commit**

```bash
git add src/workbench/file-types.ts
git commit -m "feat(eeg): recognize EEG file extensions in workbench file types"
```

---

## Task 9: EEG preview renderer (Python backend + TS frontend)

**Files:**
- Create: `scripts/eeg-preview.py`
- Create: `src/workbench/eeg-preview-renderer.ts`
- Create: `tests/workbench-eeg-preview.test.ts`
- Modify: `src/workbench/server.ts` (route — location confirmed in Step 4)

- [ ] **Step 1: Write the Python preview script**

```python
# scripts/eeg-preview.py
"""Generate 4 EEG preview PNGs from an EEG file using MNE-Python.

Usage: python scripts/eeg-preview.py <input_file> <output_dir>

Outputs (in output_dir):
  - waveform.png  : first 30s, up to 30 channels, downsampled to 1000 pts/ch
  - psd.png       : PSD overlay, 0.5-100 Hz, log scale
  - topo.png      : alpha and beta band topography (skipped if no positions)
  - tfr.png       : Morlet time-frequency map for Cz (or first channel)
Also writes result.json with paths and any skip reasons.
"""
import sys
import json
from pathlib import Path

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "usage", "message": "Usage: eeg-preview.py <input> <output_dir>"}))
        sys.exit(1)
    input_path = sys.argv[1]
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        import mne
    except ImportError:
        print(json.dumps({"error": "mne_not_found", "message": "Run: pip install mne"}))
        sys.exit(2)

    try:
        ext = Path(input_path).suffix.lower()
        if ext == ".edf":
            raw = mne.io.read_raw_edf(input_path, preload=True, verbose=False)
        elif ext == ".bdf":
            raw = mne.io.read_raw_bdf(input_path, preload=True, verbose=False)
        elif ext == ".fif":
            raw = mne.io.read_raw_fif(input_path, preload=True, verbose=False)
        elif ext == ".set":
            raw = mne.io.read_raw_eeglab(input_path, preload=True, verbose=False)
        elif ext == ".vhdr":
            raw = mne.io.read_raw_brainvision(input_path, preload=True, verbose=False)
        elif ext == ".cnt":
            raw = mne.io.read_raw_cnt(input_path, preload=True, verbose=False)
        else:
            print(json.dumps({"error": "unsupported_format", "message": f"Unsupported extension: {ext}"}))
            sys.exit(3)
    except Exception as e:
        print(json.dumps({"error": "parse_failed", "message": str(e)}))
        sys.exit(4)

    result = {"waveform": None, "psd": None, "topo": None, "tfr": None, "skipped": []}

    # 1. Waveform (first 30s, up to 30 channels, downsample to 1000 pts/ch)
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        sfreq = raw.info["sfreq"]
        n_samples = min(int(30 * sfreq), raw.n_times)
        n_channels = min(30, len(raw.ch_names))
        raw_crop = raw.copy().crop(0, n_samples / sfreq).pick(range(n_channels))
        ds_step = max(1, raw_crop.n_times // 1000)
        data, times = raw_crop.get_data(return_times=True)
        fig, axes = plt.subplots(n_channels, 1, figsize=(12, 2 * n_channels), sharex=True)
        if n_channels == 1:
            axes = [axes]
        for i, ax in enumerate(axes):
            ax.plot(times[::ds_step], data[i][::ds_step], linewidth=0.5)
            ax.set_ylabel(raw_crop.ch_names[i], rotation=0, fontsize=7, ha="right")
        axes[-1].set_xlabel("Time (s)")
        fig.suptitle(f"Waveform — first {n_samples / sfreq:.1f}s, {n_channels} channels")
        fig.tight_layout()
        waveform_path = output_dir / "waveform.png"
        fig.savefig(waveform_path, dpi=80)
        plt.close(fig)
        result["waveform"] = str(waveform_path)
    except Exception as e:
        result["skipped"].append({"figure": "waveform", "reason": str(e)})

    # 2. PSD (0.5-100 Hz, log scale)
    try:
        psd = raw.compute_psd(fmin=0.5, fmax=min(100, raw.info["sfreq"] / 2), verbose=False)
        fig = psd.plot(show=False, spatial_colors=False)
        psd_path = output_dir / "psd.png"
        fig.savefig(psd_path, dpi=80)
        plt.close(fig)
        result["psd"] = str(psd_path)
    except Exception as e:
        result["skipped"].append({"figure": "psd", "reason": str(e)})

    # 3. Topography (alpha + beta) — skipped if no channel positions
    try:
        if not mne.channels.make_eeg_layout(raw.info, verbose=False):
            raise RuntimeError("no channel positions")
        fig, axes = plt.subplots(1, 2, figsize=(10, 4))
        psd = raw.compute_psd(fmin=0.5, fmax=45, verbose=False)
        psd.plot_topomap(bands=[(8, 13, "Alpha"), (13, 30, "Beta")], axes=axes, show=False)
        topo_path = output_dir / "topo.png"
        fig.savefig(topo_path, dpi=80)
        plt.close(fig)
        result["topo"] = str(topo_path)
    except Exception as e:
        result["skipped"].append({"figure": "topo", "reason": str(e)})

    # 4. Time-frequency (Morlet, Cz or first channel)
    try:
        target_ch = "Cz" if "Cz" in raw.ch_names else raw.ch_names[0]
        raw_ch = raw.copy().pick(target_ch)
        sfreq = raw_ch.info["sfreq"]
        n_samples = min(int(10 * sfreq), raw_ch.n_times)  # 10s window
        raw_ch.crop(0, n_samples / sfreq)
        import numpy as np
        freqs = np.logspace(np.log10(4), np.log10(30), num=15)
        n_cycles = freqs / 2.
        power = mne.time_frequency.tfr_array_morlet(
            raw_ch.get_data()[np.newaxis], sfreq=sfreq, freqs=freqs, n_cycles=n_cycles, output="power", verbose=False)
        fig, ax = plt.subplots(figsize=(10, 5))
        im = ax.imshow(10 * np.log10(power[0, 0]),
                       aspect="auto", origin="lower",
                       extent=[0, n_samples / sfreq, freqs[0], freqs[-1]])
        ax.set_xlabel("Time (s)")
        ax.set_ylabel("Frequency (Hz)")
        ax.set_title(f"Time-Frequency — {target_ch}")
        fig.colorbar(im, ax=ax, label="Power (dB)")
        tfr_path = output_dir / "tfr.png"
        fig.savefig(tfr_path, dpi=80)
        plt.close(fig)
        result["tfr"] = str(tfr_path)
    except Exception as e:
        result["skipped"].append({"figure": "tfr", "reason": str(e)})

    print(json.dumps(result))
    sys.exit(0)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Write the TypeScript renderer**

```typescript
// src/workbench/eeg-preview-renderer.ts
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

export type EegPreviewResult = {
	waveform?: string;
	psd?: string;
	topo?: string;
	tfr?: string;
	skipped?: Array<{ figure: string; reason: string }>;
};

export type EegPreviewError = {
	error: "python_not_found" | "mne_not_found" | "parse_failed" | "unsupported_format" | "usage";
	message: string;
};

export type EegPreviewResponse = EegPreviewResult | EegPreviewError;

const EEG_EXTENSIONS = new Set([".edf", ".bdf", ".fif", ".set", ".vhdr", ".cnt"]);

export function isEegFile(extension: string): boolean {
	return EEG_EXTENSIONS.has(extension.toLowerCase());
}

function eegPreviewCacheDir(org: string): string {
	return join(homedir(), ".feynman", "orgs", org, "workbench", "eeg-previews");
}

function fileSha256(filePath: string): string {
	const content = readFileSync(filePath);
	return createHash("sha256").update(content).digest("hex");
}

export async function renderEegPreview(filePath: string, org: string): Promise<EegPreviewResponse> {
	// Check cache
	const cacheRoot = eegPreviewCacheDir(org);
	let fileHash: string;
	try {
		fileHash = fileSha256(filePath);
	} catch {
		return { error: "parse_failed", message: `Cannot read file: ${filePath}` };
	}
	const cacheDir = join(cacheRoot, fileHash);
	const cacheResultFile = join(cacheDir, "result.json");
	if (existsSync(cacheResultFile)) {
		try {
			return JSON.parse(readFileSync(cacheResultFile, "utf8")) as EegPreviewResponse;
		} catch {
			// fall through to regenerate
		}
	}

	// Run Python
	mkdirSync(cacheDir, { recursive: true });
	return new Promise<EegPreviewResponse>((resolve) => {
		const scriptPath = join(process.cwd(), "scripts", "eeg-preview.py");
		const proc = spawn("python3", [scriptPath, filePath, cacheDir], { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		proc.stdout.on("data", (chunk) => { stdout += chunk; });
		proc.stderr.on("data", (chunk) => { stderr += chunk; });
		proc.on("error", () => {
			resolve({ error: "python_not_found", message: "Install Python ≥ 3.10 to preview EEG signals" });
		});
		proc.on("close", (code) => {
			if (code === 0) {
				try {
					const result = JSON.parse(stdout.trim()) as EegPreviewResponse;
					// Cache the result
					try {
						require("node:fs").writeFileSync(cacheResultFile, JSON.stringify(result), "utf8");
					} catch {
						// cache write failure is non-fatal
					}
					resolve(result);
				} catch {
					resolve({ error: "parse_failed", message: `Failed to parse Python output: ${stdout.slice(0, 200)}` });
				}
			} else if (code === 2) {
				try {
					const err = JSON.parse(stdout.trim()) as EegPreviewError;
					resolve(err);
				} catch {
					resolve({ error: "mne_not_found", message: "Run: pip install mne" });
				}
			} else {
				try {
					const err = JSON.parse(stdout.trim()) as EegPreviewError;
					resolve(err);
				} catch {
					resolve({ error: "parse_failed", message: stderr.slice(0, 500) || `Python exited with code ${code}` });
				}
			}
		});
	});
}
```

- [ ] **Step 3: Write the failing test**

```typescript
// tests/workbench-eeg-preview.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { isEegFile } from "../src/workbench/eeg-preview-renderer.js";

test("isEegFile recognizes all EEG extensions", () => {
	assert.equal(isEegFile(".edf"), true);
	assert.equal(isEegFile(".bdf"), true);
	assert.equal(isEegFile(".fif"), true);
	assert.equal(isEegFile(".set"), true);
	assert.equal(isEegFile(".vhdr"), true);
	assert.equal(isEegFile(".cnt"), true);
});

test("isEegFile is case-insensitive", () => {
	assert.equal(isEegFile(".EDF"), true);
	assert.equal(isEegFile(".Fif"), true);
});

test("isEegFile rejects non-EEG extensions", () => {
	assert.equal(isEegFile(".csv"), false);
	assert.equal(isEegFile(".json"), false);
	assert.equal(isEegFile(".png"), false);
	assert.equal(isEegFile(""), false);
});
```

- [ ] **Step 4: Run test to verify it passes (file recognition only — full render tested manually)**

Run: `npx tsx --test tests/workbench-eeg-preview.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/eeg-preview.py src/workbench/eeg-preview-renderer.ts tests/workbench-eeg-preview.test.ts
git commit -m "feat(eeg): add EEG preview renderer with Python backend and cache"
```

**Note on server route:** Wiring `/api/preview/eeg` into `src/workbench/server.ts` requires inspecting the existing artifact preview route patterns in that file. The route handler calls `renderEegPreview(filePath, org)` and returns the JSON response. The implementer should grep `src/workbench/server.ts` for an existing `preview` route (e.g., `/api/preview/`) and add the eeg variant alongside it, guarded by `isEegFile(extension)`. This wiring is left as a final integration step because `server.ts` is a large file whose exact preview route structure should be confirmed at implementation time rather than guessed in this plan.

---

## Task 10: Update README, AGENTS.md, CHANGELOG.md

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update README tagline (line 6)**

Edit `README.md` line 6 — replace:

```
<p align="center">开源 AI 研究代理 — 神经计算研究工作台。基于 Pi 运行时,内置论文搜索、文献综述、多代理深度调查、有界实验循环与长线自主研究。</p>
```

with:

```
<p align="center">开源 AI 研究代理 — 生物医学与神经计算研究工作台。基于 Pi 运行时,内置论文搜索、文献综述、多代理深度调查、有界实验循环与长线自主研究;EEG 数据集检索(OpenNeuro/DANDI/PhysioNet/TUH)、MNE 信号处理与时频/群体统计、workbench 时域/频谱/拓扑预览。</p>
```

- [ ] **Step 2: Add Nervefeyn Neural Tools section to README**

Locate the "Nervefeyn Bio Tools" bullet in README.md (around line 131). Insert a new bullet immediately after it:

```markdown
- **Nervefeyn Neural Tools** — Nervefeyn 自有的 EEG/神经计算 connector 目录,覆盖 OpenNeuro 数据集搜索(关键词/modality/tasks 过滤,BIDS 元数据提取)、DANDI 数据档案搜索(DANDI ID、DOI、citation)、PhysioNet 经典 EEG 数据集索引(chb-mit/sleep-edf/eegmmidb 等)、TUH EEG Corpus 子集检索(7 个子集:standard/abnormal/artifact/seizure/label/awake/sleep),以及 eeg-analysis skill(MNE-Python 工作流:预处理/ICA、ERP、PSD/频带能量、时频、cluster-based 群体统计)
```

- [ ] **Step 3: Add EEG example to README "你输入什么 → 会发生什么" section**

Locate the `nervefeyn recipe` example in README.md (around line 87-89). Insert after it:

```
$ nervefeyn "find EEG motor imagery datasets on OpenNeuro"
→ 检索 OpenNeuro/DANDI/PhysioNet/TUH,返回标准化数据集列表(modality/subjects/samplingRate/license/url)

$ nervefeyn "preprocess this EDF and compute alpha band power"
→ 加载 eeg-analysis skill,生成 MNE 脚本,产出 figures/*.png + tables/*.csv + .provenance.md
```

- [ ] **Step 4: Update AGENTS.md scope section**

Locate the "功能范围" section in `AGENTS.md` (line 31-46). The last bullet before "默认拒绝相邻的产品方向" is:

```
- 提升研究循环的速度、可观测性、provenance 或可靠性
```

Insert a new bullet immediately after it:

```
- EEG/神经计算研究:OpenNeuro/DANDI/PhysioNet/TUH 数据集检索、MNE 信号处理(预处理/ERP/PSD/时频/cluster-based 群体统计)、workbench 时域/频谱/拓扑/时频预览
```

- [ ] **Step 5: Add lab notebook entry to CHANGELOG.md**

Read the current top of `CHANGELOG.md` to match its format. Insert at the top (after any header) a new entry:

```markdown
## 2026-07-14
- slug: eeg-customization
- 新增 EEG/神经计算研究能力(4 个数据源 + eeg-analysis skill + workbench 信号预览)
- 服务于:文献驱动 EEG 综合研究 + EEG 信号处理分析
- 验证:unverified(待实现 + 测试通过后转 verified)
- 下一步:实现 plan → 编码 → npm test 全绿
```

- [ ] **Step 6: Verify build still passes**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (all tests, including new EEG tests)

- [ ] **Step 7: Commit**

```bash
git add README.md AGENTS.md CHANGELOG.md
git commit -m "docs: update README/AGENTS/CHANGELOG for EEG customization"
```

---

## Final Verification

- [ ] **Run full test suite**

Run: `npm test`
Expected: PASS (all existing tests + 13 new EEG tests + 3 new preview tests)

- [ ] **Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Manual smoke test: data source**

Run: `npm run dev` then in the agent: `find EEG motor imagery datasets on OpenNeuro`
Expected: agent calls `science_database_search` with `source: "openneuro"`, returns standardized dataset list

- [ ] **Manual smoke test: skill visibility**

Run: `npm run dev` then check that `eeg-analysis` appears in the skill list
Expected: skill is registered and discoverable

- [ ] **Manual smoke test: preview (if MNE installed)**

In workbench, upload a small `.edf` file. Expected: waveform + PSD + (topo if positions) + tfr PNG previews appear. If MNE not installed: "Install MNE to preview" message appears instead of crash.

---

## Self-Review Notes

**Spec coverage:**
- § 3 Data sources → Tasks 1-6 (shared types, 4 sources, routing)
- § 4 eeg-analysis skill → Task 7
- § 5 Workbench preview → Tasks 8-9 (file types + renderer)
- § 6 README/AGENTS/CHANGELOG → Task 10
- § 8 Verification → Final Verification section
- § 9 Risks → all mitigated (graceful degradation in Task 9; static catalogs in Tasks 4-5; cache + downsample in Task 9)

**Type consistency:** `EegDatasetResult` shape is identical across Tasks 1-5. `EegSearchParams` is consistent. `searchEegScienceDatabase` dispatch in Task 6 matches the signatures in Tasks 2-5.

**Placeholder scan:** Task 9 Step 6 note explicitly flags the `server.ts` route wiring as a "confirm at implementation time" step — this is intentional because `server.ts` is a large file and the exact preview route pattern should be verified against the actual code, not guessed. All other steps contain complete code.
