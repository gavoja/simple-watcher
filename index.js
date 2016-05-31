'use strict'

const fs = require('fs')
const path = require('path')

const TOLERANCE = 200
const PLATFORMS = ['win32', 'darwin']

// OS watcher.
let watchFolder = (workingDir, recursive, tolerance, callback) => {
  let options = { persistent: true, recursive: recursive }
  let last = { filePath: null, timestamp: null }

  let w = fs.watch(workingDir, options, (event, fileName) => {
    // On Windows fileName may actually be empty.
    let filePath = fileName ? path.join(workingDir, fileName) : workingDir

    // Eliminate double reporting.
    if (tolerance) {
      let now = Date.now()
      if (filePath === last.filePath && now - last.timestamp < tolerance) {
        return
      }

      last.filePath = filePath
      last.timestamp = now
    }

    callback(filePath)
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

let watch = (workingDir, callback, tolerance = TOLERANCE) => {
  workingDir = path.resolve(workingDir)

  // Enable tolerance only for Windows.
  tolerance = process.platform === 'win32' ? tolerance : 0

  // Use recursive flag if natively available.
  if (PLATFORMS.indexOf(process.platform) !== -1) {
    return watchFolder(workingDir, true, tolerance, callback)
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
        watchFolder(localPath, false, tolerance, callback)
      }
    })

    callback(localPath)
  })
}

module.exports = watch
