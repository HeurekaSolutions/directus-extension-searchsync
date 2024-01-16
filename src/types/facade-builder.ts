import { ApiExtensionContext } from "@directus/extensions";
import { ExtensionConfig } from "./configuration/extension-config";
import { IndexerFacade } from "./indexer-facade";

// #region Functions

/**
 * A facade Builder to keep extensibility and to unify factory/builder pattern usage throughout the extension.
 *
 * @export
 * @param {ExtensionConfig} config The configuration used for facade parameterization.
 * @param {ApiExtensionContext} context The {@link ApiExtensionContext} provided by Directus for CMS access.
 * @return {*}  {IndexerFacade} The built facade set up with specified configuration.
 */
export function buildFacade(config: ExtensionConfig, context: ApiExtensionContext): IndexerFacade {
    if (!config)
        throw new Error(`Configuration is invalid or has not been provided.`)

    const facadeInstance = new IndexerFacade(config, context);
    if (!facadeInstance)
        throw new Error(`Indexer facade could not be instantiated.`)

    return facadeInstance;
}

// #endregion
