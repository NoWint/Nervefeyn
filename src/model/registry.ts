import { dirname, resolve } from "node:path";

import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";

export function getModelsJsonPath(authPath: string): string {
	return resolve(dirname(authPath), "models.json");
}

export function createModelRegistry(authPath: string): ModelRegistry {
	return ModelRegistry.create(AuthStorage.create(authPath), getModelsJsonPath(authPath));
}
