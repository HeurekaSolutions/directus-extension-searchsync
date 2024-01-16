import { Filter } from "@directus/types";

// Template for the configuration of collection indexing
export type CollectionConfig = {
	collection?: string;
	collectionName?: string;
	collectionField?: string;
	indexName?: string;
	fields?: string[];
	filter?: Filter;
	transform?: (input: object, utils: Record<string, Function>, collectionName: string) => object;
};