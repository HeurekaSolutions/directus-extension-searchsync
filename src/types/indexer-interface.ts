import { IndexerConfig } from "./configuration/indexer-config";

/**
 * Interface for implementing search engine indexers.
 *
 * @export
 * @class IndexerInterface
 */
export class IndexerInterface {
	// #region Constructors

	/**
	 * Creates an instance of IndexerInterface.
	 * @param {IndexerConfig} config Configuration used for indexer parameterization.
	 * @memberof IndexerInterface
	 */
	constructor(public config: IndexerConfig) { }

	// #endregion

	// #region Public Methods

	/**
	 * Creates an index.
	 *
	 * @param {string} collectionName Name of the created index.
	 * @return {*}  {Promise<void>} A promise resolving, after creation is completed.
	 * @memberof IndexerInterface
	 */
	public createIndex(collectionName: string): Promise<void> {
		throw new Error("Method not implemented.")
	}

	/**
	 * Deletes a single document inside an index.
	 *
	 * @param {string} collectionName Identifier of the index to be modified.
	 * @param {string} id Identifier of the document to be removed from index.
	 * @return {*}  {Promise<void>} A promise resolving, after deletion is completed.
	 * @memberof IndexerInterface
	 */
	public deleteItem(collectionName: string, id: string): Promise<void> {
		throw new Error("Method not implemented.")
	}

	/**
	 * Deletes all items inside an index.
	 *
	 * @param {string} collectionName Identifier of the index to be cleared.
	 * @return {*}  {Promise<void>} A promise resolving, after deletion is completed.
	 * @memberof IndexerInterface
	 */
	public deleteItems(collectionName: string): Promise<void> {
		throw new Error("Method not implemented.")
	}

	/**
	 * 
	 *
	 * @param {string} collectionName
	 * @param {string} id
	 * @param {object} data
	 * @param {string} [pk]
	 * @return {*}  {Promise<void>}
	 * @memberof IndexerInterface
	 */
	public upsertItem(collectionName: string, id: string, data: object, pk?: string): Promise<void> {
		throw new Error("Method not implemented.")
	}

	// #endregion
};