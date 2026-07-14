import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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
					try {
						writeFileSync(cacheResultFile, JSON.stringify(result), "utf8");
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
