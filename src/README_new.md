# Simple search engine indexer
Search engine synchronization hook extension for use with Directus.\
Originally developed by [dimitrov-adrian](https://github.com/dimitrov-adrian/directus-extension-searchsync) and forked for modernization.

## Supported engines

- MeiliSearch
- ~~ElasticSearch~~ (untested but ported)
- ~~Algolia~~ (untested but ported)

## How to install

1. Run the according package manager command in your [Directus](https://github.com/directus/directus) installation root.

   ```
   npm install HeurekaSolutions/directus-extension-searchsync
   ```

   ```
   yarn add https://github.com/HeurekaSolutions/directus-extension-searchsync
   ```

2. Restart Directus

## CLI Commands

Usage: `npx directus extension:searchsync <subcommand>`

Subcommands:

- `index` - Reindex all documents from configuration

## Configuration

The extension uses the `SEARCHSYNC_CONFIG_PATH` [environment variable](https://docs.directus.io/self-hosted/config-options.html) to load configuration.

Configuration must be provided in one of the following file formats:

- .json
- .js

I recommend to create a folder called `config` inside the extension folder and setting SEARCHSYNC_CONFIG_PATH to `./config/{filename.ext} `.\
Config path can either be specified as absolute path inside the filesystem or relative to the extension path.

### Configuration options

This section contains available configuration options and their respective utilization.

- `server: object` Holds configuration for the search engine
- `batchLimit: number` Batch limit when performing index/reindex (defaults to 100)
- `reindexOnStart: boolean` Performs full reindex of all documents upon Directus start
- `collections: object` Indexing data definition. Specifies which Directus collections to synchronize
  - `collections.<collection>.fields: array<string>` Collection field names that will be indexed in Directus format. Defaults to `'*'` if no fields are specified. (check [Global Query Parameters](https://docs.directus.io/reference/query.html#fields))
  - `collections.<collection>.filter: object` The filter query used for item sync. Specified in Directus format. (check [Filter Rules ](https://docs.directus.io/reference/filter-rules/#filter-rules)).
  - `collections.<collection>.indexName: string` LEGACY - Force collection name when storing in search index
  - `collections.<collection>.collectionField: string` LEGACY - If set, such field with value of the collection name will be added to the indexed document. Useful with conjuction with the _indexName_ option.
  - <del>- `collections.<collection>.transform: function` (Could be defined only if config file is .js) A callback to return transformed/formatted data for indexing. </del>\
    transform is deprecated - for more information see `indexer-facade.ts -> prepareObject()`

### Config Examples

#### `searchsync.conf.json`
JSON Format

```json
{
  "server": {
    "type": "meilisearch",
    "host": "http://search:7700/myindex",
    "key": "the-private-key"
  },
  "batchLimit": 100,
  "reindexOnStart": false,
  "collections": {
    "products": {
      "filter": {
        "status": "published",
        "stock": "inStock"
      },
      "fields": [
        "title",
        "image.id",
        "category.title",
        "brand.title",
        "tags",
        "description",
        "price",
        "rating"
      ]
    },
    "posts": {
      "indexName": "blog_posts",
      "collectionField": "_collection",

      "filter": {
        "status": "published"
      },
      "fields": ["title", "teaser", "body", "thumbnail.id"]
    }
  }
}
```

#### `searchsync.conf.js`
JS Format

```javascript
const config = {
  server: {
    type: "meilisearch",
    host: "http://search:7700",
    key: "the-private-key",
  },
  reindexOnStart: false,
  batchLimit: 100,
  collections: {
    pages: {
      filter: {
        status: "published",
      },
      fields: ["title", "teaser", "body", "thumbnail.id"],
      transform: (item, { flattenObject, striptags }) => {
        return {
          ...flattenObject(item),
          body: striptags(item.body),
          someCustomValue: "Hello World!",
        };
      },
    },
  },
};

// Use as object.
module.exports = config;
```

##### Collection transformation callback description

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} utils
 * @param {String} collectionName
 * @returns {Object}
 */
function (item, { striptags, flattenObject, objectMap }, collectionName) {
	return item
}
```

### Search engines config references

#### Meilisearch

```json
{
  "type": "meilisearch",
  "host": "http://search:7700",
  "key": "the-private-key"
}
```

#### Algolia

```json
{
  "type": "algolia",
  "appId": "Application-Id",
  "key": "secret-api-key"
}
```

#### ElasticSearch

New typeless behaviour, use collection names as index name.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/"
}
```

Use Authentification.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "username": "elastic",
  "password": "somepassword"
}
```

Ignore ssl-certificate-error.

```json
{
  "type": "elasticsearch",
  "host": "http://search:9200/",
  "ignore_cert": true
}
```

#### ElasticSearch for 5.x and 6.x

Old type behaviour, use collection names as types.

```json
{
  "type": "elasticsearch_legacy",
  "host": "http://search:9200/projectindex"
}
```