'use strict'

const fs = require('fs')
const path = require('path')

const PLATFORMS = ['win32', 'darwin']

// OS watcher.
let watchFolder = (workingDir, recursive, callback) => {
  let options = { persistent: true, recursive: recursive }

  let w = fs.watch(workingDir, options, (event, fileName) => {
    callback(path.join(workingDir, fileName))
  })

  w.on('error', (e) => {
    w.close()
  })
}

let watchFolderFallback = (parent, callback) => {
  // This code is synchronous to be able to tell when it actually finishes.
  try {
    // Skip if not a directory.
    if (!fs.statSync(parent).isDirectory()) {
      return
    }

    watchFolder(parent, false, callback)

    // Iterate over list of children.
    fs.readdirSync(parent).forEach((child) => {
      child = path.resolve(parent, child)
      watchFolderFallback(child, callback)
    })
  } catch (err) {
    console.error(err)
  }
}

let watch = (workingDir, callback) => {
  workingDir = path.resolve(workingDir)

  let cache = {}

  if (PLATFORMS.indexOf(process.platform) !== -1) {
    return watchFolder(workingDir, true, callback)
  }

  watchFolderFallback(workingDir, (localPath) => {
    fs.stat(localPath, (err, stat) => {
      // Delete cache entry.
      if (err) {
        delete cache[localPath]
        return
      }

      // Add new handler for new directory and save in cache.
      if (stat.isDirectory() && !cache[localPath]) {
        cache[localPath] = true
        watchFolder(localPath, false, callback)
      }
    })

    callback(localPath)
  })
}

module.exports = watch
