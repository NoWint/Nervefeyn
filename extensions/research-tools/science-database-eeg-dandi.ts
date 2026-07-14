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
