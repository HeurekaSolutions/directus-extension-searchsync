import { ApiExtensionContext } from '@directus/extensions';
import { defineHook } from '@directus/extensions-sdk';
import { createRequire } from "module";
import { buildFacade } from './types/facade-builder';

// Emulates nodeJS require inside "module" type projects.
// Used for blocking/synchronous loading of configuration.
const emulatedRequire = createRequire(import.meta.url);

// Directus hook extension entry point
export default defineHook(({ action, init }, context: ApiExtensionContext): void => {
	// Prepare extension config
	const extensionConfig = loadConfig();
	validateConfig(extensionConfig);

	// Prepare indexer facade
	const indexer = buildFacade(extensionConfig, {
		...context,
		logger: context.logger.child({ extension: 'directus-extension-searchsync' }),
	});

	// Initialize extension and set up CLI commands
	init('cli.before', ({ program }) => {
		const usersCommand = program.command('extension:searchsync');
		context.logger.debug(context.env)
		usersCommand
			.command('index')
			.description(
				'directus-extension-searchsync: Push all documents from all collections, that are setup in extension configuration'
			)
			.action(initCollectionIndexesCommand);
	});

	// If reindexOnStart flag is set in config, reindex on start.
	action('server.start', () => {
		if (!extensionConfig.reindexOnStart) return;
		indexer.initCollectionIndexes();
	});

	// If item is created, look if config includes it and then update search index.
	action('items.create', ({ collection, key }) => {
		if (!(extensionConfig.collections.hasOwnProperty(collection))) return;
		indexer.updateItemIndexes(collection, [key]);
	});

	// If item is updated, look if config includes it and then update search index.
	action('items.update', ({ collection, keys }) => {
		if (!(extensionConfig.collections.hasOwnProperty(collection))) return;
		indexer.updateItemIndexes(collection, keys);
	});

	// If item is deleted, look if config includes it and then remove it from search index.
	action('items.delete', ({ collection, payload }) => {
		if (!(extensionConfig.collections.hasOwnProperty(collection))) return;
		indexer.deleteItemIndexes(collection, payload);
	});

	// LEGACY - Command for collection initialization.
	async function initCollectionIndexesCommand() {
		try {
			await indexer.initCollectionIndexes();
			process.exit(0);
		} catch (error) {
			context.logger.error(error);
			process.exit(1);
		}
	}

	// Loads configuration from specified path
	function loadConfig() {
		context.logger.debug("Provided searchsync config path:")
		context.logger.debug(context.env.SEARCHSYNC_CONFIG_PATH)

		let config = emulatedRequire(context.env.SEARCHSYNC_CONFIG_PATH);
		return config;
	}

	// Ensures that configuration contains all required fields
	function validateConfig(config: unknown) {
		if (typeof config !== 'object') {
			throw Error('Broken config file. Configuration is not an object.');
		}

		if (config && !isKeyOf(config, 'collections')) {
			throw Error('Broken config file. Missing "collections" section.');
		}

		if (config && !isKeyOf(config, 'server')) {
			throw Error('Broken config file. Missing "server" section.');
		}
	}

	// Helper function for checking if key is contained in object
	function isKeyOf<T extends object>(object: T, key: string | number | symbol): key is keyof T {
		return key in object;
	}
});
