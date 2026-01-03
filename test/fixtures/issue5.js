'use strict'

const int = setInterval(() => {}, 10)
process.on('message', () => {
  clearInterval(int)
  replication()
})

function replication () {
  const pino = require('pino')()
  pino.info('hello world')
  setTimeout(() => { throw new Error('uncaught') }, 20)
}
