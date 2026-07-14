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
