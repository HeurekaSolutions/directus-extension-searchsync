import axios, { AxiosRequestConfig } from 'axios';
import { URL } from 'url';
import { IndexerInterface } from "../types/indexer-interface";
import { IndexerConfig } from "../types/configuration/indexer-config";

/**
 * Operation interface for Meilisearch API using HTTP calls (POST, GET) via axios.
 * For more interface details see {@link IndexerInterface}.
 *
 * @export
 * @class Meilisearch
 * @extends {IndexerInterface}
 */
export class Meilisearch extends IndexerInterface {
	// #region Properties

	private readonly axiosConfig: AxiosRequestConfig;

	// #endregion

	// #region Constructors

	constructor(config: IndexerConfig) {
		super(config);

		this.axiosConfig = {
			headers: config.headers || {},
		};

		if (config.key && this.axiosConfig.headers) {
			// Auth headers for 0.25+
			this.axiosConfig.headers.Authorization = `Bearer ${config.key}`;

			// Include old headers for compatibility with pre-0.25 versions of Meilisearch -- LEGACY of fork base
			this.axiosConfig.headers.put('X-Meili-API-Key', config.key);
		}

		if (!config.host) {
			throw Error('No HOST set. The server.host is mandatory.');
		}

		const host = new URL(config.host);
		if (!host.hostname || (host.pathname && host.pathname !== '/')) {
			throw Error(`Invalid server.host, it must be like http://meili.example.com/`);
		}
	}

	// #endregion

	// #region Public Methods

	public override async createIndex(collectionName: string): Promise<void> {
		// ? don't exactly know why this is unused, but took it like that from fork base.
		// ? seems like some sort of extensibility measures for indexers/search engines that do not create indexes on insert.
	}

	public override async deleteItem(collectionName: string, id: string): Promise<void> {
		try {
			await axios.delete(`${this.config.host}/indexes/${collectionName}/documents/${id}`, this.axiosConfig);
		} catch (error: any) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	public override async deleteItems(collectionName: string): Promise<void> {
		try {
			await axios.delete(`${this.config.host}/indexes/${collectionName}`, this.axiosConfig);
		} catch (error: any) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	public override async upsertItem(collectionName: string, id: string, data: object, pk?: string | undefined): Promise<void> {
		try {
			await axios.post(
				`${this.config.host}/indexes/${collectionName}/documents?primaryKey=${pk}`,
				[{ [`${pk}`]: id, ...data }],
				this.axiosConfig
			);
		} catch (error: any) {
			if (error.response) {
				throw { message: error.toString(), response: error.response };
			}

			throw error;
		}
	}

	// #endregion
}