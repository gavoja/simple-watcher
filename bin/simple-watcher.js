#!/usr/bin/env node
import watch from '../index.js'
import path from 'path'

const args = process.argv.slice(2)
const options = { fallback: args.includes('--fallback') }
const pathsToWatch = args.filter(a => !a.startsWith('--'))
if (!pathsToWatch.length) {
  pathsToWatch.push(process.cwd())
}


for await (const changedPath of watch(pathsToWatch, options)) {
  console.log(path.resolve(changedPath))
}
