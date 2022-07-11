'use strict'

import fs from 'fs'
import path from 'path'

const TOLERANCE = 200 // For ReadDirectoryChangesW() double reporting.
const PLATFORMS = ['win32', 'darwin'] // Native recursive support.

// -----------------------------------------------------------------------------
// HELPERS AND POLYFILLS
// TODO: Refactor after fsPromises.watch is available in the next LTS version.
// -----------------------------------------------------------------------------

// Graceful closing.
function createWatchers (abortSignal) {
  const watchers = {}

  // Close all watchers on abort.
  abortSignal && abortSignal.addEventListener('abort', () => {
    for (const entityPath of Object.keys(watchers)) {
      close(entityPath)
    }
  })

  function has (entityPath) {
    return !!watchers[entityPath]
  }

  function add (entityPath, w) {
    if (!has(entityPath)) {
      watchers[entityPath] = w
      w.on('error', () => watchers.close(entityPath))
    }
  }

  function close (entityPath) {
    if (has(entityPath)) {
      watchers[entityPath].close()
      delete watchers[entityPath]
    }
  }

  return { add, has, close }
}

// Chanel support for asyc generators.
function createChannel (abortSignal) {
  const messageQueue = []
  const promiseQueue = []

  abortSignal && abortSignal.addEventListener('abort', () => {
    const nextPromise = promiseQueue.shift()
    nextPromise && nextPromise.resolve()
  })

  function put (msg) {
    // Anyone waiting for a message?
    if (promiseQueue.length) {
      // Deliver the message to the oldest one waiting (FIFO).
      const nextPromise = promiseQueue.shift()
      nextPromise.resolve(msg)
    } else {
      // No one is waiting - queue the event.
      messageQueue.push(msg)
    }
  }

  function take () {
    // Do we have queued messages?
    if (messageQueue.length) {
      // Deliver the oldest queued message.
      return Promise.resolve(messageQueue.shift())
    } else {
      // No queued messages - queue the taker until a message arrives.
      return new Promise((resolve, reject) => promiseQueue.push({ resolve, reject }))
    }
  }

  return { put, take }
}

// -----------------------------------------------------------------------------
// WATCHERS
// -----------------------------------------------------------------------------

// Native recursive watcher.
function watchNative (pathToWatch, options, callback) {
  const last = { filePath: null, timestamp: 0 }
  const recursive = options.recursive ?? true

  // Do not create a watcher if already present.
  if (options.watchers.has(pathToWatch)) {
    return
  }

  const w = fs.watch(pathToWatch, { recursive }, async (event, fileName) => {
    // On Windows fileName may actually be empty.
    // In such case assume this is the working dir change.
    const filePath = fileName ? path.join(pathToWatch, fileName) : pathToWatch
    // callback(filePath)
    try {
      const stat = await fs.promises.stat(filePath)
      const timestamp = (new Date(stat.mtime)).getTime()
      const ready = timestamp - last.timestamp >= options.tolerance
      const fileMatches = filePath === last.filePath
      last.filePath = filePath
      last.timestamp = timestamp

      // Avoid double reporting if change occurs withint the tolerance.
      if (!fileMatches || ready) {
        callback(filePath)
      }
    } catch (err) {
      // File is likely deleted.
      callback(filePath)
    }
  })

  options.watchers.add(pathToWatch, w)
}

// Fallback recursive watcher.
function watchFallback (pathToWatch, options, callback) {
  const dirs = [pathToWatch]

  for (const dir of dirs) {
    // Append dirs with descendants.
    for (const entityName of fs.readdirSync(dir)) {
      const entityPath = path.join(dir, entityName)
      fs.statSync(entityPath).isDirectory() && dirs.push(entityPath)
    }

    // Shallow watch using native watcher.
    watchNative(dir, { ...options, recursive: false }, async entityPath => {
      try {
        const stat = await fs.promises.stat(entityPath)
        // Watch newly created directory.
        if (stat.isDirectory()) {
          watchFallback(entityPath, options, callback)
        }
      } catch (err) {
        // Close watcher for deleted directory.
        options.watchers.close(entityPath)
      }

      callback(entityPath)
    })
  }
}

export default async function * watch (pathsToWatch, options = {}) {
  // Normalize paths to array.
  pathsToWatch = pathsToWatch.constructor === Array ? pathsToWatch : [pathsToWatch]

  // Set default tolerance for Windows.
  options.tolerance = options.tolerance ?? (process.platform === 'win32' ? TOLERANCE : 0)

  // Choose the the watch. function.
  options.fallback = options.fallback ?? !PLATFORMS.includes(process.platform)
  const watchFunction = options.fallback ? watchFallback : watchNative

  // Create watchers registry.
  options.watchers = createWatchers(options.signal)

  // Put results to the channel.
  const channel = createChannel(options.signal)

  for (const pathToWatch of pathsToWatch) {
    watchFunction(path.normalize(pathToWatch), options, changedPath => {
      channel.put(changedPath)
    })
  }

  // Yield changes until aborted.
  const signal = options.signal ?? { aborted: false }
  while (!signal.aborted) {
    const changedPath = await channel.take()
    if (changedPath) { // Path will be undefined when watch is aborted.
      yield changedPath
    }
  }
}
