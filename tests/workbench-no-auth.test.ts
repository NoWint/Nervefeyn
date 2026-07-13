import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { startWorkbenchServer } from "../src/workbench/server.js";

function makeWorkspace(): string {
	const root = mkdtempSync(join(tmpdir(), "feynman-workbench-no-auth-"));
	mkdirSync(join(root, "outputs"), { recursive: true });
	writeFileSync(join(root, "outputs", "result.md"), "# Result\n\nEvidence.\n");
	return root;
}

function makeReactAppRoot(): string {
	const root = mkdtempSync(join(tmpdir(), "feynman-workbench-app-"));
	mkdirSync(join(root, "dist", "workbench-web", "assets"), { recursive: true });
	writeFileSync(join(root, "dist", "workbench-web", "index.html"), [
		"<!doctype html>",
		"<html>",
		"<head><title>Feynman Science</title></head>",
		"<body><div id=\"root\"></div><script type=\"module\" src=\"/app-shell/assets/app.js\"></script></body>",
		"</html>",
	].join(""));
	writeFileSync(join(root, "dist", "workbench-web", "assets", "app.js"), "console.log('react-shell');\n");
	return root;
}

test("workbench server can run without local launch auth", async () => {
	const root = makeWorkspace();
	const appRoot = makeReactAppRoot();
	const handle = await startWorkbenchServer({
		appRoot,
		workingDir: root,
		version: "0.0.0-test",
		host: "127.0.0.1",
		port: 0,
		requireAuth: false,
	});
	try {
		assert.equal(handle.openUrl, handle.url);
		assert.equal(handle.token, "");

		const shell = await fetch(handle.url);
		assert.equal(shell.status, 200);
		assert.match(await shell.text(), /\/app-shell\/assets\/app\.js/);

		const state = await fetch(`${handle.url}api/state`);
		assert.equal(state.status, 200);
		const payload = await state.json() as { summary: { artifactCount: number } };
		assert.equal(payload.summary.artifactCount, 1);

		const projectRoute = await fetch(`${handle.url}projects/workspace/frames/result`);
		assert.equal(projectRoute.status, 200);
		assert.match(await projectRoute.text(), /\/app-shell\/assets\/app\.js/);
	} finally {
		await handle.close();
		rmSync(root, { recursive: true, force: true });
		rmSync(appRoot, { recursive: true, force: true });
	}
});
