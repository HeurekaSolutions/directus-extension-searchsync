import { ApiExtensionContext } from "@directus/extensions";
import { Accountability } from "@directus/types";
import striptags from "striptags";
import { INDEXER_FACTORY_MAP } from "../indexers/indexer-factory-map";
import { buildErrorMessage, flattenObject, objectMap } from "../utils";
import { SearchsyncConfig } from "./configuration/searchsync-config";
import { buildIndexer } from "./indexer-factory";
import { IndexerInterface } from "./indexer-interface";
import { InvalidProviderConfigError } from "@directus/errors";

/**
 * A Facade abstracting {@link IndexerInterface} calls with Directus data.
 * Intended to be consumed by endpoints/hooks.
 *
 * @export
 * @class IndexerFacade
 */
export class IndexerFacade {
  // #region Properties

  public readonly indexerInstance: IndexerInterface;

  // #endregion

  // #region Constructors

  constructor(
    protected config: SearchsyncConfig,
    protected context: ApiExtensionContext
  ) {
    if (!config.server.type || !INDEXER_FACTORY_MAP.get(config.server.type))
      throw new InvalidProviderConfigError({
        provider: "Searchsync_extension",
        reason: `Broken config file. Missing or invalid indexer type. Provided: "${
          config.server.type || "Undefined"
        }".`,
      });

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
  public async deleteItemIndexes(
    collectionName: string,
    ids: string[]
  ): Promise<void> {
    const collectionIndex = this.getCollectionIndexName(collectionName);
    for (const id of ids) {
      try {
        await this.indexerInstance.deleteItem(collectionIndex, id);
      } catch (err) {
        this.context.logger.error(
          err,
          `Cannot delete "${collectionIndex}/${id}"`
        );
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
  protected async ensureCollectionIndex(collectionName: string): Promise<void> {
    const collectionIndex = this.getCollectionIndexName(collectionName);
    try {
      await this.indexerInstance.createIndex(collectionIndex);
    } catch (err) {
      this.context.logger.error(
        err,
        `Cannot create collection "${collectionIndex}"`
      );
    }
  }

  /**
   * Used for deciding if an alternate indexing name is set for Directus collection configuration.
   *
   * @param {string} collectionName The collection name to be looked up inside configuration.
   * @return {*}  {string} The definitive name for a collection inside the indexing system.
   * @memberof IndexerFacade
   */
  protected getCollectionIndexName(collectionName: string): string {
    return this.config.collections[collectionName]?.indexName || collectionName;
  }

  /**
   * Initializes indexer for taking item indexes.
   *
   * @param {Accountability} [accountability] The directus accountability object used for operations
   * @memberof IndexerFacade
   */
  public async initCollectionIndexes(accountability?: Accountability) {
    for (const collection of Object.keys(this.config.collections)) {
      await this.ensureCollectionIndex(collection);
      await this.initItems(collection, accountability);
    }
  }

  /**
   * Initializes Directus items inside an index collection.
   *
   * @param {string} collectionName Name of the Directus collection to be synchronized\
   * (indexer collection name can optionally be set in config).
   * @param {Accountability} [accountability] The directus accountability object used for operations
   * @return {*}  {Promise<void>} An async callback.
   * @memberof IndexerFacade
   */
  protected async initItems(
    collectionName: string,
    accountability?: Accountability
  ): Promise<void> {
    const schema = await this.context.getSchema();

    if (!schema.collections[collectionName]) {
      this.context.logger.warn(
        `Collection "${collectionName}" does not exists. Skipping initialization.`
      );
      return;
    }

    const query = new this.context.services.ItemsService(collectionName, {
      schema,
      accountability,
    });

    try {
      await this.indexerInstance.deleteItems(
        this.getCollectionIndexName(collectionName)
      );
    } catch (err) {
      this.context.logger.error(
        err,
        `Cannot drop collection "${collectionName}"`
      );
    }

    const pk = schema.collections[collectionName]?.primary;
    const limit = this.config.batchLimit || 100;
    if (!pk) {
      this.context.logger.warn(
        `Collection "${collectionName}" has no registered primary key. Skipping update.`
      );
    } else {
      for (let offset = 0; ; offset += limit) {
        const items = await query.readByQuery({
          fields: [pk],
          filter: this.config.collections[collectionName]?.filter || null,
          limit,
          offset,
        });

        if (!items || !items.length) break;

        await this.updateItemIndexes(
          collectionName,
          items.map((item) => item[pk as keyof typeof item])
        );
      }
    }
  }

  /**
   * Prepares object for insertion into indexing system.\
   * Either executes the configured transform function, flattens the object for readability or just returns the provided structure.
   *
   * @param {Object} body The object to be inserted into indexing system.
   * @param {string} collectionName Name of the Directus collection to be synchronized\
   * (indexer collection name can optionally be set in config).
   * @return {*}  {Object} The prepared input object.
   * @memberof IndexerFacade
   */
  private prepareObject(body: Object, collectionName: string): Object {
    const meta = new Object();

    const collectionEntry = this.config.collections[collectionName];
    if (collectionEntry?.collectionField) {
      Object.assign(meta, {
        [collectionEntry.collectionField as keyof Object]: collectionName,
      });
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
   * @param {Accountability} [accountability] The directus accountability object used for operations
   * @return {*}  {Promise<void>} An async callback.
   * @memberof IndexerFacade
   */
  public async updateItemIndexes(
    collectionName: string,
    ids: string[],
    accountability?: Accountability
  ): Promise<void> {
    const schema = await this.context.getSchema();

    const collectionIndex = this.getCollectionIndexName(collectionName);

    const query = new this.context.services.ItemsService(collectionName, {
      schema,
      accountability,
    });

    const pkName = schema.collections[collectionName]?.primary;
    if (!pkName) {
      this.context.logger.warn(
        `Collection "${collectionName}" has no registered primary key. Skipping update.`
      );
    } else {
      const configEntry = this.config.collections[collectionName];
      const items = await query.readMany(ids, {
        fields: configEntry?.fields ? [pkName, ...configEntry.fields] : ["*"],
        filter: configEntry?.filter || null,
      });

      const processedIds: string[] = [];

      for (const item of items) {
        const id = item[pkName];
        try {
          await this.indexerInstance.upsertItem(
            collectionIndex,
            id,
            this.prepareObject(item, collectionName),
            pkName
          );

          processedIds.push(id);
        } catch (err) {
          this.context.logger.error(
            err,
            `Cannot index "${collectionIndex}/${id}"`
          );
        }
      }

      if (items.length < ids.length) {
        for (const id of ids.filter((x) => !processedIds.includes(x))) {
          try {
            await this.indexerInstance.deleteItem(collectionIndex, id);
          } catch (err) {
            this.context.logger.error(
              err,
              `Cannot index "${collectionIndex}/${id}"`
            );
          }
        }
      }
    }
  }

  // #endregion
}
