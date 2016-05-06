'use strict'

const fs = require('fs')
const path = require('path')

const PLATFORMS = ['win32', 'darwin']

// OS watcher.
let watchFolder = (workingDir, recursive, callback) => {
  let options = { persistent: true, recursive: recursive }

  fs.watch(workingDir, options, (event, fileName) => {
    callback(path.join(workingDir, fileName))
  })
}

// Attach watchers recursively.
// This code is synchronous in order to be able tell when it actuall ends.
let watchFolderFallback = (parent, callback) => {
  // Skip if not a directory.
  if (!fs.statSync(parent).isDirectory()) {
    return
  }

  fs.stat(parent, (err, stats) => {
    if (err || !stats.isDirectory()) {
      return
    }

    watchFolder(parent, false, callback)

    // Iterate over list of children.
    fs.readdir(parent, (err, children) => {
      if (err) {
        return
      }

      children.forEach((child) => {
        child = path.resolve(parent, child)
        watchFolderFallback(child, callback)
      })
    })
  })
}

let watch = (workingDir, callback) => {
  workingDir = path.resolve(workingDir)

  if (PLATFORMS.indexOf(process.platform) !== -1) {
    watchFolder(workingDir, true, callback)
  } else {
    watchFolderFallback(workingDir, callback)
  }
}

module.exports = watch
