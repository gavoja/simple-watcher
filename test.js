'use strict'

const watch = require('./index')

watch(process.argv[2], (fileName) => {
  console.log(`Changed: ${fileName}`)
})
