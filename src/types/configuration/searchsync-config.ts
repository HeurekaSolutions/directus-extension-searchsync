import { CollectionConfig } from "./collection-config";
import { IndexerConfig } from "./indexer-config";

// Template for extension configuration (config entrypoint)
export type SearchsyncConfig = {
  server: IndexerConfig;
  batchLimit?: number;
  reindexOnStart?: boolean;
  collections: Record<string, CollectionConfig>;
};
