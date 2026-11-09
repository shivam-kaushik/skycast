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

// Git worktrees under .worktrees/ carry their own node_modules; crawling them
// exhausts watchers/memory on Windows and is never part of this app's bundle.
const existingBlockList = config.resolver.blockList
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /[\\/]\.worktrees[\\/].*/,
]

module.exports = config
