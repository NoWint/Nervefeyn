import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { authorizationHeaderForConnector, readWorkbenchOAuthTokens } from "../src/workbench/oauth-store.js";
import { buildWorkbenchState } from "../src/workbench/scan.js";
import { startWorkbenchServer } from "../src/workbench/server.js";
import { upsertWorkbenchSettingsRecord } from "../src/workbench/settings-store.js";

async function readRequestBody(request: NodeJS.ReadableStream): Promise<string> {
	let body = "";
	for await (const chunk of request) body += String(chunk);
	return body;
}

async function startOAuthServer() {
	const tokenRequests: URLSearchParams[] = [];
	const server = createServer(async (request, response) => {
		if (request.method === "POST" && request.url === "/oauth/token") {
			const params = new URLSearchParams(await readRequestBody(request));
			tokenRequests.push(params);
			response.setHeader("content-type", "application/json");
			response.end(JSON.stringify({
				access_token: "oauth-access-token",
				expires_in: 3600,
				refresh_token: "oauth-refresh-token",
				scope: params.get("scope") || "datasets.read",
				token_type: "Bearer",
			}));
			return;
		}
		response.statusCode = 404;
		response.end("not found");
	});
	await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
	const address = server.address();
	assert.ok(address && typeof address === "object");
	return {
		close: () => new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise())),
		tokenRequests,
		url: `http://127.0.0.1:${address.port}/oauth`,
	};
}

test("workbench connector OAuth start, callback, and disconnect persist local token state", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-workbench-oauth-"));
	const auth = await startOAuthServer();
	mkdirSync(join(root, "outputs", ".plans"), { recursive: true });
	try {
		upsertWorkbenchSettingsRecord(root, {
			collection: "customConnectors",
			record: {
				id: "lab-oauth",
				name: "Lab OAuth",
				transport: "streamable_http",
				url: "https://mcp.example.edu/mcp",
				oauthServerUrl: auth.url,
				clientId: "lab-client",
				scopes: "datasets.read",
			},
		});
		const handle = await startWorkbenchServer({
			host: "127.0.0.1",
			port: 0,
			token: "oauth-test-token",
			version: "0.0.0-test",
			workingDir: root,
		});
		try {
			const start = await fetch(`${handle.url}api/connectors/oauth/start?token=oauth-test-token`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ connectorId: "lab-oauth" }),
			});
			assert.equal(start.status, 200);
			const startPayload = await start.json() as { authorizationUrl: string; oauthState: string };
			const authorizationUrl = new URL(startPayload.authorizationUrl);
			assert.equal(authorizationUrl.pathname, "/oauth/authorize");
			assert.equal(authorizationUrl.searchParams.get("client_id"), "lab-client");
			assert.equal(authorizationUrl.searchParams.get("scope"), "datasets.read");
			assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
			assert.ok(authorizationUrl.searchParams.get("code_challenge"));

			const callback = await fetch(`${handle.url}api/connectors/oauth/callback?state=${encodeURIComponent(startPayload.oauthState)}&code=code-123`);
			assert.equal(callback.status, 200);
			assert.match(await callback.text(), /OAuth connected/);
			assert.equal(auth.tokenRequests.length, 1);
			const duplicateCallback = await fetch(`${handle.url}api/connectors/oauth/callback?state=${encodeURIComponent(startPayload.oauthState)}&code=code-123`);
			assert.equal(duplicateCallback.status, 200);
			assert.match(await duplicateCallback.text(), /OAuth connected/);
			assert.equal(auth.tokenRequests.length, 1);
			assert.equal(auth.tokenRequests[0]!.get("grant_type"), "authorization_code");
			assert.equal(auth.tokenRequests[0]!.get("client_id"), "lab-client");
			assert.equal(auth.tokenRequests[0]!.get("code"), "code-123");
			assert.ok(auth.tokenRequests[0]!.get("code_verifier"));
			assert.equal(authorizationHeaderForConnector(root, "lab-oauth").Authorization, "Bearer oauth-access-token");
			assert.equal(readWorkbenchOAuthTokens(root).tokens[0]?.refreshToken, "oauth-refresh-token");

			const state = buildWorkbenchState({ workingDir: root, version: "0.0.0-test" });
			const connector = state.resources.find((group) => group.id === "connectors")?.resources.find((resource) => resource.settingsRecordId === "lab-oauth");
			assert.equal(connector?.oauthStatus, "connected");
			assert.equal(connector?.oauthAction, "disconnect");
			assert.equal(connector?.diagnostics?.some((item) => item.includes("oauth-access-token")), false);
			const mcpServer = state.customMcpServers.find((server) => server.settingsRecordId === "lab-oauth");
			const tokenRow = state.oauthTokens.find((token) => token.settingsRecordId === "lab-oauth");
			assert.match(tokenRow?.id ?? "", /^[0-9a-f-]{36}$/);
			assert.equal(tokenRow?.userId, "local-workbench");
			assert.equal(tokenRow?.mcpServerId, mcpServer?.id);
			assert.equal(tokenRow?.encryptedAccessToken, "feynman-oauth-ref:lab-oauth:access");
			assert.equal(tokenRow?.encryptedRefreshToken, "feynman-oauth-ref:lab-oauth:refresh");
			assert.equal(tokenRow?.tokenType, "Bearer");
			assert.equal(tokenRow?.scopes, "datasets.read");
			assert.equal(tokenRow?.clientId, "lab-client");
			assert.equal(tokenRow?.connectorId, "lab-oauth");
			assert.equal(tokenRow?.status, "active");
			assert.ok((tokenRow?.expiresAtMs ?? 0) > Date.now());
			assert.ok((tokenRow?.createdAtMs ?? 0) > 0);
			assert.ok((tokenRow?.updatedAtMs ?? 0) > 0);
			assert.equal(JSON.stringify(tokenRow).includes("oauth-access-token"), false);
			assert.equal(JSON.stringify(tokenRow).includes("oauth-refresh-token"), false);

			const disconnect = await fetch(`${handle.url}api/connectors/oauth/disconnect?token=oauth-test-token`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ connectorId: "lab-oauth" }),
			});
			assert.equal(disconnect.status, 200);
			assert.deepEqual(readWorkbenchOAuthTokens(root).tokens, []);
			assert.deepEqual(buildWorkbenchState({ workingDir: root, version: "0.0.0-test" }).oauthTokens, []);
		} finally {
			await handle.close();
		}
	} finally {
		await auth.close();
		rmSync(root, { recursive: true, force: true });
	}
});
