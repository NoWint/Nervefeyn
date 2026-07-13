import test from "node:test";
import assert from "node:assert/strict";

import { patchPiAgentCoreSource } from "../scripts/lib/pi-agent-core-patch.mjs";

const SOURCE = `
async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {
    const tool = currentContext.tools?.find((t) => t.name === toolCall.name);
    if (!tool) {
        return {
            kind: "immediate",
            result: createErrorToolResult(\`Tool \${toolCall.name} not found\`),
            isError: true,
        };
    }
    try {
        const preparedToolCall = prepareToolCallArguments(tool, toolCall);
        const validatedArgs = validateToolArguments(tool, preparedToolCall);
        if (config.beforeToolCall) {
            const beforeResult = await config.beforeToolCall({
                assistantMessage,
                toolCall,
                args: validatedArgs,
                context: currentContext,
            }, signal);
        }
        return {
            kind: "prepared",
            toolCall,
            tool,
            args: validatedArgs,
        };
    }
    catch (error) {
        return {
            kind: "immediate",
            result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
            isError: true,
        };
    }
}
`;

test("patchPiAgentCoreSource maps google search aliases to web_search", () => {
	const patched = patchPiAgentCoreSource(SOURCE);

	assert.match(patched, /function normalizeFeynmanToolAlias/);
	assert.match(patched, /\["google:search", "web_search"\]/);
	assert.match(patched, /\["search_web", "web_search"\]/);
	assert.match(patched, /\["fetch", "fetch_content"\]/);
	assert.match(patched, /\["read_url_content", "fetch_content"\]/);
	assert.match(patched, /function normalizeFeynmanFetchToolArguments/);
	assert.match(patched, /normalized\.urls = normalized\.url/);
	assert.match(patched, /const effectiveToolCall = normalizeFeynmanToolAlias\(toolCall, currentContext\.tools\)/);
	assert.match(patched, /t\.name === effectiveToolCall\.name/);
	assert.match(patched, /prepareToolCallArguments\(tool, effectiveToolCall\)/);
	assert.match(patched, /toolCall: preparedToolCall/);
});

test("patchPiAgentCoreSource is idempotent", () => {
	const once = patchPiAgentCoreSource(SOURCE);
	const twice = patchPiAgentCoreSource(once);
	assert.equal(twice, once);
});
