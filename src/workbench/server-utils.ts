import type { IncomingMessage } from "node:http";

export function requestOrigin(request: IncomingMessage): string {
	const host = typeof request.headers.host === "string" ? request.headers.host : "127.0.0.1";
	const protoHeader = request.headers["x-forwarded-proto"];
	const protocol = typeof protoHeader === "string" && protoHeader.trim() ? protoHeader.split(",")[0]!.trim() : "http";
	return `${protocol}://${host}`;
}

export function hostForUrl(host: string): string {
	return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export function normalizeHost(value: string | undefined): string {
	const host = value?.trim();
	return host || "127.0.0.1";
}

export function parseWorkbenchPort(value: string | undefined): number | undefined {
	if (!value) return undefined;
	if (!/^\d+$/.test(value)) {
		throw new Error("Workbench port must be a positive integer.");
	}
	const port = Number(value);
	if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
		throw new Error("Workbench port must be between 0 and 65535.");
	}
	return port;
}
