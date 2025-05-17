#!/usr/bin/env node
import watch from '../src/watch.js'

const args = process.argv.slice(2)
const pathsToWatch = args.filter(a => !a.startsWith('--'))

if (!pathsToWatch.length) {
  pathsToWatch.push(process.cwd())
}

for await (const changedPath of watch(pathsToWatch)) {
  console.log(changedPath)
}
