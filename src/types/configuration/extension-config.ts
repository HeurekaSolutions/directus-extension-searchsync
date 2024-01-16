import { CollectionConfig } from "./collection-config";
import { IndexerConfig } from "./indexer-config";

// Template for extension configuration (config entrypoint)
export type ExtensionConfig = {
	server: IndexerConfig;
	batchLimit?: number;
	collections: Record<string, CollectionConfig>;
};