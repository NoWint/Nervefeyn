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
