export const PI_OTEL_PATCH_TARGETS = [
	"dist/attrs.js",
	"dist/config.js",
	"dist/index.js",
	"dist/otel/sdk.js",
	"dist/spans.js",
];

export function patchPiOtelSource(relativePath, source) {
	let patched = source;

	if (relativePath === "dist/index.js") {
		patched = patched
			.replace(" ATTR_PI_CWD,", "")
			.replace("\n                    [ATTR_PI_CWD]: cfg.cwd,", "")
			.replace("\n            cwd: cfg.cwd,", "");
	}

	if (relativePath === "dist/otel/sdk.js") {
		patched = patched
			.replace('import { Resource } from "@opentelemetry/resources";', 'import { resourceFromAttributes } from "@opentelemetry/resources";')
			.replace('import { ATTR_PI_CWD } from "../attrs.js";\n', "")
			.replace("\n        [ATTR_PI_CWD]: cfg.cwd,", "")
			.replace("const resource = new Resource({", "const resource = resourceFromAttributes({")
			.replace(
				"    // OTLP endpoints always carry an explicit port; refuse to fall back to\n    // 80/443, which could silently green-light an unrelated service.\n    if (!u.port)\n        return Promise.resolve(false);\n    return probeTcp(u.hostname || \"127.0.0.1\", Number(u.port), timeoutMs);",
				"    const defaultPort = u.protocol === \"https:\" ? 443 : u.protocol === \"http:\" ? 80 : undefined;\n    const port = u.port ? Number(u.port) : defaultPort;\n    if (!port)\n        return Promise.resolve(false);\n    return probeTcp(u.hostname || \"127.0.0.1\", port, timeoutMs);",
			);
	}

	if (relativePath === "dist/config.js") {
		patched = patched
			.replace(
				"    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??\n        merged?.endpoint ??\n        \"http://127.0.0.1:4317\";",
				"    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??\n        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??\n        merged?.endpoint ??\n        \"http://127.0.0.1:4317\";",
			)
			.replace(
				"    const protocol = normalizeProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? merged?.protocol);",
				"    const protocol = normalizeProtocol(process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL ?? process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? merged?.protocol);",
			);
		if (!patched.includes("process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS")) {
			patched = patched.replace(
				"        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_HEADERS),",
				"        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_HEADERS),\n        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS),",
			);
		}
	}

	if (relativePath === "dist/spans.js") {
		patched = patched
			.replace(" ATTR_PI_CWD,", "")
			.replace("\n            [ATTR_PI_CWD]: this.opts.cwd,", "");
	}

	if (relativePath === "dist/attrs.js") {
		patched = patched.replace('export const ATTR_PI_CWD = "pi.cwd";\n', "");
	}

	return patched;
}
