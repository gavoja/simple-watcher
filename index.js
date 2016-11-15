'use strict'

const fs = require('fs')
const path = require('path')

const TOLERANCE = 200
const PLATFORMS = ['win32', 'darwin']

// OS watcher.
let watchFolder = (workingDir, recursive, tolerance, callback) => {
  let options = { persistent: true, recursive: recursive }
  let last = { filePath: null, timestamp: 0 }

  let w = fs.watch(workingDir, options, (event, fileName) => {
    // On Windows fileName may actually be empty.
    // In such case assume this is the working dir change.
    let filePath = fileName ? path.join(workingDir, fileName) : workingDir

    if (!tolerance) {
      return callback(filePath)
    }

    fs.stat(filePath, (err, stat) => {
      // If error, the file was likely deleted.
      let timestamp = err ? 0 : (new Date(stat.mtime)).getTime()
      let ready = err || timestamp - last.timestamp >= tolerance
      let fileMatches = filePath === last.filePath
      last.filePath = filePath
      last.timestamp = timestamp

      if (fileMatches && !ready) {
        return
      }

      callback(filePath)
    })
  })

  w.on('error', (e) => {
    w.close()
  })
}

let watchFolderFallback = (parent, tolerance, callback) => {
  // This code is synchronous to be able to tell when it actually finishes.
  try {
    // Skip if not a directory.
    if (!fs.statSync(parent).isDirectory()) {
      return
    }

    watchFolder(parent, false, tolerance, callback)

    // Iterate over list of children.
    fs.readdirSync(parent).forEach((child) => {
      child = path.resolve(parent, child)
      watchFolderFallback(child, tolerance, callback)
    })
  } catch (err) {
    console.error(err)
  }
}

let watch = (workingDir, callback, tolerance) => {
  workingDir = path.resolve(workingDir)

  // Set the default tolerance value.
  tolerance = tolerance === undefined ? TOLERANCE : tolerance
  // Enable tolerance only for Windows.
  tolerance = process.platform === 'win32' ? tolerance : 0

  // Use recursive flag if natively available.
  if (PLATFORMS.indexOf(process.platform) !== -1) {
    return watchFolder(workingDir, true, tolerance, callback)
  }

  // Attach handlers for each folder recursively.
  let cache = {}
  watchFolderFallback(workingDir, tolerance, (localPath) => {
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

if (require.main === module) {
  watch(process.argv[2], (fileName) => {
    console.log(`${fileName}`)
  })
}

module.exports = watch
