import test from "node:test";
import assert from "node:assert/strict";

import { patchPiModelRegistrySource } from "../scripts/lib/pi-model-registry-patch.mjs";

const SOURCE = [
	"function formatValidationPath(error) {",
	"    return error.instancePath;",
	"}",
	"class ModelRegistry {",
	"    async getApiKeyAndHeaders(model) {",
	"        try {",
	"            const apiKey = undefined;",
	"            let headers = undefined;",
	"            return {",
	"                ok: true,",
	"                apiKey,",
	"                headers: headers && Object.keys(headers).length > 0 ? headers : undefined,",
	"            };",
	"        }",
	"        catch (error) {",
	"            return { ok: false, error: String(error) };",
	"        }",
	"    }",
	"}",
	"",
].join("\n");

test("patchPiModelRegistrySource guards request headers against non-Latin-1 values", () => {
	const patched = patchPiModelRegistrySource(SOURCE);

	assert.match(patched, /function assertHeaderSafeRequestConfig\(/);
	assert.match(patched, /assertHeaderSafeRequestConfig\(model\.provider, apiKey, headers\);/);

	const twice = patchPiModelRegistrySource(patched);
	assert.equal(twice, patched);
});

test("injected Latin-1 guard names the offending provider and header", async () => {
	const patched = patchPiModelRegistrySource(SOURCE);
	const helper = patched.slice(0, patched.indexOf("function formatValidationPath"));
	const moduleUrl = `data:text/javascript;base64,${Buffer.from(`${helper}\nexport { assertHeaderSafeRequestConfig };`).toString("base64")}`;
	const { assertHeaderSafeRequestConfig } = await import(moduleUrl);

	assert.doesNotThrow(() => assertHeaderSafeRequestConfig("openai", "sk-abc", { "X-Note": "ascii only" }));

	assert.throws(
		() => assertHeaderSafeRequestConfig("deepseek-custom", "sk-abc", { "X-Custom-Note": "deepseek模型" }),
		(error: unknown) =>
			error instanceof Error &&
			error.message.includes('Header "X-Custom-Note"') &&
			error.message.includes('provider "deepseek-custom"') &&
			error.message.includes("models.json"),
	);

	assert.throws(
		() => assertHeaderSafeRequestConfig("deepseek-custom", "sk-密钥", undefined),
		(error: unknown) => error instanceof Error && error.message.includes('API key for provider "deepseek-custom"'),
	);
});
