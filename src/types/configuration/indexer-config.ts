// Template for the configuration of indexer services
export type IndexerConfig = {
	type: string;
	host?: string;
	key?: string;

	appId?: string;
	username?: string,
	password?: string,
	ignore_cert?: boolean,
	headers?: Record<string, string>;
};
