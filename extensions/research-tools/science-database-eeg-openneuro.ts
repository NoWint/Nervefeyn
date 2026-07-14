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
