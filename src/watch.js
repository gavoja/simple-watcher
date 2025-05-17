import { watch as nodeWatch } from 'node:fs/promises'
import path from 'node:path'

let lastChangedPath = null

export default async function * watch (pathsToWatch, options = {}) {
  pathsToWatch = Array.isArray(pathsToWatch) ? pathsToWatch : [pathsToWatch]

  for (const pathToWatch of pathsToWatch) {
    try {
      const watcher = nodeWatch(pathToWatch, { ...options, recursive: true })
      for await (const event of watcher) {
        const currentPath = path.resolve(event.filename).replace(/\\/g, '/')

        // Event deduplication.
        if (lastChangedPath !== currentPath && lastChangedPath?.startsWith(currentPath) && event.eventType === 'change') {
          continue
        }

        lastChangedPath = currentPath
        yield currentPath
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }

      throw err
    }
  }
}
