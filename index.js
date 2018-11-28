'use strict'

const fs = require('fs')
const path = require('path')

const TOLERANCE = 200
const PLATFORMS = ['win32', 'darwin']

const DEFAULT_OPTIONS = {
  tolerance: TOLERANCE,
  usePolling: false
}

// OS watcher.
let watchFolder = (workingDir, recursive, settings, callback) => {
  let options = { persistent: true, recursive: recursive }
  let last = { filePath: null, timestamp: 0 }

  let w = fs.watch(workingDir, options, (event, fileName) => {
    // On Windows fileName may actually be empty.
    // In such case assume this is the working dir change.
    let filePath = fileName ? path.join(workingDir, fileName) : workingDir

    if (!settings.tolerance) {
      return callback(filePath)
    }

    fs.stat(filePath, (err, stat) => {
      // If error, the file was likely deleted.
      let timestamp = err ? 0 : (new Date(stat.mtime)).getTime()
      let ready = err || timestamp - last.timestamp >= settings.tolerance
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

let watchFolderFallback = (parent, settings, callback) => {
  // This code is synchronous to be able to tell when it actually finishes.
  try {
    // Skip if not a directory.
    if (!fs.statSync(parent).isDirectory()) {
      return
    }

    watchFolder(parent, false, settings, callback)

    // Iterate over list of children.
    fs.readdirSync(parent).forEach((child) => {
      child = path.resolve(parent, child)
      watchFolderFallback(child, settings, callback)
    })
  } catch (err) {
    console.error(err)
  }
}

let watchFile = (filePath, settings, callback) => {
  fs.watchFile(filePath, (curr, prev) => {
    const isRemoved = curr.mtime === 0
    if (isRemoved) {
      fs.unwatchFile(filePath)
    } else {
      const currStamp = (new Date(curr.mtime)).getTime()
      const prevStamp = (new Date(prev.mtime)).getTime()
      // Ready if file reappeared or tolerance reached
      const ready = (curr === prev) || (!settings.tolerance) || (currStamp - prevStamp >= settings.tolerance)

      if (ready) {
        callback(filePath)
      }
    }
  })
}

let watch = (watchedDirs, callback, options) => {
  // Normalize watchedDirs to array if passed a string (polling requires an array with all file paths to be watched).
  if (!Array.isArray(watchedDirs)) {
    watchedDirs = [watchedDirs]
  }
  watchedDirs = watchedDirs.map(watchedDir => path.resolve(watchedDir))
  const settings = Object.assign({}, DEFAULT_OPTIONS, options)

  // Enable tolerance only for Windows.
  if (process.platform !== 'win32') {
    settings.tolerance = 0
  }

  watchedDirs.forEach(watchedDir => {
    // If polling, use the direct file path.
    if (settings.usePolling) {
      return watchFile(watchedDir, settings, callback)
    }

    // Use recursive flag if natively available.
    if (PLATFORMS.includes(process.platform)) {
      return watchFolder(watchedDir, true, settings, callback)
    }

    // Attach handlers for each folder recursively.
    let cache = {}
    watchFolderFallback(watchedDir, settings, (localPath) => {
      fs.stat(localPath, (err, stat) => {
        // Delete cache entry.
        if (err) {
          delete cache[localPath]
          return
        }

        // Add new handler for new directory and save in cache.
        if (stat.isDirectory() && !cache[localPath]) {
          cache[localPath] = true
          watchFolder(localPath, false, settings, callback)
        }
      })

      callback(localPath)
    })
  })
}

if (require.main === module) {
  watch(process.argv[2], fileName => {
    console.log(`${fileName}`)
  })
}

module.exports = watch
