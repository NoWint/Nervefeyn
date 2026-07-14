import assert from "node:assert/strict";
import { test } from "node:test";

import { isEegFile } from "../src/workbench/eeg-preview-renderer.js";

test("isEegFile recognizes all EEG extensions", () => {
	assert.equal(isEegFile(".edf"), true);
	assert.equal(isEegFile(".bdf"), true);
	assert.equal(isEegFile(".fif"), true);
	assert.equal(isEegFile(".set"), true);
	assert.equal(isEegFile(".vhdr"), true);
	assert.equal(isEegFile(".cnt"), true);
});

test("isEegFile is case-insensitive", () => {
	assert.equal(isEegFile(".EDF"), true);
	assert.equal(isEegFile(".Fif"), true);
});

test("isEegFile rejects non-EEG extensions", () => {
	assert.equal(isEegFile(".csv"), false);
	assert.equal(isEegFile(".json"), false);
	assert.equal(isEegFile(".png"), false);
	assert.equal(isEegFile(""), false);
});
