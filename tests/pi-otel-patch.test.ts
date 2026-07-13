import assert from "node:assert/strict";
import test from "node:test";

import { patchPiOtelSource } from "../scripts/lib/pi-otel-patch.mjs";

test("patchPiOtelSource strips cwd attributes from pi-otel spans and resources", () => {
	const attrs = 'export const ATTR_PI_CWD = "pi.cwd";\nexport const ATTR_PI_TURN_COUNT = "pi.turn_count";';
	const spans = "const attrs = {\n            [ATTR_SYSTEM]: GEN_AI_SYSTEM_PI,\n            [ATTR_PI_CWD]: this.opts.cwd,\n        };";
	const sdk = 'import { Resource } from "@opentelemetry/resources";\nimport { ATTR_PI_CWD } from "../attrs.js";\nconst resource = new Resource({\n        [ATTR_SERVICE_NAME]: cfg.serviceName,\n        [ATTR_PI_CWD]: cfg.cwd,\n    });\n    // OTLP endpoints always carry an explicit port; refuse to fall back to\n    // 80/443, which could silently green-light an unrelated service.\n    if (!u.port)\n        return Promise.resolve(false);\n    return probeTcp(u.hostname || "127.0.0.1", Number(u.port), timeoutMs);';
	const index = "tracker = new SpanTracker({\n            tracer,\n            captureContent: cfg.captureContent,\n            cwd: cfg.cwd,\n            sessionId: () => sessionIdRef,\n        });\nattributes: {\n                    [ATTR_SYSTEM]: GEN_AI_SYSTEM_PI,\n                    [ATTR_PI_CWD]: cfg.cwd,\n                    \"service.name\": cfg.serviceName,\n                }\nif (await probeEndpoint(cfg.endpoint)) {";

	assert.doesNotMatch(patchPiOtelSource("dist/attrs.js", attrs), /ATTR_PI_CWD|pi\.cwd/);
	assert.doesNotMatch(patchPiOtelSource("dist/spans.js", spans), /ATTR_PI_CWD|this\.opts\.cwd/);
	assert.doesNotMatch(patchPiOtelSource("dist/otel/sdk.js", sdk), /ATTR_PI_CWD|cfg\.cwd/);
	assert.doesNotMatch(patchPiOtelSource("dist/index.js", index), /ATTR_PI_CWD|cfg\.cwd/);
	assert.match(patchPiOtelSource("dist/index.js", index), /if \(await probeEndpoint\(cfg\.endpoint\)\)/);
	assert.match(patchPiOtelSource("dist/otel/sdk.js", sdk), /import \{ resourceFromAttributes \} from "@opentelemetry\/resources"/);
	assert.match(patchPiOtelSource("dist/otel/sdk.js", sdk), /const resource = resourceFromAttributes\(\{/);
	assert.match(patchPiOtelSource("dist/otel/sdk.js", sdk), /u\.protocol === "https:" \? 443/);
});

test("patchPiOtelSource makes pi-otel honor trace-specific OTLP env vars", () => {
	const config = `    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        merged?.endpoint ??
        "http://127.0.0.1:4317";
    const protocol = normalizeProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? merged?.protocol);
    const headers = {
        ...(merged?.headers ?? {}),
        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    };`;
	const patched = patchPiOtelSource("dist/config.js", config);

	assert.match(patched, /process\.env\.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT \?\?/);
	assert.match(patched, /process\.env\.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL \?\?/);
	assert.match(patched, /parseKvList\(process\.env\.OTEL_EXPORTER_OTLP_TRACES_HEADERS\)/);
	assert.match(patched, /process\.env\.OTEL_EXPORTER_OTLP_ENDPOINT \?\?/);
});

test("patchPiOtelSource is idempotent", () => {
	const source = `import { Resource } from "@opentelemetry/resources";
import { ATTR_PI_CWD } from "../attrs.js";
const resource = new Resource({
        [ATTR_SERVICE_NAME]: cfg.serviceName,
        [ATTR_PI_CWD]: cfg.cwd,
    });
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        merged?.endpoint ??
        "http://127.0.0.1:4317";
    const protocol = normalizeProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? merged?.protocol);
    const headers = {
        ...(merged?.headers ?? {}),
        ...parseKvList(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    };`;
	const once = patchPiOtelSource("dist/otel/sdk.js", source);
	const twice = patchPiOtelSource("dist/otel/sdk.js", once);
	const configOnce = patchPiOtelSource("dist/config.js", source);
	const configTwice = patchPiOtelSource("dist/config.js", configOnce);

	assert.doesNotMatch(once, /ATTR_PI_CWD|cfg\.cwd/);
	assert.equal(twice, once);
	assert.equal(configTwice, configOnce);
});
