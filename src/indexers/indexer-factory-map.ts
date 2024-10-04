import { IndexerInterface } from "../types/indexer-interface";
import { Algolia } from "./algolia";
import { Elasticsearch } from "./elasticsearch";
import { Meilisearch } from "./meilisearch";

// This map contains all available indexers and has to be extended for config name resolution to work.
export const INDEXER_FACTORY_MAP = new Map<string, typeof IndexerInterface>([
	["meilisearch", Meilisearch],
	["elasticsearch", Elasticsearch],
	["algolia", Algolia]
])