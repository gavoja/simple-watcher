'use strict'

const fs = require('fs')
const path = require('path')

const PLATFORMS = ['win32', 'darwin']
const INTERVAL = 300

// OS watcher.
let watchFolder = (workingDir, recursive, callback) => {
  let options = { persistent: true, recursive: recursive }

  let w = fs.watch(workingDir, options, (event, fileName) => {
    // On Windows fileName may actually be empty.
    // In such case assume this is the working dir change.
    let filePath = fileName ? path.join(workingDir, fileName) : workingDir
    callback(filePath)
  })

  w.on('error', (e) => {
    w.close()
  })
}

// Recursive fallback handler.
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

  // Use recursive flag if natively available.
  if (PLATFORMS.indexOf(process.platform) !== -1) {
    return watchFolder(workingDir, true, callback)
  }

  // Attach handlers for each folder recursively.
  let cache = {}
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

let main = (workingDir, callback, interval) => {
  interval = interval !== undefined ? interval : INTERVAL
  // Enqueue items on change.
  let queue = []
  watch(workingDir, (filePath) => {
    queue.push(filePath)
  })

  // Start the interval.
  setInterval(() => {
    // Dequeue paths and store them as dictionary keys.
    let dict = {}
    while (queue.length) {
      dict[queue.pop()] = true
    }

    // Run callback with unique paths.
    let unique = Object.keys(dict)
    unique.length && callback(unique)
  }, interval)
}

module.exports = main
