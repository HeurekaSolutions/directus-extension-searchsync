import { INDEXER_FACTORY_MAP } from "../indexers/indexer-factory-map";
import { IndexerConfig } from "./configuration/indexer-config";
import { IndexerInterface } from "./indexer-interface";

// #region Functions

/**
 * Factory function for creating indexers by name resolution.
 * If an indexer with name is found inside {@link INDEXER_FACTORY_MAP}, it will be instantiated according to config specs.
 *
 * @export
 * @param {IndexerConfig} config The configuration deciding which indexer to use and parameterize.
 * @return {*}  {IndexerInterface} An indexer used for operating on indexing systems/search engines.
 */
export function buildIndexer(config: IndexerConfig): IndexerInterface {
	const indexer = INDEXER_FACTORY_MAP.get(config.type);
	if (!indexer)
		throw new Error(`Indexer ${config.type} is not registered in INDEXER_FACTORY_MAP.`)

	const indexerInstance = new indexer(config);
	if (!indexerInstance)
		throw new Error(`Indexer ${indexer.name} could not be instantiated.`)

	return indexerInstance;
}

// #endregion
