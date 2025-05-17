import assert from 'node:assert'
import fs from 'node:fs/promises'
import watch from '../src/watch.js'

const ac = new AbortController()
const changes = []

async function watchOverTestData () {
  for await (const changedPath of watch(['tests/data'], { signal: ac.signal })) {
    changes.push(changedPath.substring(process.cwd().length))
  }
}

watchOverTestData()

// Touch existing files and directories.
await fs.utimes('tests/data/level1-file', new Date(), new Date())
await fs.utimes('tests/data/level1-dir/level2-file', new Date(), new Date())
await fs.utimes('tests/data/level1-dir/level2-dir/level3-file', new Date(), new Date())
await fs.utimes('tests/data/level1-dir/level2-dir', new Date(), new Date()) // Should not trigger change.

// Add level 3 directory and files.
await fs.mkdir('tests/data/level1-dir/level2-dir/level3-dir')
await fs.writeFile('tests/data/level1-dir/level2-dir/level3-dir/level4-file', '')

// Add level 4 directory and files.
await fs.mkdir('tests/data/level1-dir/level2-dir/level3-dir/level4-dir')
await fs.writeFile('tests/data/level1-dir/level2-dir/level3-dir/level4-dir/level5-file1', '')
await fs.writeFile('tests/data/level1-dir/level2-dir/level3-dir/level4-dir/level5-file2', '')

// Remove all added files and directories.
await fs.rm('tests/data/level1-dir/level2-dir/level3-dir/level4-dir/level5-file2')
await fs.rm('tests/data/level1-dir/level2-dir/level3-dir', { force: true, recursive: true })

ac.abort()

assert.deepEqual(changes, [
  '/level1-file',
  '/level1-dir/level2-file',
  '/level1-dir/level2-dir/level3-file',
  '/level1-dir/level2-dir/level3-dir',
  '/level1-dir/level2-dir/level3-dir/level4-file',
  '/level1-dir/level2-dir/level3-dir/level4-dir',
  '/level1-dir/level2-dir/level3-dir/level4-dir/level5-file1',
  '/level1-dir/level2-dir/level3-dir/level4-dir/level5-file2',
  '/level1-dir/level2-dir/level3-dir/level4-dir/level5-file2',
  '/level1-dir/level2-dir/level3-dir/level4-file',
  '/level1-dir/level2-dir/level3-dir/level4-dir/level5-file1',
  '/level1-dir/level2-dir/level3-dir/level4-dir',
  '/level1-dir/level2-dir/level3-dir'
])
