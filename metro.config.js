// @ts-check
const fs = require('fs')
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

// Metro file-map cache defaults to the OS temp dir (`metro-file-map-*` files). Those
// blobs are V8-deserialized; after a Node or Metro upgrade they can throw
// "Unable to deserialize cloned data" and Metro falls back to a full crawl.
// Keeping the cache under the project avoids stale global temp entries.
const fileMapCacheDirectory = path.join(projectRoot, '.metro', 'file-map')
fs.mkdirSync(fileMapCacheDirectory, { recursive: true })
config.fileMapCacheDirectory = fileMapCacheDirectory

module.exports = config
