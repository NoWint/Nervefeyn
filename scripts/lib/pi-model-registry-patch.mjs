// Issue #171: a models.json provider header or API key containing characters
// above U+00FF (e.g. Chinese text) makes undici's fetch throw the cryptic
// "Cannot convert argument to a ByteString because the character at index N
// has a value of M which is greater than 255" with no hint of which config
// value caused it. Validate at request-assembly time and name the exact
// provider and header instead; the surrounding try/catch in
// getApiKeyAndHeaders turns the throw into a readable model error.
const LATIN1_GUARD_HELPER = [
	"function findNonLatin1CharIndex(value) {",
	'    if (typeof value !== "string") return -1;',
	"    for (let index = 0; index < value.length; index++) {",
	"        if (value.charCodeAt(index) > 255) return index;",
	"    }",
	"    return -1;",
	"}",
	"function assertHeaderSafeRequestConfig(provider, apiKey, headers) {",
	"    const apiKeyIndex = findNonLatin1CharIndex(apiKey);",
	"    if (apiKeyIndex !== -1) {",
	"        throw new Error(`The API key for provider \"${provider}\" contains a non-Latin-1 character at index ${apiKeyIndex} (code point ${apiKey.codePointAt(apiKeyIndex)}). HTTP headers cannot carry characters above U+00FF - check models.json or your stored auth for stray non-ASCII characters.`);",
	"    }",
	"    for (const [headerName, headerValue] of Object.entries(headers ?? {})) {",
	'        const value = typeof headerValue === "string" ? headerValue : String(headerValue);',
	"        const nameIndex = findNonLatin1CharIndex(headerName);",
	"        const valueIndex = findNonLatin1CharIndex(value);",
	"        if (nameIndex === -1 && valueIndex === -1) continue;",
	"        const offending = nameIndex !== -1 ? headerName : value;",
	"        const offendingIndex = nameIndex !== -1 ? nameIndex : valueIndex;",
	"        throw new Error(`Header \"${headerName}\" for provider \"${provider}\" contains a non-Latin-1 character at index ${offendingIndex} (code point ${offending.codePointAt(offendingIndex)}). HTTP headers cannot carry characters above U+00FF - remove or URL-encode the value in models.json.`);",
	"    }",
	"}",
].join("\n");

const RETURN_ORIGINAL = [
	"            return {",
	"                ok: true,",
	"                apiKey,",
	"                headers: headers && Object.keys(headers).length > 0 ? headers : undefined,",
	"            };",
].join("\n");

const RETURN_PATCHED = [
	"            assertHeaderSafeRequestConfig(model.provider, apiKey, headers);",
	RETURN_ORIGINAL,
].join("\n");

const HELPER_ANCHOR = "function formatValidationPath(error) {";

export function patchPiModelRegistrySource(source) {
	if (source.includes("function assertHeaderSafeRequestConfig(")) {
		return source;
	}
	if (!source.includes(RETURN_ORIGINAL) || !source.includes(HELPER_ANCHOR)) {
		return source;
	}

	let patched = source.replace(RETURN_ORIGINAL, RETURN_PATCHED);
	patched = patched.replace(HELPER_ANCHOR, `${LATIN1_GUARD_HELPER}\n${HELPER_ANCHOR}`);
	return patched;
}
