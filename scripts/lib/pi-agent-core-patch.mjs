const HELPER = `
function normalizeFeynmanSearchToolArguments(args) {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
        return args;
    }
    const normalized = { ...args };
    if (Array.isArray(normalized.queries) || typeof normalized.query === "string") {
        return normalized;
    }
    if (Array.isArray(normalized.q)) {
        normalized.queries = normalized.q;
        delete normalized.q;
        return normalized;
    }
    if (typeof normalized.q === "string") {
        normalized.query = normalized.q;
        delete normalized.q;
    }
    return normalized;
}

function normalizeFeynmanFetchToolArguments(args) {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
        return args;
    }
    const normalized = { ...args };
    if (Array.isArray(normalized.urls) || typeof normalized.url === "string") {
        return normalized;
    }
    if (Array.isArray(normalized.url)) {
        normalized.urls = normalized.url;
        delete normalized.url;
    }
    return normalized;
}

function normalizeFeynmanToolAlias(toolCall, tools) {
    const aliases = new Map([
        ["google:search", "web_search"],
        ["google_search", "web_search"],
        ["google.search", "web_search"],
        ["search_google", "web_search"],
        ["search_web", "web_search"],
        ["WebSearch", "web_search"],
        ["fetch", "fetch_content"],
        ["WebFetch", "fetch_content"],
        ["read_url_content", "fetch_content"],
    ]);
    const targetName = aliases.get(toolCall.name);
    if (!targetName || !tools?.some((tool) => tool.name === targetName)) {
        return toolCall;
    }
    const args = targetName === "fetch_content"
        ? normalizeFeynmanFetchToolArguments(toolCall.arguments)
        : normalizeFeynmanSearchToolArguments(toolCall.arguments);
    return {
        ...toolCall,
        name: targetName,
        arguments: args,
    };
}
`;

export function patchPiAgentCoreSource(source) {
	if (source.includes("function normalizeFeynmanToolAlias(")) {
		return source;
	}

	const prepareStart = "async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {\n";
	if (!source.includes(prepareStart)) {
		return source;
	}

	let patched = source.replace(prepareStart, `${HELPER}\n${prepareStart}`);
	patched = patched.replace(
		"async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {\n    const tool = currentContext.tools?.find((t) => t.name === toolCall.name);",
		"async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {\n    const effectiveToolCall = normalizeFeynmanToolAlias(toolCall, currentContext.tools);\n    const tool = currentContext.tools?.find((t) => t.name === effectiveToolCall.name);",
	);
	patched = patched.replace(
		"        const preparedToolCall = prepareToolCallArguments(tool, toolCall);",
		"        const preparedToolCall = prepareToolCallArguments(tool, effectiveToolCall);",
	);
	patched = patched.replace(
		"                toolCall,\n                args: validatedArgs,",
		"                toolCall: preparedToolCall,\n                args: validatedArgs,",
	);
	patched = patched.replace(
		"            toolCall,\n            tool,",
		"            toolCall: preparedToolCall,\n            tool,",
	);
	return patched;
}
