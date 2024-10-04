import { ApiExtensionContext } from "@directus/extensions";
import striptags from 'striptags';
import { INDEXER_FACTORY_MAP } from "../indexers/indexer-factory-map";
import { buildErrorMessage, flattenObject, objectMap } from "../utils";
import { ExtensionConfig } from "./configuration/extension-config";
import { buildIndexer } from "./indexer-factory";
import { IndexerInterface } from "./indexer-interface";

/**
 * A Facade abstracting {@link IndexerInterface} calls with Directus data.
 * Thought out to be consumed by endpoints/hooks.
 *
 * @export
 * @class IndexerFacade
 */
export class IndexerFacade {
	// #region Properties

	public readonly indexerInstance: IndexerInterface;

	// #endregion

	// #region Constructors

	constructor(protected config: ExtensionConfig, protected context: ApiExtensionContext) {
		if (!config.server.type || !INDEXER_FACTORY_MAP.get(config.server.type)) {
			throw Error(`Broken config file. Missing or invalid indexer type "${config.server.type || 'Unknown'}".`);
		};

		this.indexerInstance = buildIndexer(this.config.server);
	}

	// #endregion

	// #region Public Methods

	/**
	 * Deletes multiple items inside indexing system based on their ids.
	 *
	 * @param {string} collectionName Name of the Directus collection to be synchronized.\
	 * (indexer collection name can optionally be set in config).
	 * @param {string[]} ids Array of item ids to be deleted.\
	 * (indexer item ids match directus item ids)
	 * @return {*}  {Promise<void>} An async callback.
	 * @memberof IndexerFacade
	 */
	public async deleteItemIndexes(collectionName: string, ids: string[]): Promise<void> {
		const collectionIndex = this.getCollectionIndexName(collectionName);
		for (const id of ids) {
			try {
				await this.indexerInstance.deleteItem(collectionIndex, id);
			} catch (error) {
				this.context.logger.warn(`Cannot delete "${collectionIndex}/${id}". ${buildErrorMessage(error)}`);
				this.context.logger.debug(error);
			}
		}
	}

	/**
	 * Ensures that collection with specific name is created/available in indexer.
	 *
	 * @param {string} collectionName The name of the collection to be validated.
	 * @return {*}  {Promise<void>} An async callback.
	 * @memberof IndexerFacade
	 */
	public async ensureCollectionIndex(collectionName: string): Promise<void> {
		const collectionIndex = this.getCollectionIndexName(collectionName);
		try {
			await this.indexerInstance.createIndex(collectionIndex);
		} catch (error) {
			this.context.logger.warn(`Cannot create collection "${collectionIndex}". ${buildErrorMessage(error)}`);
			this.context.logger.debug(error);
		}
	}

	/**
	 * Used for deciding if an alternate indexing name is set for Directus collection configuration.
	 *
	 * @param {string} collectionName The collection name to be looked up inside configuration.
	 * @return {*}  {string} The definitive name for a collection inside the indexing system.
	 * @memberof IndexerFacade
	 */
	public getCollectionIndexName(collectionName: string): string {
		return this.config.collections[collectionName]?.indexName || collectionName;
	}

	/**
	 * Initializes indexer for taking item indexes.
	 *
	 * @memberof IndexerFacade
	 */
	public async initCollectionIndexes() {
		for (const collection of Object.keys(this.config.collections)) {
			await this.ensureCollectionIndex(collection);
			await this.initItems(collection);
		}
	}

	/**
	 * Initializes Directus items inside an index collection.
	 *
	 * @param {string} collectionName Name of the Directus collection to be synchronized\
	 * (indexer collection name can optionally be set in config).
	 * @return {*}  {Promise<void>} An async callback.
	 * @memberof IndexerFacade
	 */
	public async initItems(collectionName: string): Promise<void> {
		const schema = await this.context.getSchema();

		if (!schema.collections[collectionName]) {
			this.context.logger.warn(`Collection "${collectionName}" does not exists.`);
			return;
		}

		const query = new this.context.services.ItemsService(collectionName, { database: this.context.database, schema });

		try {
			await this.indexerInstance.deleteItems(this.getCollectionIndexName(collectionName));
		} catch (error) {
			this.context.logger.warn(`Cannot drop collection "${collectionName}". ${buildErrorMessage(error)}`);
			this.context.logger.debug(error);
		}

		const pk = schema.collections[collectionName]?.primary;
		const limit = this.config.batchLimit || 100;
		if (!pk) {
			this.context.logger.warn(`Collection "${collectionName}" has no registered primary key. Skipping update.`);
		} else {
			for (let offset = 0; ; offset += limit) {
				const items = await query.readByQuery({
					fields: [pk],
					filter: this.config.collections[collectionName]?.filter || [],
					limit,
					offset,
				});

				if (!items || !items.length) break;

				await this.updateItemIndexes(
					collectionName,
					items.map((item: Object) => item[pk as keyof Object])
				);
			}
		}
	}

	/**
	 * LEGACY - Prepares object for insertion into indexing system.\
	 * Either executes the configured transform function, flattens the object for readability or just returns the provided structure.
	 *
	 * @param {Object} body The object to be inserted into indexing system.
	 * @param {string} collectionName Name of the Directus collection to be synchronized\
	 * (indexer collection name can optionally be set in config).
	 * @return {*}  {Object} The prepared input object.
	 * @memberof IndexerFacade
	 */
	public prepareObject(body: Object, collectionName: string) : Object {
		const meta = new Object();

		const collectionEntry = this.config.collections[collectionName];
		if (collectionEntry?.collectionField) {
			Object.assign(meta, { [collectionEntry.collectionField as keyof Object]: collectionName });
		}

		if (collectionEntry?.transform) {
			// ? Transform functionality has not been tested during initial development.
			// ? Since it is not in focus for DerSkillBaumApfels current use case,
			// ? this feature will be postponed but is kept for base structuring if somebody wants to extend/test it.
			return {
				...collectionEntry.transform(
					body,
					{
						striptags,
						flattenObject,
						objectMap,
					},
					collectionName
				),
				...meta,
			};
		} else if (collectionEntry?.fields) {
			return {
				...flattenObject(body),
				...meta,
			};
		}

		return {
			...body,
			...meta,
		};
	}

	/**
	 * Updates multiple items inside indexing system based on their ids.
	 *
	 * @param {string} collectionName Name of the Directus collection to be synchronized\
	 * (indexer collection name can optionally be set in config).
	 * @param {string[]} ids Array of item ids to be updated.\
	 * (indexer item ids match directus item ids)
	 * @return {*}  {Promise<void>} An async callback.
	 * @memberof IndexerFacade
	 */
	public async updateItemIndexes(collectionName: string, ids: string[]): Promise<void> {
		const schema = await this.context.getSchema();

		const collectionIndex = this.getCollectionIndexName(collectionName);

		const query = new this.context.services.ItemsService(collectionName, {
			knex: this.context.database,
			schema: schema,
		});

		const pkName = schema.collections[collectionName]?.primary;
		if (!pkName) {
			this.context.logger.warn(`Collection "${collectionName}" has no registered primary key. Skipping update.`);
		} else {
			const configEntry = this.config.collections[collectionName];
			const items = await query.readMany(ids, {
				fields: configEntry?.fields ? [pkName, ...configEntry.fields] : ['*'],
				filter: configEntry?.filter || [],
			});

			const processedIds: string[] = [];

			for (const item of items) {
				const id = item[pkName];
				console.log("PREPARED ITEM")
				console.log(item[pkName])
				try {
					await this.indexerInstance.upsertItem(collectionIndex, id, this.prepareObject(item, collectionName), pkName);

					processedIds.push(id);
				} catch (error) {
					this.context.logger.warn(`Cannot index "${collectionIndex}/${id}". ${buildErrorMessage(error)}`);
					this.context.logger.debug(error);
				}
			}

			if (items.length < ids.length) {
				for (const id of ids.filter((x) => !processedIds.includes(x))) {
					try {
						await this.indexerInstance.deleteItem(collectionIndex, id);
					} catch (error) {
						this.context.logger.warn(`Cannot index "${collectionIndex}/${id}". ${buildErrorMessage(error)}`);
						this.context.logger.debug(error);
					}
				}
			}
		}
	}

	// #endregion
}
