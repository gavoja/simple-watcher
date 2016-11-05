# Simple Watcher

A simple recursive directory watcher.

## But why?

I know there's plenty of them out there, but most don't seem to care about the `recursive` option of Node's [`fs.watch()`](https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener), which **significantly** improves performance on the supported platforms, especially for large directories.

Features:
* Dead simple and dead lightweight.
* No dependencies.
* Leverages the `recursive` options on OS X and Windows; uses a fallback for other platforms.
* Takes care of WinAPI's `ReadDirectoryChangesW` [double reporting](http://stackoverflow.com/questions/14036449/c-winapi-readdirectorychangesw-receiving-double-notifications) by triggering callback during an interval window.

## Usage

```JavaScript
const watch = require('simple-watcher')

/**
 * Recursively watches for directory changes.
 * @param {string} workingDir - Directory to watch.
 * @param {function} callback - Triggered on change during an interval window.
 * @param {number} interval - Interval window size; default is 300ms.
 */
watch('/path/to/directory', (files) => {
  files.forEach(filePath => console.log(`Changed: ${filePath}`))
})
```
