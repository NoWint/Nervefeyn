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

const TUH_SUBSETS: TuhSubset[] = [
	{
		datasetId: "tuheeg:tuh-eeg",
		title: "TUEG — TUH EEG Corpus (Standard)",
		description: "Temple University Hospital EEG Corpus. ~30,000 EEG recordings from ~16,000 patients. Largest publicly available clinical EEG corpus.",
		subjects: 16000,
		sessions: 30000,
		samplingRate: 250,
		tasks: ["clinical eeg"],
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
