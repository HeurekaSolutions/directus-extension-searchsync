import {
  InvalidProviderConfigError,
  UnprocessableContentError,
} from "@directus/errors";
import { ApiExtensionContext } from "@directus/extensions";
import { defineHook } from "@directus/extensions-sdk";
import { readFileSync, statSync } from "fs";
import { resolve } from "path";
import { SearchsyncConfig } from "./types/configuration/searchsync-config";
import { buildFacade } from "./types/facade-builder";
import { CONFIG_PATH } from "./types/configuration/env-vars";

// Directus hook extension entry point
export default defineHook(
  ({ action, init }, context: ApiExtensionContext): void => {
    const extensionLogger = context.logger.child({
        extension: "directus-extension-searchsync",
      });

    // Prepare extension config
    const extensionConfig = loadConfig();
    validateConfig(extensionConfig);

    // Prepare indexer facade
    const indexer = buildFacade(extensionConfig, {
      ...context,
      logger: extensionLogger
    });

    // Initialize extension and set up CLI commands
    init("cli.before", ({ program }) => {
      const usersCommand = program.command("extension:searchsync");
      usersCommand
        .command("index")
        .description(
          "directus-extension-searchsync: Push all documents from all collections, that are setup in extension configuration",
        )
        .action(initCollectionIndexesCommand);
    });

    // If reindexOnStart flag is set in config, reindex on start.
    action("server.start", () => {
      if (!extensionConfig.reindexOnStart) return;
      indexer.initCollectionIndexes();
    });

    // If item is created, look if config includes it and then update search index.
    action("items.create", ({ collection, key }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.updateItemIndexes(collection, [key]);
    });

    // If item is updated, look if config includes it and then update search index.
    action("items.update", ({ collection, keys }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.updateItemIndexes(collection, keys);
    });

    // If item is deleted, look if config includes it and then remove it from search index.
    action("items.delete", ({ collection, payload }) => {
      if (!extensionConfig.collections.hasOwnProperty(collection)) return;
      indexer.deleteItemIndexes(collection, payload);
    });

    // LEGACY - Command for collection initialization.
    async function initCollectionIndexesCommand() {
      try {
        await indexer.initCollectionIndexes();
        process.exit(0);
      } catch (error) {
        extensionLogger.error(error);
        process.exit(1);
      }
    }

    // Loads configuration from specified path
    function loadConfig() {
      if (!context.env[CONFIG_PATH])
        throw new InvalidProviderConfigError({
          provider: "Searchsync_extension",
          reason: "No searchsync config provided",
        });

      extensionLogger.debug(
        context.env[CONFIG_PATH],
        "Provided searchsync config path:",
      );

      const absolutePath = resolve(process.cwd(), context.env[CONFIG_PATH]);
      const fileStats = statSync(absolutePath);

      if (!fileStats.isFile()) {
        throw new UnprocessableContentError({
          reason: `Config file at location "${context.env[CONFIG_PATH]}" could not be found`,
        });
      }

      try {
        const jsonString = readFileSync(absolutePath, { encoding: "utf-8" });
        const config = JSON.parse(jsonString) as SearchsyncConfig;
        return config;
      } catch (err) {
        throw new UnprocessableContentError({
          reason: `Config file at location "${context.env[CONFIG_PATH]}" cannot be loaded as JSON configuration`,
        });
      }
    }

    // Ensures that configuration contains all required fields
    function validateConfig(config: unknown) {
      if (typeof config !== "object") {
        throw Error("Broken config file. Configuration is not an object.");
      }

      if (config && !isKeyOf(config, "collections")) {
        throw Error('Broken config file. Missing "collections" section.');
      }

      if (config && !isKeyOf(config, "server")) {
        throw Error('Broken config file. Missing "server" section.');
      }
    }

    // Helper function for checking if key is contained in object
    function isKeyOf<T extends object>(
      object: T,
      key: string | number | symbol,
    ): key is keyof T {
      return key in object;
    }
  },
);
