'use strict'

const watch = require('../index')
const path = require('path')

const toWatch = path.resolve(__dirname, 'root')
const options = {
  shallow: false,
  fallback: true
}

watch(toWatch, options, fileName => {
  console.log(`${fileName}`, options.ledger)
})
