# Simple Watcher

A simple recursive directory watcher.

## But why?

I know there's plenty of them out there, but most don't seem to care about the `recursive` option of Node's [`fs.watch()`](https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener), which **significantly** improves performance on the supported platforms, especially for large directories.

Features:
* Dead simple and dead lightweight.
* No dependencies.
* Leverages the `recursive` options on OS X and Windows; uses a fallback for other platforms.
* Takes care of WinAPI's `ReadDirectoryChangesW` [double reporting](http://stackoverflow.com/questions/14036449/c-winapi-readdirectorychangesw-receiving-double-notifications).

## Usage

```JavaScript
const watch = require('simple-watcher')

/**
 * Recursively watches for directory changes.
 * @param {string} workingDir - Directory to watch.
 * @param {function} callback - Triggered on change.
 * @param {number} tolerance - Interval in which multiple changes to the same file
 *                             on Windows will be treated as one; default is 200ms.
 */
watch('/path/to/directory', (filePath) => {
  console.log(`Changed: ${filePath}`)
})
```
