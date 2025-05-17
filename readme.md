# Simple Watcher

A simple deep directory watcher with zero dependencies and built-in deduplication.

## Usage

### Command line

```
Usage:
  simple-watcher path1 [path2 path3 ...]
```

### JavaScript

```js
import watch from 'simple-watcher'

// Optional: abort the watcher after 10 seconds.
const ac = new AbortController()
setTimeout(() => ac.abort(), 10000)

// Watch over file or directory.
for await (const changedPath of watch('/path/to/foo'), { signal: ac.signal }) {
  console.log(`Changed: ${filePath}`)
}

// Watch over multiple paths.
for await (const changedPath of watch(['/path/to/bar', '/path/to/baz']), { signal: ac.signal }) {
  console.log(`Changed: ${filePath}`)
}
