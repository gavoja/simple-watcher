'use strict'

const watch = require('./index')

watch(process.argv[2], (files) => {
  console.log(files)
})
