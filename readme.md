# Simple Watcher

A simple recursive directory watcher.

## But why?

Most watchers do not seem to care about the `recursive` option of Node's [`fs.watch()`](https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener), which **significantly** improves performance on the supported platforms, especially for large directories.

Features:
* Simple, fast and lightweight.
* No dependencies.
* Leverages the `recursive` option on OS X and Windows for improved performance; uses a fallback for other platforms.
* Takes care of WinAPI's `ReadDirectoryChangesW` [double reporting](http://stackoverflow.com/questions/14036449/c-winapi-readdirectorychangesw-receiving-double-notifications).
* Modern API without callbacks.

## Usage

### Command line

```
Usage:
  simple-watcher path1 [path2 path3 ...]
```

### JavaScript

```JavaScript
import watch, { AbortController } from 'simple-watcher'

// The AbortController is available natively since 15.9.0.
const ac = new AbortController()
const { signal } = ac
setTimeout(() => ac.abort(), 10000)

// Watch over file or directory.
for await (const changedPath of watch('/path/to/foo'), { signal }) {
  console.log(`Changed: ${filePath}`)
}

// Watch over multiple paths.
for await (const changedPath of watch(['/path/to/bar', '/path/to/baz']), { signal }) {
  console.log(`Changed: ${filePath}`)
}
