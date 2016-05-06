# Simple Watcher

A simple recursive directory watcher.

## But why?

I know there's plenty of them out there, but most don't seem to care about the `recursive` option of Node's [`fs.watch()`](https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener), which **significantly** improves performance on the supported platforms, especially for large directories.

Features:
* Dead simple and dead lightweight.
* No dependencies.
* Leverages the `recursive` options on OS X and Windows; uses a fallback for other platforms.
* Does not care about Windows reporting multiple changes for one file (a simple workaround for this below).


## Usage

Basic example:

```JavaScript
const watch = require('simple-watcher')

watch('/path/to/directory', (filePath) => {
  console.log(`Changed: ${filePath}`)
})
```

WinAPI's `ReadDirectoryChangesW` double reporting fix:

```JavaScript
const watch = require('simple-watcher')

let last = { filePath: null, timestamp: null }
let delta = 300 // Adjust if needed.

watch('/path/to/directory', (filePath) => {

  // Skip if the last change within the delta time was the same.
  let now = Date.now()
  if (filePath === last.fileName && now - last.timestamp < delta) {
    return
  }

  // Save the change.
  last.filePath = filePath
  last.timestamp = now

  console.log(`Changed: ${filePath}`)
})
```
