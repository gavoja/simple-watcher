'use strict'

import assert from 'assert'
import fs from 'fs-extra'
import path from 'path'
import test from 'triala'
import watch, { AbortController } from '../index.js'

// Existing paths.
const PATH_TO_WATCH = path.normalize('./test/data')
const LEVEL1_DIR = path.join(PATH_TO_WATCH, 'level1-dir')
const LEVEL1_FILE = path.join(PATH_TO_WATCH, 'level1-file')
const LEVEL2_DIR = path.join(LEVEL1_DIR, 'level2-dir')
const LEVEL2_FILE = path.join(LEVEL1_DIR, 'level2-file')
const LEVEL3_FILE = path.join(LEVEL2_DIR, 'level3-file')

// New paths.
const LEVEL3_DIR = path.join(LEVEL2_DIR, 'level3-dir')
const LEVEL4_FILE = path.join(LEVEL3_DIR, 'level4-file')

// WARNING: Tests are Windows specific!
test('Watcher', class {
  async _watch (pathToWatch, options, action) {
    const [result] = await Promise.all([
      (async () => {
        const changes = []
        for await (const changedPath of watch(pathToWatch, options)) {
          changes.push(changedPath)
        }

        return changes
      })(),
      action()
    ])

    return result
  }

  async _pause (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  _touch (path) {
    const time = new Date()
    return fs.utimesSync(path, time, time)
  }

  async _timeout (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async 'Watch over directory' () {
    const signal = (new AbortController()).signal
    const changes = await this._watch(PATH_TO_WATCH, { signal }, async () => {
      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_FILE)
      await this._pause(201)
      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_DIR)
      this._touch(LEVEL2_FILE)
      this._touch(LEVEL2_DIR)
      this._touch(LEVEL3_FILE)
      await this._pause(10)
      signal.abort()
    })

    assert.deepStrictEqual(changes, [
      LEVEL1_FILE,
      LEVEL1_FILE,
      LEVEL1_DIR,
      LEVEL2_FILE,
      LEVEL2_DIR,
      LEVEL3_FILE
    ])
  }

  async 'Watch over directory (zero tolerance)' () {
    const signal = (new AbortController()).signal
    const changes = await this._watch(PATH_TO_WATCH, { signal, tolerance: 0 }, async () => {
      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_DIR)
      this._touch(LEVEL2_FILE)
      this._touch(LEVEL2_DIR)
      this._touch(LEVEL3_FILE)
      await this._pause(10)
      signal.abort()
    })

    assert.deepStrictEqual(changes, [
      LEVEL1_FILE,
      LEVEL1_FILE,
      LEVEL1_DIR,
      LEVEL2_FILE,
      LEVEL2_DIR,
      LEVEL3_FILE
    ])
  }

  async 'Watch over directory (fallback)' () {
    const signal = (new AbortController()).signal
    const changes = await this._watch(PATH_TO_WATCH, { signal, fallback: true }, async () => {
      await this._pause(10) // Allow for the watchers to apply recursively.

      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_FILE)

      this._touch(LEVEL1_DIR)
      await this._pause(10)
      this._touch(LEVEL2_FILE)

      this._touch(LEVEL2_DIR)
      await this._pause(10)
      this._touch(LEVEL3_FILE)

      fs.ensureDirSync(LEVEL3_DIR)
      await this._pause(10)
      fs.createFileSync(LEVEL4_FILE)

      await this._pause(10)
      signal.abort()
    })

    assert.deepStrictEqual(changes, [
      LEVEL1_FILE,
      LEVEL1_DIR,
      LEVEL2_FILE,
      LEVEL2_DIR,
      LEVEL3_FILE,
      LEVEL3_DIR,
      LEVEL4_FILE
    ])
  }

  async 'Watch over file' () {
    const signal = (new AbortController()).signal
    const changes = await this._watch(LEVEL1_FILE, { signal }, async () => {
      this._touch(LEVEL1_FILE)
      this._touch(LEVEL1_FILE)
      await this._pause(10)
      signal.abort()
    })

    assert.notStrictEqual(changes, [LEVEL1_FILE])
  }

  async _before () {
    // Clean up folders.
    fs.removeSync(LEVEL3_DIR)
  }

  async _after () {
    this._before()
  }
})
