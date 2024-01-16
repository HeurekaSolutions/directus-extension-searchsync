import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { URL } from 'url';
import { IndexerConfig } from "../types/configuration/indexer-config";
import { IndexerInterface } from "../types/indexer-interface";

// Ported from fork base, but untested.
export class Elasticsearch extends IndexerInterface {
    // #region Properties

    private readonly axiosConfig: AxiosRequestConfig;

    // #endregion

    // #region Constructors

    constructor(config: IndexerConfig) {
        super(config);

        this.axiosConfig = {
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers || {}),
            }
        };

        if (config.username && config.password) {
            this.axiosConfig.auth = {
                username: config.username,
                password: config.password
            }
        }

        if (config.ignore_cert) {
            const agent = new https.Agent({
                rejectUnauthorized: false
            });

            this.axiosConfig.httpsAgent = agent;
        }

        if (!config.host) {
            throw Error('No HOST set. The server.host is mandatory.');
        }

        const host = new URL(config.host);
        if (!host.hostname || !host.pathname || host.pathname !== '/') {
            throw Error('Invalid server.host, it must be like http://ee.example.com and without path for index');
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
            await axios.delete(`${this.config.host}/${collectionName}/_doc/${id}`, this.axiosConfig);
        } catch (error: any) {
            if (error.response && error.response.status === 404) return;

            throw error;
        }
    }

    public override async deleteItems(collectionName: string): Promise<void> {
        try {
            await axios.post(
                `${this.config.host}/${collectionName}/_delete_by_query`,
                {
                    query: {
                        match_all: {},
                    },
                },
                this.axiosConfig
            );
        } catch (error: any) {
            if (error.response && error.response.status === 404) return;

            throw error;
        }
    }

    public override async upsertItem(collectionName: string, id: string, data: object, pk?: string | undefined): Promise<void> {
        try {
            await axios.post(`${this.config.host}/${collectionName}/_doc/${id}`, data, this.axiosConfig);
        } catch (error: any) {
            if (error.response) {
                throw { message: error.toString(), response: error.response };
            }

            throw error;
        }
    }

    // #endregion
}