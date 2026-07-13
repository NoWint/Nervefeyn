import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { testableChemistrySketcher } from "../extensions/research-tools/chemistry-sketcher.js";

test("chemistry sketcher creates Feynman-owned SMILES artifacts", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-chemistry-sketcher-"));
	try {
		const result = testableChemistrySketcher.createChemistrySketcherSeed(root, {
			filename: "Benzene Sketch",
			smiles: "c1ccccc1",
		});
		assert.equal(result.schema, "feynman.chemistrySketcherSeed.v1");
		assert.equal(result.filename, "benzene-sketch.smi");
		assert.equal(result.format, "smiles");
		assert.equal(result.mimeType, "chemical/x-daylight-smiles");
		assert.equal(existsSync(result.artifactPath), true);
		assert.equal(readFileSync(result.artifactPath, "utf8"), "c1ccccc1\n");
		assert.match(result.artifactPath, /outputs\/chemistry-sketches\/benzene-sketch\.smi$/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("chemistry sketcher prefers KET and writes a blank KET when no seed is provided", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-chemistry-sketcher-"));
	try {
		const ketResult = testableChemistrySketcher.createChemistrySketcherSeed(root, {
			filename: "state",
			ket: "{\"root\":{\"nodes\":[{\"type\":\"atom\"}]}}",
			smiles: "CCO",
		});
		assert.equal(ketResult.filename, "state.ket");
		assert.equal(ketResult.format, "ket");
		assert.equal(readFileSync(ketResult.artifactPath, "utf8"), "{\"root\":{\"nodes\":[{\"type\":\"atom\"}]}}\n");

		const blankResult = testableChemistrySketcher.createChemistrySketcherSeed(root, {});
		assert.equal(blankResult.filename, "sketcher.ket");
		assert.equal(blankResult.format, "ket");
		assert.equal(readFileSync(blankResult.artifactPath, "utf8"), "{\"root\":{\"nodes\":[]}}\n");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
