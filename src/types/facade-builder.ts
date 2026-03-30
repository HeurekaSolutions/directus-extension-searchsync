import { ApiExtensionContext } from "@directus/extensions";
import {
  InvalidProviderConfigError,
  ServiceUnavailableError,
} from "@directus/errors";
import { SearchsyncConfig } from "./configuration/searchsync-config";
import { IndexerFacade } from "./indexer-facade";

// #region Functions

/**
 * A facade Builder to keep extensibility and to unify factory/builder pattern usage throughout the extension.
 *
 * @export
 * @param {SearchsyncConfig} config The configuration used for facade parameterization.
 * @param {ApiExtensionContext} context The {@link ApiExtensionContext} provided by Directus for CMS access.
 * @return {*}  {IndexerFacade} The built facade set up with specified configuration.
 */
export function buildFacade(
  config: SearchsyncConfig,
  context: ApiExtensionContext
): IndexerFacade {
  if (!config)
    throw new InvalidProviderConfigError({
      provider: "Searchsync_extension",
      reason: `Configuration is invalid or has not been provided.`,
    });

  try {
    return new IndexerFacade(config, context);
  } catch (err) {
    throw new ServiceUnavailableError({
      service: "Searchsync_extension",
      reason: `Indexer facade could not be instantiated.`,
    });
  }
}

// #endregion
