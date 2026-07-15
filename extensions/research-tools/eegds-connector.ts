// extensions/research-tools/eegds-connector.ts
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath, relative as relativePath } from "node:path";
import { randomUUID } from "node:crypto";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import { readWorkbenchSettings, type EegdsSettings, EEGDS_DEFAULT_SETTINGS } from "../../src/workbench/settings-store.js";

export type EegdsAction =
	| "health_check"
	| "analyze"
	| "neurolink_dashboard"
	| "neurolink_last_analysis"
	| "neurolink_recent_eeg"
	| "batch_analyze"
	| "batch_progress"
	| "batch_report"
	| "realtime_status"
	| "realtime_start"
	| "realtime_stop";

export type EegdsProvenanceVerification = "verified" | "unverified" | "blocked" | "inferred";

export type EegdsProvenanceEntry = {
	timestamp: string;
	action: EegdsAction;
	endpoint: string;
	params: Record<string, unknown>;
	summary?: Record<string, unknown>;
	verification: EegdsProvenanceVerification;
	sourceFile?: string;
	resultFile?: string;
	error?: string;
	notes?: string;
};

export type EegdsError = {
	ok: false;
	error: string;
	message: string;
};

export type EegdsOk<T extends Record<string, unknown>> = { ok: true } & T;

export type EegdsResult = EegdsError | EegdsOk<Record<string, unknown>>;

// Settings loader — env vars override settings-store, which overrides defaults.
export function loadEegdsSettings(): EegdsSettings {
	const fromStore = (() => {
		try {
			return readWorkbenchSettings(process.cwd()).eegds;
		} catch {
			return EEGDS_DEFAULT_SETTINGS;
		}
	})();
	const envUrl = process.env.NERVEFEYN_EEGDS_URL?.trim();
	const envTimeout = process.env.NERVEFEYN_EEGDS_TIMEOUT_MS?.trim();
	const parsedTimeout = envTimeout && Number.isFinite(Number(envTimeout)) ? Number(envTimeout) : undefined;
	return {
		baseUrl: envUrl ?? fromStore.baseUrl,
		timeoutMs: parsedTimeout ?? fromStore.timeoutMs,
		batchPollIntervalMs: fromStore.batchPollIntervalMs,
		batchMaxPollMs: fromStore.batchMaxPollMs,
		autoHealthCheck: fromStore.autoHealthCheck,
	};
}

// Health check cache — 5min TTL, module-level.
let healthCache: { ok: true; checkedAtMs: number } | { ok: false; checkedAtMs: number; error: string } | null = null;
const HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;

export function resetEegdsHealthCache(): void {
	healthCache = null;
}
