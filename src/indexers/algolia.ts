import axios, { AxiosRequestConfig } from "axios";
import { IndexerConfig } from "../types/configuration/indexer-config";
import { IndexerInterface } from "../types/indexer-interface";

export class Algolia extends IndexerInterface {
    // #region Properties

    private readonly axiosConfig: AxiosRequestConfig;
    private readonly endpoint: string;

    // #endregion

    // #region Constructors

    constructor(config: IndexerConfig) {
        super(config);

        this.axiosConfig = {
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                ...(config.headers || {}),
            },
        };

        if (config.key && this.axiosConfig.headers) {
            this.axiosConfig.headers = {
                ... this.axiosConfig.headers,
                ... { 'X-Algolia-API-Key': config.key }
            }
        } else {
            throw Error('No API Key set. The server.key is mandatory.');
        }

        if (config.appId && this.axiosConfig.headers) {
            this.axiosConfig.headers = {
                ... this.axiosConfig.headers,
                ... { 'X-Algolia-Application-Id': config.appId }
            }
        } else {
            throw Error('No Application ID set. The server.appId is mandatory.');
        }

        this.endpoint = `https://${config.appId}.algolia.net/1/indexes`;
    }

    public override async createIndex(collectionName: string): Promise<void> { }

    public override async deleteItem(collectionName: string, id: string): Promise<void> {
        try {
            await axios.delete(`${this.endpoint}/${collectionName}/${id}`, this.axiosConfig);
        } catch (error: any) {
            if (error.response && error.response.status === 404) return;

            throw error;
        }
    }

    public override async deleteItems(collectionName: string): Promise<void> {
        try {
            await axios.post(`${this.endpoint}/${collectionName}/clear`, null, this.axiosConfig);
        } catch (error: any) {
            if (error.response && error.response.status === 404) return;

            throw error;
        }
    }



    public override async upsertItem(collectionName: string, id: string, data: object, pk?: string | undefined): Promise<void> {
        try {
            await axios.put(`${this.endpoint}/${collectionName}/${id}`, data, this.axiosConfig);
        } catch (error: any) {
            if (error.response) {
                throw { message: error.toString(), response: error.response };
            }

            throw error;
        }
    }
}